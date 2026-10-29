/** 動畫／序列參數 SSOT，保持原值。 */
const ULT_ARCHETYPE_PARAM = {
    /** 天降脈衝尺寸倍率（倍） */
    FALL_PULSE_MULT: 2.5,
    /** 命中後脈衝延遲（秒） */
    PULSE_DELAY_S: 0.05,
    /** 聖域脈衝尺寸（倍） */
    SANCTUARY_PULSE: 1.8,
    /** 聖域鏡頭震動強度（比例） */
    SANCTUARY_SHAKE: 0.2,
    /** 領域脈衝尺寸倍率（倍） */
    DOMAIN_PULSE_MULT: 2,
    /** 領域鏡頭震動強度（比例） */
    DOMAIN_SHAKE: 0.3,
    /** 多段領域：第 2 段起每段的鏡頭震動相對第 1 段的倍率（倍；第 1 段維持 DOMAIN_SHAKE，後續段降低以免累積成持續劇震） */
    DOMAIN_HIT_SHAKE_FOLLOW: 0.5,
    /** 狙擊光束粒子尺寸上限（倍） */
    BEAM_FX_SCALE: 1.5,
    /** 狙擊光束長度（秒） */
    BEAM_DURATION_S: 0.8,
    /** 狙擊光束尺寸倍率（倍） */
    BEAM_SCALE_MULT: 0.35,
    /** 狙擊光束震動強度（比例） */
    BEAM_SHAKE: 0.5,
    /** 狙擊光束脈衝尺寸（倍） */
    BEAM_PULSE: 1.2,
    /** 風暴落點最小尺寸倍率（倍） */
    STORM_SCALE_MIN: 0.8,
    /** 風暴落點尺寸交錯步幅（比例） */
    STORM_SCALE_PHASE: 0.618,
    /** 風暴落點尺寸變動幅度（倍） */
    STORM_SCALE_RANGE: 0.4,
    /** 風暴震動強度（比例） */
    STORM_SHAKE: 0.15,
    /** 瞬間衝擊震動倍率（倍） */
    IMPACT_SHAKE_MULT: 0.6,
    /** 瞬間衝擊脈衝尺寸倍率（倍） */
    IMPACT_PULSE_MULT: 1.5,
} as const;

import { VFXSequence, VFXAction } from "../../types/VFXSchema";
import { Team } from "../../types";
import { DEFAULT_SKILL_DB } from "../../skillDatabase";
import { ULT_VISUALS, ultImpactDelay } from "./ult_visuals";
import { hitOffsets } from "../../engine/math/HitCadence";
import { ACTIVE_VISUALS } from "./active_visuals";
import { BASIC_VISUALS } from "./basic_visuals";
import { FACTION_VISUALS } from "./faction_visuals";
import { ULT_SEQUENCE } from "./ult_visuals";

// 序列裡的 id 一律是 VFX_REGISTRY 的鍵、style 一律是 BEAM_STYLES 的鍵（tests/ReferenceIntegrity.test.ts 檢查）。
// 投射物不在序列裡：ProjectileSystem 依技能的 visualProjectileEffect 生成。

const sequences: Record<string, VFXSequence> = {};

function fillFactionDefaults(prefix: string, primary: string, secondary: string, role: string) {
    // prefix = 職業字母 + 陣營字母（tb、rb、tr…）；只看第二個字母，否則 rb（獅心弓手）會被當成紅方
    const isRed = prefix.endsWith('r');
    // 技能沒有指定特效時的陣營預設
    const hitFx = FACTION_VISUALS[isRed ? Team.RED : Team.BLUE].defaultHitEffect;

    for (let i = 1; i <= 5; i++) {
        // --- 1. BASIC SKILLS (Enhanced with New Archetypes) ---
        const basicId = `${prefix}_b${i}`;
        const basicSkill = DEFAULT_SKILL_DB.find(s => s.id === basicId);
        const basicConfig = BASIC_VISUALS[basicId];

        if (basicSkill) {
            const actions: VFXAction[] = [];

            if (basicConfig) {
                // 普攻序列只放「出手」的線條（斬擊弧、光束）；命中特效由 HIT_FX 事件播 skill.visualHitEffect，
                // 所以這裡不放命中粒子、鏡頭震動與格子脈衝（ART_SPEC §6：普攻禁止震動與大範圍效果）
                const style = basicConfig.beamStyle;
                switch(basicConfig.archetype) {
                    case 'MELEE_SLASH':
                        if (isRed) {
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_RED_SLASH', delay: 0, scale: basicConfig.scale || 1.0 });
                        } else {
                            const swingId = basicSkill.element === 'HOLY' ? 'FX_SWING_BLUE_SLASH_HOLY' : 'FX_SWING_BLUE_SLASH';
                            actions.push({ type: 'PARTICLE', id: swingId, delay: 0, scale: basicConfig.scale || 1.0 });
                        }
                        break;
                    case 'CROSS_CUT':
                        if (isRed) {
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_RED_CROSS_1', delay: 0, scale: basicConfig.scale || 0.9 });
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_RED_CROSS_2', delay: 0.08, scale: basicConfig.scale || 0.9 });
                        } else {
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_BLUE_CROSS_1', delay: 0, scale: basicConfig.scale || 0.9 });
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_BLUE_CROSS_2', delay: 0.08, scale: basicConfig.scale || 0.9 });
                        }
                        break;
                    case 'HEAVY_CLEAVE':
                    case 'MELEE_CLEAVE':
                        if (isRed) {
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_RED_CLEAVE', delay: 0, scale: basicConfig.scale || 1.1 });
                        } else {
                            const swingId = basicSkill.element === 'ARCANE' ? 'FX_SWING_BLUE_CLEAVE_ARCANE' : 'FX_SWING_BLUE_CLEAVE';
                            actions.push({ type: 'PARTICLE', id: swingId, delay: 0, scale: basicConfig.scale || 1.1 });
                        }
                        break;
                    case 'MELEE_PIERCE':
                        actions.push({ type: 'BEAM', style: style ?? 'GENERIC_BEAM', color: basicConfig.color, duration: 0.1, scale: 0.8 });
                        actions.push({ type: 'PARTICLE', id: isRed ? 'FX_SWING_RED_PIERCE_TIP' : 'FX_SWING_BLUE_PIERCE_TIP', delay: 0.02, scale: 0.8 });
                        break;
                    case 'MELEE_SMASH':
                        if (isRed) {
                            actions.push({ type: 'PARTICLE', id: 'FX_SWING_RED_SMASH', delay: 0, scale: basicConfig.scale || 1.0 });
                        } else {
                            let smashId = 'FX_SWING_BLUE_SMASH';
                            if (basicSkill.element === 'LIGHTNING') smashId = 'FX_SWING_BLUE_SMASH_LIGHTNING';
                            else if (basicSkill.element === 'HOLY') smashId = 'FX_SWING_BLUE_SMASH_HOLY';
                            actions.push({ type: 'PARTICLE', id: smashId, delay: 0, scale: basicConfig.scale || 1.0 });
                        }
                        break;
                    case 'RANGED_BOLT':
                    case 'MAGIC_ORB':
                        break; // 打擊感全在 HIT_FX／投射物
                }
            }
            sequences[basicId] = { id: basicId, actions };
        }

        // --- 2. ACTIVE SKILLS (Expanded) ---
        const activeId = `${prefix}_a${i}`;
        const activeConfig = ACTIVE_VISUALS[activeId];

        if (activeConfig) {
            const actions: VFXAction[] = [];
            const specificHit = activeConfig.impactFx || hitFx;
            // 有投射物的主動技：主特效在投射物抵達時由 HIT_FX 播（visualHitEffect），序列只放出手預兆
            // 無投射物的主動技：HIT_FX 只播陣營預設小打擊（SkillExecutor 的 ownHit），主特效 impactFx 只有這裡播，不可去重拿掉
            const activeSkill = DEFAULT_SKILL_DB.find(sk => sk.id === activeId);
            const isProjectile = (activeSkill?.projectileSpeed ?? 0) > 0;

            // Faction-Specific Flavor
            if (isRed) {
                if (role === 'WARRIOR' || role === 'TANK') {
                    actions.push({ type: 'PARTICLE', id: 'FX_COVENANT_BLOOD_SPIKE', scale: 0.6, delay: 0 });
                } else if (role === 'MAGE') {
                    actions.push({ type: 'PARTICLE', id: 'FX_COVENANT_RIFT', scale: 0.5, delay: 0 });
                }
            } else {
                if (role === 'MAGE' || role === 'RANGER') {
                    actions.push({ type: 'PARTICLE', id: 'FX_IMPERIAL_SCAN', scale: 0.7, delay: 0 });
                } else if (role === 'SUPPORT') {
                    actions.push({ type: 'PARTICLE', id: 'FX_IMPERIAL_HALO', scale: 0.8, delay: 0 });
                } else {
                    actions.push({ type: 'GRID_PULSE', color: primary, scale: 0.6, delay: 0 });
                }
            }

            switch (isProjectile ? 'PROJECTILE_SALVO' : activeConfig.archetype) {
                case 'BURST_AOE':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.secondaryColor, scale: activeConfig.scale || 1.0 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.25 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.color, scale: 1.2, delay: 0.1 });
                    break;
                case 'DASH_ASSAULT':
                    actions.push({ type: 'BEAM', style: activeConfig.beamStyle ?? 'SLASH_CONNECT', color: activeConfig.color, duration: 0.2, scale: 1.5 });
                    if (activeConfig.impactFx) actions.push({ type: 'PARTICLE', id: activeConfig.impactFx, color: activeConfig.secondaryColor, scale: 1.2, delay: 0.1 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.3 });
                    break;
                case 'BUFF_AURA':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.color, scale: activeConfig.scale || 1.0, duration: 1.0 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.secondaryColor, scale: 0.8, delay: 0.0 });
                    break;
                case 'DEBUFF_RAY':
                    actions.push({ type: 'BEAM', style: activeConfig.beamStyle ?? 'GENERIC_BEAM', color: activeConfig.color, duration: 0.5 });
                    if (activeConfig.impactFx) actions.push({ type: 'PARTICLE', id: activeConfig.impactFx, color: activeConfig.secondaryColor, scale: 0.8, delay: 0.1 });
                    break;
                case 'GROUND_SLAM':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.color, scale: 1.3 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.4 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.secondaryColor, scale: 1.5, delay: 0.05 });
                    break;
                case 'PROJECTILE_SALVO':
                    break; // 投射物與命中特效由 ProjectileSystem／HIT_FX 處理
                default: // SIMPLE_IMPACT
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.secondaryColor, scale: activeConfig.scale || 0.8 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.15 });
                    break;
            }
            sequences[activeId] = { id: activeId, actions };
        } else {
            // Fallback for missing configs
            const activeSkill = DEFAULT_SKILL_DB.find(s => s.id === activeId);
            if (activeSkill) {
                sequences[activeId] = {
                    id: activeId,
                    actions: [
                        { type: 'PARTICLE', id: activeSkill.visualHitEffect || hitFx, color: secondary, scale: 0.8 },
                        { type: 'GRID_PULSE', color: primary, scale: 0.8, delay: 0.05 },
                        { type: 'SHAKE', shakeIntensity: 0.15 }
                    ]
                };
            }
        }

        // --- 3. ULTIMATE SKILLS (High Definition) ---
        const ultId = `${prefix}_u${i}`;
        const ultConfig = ULT_VISUALS[ultId];
        const ultSkill = DEFAULT_SKILL_DB.find(s => s.id === ultId);

        if (ultConfig) {
            const actions: VFXAction[] = [];
            const ultFx = ultConfig.vfxOverride || hitFx;
            const U = ULT_SEQUENCE;
            const fxScale = Math.min(U.MAX_FX_SCALE, ultConfig.scale);
            const pulse = (k: number) => Math.min(U.MAX_PULSE_SCALE, k);
            const shake = (k: number) => Math.max(U.MIN_SHAKE, k);
            // hitAt＝序列開始後的命中時刻；CAST_START 延後 (詠唱 − hitAt) 才開始，命中與傷害同一刻（VFXSequence.hitAt）
            let hitAt = ultConfig.charged ? U.CHARGED_HIT_AT : U.HIT_LEAD;
            // 多段命中（skill.hits）：落點數與節奏一律讀技能資料（hitOffsets，和 MultiHitScheduler 同一個純函式），畫面落點＝真實命中。
            // 投射物多段（rb_u5）：傷害從投射物抵達才開始，命中動作改排在 VFXSequence.impact（時間軸從抵達那一刻起算，
            // VisualSystem 在 PROJECTILE_HIT 播），施放序列只留起手
            const skillHits = ultSkill?.hits;
            const hitOffs = skillHits ? hitOffsets(skillHits) : [0];
            const impactTimed = skillHits !== undefined && (ultSkill?.projectileSpeed ?? 0) > 0;
            const impactActions: VFXAction[] = [];
            const hitActions = impactTimed ? impactActions : actions;
            const hitBase = impactTimed ? 0 : hitAt;

            switch (ultConfig.archetype) {
                case 'HEAVEN_FALL': {
                    // 傷害在詠唱結束後再等 ultImpactDelay（timing＋落下時間）才結算；序列命中＝那一刻（VisualSystem 依同一值排起點）。
                    // 一般版：序列從詠唱結束開始，物體落下、資產提早 HIT_LEAD 播；充能式：資產從詠唱開始，物體在詠唱結束（CHARGED_HIT_AT）才開始落
                    const height = ultConfig.height || U.DEFAULT_FALL_HEIGHT;
                    const impactDelay = ultImpactDelay(ultId);
                    const fallStart = ultConfig.charged ? U.CHARGED_HIT_AT : 0;
                    hitAt = fallStart + impactDelay;
                    if (!ultConfig.ownFallObject) {
                        actions.push({ type: 'HEAVEN_FALL', style: 'METEOR', color: ultConfig.primaryColor, height, scale: ultConfig.scale, delay: fallStart + (ultConfig.timing || 0) });
                    }
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: fxScale, delay: ultConfig.charged ? 0 : Math.max(0, hitAt - U.HIT_LEAD) });
                    actions.push({ type: 'SHAKE', shakeIntensity: shake(ultConfig.scale), delay: hitAt });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: pulse(ultConfig.scale * ULT_ARCHETYPE_PARAM.FALL_PULSE_MULT), delay: hitAt + ULT_ARCHETYPE_PARAM.PULSE_DELAY_S });
                    break;
                }
                case 'SANCTUARY':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: fxScale, color: ultConfig.primaryColor });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.primaryColor, scale: pulse(ULT_ARCHETYPE_PARAM.SANCTUARY_PULSE), delay: hitAt });
                    actions.push({ type: 'SHAKE', shakeIntensity: shake(ULT_ARCHETYPE_PARAM.SANCTUARY_SHAKE), delay: hitAt });
                    break;
                case 'DOMAIN':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: fxScale, color: ultConfig.primaryColor });
                    // 多段領域（mb_u1）：每一段命中那一刻各一次格子脈衝＋震動＋內爆脈衝（hitFx）；單發＝只有第 0 段
                    for (let k = 0; k < hitOffs.length; k++) {
                        const at = hitAt + hitOffs[k];
                        actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: pulse(ultConfig.scale * ULT_ARCHETYPE_PARAM.DOMAIN_PULSE_MULT), delay: at });
                        actions.push({ type: 'SHAKE', shakeIntensity: k === 0 ? shake(ULT_ARCHETYPE_PARAM.DOMAIN_SHAKE) : ULT_ARCHETYPE_PARAM.DOMAIN_SHAKE * ULT_ARCHETYPE_PARAM.DOMAIN_HIT_SHAKE_FOLLOW, delay: at });
                        if (skillHits && ultConfig.hitFx) actions.push({ type: 'PARTICLE', id: ultConfig.hitFx, scale: fxScale, color: ultConfig.primaryColor, delay: at });
                    }
                    break;
                case 'BEAM_SNIPE':
                    // 光束在命中那一刻打出；命中點資產提早 HIT_LEAD 開始（起手紋章在目標腳下浮現）
                    actions.push({ type: 'PARTICLE', id: ultFx, color: ultConfig.secondaryColor, scale: Math.min(U.MAX_FX_SCALE, ULT_ARCHETYPE_PARAM.BEAM_FX_SCALE) });
                    actions.push({ type: 'BEAM', style: ultConfig.beamStyle ?? 'DEATH_RAY', color: ultConfig.primaryColor, duration: ULT_ARCHETYPE_PARAM.BEAM_DURATION_S, scale: ultConfig.scale * ULT_ARCHETYPE_PARAM.BEAM_SCALE_MULT, delay: hitAt });
                    actions.push({ type: 'SHAKE', shakeIntensity: shake(ULT_ARCHETYPE_PARAM.BEAM_SHAKE), delay: hitAt });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.primaryColor, scale: pulse(ULT_ARCHETYPE_PARAM.BEAM_PULSE), delay: hitAt + ULT_ARCHETYPE_PARAM.PULSE_DELAY_S });
                    break;
                case 'STORM': {
                    // 落點數與節奏＝skill.hits（沒有 hits 的 STORM 只有一個落點）；落點時間＝hitBase＋hitOffsets[k]，與傷害同一刻
                    const count = hitOffs.length;
                    if (ultConfig.windupFx) actions.push({ type: 'PARTICLE', id: ultConfig.windupFx });
                    const scatterRings = ultSkill?.type === 'SINGLE' ? 0 : (ultSkill?.aoeRadius ?? 1);
                    // 落點大小確定性交錯（黃金比例），不在模組載入時抽亂數
                    for (let k = 0; k < count; k++) {
                        const delay = hitBase + hitOffs[k];
                        hitActions.push({
                            type: 'PARTICLE',
                            id: ultFx,
                            color: k % 2 === 0 ? ultConfig.primaryColor : ultConfig.secondaryColor,
                            scale: Math.min(U.MAX_FX_SCALE, ultConfig.scale * (ULT_ARCHETYPE_PARAM.STORM_SCALE_MIN + ((k * ULT_ARCHETYPE_PARAM.STORM_SCALE_PHASE) % 1) * ULT_ARCHETYPE_PARAM.STORM_SCALE_RANGE)),
                            delay,
                            scatterRings,
                            scatterIndex: k,
                            scatterCount: count,
                        });
                    }
                    hitActions.push({ type: 'SHAKE', shakeIntensity: shake(ULT_ARCHETYPE_PARAM.STORM_SHAKE), delay: hitBase });
                    break;
                }
                case 'INSTANT_IMPACT':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: fxScale, color: ultConfig.primaryColor });
                    actions.push({ type: 'SHAKE', shakeIntensity: shake(ULT_ARCHETYPE_PARAM.IMPACT_SHAKE_MULT * ultConfig.scale), delay: hitAt });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: pulse(ultConfig.scale * ULT_ARCHETYPE_PARAM.IMPACT_PULSE_MULT), delay: hitAt + ULT_ARCHETYPE_PARAM.PULSE_DELAY_S });
                    break;
            }
            // 共用命中包：衝擊環、爆閃、裂紋、碎石（打得多重），與傷害同一刻。
            // 只給造成傷害的奧義（power > 0）；治療、增益、純控制沒有打擊，畫打擊會誤導（ULT-V01：視覺忠於實際作用）
            // 單體技用單體版（只有一道小環），不畫出比實際更大的打擊範圍
            if ((ultSkill?.power ?? 0) > 0) {
                const impactId = (isRed ? 'FX_ULT_IMPACT_RED' : 'FX_ULT_IMPACT_BLUE') + (ultSkill?.type === 'SINGLE' ? '_SINGLE' : '');
                hitActions.push({ type: 'PARTICLE', id: impactId, scale: fxScale * U.IMPACT_SCALE, delay: hitBase });
            }
            hitActions.push({ type: 'ULT_IMPACT', delay: hitBase });
            sequences[ultId] = impactTimed
                ? { id: ultId, actions, hitAt, impact: { id: ultId, actions: impactActions } }
                : { id: ultId, actions, hitAt };
        }
    }
}

fillFactionDefaults('tb', '#3b82f6', '#fbbf24', 'TANK');
fillFactionDefaults('wb', '#e0f2fe', '#3b82f6', 'WARRIOR');
fillFactionDefaults('rb', '#38bdf8', '#22d3ee', 'RANGER');
fillFactionDefaults('mb', '#8b5cf6', '#d8b4fe', 'MAGE');
fillFactionDefaults('sb', '#86efac', '#fef08a', 'SUPPORT');

fillFactionDefaults('tr', '#7f1d1d', '#991b1b', 'TANK');
fillFactionDefaults('wr', '#dc2626', '#7f1d1d', 'WARRIOR');
fillFactionDefaults('rr', '#ea580c', '#f97316', 'RANGER');
fillFactionDefaults('mr', '#16a34a', '#581c87', 'MAGE');
fillFactionDefaults('sr', '#be123c', '#581c87', 'SUPPORT');

export const SKILL_SEQUENCES = sequences;
