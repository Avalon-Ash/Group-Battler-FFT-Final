// ╔══════════════════════════════════════════════════════════╗
// ║ GroundPriority — 逐格地面資訊倍率與重用索引表              ║
// ║ 職責：純函式解析填色優先序；上游 GridRenderStrategy 每幀寫 ║
// ║ [ARCH] painters 只讀倍率／逐格施法色；不改座標（§12）。     ║
// ╚══════════════════════════════════════════════════════════╝
import { GRID_OVERLAY } from '../../../constants';
import type { Agent, Hex, Skill } from '../../../types';
import { getFactionSkin } from '../../../data/units/factionSkin';

export const GroundFlag = { Warning: 1, LastStand: 2, Cast: 4, Hazard: 8, Status: 16, Zone: 32, Light: 64, Range: 128 } as const;
export interface GroundLayers {
    readonly range: number;
    readonly urgent: number;
    readonly warning: number;
    readonly lastStand: number;
    readonly cast: number;
    readonly hazard: number;
    readonly status: number;
    readonly zone: number;
    readonly light: number;
}
const F = GroundFlag;
const P = GRID_OVERLAY.PRIORITY;
// 全組合在模組載入時解析一次；每幀純查表，不配置倍率物件。
const layers: readonly GroundLayers[] = Array.from({ length: F.Range * 2 }, (_, flags) => {
    const urgent = !!(flags & (F.Warning | F.LastStand));
    const cast = !!(flags & F.Cast), hazard = !!(flags & F.Hazard), status = !!(flags & F.Status);
    const higherThanZone = urgent || cast || hazard || status;
    return Object.freeze({
        range: flags & F.Range ? 1 : 0,
        urgent: urgent ? 1 : 0,
        warning: flags & F.Warning ? (flags & F.LastStand ? 0 : 1) : 0,
        lastStand: flags & F.LastStand ? 1 : 0,
        cast: cast ? (urgent ? P.CAST_DIM : 1) : 0,
        hazard: hazard ? (urgent || cast ? P.HAZARD_DIM : 1) : 0,
        status: status ? (urgent || cast || hazard ? P.STATUS_DIM : 1) : 0,
        zone: flags & F.Zone ? (higherThanZone ? 0 : 1) : 0,
        light: flags & F.Light ? (higherThanZone || (flags & F.Zone) ? 0 : 1) : 0,
    });
});
export function resolveGroundLayers(flags: number): GroundLayers { return layers[flags]; }

/** Telegraph 是完整、未裁切的 AOE 圓之有效格；中心取座標平均不能處理地圖邊界。
 *  改用包圍範圍中點也不可靠；明確目標（與建立 telegraph 相同來源）為中心 SSOT。
 */
export function isCasterCenteredTelegraph(agent: Agent, skill: Skill): boolean {
    const center = agent.targetHex ?? agent.target ?? agent;
    return (skill.aoeRadius ?? 0) > 0 && center.q === agent.q && center.r === agent.r;
}

class GroundPriorityTable {
    private flags = new Uint8Array(0);
    private colors: (string | undefined)[] = [];
    private minQ = 0;
    private minR = 0;
    private width = 0;
    private height = 0;

    /** 僅版面容量增加時配置；每幀清空重用，只有 GridRenderStrategy 呼叫。 */
    begin(tiles: readonly Hex[]): void {
        let minQ = Infinity, minR = Infinity, maxQ = -Infinity, maxR = -Infinity;
        for (const t of tiles) {
            minQ = Math.min(minQ, t.q); minR = Math.min(minR, t.r);
            maxQ = Math.max(maxQ, t.q); maxR = Math.max(maxR, t.r);
        }
        this.minQ = minQ; this.minR = minR;
        this.width = tiles.length ? maxQ - minQ + 1 : 0;
        this.height = tiles.length ? maxR - minR + 1 : 0;
        const size = this.width * this.height;
        if (size > this.flags.length) {
            this.flags = new Uint8Array(size);
            this.colors = new Array<string | undefined>(size);
        }
        this.flags.fill(0); this.colors.fill(undefined);
    }
    private index(q: number, r: number): number {
        const x = q - this.minQ, y = r - this.minR;
        return x >= 0 && x < this.width && y >= 0 && y < this.height ? y * this.width + x : -1;
    }
    set(q: number, r: number, flags: number): void {
        const i = this.index(q, r);
        if (i >= 0) this.flags[i] = flags;
    }
    flagsAt(q: number, r: number): number { return this.flags[this.index(q, r)] ?? 0; }
    at(q: number, r: number): GroundLayers { return resolveGroundLayers(this.flagsAt(q, r)); }
    addCast(q: number, r: number, agent: Agent): void {
        const i = this.index(q, r);
        if (i >= 0 && this.colors[i] === undefined) this.colors[i] = getFactionSkin(agent.team).fallbackBodyColor;
    }
    castColorAt(q: number, r: number): string | undefined { return this.colors[this.index(q, r)]; }
}
/** 同步的世界繪製使用一張表；不存模擬狀態，下一次 submit 完整重建。 */
export const groundPriority = new GroundPriorityTable();
