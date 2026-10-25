// ╔══════════════════════════════════════════════════════════════════╗
// ║  UltCastTiming — 奧義有效詠唱下限（ULT-T01）                     ║
// ║  職責：① 預設 50 招 ULT 的 cast 都 ≥ COMBAT_PARAM.ULT_MIN_CAST_SEC ║
// ║    ② UPDATE_SKILL 以完整候選技能套用同一規則（改 cast、切 tag）  ║
// ║    ③ 施法途中對該招的編輯／換槽一律拒絕                          ║
// ║    ④ 真實引擎：不同 dt 下 CAST_START→CAST_FINISH 不早於 cast     ║
// ║    ⑤ 死亡／暈眩中斷與重置後沒有延遲爆發                          ║
// ║  [ARCH] skill.cast 本身就是有效值，執行期不另外 clamp。           ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { COMBAT_PARAM } from '../constants';
import { normalizeSkillCast } from '../data/ui/skillEditor';
import { Role, Team, type GameEvent, type Skill } from '../types';
import { HexUtils } from '../engine/utils';

const MIN = COMBAT_PARAM.ULT_MIN_CAST_SEC;
const ults = () => DEFAULT_SKILL_DB.filter((s) => s.tag === 'ULT');

// skillDB 是 DEFAULT_SKILL_DB 的淺拷貝（同一批技能物件），測試改過的欄位要還原，避免汙染同檔其他測試
const restore: Array<() => void> = [];
function remember(skill: Skill) {
    const snap = { ...skill };
    restore.push(() => { for (const k of Object.keys(skill) as (keyof Skill)[]) delete skill[k]; Object.assign(skill, snap); });
}
afterEach(() => { while (restore.length) restore.pop()!(); });

function update(engine: GameEngine, skillId: string, field: keyof Skill, value: string | number | boolean | Team | undefined) {
    engine.bus.emit('UI_COMMAND', { type: 'UPDATE_SKILL', skillId, field, value });
}

/** 放一隊藍紅各五人並開戰，回傳引擎 */
function battle(seed: number): GameEngine {
    const sim = new GameEngine();
    sim.seedSimulation(seed);
    sim.bus.emit('UI_COMMAND', { type: 'RANDOMIZE_MAP', randomizeScene: true });
    const radius = Math.floor(Math.max(sim.mapConfig.w, sim.mapConfig.h) / 2) + 1;
    const valid = [...sim.map.mapKeys].map((k) => { const [q, r] = k.split(',').map(Number); return { q, r }; })
        .filter((h) => !sim.hasObstacle(h.q, h.r) && HexUtils.dist({ q: 0, r: 0 }, h) < radius);
    const left = valid.filter((h) => h.q < -1), right = valid.filter((h) => h.q > 1);
    const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
    for (let i = 0; i < 5; i++) {
        sim.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.BLUE, q: left[i].q, r: left[i].r, role: roles[i] });
        sim.bus.emit('UI_COMMAND', { type: 'PLACE_AGENT', team: Team.RED, q: right[i].q, r: right[i].r, role: roles[i] });
    }
    sim.play();
    return sim;
}

/** 讓 agent 立即開始詠唱它的 ULT 槽（真實 initiateCast，含 CAST_START） */
function startUlt(engine: GameEngine): { caster: NonNullable<GameEngine['agents'][number]>; slot: number; skill: Skill } {
    for (const a of engine.agents) {
        const slot = a.skills.findIndex((s) => s?.tag === 'ULT');
        if (slot === -1) continue;
        const enemy = engine.agents.find((e) => e.team !== a.team && e.hp > 0);
        a.target = enemy ?? null;
        a.mp = a.maxMp;
        a.curCDs[slot] = 0;
        engine.combat.initiateCast(a, slot, engine);
        if (a.castingSkillIdx === slot) return { caster: a, slot, skill: a.skills[slot]! };
    }
    throw new Error('no agent could start an ULT');
}

describe('UltCastTiming（ULT-T01）', () => {
    it('預設資料：50 招 ULT 都不低於下限，rb_u3 保留 2.0 秒', () => {
        const list = ults();
        expect(list).toHaveLength(50);
        for (const s of list) expect(s.cast, s.id).toBeGreaterThanOrEqual(MIN);
        expect(list.find((s) => s.id === 'rb_u3')!.cast).toBe(2.0);
        expect(list.filter((s) => s.cast === MIN)).toHaveLength(49);
    });

    it('normalizeSkillCast 只提高 ULT，其他 tag 原樣', () => {
        expect(normalizeSkillCast('ULT', 0.3)).toBe(MIN);
        expect(normalizeSkillCast('ULT', 2.4)).toBe(2.4);
        expect(normalizeSkillCast('ACTIVE', 0.3)).toBe(0.3);
        expect(normalizeSkillCast('BASIC', 0)).toBe(0);
    });

    it('UPDATE_SKILL：ULT 改短 cast 會正規化；切成 ULT 會補足；非法值拒絕；切回 ACTIVE 不再限制', () => {
        const engine = new GameEngine();
        const ult = engine.skillDB.find((s) => s.id === 'wb_u5')!;
        const active = engine.skillDB.find((s) => s.tag === 'ACTIVE' && s.cast < MIN)!;
        remember(ult); remember(active);

        update(engine, ult.id, 'cast', 0.3);
        expect(ult.cast).toBe(MIN);
        update(engine, ult.id, 'cast', 1.8);
        expect(ult.cast).toBe(1.8);
        update(engine, ult.id, 'cast', Number.NaN);
        update(engine, ult.id, 'cast', -1);
        expect(ult.cast).toBe(1.8);

        const activeCast = active.cast;
        update(engine, active.id, 'tag', 'ULT');
        expect(active.tag).toBe('ULT');
        expect(active.cast).toBe(MIN);
        update(engine, active.id, 'tag', 'ACTIVE');
        update(engine, active.id, 'cast', activeCast);
        expect(active.cast).toBe(activeCast);
    });

    it('施法途中：對正在詠唱的那一招 UPDATE_SKILL、換掉該槽都拒絕；收尾後恢復可改', () => {
        const engine = battle(4242);
        const { caster, slot, skill } = startUlt(engine);
        remember(skill);
        const before = skill.cast;
        update(engine, skill.id, 'cast', 3.0);
        expect(skill.cast).toBe(before);
        const other = engine.skillDB.find((s) => s.id !== skill.id && s.role === caster.role && s.tag === 'ULT')!;
        engine.bus.emit('UI_COMMAND', { type: 'SET_AGENT_SKILL', agentId: caster.id, slot, skillId: other.id });
        expect(caster.skillIds[slot]).toBe(skill.id);

        for (let t = 0; t < before + 0.5 && caster.castingSkillIdx !== -1; t += 1 / 60) engine.tick(1 / 60);
        expect(caster.castingSkillIdx).toBe(-1);
        update(engine, skill.id, 'cast', 3.0);
        expect(skill.cast).toBe(3.0);
    });

    for (const dt of [1 / 144, 1 / 60, 1 / 30]) {
        it(`真實戰鬥 dt=${dt.toFixed(4)}：ULT 從 CAST_START 到 CAST_FINISH 不早於 skill.cast`, () => {
            const samples: { id: string; cast: number; elapsed: number }[] = [];
            for (const seed of [1001, 1002, 1003]) {
                const engine = battle(seed);
                const started = new Map<string, { at: number; id: string | undefined }>();
                engine.bus.on('GAME_EVENT', (ev: GameEvent) => {
                    if (!ev.skill || ev.skill.tag !== 'ULT' || !ev.sourceId) return;
                    if (ev.type === 'CAST_START') started.set(ev.sourceId, { at: engine.battleTime, id: ev.skill.id });
                    else if (ev.type === 'CAST_BREAK') started.delete(ev.sourceId);
                    else if (ev.type === 'CAST_FINISH') {
                        const s = started.get(ev.sourceId);
                        if (s && ev.skill.id && s.id === ev.skill.id && typeof ev.skill.cast === 'number') samples.push({ id: ev.skill.id, cast: ev.skill.cast, elapsed: engine.battleTime - s.at });
                        started.delete(ev.sourceId);
                    }
                });
                let over = false;
                engine.bus.on('GAME_OVER', () => { over = true; });
                for (let t = 0; t < 120 && !over; t += dt) engine.tick(dt);
            }
            expect(samples.length).toBeGreaterThan(3);
            for (const s of samples) {
                expect(s.cast, s.id).toBeGreaterThanOrEqual(MIN);
                // 開始那一幀已扣一次 dt，所以結算幀的 battleTime 最多比 cast 早一個 dt；不得再早
                expect(s.elapsed + dt, `${s.id} elapsed=${s.elapsed}`).toBeGreaterThanOrEqual(s.cast - 1e-9);
                expect(s.elapsed, `${s.id} elapsed=${s.elapsed}`).toBeLessThanOrEqual(s.cast + dt + 1e-9);
            }
        });
    }

    /** 中斷後到下一次 CAST_START 之前不得有 CAST_FINISH（之後重新詠唱是新的一次施法，照常結算） */
    const finishBeforeRecast = (types: string[]) => {
        const next = types.indexOf('CAST_START');
        return (next === -1 ? types : types.slice(0, next)).includes('CAST_FINISH');
    };

    it('詠唱中死亡或暈眩：發出 CAST_BREAK，被打斷的那次不會結算', () => {
        for (const interrupt of ['death', 'stun'] as const) {
            const engine = battle(7);
            const { caster, skill } = startUlt(engine);
            const seen: string[] = [];
            engine.bus.on('GAME_EVENT', (ev: GameEvent) => {
                if (ev.sourceId === caster.id && ev.skill?.id === skill.id) seen.push(ev.type);
            });
            engine.tick(1 / 60);
            if (interrupt === 'death') caster.hp = 0;
            else caster.effects.STUN.remaining = 1;
            for (let t = 0; t < skill.cast + 3; t += 1 / 60) engine.tick(1 / 60);
            const afterBreak = seen.slice(seen.indexOf('CAST_BREAK') + 1);
            expect(seen, interrupt).toContain('CAST_BREAK');
            expect(finishBeforeRecast(afterBreak), `${interrupt}: ${seen.join(',')}`).toBe(false);
        }
    });

    it('詠唱中重置戰場：重開後沒有上一場殘留的 ULT 結算', () => {
        const engine = battle(8);
        const { caster, skill } = startUlt(engine);
        engine.tick(1 / 60);
        engine.bus.emit('UI_COMMAND', { type: 'RESET_GAME' });
        const seen: string[] = [];
        engine.bus.on('GAME_EVENT', (ev: GameEvent) => {
            if (ev.sourceId === caster.id && ev.skill?.id === skill.id) seen.push(ev.type);
        });
        engine.play();
        for (let t = 0; t < skill.cast + 1; t += 1 / 60) engine.tick(1 / 60);
        expect(caster.castingSkillIdx === -1 || seen.includes('CAST_START')).toBe(true);
        expect(finishBeforeRecast(seen), seen.join(',')).toBe(false);
    });
});
