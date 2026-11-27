// ╔══════════════════════════════════════════════════════════╗
// ║  LightingPass — WebGL2 打光與後製通道（ADR 0029）          ║
// ║  職責：擁有「世界畫布」（Canvas 2D，透明底）與一個 WebGL2   ║
// ║        畫布。RenderPipeline 把世界畫進世界畫布，present     ║
// ║        把它上傳成貼圖、處理後用 drawImage 貼回主畫布。      ║
// ║  上游：RenderPipeline.draw（經 LightingGate 延後載入）      ║
// ║  [ARCH] 全專案唯一使用 WebGL 的目錄；只用瀏覽器 WebGL2 API。║
// ║  [ARCH] 不改任何座標：世界畫布與主畫布同尺寸、同變換，      ║
// ║         排序鍵與繪製點都不經過這裡（RenderSpec §1 尾段）。  ║
// ║  [ARCH] 一個頁面只建一個 GL context（模組單例）；context    ║
// ║         遺失時 beginWorld 回 null，管線走原本的直接路徑。   ║
// ╚══════════════════════════════════════════════════════════╝

import { RENDER_QUALITY } from '../../../constants';

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

/** 原樣貼回：世界貼圖（預乘 alpha）不經任何運算輸出 */
const COPY_FRAG = `#version 300 es
precision highp float; in vec2 vUv; out vec4 o;
uniform sampler2D tWorld;
void main(){ o = texture(tWorld, vUv); }`;

/** 全螢幕四邊形（兩個三角形的 strip） */
const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class LightingPass {
    private readonly world: HTMLCanvasElement;
    private readonly worldCtx: CanvasRenderingContext2D;
    private readonly glCanvas: HTMLCanvasElement;
    private readonly gl: WebGL2RenderingContext;
    private copyProgram: WebGLProgram | null = null;
    private worldTex: WebGLTexture | null = null;
    private lost = false;
    /** WEBGL_debug_renderer_info 的顯示卡字串；量測工具把它寫進證據 */
    public readonly gpu: string;

    /** 拿不到 WebGL2 或需要的擴充時丟出錯誤，由 LightingGate 記成不支援 */
    constructor() {
        this.world = document.createElement('canvas');
        const worldCtx = this.world.getContext('2d');
        this.glCanvas = document.createElement('canvas');
        const gl = this.glCanvas.getContext('webgl2', {
            alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
        });
        if (!worldCtx || !gl) throw new Error('webgl2');
        // HDR 中間貼圖要能當 render target（打光階段用；骨架階段先確認，免得兩階段的支援條件不同）
        if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float');
        this.worldCtx = worldCtx;
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

    private program(frag: string): WebGLProgram {
        const gl = this.gl;
        const p = gl.createProgram();
        if (!p) throw new Error('program');
        gl.attachShader(p, this.compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(p, this.compile(gl.FRAGMENT_SHADER, frag));
        gl.bindAttribLocation(p, 0, 'aPos');
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
        return p;
    }

    /** 建立（或 context 還原後重建）所有 GL 資源 */
    private createResources(): void {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.BLEND);
        // Canvas 2D 的像素本來就是預乘 alpha：照原樣上傳、照原樣輸出，中間不做解乘再乘（會差 1）
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        this.copyProgram = this.program(COPY_FRAG);
        this.worldTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * 開始一幀的世界繪製：回傳世界畫布的 context（已清空、已套 dpr 縮放、取樣品質同主畫布）。
     * backdrop：先把這張畫布（主畫布，此時只有背景）原樣畫進世界畫布，世界畫布因此不透明，
     * 疊在背景上的混合模式（screen、lighter、multiply）結果和直接畫主畫布逐位元相同。
     * context 遺失時回 null，呼叫端改畫主畫布。
     */
    public beginWorld(pW: number, pH: number, dpr: number, backdrop?: HTMLCanvasElement): CanvasRenderingContext2D | null {
        if (this.lost) return null;
        const { world, worldCtx: ctx } = this;
        if (world.width !== pW || world.height !== pH) {
            world.width = pW;
            world.height = pH;
        } else {
            ctx.resetTransform();
            ctx.clearRect(0, 0, pW, pH);
        }
        if (backdrop) ctx.drawImage(backdrop, 0, 0);
        // 畫布改尺寸會重設 context 狀態，所以和主畫布一樣每幀設定
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = RENDER_QUALITY.IMAGE_SMOOTHING;
        ctx.scale(dpr, dpr);
        return ctx;
    }

    /** 世界畫完後呼叫：處理世界畫布並貼回主畫布（主畫布此時只有背景） */
    public present(main: CanvasRenderingContext2D): void {
        const { gl, glCanvas, world } = this;
        if (this.lost || !this.copyProgram) return;
        const pW = world.width, pH = world.height;
        if (glCanvas.width !== pW || glCanvas.height !== pH) {
            glCanvas.width = pW;
            glCanvas.height = pH;
        }
        gl.viewport(0, 0, pW, pH);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.worldTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, world);
        gl.useProgram(this.copyProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        main.save();
        main.resetTransform();
        main.drawImage(glCanvas, 0, 0);
        main.restore();
    }
}
