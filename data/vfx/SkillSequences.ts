
import { VFXSequence, VFXAction } from "../../types/VFXSchema";
import { DEFAULT_SKILL_DB } from "../../skillDatabase";

const sequences: Record<string, VFXSequence> = {
    // --- 🔵 IMPERIAL ACTIVE SKILLS ---
    'wb_a1': { 
        id: 'wb_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_WARRIOR', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#60a5fa', scale: 1.0, delay: 0.1 }
        ]
    },
    'tb_a2': { 
        id: 'tb_a2',
        actions: [
            { type: 'BEAM', style: 'TELEPORT_PILLAR', color: '#fcd34d', duration: 0.3 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_TANK', delay: 0.1 },
            { type: 'SHAKE', shakeIntensity: 0.2, delay: 0.1 }
        ]
    },
    'rb_a2': { 
        id: 'rb_a2',
        actions: [
            { type: 'BEAM', style: 'DEATH_RAY', color: '#38bdf8', duration: 0.2 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_RANGER', scale: 1.2 }
        ]
    },
    'mb_a1': { 
        id: 'mb_a1',
        actions: [
            { type: 'GRID_PULSE', color: '#a855f7', scale: 1.2 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_MAGE', scale: 1.5, delay: 0.1 }
        ]
    },

    // --- 🔴 COVENANT ACTIVE SKILLS ---
    'wr_a1': { 
        id: 'wr_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_RED_WARRIOR', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#ef4444', scale: 1.0, delay: 0.1 }
        ]
    },
    'tr_a1': { 
        id: 'tr_a1',
        actions: [
            { type: 'BEAM', style: 'SLASH_CONNECT', color: '#7f1d1d', duration: 0.3 },
            { type: 'PARTICLE', id: 'FX_HIT_RED_TANK', delay: 0.1 }
        ]
    },
    'rr_a1': { 
        id: 'rr_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_FIRE', scale: 1.2 },
            { type: 'SHAKE', shakeIntensity: 0.15 }
        ]
    },
    'mr_a3': { 
        id: 'mr_a3',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_FIRE', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#ea580c', scale: 1.2, delay: 0.1 }
        ]
    },

    // --- 🔵 BLUE IMPERIAL ULTIMATES ---
    'tb_u1': { 
        id: 'tb_u1',
        actions: [
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_SANCTUARY_IMPACT', scale: 1.0 },
            { type: 'GRID_PULSE', color: '#fbbf24', scale: 1.5 }
        ]
    },
    'tb_u3': { 
        id: 'tb_u3',
        actions: [
            { type: 'HEAVEN_FALL', style: 'GIANT_HEX', color: '#3b82f6', height: 1000, scale: 1.2 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_AEGIS_IMPACT', delay: 0.4 }
        ]
    },
    'wb_u1': { 
        id: 'wb_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#60a5fa', height: 1000, scale: 0.8 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_THUNDER_SLAM', delay: 0.4 },
            { type: 'GRID_PULSE', color: '#3b82f6', scale: 1.3, delay: 0.4 }
        ]
    },
    'mb_u1': { 
        id: 'mb_u1',
        actions: [
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_BLACKHOLE', scale: 1.5 },
            { type: 'SHAKE', shakeIntensity: 0.5, delay: 0.2 },
            { type: 'GRID_PULSE', color: '#000000', scale: 1.8, delay: 0.2 }
        ]
    },

    // --- 🔴 COVENANT RED ULTIMATES ---
    'tr_u1': { 
        id: 'tr_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#7f1d1d', height: 1000, scale: 0.8 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_GUILLOTINE_IMPACT', delay: 0.4 },
            { type: 'GRID_PULSE', color: '#ef4444', scale: 1.1, delay: 0.45 }
        ]
    },
    'wr_u1': { 
        id: 'wr_u1',
        actions: [
            { type: 'GRID_PULSE', color: '#ea580c', scale: 1.2 }, 
            { type: 'PARTICLE', id: 'FX_ULT_RED_RAGNAROK_ERUPTION', scale: 1.0 }
        ]
    },
    'mr_u1': { 
        id: 'mr_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#ea580c', height: 1500, scale: 1.5 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_METEOR_IMPACT', delay: 0.6 },
            { type: 'GRID_PULSE', color: '#7c2d12', scale: 2.5, delay: 0.6 }
        ]
    }
};

function fillFactionDefaults(prefix: string, primary: string, secondary: string, role: string) {
    const isRed = prefix.includes('r');
    const hitFx = `FX_HIT_${isRed ? 'RED' : 'BLUE'}_${role}`;

    for (let i = 1; i <= 5; i++) {
        // --- 1. BASIC ATTACK AUTO-GENERATION ---
        const basicId = `${prefix}_b${i}`;
        const skillDef = DEFAULT_SKILL_DB.find(s => s.id === basicId);
        
        if (skillDef && !sequences[basicId]) {
            const basicActions: VFXAction[] = [];
            
            // 如果是瞬發（近戰或無彈道遠程），序列需要負責繪製連線
            if (!skillDef.projectileSpeed || skillDef.projectileSpeed <= 0) {
                const beamStyle = (role === 'WARRIOR' || role === 'TANK') ? 'SLASH_CONNECT' : 'GENERIC_BEAM';
                basicActions.push({ 
                    type: 'BEAM', 
                    style: beamStyle, 
                    color: skillDef.color, 
                    duration: 0.15 
                });
            }

            // 核心命中粒子 (延遲與動作同步)
            basicActions.push({ 
                type: 'PARTICLE', 
                id: hitFx, 
                color: secondary, 
                scale: 0.6, 
                delay: 0.05 
            });

            // 微量鏡頭衝擊感
            basicActions.push({ type: 'SHAKE', shakeIntensity: 0.05, delay: 0.05 });

            sequences[basicId] = { id: basicId, actions: basicActions };
        }

        // --- 2. ACTIVE SKILL DEFAULTS ---
        const activeId = `${prefix}_a${i}`;
        if (!sequences[activeId]) {
            sequences[activeId] = {
                id: activeId,
                actions: [
                    { type: 'PARTICLE', id: hitFx, color: secondary, scale: 0.8 },
                    { type: 'GRID_PULSE', color: primary, scale: 0.8, delay: 0.05 },
                    { type: 'SHAKE', shakeIntensity: 0.15 }
                ]
            };
        }

        // --- 3. ULTIMATE DEFAULTS ---
        const ultId = `${prefix}_u${i}`;
        if (!sequences[ultId]) {
            sequences[ultId] = {
                id: ultId,
                actions: [
                    { type: 'BEAM', style: 'TELEPORT_PILLAR', color: secondary, duration: 0.5 },
                    { type: 'GRID_PULSE', color: primary, scale: 1.1, delay: 0.15 }, 
                    { type: 'PARTICLE', id: `FX_ULT_${isRed ? 'RED' : 'BLUE'}_IMPACT`, delay: 0.15, scale: 0.8 },
                    { type: 'SHAKE', shakeIntensity: 0.4, delay: 0.15 }
                ]
            };
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
