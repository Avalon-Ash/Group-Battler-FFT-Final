

// =========================================================================================
// ⚡ ACTIVE SKILL VISUAL CONFIGURATION (v1.0)
// Defines unique visual archetypes for 50 Active Skills (IDs a1-a5)
// =========================================================================================

export type ActiveArchetype = 
    | 'BURST_AOE'       // Instant explosion (Magic/Tech)
    | 'PROJECTILE_SALVO'// Multiple small projectiles
    | 'DASH_ASSAULT'    // Fast trail + Impact
    | 'BUFF_AURA'       // Upward flowing particles on self
    | 'DEBUFF_RAY'      // Dark cloud/beam on target
    | 'GROUND_SLAM'     // Physical debris shockwave
    | 'SIMPLE_IMPACT'   // Standard hit
    | 'TRAP'            // Placement of trap object
    | 'WALL';           // Creation of barrier

export interface ActiveVisualDef {
    archetype: ActiveArchetype;
    color: string;
    secondaryColor: string;
    scale?: number;
    vfxOverride?: string;
    duration?: number;
    count?: number;
}

export const ACTIVE_VISUALS: Record<string, ActiveVisualDef> = {
    // ================= IMPERIAL (BLUE) =================

    // --- TANK ---
    'tb_a1': { archetype: 'BUFF_AURA', color: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.2, vfxOverride: 'FX_ACTIVE_BLUE_TECH_SHIELD' },
    'tb_a2': { archetype: 'SIMPLE_IMPACT', color: '#fcd34d', secondaryColor: '#fff', scale: 1.3, vfxOverride: 'FX_ACTIVE_BLUE_HOLY_SMITE' },
    'tb_a3': { archetype: 'GROUND_SLAM', color: '#1e3a8a', secondaryColor: '#3b82f6', scale: 1.2, vfxOverride: 'FX_GRID_IMPACT_BLUE' },
    'tb_a4': { archetype: 'DEBUFF_RAY', color: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.0, vfxOverride: 'DRAIN_LINK' },
    'tb_a5': { archetype: 'BUFF_AURA', color: '#ffffff', secondaryColor: '#e0f2fe', scale: 1.0, vfxOverride: 'FX_HIT_BLUE_TECH' },

    // --- WARRIOR ---
    'wb_a1': { archetype: 'BURST_AOE', color: '#60a5fa', secondaryColor: '#bae6fd', scale: 1.3, vfxOverride: 'FX_ACTIVE_BLUE_TECH_BURST' },
    'wb_a2': { archetype: 'DASH_ASSAULT', color: '#e0f2fe', secondaryColor: '#fff', scale: 1.5, vfxOverride: 'SLASH_CONNECT' },
    'wb_a3': { archetype: 'BURST_AOE', color: '#3b82f6', secondaryColor: '#60a5fa', scale: 1.2, vfxOverride: 'FX_ACTIVE_BLUE_TECH_BURST' },
    'wb_a4': { archetype: 'SIMPLE_IMPACT', color: '#f59e0b', secondaryColor: '#fcd34d', scale: 1.4, vfxOverride: 'FX_ACTIVE_BLUE_HOLY_SMITE' },
    'wb_a5': { archetype: 'SIMPLE_IMPACT', color: '#93c5fd', secondaryColor: '#fff', scale: 1.2, vfxOverride: 'FX_HIT_BLUE_PHYSICAL' },

    // --- RANGER ---
    'rb_a1': { archetype: 'BURST_AOE', color: '#bae6fd', secondaryColor: '#fff', scale: 1.2, vfxOverride: 'FX_ACTIVE_BLUE_FROST_SNAP' },
    'rb_a2': { archetype: 'PROJECTILE_SALVO', color: '#38bdf8', secondaryColor: '#0ea5e9', scale: 1.0, count: 1, vfxOverride: 'PROJ_BLUE_SNIPER' },
    'rb_a3': { archetype: 'DASH_ASSAULT', color: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.2, vfxOverride: 'PROJ_BLUE_SNIPER' },
    'rb_a4': { archetype: 'TRAP', color: '#bfdbfe', secondaryColor: '#60a5fa', scale: 1.0, vfxOverride: 'FX_ACTIVE_BLUE_FROST_SNAP' },
    'rb_a5': { archetype: 'PROJECTILE_SALVO', color: '#93c5fd', secondaryColor: '#fff', scale: 0.8, count: 5, vfxOverride: 'PROJ_BLUE_SNIPER' },

    // --- MAGE ---
    'mb_a1': { archetype: 'BURST_AOE', color: '#a855f7', secondaryColor: '#d8b4fe', scale: 1.4, vfxOverride: 'FX_ACTIVE_BLUE_ARCANE_RIPPLE' },
    'mb_a2': { archetype: 'DEBUFF_RAY', color: '#e0f2fe', secondaryColor: '#38bdf8', scale: 1.0, vfxOverride: 'FX_ACTIVE_BLUE_FROST_SNAP' },
    'mb_a3': { archetype: 'BUFF_AURA', color: '#8b5cf6', secondaryColor: '#c084fc', scale: 1.2, vfxOverride: 'FX_TELEPORT' },
    'mb_a4': { archetype: 'PROJECTILE_SALVO', color: '#bae6fd', secondaryColor: '#e0f2fe', scale: 1.0, count: 3, vfxOverride: 'PROJ_BLUE_FROST_BOLT' },
    'mb_a5': { archetype: 'WALL', color: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.5, vfxOverride: 'FX_GRID_IMPACT_BLUE' },

    // --- SUPPORT ---
    'sb_a1': { archetype: 'BUFF_AURA', color: '#86efac', secondaryColor: '#dcfce7', scale: 1.2, vfxOverride: 'FX_ACTIVE_BLUE_HOLY_SMITE' },
    'sb_a2': { archetype: 'BUFF_AURA', color: '#ffffff', secondaryColor: '#e0f2fe', scale: 1.3, vfxOverride: 'FX_ACTIVE_BLUE_TECH_SHIELD' },
    'sb_a3': { archetype: 'BUFF_AURA', color: '#fde047', secondaryColor: '#fef3c7', scale: 1.0, vfxOverride: 'FX_HIT_BLUE_HOLY' },
    'sb_a4': { archetype: 'BURST_AOE', color: '#a7f3d0', secondaryColor: '#6ee7b7', scale: 1.5, vfxOverride: 'FX_HIT_BLUE_HOLY' },
    'sb_a5': { archetype: 'BUFF_AURA', color: '#bae6fd', secondaryColor: '#60a5fa', scale: 1.2, vfxOverride: 'FX_ACTIVE_BLUE_TECH_BURST' },


    // ================= COVENANT (RED) =================

    // --- TANK ---
    'tr_a1': { archetype: 'DEBUFF_RAY', color: '#7f1d1d', secondaryColor: '#991b1b', scale: 1.2, vfxOverride: 'BEAM_RED_LINK' },
    'tr_a2': { archetype: 'BURST_AOE', color: '#7c3aed', secondaryColor: '#5b21b6', scale: 1.4, vfxOverride: 'FX_ACTIVE_RED_SHADOW_SCREAM' },
    'tr_a3': { archetype: 'GROUND_SLAM', color: '#450a0a', secondaryColor: '#7f1d1d', scale: 1.3, vfxOverride: 'FX_ACTIVE_RED_WAR_STOMP' },
    'tr_a4': { archetype: 'BUFF_AURA', color: '#ef4444', secondaryColor: '#991b1b', scale: 1.2, vfxOverride: 'FX_HIT_RED_BLOOD' },
    'tr_a5': { archetype: 'DEBUFF_RAY', color: '#be123c', secondaryColor: '#e11d48', scale: 1.0, vfxOverride: 'FX_ACTIVE_RED_BLOOD_RAGE' },

    // --- WARRIOR ---
    'wr_a1': { archetype: 'BURST_AOE', color: '#ef4444', secondaryColor: '#991b1b', scale: 1.3, vfxOverride: 'FX_HIT_RED_HEAVY' },
    'wr_a2': { archetype: 'SIMPLE_IMPACT', color: '#450a0a', secondaryColor: '#000', scale: 1.2, vfxOverride: 'FX_HIT_RED_BLOOD' },
    'wr_a3': { archetype: 'GROUND_SLAM', color: '#b91c1c', secondaryColor: '#7f1d1d', scale: 1.4, vfxOverride: 'FX_ACTIVE_RED_WAR_STOMP' },
    'wr_a4': { archetype: 'SIMPLE_IMPACT', color: '#7f1d1d', secondaryColor: '#991b1b', scale: 1.5, vfxOverride: 'FX_HIT_RED_BLOOD' },
    'wr_a5': { archetype: 'BUFF_AURA', color: '#ef4444', secondaryColor: '#fca5a5', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_BLOOD_RAGE' },

    // --- RANGER ---
    'rr_a1': { archetype: 'BURST_AOE', color: '#f97316', secondaryColor: '#ea580c', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_MAGMA_ERUPTION' },
    'rr_a2': { archetype: 'SIMPLE_IMPACT', color: '#ea580c', secondaryColor: '#fb923c', scale: 1.2, vfxOverride: 'FX_HIT_RED_HEAVY' },
    'rr_a3': { archetype: 'DEBUFF_RAY', color: '#78350f', secondaryColor: '#451a03', scale: 1.0, vfxOverride: 'FX_HIT_RED_PHYSICAL' },
    'rr_a4': { archetype: 'PROJECTILE_SALVO', color: '#f87171', secondaryColor: '#ef4444', scale: 0.8, count: 5, vfxOverride: 'PROJ_RED_HEAVY_BOLT' },
    'rr_a5': { archetype: 'PROJECTILE_SALVO', color: '#000', secondaryColor: '#ef4444', scale: 1.2, count: 1, vfxOverride: 'PROJ_RED_HEAVY_BOLT' },

    // --- MAGE ---
    'mr_a1': { archetype: 'DEBUFF_RAY', color: '#a3e635', secondaryColor: '#65a30d', scale: 1.0, vfxOverride: 'FX_ACTIVE_RED_FEL_SPLASH' },
    'mr_a2': { archetype: 'BURST_AOE', color: '#581c87', secondaryColor: '#7c3aed', scale: 1.3, vfxOverride: 'FX_ACTIVE_RED_SHADOW_SCREAM' },
    'mr_a3': { archetype: 'BURST_AOE', color: '#ea580c', secondaryColor: '#c2410c', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_MAGMA_ERUPTION' },
    'mr_a4': { archetype: 'DEBUFF_RAY', color: '#7c3aed', secondaryColor: '#5b21b6', scale: 1.0, vfxOverride: 'FX_HIT_RED_SHADOW' },
    'mr_a5': { archetype: 'BUFF_AURA', color: '#be123c', secondaryColor: '#9f1239', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_BLOOD_RAGE' },

    // --- SUPPORT ---
    'sr_a1': { archetype: 'DEBUFF_RAY', color: '#be123c', secondaryColor: '#fb7185', scale: 1.0, vfxOverride: 'BEAM_RED_LINK' },
    'sr_a2': { archetype: 'BUFF_AURA', color: '#a3e635', secondaryColor: '#d9f99d', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_FEL_SPLASH' },
    'sr_a3': { archetype: 'BUFF_AURA', color: '#84cc16', secondaryColor: '#bef264', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_FEL_SPLASH' },
    'sr_a4': { archetype: 'BURST_AOE', color: '#581c87', secondaryColor: '#7c3aed', scale: 1.3, vfxOverride: 'FX_HIT_RED_SHADOW' },
    'sr_a5': { archetype: 'BUFF_AURA', color: '#991b1b', secondaryColor: '#ef4444', scale: 1.2, vfxOverride: 'FX_ACTIVE_RED_BLOOD_RAGE' },
};
