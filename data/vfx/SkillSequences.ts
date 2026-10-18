import { VFXSequence, VFXAction } from "../../types/VFXSchema";
import { Team } from "../../types";
import { DEFAULT_SKILL_DB } from "../../skillDatabase";
import { ULT_VISUALS } from "./ult_visuals";
import { ACTIVE_VISUALS } from "./active_visuals";
import { BASIC_VISUALS } from "./basic_visuals";
import { FACTION_VISUALS } from "./faction_visuals";

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
                        actions.push({ type: 'BEAM', style: style ?? 'SLASH_CONNECT', color: basicConfig.color, duration: 0.15, scale: basicConfig.scale });
                        break;
                    case 'CROSS_CUT':
                    case 'DUAL_STRIKE':
                        actions.push({ type: 'BEAM', style: style ?? 'SLASH_CONNECT', color: basicConfig.color, duration: 0.15, scale: 0.8 });
                        actions.push({ type: 'BEAM', style: style ?? 'SLASH_CONNECT', color: basicConfig.secondaryColor, duration: 0.15, scale: 0.8, delay: 0.1 });
                        break;
                    case 'HEAVY_CLEAVE':
                    case 'MELEE_CLEAVE':
                        actions.push({ type: 'BEAM', style: style ?? 'SLASH_CONNECT', color: basicConfig.color, duration: 0.25, scale: (basicConfig.scale || 1.2) * 1.2 });
                        break;
                    case 'MELEE_PIERCE':
                        actions.push({ type: 'BEAM', style: style ?? 'GENERIC_BEAM', color: basicConfig.color, duration: 0.1, scale: 0.8 });
                        break;
                    case 'LASER_SHOT':
                        actions.push({ type: 'BEAM', style: style ?? 'LIGHTNING_BEAM', color: basicConfig.color, duration: 0.2, scale: 0.8 });
                        break;
                    case 'RANGED_BEAM':
                        actions.push({ type: 'BEAM', style: style ?? 'GENERIC_BEAM', color: basicConfig.color, duration: 0.25, scale: basicConfig.scale ?? 1.0 });
                        break;
                    case 'MELEE_SMASH':
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

        if (ultConfig) {
            const actions: VFXAction[] = [];
            const ultFx = ultConfig.vfxOverride || hitFx;

            switch (ultConfig.archetype) {
                case 'HEAVEN_FALL':
                    actions.push({ type: 'HEAVEN_FALL', style: 'METEOR', color: ultConfig.primaryColor, height: ultConfig.height || 1000, scale: ultConfig.scale });
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: ultConfig.scale, delay: (ultConfig.timing || 0) + 0.4 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 1.0 * ultConfig.scale, delay: (ultConfig.timing || 0) + 0.4 }); // Increased shake
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale * 2.5, delay: (ultConfig.timing || 0) + 0.45 }); // Increased pulse
                    break;
                case 'SANCTUARY':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: ultConfig.scale, color: ultConfig.primaryColor });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.primaryColor, scale: 1.8, delay: 0.2 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.2, delay: 0.1 }); // Added shake
                    break;
                case 'DOMAIN':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: ultConfig.scale, color: ultConfig.primaryColor, duration: 3.0 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale * 2.0, delay: 0.1 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.3, delay: 0.05 }); // Added shake
                    break;
                case 'BEAM_SNIPE':
                    actions.push({ type: 'BEAM', style: ultConfig.beamStyle ?? 'DEATH_RAY', color: ultConfig.primaryColor, duration: 0.8, scale: ultConfig.scale * 0.35 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.5, delay: 0.1 });
                    // 命中點：光束本體是程序化 BEAM，命中特效要另外播
                    actions.push({ type: 'PARTICLE', id: ultFx, color: ultConfig.secondaryColor, scale: 1.5 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.primaryColor, scale: 1.2, delay: 0.05 }); // Added pulse
                    break;
                case 'STORM':
                    const count = ultConfig.count || 10;
                    const interval = ultConfig.timing || 0.1;
                    if (ultConfig.windupFx) actions.push({ type: 'PARTICLE', id: ultConfig.windupFx });
                    for(let k=0; k<count; k++) { actions.push({ type: 'PARTICLE', id: ultFx, color: k % 2 === 0 ? ultConfig.primaryColor : ultConfig.secondaryColor, scale: ultConfig.scale * (0.8 + Math.random()*0.4), delay: k * interval }); }
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.15, duration: count * interval }); // Sustained shake
                    break;
                case 'INSTANT_IMPACT':
                    actions.push({ type: 'PARTICLE', id: ultFx, scale: ultConfig.scale, color: ultConfig.primaryColor });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.6 * ultConfig.scale, delay: 0.05 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale * 1.5, delay: 0.1 });
                    break;
            }
            sequences[ultId] = { id: ultId, actions };
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
