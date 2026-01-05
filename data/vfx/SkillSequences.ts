
import { VFXSequence, VFXAction } from "../../types/VFXSchema";
import { DEFAULT_SKILL_DB } from "../../skillDatabase";
import { ULT_VISUALS } from "./ult_visuals";
import { ACTIVE_VISUALS } from "./active_visuals";
import { BASIC_VISUALS } from "./basic_visuals";

const sequences: Record<string, VFXSequence> = {};

function fillFactionDefaults(prefix: string, primary: string, secondary: string, role: string) {
    const isRed = prefix.includes('r');
    const hitFx = `FX_HIT_${isRed ? 'RED' : 'BLUE'}_${role}`;

    for (let i = 1; i <= 5; i++) {
        // --- 1. BASIC SKILLS (Enhanced) ---
        const basicId = `${prefix}_b${i}`;
        const basicSkill = DEFAULT_SKILL_DB.find(s => s.id === basicId);
        const basicConfig = BASIC_VISUALS[basicId];

        if (basicSkill) {
            const actions: VFXAction[] = [];
            const specificHit = basicSkill.visualHitEffect || hitFx;
            
            if (basicConfig) {
                // Config-Driven Basic Sequence
                switch(basicConfig.archetype) {
                    case 'MELEE_SLASH':
                        actions.push({ type: 'BEAM', style: 'SLASH_CONNECT', color: basicConfig.color, duration: 0.15, scale: basicConfig.scale });
                        actions.push({ type: 'PARTICLE', id: specificHit, color: basicConfig.secondaryColor, scale: 0.8, delay: 0.1 });
                        actions.push({ type: 'SHAKE', shakeIntensity: 0.1, delay: 0.1 });
                        break;
                    case 'MELEE_SMASH':
                        actions.push({ type: 'PARTICLE', id: specificHit, color: basicConfig.color, scale: (basicConfig.scale || 1.0) * 1.2 });
                        actions.push({ type: 'SHAKE', shakeIntensity: 0.15, delay: 0.05 });
                        actions.push({ type: 'GRID_PULSE', color: basicConfig.secondaryColor, scale: 0.8, delay: 0.1 });
                        break;
                    case 'MELEE_PIERCE':
                        actions.push({ type: 'BEAM', style: 'GENERIC_BEAM', color: basicConfig.color, duration: 0.1, scale: 0.8 });
                        actions.push({ type: 'PARTICLE', id: 'SPARK', color: basicConfig.secondaryColor, scale: 0.6, delay: 0.05 });
                        break;
                    case 'DUAL_STRIKE':
                        actions.push({ type: 'BEAM', style: 'SLASH_CONNECT', color: basicConfig.color, duration: 0.1, scale: 0.8 });
                        actions.push({ type: 'BEAM', style: 'SLASH_CONNECT', color: basicConfig.secondaryColor, duration: 0.1, scale: 0.8, delay: 0.1 });
                        actions.push({ type: 'PARTICLE', id: specificHit, scale: 0.7, delay: 0.15 });
                        break;
                    case 'RANGED_BOLT':
                    case 'MAGIC_ORB':
                        // Muzzle Flash
                        actions.push({ type: 'PARTICLE', id: 'GLOW', color: basicConfig.color, scale: 0.6, duration: 0.1 });
                        break;
                    case 'RANGED_BEAM':
                        actions.push({ type: 'BEAM', style: 'GENERIC_BEAM', color: basicConfig.color, duration: 0.3, scale: 1.0 });
                        actions.push({ type: 'PARTICLE', id: specificHit, color: basicConfig.secondaryColor, scale: 0.7, delay: 0.05 });
                        break;
                }
            } else {
                // Fallback Legacy Logic
                if (!basicSkill.projectileSpeed || basicSkill.projectileSpeed <= 0) {
                    const beamStyle = (role === 'WARRIOR' || role === 'TANK') ? 'SLASH_CONNECT' : 'GENERIC_BEAM';
                    actions.push({ type: 'BEAM', style: beamStyle, color: basicSkill.color, duration: 0.15 });
                }
                actions.push({ type: 'PARTICLE', id: specificHit, color: secondary, scale: 0.6, delay: 0.05 });
                actions.push({ type: 'SHAKE', shakeIntensity: 0.05, delay: 0.05 });
            }
            sequences[basicId] = { id: basicId, actions };
        }

        // --- 2. ACTIVE SKILLS (Expanded) ---
        const activeId = `${prefix}_a${i}`;
        const activeConfig = ACTIVE_VISUALS[activeId];
        
        if (activeConfig) {
            const actions: VFXAction[] = [];
            const specificHit = activeConfig.vfxOverride || hitFx;
            
            switch (activeConfig.archetype) {
                case 'BURST_AOE':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.secondaryColor, scale: activeConfig.scale || 1.0 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.25 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.color, scale: 1.2, delay: 0.1 });
                    break;
                case 'DASH_ASSAULT':
                    actions.push({ type: 'BEAM', style: 'SLASH_CONNECT', color: activeConfig.color, duration: 0.2, scale: 1.5 });
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.secondaryColor, scale: 1.2, delay: 0.1 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.3 });
                    break;
                case 'BUFF_AURA':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.color, scale: activeConfig.scale || 1.0, duration: 1.0 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.secondaryColor, scale: 0.8, delay: 0.0 });
                    break;
                case 'DEBUFF_RAY':
                    actions.push({ type: 'BEAM', style: 'GENERIC_BEAM', color: activeConfig.color, duration: 0.5 });
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.secondaryColor, scale: 0.8, delay: 0.1 });
                    break;
                case 'GROUND_SLAM':
                    actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.color, scale: 1.3 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.4 });
                    actions.push({ type: 'GRID_PULSE', color: activeConfig.secondaryColor, scale: 1.5, delay: 0.05 });
                    break;
                case 'PROJECTILE_SALVO':
                    const count = activeConfig.count || 3;
                    for(let k=0; k<count; k++) {
                        actions.push({ type: 'PARTICLE', id: specificHit, color: activeConfig.color, scale: 0.7, delay: k * 0.1 });
                    }
                    break;
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
            
            switch (ultConfig.archetype) {
                case 'HEAVEN_FALL':
                    actions.push({ type: 'HEAVEN_FALL', style: 'METEOR', color: ultConfig.primaryColor, height: ultConfig.height || 1000, scale: ultConfig.scale });
                    actions.push({ type: 'PARTICLE', id: ultConfig.vfxOverride || `FX_ULT_${isRed?'RED':'BLUE'}_IMPACT`, scale: ultConfig.scale, delay: (ultConfig.timing || 0) + 0.4 });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.8 * ultConfig.scale, delay: (ultConfig.timing || 0) + 0.4 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale * 2, delay: (ultConfig.timing || 0) + 0.45 });
                    break;
                case 'SANCTUARY':
                    actions.push({ type: 'PARTICLE', id: ultConfig.vfxOverride || 'PILLAR_HOLY', scale: ultConfig.scale, color: ultConfig.primaryColor });
                    for(let k=0; k<(ultConfig.count || 6); k++) { actions.push({ type: 'PARTICLE', id: 'GLOW', scale: 0.5, color: ultConfig.secondaryColor, delay: k * 0.05 }); }
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.primaryColor, scale: 1.5, delay: 0.2 });
                    break;
                case 'DOMAIN':
                    actions.push({ type: 'PARTICLE', id: ultConfig.vfxOverride || 'DOMAIN_STANDARD', scale: ultConfig.scale, color: ultConfig.primaryColor, duration: 3.0 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale * 1.5, delay: 0.1 });
                    break;
                case 'BEAM_SNIPE':
                    actions.push({ type: 'BEAM', style: ultConfig.vfxOverride || 'DEATH_RAY', color: ultConfig.primaryColor, duration: 0.8, scale: ultConfig.scale });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.4, delay: 0.1 });
                    actions.push({ type: 'PARTICLE', id: 'SHOCKWAVE', color: ultConfig.secondaryColor, scale: 1.2 });
                    break;
                case 'STORM':
                    const count = ultConfig.count || 10;
                    const interval = ultConfig.timing || 0.1;
                    const fx = ultConfig.vfxOverride || 'SPARK';
                    for(let k=0; k<count; k++) { actions.push({ type: 'PARTICLE', id: fx, color: k % 2 === 0 ? ultConfig.primaryColor : ultConfig.secondaryColor, scale: ultConfig.scale * (0.8 + Math.random()*0.4), delay: k * interval }); }
                    break;
                case 'INSTANT_IMPACT':
                    actions.push({ type: 'PARTICLE', id: ultConfig.vfxOverride || `FX_HIT_${isRed?'RED':'BLUE'}_HEAVY`, scale: ultConfig.scale, color: ultConfig.primaryColor });
                    actions.push({ type: 'SHAKE', shakeIntensity: 0.5 * ultConfig.scale, delay: 0.05 });
                    actions.push({ type: 'GRID_PULSE', color: ultConfig.secondaryColor, scale: ultConfig.scale, delay: 0.1 });
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
