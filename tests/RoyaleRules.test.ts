import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { saveAgentState } from '../engine/core/AgentLifecycle';
import { UNIT_DB } from '../data/units';
import { ROYALE_RULES } from '../constants';
import { Role, Team } from '../types';

describe('大逃殺開局規則', () => {
    let engine: GameEngine;
    const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
    const place = (i: number, role: Role, team: Team = Team.BLUE) => {
        const a = engine.agentManager.addAgent(engine, team, i - 3, 0, undefined, role, undefined, i);
        if (!a) throw new Error('addAgent failed');
        return a;
    };
    const skillOf = (id: string | null) => engine.skillDB.find(s => s.id === id);

    beforeEach(() => {
        engine = new GameEngine();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
        }
    });
    afterEach(() => engine.clear());

    it('兩個陣營：血量與技能都照職業與隊伍', () => {
        engine.battleSetup = { ...engine.battleSetup, factions: 2 };
        for (let n = 0; n < 40; n++) {
            const a = place(0, Role.TANK);
            expect(a.maxHp).toBe(UNIT_DB[Role.TANK].maxHp);
            for (const id of a.skillIds) {
                expect(skillOf(id)?.role).toBe(Role.TANK);
                expect(skillOf(id)?.team).toBe(Team.BLUE);
            }
            engine.clear();
            engine = new GameEngine();
        }
    });

    it('大逃殺：血量差距減半，平均不變，重開後不會變回職業血量', () => {
        engine.battleSetup = { ...engine.battleSetup, factions: 10, unitsPerFaction: 1 };
        const units = roles.map((r, i) => place(i, r));
        const raw = roles.map(r => UNIT_DB[r].maxHp);
        const mean = raw.reduce((x, y) => x + y, 0) / raw.length;
        units.forEach((u, i) => {
            expect(u.maxHp).toBe(Math.round(mean + (raw[i] - mean) * ROYALE_RULES.HP_GAP_SCALE));
        });
        const before = units.map(u => u.maxHp);
        units.forEach(u => saveAgentState(u)); // 開戰時記下的狀態（engine.start 做的事）
        units.forEach(u => engine.resetAgent(u));
        expect(units.map(u => u.maxHp)).toEqual(before);
    });

    it('大逃殺：大招與主動跨職業與隊伍，普攻仍照職業，獨自一人不抽自傷補血', () => {
        engine.battleSetup = { ...engine.battleSetup, factions: 10, unitsPerFaction: 1 };
        const ultRoles = new Set<Role>();
        for (let n = 0; n < 60; n++) {
            const a = place(0, Role.WARRIOR);
            const [ult, active, basic] = a.skillIds.map(skillOf);
            ultRoles.add(ult?.role as Role);
            expect(ult?.tag).toBe('ULT');
            expect(active?.tag).toBe('ACTIVE');
            expect(basic?.role).toBe(Role.WARRIOR);
            for (const s of [ult, active]) {
                expect(s?.effectType).not.toBe('SELF_DAMAGE');
                expect(s?.effectType2).not.toBe('SELF_DAMAGE');
            }
            engine.clear();
            engine = new GameEngine();
            engine.battleSetup = { ...engine.battleSetup, factions: 10, unitsPerFaction: 1 };
        }
        expect(ultRoles.size).toBeGreaterThan(1);
    });
});
