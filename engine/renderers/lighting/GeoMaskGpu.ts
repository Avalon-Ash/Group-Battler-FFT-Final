// ╔══════════════════════════════════════════════════════════╗
// ║  GeoMaskGpu — 幾何遮罩由 GL 畫（docs/plans/gpu-geo-mask.md）║
// ║  職責：直立物（單位剪影、障礙物）每張精靈貼圖一個 instance，║
// ║        一趟 instanced 繪製畫進一張 RGBA8 貼圖（遮罩解析度，  ║
// ║        LIGHTING.MASK_SCALE），著色器照漸層章的定義算 r、g、b ║
// ║        與覆蓋率（shaders.ts GEO_FRAG）。取代 Canvas 2D 暫存  ║
// ║        畫布＋上傳。                                        ║
// ║  上游：LightingPass.tag（每個 UNIT／OBSTACLE op 一次，資料  ║
// ║        來自 SpriteCapture）、LightingPass.present（render）。║
// ║  [ARCH] 位置與形狀只讀 SpriteCapture 擷取到的 drawImage 參數 ║
// ║        與變換，不自己算；章的矩形由 LightingPass 給（UnitFrame ║
// ║        與障礙物精靈錨點，RenderSpec §1 尾段）。              ║
// ║  [ARCH] 疊合順序＝繪製順序（預乘 alpha 的 source-over；加法  ║
// ║        疊層用 ONE, ONE）；同一張來源圖、同一種混合的連續     ║
// ║        instance 合成一次繪製，不依貼圖重排。                ║
// ║  [ARCH] 精靈圖集第一次用到時上傳成貼圖（之後不再上傳）；     ║
// ║        尺寸變了重傳；TEX_IDLE_FRAMES 幀沒用到就刪。context   ║
// ║        還原時 LightingPass 重建整個物件。                    ║
// ╚══════════════════════════════════════════════════════════╝

import { LIGHTING } from '../../../constants';
import type { CapturedBlit } from '../SpriteCapture';
import { GEO_FRAG, GEO_VERT } from './shaders';

export interface GlProgram {
    readonly id: WebGLProgram;
    readonly uniforms: Map<string, WebGLUniformLocation | null>;
}

/** LightingPass 提供的著色器工廠（編譯、連結、uniform 位置快取只寫在一處） */
export interface GlProgramFactory {
    program(vert: string, frag: string, attribs: readonly string[]): GlProgram;
    loc(p: GlProgram, name: string): WebGLUniformLocation | null;
}

/** 頂點屬性：0＝四邊形角（aPos，共用 LightingPass 的 QUAD 緩衝），之後每個 instance 五個 vec4 */
const ATTR_QUAD = 0;
const INST_ATTRS = ['iM0', 'iM1', 'iDst', 'iUv', 'iStamp'] as const;
const ATTRIBS: readonly string[] = ['aPos', ...INST_ATTRS];
const VEC4 = 4;
const STRIDE = INST_ATTRS.length * VEC4;
const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT;
const QUAD_VERTS = 4;
/** 圖集貼圖只存 alpha（一個位元組一像素）：幾何遮罩只用形狀，顏色由章決定 */
const ALPHA_BYTES = 1;

interface CachedTexture {
    readonly tex: WebGLTexture | null;
    readonly w: number;
    readonly h: number;
    used: number;
}

/** 可以上傳成貼圖、也知道自己尺寸的來源（精靈與障礙物圖集實際用到的種類） */
type SizedSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap | OffscreenCanvas;

function sized(image: CanvasImageSource): SizedSource | null {
    if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) return image;
    if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) return image;
    if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) return image;
    if (typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas) return image;
    return null;
}

function sizeOf(s: SizedSource): { w: number; h: number } {
    if (typeof HTMLImageElement !== 'undefined' && s instanceof HTMLImageElement) return { w: s.naturalWidth, h: s.naturalHeight };
    return { w: s.width, h: s.height };
}

/** 診斷（量測與比對探針讀）：本幀的 instance 數、繪製次數、丟掉的；圖集貼圖的張數與位元組 */
export interface GeoMaskStats {
    instances: number;
    runs: number;
    dropped: number;
    unsupported: number;
    textures: number;
    textureBytes: number;
    uploads: number;
}

export class GeoMaskGpu {
    private readonly prog: GlProgram;
    private readonly vao: WebGLVertexArrayObject | null;
    private readonly buffer: WebGLBuffer | null;
    private readonly data: Float32Array;
    /** 每個 instance 的來源貼圖與混合（run 的切分依據） */
    private readonly texOf: (WebGLTexture | null)[];
    private readonly additiveOf: Uint8Array;
    private count = 0;
    private frame = 0;
    private readonly cache = new Map<CanvasImageSource, CachedTexture>();
    private targetTex: WebGLTexture | null = null;
    private targetFbo: WebGLFramebuffer | null = null;
    private targetW = 0;
    private targetH = 0;
    private targetOk = false;
    public readonly stats: GeoMaskStats = { instances: 0, runs: 0, dropped: 0, unsupported: 0, textures: 0, textureBytes: 0, uploads: 0 };

    constructor(private readonly gl: WebGL2RenderingContext, private readonly f: GlProgramFactory, quad: WebGLBuffer | null) {
        const max = LIGHTING.MAX_CASTERS * LIGHTING.GEO.GPU_BLITS_PER_ITEM;
        this.data = new Float32Array(max * STRIDE);
        this.texOf = new Array<WebGLTexture | null>(max).fill(null);
        this.additiveOf = new Uint8Array(max);
        this.prog = f.program(GEO_VERT, GEO_FRAG, ATTRIBS);
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(ATTR_QUAD);
        gl.vertexAttribPointer(ATTR_QUAD, 2, gl.FLOAT, false, 0, 0);
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
        for (let i = 0; i < INST_ATTRS.length; i++) {
            gl.enableVertexAttribArray(ATTR_QUAD + 1 + i);
            gl.vertexAttribDivisor(ATTR_QUAD + 1 + i, 1);
        }
        this.pointAttribs(0);
        gl.bindVertexArray(null);
    }

    /** instance 屬性指到第 first 個 instance（WebGL2 沒有 baseInstance，每個 run 重設一次） */
    private pointAttribs(first: number): void {
        const gl = this.gl;
        const base = first * STRIDE * FLOAT_BYTES;
        for (let i = 0; i < INST_ATTRS.length; i++) {
            gl.vertexAttribPointer(ATTR_QUAD + 1 + i, VEC4, gl.FLOAT, false, STRIDE * FLOAT_BYTES, base + i * VEC4 * FLOAT_BYTES);
        }
    }

    /** 每幀開頭：清空 instance、刪掉太久沒用的圖集貼圖 */
    public begin(): void {
        this.count = 0;
        this.frame++;
        this.stats.dropped = this.stats.unsupported = this.stats.uploads = 0;
        for (const [img, c] of this.cache) {
            if (this.frame - c.used > LIGHTING.GEO.TEX_IDLE_FRAMES) {
                this.gl.deleteTexture(c.tex);
                this.cache.delete(img);
            }
        }
    }

    private textureFor(image: CanvasImageSource): CachedTexture | null {
        const s = sized(image);
        if (!s) return null;
        const { w, h } = sizeOf(s);
        if (w <= 0 || h <= 0) return null;
        let c = this.cache.get(image);
        if (!c || c.w !== w || c.h !== h) {
            const gl = this.gl;
            if (c) gl.deleteTexture(c.tex);
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            // UNPACK_FLIP_Y_WEBGL 在 LightingPass 是開著的：貼圖上下翻轉，來源矩形的 v 在 add 裡跟著翻
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, gl.ALPHA, gl.UNSIGNED_BYTE, s);
            c = { tex, w, h, used: this.frame };
            this.cache.set(image, c);
            this.stats.uploads++;
        }
        c.used = this.frame;
        return c;
    }

    /**
     * 加一張擷取到的貼圖：章的世界矩形 (x0, y0, w)（高＝MAX_HEIGHT ×（1 + FOOT_PAD），腳底在 y0 + MAX_HEIGHT），
     * isUnit 進 g，coverage 乘在擷取到的不透明度上。
     */
    public add(b: CapturedBlit, whole: boolean, x0: number, y0: number, w: number, isUnit: boolean, coverage: number): void {
        const n = this.count;
        if (n >= this.texOf.length) { this.stats.dropped++; return; }
        const t = this.textureFor(b.image);
        if (!t) { this.stats.unsupported++; return; }
        const sx = whole ? 0 : b.sx, sy = whole ? 0 : b.sy, sw = whole ? t.w : b.sw, sh = whole ? t.h : b.sh;
        const d = this.data;
        let i = n * STRIDE;
        d[i++] = b.a; d[i++] = b.b; d[i++] = b.c; d[i++] = b.d;
        d[i++] = b.e; d[i++] = b.f; d[i++] = b.alpha * coverage; d[i++] = isUnit ? 1 : 0;
        d[i++] = b.dx; d[i++] = b.dy; d[i++] = b.dw; d[i++] = b.dh;
        d[i++] = sx / t.w; d[i++] = 1 - sy / t.h; d[i++] = (sx + sw) / t.w; d[i++] = 1 - (sy + sh) / t.h;
        d[i++] = x0; d[i++] = y0; d[i++] = w; d[i] = 0;
        this.texOf[n] = t.tex;
        this.additiveOf[n] = b.additive ? 1 : 0;
        this.count = n + 1;
    }

    /** RGBA8、線性取樣的遮罩貼圖；尺寸沒變就沿用。建不起來回 false */
    private ensureTarget(w: number, h: number): boolean {
        const gl = this.gl;
        if (this.targetTex && this.targetW === w && this.targetH === h) return this.targetOk;
        gl.deleteTexture(this.targetTex);
        gl.deleteFramebuffer(this.targetFbo);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        this.targetTex = tex;
        this.targetFbo = fbo;
        this.targetW = w;
        this.targetH = h;
        this.targetOk = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        return this.targetOk;
    }

    /**
     * 把本幀的 instance 畫進遮罩貼圖（mW×mH＝遮罩解析度；cam＝世界畫布此刻的相機變換）。回傳遮罩貼圖；建不起來回 null。
     * 結束時 GL 狀態還原成 LightingPass 預設的（不混合、blendFunc ONE, ONE、沒綁 VAO）。
     */
    public render(cam: DOMMatrixReadOnly, mW: number, mH: number): WebGLTexture | null {
        const gl = this.gl, p = this.prog, f = this.f;
        if (!this.ensureTarget(mW, mH)) return null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.targetFbo);
        gl.viewport(0, 0, mW, mH);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const n = this.count;
        const st = this.stats;
        st.instances = n;
        st.runs = 0;
        st.textures = this.cache.size;
        st.textureBytes = 0;
        for (const c of this.cache.values()) st.textureBytes += c.w * c.h * ALPHA_BYTES;
        if (n === 0) return this.targetTex;
        const G = LIGHTING.GEO, k = LIGHTING.MASK_SCALE;
        gl.useProgram(p.id);
        gl.uniform2f(f.loc(p, 'uRes'), mW, mH);
        gl.uniform1f(f.loc(p, 'uK'), k);
        gl.uniform2f(f.loc(p, 'uOrigin'), cam.e * k, cam.f * k);
        gl.uniform1f(f.loc(p, 'uScale'), cam.a * k);
        gl.uniform1f(f.loc(p, 'uMaxH'), G.MAX_HEIGHT);
        gl.uniform1f(f.loc(p, 'uStampH'), G.MAX_HEIGHT * (1 + G.FOOT_PAD));
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(f.loc(p, 'tSprite'), 0);
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, n * STRIDE);
        gl.enable(gl.BLEND);
        for (let start = 0; start < n;) {
            const tex = this.texOf[start], add = this.additiveOf[start];
            let end = start + 1;
            while (end < n && this.texOf[end] === tex && this.additiveOf[end] === add) end++;
            // 預乘 alpha：source-over＝(ONE, ONE_MINUS_SRC_ALPHA)；加法疊層（lighter）＝(ONE, ONE)
            gl.blendFunc(gl.ONE, add ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            this.pointAttribs(start);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, QUAD_VERTS, end - start);
            st.runs++;
            start = end;
        }
        gl.disable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.bindVertexArray(null);
        return this.targetTex;
    }
}
