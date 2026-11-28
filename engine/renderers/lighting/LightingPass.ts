// ╔══════════════════════════════════════════════════════════╗
// ║  LightingPass — WebGL2 打光與後製通道（ADR 0029）          ║
// ║  職責：擁有「世界畫布」（Canvas 2D，透明底）與一個 WebGL2   ║
// ║        畫布。RenderPipeline 把世界畫進世界畫布，present     ║
// ║        把它和主畫布上的背景上傳成貼圖，打光、後製，再用     ║
// ║        drawImage 貼回主畫布（不透明，蓋掉原本的背景）。     ║
// ║  上游：RenderPipeline.draw（經 LightingGate 延後載入）      ║
// ║  [ARCH] 全專案唯一使用 WebGL 的目錄；只用瀏覽器 WebGL2 API。║
// ║  [ARCH] 不改任何座標：世界畫布與主畫布同尺寸、同變換，      ║
// ║         排序鍵與繪製點都不經過這裡（RenderSpec §1 尾段）。  ║
// ║  [ARCH] 位置只讀本幀的 op 與 UnitFrame（footX、floorY、     ║
// ║         hudAnchorY、transition）與障礙物精靈的錨點，不自己  ║
// ║         算高度；外觀數值只讀 constants/lighting.ts。        ║
// ║  [ARCH] 一個頁面只建一個 GL context（LightingGate 的模組    ║
// ║         單例）；context 遺失時 beginWorld 回 null，管線走   ║
// ║         原本的直接路徑。                                    ║
// ║  [ARCH] 遮罩（tag，半解析度，地塊不重畫）：                 ║
// ║   幾何遮罩＝直立物（單位、障礙物）的漸層章（離腳底的高度、  ║
// ║   是不是單位、橫向位置），由 GL 畫（GeoMaskGpu，ADR 0032）：║
// ║   tag 在 SpriteCapture 的擷取畫布上跑一次同一個 painter，    ║
// ║   取得貼圖與變換，present 一趟 instanced 畫進遮罩貼圖。      ║
// ║   特效遮罩、玩法標示遮罩仍是 Canvas 2D 畫布（直立物在上面    ║
// ║   挖洞）。同時收集點光（存活單位）與投影物（腳印）。        ║
// ║   地塊 op 順帶畫的基礎疊層進玩法標示遮罩、貼地法陣進特效    ║
// ║   遮罩（否則會被當成地面壓暗）。                            ║
// ║  [ARCH] 仿光效零件的光（ADR 0031，PartLightSink）：drawPart  ║
// ║   在世界畫布上把柔邊加法 glow 登記成光（裝置像素），present  ║
// ║   用本幀相機變換換回世界座標；遮罩那一趟（tag 重畫同一個    ║
// ║   op）照世界那一趟登記的盞數一一對應，不重複登記。上限       ║
// ║   PART_LIGHT.MAX 和單位的光分開算。                          ║
// ║  每幀流程：幾何遮罩 → 投影物貼圖 → 點光（instance 矩形，加法，含投影） ║
// ║  → 零件的光（同一種矩形，PART_LIGHT.SHADOW_STEPS）          ║
// ║  → 著色（環境光、月光與投影、接觸暗部、邊光、自發光、背景   ║
// ║  調色）→ 泛光 → 特效餘光（泛光再抹開，留給下一幀當光源）    ║
// ║  → 合成（曝光、暗角、色調映射）。                           ║
// ║  [ARCH] 通道不能用（render target 建不起來、context 遺失）  ║
// ║         時 present 把世界畫布原樣疊回主畫布；context 還原   ║
// ║         後重建資源、繼續打光。沒有主動釋放的路徑（ADR 0030）║
// ╚══════════════════════════════════════════════════════════╝

import { ISO_SCALE_Y, LIGHTING, RENDER_QUALITY, type LightingLook } from '../../../constants';
import type { HexLayout } from '../../../types';
import type { UnitRenderSystem } from '../../presentation/unit';
import { SpriteManager } from '../../sprites';
import type { GroundDrapeLayer } from '../GroundDrape';
import { GridOverlays } from '../grid/GridOverlays';
import { RenderDispatcher } from '../RenderDispatcher';
import { RenderOpType, type RenderOp } from '../RenderList';
import { setPartLightSink, type PartLightRole, type PartLightSink } from './PartLightSink';
import { SpriteCapture } from '../SpriteCapture';
import { GeoMaskGpu, type GlProgram, type GlProgramFactory } from './GeoMaskGpu';
import {
    BLUR_FRAG, BRIGHT_FRAG, CASTER_FRAG, COMPOSITE_FRAG, FULLSCREEN_VERT, INSTANCE_VERT, lightFrag, shadeFrag,
} from './shaders';

/** 全螢幕四邊形（兩個三角形的 strip）；instance 矩形也用它 */
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUAD_VERTS = 4;
/** 一個 instance（點光或投影物）的資料：xyz、w、rgb */
const INST_STRIDE = 7;
const INST_POS_SIZE = 4;
const INST_COL_SIZE = 3;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
/** 地面深度相對螢幕 Y 的倍率（等距投影把地面 y 壓成 ISO_SCALE_Y 倍） */
const GROUND_PER_SCREEN_Y = 1 / ISO_SCALE_Y;

const ATTR_QUAD = 0;
const ATTR_INST_POS = 1;
const ATTR_INST_COL = 2;
/** 貼圖單元 */
const TEX_WORLD = 0;
const TEX_BACK = 1;
const TEX_LIGHT = 2;
const TEX_GLOW = 3;
const TEX_INFO = 4;
const TEX_GEO = 5;
const TEX_CASTER = 6;
const TEX_GLOW_LIGHT = 7;

type Program = GlProgram;
/** LightingPass 自己的 program 用的頂點屬性（instance 矩形） */
const PASS_ATTRIBS: readonly string[] = ['aPos', 'iPos', 'iCol'];

interface Target {
    readonly tex: WebGLTexture | null;
    readonly fbo: WebGLFramebuffer | null;
    readonly w: number;
    readonly h: number;
}

type Vec3 = readonly [number, number, number];

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas2d');
    return { canvas, ctx };
}

/** 零件光 instance 暫存的 z 欄：present 換算前先記「是不是貼地零件」 */
const PART_GROUND_FLAG = 1;

/** 診斷（量測工具讀）：零件光的累計數字；mismatch＝世界那一趟與遮罩那一趟的合格零件數不同的 op 數 */
interface PartLightStats {
    frames: number;
    lights: number;
    rejected: number;
    maxPerFrame: number;
    framesAtCap: number;
    mismatch: number;
}

export class LightingPass implements PartLightSink, GlProgramFactory {
    private readonly world: HTMLCanvasElement;
    private readonly worldCtx: CanvasRenderingContext2D;
    /** 遮罩畫布（LIGHTING.MASK_SCALE 倍解析度，和世界畫布同一個相機變換）；幾何遮罩由 GL 畫（geo） */
    private readonly glowCtx: CanvasRenderingContext2D;
    private readonly infoCtx: CanvasRenderingContext2D;
    private readonly maskCtxs: readonly CanvasRenderingContext2D[];
    private readonly glCanvas: HTMLCanvasElement;
    private readonly gl: WebGL2RenderingContext;
    private lost = false;
    /** 遮罩畫布的變換要不要重設（每幀第一次 tag 時照世界畫布此刻的相機變換設一次） */
    private maskStale = true;
    /** WEBGL_debug_renderer_info 的顯示卡字串；量測工具把它寫進證據 */
    public readonly gpu: string;
    /** 幾何遮罩（ADR 0032）；context 還原時重建 */
    private geo: GeoMaskGpu | null = null;
    /** 本幀世界畫布的相機變換（tag 第一次呼叫時讀；SpriteCapture 的基準） */
    private cam: DOMMatrix = new DOMMatrix();

    private quadVao: WebGLVertexArrayObject | null = null;
    private instVao: WebGLVertexArrayObject | null = null;
    private instBuffer: WebGLBuffer | null = null;
    private readonly lightData = new Float32Array(LIGHTING.MAX_LIGHTS * INST_STRIDE);
    private lightCount = 0;
    private readonly casterData = new Float32Array(LIGHTING.MAX_CASTERS * INST_STRIDE);
    private casterCount = 0;
    /** 仿光效零件的光：drawPart 登記時是裝置像素，present 換成地面座標（ADR 0031） */
    private readonly partData = new Float32Array(Math.min(LIGHTING.PART_LIGHT.MAX, LIGHTING.MAX_CASTERS) * INST_STRIDE);
    private partCount = 0;
    /** 上一次 tag 之後世界那一趟登記成光的盞數；tag 一開頭交給 maskQuota，遮罩重畫同一個 op 時照順序消耗 */
    private partSinceTag = 0;
    private maskQuota = 0;
    /** 診斷：這個 op 世界那一趟、遮罩那一趟各有幾個合格零件（含排不進上限的）；opRedrawn＝這個 op 會照原樣重畫進遮罩 */
    private partWorldCalls = 0;
    private opWorldCalls = 0;
    private partMaskCalls = 0;
    private opRedrawn = false;
    private partRejectedFrame = 0;
    public readonly partStats: PartLightStats = { frames: 0, lights: 0, rejected: 0, maxPerFrame: 0, framesAtCap: 0, mismatch: 0 };
    private worldTex: WebGLTexture | null = null;
    private backTex: WebGLTexture | null = null;
    /** 本幀 GL 畫好的幾何遮罩（GeoMaskGpu.render 的結果） */
    private geoTex: WebGLTexture | null = null;
    private glowTex: WebGLTexture | null = null;
    private infoTex: WebGLTexture | null = null;
    private pCaster: Program | null = null;
    private pLight: Program | null = null;
    private pPartLight: Program | null = null;
    private pShade: Program | null = null;
    private pBright: Program | null = null;
    private pBlur: Program | null = null;
    private pComposite: Program | null = null;
    private tCaster: Target | null = null;
    private tLight: Target | null = null;
    private tHdr: Target | null = null;
    private tBloomA: Target | null = null;
    private tBloomB: Target | null = null;
    /** 特效餘光（GLOW_LIGHT）：A 留到下一幀給著色讀，B 是模糊的暫存 */
    private tGlowA: Target | null = null;
    private tGlowB: Target | null = null;
    /** 群系外觀（BASE 疊上 BIOME 覆寫）；每個群系合併一次 */
    private readonly looks = new Map<string, LightingLook>();

    /** 拿不到 WebGL2 或需要的擴充時丟出錯誤，由 LightingGate 記成不支援 */
    constructor() {
        const world = makeCanvas();
        this.world = world.canvas;
        this.worldCtx = world.ctx;
        this.glowCtx = makeCanvas().ctx;
        this.infoCtx = makeCanvas().ctx;
        this.maskCtxs = [this.glowCtx, this.infoCtx];
        this.glCanvas = document.createElement('canvas');
        // failIfMajorPerformanceCaveat：只有軟體算圖（沒有顯示卡加速）可用時不建 context，走原本的 Canvas 2D 路徑；
        // 軟體 WebGL 跑全螢幕打光會把幀率拖到個位數
        const gl = this.glCanvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: true,
        });
        if (!gl) throw new Error('webgl2');
        this.gl = gl;
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        this.gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
        this.glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
        this.glCanvas.addEventListener('webglcontextrestored', () => { this.createResources(); this.lost = false; });
        this.createResources();
        setPartLightSink(this);
    }

    public roleOf(canvas: HTMLCanvasElement): PartLightRole | null {
        if (canvas === this.world) return 'world';
        for (const mctx of this.maskCtxs) if (mctx.canvas === canvas) return 'mask';
        return null;
    }

    public addPartLight(devX: number, devY: number, devRadius: number, ground: boolean, color: readonly [number, number, number], strength: number): number {
        const P = LIGHTING.PART_LIGHT;
        this.partWorldCalls++;
        // 上限每次讀現值（量測與對照板會在頁面裡改 MAX），夾在緩衝容量內
        if (this.partCount >= Math.min(P.MAX, this.partData.length / INST_STRIDE)) {
            this.partRejectedFrame++;
            return -1;
        }
        this.pushInstance(this.partData, this.partCount++, devX, devY, ground ? PART_GROUND_FLAG : 0, devRadius, color, strength * P.INTENSITY);
        this.partSinceTag++;
        return P.CORE_SCALE;
    }

    public takeMaskLight(): number {
        this.partMaskCalls++;
        if (this.maskQuota <= 0) return -1;
        this.maskQuota--;
        return LIGHTING.PART_LIGHT.CORE_SCALE;
    }

    /** 上一個 op 若照原樣重畫進遮罩，兩趟的合格零件數要相同（不同就是遮罩對不上，記進 partStats.mismatch） */
    private checkPartRedraw(): void {
        if (this.opRedrawn && this.partMaskCalls !== this.opWorldCalls) this.partStats.mismatch++;
        this.opRedrawn = false;
    }

    private compile(type: number, src: string): WebGLShader {
        const gl = this.gl;
        const s = gl.createShader(type);
        if (!s) throw new Error('shader');
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
        return s;
    }

    /** attribs[i] 綁在頂點屬性位置 i（預設是這個檔的 instance 矩形：aPos、iPos、iCol） */
    public program(vert: string, frag: string, attribs: readonly string[] = PASS_ATTRIBS): Program {
        const gl = this.gl;
        const id = gl.createProgram();
        if (!id) throw new Error('program');
        gl.attachShader(id, this.compile(gl.VERTEX_SHADER, vert));
        gl.attachShader(id, this.compile(gl.FRAGMENT_SHADER, frag));
        attribs.forEach((name, i) => gl.bindAttribLocation(id, i, name));
        gl.linkProgram(id);
        if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(id) ?? 'link');
        return { id, uniforms: new Map() };
    }

    public loc(p: Program, name: string): WebGLUniformLocation | null {
        let l = p.uniforms.get(name);
        if (l === undefined) {
            l = this.gl.getUniformLocation(p.id, name);
            p.uniforms.set(name, l);
        }
        return l;
    }

    private f1(p: Program, name: string, v: number): void {
        this.gl.uniform1f(this.loc(p, name), v);
    }

    private f3(p: Program, name: string, v: Vec3, k: number): void {
        this.gl.uniform3f(this.loc(p, name), v[0] * k, v[1] * k, v[2] * k);
    }

    /** 8 位元貼圖（Canvas 2D 畫布的上傳目的地） */
    private canvasTexture(filter: number): WebGLTexture | null {
        const gl = this.gl;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    }

    private upload(tex: WebGLTexture | null, source: HTMLCanvasElement): void {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }

    /** 線性 HDR 的 render target；尺寸沒變就沿用 */
    private target(prev: Target | null, w: number, h: number): Target {
        if (prev && prev.w === w && prev.h === h) return prev;
        const gl = this.gl;
        if (prev) { gl.deleteTexture(prev.tex); gl.deleteFramebuffer(prev.fbo); }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        // 驅動不接受這個格式當 render target：整個通道停用，之後每幀走原本的直接路徑
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.lost = true;
        return { tex, fbo, w, h };
    }

    /** 建立（或 context 還原後重建）所有 GL 資源；render target 在 present 依畫布尺寸建立 */
    private createResources(): void {
        const gl = this.gl;
        // HDR 中間貼圖（RGBA16F）要能當 render target。擴充在 context 還原後會失效，所以每次重建都重新啟用；
        // 少了這一步，還原後 render target 建不起來，通道會永久停用（2026-11-28 用 WEBGL_lose_context 實測到）
        if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) throw new Error('EXT_color_buffer_float');
        this.tCaster = this.tLight = this.tHdr = this.tBloomA = this.tBloomB = this.tGlowA = this.tGlowB = null;

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

        this.quadVao = gl.createVertexArray();
        gl.bindVertexArray(this.quadVao);
        gl.enableVertexAttribArray(ATTR_QUAD);
        gl.vertexAttribPointer(ATTR_QUAD, 2, gl.FLOAT, false, 0, 0);

        this.instVao = gl.createVertexArray();
        gl.bindVertexArray(this.instVao);
        gl.enableVertexAttribArray(ATTR_QUAD);
        gl.vertexAttribPointer(ATTR_QUAD, 2, gl.FLOAT, false, 0, 0);
        this.instBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, Math.max(this.lightData.byteLength, this.casterData.byteLength, this.partData.byteLength), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(ATTR_INST_POS);
        gl.vertexAttribPointer(ATTR_INST_POS, INST_POS_SIZE, gl.FLOAT, false, INST_STRIDE * FLOAT_BYTES, 0);
        gl.vertexAttribDivisor(ATTR_INST_POS, 1);
        gl.enableVertexAttribArray(ATTR_INST_COL);
        gl.vertexAttribPointer(ATTR_INST_COL, INST_COL_SIZE, gl.FLOAT, false, INST_STRIDE * FLOAT_BYTES, INST_POS_SIZE * FLOAT_BYTES);
        gl.vertexAttribDivisor(ATTR_INST_COL, 1);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.clearColor(0, 0, 0, 0);
        // Canvas 2D 的像素本來就是預乘 alpha：照原樣上傳，著色器自己解乘
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        this.worldTex = this.canvasTexture(gl.NEAREST);
        this.backTex = this.canvasTexture(gl.NEAREST);
        this.glowTex = this.canvasTexture(gl.LINEAR);
        this.infoTex = this.canvasTexture(gl.LINEAR);
        const steps = LIGHTING.SHADOW.STEPS;
        this.pCaster = this.program(INSTANCE_VERT, CASTER_FRAG);
        this.pLight = this.program(INSTANCE_VERT, lightFrag(steps));
        this.pPartLight = this.program(INSTANCE_VERT, lightFrag(LIGHTING.PART_LIGHT.SHADOW_STEPS));
        this.pShade = this.program(FULLSCREEN_VERT, shadeFrag(steps));
        this.pBright = this.program(FULLSCREEN_VERT, BRIGHT_FRAG);
        this.pBlur = this.program(FULLSCREEN_VERT, BLUR_FRAG);
        this.pComposite = this.program(FULLSCREEN_VERT, COMPOSITE_FRAG);
        // 舊的圖集貼圖跟著遺失的 context 失效：整個重建
        this.geo = new GeoMaskGpu(gl, this, quad);
    }

    private lookFor(biome: string): LightingLook {
        let look = this.looks.get(biome);
        if (!look) {
            look = { ...LIGHTING.BASE, ...LIGHTING.BIOME[biome] };
            this.looks.set(biome, look);
        }
        return look;
    }

    /**
     * 開始一幀的世界繪製：回傳世界畫布的 context（已清空、已套 dpr 縮放、取樣品質同主畫布）。
     * context 遺失時回 null，呼叫端改畫主畫布。
     */
    public beginWorld(pW: number, pH: number, dpr: number): CanvasRenderingContext2D | null {
        if (this.lost) return null;
        const { world, worldCtx: ctx } = this;
        if (world.width !== pW || world.height !== pH) {
            world.width = pW;
            world.height = pH;
        } else {
            ctx.resetTransform();
            ctx.clearRect(0, 0, pW, pH);
        }
        // 畫布改尺寸會重設 context 狀態，所以和主畫布一樣每幀設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = RENDER_QUALITY.IMAGE_SMOOTHING;
        ctx.scale(dpr, dpr);

        const mW = Math.max(1, Math.round(pW * LIGHTING.MASK_SCALE)), mH = Math.max(1, Math.round(pH * LIGHTING.MASK_SCALE));
        for (const mctx of this.maskCtxs) {
            const mask = mctx.canvas;
            if (mask.width !== mW || mask.height !== mH) { mask.width = mW; mask.height = mH; }
            mctx.resetTransform();
            mctx.clearRect(0, 0, mW, mH);
        }
        this.maskStale = true;
        this.lightCount = 0;
        this.casterCount = 0;
        this.partCount = this.partSinceTag = this.maskQuota = 0;
        this.partWorldCalls = this.opWorldCalls = this.partMaskCalls = this.partRejectedFrame = 0;
        this.opRedrawn = false;
        this.geo?.begin();
        return ctx;
    }

    private pushInstance(data: Float32Array, n: number, x: number, y: number, z: number, w: number, col: Vec3 | null, k: number): void {
        let i = n * INST_STRIDE;
        data[i++] = x; data[i++] = y; data[i++] = z; data[i++] = w;
        data[i++] = col ? col[0] * k : 0; data[i++] = col ? col[1] * k : 0; data[i] = col ? col[2] * k : 0;
    }

    /** 投影物：腳底在地面座標的位置、腳印半徑（由精靈寬推）、高度 */
    private pushCaster(footX: number, footScreenY: number, spriteWidth: number, height: number): void {
        if (this.casterCount >= LIGHTING.MAX_CASTERS) return;
        const R = LIGHTING.SHADOW.CASTER_RADIUS;
        const radius = Math.min(R.MAX, Math.max(R.MIN, spriteWidth * R.RATIO));
        this.pushInstance(this.casterData, this.casterCount++, footX, footScreenY * GROUND_PER_SCREEN_Y, height, radius, null, 0);
    }

    /**
     * RenderPipeline 每畫完一個 op 呼叫一次：把「這個 op 是哪一類」另外記在遮罩畫布上，並收集光源與投影物。
     * - 單位 → 幾何遮罩（剪影 drawSilhouette 在 SpriteCapture 擷取畫布上跑一次，貼圖交給 GeoMaskGpu，覆蓋率 GEO.UNIT_COVERAGE）
     *   ＋一盞點光＋一個投影物；並從特效遮罩挖掉自己（比它早畫的特效被它擋住）。
     * - 障礙物 → 幾何遮罩（同上，RenderDispatcher.dispatch）＋一個投影物；並從特效、玩法標示遮罩挖掉自己。
     * - 特效、投射物、施法圈、危害（熔岩、毒沼）→ 特效遮罩：照原樣再分發一次。
     * - 射程、預警、縮圈格（OVERLAY）→ 玩法標示遮罩：照原樣再分發一次。
     * - 地塊本體不重畫（最多、最貴）：被前方高地塊擋住的單位，遮罩會多出一塊（開案書 §6）。
     *   地塊 op 順帶畫的兩樣要進遮罩，否則會被當成地面壓暗：基礎疊層（狀態底色、區域、地塊光）→ 玩法標示遮罩；
     *   貼地鋪設特效（法陣）→ 特效遮罩。繪製點和 RenderDispatcher 用同一個 snap。
     */
    public tag(op: RenderOp, layout: HexLayout, t: number, units: UnitRenderSystem, drape: GroundDrapeLayer): void {
        // 零件光的交接在所有提早 return 之前：這個 op 世界那一趟登記的盞數，只給這個 op 的遮罩重畫用
        this.checkPartRedraw();
        this.maskQuota = this.partSinceTag;
        this.partSinceTag = 0;
        this.opWorldCalls = this.partWorldCalls;
        this.partWorldCalls = this.partMaskCalls = 0;
        const type = op.type;
        if (type === RenderOpType.CORPSE) return;
        if (this.maskStale) {
            this.maskStale = false;
            const m = this.cam = this.worldCtx.getTransform();
            const k = LIGHTING.MASK_SCALE;
            for (const mctx of this.maskCtxs) mctx.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k);
        }
        if (type === RenderOpType.TERRAIN) {
            const snapX = RenderDispatcher.snap(op.tx, 0), snapY = RenderDispatcher.snap(op.ty, 1);
            if (op.oStatus || op.oDanger || op.oHasUnit || (op.oLightCol && op.oLightInt > 0)) {
                GridOverlays.drawOverlays(this.infoCtx, snapX, snapY, op.th, op.tsize, op.oStatus, op.oDanger, op.oLightCol, op.oLightInt,
                    false, '', false, false, false, op.oHasUnit, op.tq, op.tr, op.time, layout);
            }
            drape.drawOnTile(this.glowCtx, op, snapX, snapY, layout, t);
            return;
        }
        const G = LIGHTING.GEO;
        if (type === RenderOpType.UNIT) {
            const f = op.unitFrame;
            if (!f || f.isCorpse) return;
            const height = f.floorY - f.hudAnchorY;
            const halfW = height * G.UNIT_HALF_WIDTH;
            const x0 = f.footX - halfW, y0 = f.floorY - G.MAX_HEIGHT;
            units.drawSilhouette(SpriteCapture.begin(this.cam), f, t, layout);
            this.addCaptured(SpriteCapture.end(), x0, y0, halfW * 2, true, G.UNIT_COVERAGE);
            for (const mctx of [this.glowCtx, this.infoCtx]) {
                mctx.globalCompositeOperation = 'destination-out';
                mctx.globalAlpha = G.UNIT_COVERAGE;
                units.drawSilhouette(mctx, f, t, layout);
                mctx.globalAlpha = 1;
                mctx.globalCompositeOperation = 'source-over';
            }

            this.pushCaster(f.footX, f.floorY, halfW * 2, height);
            if (this.lightCount < LIGHTING.MAX_LIGHTS) {
                const U = LIGHTING.UNIT_LIGHT;
                this.pushInstance(this.lightData, this.lightCount++,
                    f.footX, (f.floorY + f.transition) * GROUND_PER_SCREEN_Y + U.FRONT, U.HEIGHT + f.agent.physics.z, U.RANGE,
                    U.COLOR[f.agent.team] ?? U.FALLBACK, U.INTENSITY);
            }
        } else if (type === RenderOpType.OBSTACLE) {
            const ob = SpriteManager.getObstacleSprite(op.ttype, layout, op.tq, op.tr, t);
            const halfW = Math.max(ob.anchorX, ob.width - ob.anchorX);
            const x0 = op.tx - halfW, y0 = op.ty - G.MAX_HEIGHT;
            RenderDispatcher.dispatch(SpriteCapture.begin(this.cam), op, layout, t, units);
            this.addCaptured(SpriteCapture.end(), x0, y0, halfW * 2, false, 1);
            for (const mctx of [this.glowCtx, this.infoCtx]) {
                mctx.globalCompositeOperation = 'destination-out';
                RenderDispatcher.dispatch(mctx, op, layout, t, units);
                mctx.globalCompositeOperation = 'source-over';
            }
            this.pushCaster(op.tx, op.ty, ob.width, Math.min(G.MAX_HEIGHT, ob.anchorY));
        } else {
            this.opRedrawn = true;
            RenderDispatcher.dispatch(type === RenderOpType.OVERLAY ? this.infoCtx : this.glowCtx, op, layout, t, units);
        }
    }

    /** SpriteCapture 剛擷取到的 n 張貼圖交給 GL 幾何遮罩（章的世界矩形 x0, y0, w） */
    private addCaptured(n: number, x0: number, y0: number, w: number, isUnit: boolean, coverage: number): void {
        const geo = this.geo;
        if (!geo) return;
        for (let i = 0; i < n; i++) {
            const b = SpriteCapture.at(i);
            geo.add(b, SpriteCapture.isWhole(b), x0, y0, w, isUnit, coverage);
        }
    }

    /**
     * 零件光從裝置像素換成地面座標（和 shaders.ts 檔頭同一套換算）：w＝(px − 平移) ÷ 縮放；
     * 空中零件的畫點往下 HEIGHT_AIR 當腳底，貼地零件的畫點就是腳底；範圍＝畫出來的半徑 × RANGE_PER_RADIUS。
     * 順便結算這一幀的診斷數字。
     */
    private finishPartLights(cam: DOMMatrix): void {
        this.checkPartRedraw();
        const P = LIGHTING.PART_LIGHT, d = this.partData, st = this.partStats;
        for (let i = 0; i < this.partCount; i++) {
            const o = i * INST_STRIDE;
            const ground = d[o + 2] === PART_GROUND_FLAG;
            const z = ground ? P.HEIGHT_GROUND : P.HEIGHT_AIR;
            const wy = (d[o + 1] - cam.f) / cam.d;
            d[o] = (d[o] - cam.e) / cam.a;
            d[o + 1] = (wy + (ground ? 0 : z)) * GROUND_PER_SCREEN_Y;
            d[o + 2] = z;
            d[o + 3] = d[o + 3] / cam.a * P.RANGE_PER_RADIUS;
        }
        st.frames++;
        st.lights += this.partCount;
        st.rejected += this.partRejectedFrame;
        st.maxPerFrame = Math.max(st.maxPerFrame, this.partCount);
        if (this.partRejectedFrame > 0) st.framesAtCap++;
    }

    private bindTexture(p: Program, unit: number, name: string, tex: WebGLTexture | null): void {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(this.loc(p, name), unit);
    }

    /** 像素 → 世界的換算（k＝這個 render target 相對主畫布的解析度） */
    private viewUniforms(p: Program, cam: DOMMatrix, w: number, h: number, k: number): void {
        const gl = this.gl;
        gl.uniform2f(this.loc(p, 'uRes'), w, h);
        gl.uniform2f(this.loc(p, 'uOrigin'), cam.e * k, cam.f * k);
        this.f1(p, 'uScale', cam.a * k);
        this.f1(p, 'uGroundPerY', GROUND_PER_SCREEN_Y);
    }

    /** shaders.ts surfaceChunk 的 uniform：幾何遮罩、投影物貼圖、投影參數 */
    private surfaceUniforms(p: Program, cam: DOMMatrix, w: number, h: number): void {
        const S = LIGHTING.SHADOW;
        this.viewUniforms(p, cam, w, h, 1);
        this.bindTexture(p, TEX_GEO, 'tGeo', this.geoTex);
        this.bindTexture(p, TEX_CASTER, 'tCaster', this.tCaster ? this.tCaster.tex : null);
        this.f1(p, 'uMaxH', LIGHTING.GEO.MAX_HEIGHT);
        this.f1(p, 'uBevel', LIGHTING.GEO.BEVEL);
        this.f1(p, 'uShadowStrength', S.STRENGTH);
        this.f1(p, 'uShadowSoft', S.SOFT);
        this.f1(p, 'uSkipGround', S.SKIP_GROUND);
        this.f1(p, 'uSkipUpright', S.SKIP_UPRIGHT);
    }

    private drawInstances(data: Float32Array, count: number): void {
        const gl = this.gl;
        gl.bindVertexArray(this.instVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * INST_STRIDE);
        gl.enable(gl.BLEND);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, QUAD_VERTS, count);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(this.quadVao);
    }

    private drawTo(t: Target | null, w: number, h: number): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
        gl.viewport(0, 0, w, h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD_VERTS);
    }

    /** 這一幀的世界已經畫在世界畫布上、通道卻不能用（context 遺失、render target 建不起來）：不打光，原樣疊回主畫布 */
    private blitUnlit(main: CanvasRenderingContext2D): void {
        main.save();
        main.resetTransform();
        main.drawImage(this.world, 0, 0);
        main.restore();
    }

    /**
     * 世界畫完後、世界畫布的相機變換還沒 restore 時呼叫（要讀這個變換把像素換回世界座標）。
     * main＝主畫布（此時只有背景）；biome＝SceneTheme.textureType。
     */
    public present(main: CanvasRenderingContext2D, biome: string): void {
        const { gl, glCanvas, world } = this;
        const { pCaster, pLight, pPartLight, pShade, pBright, pBlur, pComposite } = this;
        const pW = world.width, pH = world.height;
        if (this.lost || !pCaster || !pLight || !pPartLight || !pShade || !pBright || !pBlur || !pComposite) { this.blitUnlit(main); return; }
        if (glCanvas.width !== pW || glCanvas.height !== pH) {
            glCanvas.width = pW;
            glCanvas.height = pH;
        }
        const B = LIGHTING.BLOOM, S = LIGHTING.SHADOW;
        const bW = Math.max(1, Math.floor(pW / B.DOWNSCALE)), bH = Math.max(1, Math.floor(pH / B.DOWNSCALE));
        const cW = Math.max(1, Math.round(pW * S.CASTER_SCALE)), cH = Math.max(1, Math.round(pH * S.CASTER_SCALE));
        const tCaster = this.tCaster = this.target(this.tCaster, cW, cH);
        const tLight = this.tLight = this.target(this.tLight, pW, pH);
        const tHdr = this.tHdr = this.target(this.tHdr, pW, pH);
        const tBloomA = this.tBloomA = this.target(this.tBloomA, bW, bH);
        const tBloomB = this.tBloomB = this.target(this.tBloomB, bW, bH);
        const GL = LIGHTING.GLOW_LIGHT;
        const gW = Math.max(1, Math.floor(pW / GL.DOWNSCALE)), gH = Math.max(1, Math.floor(pH / GL.DOWNSCALE));
        const tGlowA = this.tGlowA = this.target(this.tGlowA, gW, gH);
        const tGlowB = this.tGlowB = this.target(this.tGlowB, gW, gH);

        if (this.lost) { this.blitUnlit(main); return; }

        const cam = this.worldCtx.getTransform();
        const look = this.lookFor(biome);
        this.finishPartLights(cam);

        // 0. 幾何遮罩：直立物的貼圖一趟 instanced 畫進遮罩貼圖（和其他遮罩同解析度）；建不起來時整個通道停用，同 render target
        this.geoTex = this.geo ? this.geo.render(cam, this.glowCtx.canvas.width, this.glowCtx.canvas.height) : null;
        if (!this.geoTex) { this.lost = true; this.blitUnlit(main); return; }
        gl.activeTexture(gl.TEXTURE0);
        this.upload(this.worldTex, world);
        this.upload(this.backTex, main.canvas);
        this.upload(this.glowTex, this.glowCtx.canvas);
        this.upload(this.infoTex, this.infoCtx.canvas);
        gl.bindVertexArray(this.quadVao);

        // 1. 投影物貼圖：每個投影物在腳底畫一個橢圓，取最大值
        gl.bindFramebuffer(gl.FRAMEBUFFER, tCaster.fbo);
        gl.viewport(0, 0, cW, cH);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (this.casterCount > 0) {
            gl.useProgram(pCaster.id);
            this.viewUniforms(pCaster, cam, cW, cH, S.CASTER_SCALE);
            this.f1(pCaster, 'uReach', S.CONTACT_REACH);
            this.f1(pCaster, 'uLift', 0);
            gl.blendEquation(gl.MAX);
            this.drawInstances(this.casterData, this.casterCount);
            gl.blendEquation(gl.FUNC_ADD);
        }

        // 2. 點光：每盞一個矩形，加法疊進光照貼圖；矩形往上多蓋 MAX_HEIGHT（直立物的像素在腳底上方）
        gl.bindFramebuffer(gl.FRAMEBUFFER, tLight.fbo);
        gl.viewport(0, 0, pW, pH);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (this.lightCount > 0) {
            gl.useProgram(pLight.id);
            this.surfaceUniforms(pLight, cam, pW, pH);
            this.f1(pLight, 'uReach', 1);
            this.f1(pLight, 'uLift', LIGHTING.GEO.MAX_HEIGHT);
            this.f1(pLight, 'uKnee', LIGHTING.UNIT_LIGHT.KNEE);
            this.f1(pLight, 'uObstacleLight', LIGHTING.UNIT_LIGHT.ON_OBSTACLE);
            this.drawInstances(this.lightData, this.lightCount);
        }
        // 2b. 仿光效零件的光：同一種矩形，加法疊在單位光之後（取樣步數 PART_LIGHT.SHADOW_STEPS，0＝不帶投影）
        if (this.partCount > 0) {
            const P = LIGHTING.PART_LIGHT;
            gl.useProgram(pPartLight.id);
            this.surfaceUniforms(pPartLight, cam, pW, pH);
            this.f1(pPartLight, 'uReach', 1);
            this.f1(pPartLight, 'uLift', LIGHTING.GEO.MAX_HEIGHT);
            this.f1(pPartLight, 'uKnee', P.KNEE);
            this.f1(pPartLight, 'uObstacleLight', P.ON_OBSTACLE);
            this.drawInstances(this.partData, this.partCount);
        }

        // 3. 著色
        const moonLen = Math.hypot(look.moonDir[0], look.moonDir[1], look.moonDir[2]);
        gl.useProgram(pShade.id);
        this.surfaceUniforms(pShade, cam, pW, pH);
        this.bindTexture(pShade, TEX_WORLD, 'tWorld', this.worldTex);
        this.bindTexture(pShade, TEX_BACK, 'tBack', this.backTex);
        this.bindTexture(pShade, TEX_LIGHT, 'tLight', tLight.tex);
        this.bindTexture(pShade, TEX_GLOW, 'tGlow', this.glowTex);
        this.bindTexture(pShade, TEX_INFO, 'tInfo', this.infoTex);
        // 上一幀留下的特效餘光（這一幀的在步驟 4 之後才更新）
        this.bindTexture(pShade, TEX_GLOW_LIGHT, 'tGlowLight', tGlowA.tex);
        this.f3(pShade, 'uUnitFill', LIGHTING.UNIT_FILL, 1);
        this.f1(pShade, 'uGlowCoverage', LIGHTING.GLOW_COVERAGE);
        this.f1(pShade, 'uInfoCoverage', LIGHTING.INFO_COVERAGE);
        this.f1(pShade, 'uGlowLight', GL.STRENGTH);
        this.f3(pShade, 'uAmbient', look.ambient, 1);
        this.f3(pShade, 'uMoonCol', look.moonColor, look.moonIntensity);
        this.f3(pShade, 'uMoonDir', look.moonDir, 1 / moonLen);
        gl.uniform3f(this.loc(pShade, 'uSkyTint'),
            look.ambient[0] * look.skyAmbient + look.moonColor[0] * look.skyMoon,
            look.ambient[1] * look.skyAmbient + look.moonColor[1] * look.skyMoon,
            look.ambient[2] * look.skyAmbient + look.moonColor[2] * look.skyMoon);
        this.f1(pShade, 'uEmissiveGain', LIGHTING.EMISSIVE_GAIN);
        this.f1(pShade, 'uInfoGain', LIGHTING.INFO_GAIN);
        this.f1(pShade, 'uEnvChroma', look.envChroma);
        this.f1(pShade, 'uMoonShadowLen', S.MOON_LENGTH);
        this.f1(pShade, 'uContact', S.CONTACT);
        this.f1(pShade, 'uRim', LIGHTING.MOON_RIM);
        this.drawTo(tHdr, pW, pH);

        // 4. 泛光：擷取亮部到縮小的貼圖，橫直來回模糊
        gl.useProgram(pBright.id);
        this.bindTexture(pBright, 0, 'tColor', tHdr.tex);
        this.f1(pBright, 'uThreshold', B.THRESHOLD);
        this.drawTo(tBloomA, bW, bH);
        gl.useProgram(pBlur.id);
        for (let i = 0; i < B.PASSES; i++) {
            const step = 1 + i * B.STEP_GROW;
            this.bindTexture(pBlur, 0, 'tColor', tBloomA.tex);
            gl.uniform2f(this.loc(pBlur, 'uDir'), step / bW, 0);
            this.drawTo(tBloomB, bW, bH);
            this.bindTexture(pBlur, 0, 'tColor', tBloomB.tex);
            gl.uniform2f(this.loc(pBlur, 'uDir'), 0, step / bH);
            this.drawTo(tBloomA, bW, bH);
        }

        // 4b. 特效餘光：泛光再縮小、抹開，留給下一幀的著色當光源
        for (let i = 0; i < GL.PASSES; i++) {
            const step = 1 + i * GL.STEP_GROW;
            this.bindTexture(pBlur, 0, 'tColor', i === 0 ? tBloomA.tex : tGlowA.tex);
            gl.uniform2f(this.loc(pBlur, 'uDir'), step / gW, 0);
            this.drawTo(tGlowB, gW, gH);
            this.bindTexture(pBlur, 0, 'tColor', tGlowB.tex);
            gl.uniform2f(this.loc(pBlur, 'uDir'), 0, step / gH);
            this.drawTo(tGlowA, gW, gH);
        }

        // 5. 合成到 GL 畫布：泛光、曝光、暗角、色調映射
        gl.useProgram(pComposite.id);
        this.bindTexture(pComposite, 0, 'tColor', tHdr.tex);
        this.bindTexture(pComposite, 1, 'tBloom', tBloomA.tex);
        this.f1(pComposite, 'uBloom', B.STRENGTH);
        this.f1(pComposite, 'uExposure', look.exposure);
        this.f1(pComposite, 'uSplit', LIGHTING.SPLIT_TONE);
        this.f1(pComposite, 'uVignette', LIGHTING.VIGNETTE);
        this.drawTo(null, pW, pH);

        main.save();
        main.resetTransform();
        main.drawImage(glCanvas, 0, 0);
        main.restore();
    }
}
