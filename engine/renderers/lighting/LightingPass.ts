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
// ║   幾何遮罩＝直立物（單位、障礙物）各蓋一張漸層章，記離腳底  ║
// ║   的高度、是不是單位、橫向位置；特效遮罩；玩法標示遮罩。    ║
// ║   同時收集點光（存活單位）與投影物（單位、障礙物的腳印）。  ║
// ║   地塊 op 順帶畫的基礎疊層進玩法標示遮罩、貼地法陣進特效    ║
// ║   遮罩（否則會被當成地面壓暗）。                            ║
// ║  每幀流程：投影物貼圖 → 點光（instance 矩形，加法，含投影） ║
// ║  → 著色（環境光、月光與投影、接觸暗部、邊光、自發光、背景   ║
// ║  調色）→ 泛光 → 特效餘光（泛光再抹開，留給下一幀當光源）    ║
// ║  → 合成（曝光、暗角、色調映射）。                           ║
// ║  [ARCH] 通道不能用（render target 建不起來、context 遺失、  ║
// ║         dispose 之後）時 present 把世界畫布原樣疊回主畫布。 ║
// ╚══════════════════════════════════════════════════════════╝

import { ISO_SCALE_Y, LIGHTING, RENDER_QUALITY, UNIT_SPRITE, type LightingLook } from '../../../constants';
import type { HexLayout } from '../../../types';
import type { UnitRenderSystem } from '../../presentation/unit';
import { SpriteManager } from '../../sprites';
import type { GroundDrapeLayer } from '../GroundDrape';
import { GridOverlays } from '../grid/GridOverlays';
import { RenderDispatcher } from '../RenderDispatcher';
import { RenderOpType, type RenderOp } from '../RenderList';
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
/** 剪影是以 UNIT_SPRITE.silhouetteAlpha 畫的：畫這麼多次，遮罩的覆蓋率才過半 */
const SILHOUETTE_REPEAT = Math.round(1 / UNIT_SPRITE.silhouetteAlpha);
const BYTE_MAX = 255;
const RGBA = 4;

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

interface Program {
    readonly id: WebGLProgram;
    readonly uniforms: Map<string, WebGLUniformLocation | null>;
}

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

/**
 * 漸層章：由上到下 r＝離腳底的高度（MAX_HEIGHT → 0，最下面 FOOT_PAD 那段是 0），
 * 由左到右 b＝橫向位置，g＝是不是單位。蓋的時候拉伸到精靈的範圍並以 source-in 裁成精靈的形狀。
 */
function makeStamp(isUnit: boolean): HTMLCanvasElement {
    const n = LIGHTING.GEO.STAMP_SIZE;
    const { canvas, ctx } = makeCanvas();
    canvas.width = n;
    canvas.height = n;
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) {
        const height = Math.max(0, 1 - (y + 0.5) / n * (1 + LIGHTING.GEO.FOOT_PAD));
        for (let x = 0; x < n; x++) {
            const i = (y * n + x) * RGBA;
            img.data[i] = Math.round(height * BYTE_MAX);
            img.data[i + 1] = isUnit ? BYTE_MAX : 0;
            img.data[i + 2] = Math.round((x + 0.5) / n * BYTE_MAX);
            img.data[i + 3] = BYTE_MAX;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

export class LightingPass {
    private readonly world: HTMLCanvasElement;
    private readonly worldCtx: CanvasRenderingContext2D;
    /** 遮罩畫布（LIGHTING.MASK_SCALE 倍解析度，和世界畫布同一個相機變換） */
    private readonly geoCtx: CanvasRenderingContext2D;
    private readonly glowCtx: CanvasRenderingContext2D;
    private readonly infoCtx: CanvasRenderingContext2D;
    /** 蓋章用的暫存畫布：精靈先畫在這裡、裁成漸層章，再貼進幾何遮罩 */
    private readonly scratchCtx: CanvasRenderingContext2D;
    private readonly maskCtxs: readonly CanvasRenderingContext2D[];
    private readonly unitStamp = makeStamp(true);
    private readonly obstacleStamp = makeStamp(false);
    private readonly glCanvas: HTMLCanvasElement;
    private readonly gl: WebGL2RenderingContext;
    private lost = false;
    /** 遮罩畫布的變換要不要重設（每幀第一次 tag 時照世界畫布此刻的相機變換設一次） */
    private maskStale = true;
    /** 遮罩畫布的相機變換（等比縮放 + 平移）：蓋章時把世界座標換成遮罩像素 */
    private maskScale = 1;
    private maskOX = 0;
    private maskOY = 0;
    /** WEBGL_debug_renderer_info 的顯示卡字串；量測工具把它寫進證據 */
    public readonly gpu: string;

    private quadVao: WebGLVertexArrayObject | null = null;
    private instVao: WebGLVertexArrayObject | null = null;
    private instBuffer: WebGLBuffer | null = null;
    private readonly lightData = new Float32Array(LIGHTING.MAX_LIGHTS * INST_STRIDE);
    private lightCount = 0;
    private readonly casterData = new Float32Array(LIGHTING.MAX_CASTERS * INST_STRIDE);
    private casterCount = 0;
    private worldTex: WebGLTexture | null = null;
    private backTex: WebGLTexture | null = null;
    private geoTex: WebGLTexture | null = null;
    private glowTex: WebGLTexture | null = null;
    private infoTex: WebGLTexture | null = null;
    private pCaster: Program | null = null;
    private pLight: Program | null = null;
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
        this.geoCtx = makeCanvas().ctx;
        this.glowCtx = makeCanvas().ctx;
        this.infoCtx = makeCanvas().ctx;
        this.scratchCtx = makeCanvas().ctx;
        this.maskCtxs = [this.geoCtx, this.glowCtx, this.infoCtx, this.scratchCtx];
        this.glCanvas = document.createElement('canvas');
        // failIfMajorPerformanceCaveat：只有軟體算圖（沒有顯示卡加速）可用時不建 context，走原本的 Canvas 2D 路徑；
        // 軟體 WebGL 跑全螢幕打光會把幀率拖到個位數
        const gl = this.glCanvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: true,
        });
        if (!gl) throw new Error('webgl2');
        // HDR 中間貼圖（RGBA16F）要能當 render target
        if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float');
        this.gl = gl;
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        this.gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'unknown';
        this.glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
        this.glCanvas.addEventListener('webglcontextrestored', () => { this.createResources(); this.lost = false; });
        this.createResources();
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

    private program(vert: string, frag: string): Program {
        const gl = this.gl;
        const id = gl.createProgram();
        if (!id) throw new Error('program');
        gl.attachShader(id, this.compile(gl.VERTEX_SHADER, vert));
        gl.attachShader(id, this.compile(gl.FRAGMENT_SHADER, frag));
        gl.bindAttribLocation(id, ATTR_QUAD, 'aPos');
        gl.bindAttribLocation(id, ATTR_INST_POS, 'iPos');
        gl.bindAttribLocation(id, ATTR_INST_COL, 'iCol');
        gl.linkProgram(id);
        if (!gl.getProgramParameter(id, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(id) ?? 'link');
        return { id, uniforms: new Map() };
    }

    private loc(p: Program, name: string): WebGLUniformLocation | null {
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
        gl.bufferData(gl.ARRAY_BUFFER, Math.max(this.lightData.byteLength, this.casterData.byteLength), gl.DYNAMIC_DRAW);
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
        this.geoTex = this.canvasTexture(gl.LINEAR);
        this.glowTex = this.canvasTexture(gl.LINEAR);
        this.infoTex = this.canvasTexture(gl.LINEAR);
        const steps = LIGHTING.SHADOW.STEPS;
        this.pCaster = this.program(INSTANCE_VERT, CASTER_FRAG);
        this.pLight = this.program(INSTANCE_VERT, lightFrag(steps));
        this.pShade = this.program(FULLSCREEN_VERT, shadeFrag(steps));
        this.pBright = this.program(FULLSCREEN_VERT, BRIGHT_FRAG);
        this.pBlur = this.program(FULLSCREEN_VERT, BLUR_FRAG);
        this.pComposite = this.program(FULLSCREEN_VERT, COMPOSITE_FRAG);
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
     * 把暫存畫布上（世界座標的矩形 x0,y0,w,h 內）剛畫好的精靈裁成漸層章，貼進幾何遮罩，再清掉暫存。
     * 呼叫前暫存畫布已經 save 並 clip 到這個矩形。
     */
    private stamp(stampImage: HTMLCanvasElement, x0: number, y0: number, w: number, h: number): void {
        const s = this.scratchCtx, g = this.geoCtx;
        s.globalCompositeOperation = 'source-in';
        s.drawImage(stampImage, x0, y0, w, h);
        s.restore();
        const k = this.maskScale;
        const dx = Math.max(0, Math.floor(x0 * k + this.maskOX) - 1), dy = Math.max(0, Math.floor(y0 * k + this.maskOY) - 1);
        const dw = Math.min(s.canvas.width - dx, Math.ceil(w * k) + 3), dh = Math.min(s.canvas.height - dy, Math.ceil(h * k) + 3);
        if (dw <= 0 || dh <= 0) return;
        g.save();
        g.resetTransform();
        g.drawImage(s.canvas, dx, dy, dw, dh, dx, dy, dw, dh);
        g.restore();
        s.save();
        s.resetTransform();
        s.clearRect(dx, dy, dw, dh);
        s.restore();
    }

    private clipScratch(x0: number, y0: number, w: number, h: number): void {
        const s = this.scratchCtx;
        s.save();
        s.beginPath();
        s.rect(x0, y0, w, h);
        s.clip();
    }

    /**
     * RenderPipeline 每畫完一個 op 呼叫一次：把「這個 op 是哪一類」另外記在遮罩畫布上，並收集光源與投影物。
     * - 單位 → 幾何遮罩（剪影 drawSilhouette，和遮擋剪影同一個入口，蓋單位章）＋一盞點光＋一個投影物；
     *   並從特效遮罩挖掉自己（比它早畫的特效被它擋住）。
     * - 障礙物 → 幾何遮罩（蓋障礙物章）＋一個投影物；並從特效、玩法標示遮罩挖掉自己。
     * - 特效、投射物、施法圈、危害（熔岩、毒沼）→ 特效遮罩：照原樣再分發一次。
     * - 射程、預警、縮圈格（OVERLAY）→ 玩法標示遮罩：照原樣再分發一次。
     * - 地塊本體不重畫（最多、最貴）：被前方高地塊擋住的單位，遮罩會多出一塊（開案書 §6）。
     *   地塊 op 順帶畫的兩樣要進遮罩，否則會被當成地面壓暗：基礎疊層（狀態底色、區域、地塊光）→ 玩法標示遮罩；
     *   貼地鋪設特效（法陣）→ 特效遮罩。繪製點和 RenderDispatcher 用同一個 snap。
     */
    public tag(op: RenderOp, layout: HexLayout, t: number, units: UnitRenderSystem, drape: GroundDrapeLayer): void {
        const type = op.type;
        if (type === RenderOpType.CORPSE) return;
        if (this.maskStale) {
            this.maskStale = false;
            const m = this.worldCtx.getTransform();
            const k = LIGHTING.MASK_SCALE;
            this.maskScale = m.a * k;
            this.maskOX = m.e * k;
            this.maskOY = m.f * k;
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
        const stampH = G.MAX_HEIGHT * (1 + G.FOOT_PAD);
        if (type === RenderOpType.UNIT) {
            const f = op.unitFrame;
            if (!f || f.isCorpse) return;
            const height = f.floorY - f.hudAnchorY;
            const halfW = height * G.UNIT_HALF_WIDTH;
            const x0 = f.footX - halfW, y0 = f.floorY - G.MAX_HEIGHT;
            this.clipScratch(x0, y0, halfW * 2, stampH);
            for (let i = 0; i < SILHOUETTE_REPEAT; i++) units.drawSilhouette(this.scratchCtx, f, t, layout);
            this.stamp(this.unitStamp, x0, y0, halfW * 2, stampH);
            for (const mctx of [this.glowCtx, this.infoCtx]) {
                mctx.globalCompositeOperation = 'destination-out';
                for (let i = 0; i < SILHOUETTE_REPEAT; i++) units.drawSilhouette(mctx, f, t, layout);
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
            this.clipScratch(x0, y0, halfW * 2, stampH);
            RenderDispatcher.dispatch(this.scratchCtx, op, layout, t, units);
            this.stamp(this.obstacleStamp, x0, y0, halfW * 2, stampH);
            for (const mctx of [this.glowCtx, this.infoCtx]) {
                mctx.globalCompositeOperation = 'destination-out';
                RenderDispatcher.dispatch(mctx, op, layout, t, units);
                mctx.globalCompositeOperation = 'source-over';
            }
            this.pushCaster(op.tx, op.ty, ob.width, Math.min(G.MAX_HEIGHT, ob.anchorY));
        } else {
            RenderDispatcher.dispatch(type === RenderOpType.OVERLAY ? this.infoCtx : this.glowCtx, op, layout, t, units);
        }
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

    /** 釋放 GL context 與離屏畫布（LightingGate 判定這台機器跑不動時呼叫）；之後這個物件不再使用 */
    public dispose(): void {
        this.lost = true;
        this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        for (const c of [this.world, this.glCanvas, ...this.maskCtxs.map((m) => m.canvas)]) { c.width = 0; c.height = 0; }
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
        const { pCaster, pLight, pShade, pBright, pBlur, pComposite } = this;
        const pW = world.width, pH = world.height;
        if (this.lost || !pCaster || !pLight || !pShade || !pBright || !pBlur || !pComposite) { this.blitUnlit(main); return; }
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

        gl.activeTexture(gl.TEXTURE0);
        this.upload(this.worldTex, world);
        this.upload(this.backTex, main.canvas);
        this.upload(this.geoTex, this.geoCtx.canvas);
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
