// ╔══════════════════════════════════════════════════════════╗
// ║  tests/UltSpec.test.ts — 奧義美術規格化測試 (UA1)        ║
// ║  職責：依 docs/ART_SPEC.md §6 驗證 50 個奧義的 C1～C8 規格║
// ║  棘輪規則：以 tests/ult-spec.baseline.json 為基準，只准減║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { ULT_VISUALS, ULT_SEQUENCE } from '../data/vfx/ult_visuals';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';
import { HexUtils } from '../engine/utils';
import { HEX_SIZE } from '../constants';
import type { Skill, MapConfig } from '../types';
import type { VFXAsset, EmitterConfig } from '../types/VFXSchema';

export type RuleCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8';

export const ALL_RULES: readonly RuleCode[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'];

export interface UltEvalResult {
    id: string;
    skill: Skill;
    archetype: string;
    vfxOverride: string;
    pass: Record<RuleCode, boolean>;
    violations: RuleCode[];
    metrics: {
        hitAt: number;
        cast: number;
        burstTime: number;
        hasEarlyEmitter: boolean;
        hasLateEmitter: boolean;
        seqTotalDuration: number;
        emitterCount: number;
        maxGroundRadius: number;
        targetDist: number;
        isHealOrBuff: boolean;
        hasVzUp: boolean;
        mainBurstIsExpandingGroundRing: boolean;
        hasExpandingGroundRing: boolean;
        totalParticles: number;
    };
}

const maxOf = (v: number | [number, number] | undefined, d = 0): number =>
    v === undefined ? d : typeof v === 'number' ? v : v[1];

const minOf = (v: number | [number, number] | undefined, d = 0): number =>
    v === undefined ? d : typeof v === 'number' ? v : v[0];

const MAP_CONFIG: MapConfig = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: 'POINTY' };

export function evaluateUlt(id: string): UltEvalResult {
    const skill = DEFAULT_SKILL_DB.find((s) => s.id === id);
    if (!skill) throw new Error(`Skill ${id} not found in DEFAULT_SKILL_DB`);
    const ultConfig = ULT_VISUALS[id];
    if (!ultConfig) throw new Error(`Ult visual config not found for ${id}`);
    const sequence = SKILL_SEQUENCES[id];
    if (!sequence) throw new Error(`Skill sequence not found for ${id}`);

    const recipeKey = ultConfig.vfxOverride || id;
    const recipeAsset = VFX_REGISTRY[recipeKey];
    if (!recipeAsset) throw new Error(`Recipe asset not found in VFX_REGISTRY for ${recipeKey}`);

    const hitAt = sequence.hitAt;
    const cast = skill.cast;

    // Find the sequence action corresponding to the recipe
    const recipeAction = sequence.actions.find((a) => a.type === 'PARTICLE' && a.id === recipeKey);
    const actionStartTime = recipeAction?.delay ?? 0;

    // C1: 時序 hitAt <= cast + 0.02
    const c1Pass = hitAt <= cast + 0.02 + 1e-6;

    // C2: 命中對齊 — 主爆發 (半徑最大的 glow 或 ring 發射器) 落在 hitAt ± 0.08 s
    const glowRingEmitters = recipeAsset.emitters.filter(
        (e) => e.part && (e.part.kind === 'glow' || e.part.kind === 'ring'),
    );
    let mainBurst: EmitterConfig | null = null;
    let maxGlowRingRadius = -1;
    for (const em of glowRingEmitters) {
        const r = (em.part as any).radius ?? em.size ?? 0;
        if (r > maxGlowRingRadius) {
            maxGlowRingRadius = r;
            mainBurst = em;
        }
    }
    const burstDelay = mainBurst ? minOf(mainBurst.delay, 0) : 0;
    const burstTime = actionStartTime + burstDelay;
    const c2Pass = mainBurst !== null && Math.abs(burstTime - hitAt) <= 0.08 + 1e-6;

    // C3: 三拍 — 起手：有發射器在主爆發前開始；餘韻：有發射器在 hitAt + 0.5 s 時仍存活
    // 考慮序列內與該奧義相關的所有發射器（包含 STORM 的 windupFx 與 recipe 本身）
    const relevantEmitters: { start: number; end: number; em: EmitterConfig }[] = [];
    if (ultConfig.windupFx && VFX_REGISTRY[ultConfig.windupFx]) {
        for (const em of VFX_REGISTRY[ultConfig.windupFx].emitters) {
            relevantEmitters.push({
                start: minOf(em.delay, 0),
                end: maxOf(em.delay, 0) + maxOf(em.lifetime, 0),
                em,
            });
        }
    }
    for (const em of recipeAsset.emitters) {
        relevantEmitters.push({
            start: actionStartTime + minOf(em.delay, 0),
            end: actionStartTime + maxOf(em.delay, 0) + maxOf(em.lifetime, 0),
            em,
        });
    }

    const hasEarlyEmitter = relevantEmitters.some((e) => e.start < burstTime - 1e-6);
    const hasLateEmitter = relevantEmitters.some((e) => e.end >= hitAt + 0.5 - 1e-6);
    const c3Pass = hasEarlyEmitter && hasLateEmitter;

    // C4: 時長 — 序列總長 1.0～2.0 s (序列內全部動作與配方發射器的最晚結束時刻)
    let seqTotalDuration = 0;
    for (const act of sequence.actions) {
        const actDelay = act.delay ?? 0;
        if (act.type === 'PARTICLE' && act.id) {
            const asset = VFX_REGISTRY[act.id];
            if (asset) {
                for (const em of asset.emitters) {
                    const emEnd = actDelay + maxOf(em.delay, 0) + maxOf(em.lifetime, 0);
                    if (emEnd > seqTotalDuration) seqTotalDuration = emEnd;
                }
            }
        } else if (act.type === 'BEAM') {
            const beamEnd = actDelay + (act.duration ?? 0.8);
            if (beamEnd > seqTotalDuration) seqTotalDuration = beamEnd;
        } else if (act.type === 'HEAVEN_FALL') {
            if (hitAt > seqTotalDuration) seqTotalDuration = hitAt;
        } else if (act.type === 'SHAKE') {
            const shakeEnd = actDelay + 0.4;
            if (shakeEnd > seqTotalDuration) seqTotalDuration = shakeEnd;
        } else if (act.type === 'GRID_PULSE') {
            const pulseEnd = actDelay + 0.5;
            if (pulseEnd > seqTotalDuration) seqTotalDuration = pulseEnd;
        }
    }
    const c4Pass = seqTotalDuration >= 1.0 - 1e-4 && seqTotalDuration <= 2.0 + 1e-4;

    // C5: 層數 — 配方發射器 3～6 個（不含共用命中包）
    const emitterCount = recipeAsset.emitters.length;
    const c5Pass = emitterCount >= 3 && emitterCount <= 6;

    // C6: 範圍 — AOE：最大貼地發射器水平半徑落在最外層格心水平距離 0.7～1.3 倍；SINGLE：<= 1.5 * HEX_SIZE
    const seqScale = recipeAction?.scale ?? Math.min(ULT_SEQUENCE.MAX_FX_SCALE, ultConfig.scale);
    const groundEmitters = recipeAsset.emitters.filter((e) => e.particleType === 'PART_GROUND');
    let maxGroundRadius = 0;
    for (const em of groundEmitters) {
        const scaleMult = Math.max(em.partAnim?.scaleFrom ?? 1, em.partAnim?.scaleTo ?? 1);
        const r = maxOf(em.size, 0) * scaleMult * seqScale;
        if (r > maxGroundRadius) maxGroundRadius = r;
    }

    let c6Pass = false;
    let targetDist = 0;
    if (skill.type === 'SINGLE') {
        targetDist = 1.5 * HEX_SIZE; // 72
        c6Pass = maxGroundRadius <= targetDist + 1e-4;
    } else {
        const aoeRadius = skill.aoeRadius ?? 1;
        const p0 = HexUtils.toPx(0, 0, MAP_CONFIG);
        const pR = HexUtils.toPx(aoeRadius, 0, MAP_CONFIG);
        targetDist = Math.abs(pR.x - p0.x);
        c6Pass = maxGroundRadius >= targetDist * 0.7 - 1e-4 && maxGroundRadius <= targetDist * 1.3 + 1e-4;
    }

    // C7: 運動方向 — 治療／增益 (power <= 0) 至少一個 vz > 0 發射器，且無向外擴張貼地衝擊環當主爆發；
    // 傷害 (power > 0) 至少一個擴張貼地環 (scaleTo > scaleFrom)
    const isHealOrBuff = (skill.power ?? 0) <= 0;
    const hasVzUp = recipeAsset.emitters.some((e) => maxOf(e.vz) > 0);
    const mainBurstIsExpandingGroundRing =
        mainBurst !== null &&
        mainBurst.particleType === 'PART_GROUND' &&
        mainBurst.part?.kind === 'ring' &&
        (mainBurst.partAnim?.scaleTo ?? 1) > (mainBurst.partAnim?.scaleFrom ?? 1);

    const hasExpandingGroundRing = recipeAsset.emitters.some(
        (e) =>
            e.particleType === 'PART_GROUND' &&
            e.part?.kind === 'ring' &&
            (e.partAnim?.scaleTo ?? 1) > (e.partAnim?.scaleFrom ?? 1),
    );

    let c7Pass = false;
    if (isHealOrBuff) {
        c7Pass = hasVzUp && !mainBurstIsExpandingGroundRing;
    } else {
        c7Pass = hasExpandingGroundRing;
    }

    // C8: 粒子量 — 一次施放粒子數上限（count 上限總和 x STORM 次數 + 共用包）<= 80
    // 共用命中包 FX_ULT_IMPACT_BLUE/RED 粒子數上限為 1+1+1+1+10+18 = 32
    const commonImpactCount = 32;
    let recipeParticleSum = 0;
    for (const em of recipeAsset.emitters) {
        recipeParticleSum += maxOf(em.count, 1);
    }
    let totalParticles = 0;
    if (ultConfig.archetype === 'STORM') {
        const stormCount = ultConfig.count ?? 10;
        let windupParticles = 0;
        if (ultConfig.windupFx && VFX_REGISTRY[ultConfig.windupFx]) {
            for (const em of VFX_REGISTRY[ultConfig.windupFx].emitters) {
                windupParticles += maxOf(em.count, 1);
            }
        }
        totalParticles = windupParticles + recipeParticleSum * stormCount + commonImpactCount;
    } else {
        totalParticles = recipeParticleSum + commonImpactCount;
    }
    const c8Pass = totalParticles <= 80;

    const pass: Record<RuleCode, boolean> = {
        C1: c1Pass,
        C2: c2Pass,
        C3: c3Pass,
        C4: c4Pass,
        C5: c5Pass,
        C6: c6Pass,
        C7: c7Pass,
        C8: c8Pass,
    };

    const violations = ALL_RULES.filter((r) => !pass[r]);

    return {
        id,
        skill,
        archetype: ultConfig.archetype,
        vfxOverride: recipeKey,
        pass,
        violations,
        metrics: {
            hitAt,
            cast,
            burstTime,
            hasEarlyEmitter,
            hasLateEmitter,
            seqTotalDuration,
            emitterCount,
            maxGroundRadius,
            targetDist,
            isHealOrBuff,
            hasVzUp,
            mainBurstIsExpandingGroundRing,
            hasExpandingGroundRing,
            totalParticles,
        },
    };
}

export const ALL_ULT_IDS = [
    'tb_u1', 'tb_u2', 'tb_u3', 'tb_u4', 'tb_u5',
    'wb_u1', 'wb_u2', 'wb_u3', 'wb_u4', 'wb_u5',
    'rb_u1', 'rb_u2', 'rb_u3', 'rb_u4', 'rb_u5',
    'mb_u1', 'mb_u2', 'mb_u3', 'mb_u4', 'mb_u5',
    'sb_u1', 'sb_u2', 'sb_u3', 'sb_u4', 'sb_u5',
    'tr_u1', 'tr_u2', 'tr_u3', 'tr_u4', 'tr_u5',
    'wr_u1', 'wr_u2', 'wr_u3', 'wr_u4', 'wr_u5',
    'rr_u1', 'rr_u2', 'rr_u3', 'rr_u4', 'rr_u5',
    'mr_u1', 'mr_u2', 'mr_u3', 'mr_u4', 'mr_u5',
    'sr_u1', 'sr_u2', 'sr_u3', 'sr_u4', 'sr_u5',
];

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'tests', 'ult-spec.baseline.json');

describe('UltSpec (UA1: 50 Ultimate VFX Rules C1~C8 Ratchet)', () => {
    it('evaluates all 50 ultimates and matches ratchet baseline', () => {
        const results = ALL_ULT_IDS.map((id) => evaluateUlt(id));
        const currentViolationsByRule: Record<RuleCode, string[]> = {
            C1: [], C2: [], C3: [], C4: [], C5: [], C6: [], C7: [], C8: [],
        };
        for (const res of results) {
            for (const v of res.violations) {
                currentViolationsByRule[v].push(res.id);
            }
        }
        for (const r of ALL_RULES) {
            currentViolationsByRule[r].sort();
        }

        if (!fs.existsSync(BASELINE_PATH)) {
            // Write baseline if not yet existing
            fs.writeFileSync(BASELINE_PATH, JSON.stringify(currentViolationsByRule, null, 4), 'utf8');
        }

        const baseline: Record<RuleCode, string[]> = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));

        for (const rule of ALL_RULES) {
            const curr = currentViolationsByRule[rule] ?? [];
            const base = (baseline[rule] ?? []).slice().sort();

            const unexpected = curr.filter((id) => !base.includes(id));
            expect(unexpected, `Rule ${rule} has new/unexpected violations not in baseline`).toEqual([]);

            const fixed = base.filter((id) => !curr.includes(id));
            expect(fixed, `Rule ${rule} baseline entries were fixed and must be removed from baseline`).toEqual([]);
        }
    });
});
