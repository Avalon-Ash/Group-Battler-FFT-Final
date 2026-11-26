// 無畫面工具的佈陣入口（tools/sim/headlessBattle.ts，ADR 0027）：
// 佈陣規則讀 Deployment.ts，這裡驗入口有照它排、參數各自生效、缺格會丟錯、同種子可重現。
import { describe, it, expect } from 'vitest';
import { buildHeadlessBattle, type HeadlessBattleSpec } from '../tools/sim/headlessBattle';
import { SIM_SCENARIOS } from '../tools/balance/simFingerprint';
import { planRoster } from '../engine/systems/match/Deployment';
import { GAME_APP_PARAM, UI_SETTINGS } from '../constants';
import { SCENE_DB } from '../data/scenes';
import { Role, Team } from '../types';
import type { BattleSetup } from '../types';

const { TEAMS, ROYALE } = SIM_SCENARIOS;
const SEED = 4242;
const GAP = GAME_APP_PARAM.TEAMS_SPLIT_GAP_Q;

/** 每個單位的隊伍、陣營、職業、位置與技能（依生成順序）。 */
const lineupOf = (spec: HeadlessBattleSpec): string[] =>
    buildHeadlessBattle(spec).engine.agents.map((a) => `${a.id}|${a.team}|${a.side}|${a.role}|${a.q},${a.r}|${a.skillIds.join('/')}`);

describe('tools/sim/headlessBattle', () => {
    it('兩個陣營：左右對分，職業照 planRoster，尚未開戰', () => {
        const { engine, roster, placed } = buildHeadlessBattle({ seed: SEED, setup: TEAMS });
        expect(engine.agents).toHaveLength(TEAMS.factions * TEAMS.unitsPerFaction);
        expect(engine.isRunning).toBe(false);
        for (const a of engine.agents) {
            if (a.team === Team.BLUE) expect(a.q).toBeLessThan(-GAP);
            else expect(a.q).toBeGreaterThan(GAP);
        }
        const plan = planRoster(TEAMS, 0, 0);
        expect(roster.map((s) => `${s.side}|${s.team}|${s.role}`)).toEqual(plan.map((s) => `${s.side}|${s.team}|${s.role}`));
        for (const slot of roster) {
            const unit = engine.agents.find((a) => a.id === placed.get(slot));
            expect(unit).toBeDefined();
            expect(unit?.role).toBe(slot.role);
            expect(unit?.team).toBe(slot.team);
            expect(unit?.bodyType).toBe(slot.bodyType);
        }
    });

    it('十個陣營各一人：每人一個陣營', () => {
        const { engine } = buildHeadlessBattle({ seed: SEED, setup: ROYALE });
        expect(engine.agents).toHaveLength(ROYALE.factions);
        expect(new Set(engine.agents.map((a) => a.side)).size).toBe(ROYALE.factions);
    });

    it('roleOf 只換職業，隊伍與體型沿用 planRoster', () => {
        const base = buildHeadlessBattle({ seed: SEED, setup: TEAMS });
        const seen: string[] = [];
        const { engine, roster } = buildHeadlessBattle({
            seed: SEED, setup: TEAMS,
            roleOf: (side, index) => { seen.push(`${side}:${index}`); return Role.WARRIOR; },
        });
        expect(engine.agents.every((a) => a.role === Role.WARRIOR)).toBe(true);
        expect(roster.map((s) => `${s.side}|${s.team}|${s.bodyType}`)).toEqual(base.roster.map((s) => `${s.side}|${s.team}|${s.bodyType}`));
        expect(seen).toEqual(base.roster.map((s, i) => `${s.side}:${i % TEAMS.unitsPerFaction}`));
    });

    it('mirrorSides：藍方改站右邊，紅方站左邊；三個以上陣營丟錯', () => {
        const { engine } = buildHeadlessBattle({ seed: SEED, setup: TEAMS, mirrorSides: true });
        const blue = engine.agents.filter((a) => a.team === Team.BLUE);
        const red = engine.agents.filter((a) => a.team === Team.RED);
        expect(blue).toHaveLength(TEAMS.unitsPerFaction);
        expect(red).toHaveLength(TEAMS.unitsPerFaction);
        for (const a of blue) expect(a.q).toBeGreaterThan(GAP);
        for (const a of red) expect(a.q).toBeLessThan(-GAP);
        expect(() => buildHeadlessBattle({ seed: SEED, setup: ROYALE, mirrorSides: true })).toThrow(/mirrorSides/);
    });

    it('指定場景與尺寸；場景不存在丟錯', () => {
        const scene = SCENE_DB[SCENE_DB.length - 1];
        const w = UI_SETTINGS.MAP_WIDTH.max, h = UI_SETTINGS.MAP_HEIGHT.max;
        const { engine } = buildHeadlessBattle({ seed: SEED, setup: TEAMS, map: { sceneId: scene.id, w, h } });
        expect(engine.currentScene.id).toBe(scene.id);
        expect(engine.mapConfig.w).toBe(w);
        expect(engine.mapConfig.h).toBe(h);
        expect(() => buildHeadlessBattle({ seed: SEED, setup: TEAMS, map: { sceneId: 'NO_SUCH_SCENE', w, h } })).toThrow(/NO_SUCH_SCENE/);
    });

    it('出生格不夠放完整個陣容就丟錯', () => {
        const w = UI_SETTINGS.MAP_WIDTH.min, h = UI_SETTINGS.MAP_HEIGHT.min;
        const tooMany: BattleSetup = { factions: 2, unitsPerFaction: w * h };
        expect(() => buildHeadlessBattle({ seed: SEED, setup: tooMany, map: { sceneId: SCENE_DB[0].id, w, h } })).toThrow(/出生格不夠/);
    });

    it('同種子兩次建出相同的陣容與站位，不同種子不同', () => {
        for (const setup of [TEAMS, ROYALE]) {
            const a = lineupOf({ seed: SEED, setup });
            expect(lineupOf({ seed: SEED, setup })).toEqual(a);
            expect(lineupOf({ seed: SEED + 1, setup })).not.toEqual(a);
        }
    });

    it('matchSalt 有傳就設給 agentManager', () => {
        const salt = 12345;
        expect(buildHeadlessBattle({ seed: SEED, setup: TEAMS, matchSalt: salt }).engine.agentManager.matchSalt).toBe(salt);
    });
});
