import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { Role, Team } from '../types';
import type { SessionView } from '../types';
import { playLoadoutOptions, selectHeroBar } from '../engine/systems/ui/views/play';
import { MatchFlowSystem } from '../engine/systems/match/MatchFlowSystem';
import { playOutcome } from '../engine/systems/ui/views/session';
import { SKILL_SLOT_TAGS } from '../data/ui/labels/l3';

/** PLAY P4 的 UI 投影：選主角的技能清單、結算的勝負。 */
describe('PLAY 的 UI 投影', () => {
    it('playLoadoutOptions：四槽依槽位順序，只列這個職業、藍方能帶的技能', () => {
        const db = new GameEngine({ audio: false }).skillDB;
        for (const role of [Role.TANK, Role.MAGE]) {
            const slots = playLoadoutOptions(db, role);
            expect(slots.map((s) => s.tag)).toEqual([...SKILL_SLOT_TAGS]);
            for (const s of slots) {
                expect(s.skills.length).toBeGreaterThan(0);
                for (const k of s.skills) {
                    const skill = db.find((x) => x.id === k.id);
                    expect(skill?.role).toBe(role);
                    expect(skill?.tag).toBe(s.tag);
                    expect(skill?.team === undefined || skill?.team === Team.BLUE).toBe(true);
                }
            }
        }
    });

    it('playOutcome：從主角陣營（0）看勝負；平手是 DRAW；不在 PLAY 或沒打完是 null', () => {
        const base: SessionView = {
            phase: 'RESULT_HOLD', isPlaying: false, isShowcase: false, isPlay: true, playHeroId: 'BLU-0001',
            winner: Team.BLUE, winnerId: null, winnerSide: 0, unitCount: 10, battleSetup: { factions: 2, unitsPerFaction: 5 },
        };
        expect(playOutcome(base)).toBe('WIN');
        expect(playOutcome({ ...base, winner: Team.RED, winnerSide: 1 })).toBe('LOSE');
        expect(playOutcome({ ...base, winner: null, winnerSide: null })).toBe('DRAW');
        expect(playOutcome({ ...base, phase: 'PLAYING' })).toBeNull();
        expect(playOutcome({ ...base, isPlay: false })).toBeNull();
    });

    it('selectHeroBar：PLAY 外是 null；內容沒變時同一個物件；反映瞄準；施放指令成立會取消瞄準', () => {
        const e = new GameEngine({ audio: false });
        let seed = 300;
        const flow = new MatchFlowSystem(e, { isRosterReady: () => true, nextSeed: () => seed++ });
        expect(selectHeroBar(e)).toBeNull();
        flow.startPlay({ role: Role.RANGER });
        const bar = selectHeroBar(e);
        expect(bar).not.toBeNull();
        if (!bar) return;
        expect(bar.heroId).toBe(flow.playHeroId);
        expect(bar.alive).toBe(true);
        expect(bar.slots.length).toBeGreaterThan(0);
        expect(selectHeroBar(e)).toBe(bar);
        const basic = bar.slots.find((s) => s.tag === 'BASIC');
        if (!basic) throw new Error('沒有普攻');
        e.bus.emit('UI_COMMAND', { type: 'SET_AIM', aim: { agentId: bar.heroId, slot: basic.slot } });
        expect(selectHeroBar(e)?.aimSlot).toBe(basic.slot);
        const hero = e.agents.find((a) => a.id === bar.heroId);
        const foe = e.agents.find((a) => hero && a.side !== hero.side);
        if (!foe) throw new Error('沒有敵人');
        e.bus.emit('UI_COMMAND', { type: 'ORDER_CAST', agentId: bar.heroId, slot: basic.slot, targetId: foe.id });
        // 戰鬥中 GameCommand 排到下一個 tick 開頭
        e.tick(1 / 60);
        expect(e.state.aim).toBeNull();
        expect(selectHeroBar(e)?.aimSlot).toBeNull();
    });
});
