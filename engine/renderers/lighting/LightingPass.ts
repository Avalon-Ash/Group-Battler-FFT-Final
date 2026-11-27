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
// ║  [ARCH] 光源位置只讀 UnitFrame（footX、floorY、transition），║
// ║         不自己算高度；外觀數值只讀 constants/lighting.ts。  ║
// ║  [ARCH] 一個頁面只建一個 GL context（LightingGate 的模組    ║
// ║         單例）；context 遺失時 beginWorld 回 null，管線走   ║
// ║         原本的直接路徑。                                    ║
// ║  [ARCH] 遮罩（tag）：單位剪影、特效、玩法標示各另畫一張半   ║
// ║         解析度畫布，著色器用它分辨類別；地塊不重畫。        ║
// ║  每幀流程：點光（instance 矩形，加法）→ 著色（世界×光、     ║
// ║  自發光、背景調色）→ 亮部擷取與模糊（泛光）→ 合成（曝光、   ║
// ║  暗角、色調映射）。                                         ║
// ╚══════════════════════════════════════════════════════════╝

import { ISO_SCALE_Y, LIGHTING, RENDER_QUALITY, UNIT_SPRITE, type LightingLook } from '../../../constants';
import type { HexLayout } from '../../../types';
import type { UnitRenderSystem } from '../../presentation/unit';
import type { UnitFrameStore } from '../frame/UnitFrame';
import { RenderDispatcher } from '../RenderDispatcher';
import { RenderOpType, type RenderOp } from '../RenderList';
import { BLUR_FRAG, BRIGHT_FRAG, COMPOSITE_FRAG, FULLSCREEN_VERT, LIGHT_FRAG, LIGHT_VERT, SHADE_FRAG } from './shaders';

/** 全螢幕四邊形（兩個三角形的 strip）；點光的矩形也用它 */
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUAD_VERTS = 4;
/** 一盞點光的 instance 資料：地面座標 xyz、範圍、顏色 rgb */
const LIGHT_STRIDE = 7;
const LIGHT_POS_SIZE = 4;
const LIGHT_COL_SIZE = 3;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
/** 地面深度相對螢幕 Y 的倍率（等距投影把地面 y 壓成 ISO_SCALE_Y 倍） */
const GROUND_PER_SCREEN_Y = 1 / ISO_SCALE_Y;

const ATTR_QUAD = 0;
const ATTR_LIGHT_POS = 1;
const ATTR_LIGHT_COL = 2;
/** 著色階段的貼圖單元（0～2 是世界、背景、點光） */
const TEX_UNIT_MASK = 3;
const TEX_GLOW_MASK = 4;
const TEX_INFO_MASK = 5;

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

export class LightingPass {
    private readonly world: HTMLCanvasElement;
    private readonly worldCtx: CanvasRenderingContext2D;
    /** 遮罩畫布（LIGHTING.MASK_SCALE 倍解析度，和世界畫布同一個相機變換）：只看 alpha */
    private readonly unitMask: HTMLCanvasElement;
    private readonly unitCtx: CanvasRenderingContext2D;
    private readonly glowMask: HTMLCanvasElement;
    private readonly glowCtx: CanvasRenderingContext2D;
    private readonly infoMask: HTMLCanvasElement;
    private readonly infoCtx: CanvasRenderingContext2D;
    private readonly maskCtxs: readonly CanvasRenderingContext2D[];
    private readonly glCanvas: HTMLCanvasElement;
    private readonly gl: WebGL2RenderingContext;
    private lost = false;
    /** 遮罩畫布的變換要不要重設（每幀第一次 tag 時照世界畫布此刻的相機變換設一次） */
    private maskStale = true;
    /** WEBGL_debug_renderer_info 的顯示卡字串；量測工具把它寫進證據 */
    public readonly gpu: string;

    private quadVao: WebGLVertexArrayObject | null = null;
    private lightVao: WebGLVertexArrayObject | null = null;
    private lightBuffer: WebGLBuffer | null = null;
    private readonly lightData = new Float32Array(LIGHTING.MAX_LIGHTS * LIGHT_STRIDE);
    private worldTex: WebGLTexture | null = null;
    private backTex: WebGLTexture | null = null;
    private unitTex: WebGLTexture | null = null;
    private glowTex: WebGLTexture | null = null;
    private infoTex: WebGLTexture | null = null;
    private pLight: Program | null = null;
    private pShade: Program | null = null;
    private pBright: Program | null = null;
    private pBlur: Program | null = null;
    private pComposite: Program | null = null;
    private tLight: Target | null = null;
    private tHdr: Target | null = null;
    private tBloomA: Target | null = null;
    private tBloomB: Target | null = null;
    /** 群系外觀（BASE 疊上 BIOME 覆寫）；每個群系合併一次 */
    private readonly looks = new Map<string, LightingLook>();

    /** 拿不到 WebGL2 或需要的擴充時丟出錯誤，由 LightingGate 記成不支援 */
    constructor() {
        this.world = document.createElement('canvas');
        const worldCtx = this.world.getContext('2d');
        this.unitMask = document.createElement('canvas');
        const unitCtx = this.unitMask.getContext('2d');
        this.glowMask = document.createElement('canvas');
        const glowCtx = this.glowMask.getContext('2d');
        this.infoMask = document.createElement('canvas');
        const infoCtx = this.infoMask.getContext('2d');
        this.glCanvas = document.createElement('canvas');
        const gl = this.glCanvas.getContext('webgl2', {
            alpha: false, antialias: false, depth: false, stencil: false,
        });
        if (!worldCtx || !unitCtx || !glowCtx || !infoCtx || !gl) throw new Error('webgl2');
        // HDR 中間貼圖（RGBA16F）要能當 render target
        if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float');
        this.worldCtx = worldCtx;
        this.unitCtx = unitCtx;
        this.glowCtx = glowCtx;
        this.infoCtx = infoCtx;
        this.maskCtxs = [unitCtx, glowCtx, infoCtx];
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
        gl.bindAttribLocation(id, ATTR_LIGHT_POS, 'iPos');
        gl.bindAttribLocation(id, ATTR_LIGHT_COL, 'iCol');
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

    /** 8 位元貼圖（Canvas 2D 畫布的上傳目的地） */
    private canvasTexture(filter: number = this.gl.NEAREST): WebGLTexture | null {
        const gl = this.gl;
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
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
        return { tex, fbo, w, h };
    }

    /** 建立（或 context 還原後重建）所有 GL 資源；render target 在 present 依畫布尺寸建立 */
    private createResources(): void {
        const gl = this.gl;
        this.tLight = this.tHdr = this.tBloomA = this.tBloomB = null;

        const quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

        this.quadVao = gl.createVertexArray();
        gl.bindVertexArray(this.quadVao);
        gl.enableVertexAttribArray(ATTR_QUAD);
        gl.vertexAttribPointer(ATTR_QUAD, 2, gl.FLOAT, false, 0, 0);

        this.lightVao = gl.createVertexArray();
        gl.bindVertexArray(this.lightVao);
        gl.enableVertexAttribArray(ATTR_QUAD);
        gl.vertexAttribPointer(ATTR_QUAD, 2, gl.FLOAT, false, 0, 0);
        this.lightBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.lightBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.lightData.byteLength, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(ATTR_LIGHT_POS);
        gl.vertexAttribPointer(ATTR_LIGHT_POS, LIGHT_POS_SIZE, gl.FLOAT, false, LIGHT_STRIDE * FLOAT_BYTES, 0);
        gl.vertexAttribDivisor(ATTR_LIGHT_POS, 1);
        gl.enableVertexAttribArray(ATTR_LIGHT_COL);
        gl.vertexAttribPointer(ATTR_LIGHT_COL, LIGHT_COL_SIZE, gl.FLOAT, false, LIGHT_STRIDE * FLOAT_BYTES, LIGHT_POS_SIZE * FLOAT_BYTES);
        gl.vertexAttribDivisor(ATTR_LIGHT_COL, 1);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.clearColor(0, 0, 0, 0);
        // Canvas 2D 的像素本來就是預乘 alpha：照原樣上傳，著色器自己解乘
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        this.worldTex = this.canvasTexture();
        this.backTex = this.canvasTexture();
        this.unitTex = this.canvasTexture(gl.LINEAR);
        this.glowTex = this.canvasTexture(gl.LINEAR);
        this.infoTex = this.canvasTexture(gl.LINEAR);
        this.pLight = this.program(LIGHT_VERT, LIGHT_FRAG);
        this.pShade = this.program(FULLSCREEN_VERT, SHADE_FRAG);
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
        return ctx;
    }

    /**
     * RenderPipeline 每畫完一個 op 呼叫一次：把「這個 op 是哪一類」另外記在遮罩畫布上（只看 alpha）。
     * - 單位、屍體 → 單位遮罩：用剪影（drawSilhouette，和遮擋剪影同一個入口）。
     * - 特效、投射物、施法圈、危害（熔岩、毒沼）→ 特效遮罩：照原樣再分發一次。
     * - 射程、預警、縮圈格（OVERLAY）→ 玩法標示遮罩：照原樣再分發一次。
     * - 障礙物：從三張遮罩挖掉自己的形狀（比它早畫的東西被它擋住）。
     * - 地塊不處理（最多、最貴）：被前方高地塊擋住的單位，遮罩會多出一塊（開案書 §6）。
     */
    public tag(op: RenderOp, layout: HexLayout, t: number, units: UnitRenderSystem): void {
        const type = op.type;
        if (type === RenderOpType.TERRAIN) return;
        if (this.maskStale) {
            this.maskStale = false;
            const m = this.worldCtx.getTransform();
            const k = LIGHTING.MASK_SCALE;
            for (const mctx of this.maskCtxs) mctx.setTransform(m.a * k, m.b * k, m.c * k, m.d * k, m.e * k, m.f * k);
        }
        if (type === RenderOpType.UNIT || type === RenderOpType.CORPSE) {
            if (op.unitFrame) units.drawSilhouette(this.unitCtx, op.unitFrame, t, layout);
        } else if (type === RenderOpType.OBSTACLE) {
            for (const mctx of this.maskCtxs) {
                mctx.globalCompositeOperation = 'destination-out';
                RenderDispatcher.dispatch(mctx, op, layout, t, units);
                mctx.globalCompositeOperation = 'source-over';
            }
        } else {
            RenderDispatcher.dispatch(type === RenderOpType.OVERLAY ? this.infoCtx : this.glowCtx, op, layout, t, units);
        }
    }

    /** 本幀的點光寫進 lightData，回傳盞數。位置只讀 UnitFrame。 */
    private collectLights(frames: UnitFrameStore): number {
        const U = LIGHTING.UNIT_LIGHT;
        const data = this.lightData;
        let n = 0;
        for (const f of frames.list) {
            if (!f.visible || f.isCorpse) continue;
            if (n >= LIGHTING.MAX_LIGHTS) break;
            const col = U.COLOR[f.agent.team] ?? U.FALLBACK;
            let i = n * LIGHT_STRIDE;
            data[i++] = f.footX;
            data[i++] = (f.floorY + f.transition) * GROUND_PER_SCREEN_Y + U.FRONT;
            data[i++] = U.HEIGHT + f.agent.physics.z;
            data[i++] = U.RANGE;
            data[i++] = col[0] * U.INTENSITY;
            data[i++] = col[1] * U.INTENSITY;
            data[i] = col[2] * U.INTENSITY;
            n++;
        }
        return n;
    }

    private bindTexture(p: Program, unit: number, name: string, tex: WebGLTexture | null): void {
        const gl = this.gl;
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(this.loc(p, name), unit);
    }

    private uniform3(p: Program, name: string, v: Vec3, k: number): void {
        this.gl.uniform3f(this.loc(p, name), v[0] * k, v[1] * k, v[2] * k);
    }

    private drawTo(t: Target | null, w: number, h: number): void {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fbo : null);
        gl.viewport(0, 0, w, h);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD_VERTS);
    }

    /**
     * 世界畫完後、世界畫布的相機變換還沒 restore 時呼叫（要讀這個變換把像素換回世界座標）。
     * main＝主畫布（此時只有背景）；biome＝SceneTheme.textureType。
     */
    public present(main: CanvasRenderingContext2D, frames: UnitFrameStore, biome: string): void {
        const { gl, glCanvas, world } = this;
        const { pLight, pShade, pBright, pBlur, pComposite } = this;
        if (this.lost || !pLight || !pShade || !pBright || !pBlur || !pComposite) return;
        const pW = world.width, pH = world.height;
        if (glCanvas.width !== pW || glCanvas.height !== pH) {
            glCanvas.width = pW;
            glCanvas.height = pH;
        }
        const B = LIGHTING.BLOOM;
        const bW = Math.max(1, Math.floor(pW / B.DOWNSCALE)), bH = Math.max(1, Math.floor(pH / B.DOWNSCALE));
        const tLight = this.tLight = this.target(this.tLight, pW, pH);
        const tHdr = this.tHdr = this.target(this.tHdr, pW, pH);
        const tBloomA = this.tBloomA = this.target(this.tBloomA, bW, bH);
        const tBloomB = this.tBloomB = this.target(this.tBloomB, bW, bH);

        const cam = this.worldCtx.getTransform();
        const look = this.lookFor(biome);
        const lightCount = this.collectLights(frames);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world);
        gl.bindTexture(gl.TEXTURE_2D, this.backTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, main.canvas);
        gl.bindTexture(gl.TEXTURE_2D, this.unitTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.unitMask);
        gl.bindTexture(gl.TEXTURE_2D, this.glowTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.glowMask);
        gl.bindTexture(gl.TEXTURE_2D, this.infoTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.infoMask);

        // 1. 點光：每盞一個矩形，加法疊進光照貼圖
        gl.bindFramebuffer(gl.FRAMEBUFFER, tLight.fbo);
        gl.viewport(0, 0, pW, pH);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (lightCount > 0) {
            gl.useProgram(pLight.id);
            gl.uniform2f(this.loc(pLight, 'uRes'), pW, pH);
            gl.uniform2f(this.loc(pLight, 'uOrigin'), cam.e, cam.f);
            gl.uniform1f(this.loc(pLight, 'uScale'), cam.a);
            gl.uniform1f(this.loc(pLight, 'uGroundPerY'), GROUND_PER_SCREEN_Y);
            gl.uniform1f(this.loc(pLight, 'uKnee'), LIGHTING.UNIT_LIGHT.KNEE);
            gl.bindVertexArray(this.lightVao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.lightBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lightData, 0, lightCount * LIGHT_STRIDE);
            gl.enable(gl.BLEND);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, QUAD_VERTS, lightCount);
            gl.disable(gl.BLEND);
        }
        gl.bindVertexArray(this.quadVao);

        // 2. 著色：世界 × (環境光 + 月光 + 點光)，自發光不受光，背景只調色
        const moonLen = Math.hypot(look.moonDir[0], look.moonDir[1], look.moonDir[2]);
        const moonFlat = look.moonIntensity * look.moonDir[2] / moonLen;   // 地面法線朝上：N·L = 月光方向的 z
        gl.useProgram(pShade.id);
        this.bindTexture(pShade, 0, 'tWorld', this.worldTex);
        this.bindTexture(pShade, 1, 'tBack', this.backTex);
        this.bindTexture(pShade, 2, 'tLight', tLight.tex);
        this.uniform3(pShade, 'uAmbient', look.ambient, 1);
        this.uniform3(pShade, 'uMoon', look.moonColor, moonFlat);
        gl.uniform3f(this.loc(pShade, 'uSkyTint'),
            look.ambient[0] * look.skyAmbient + look.moonColor[0] * look.skyMoon,
            look.ambient[1] * look.skyAmbient + look.moonColor[1] * look.skyMoon,
            look.ambient[2] * look.skyAmbient + look.moonColor[2] * look.skyMoon);
        this.bindTexture(pShade, TEX_UNIT_MASK, 'tUnit', this.unitTex);
        this.bindTexture(pShade, TEX_GLOW_MASK, 'tGlow', this.glowTex);
        this.bindTexture(pShade, TEX_INFO_MASK, 'tInfo', this.infoTex);
        gl.uniform1f(this.loc(pShade, 'uInfoGain'), LIGHTING.INFO_GAIN);
        gl.uniform1f(this.loc(pShade, 'uEmissiveGain'), LIGHTING.EMISSIVE_GAIN);
        gl.uniform1f(this.loc(pShade, 'uEnvChroma'), LIGHTING.ENV_CHROMA);
        // 剪影是以 UNIT_SPRITE.silhouetteAlpha 畫的：乘回去，遮罩才是 0～1 的覆蓋率
        gl.uniform1f(this.loc(pShade, 'uUnitMaskGain'), 1 / UNIT_SPRITE.silhouetteAlpha);
        this.drawTo(tHdr, pW, pH);

        // 3. 泛光：擷取亮部到縮小的貼圖，橫直來回模糊
        gl.useProgram(pBright.id);
        this.bindTexture(pBright, 0, 'tColor', tHdr.tex);
        gl.uniform1f(this.loc(pBright, 'uThreshold'), B.THRESHOLD);
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

        // 4. 合成到 GL 畫布：泛光、曝光、暗角、色調映射
        gl.useProgram(pComposite.id);
        this.bindTexture(pComposite, 0, 'tColor', tHdr.tex);
        this.bindTexture(pComposite, 1, 'tBloom', tBloomA.tex);
        gl.uniform1f(this.loc(pComposite, 'uBloom'), B.STRENGTH);
        gl.uniform1f(this.loc(pComposite, 'uExposure'), look.exposure);
        gl.uniform1f(this.loc(pComposite, 'uSplit'), LIGHTING.SPLIT_TONE);
        gl.uniform1f(this.loc(pComposite, 'uVignette'), LIGHTING.VIGNETTE);
        this.drawTo(null, pW, pH);

        main.save();
        main.resetTransform();
        main.drawImage(glCanvas, 0, 0);
        main.restore();
    }
}
