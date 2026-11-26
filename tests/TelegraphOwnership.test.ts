import { describe, it, expect } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { beginWindup, cancelWindup, endWindup } from '../engine/systems/combat/SkillStateMachine';
import { announcesCast } from '../engine/core/SkillQueries';
import { Team } from '../types';
import { DEFAULT_HEX_LAYOUT } from '../constants';
import type { MapConfig } from '../engine/utils';
import { buildBattle, runTicks, emit } from './contracts/simState';

/**
 * 預警格（Agent.currentTelegraph）是前搖狀態的附屬資料，只由 SkillStateMachine 寫
 * （docs/plans/play-order-decoupling.md §3）：beginWindup 寫入、endWindup 清掉。
 */
const MAP: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };
const HEXES = [{ q: 3, r: 3 }, { q: 3, r: 4 }];
/** 整場不變式要跑的 tick 數（10 秒，足夠看到多次詠唱開始與結束） */
const INVARIANT_TICKS = 600;

/** 從正本技能表取一招會發 CAST_START 的招（非普攻、有詠唱時間），不寫死技能 */
const announcedSkillOf = (a: Agent) => a.skills.findIndex((s) => !!s && announcesCast(s));

describe('currentTelegraph 由 SkillStateMachine 單一擁有', () => {
    it('beginWindup 寫入傳進來的預警格；沒傳就是 null', () => {
        const e = buildBattle('TEAMS', 41);
        // 技能在開戰時才裝上
        emit(e, { type: 'START_GAME', seed: 1 });
        const a = e.agents.find((x) => announcedSkillOf(x) >= 0);
        if (!a) throw new Error('場上沒有會預警的招');
        const idx = announcedSkillOf(a);
        beginWindup(a, idx, a.skills[idx]!, HEXES);
        expect(a.currentTelegraph).toEqual(HEXES);
        endWindup(a, false);
        beginWindup(a, idx, a.skills[idx]!);
        expect(a.currentTelegraph).toBeNull();
    });

    it('endWindup（完成與未完成）與 cancelWindup 都清掉預警格', () => {
        for (const leave of [(a: Agent) => endWindup(a, true), (a: Agent) => endWindup(a, false), (a: Agent) => { cancelWindup(a); }]) {
            const a = new Agent('caster', Team.BLUE, 2, 3, MAP);
            a.castingSkillIdx = 0;
            a.castTimer = 1;
            a.currentTelegraph = HEXES;
            leave(a);
            expect(a.castingSkillIdx).toBe(-1);
            expect(a.currentTelegraph).toBeNull();
        }
    });

    it('整場不變式：不在前搖就沒有預警格；普攻前搖沒有預警格；會預警的招前搖中有預警格', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'START_GAME', seed: 1 });
        let withTelegraph = 0;
        for (let t = 0; t < INVARIANT_TICKS && e.isRunning; t++) {
            runTicks(e, 1);
            for (const a of e.agents) {
                const skill = a.castingSkillIdx !== -1 ? a.skills[a.castingSkillIdx] : null;
                if (!skill) expect(a.currentTelegraph, `${a.id} tick ${t}`).toBeNull();
                else if (!announcesCast(skill)) expect(a.currentTelegraph, `${a.id} tick ${t}`).toBeNull();
                else { expect(a.currentTelegraph, `${a.id} tick ${t}`).not.toBeNull(); withTelegraph++; }
            }
        }
        // 探針前提：這一場真的有人詠唱過會預警的招
        expect(withTelegraph).toBeGreaterThan(0);
    });
});
