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

export class RenderStatsCollector {
    public enabled: boolean = false;
    private startTimes = new Map<string, number>();
    private phaseEma = new Map<string, number>();
    private phaseLatest = new Map<string, number>();

    constructor() {
        if (typeof location !== 'undefined' && location.search) {
            try {
                this.enabled = new URLSearchParams(location.search).has(RENDER_PERF.QUERY_KEY);
            } catch {
                this.enabled = false;
            }
        }
    }

    public setEnabled(val: boolean): void {
        this.enabled = val;
    }

    public begin(phase: string): void {
        if (!this.enabled) return;
        this.startTimes.set(phase, performance.now());
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
    }
}

export const RenderStats = new RenderStatsCollector();
