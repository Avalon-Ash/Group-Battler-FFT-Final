/**
 * RenderStats — 模組級純診斷計時單例
 * -----------------------------------------------------------------------------
 * 說明：
 *  - 本模組為純診斷計時工具，不包含任何遊戲模擬狀態。
 *  - 依 AGENTS.md 與 PERF_AGENT_PROMPT.md 規範，特許存在於 engine/renderers/ 目錄。
 *  - `enabled` 在載入時由 URL 查詢參數 `?perf` 決定（SSR/Node 環境預設 false）。
 *  - 當 `enabled === false` 時，所有計時方法第一行直接 early return，執行期零成本。
 *  - 當 `enabled === true` 時，使用 performance.now() 計量各階段毫秒數，並以 EMA 平滑。
 */

import { RENDER_PERF } from '../../constants';
import { CtxOpCounter } from './CtxOpCounter';

export interface TerrainCacheRuntimeStats {
    hits: number;
    misses: number;
    evictions: number;
}

export interface PerfSpikeSnapshot {
    timestamp: number;
    frameMs: number;
    phases: Record<string, number>;
    subPhases: Record<string, number>;
    ctxOps: Record<string, number>;
    terrainCache: TerrainCacheRuntimeStats;
}

export class RenderStatsCollector {
    public enabled: boolean = false;
    private startTimes = new Map<string, number>();
    private phaseEma = new Map<string, number>();
    private phaseLatest = new Map<string, number>();
    private subPhaseStartTimes = new Map<string, number>();
    private subPhaseFrameAccum = new Map<string, number>();
    private subPhaseLatest = new Map<string, number>();
    private subPhaseEma = new Map<string, number>();
    private terrainCacheStats: TerrainCacheRuntimeStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
    };
    private spikeRing: Array<PerfSpikeSnapshot | undefined> = new Array(RENDER_PERF.SPIKE_RING_SIZE);
    private spikeWriteIdx: number = 0;
    private spikeCount: number = 0;
    private maxSpikeMs: number = 0;
    private lastFrameStart: number = 0;
    private frameHistory: Array<{ t: number; dt: number }> = [];
    private frameEma: number = 0;

    constructor() {
        if (typeof location !== 'undefined' && location.search) {
            try {
                this.enabled = new URLSearchParams(location.search).has(RENDER_PERF.QUERY_KEY);
            } catch {
                this.enabled = false;
            }
        }
        this.syncWindowSpikes();
    }

    public setEnabled(val: boolean): void {
        this.enabled = val;
        this.syncWindowSpikes();
    }

    private syncWindowSpikes(): void {
        if (typeof window !== 'undefined') {
            const win = window as unknown as { __PERF_SPIKES__?: PerfSpikeSnapshot[] };
            win.__PERF_SPIKES__ = this.enabled ? this.getSpikes() : [];
        }
    }

    public begin(phase: string): void {
        if (!this.enabled) return;
        const now = performance.now();
        if (phase === 'background') {
            this.flushSubPhases();
            if (this.lastFrameStart > 0) {
                const dt = Math.max(0.1, now - this.lastFrameStart);
                this.recordFrame(now, dt);
            }
            this.lastFrameStart = now;
        }
        this.startTimes.set(phase, now);
    }

    private flushSubPhases(): void {
        for (const [name, sum] of this.subPhaseFrameAccum.entries()) {
            this.subPhaseLatest.set(name, sum);
            const prev = this.subPhaseEma.get(name);
            if (prev === undefined) {
                this.subPhaseEma.set(name, sum);
            } else {
                this.subPhaseEma.set(name, (1 - RENDER_PERF.EMA_ALPHA) * prev + RENDER_PERF.EMA_ALPHA * sum);
            }
        }
        this.subPhaseFrameAccum.clear();
        this.subPhaseStartTimes.clear();
    }

    public beginSubPhase(name: string): void {
        if (!this.enabled) return;
        this.subPhaseStartTimes.set(name, performance.now());
    }

    public endSubPhase(name: string): void {
        if (!this.enabled) return;
        const start = this.subPhaseStartTimes.get(name);
        if (start === undefined) return;
        const duration = Math.max(0, performance.now() - start);
        this.addSubPhaseMs(name, duration);
    }

    public addSubPhaseMs(name: string, durationMs: number): void {
        if (!this.enabled) return;
        const prev = this.subPhaseFrameAccum.get(name) ?? 0;
        const next = prev + Math.max(0, durationMs);
        this.subPhaseFrameAccum.set(name, next);
        this.subPhaseLatest.set(name, next);
    }

    public getSubPhaseMs(name: string): number {
        if (!this.enabled) return 0;
        return this.subPhaseEma.get(name) ?? this.subPhaseLatest.get(name) ?? 0;
    }

    public getSubPhaseLatestMs(name: string): number {
        if (!this.enabled) return 0;
        return this.subPhaseLatest.get(name) ?? 0;
    }

    public recordTerrainCacheHit(): void {
        if (!this.enabled) return;
        this.terrainCacheStats.hits++;
    }

    public recordTerrainCacheMiss(): void {
        if (!this.enabled) return;
        this.terrainCacheStats.misses++;
    }

    public recordTerrainCacheEviction(count: number = 1): void {
        if (!this.enabled) return;
        this.terrainCacheStats.evictions += Math.max(0, count);
    }

    public getTerrainCacheStats(): TerrainCacheRuntimeStats {
        if (!this.enabled) {
            return { hits: 0, misses: 0, evictions: 0 };
        }
        return { ...this.terrainCacheStats };
    }

    public recordFrame(now: number, dt: number): void {
        if (!this.enabled) return;
        this.frameHistory.push({ t: now, dt });
        const cutoff = now - RENDER_PERF.HISTORY_WINDOW_MS;
        while (this.frameHistory.length > 0 && this.frameHistory[0].t < cutoff) {
            this.frameHistory.shift();
        }
        if (this.frameHistory.length > 240) {
            this.frameHistory.splice(0, this.frameHistory.length - 240);
        }

        if (this.frameEma === 0) {
            this.frameEma = dt;
        } else {
            this.frameEma = (1 - RENDER_PERF.EMA_ALPHA) * this.frameEma + RENDER_PERF.EMA_ALPHA * dt;
        }

        if (dt > RENDER_PERF.SPIKE_THRESHOLD_MS) {
            this.recordSpikeSnapshot(now, dt);
        }
    }

    private recordSpikeSnapshot(now: number, dt: number): void {
        const phases: Record<string, number> = {};
        for (const [k, v] of this.phaseLatest.entries()) {
            phases[k] = +v.toFixed(2);
        }
        const subPhases: Record<string, number> = {};
        for (const [k, v] of this.subPhaseLatest.entries()) {
            subPhases[k] = +v.toFixed(2);
        }
        const ctxOps: Record<string, number> = {};
        if (CtxOpCounter.enabled) {
            const totals = CtxOpCounter.getLatestCounts();
            for (const [k, v] of Object.entries(totals)) {
                ctxOps[k] = Math.round(v);
            }
        }

        const snapshot: PerfSpikeSnapshot = {
            timestamp: +now.toFixed(2),
            frameMs: +dt.toFixed(2),
            phases,
            subPhases,
            ctxOps,
            terrainCache: { ...this.terrainCacheStats },
        };

        const ringSize = RENDER_PERF.SPIKE_RING_SIZE;
        this.spikeRing[this.spikeWriteIdx] = snapshot;
        this.spikeWriteIdx = (this.spikeWriteIdx + 1) % ringSize;
        this.spikeCount++;
        if (dt > this.maxSpikeMs) {
            this.maxSpikeMs = dt;
        }
        this.syncWindowSpikes();
    }

    public getSpikes(): PerfSpikeSnapshot[] {
        if (!this.enabled || this.spikeCount === 0) return [];
        const ringSize = RENDER_PERF.SPIKE_RING_SIZE;
        const count = Math.min(this.spikeCount, ringSize);
        const startIdx = this.spikeCount >= ringSize ? this.spikeWriteIdx : 0;
        const result: PerfSpikeSnapshot[] = [];
        for (let i = 0; i < count; i++) {
            const item = this.spikeRing[(startIdx + i) % ringSize];
            if (item) result.push(item);
        }
        return result;
    }

    public getSpikeCount(): number {
        if (!this.enabled) return 0;
        return this.spikeCount;
    }

    public getMaxSpikeMs(): number {
        if (!this.enabled) return 0;
        return +this.maxSpikeMs.toFixed(2);
    }

    public formatSpikeSummary(): string {
        if (!this.enabled) return '';
        return `spikes>${RENDER_PERF.SPIKE_THRESHOLD_MS}ms: ${this.spikeCount} (max ${this.maxSpikeMs.toFixed(1)}ms)`;
    }

    public end(phase: string): void {
        if (!this.enabled) return;
        const start = this.startTimes.get(phase);
        if (start === undefined) return;
        const now = performance.now();
        const duration = Math.max(0, now - start);
        this.phaseLatest.set(phase, duration);

        const currentEma = this.phaseEma.get(phase);
        if (currentEma === undefined) {
            this.phaseEma.set(phase, duration);
        } else {
            const nextEma = (1 - RENDER_PERF.EMA_ALPHA) * currentEma + RENDER_PERF.EMA_ALPHA * duration;
            this.phaseEma.set(phase, nextEma);
        }
    }

    public getPhaseMs(phase: string): number {
        if (!this.enabled) return 0;
        return this.phaseEma.get(phase) ?? 0;
    }

    public getLatestMs(phase: string): number {
        if (!this.enabled) return 0;
        return this.phaseLatest.get(phase) ?? 0;
    }

    public getPhases(): string[] {
        if (!this.enabled) return [];
        return Array.from(this.phaseEma.keys());
    }

    public getFrameTotalMs(): number {
        if (!this.enabled || this.frameHistory.length === 0) return 0;
        const target = this.frameHistory.slice(-RENDER_PERF.HISTORY_FRAMES);
        const sum = target.reduce((acc, f) => acc + f.dt, 0);
        return +(sum / target.length).toFixed(2);
    }

    public getFps(): number {
        const avg = this.getFrameTotalMs();
        if (avg <= 0) return 0;
        return +(1000 / avg).toFixed(1);
    }

    public getJsTotalMs(): number {
        if (!this.enabled) return 0;
        let sum = 0;
        for (const v of this.phaseEma.values()) {
            sum += v;
        }
        return +sum.toFixed(2);
    }

    public getMax1sMs(): number {
        if (!this.enabled || this.frameHistory.length === 0) return 0;
        const now = performance.now();
        const cutoff = now - 1000;
        let max = 0;
        for (let i = this.frameHistory.length - 1; i >= 0; i--) {
            const f = this.frameHistory[i];
            if (f.t < cutoff) break;
            if (f.dt > max) max = f.dt;
        }
        return +max.toFixed(2);
    }

    public getOnePercentLowFps(): number {
        if (!this.enabled || this.frameHistory.length === 0) return this.getFps();
        const sorted = this.frameHistory.map(f => f.dt).sort((a, b) => a - b);
        const count = Math.max(1, Math.floor(sorted.length * 0.01));
        const worst = sorted.slice(sorted.length - count);
        const avgWorst = worst.reduce((a, b) => a + b, 0) / worst.length;
        return +(1000 / Math.max(0.1, avgWorst)).toFixed(1);
    }

    public getHudStats() {
        return {
            fps: this.getFps(),
            onePercentLow: this.getOnePercentLowFps(),
            max1sMs: this.getMax1sMs(),
            frameTotalMs: this.getFrameTotalMs(),
            jsTotalMs: this.getJsTotalMs(),
        };
    }

    public formatSummary(): string {
        if (!this.enabled) return '';
        const parts: string[] = [];
        for (const [phase, val] of this.phaseEma.entries()) {
            parts.push(`${phase}: ${val.toFixed(2)}ms`);
        }
        return parts.join(' | ');
    }

    public reset(): void {
        this.startTimes.clear();
        this.phaseEma.clear();
        this.phaseLatest.clear();
        this.subPhaseStartTimes.clear();
        this.subPhaseFrameAccum.clear();
        this.subPhaseLatest.clear();
        this.subPhaseEma.clear();
        this.terrainCacheStats.hits = 0;
        this.terrainCacheStats.misses = 0;
        this.terrainCacheStats.evictions = 0;
        this.spikeRing = new Array(RENDER_PERF.SPIKE_RING_SIZE);
        this.spikeWriteIdx = 0;
        this.spikeCount = 0;
        this.maxSpikeMs = 0;
        this.lastFrameStart = 0;
        this.frameHistory = [];
        this.frameEma = 0;
        this.syncWindowSpikes();
    }
}

export const RenderStats = new RenderStatsCollector();
