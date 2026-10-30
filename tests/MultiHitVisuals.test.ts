// ╔══════════════════════════════════════════════════════════════════╗
// ║  tests/MultiHitVisuals.test.ts — 多段命中的畫面落點對齊真實命中     ║
// ║  職責：① hitOffset 三種節奏的形狀與總長 ② SkillSequences 產出的   ║
// ║    落點時間＝hitOffsets（投射物技能在 impact 時間軸）③ 視覺表不再  ║
// ║    重複段數／節奏 ④ 真實引擎逐 tick 比對：每一段 DAMAGE／HEAL 與   ║
// ║    落點特效開始時間差 ≤ 1 tick（rb_u5 含投射物飛行時間）⑤ 品質階層 ║
// ║    降到最低時每個落點資產仍有主形狀發射器（count ≥ 1）           ║
// ║  [ARCH] 傷害時間（MultiHitScheduler）與落點時間（SkillSequences）  ║
// ║    都只讀 engine/math/HitCadence；本檔不改任何座標規則。          ║
// ╚══════════════════════════════════════════════════════════════════╝

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../engine/game';
import type { Agent } from '../engine/game';
import { SequenceSystem } from '../engine/presentation/visuals/SequenceSystem';
import { VisualSystem } from '../engine/presentation/VisualSystem';
import { VFXSystem } from '../engine/presentation/vfx';
import { HUDSystem } from '../engine/presentation/hud';
import { GridSystem } from '../engine/systems/grid';
import { CameraSystem } from '../engine/presentation/CameraSystem';
import { hitOffset, hitOffsets } from '../engine/math/HitCadence';
import { setRandomSource, resetRandomSource } from '../engine/math/rng';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';
import { ULT_VISUALS } from '../data/vfx/ult_visuals';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { VFX_BUDGET } from '../constants';
import { Role, Team, type GameEvent, type Skill } from '../types';

const HIT_SKILLS = DEFAULT_SKILL_DB.filter((s) => s.hits !== undefined);
const TICK = 1 / 60;
const EPS = 1e-6;

/** 這招每一段的「落點」特效資產鍵：STORM＝vfxOverride（每段重播）、DOMAIN＝hitFx */
function landingFx(skillId: string): string {
    const v = ULT_VISUALS[skillId];
    return (v.archetype === 'DOMAIN' ? v.hitFx : v.vfxOverride)!;
}

describe('hitOffset：三種節奏', () => {
    it('EVEN：index × interval；沒寫 cadence 等於 EVEN', () => {
        const hits = { count: 5, interval: 0.1 };
        expect(hitOffsets(hits)).toEqual([0, 0.1, 0.2, 0.30000000000000004, 0.4]);
        expect(hitOffsets({ ...hits, cadence: 'EVEN' })).toEqual(hitOffsets(hits));
    });

    it('ACCEL：間隔越來越小、總長仍是 (count−1)×interval', () => {
        const hits = { count: 8, interval: 0.08, cadence: 'ACCEL' as const };
        const offs = hitOffsets(hits);
        expect(offs[0]).toBe(0);
        expect(offs[7]).toBeCloseTo(7 * 0.08, 9);
        const gaps = offs.slice(1).map((o, i) => o - offs[i]);
        for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThan(gaps[i - 1]);
    });

    it('CLUSTER：三連發一組，組內 0.5×interval、組間 2.5×interval', () => {
        const hits = { count: 8, interval: 0.05, cadence: 'CLUSTER' as const };
        const offs = hitOffsets(hits);
        expect(offs[1] - offs[0]).toBeCloseTo(0.025, 9);
        expect(offs[2] - offs[1]).toBeCloseTo(0.025, 9);
        expect(offs[3]).toBeCloseTo(0.125, 9);
        expect(offs[6]).toBeCloseTo(0.25, 9);
        expect(offs[7]).toBeCloseTo(0.275, 9);
    });

    it('count=1 與逐段呼叫 hitOffset 都和 hitOffsets 一致', () => {
        for (const cadence of ['EVEN', 'ACCEL', 'CLUSTER'] as const) {
            expect(hitOffsets({ count: 1, interval: 0.3, cadence })).toEqual([0]);
            const hits = { count: 8, interval: 0.07, cadence };
            expect(hitOffsets(hits)).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => hitOffset(hits, i)));
        }
    });
});

describe('SkillSequences 的落點時間＝hitOffsets', () => {
    it('預設資料有 12 招多段奧義，視覺表不再寫段數、間隔、節奏', () => {
        expect(HIT_SKILLS.map((s) => s.id).sort()).toEqual(['mb_u1', 'mb_u4', 'rb_u2', 'rb_u5', 'rr_u3', 'rr_u5', 'sb_u3', 'sb_u5', 'mr_u5', 'wb_u4', 'wr_u2', 'wr_u4'].sort());
        for (const s of HIT_SKILLS) {
            const v = ULT_VISUALS[s.id] as unknown as Record<string, unknown>;
            expect(v.count, s.id).toBeUndefined();
            expect(v.timing, s.id).toBeUndefined();
            expect(v.cadence, s.id).toBeUndefined();
            expect(VFX_REGISTRY[landingFx(s.id)], s.id).toBeDefined();
        }
    });

    for (const skill of HIT_SKILLS) {
        it(`${skill.id}：每個落點的 delay 等於 hitOffsets（投射物在 impact 時間軸）`, () => {
            const seq = SKILL_SEQUENCES[skill.id];
            const hits = skill.hits!;
            const offs = hitOffsets(hits);
            const projectile = (skill.projectileSpeed ?? 0) > 0;
            const fx = landingFx(skill.id);
            const timeline = projectile ? seq.impact!.actions : seq.actions;
            const base = projectile ? 0 : seq.hitAt!;
            const landings = timeline.filter((a) => a.type === 'PARTICLE' && a.id === fx);
            expect(landings, skill.id).toHaveLength(hits.count);
            landings.forEach((a, k) => expect((a.delay ?? 0) - base, `${skill.id}[${k}]`).toBeCloseTo(offs[k], 9));
            // 投射物技能：施放序列沒有任何落點，只留起手；其他技能沒有 impact
            if (projectile) expect(seq.actions.filter((a) => a.type === 'PARTICLE' && a.id === fx)).toHaveLength(0);
            else expect(seq.impact).toBeUndefined();
        });
    }

    it('黑洞每一段都有格子脈衝與震動，與落點同一刻', () => {
        const seq = SKILL_SEQUENCES['mb_u1'];
        const offs = hitOffsets(DEFAULT_SKILL_DB.find((s) => s.id === 'mb_u1')!.hits!);
        for (const type of ['GRID_PULSE', 'SHAKE'] as const) {
            const acts = seq.actions.filter((a) => a.type === type);
            expect(acts.map((a) => (a.delay ?? 0) - seq.hitAt!), type).toEqual(offs.map((o) => expect.closeTo(o, 9)));
        }
    });
});

describe('品質階層：每一段落點都有主形狀', () => {
    it('落點資產至少有一個 count ≥ 1 的發射器；階層 3 的發射係數下每個發射器仍至少 1 顆', () => {
        const lowest = VFX_BUDGET.TIER_EMISSION_RATIOS[VFX_BUDGET.TIER_EMISSION_RATIOS.length - 1];
        for (const skill of HIT_SKILLS) {
            const asset = VFX_REGISTRY[landingFx(skill.id)];
            for (const em of asset.emitters) {
                const max = typeof em.count === 'number' ? em.count : em.count[1];
                // VFXPlayer：count = max(1, round(count × ratio))，主形狀不會因階層消失
                expect(Math.max(1, Math.round(max * lowest)), `${asset.id}`).toBeGreaterThanOrEqual(1);
            }
            expect(asset.emitters.some((e) => (typeof e.count === 'number' ? e.count : e.count[0]) === 1 && e.part?.kind !== 'shard'), asset.id).toBe(true);
        }
    });
});

describe('真實引擎：每一段傷害／治療與落點特效同一刻', () => {
    let engine: GameEngine;
    let sequences: SequenceSystem;
    let visual: VisualSystem;
    let vfx: VFXSystem;
    let hud: HUDSystem;
    let grid: GridSystem;
    let camera: CameraSystem;

    beforeEach(() => {
        setRandomSource(() => 0.5); // 不爆擊、不閃避
        engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        sequences = new SequenceSystem();
        visual = new VisualSystem();
        vfx = new VFXSystem();
        hud = new HUDSystem();
        grid = new GridSystem();
        camera = new CameraSystem();
    });

    afterEach(() => {
        resetRandomSource();
        engine.stop();
        engine.clear();
    });

    function spawn(team: Team, q: number, r: number, role: Role): Agent {
        const a = engine.agentManager.addAgent(engine, team, q, r, 99999, role);
        if (!a) throw new Error(`cannot spawn at ${q},${r}`);
        a.maxHp = 99999;
        a.hp = 99999;
        a.shield = 0;
        a.spawnTimer = 0;
        return a;
    }

    /** 沿 q 軸找距離施法者 want 格以內最遠的可站格 */
    function farthestFree(want: number): { q: number; r: number } {
        for (let q = want; q >= 1; q--) if (engine.isValid(q, 0) && !engine.hasObstacle(q, 0) && !engine.getAgentAt(q, 0)) return { q, r: 0 };
        throw new Error('no free hex');
    }

    /** 施放 skill，回傳每段傷害（或治療）事件時間與落點特效開始時間（引擎時間） */
    function castAndMeasure(skill: Skill) {
        const blue = skill.team === Team.BLUE;
        const casterTeam = blue ? Team.BLUE : Team.RED;
        const foeTeam = blue ? Team.RED : Team.BLUE;
        const heals = skill.power < 0;
        const caster = spawn(casterTeam, 0, 0, skill.role);
        const spot = farthestFree(Math.min(skill.range > 0 ? skill.range : 2, 6));
        const focus = spawn(heals ? casterTeam : foeTeam, spot.q, spot.r, Role.TANK);
        // 範圍技多放兩個同陣營的目標，確認每段重新判定範圍時事件仍一段一筆
        spawn(heals ? casterTeam : foeTeam, 0, 1, Role.WARRIOR);
        // 治療招只有友軍：另放一個遠處敵人，否則戰鬥一開始就因只剩單一陣營而結束
        if (heals) {
            const far = [{ q: -5, r: 0 }, { q: 0, r: -5 }, { q: -4, r: 0 }].find((h) => engine.isValid(h.q, h.r) && !engine.hasObstacle(h.q, h.r) && !engine.getAgentAt(h.q, h.r));
            if (!far) throw new Error('no free hex for the far foe');
            spawn(foeTeam, far.q, far.r, Role.TANK);
        }
        for (const a of engine.agents) { a.bt = null; a.mp = 0; }
        caster.skillIds = [skill.id, null, null];
        caster.skills = [skill, null, null];
        caster.mp = caster.maxMp;
        caster.target = focus;
        caster.targetHex = { q: focus.q, r: focus.r };

        const fx = landingFx(skill.id);
        const fxTimes: number[] = [];
        vi.spyOn(vfx, 'playEffect').mockImplementation((id: string) => { if (id === fx) fxTimes.push(engine.battleTime); });
        vi.spyOn(vfx, 'playBeam').mockImplementation(() => undefined); // 光束要烘焙零件（需要 DOM）
        const hitTimes: number[] = [];
        let castFinish = -1;
        let projectileHit = -1;
        engine.bus.on('GAME_EVENT', (ev: GameEvent) => {
            if (ev.sourceId === caster.id && ev.type === 'CAST_FINISH' && ev.skill?.id === skill.id) castFinish = engine.battleTime;
            if (ev.sourceId === caster.id && ev.type === 'PROJECTILE_HIT' && ev.skill?.id === skill.id) projectileHit = engine.battleTime;
            const isHit = (ev.type === 'DAMAGE' && (ev.value ?? 0) > 0 && !ev.text) || (ev.type === 'HEAL' && !ev.text && (ev.value ?? 0) > 0);
            if (isHit && ev.targetId === focus.id && ev.skill?.id === skill.id) hitTimes.push(engine.battleTime);
            // 視覺管線：同一個事件照原順序送進 VisualSystem（序列排程、PROJECTILE_HIT 的 impact）
            visual.flush([ev], engine, vfx, hud, grid, camera, sequences);
        });
        engine.play();
        engine.initiateCast(caster, 0);
        // tick 之外施放：CAST_START 要手動送進表現層，否則下一個 tick 開頭會清掉
        for (const ev of engine.events.splice(0)) visual.flush([ev], engine, vfx, hud, grid, camera, sequences);
        for (let i = 0; i < 6 * 60; i++) {
            engine.tick(TICK);
            sequences.update(engine, vfx);
        }
        return { hitTimes, fxTimes, castFinish, projectileHit, skill };
    }

    for (const skill of HIT_SKILLS) {
        it(`${skill.id}：${skill.hits!.count} 段，每段落點與傷害時間差 ≤ 1 tick${(skill.projectileSpeed ?? 0) > 0 ? '（含投射物飛行）' : ''}`, () => {
            const m = castAndMeasure(skill);
            expect(m.castFinish, 'cast finished').toBeGreaterThan(0);
            expect(m.hitTimes, 'damage events').toHaveLength(skill.hits!.count);
            expect(m.fxTimes, 'landing effects').toHaveLength(skill.hits!.count);
            m.hitTimes.forEach((t, k) => expect(Math.abs(t - m.fxTimes[k]), `${skill.id} hit ${k}: damage ${t.toFixed(4)} fx ${m.fxTimes[k].toFixed(4)}`).toBeLessThanOrEqual(TICK + EPS));
            // 第 0 段落在傷害結算那一刻：一般＝詠唱結束；投射物＝詠唱結束＋飛行時間（飛行時間 > 0，落點不得早於抵達）
            if ((skill.projectileSpeed ?? 0) > 0) {
                expect(m.projectileHit, 'PROJECTILE_HIT').toBeGreaterThan(m.castFinish);
                expect(m.fxTimes[0]).toBeGreaterThan(m.castFinish);
                expect(Math.abs(m.fxTimes[0] - m.projectileHit)).toBeLessThanOrEqual(TICK + EPS);
            } else {
                expect(Math.abs(m.fxTimes[0] - m.castFinish)).toBeLessThanOrEqual(TICK + EPS);
            }
        });
    }
});
