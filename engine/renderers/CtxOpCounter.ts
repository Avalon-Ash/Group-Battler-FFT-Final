/**
 * CtxOpCounter — Canvas 原生操作診斷計數器
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 本模組為純診斷量測工具，特許存在於 engine/renderers/ 目錄。
 *  - 僅在 RenderStats.enabled 且 URL 包含 ?perfops 時啟用。
 *  - 停用時（預設）wrapContext 直接回傳原 context，所有方法立即 early return，熱路徑零成本。
 *  - 啟用時以 Proxy 攔截主畫布 Context，計數 shadowBlur、save、restore、
 *    createLinearGradient/RadialGradient/Pattern、drawImage、fill、stroke、
 *    globalCompositeOperation 變更次數，並依 painter 作用域累計。
 */

import { RENDER_PERF } from '../../constants';
import { RenderStats } from './RenderStats';

export interface OpCounts {
    shadowBlur: number;
    save: number;
    restore: number;
    createGradientOrPattern: number;
    drawImage: number;
    fill: number;
    stroke: number;
    globalCompositeOperation: number;
}

export type OpType = keyof OpCounts;

function createEmptyCounts(): OpCounts {
    return {
        shadowBlur: 0,
        save: 0,
        restore: 0,
        createGradientOrPattern: 0,
        drawImage: 0,
        fill: 0,
        stroke: 0,
        globalCompositeOperation: 0,
    };
}

export class CtxOpCounterCollector {
    public enabled: boolean = false;
    private currentFrame = createEmptyCounts();
    private emaCounts = createEmptyCounts();
    private currentScope: string = 'other';
    private scopeCounts = new Map<string, OpCounts>();
    private scopeTimes = new Map<string, number>();
    private scopeEmaTimes = new Map<string, number>();
    private proxyCache = new WeakMap<CanvasRenderingContext2D, CanvasRenderingContext2D>();

    constructor() {
        if (typeof location !== 'undefined' && location.search) {
            try {
                const params = new URLSearchParams(location.search);
                this.enabled = RenderStats.enabled && params.has(RENDER_PERF.OPS_QUERY_KEY);
            } catch {
                this.enabled = false;
            }
        }
    }

    public setEnabledForTest(val: boolean): void {
        this.enabled = val;
    }

    public wrapContext(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
        if (!this.enabled) return ctx;

        const cached = this.proxyCache.get(ctx);
        if (cached) return cached;

        const boundFnCache = new Map<string | symbol, Function>();
        const self = this;

        const proxy = new Proxy(ctx, {
            get(target: CanvasRenderingContext2D, prop: string | symbol) {
                if (prop === 'save') {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = () => {
                            self.onOp('save');
                            return target.save();
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }
                if (prop === 'restore') {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = () => {
                            self.onOp('restore');
                            return target.restore();
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }
                if (prop === 'drawImage') {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = (...args: [CanvasImageSource, number, number]) => {
                            self.onOp('drawImage');
                            return Reflect.apply(target.drawImage, target, args);
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }
                if (prop === 'fill') {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = (...args: [CanvasFillRule?]) => {
                            self.onOp('fill');
                            return Reflect.apply(target.fill, target, args);
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }
                if (prop === 'stroke') {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = (...args: [Path2D?]) => {
                            self.onOp('stroke');
                            return Reflect.apply(target.stroke, target, args);
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }
                if (
                    prop === 'createLinearGradient' ||
                    prop === 'createRadialGradient' ||
                    prop === 'createPattern' ||
                    prop === 'createConicGradient'
                ) {
                    let fn = boundFnCache.get(prop);
                    if (!fn) {
                        fn = (...args: unknown[]) => {
                            self.onOp('createGradientOrPattern');
                            const targetFn = target[prop as keyof CanvasRenderingContext2D];
                            if (typeof targetFn === 'function') {
                                return Reflect.apply(targetFn, target, args);
                            }
                            return null;
                        };
                        boundFnCache.set(prop, fn);
                    }
                    return fn;
                }

                const rawVal = target[prop as keyof CanvasRenderingContext2D];
                if (typeof rawVal === 'function') {
                    let bound = boundFnCache.get(prop);
                    if (!bound) {
                        bound = rawVal.bind(target);
                        boundFnCache.set(prop, bound);
                    }
                    return bound;
                }
                return rawVal;
            },

            set(target: CanvasRenderingContext2D, prop: string | symbol, val: unknown) {
                if (prop === 'shadowBlur') {
                    if (typeof val === 'number' && val > 0) {
                        self.onOp('shadowBlur');
                    }
                } else if (prop === 'globalCompositeOperation') {
                    if (typeof val === 'string' && target.globalCompositeOperation !== val) {
                        self.onOp('globalCompositeOperation');
                    }
                }

                Reflect.set(target, prop, val);
                return true;
            },
        });

        this.proxyCache.set(ctx, proxy);
        return proxy;
    }

    public setScope(scope: string): void {
        if (!this.enabled) return;
        this.currentScope = scope;
    }

    public track<T>(scope: string, fn: () => T): T {
        if (!this.enabled) return fn();
        const prevScope = this.currentScope;
        this.currentScope = scope;
        const t0 = performance.now();
        try {
            return fn();
        } finally {
            const dt = performance.now() - t0;
            this.addScopeTime(scope, dt);
            this.currentScope = prevScope;
        }
    }

    public addScopeTime(scope: string, dt: number): void {
        if (!this.enabled) return;
        const current = this.scopeTimes.get(scope) ?? 0;
        this.scopeTimes.set(scope, current + dt);
    }

    public onOp(op: OpType): void {
        if (!this.enabled) return;
        this.currentFrame[op]++;

        let sCounts = this.scopeCounts.get(this.currentScope);
        if (!sCounts) {
            sCounts = createEmptyCounts();
            this.scopeCounts.set(this.currentScope, sCounts);
        }
        sCounts[op]++;
    }

    public beginFrame(): void {
        if (!this.enabled) return;
        this.currentFrame = createEmptyCounts();
        this.scopeTimes.clear();
        this.scopeCounts.clear();
        this.currentScope = 'other';
    }

    public endFrame(): void {
        if (!this.enabled) return;
        const alpha = RENDER_PERF.EMA_ALPHA;

        for (const key of Object.keys(this.currentFrame) as OpType[]) {
            const cur = this.currentFrame[key];
            const prev = this.emaCounts[key];
            this.emaCounts[key] = (1 - alpha) * prev + alpha * cur;
        }

        for (const [scope, time] of this.scopeTimes.entries()) {
            const prev = this.scopeEmaTimes.get(scope) ?? time;
            this.scopeEmaTimes.set(scope, (1 - alpha) * prev + alpha * time);
        }
    }

    public getCounts(): OpCounts {
        return { ...this.emaCounts };
    }

    public getLatestCounts(): OpCounts {
        return { ...this.currentFrame };
    }

    public getScopeCounts(): Record<string, OpCounts> {
        const res: Record<string, OpCounts> = {};
        for (const [k, v] of this.scopeCounts.entries()) {
            res[k] = { ...v };
        }
        return res;
    }

    public getScopeTimes(): Record<string, number> {
        const res: Record<string, number> = {};
        for (const [k, v] of this.scopeEmaTimes.entries()) {
            res[k] = +v.toFixed(3);
        }
        return res;
    }

    public formatSummary(): string {
        if (!this.enabled) return '';
        const c = this.emaCounts;
        return `ops: sb:${Math.round(c.shadowBlur)} s:${Math.round(c.save)} r:${Math.round(c.restore)} img:${Math.round(c.drawImage)} f:${Math.round(c.fill)} str:${Math.round(c.stroke)} gco:${Math.round(c.globalCompositeOperation)} grad:${Math.round(c.createGradientOrPattern)}`;
    }

    public drawDebug(ctx: CanvasRenderingContext2D): void {
        if (!this.enabled) return;
        const text = this.formatSummary();
        if (!text) return;
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(text, 10, 44);
    }
}

export const CtxOpCounter = new CtxOpCounterCollector();
