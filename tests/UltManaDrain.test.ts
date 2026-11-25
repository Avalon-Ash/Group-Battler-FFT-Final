// ADR 0026（K2）：奧義（tag ULT）詠唱中逐步扣魔，套用所有單位。主代理寫的紅色驗收，執行代理不得修改。
// - 開始詠唱仍須 mp ≥ cost。
// - 每 tick 扣 cost × (這一 tick 實際走掉的前搖時間) ÷ 前搖時長；時長＝beginWindup 的 max(cast, MIN_CAST_DURATION)。
// - 完成時剛好扣完（總扣量＝cost，最後一 tick 不過衝），完成照舊加 gain、進冷卻。
// - 自己取消或被打斷：已扣的不退。燃魔把 mp 扣到 0：扣到 0 為止，詠唱照常完成。
// - 前搖中的那一招，mp 已低於 cost 也不算「魔力不足」（activationBlock、playerCastRefusal 都回 null）。
// - 其他技能照舊：前搖中不扣，完成時一次扣。
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEngine, type Agent } from '../engine/game';
import type { Skill } from '../types';
import { resetRandomSource, setRandomSource } from '../engine/math/rng';
import {
    activationBlock,
    beginWindup,
    cancelWindup,
    commitSkill,
    playerCastRefusal,
} from '../engine/systems/combat/SkillStateMachine';
import { CastingEngine } from '../engine/systems/combat/CastingEngine';
import { CAST_RULES } from '../constants';
import { Role, Team } from '../types';

beforeEach(() => setRandomSource(() => 0.5));
afterEach(() => resetRandomSource());

const DT = 1 / 30;
/** 前搖至少要跨這麼多 tick，曲線才量得出來 */
const MIN_WINDUP_TICKS = 6;
const MAX_TICKS = 3000;

function duel() {
    const engine = new GameEngine({ audio: false });
    engine.map.obstacles.clear();
    engine.map.obstaclesHash.clear();
    const blue = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 5000, Role.WARRIOR)!;
    const red = engine.agentManager.addAgent(engine, Team.RED, 2, 0, 5000, Role.TANK)!;
    engine.play();
    return { engine, blue, red };
}

const windupOf = (s: Skill) => Math.max(s.cast, CAST_RULES.MIN_CAST_DURATION);

/** 找一個前搖夠長、有消耗的技能槽（藍方戰士身上的） */
function slotWith(a: Agent, tag: Skill['tag']): { idx: number; skill: Skill } {
    const idx = a.skills.findIndex((s) => !!s && s.tag === tag);
    expect(idx, `${a.role} 沒有 ${tag} 技能`).toBeGreaterThanOrEqual(0);
    const skill = a.skills[idx]!;
    expect(skill.cost, `${tag} 技能沒有消耗`).toBeGreaterThan(0);
    expect(windupOf(skill) / DT, `${tag} 前搖太短，量不出曲線`).toBeGreaterThanOrEqual(MIN_WINDUP_TICKS);
    return { idx, skill };
}

/** 直接開始前搖（不經 AI），回傳每 tick 推進的函式 */
function startWindup(engine: GameEngine, a: Agent, idx: number, skill: Skill, mp0: number) {
    a.mp = mp0;
    a.curCDs[idx] = 0;
    beginWindup(a, idx, skill);
    const casting = new CastingEngine();
    let completed = false;
    const step = () => casting.updateCasting(a, DT, engine, (x) => { commitSkill(x, idx, skill); completed = true; });
    return { step, casting, done: () => completed };
}

describe('ADR 0026 K2：奧義詠唱逐步扣魔', () => {
    it('開始詠唱仍須 mp ≥ cost', () => {
        const { blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        blue.curCDs[idx] = 0;
        blue.mp = skill.cost - 1;
        expect(activationBlock(blue, idx)).toBe('MANA');
        blue.mp = skill.cost;
        expect(activationBlock(blue, idx)).toBeNull();
    });

    it('前搖中每 tick 依經過時間扣魔（cost × 經過 ÷ 時長）', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const mp0 = skill.cost;
        const w = startWindup(engine, blue, idx, skill, mp0);
        const duration = windupOf(skill);
        const ticks = Math.floor(duration / DT) - 2;
        let prev = blue.mp;
        for (let k = 1; k <= ticks; k++) {
            w.step();
            expect(blue.castingSkillIdx).toBe(idx);
            expect(blue.mp).toBeLessThan(prev);
            expect(blue.mp).toBeCloseTo(mp0 - skill.cost * (k * DT) / duration, 6);
            prev = blue.mp;
        }
    });

    it('完成時剛好扣完、照舊加 gain 並進冷卻（最後一 tick 不過衝、不重複扣）', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const mp0 = skill.cost;
        const w = startWindup(engine, blue, idx, skill, mp0);
        let minSeen = blue.mp;
        for (let k = 0; k < MAX_TICKS && !w.done(); k++) {
            w.step();
            minSeen = Math.min(minSeen, blue.mp);
        }
        expect(w.done()).toBe(true);
        expect(blue.castingSkillIdx).toBe(-1);
        // 完成前最低點＝扣完整招（mp0 − cost = 0），不會更低
        expect(minSeen).toBeGreaterThanOrEqual(-1e-9);
        expect(blue.mp).toBeCloseTo(Math.min(blue.maxMp, mp0 - skill.cost + skill.gain), 6);
        expect(blue.curCDs[idx]).toBeGreaterThan(0);
    });

    it('mp 多於 cost 時，完成後的 mp 和原本一次扣的結果相同', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const mp0 = Math.min(blue.maxMp, skill.cost + 7);
        const w = startWindup(engine, blue, idx, skill, mp0);
        for (let k = 0; k < MAX_TICKS && !w.done(); k++) w.step();
        expect(w.done()).toBe(true);
        expect(blue.mp).toBeCloseTo(Math.min(blue.maxMp, Math.max(0, mp0 - skill.cost + skill.gain)), 6);
    });

    it('前搖中 mp 已低於 cost，這一招仍不算魔力不足（不會被自己的扣魔擋下）', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const w = startWindup(engine, blue, idx, skill, skill.cost);
        for (let k = 0; k < 3; k++) w.step();
        expect(blue.castingSkillIdx).toBe(idx);
        expect(blue.mp).toBeLessThan(skill.cost);
        expect(activationBlock(blue, idx)).toBeNull();
        expect(playerCastRefusal(blue, idx)).toBeNull();
    });

    it('自己取消（玩家指令）：已扣的不退，不進冷卻', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const w = startWindup(engine, blue, idx, skill, skill.cost);
        const half = Math.floor(windupOf(skill) / DT / 2);
        for (let k = 0; k < half; k++) w.step();
        const drained = blue.mp;
        expect(drained).toBeLessThan(skill.cost);
        expect(cancelWindup(blue)).toBe(true);
        expect(blue.castingSkillIdx).toBe(-1);
        expect(blue.mp).toBeCloseTo(drained, 9);
        expect(blue.curCDs[idx]).toBe(0);
    });

    it('被打斷：已扣的不退', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const w = startWindup(engine, blue, idx, skill, skill.cost);
        const half = Math.floor(windupOf(skill) / DT / 2);
        for (let k = 0; k < half; k++) w.step();
        const drained = blue.mp;
        expect(drained).toBeLessThan(skill.cost);
        w.casting.handleInterruption(blue, engine);
        expect(blue.castingSkillIdx).toBe(-1);
        expect(blue.mp).toBeCloseTo(drained, 9);
    });

    it('燃魔把 mp 扣到 0：之後扣到 0 為止，詠唱照常完成', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        const w = startWindup(engine, blue, idx, skill, skill.cost);
        const half = Math.floor(windupOf(skill) / DT / 2);
        for (let k = 0; k < half; k++) w.step();
        blue.mp = 0;
        let minSeen = 0;
        for (let k = 0; k < MAX_TICKS && !w.done(); k++) {
            w.step();
            minSeen = Math.min(minSeen, blue.mp);
        }
        expect(w.done()).toBe(true);
        expect(minSeen).toBeGreaterThanOrEqual(0);
        expect(blue.mp).toBeCloseTo(Math.min(blue.maxMp, skill.gain), 6);
        expect(blue.curCDs[idx]).toBeGreaterThan(0);
    });

    it('其他技能照舊：前搖中不扣，完成時一次扣', () => {
        const { engine, blue } = duel();
        const { idx, skill } = slotWith(blue, 'ACTIVE');
        const mp0 = Math.min(blue.maxMp, skill.cost + 5);
        const w = startWindup(engine, blue, idx, skill, mp0);
        const half = Math.floor(windupOf(skill) / DT / 2);
        for (let k = 0; k < half; k++) w.step();
        expect(blue.mp).toBe(mp0);
        for (let k = 0; k < MAX_TICKS && !w.done(); k++) w.step();
        expect(w.done()).toBe(true);
        expect(blue.mp).toBeCloseTo(Math.min(blue.maxMp, Math.max(0, mp0 - skill.cost + skill.gain)), 6);
    });

    it('實戰（AI、真的 tick 迴圈）：mp 剛好等於 cost 開始的奧義會扣魔並照常完成，不被自己的扣魔中斷', () => {
        const { engine, blue, red } = duel();
        const { idx, skill } = slotWith(blue, 'ULT');
        // 對手不出手（不打斷藍方）：每 tick 暈住；藍方在奧義開始前一直補滿到剛好 cost
        const holdRed = () => { red.effects.STUN.remaining = 10; };
        let started = false;
        for (let k = 0; k < MAX_TICKS && !started; k++) {
            holdRed();
            if (blue.castingSkillIdx !== idx) { blue.mp = skill.cost; blue.curCDs[idx] = 0; }
            engine.tick(DT);
            started = blue.castingSkillIdx === idx;
        }
        expect(started, 'AI 沒有開始放奧義（情境前提不成立）').toBe(true);
        let sawDrain = false;
        let ticks = 0;
        while (blue.castingSkillIdx === idx && ticks < MAX_TICKS) {
            holdRed();
            engine.tick(DT);
            ticks++;
            if (blue.castingSkillIdx === idx && blue.mp < skill.cost - 1e-9) sawDrain = true;
        }
        expect(ticks).toBeGreaterThan(1);
        expect(sawDrain).toBe(true);
        // 照常完成：完成才會有施放硬直、進冷卻（被打斷不會設 _castCompleteCooldown）
        expect(blue._interruptCooldown).toBe(0);
        expect(blue.curCDs[idx]).toBeGreaterThan(0);
    });
});
