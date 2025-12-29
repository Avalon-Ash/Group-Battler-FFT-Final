
import { VFXSequence, VFXAction } from "../../types/VFXSchema";

const sequences: Record<string, VFXSequence> = {
    // --- 🔵 IMPERIAL ACTIVE SKILLS ---
    
    'wb_a1': { // 旋光劍舞 (Spin Slash)
        id: 'wb_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_WARRIOR', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#60a5fa', scale: 1.0, delay: 0.1 }
        ]
    },
    'tb_a2': { // 制裁震擊 (Smite)
        id: 'tb_a2',
        actions: [
            { type: 'BEAM', style: 'TELEPORT_PILLAR', color: '#fcd34d', duration: 0.3 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_TANK', delay: 0.1 },
            { type: 'SHAKE', shakeIntensity: 0.2, delay: 0.1 }
        ]
    },
    'rb_a2': { // 穿甲狙擊 (Sniper)
        id: 'rb_a2',
        actions: [
            { type: 'BEAM', style: 'DEATH_RAY', color: '#38bdf8', duration: 0.2 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_RANGER', scale: 1.2 }
        ]
    },
    'mb_a1': { // 奧術爆破 (Blast)
        id: 'mb_a1',
        actions: [
            { type: 'GRID_PULSE', color: '#a855f7', scale: 1.2 },
            { type: 'PARTICLE', id: 'FX_HIT_BLUE_MAGE', scale: 1.5, delay: 0.1 }
        ]
    },

    // --- 🔴 COVENANT ACTIVE SKILLS ---

    'wr_a1': { // 旋風斬 (Whirlwind)
        id: 'wr_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_RED_WARRIOR', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#ef4444', scale: 1.0, delay: 0.1 }
        ]
    },
    'tr_a1': { // 奪命血鉤 (Hook)
        id: 'tr_a1',
        actions: [
            { type: 'BEAM', style: 'SLASH_CONNECT', color: '#7f1d1d', duration: 0.3 },
            { type: 'PARTICLE', id: 'FX_HIT_RED_TANK', delay: 0.1 }
        ]
    },
    'rr_a1': { // 燃燒爆彈 (Explosive)
        id: 'rr_a1',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_FIRE', scale: 1.2 },
            { type: 'SHAKE', shakeIntensity: 0.15 }
        ]
    },
    'mr_a3': { // 地獄火球 (Hellfire)
        id: 'mr_a3',
        actions: [
            { type: 'PARTICLE', id: 'FX_HIT_FIRE', scale: 1.5 },
            { type: 'GRID_PULSE', color: '#ea580c', scale: 1.2, delay: 0.1 }
        ]
    },

    // --- 🔵 BLUE IMPERIAL ULTIMATES (Existing) ---
    'tb_u1': { // 聖光結界
        id: 'tb_u1',
        actions: [
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_SANCTUARY_IMPACT', scale: 1.0 },
            { type: 'GRID_PULSE', color: '#fbbf24', scale: 1.5 }
        ]
    },
    'tb_u3': { // 絕對防禦
        id: 'tb_u3',
        actions: [
            { type: 'HEAVEN_FALL', style: 'GIANT_HEX', color: '#3b82f6', height: 1000, scale: 1.2 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_AEGIS_IMPACT', delay: 0.4 }
        ]
    },
    'wb_u1': { // 雷霆之怒
        id: 'wb_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#60a5fa', height: 1000, scale: 0.8 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_THUNDER_SLAM', delay: 0.4 },
            { type: 'GRID_PULSE', color: '#3b82f6', scale: 1.3, delay: 0.4 }
        ]
    },
    'rb_u1': { // 極地冰河
        id: 'rb_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'GIANT_HEX', color: '#bae6fd', height: 1200, scale: 1.0 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_GLACIAL_BURST', delay: 0.48 },
            { type: 'GRID_PULSE', color: '#e0f2fe', scale: 2.0, delay: 0.5 }
        ]
    },
    'mb_u2': { // 絕對零度
        id: 'mb_u2',
        actions: [
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_GLACIAL_BURST', scale: 1.2 },
            { type: 'GRID_PULSE', color: '#bae6fd', scale: 1.5 }
        ]
    },
    'rb_u3': { // 軌道轟炸
        id: 'rb_u3',
        actions: [
            { type: 'BEAM', style: 'TELEPORT_PILLAR', color: '#22d3ee', duration: 0.8 },
            { type: 'PARTICLE', id: 'FX_ULT_BLUE_ORBITAL_BEAM', delay: 0.1, scale: 0.7 },
            { type: 'GRID_PULSE', color: '#06b6d4', scale: 1.1, delay: 0.12 }
        ]
    },

    // --- 🔴 COVENANT RED ULTIMATES (Existing) ---
    'tr_u1': { // 處決斷頭台
        id: 'tr_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#7f1d1d', height: 1000, scale: 0.8 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_GUILLOTINE_IMPACT', delay: 0.4 },
            { type: 'GRID_PULSE', color: '#ef4444', scale: 1.1, delay: 0.45 }
        ]
    },
    'wr_u2': { // 血腥旋風
        id: 'wr_u2',
        actions: [
            { type: 'GRID_PULSE', color: '#7f1d1d', scale: 1.2 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_BLOODSTORM', scale: 0.9 }
        ]
    },
    'wr_u1': { // 諸神黃昏
        id: 'wr_u1',
        actions: [
            { type: 'GRID_PULSE', color: '#ea580c', scale: 1.2 }, 
            { type: 'PARTICLE', id: 'FX_ULT_RED_RAGNAROK_ERUPTION', scale: 1.0 }
        ]
    },
    'mr_u1': { // 毀滅隕石
        id: 'mr_u1',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#ea580c', height: 1500, scale: 1.5 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_METEOR_IMPACT', delay: 0.6 },
            { type: 'GRID_PULSE', color: '#7c2d12', scale: 2.5, delay: 0.6 }
        ]
    },
    'rr_u2': { // 戰術核彈
        id: 'rr_u2',
        actions: [
            { type: 'HEAVEN_FALL', style: 'METEOR', color: '#ffffff', height: 1500, scale: 0.35 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_NUKE_FLASH', delay: 0.6 },
            { type: 'PARTICLE', id: 'FX_ULT_RED_NUKE_CLOUD', delay: 0.7 },
            { type: 'GRID_PULSE', color: '#f97316', scale: 3.5, delay: 0.6 }
        ]
    }
};

function fillFactionDefaults(prefix: string, primary: string, secondary: string, role: string) {
    const isRed = prefix.includes('r');
    const hitFx = `FX_HIT_${isRed ? 'RED' : 'BLUE'}_${role}`;

    // IMPORTANT: Basic Skills (_b1.._b5) are intentionally skipped here.
    // They rely on 'VISUAL_SLASH' events handled by CinematicVFXHandler's fallback logic
    // to render the connection beam/slash correctly.
    // If we define a Sequence here, it would override the fallback and the beam would be lost.

    for (let i = 1; i <= 5; i++) {
        const activeId = `${prefix}_a${i}`;
        if (!sequences[activeId]) {
            sequences[activeId] = {
                id: activeId,
                actions: [
                    { type: 'PARTICLE', id: hitFx, color: secondary, scale: 0.8 },
                    { type: 'GRID_PULSE', color: primary, scale: 0.8, delay: 0.05 }
                ]
            };
        }

        const ultId = `${prefix}_u${i}`;
        if (!sequences[ultId]) {
            sequences[ultId] = {
                id: ultId,
                actions: [
                    { type: 'BEAM', style: 'TELEPORT_PILLAR', color: secondary, duration: 0.5 },
                    { type: 'GRID_PULSE', color: primary, scale: 1.1, delay: 0.15 }, 
                    { type: 'PARTICLE', id: `FX_ULT_${isRed ? 'RED' : 'BLUE'}_IMPACT`, delay: 0.15, scale: 0.8 } 
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
