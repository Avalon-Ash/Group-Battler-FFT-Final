// 站在敵方危害區上的去留判斷（engine/ai/HazardRisk.ts）。
import { describe, it, expect } from 'vitest';
import { hazardVerdict, hazardStayDamage, type HazardRiskContext } from '../engine/ai/HazardRisk';
import { Agent } from '../engine/core/Agent';
import { Team, type SpatialHazard } from '../types';
import { HAZARD_RISK } from '../constants';
import type { MapConfig } from '../engine/utils';

const CFG: MapConfig = { w: 8, h: 8, offsetX: 0, offsetY: 0, layout: 'FLAT' };

function unit(team: Team, hp: number, maxHp: number): Agent {
    const a = new Agent(team === Team.BLUE ? 'BLU-1' : 'RED-1', team, 0, 0, CFG);
    a.hp = hp;
    a.maxHp = maxHp;
    return a;
}

/** 敵方（紅）危害：power＝每跳傷害、tickInterval 0.5 秒、duration＝剩餘秒數 */
function hazard(power: number, duration: number, team: Team = Team.RED): SpatialHazard {
    const side = team === Team.RED ? 1 : 0;
    return { id: `hz-${power}-${duration}`, type: 'POISON', cells: [{ q: 0, r: 0 }], duration, sourceId: 'X', team, side, color: '#fff', power, tickInterval: 0.5, lastTickTime: 0 };
}

function ctx(hazards: SpatialHazard[], steps: number): HazardRiskContext {
    return { getSpatialHazardsAt: () => hazards, stepsToSafety: () => steps };
}

describe('hazardStayDamage', () => {
    it('每秒傷害 × 剩餘秒數，多個敵方危害相加、友方不算', () => {
        const me = unit(Team.BLUE, 1000, 1000);
        // 50／0.5 秒 × 4 秒 = 400；20／0.5 × 2 = 80；友方的 999 不算
        expect(hazardStayDamage(me, [hazard(50, 4), hazard(20, 2), hazard(999, 9, Team.BLUE)])).toBeCloseTo(480, 6);
    });
});

describe('hazardVerdict', () => {
    it('腳下沒有敵方危害（或只有友方的）→ NONE', () => {
        const me = unit(Team.BLUE, 1000, 1000);
        expect(hazardVerdict(me, 0, 0, ctx([], 5))).toBe('NONE');
        expect(hazardVerdict(me, 0, 0, ctx([hazard(50, 4, Team.BLUE)], 5))).toBe('NONE');
    });

    it('全場型、扛得住、出口遠 → STAY（留下來繼續打）', () => {
        const me = unit(Team.BLUE, 2000, 2000);
        expect(hazardVerdict(me, 0, 0, ctx([hazard(50, 4)], Infinity))).toBe('STAY');
        expect(hazardVerdict(me, 0, 0, ctx([hazard(50, 4)], HAZARD_RISK.NEAR_EXIT_STEPS + 1))).toBe('STAY');
    });

    it('留到結束的傷害達到血量的 LETHAL_HP_FRAC → LEAVE', () => {
        // 400 傷害；血 560 × 0.7 = 392 ≤ 400 → 走；血 600 × 0.7 = 420 > 400 → 留
        expect(hazardVerdict(unit(Team.BLUE, 560, 2000), 0, 0, ctx([hazard(50, 4)], Infinity))).toBe('LEAVE');
        expect(hazardVerdict(unit(Team.BLUE, 600, 600), 0, 0, ctx([hazard(50, 4)], Infinity))).toBe('STAY');
    });

    it('血量比例低於 LOW_HP_FRAC、危害會扣血 → LEAVE', () => {
        const me = unit(Team.BLUE, 500, 2000); // 25%，傷害只有 40，不到致死線
        expect(hazardVerdict(me, 0, 0, ctx([hazard(10, 2)], Infinity))).toBe('LEAVE');
    });

    it('出口就在旁邊（步數 ≤ NEAR_EXIT_STEPS）→ LEAVE', () => {
        const me = unit(Team.BLUE, 2000, 2000);
        expect(hazardVerdict(me, 0, 0, ctx([hazard(50, 4)], HAZARD_RISK.NEAR_EXIT_STEPS))).toBe('LEAVE');
    });

    it('不扣血的危害（冰、重力）：血少也不因血量走，只看出口', () => {
        const low = unit(Team.BLUE, 100, 2000);
        expect(hazardVerdict(low, 0, 0, ctx([hazard(0, 5)], Infinity))).toBe('STAY');
        expect(hazardVerdict(low, 0, 0, ctx([hazard(0, 5)], HAZARD_RISK.NEAR_EXIT_STEPS))).toBe('LEAVE');
    });
});
