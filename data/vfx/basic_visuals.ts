
// =========================================================================================
// ⚔️ BASIC ATTACK VISUAL CONFIGURATION
// Defines unique visual archetypes for 50 Basic Skills (IDs b1-b5)
// =========================================================================================

export type BasicArchetype = 
    | 'MELEE_SLASH'     // Standard Sword Swipe
    | 'MELEE_SMASH'     // Blunt Impact
    | 'MELEE_PIERCE'    // Spear Thrust
    | 'RANGED_BOLT'     // Standard Projectile
    | 'RANGED_BEAM'     // Instant Laser
    | 'MAGIC_ORB'       // Slow Homing
    | 'DUAL_STRIKE';    // Two hits

export interface BasicVisualDef {
    archetype: BasicArchetype;
    color: string;
    secondaryColor: string;
    scale?: number;
    slashStyle?: string; // For Melee
    vfxOverride?: string; // Additional particle
    sound?: string;
}

export const BASIC_VISUALS: Record<string, BasicVisualDef> = {
    // ================= IMPERIAL (BLUE) =================

    // --- TANK ---
    'tb_b1': { archetype: 'MELEE_SMASH', color: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.2 },
    'tb_b2': { archetype: 'MELEE_SMASH', color: '#93c5fd', secondaryColor: '#fff', vfxOverride: 'SPARK' },
    'tb_b3': { archetype: 'MELEE_SMASH', color: '#1e3a8a', secondaryColor: '#3b82f6', scale: 1.0 },
    'tb_b4': { archetype: 'MELEE_SMASH', color: '#60a5fa', secondaryColor: '#fff', vfxOverride: 'GLOW' },
    'tb_b5': { archetype: 'MELEE_SMASH', color: '#3b82f6', secondaryColor: '#bae6fd', scale: 1.4 },

    // --- WARRIOR ---
    'wb_b1': { archetype: 'DUAL_STRIKE', color: '#e0f2fe', secondaryColor: '#fff', scale: 1.0 },
    'wb_b2': { archetype: 'MELEE_PIERCE', color: '#bae6fd', secondaryColor: '#3b82f6', scale: 1.2 },
    'wb_b3': { archetype: 'MELEE_SLASH', color: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.5, slashStyle: 'SLASH' },
    'wb_b4': { archetype: 'MELEE_SMASH', color: '#94a3b8', secondaryColor: '#cbd5e1', scale: 0.8 },
    'wb_b5': { archetype: 'MELEE_SLASH', color: '#fbbf24', secondaryColor: '#fff', vfxOverride: 'SPARK' },

    // --- RANGER (Projectiles handled by ProjectileSystem, these are Cast/Muzzle Flash) ---
    'rb_b1': { archetype: 'RANGED_BOLT', color: '#38bdf8', secondaryColor: '#0ea5e9', scale: 1.0 },
    'rb_b2': { archetype: 'RANGED_BOLT', color: '#e0f2fe', secondaryColor: '#fff', scale: 0.8 },
    'rb_b3': { archetype: 'RANGED_BEAM', color: '#ef4444', secondaryColor: '#fca5a5', scale: 1.2 },
    'rb_b4': { archetype: 'RANGED_BOLT', color: '#fbbf24', secondaryColor: '#fcd34d', scale: 1.1 },
    'rb_b5': { archetype: 'RANGED_BOLT', color: '#8b5cf6', secondaryColor: '#c084fc', scale: 1.0 },

    // --- MAGE ---
    'mb_b1': { archetype: 'MAGIC_ORB', color: '#8b5cf6', secondaryColor: '#d8b4fe', scale: 1.2 },
    'mb_b2': { archetype: 'RANGED_BEAM', color: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.0 },
    'mb_b3': { archetype: 'MAGIC_ORB', color: '#bae6fd', secondaryColor: '#fff', scale: 1.1 },
    'mb_b4': { archetype: 'MAGIC_ORB', color: '#d8b4fe', secondaryColor: '#e9d5ff', scale: 0.9 },
    'mb_b5': { archetype: 'RANGED_BEAM', color: '#818cf8', secondaryColor: '#c7d2fe', scale: 1.0 },

    // --- SUPPORT ---
    'sb_b1': { archetype: 'RANGED_BEAM', color: '#fef08a', secondaryColor: '#fff', scale: 1.0 },
    'sb_b2': { archetype: 'RANGED_BOLT', color: '#bfdbfe', secondaryColor: '#fff', scale: 0.8 },
    'sb_b3': { archetype: 'RANGED_BEAM', color: '#e0f2fe', secondaryColor: '#fff', scale: 1.0 },
    'sb_b4': { archetype: 'RANGED_BOLT', color: '#a7f3d0', secondaryColor: '#6ee7b7', scale: 0.9 },
    'sb_b5': { archetype: 'RANGED_BEAM', color: '#fcd34d', secondaryColor: '#fff', scale: 1.2 },


    // ================= COVENANT (RED) =================

    // --- TANK ---
    'tr_b1': { archetype: 'MELEE_SMASH', color: '#7f1d1d', secondaryColor: '#991b1b', scale: 1.3 },
    'tr_b2': { archetype: 'MELEE_SLASH', color: '#991b1b', secondaryColor: '#ef4444', scale: 1.1 },
    'tr_b3': { archetype: 'MELEE_SMASH', color: '#b91c1c', secondaryColor: '#fca5a5', scale: 1.0 },
    'tr_b4': { archetype: 'MELEE_SMASH', color: '#7f1d1d', secondaryColor: '#000', scale: 1.2 },
    'tr_b5': { archetype: 'MELEE_PIERCE', color: '#ef4444', secondaryColor: '#f87171', scale: 1.0 },

    // --- WARRIOR ---
    'wr_b1': { archetype: 'MELEE_SLASH', color: '#dc2626', secondaryColor: '#991b1b', scale: 1.2, slashStyle: 'SLASH' },
    'wr_b2': { archetype: 'RANGED_BOLT', color: '#b91c1c', secondaryColor: '#ef4444', scale: 1.0 },
    'wr_b3': { archetype: 'MELEE_SLASH', color: '#ef4444', secondaryColor: '#fca5a5', scale: 1.4 },
    'wr_b4': { archetype: 'MELEE_SMASH', color: '#7f1d1d', secondaryColor: '#000', scale: 1.1 },
    'wr_b5': { archetype: 'DUAL_STRIKE', color: '#b91c1c', secondaryColor: '#fff', scale: 1.2 },

    // --- RANGER ---
    'rr_b1': { archetype: 'RANGED_BOLT', color: '#ea580c', secondaryColor: '#f97316', scale: 1.3 },
    'rr_b2': { archetype: 'RANGED_BOLT', color: '#f87171', secondaryColor: '#fff', scale: 0.8 },
    'rr_b3': { archetype: 'RANGED_BOLT', color: '#a3e635', secondaryColor: '#d9f99d', scale: 1.0 },
    'rr_b4': { archetype: 'RANGED_BOLT', color: '#f97316', secondaryColor: '#fdba74', scale: 1.1 },
    'rr_b5': { archetype: 'RANGED_BOLT', color: '#7c3aed', secondaryColor: '#a78bfa', scale: 1.0 },

    // --- MAGE ---
    'mr_b1': { archetype: 'MAGIC_ORB', color: '#16a34a', secondaryColor: '#4ade80', scale: 1.1 },
    'mr_b2': { archetype: 'RANGED_BEAM', color: '#991b1b', secondaryColor: '#ef4444', scale: 1.0 },
    'mr_b3': { archetype: 'MAGIC_ORB', color: '#fca5a5', secondaryColor: '#fff', scale: 1.2 },
    'mr_b4': { archetype: 'MAGIC_ORB', color: '#581c87', secondaryColor: '#a855f7', scale: 1.0 },
    'mr_b5': { archetype: 'MAGIC_ORB', color: '#7c3aed', secondaryColor: '#c4b5fd', scale: 1.0 },

    // --- SUPPORT ---
    'sr_b1': { archetype: 'RANGED_BEAM', color: '#be123c', secondaryColor: '#fb7185', scale: 1.0 },
    'sr_b2': { archetype: 'RANGED_BOLT', color: '#7c3aed', secondaryColor: '#fff', scale: 0.9 },
    'sr_b3': { archetype: 'MAGIC_ORB', color: '#a3e635', secondaryColor: '#d9f99d', scale: 1.0 },
    'sr_b4': { archetype: 'RANGED_BEAM', color: '#991b1b', secondaryColor: '#ef4444', scale: 1.1 },
    'sr_b5': { archetype: 'RANGED_BOLT', color: '#84cc16', secondaryColor: '#bef264', scale: 1.0 },
};
