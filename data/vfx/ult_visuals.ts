
// =========================================================================================
// 🌟 ULTIMATE VISUAL CONFIGURATION
// 
// Defines the visual archetype for every Ultimate skill.
// The UltArchitect reads this to determine how to spawn particles.
// =========================================================================================

export type UltArchetype = 
    | 'HEAVEN_FALL'   // Object falls from sky -> Impact (Meteor, Nuke)
    | 'SANCTUARY'     // Ring of pillars/beams around center
    | 'DOMAIN'        // Giant sphere/zone covering area
    | 'BEAM_SNIPE'    // Line from source to target (Railgun)
    | 'STORM'         // Random particles in area (Starfall, Rain)
    | 'INSTANT_IMPACT'; // Immediate massive hit

export interface UltVisualDef {
    archetype: UltArchetype;
    primaryColor: string;   // Main theme color
    secondaryColor: string; // Highlights/Core
    scale: number;          // Size multiplier (default 1.0)
    
    // Optional params specific to archetypes
    timing?: number;        // Delay or Duration
    count?: number;         // For Storm/Sanctuary (number of beams/drops)
    height?: number;        // Fall height
    vfxOverride?: string;   // Specific particle ID to use (if generic isn't enough)
}

export const ULT_VISUALS: Record<string, UltVisualDef> = {
    // ================= IMPEIRAL (BLUE) =================
    
    // TANK
    'tb_u1': { archetype: 'SANCTUARY', primaryColor: '#fbbf24', secondaryColor: '#3b82f6', scale: 1.0, count: 6 }, // Sanctuary
    'tb_u2': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 1.5, vfxOverride: 'FX_IMPACT_HOLY' }, // Kings Blessing
    'tb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.5, height: 800, vfxOverride: 'GIANT_HEX' }, // Aegis
    'tb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#b45309', scale: 1.2 }, // Titan
    'tb_u5': { archetype: 'DOMAIN', primaryColor: '#60a5fa', secondaryColor: '#fff', scale: 1.0 }, // Final Defense

    // WARRIOR
    'wb_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#3b82f6', secondaryColor: '#22d3ee', scale: 1.2, vfxOverride: 'FX_IMPACT_LIGHTNING' }, // Thunder
    'wb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#fffbeb', secondaryColor: '#f59e0b', scale: 1.5, height: 100, timing: 1.0 }, // Daybreak (Rising Sun)
    'wb_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#facc15', secondaryColor: '#eab308', scale: 1.5 }, // Excalibur
    'wb_u4': { archetype: 'STORM', primaryColor: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.0, count: 12, timing: 0.1 }, // Bladestorm
    'wb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#e0f2fe', secondaryColor: '#fff', scale: 2.0 }, // Lightspeed

    // RANGER
    'rb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#bae6fd', scale: 1.2, height: 1200, vfxOverride: 'SHARD' }, // Crystal Arrow
    'rb_u2': { archetype: 'STORM', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 1.0, count: 8 }, // Starfall
    'rb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#22d3ee', secondaryColor: '#06b6d4', scale: 1.0, height: 2000, timing: 0.1 }, // Orbital (Fast beam)
    'rb_u4': { archetype: 'DOMAIN', primaryColor: '#8b5cf6', secondaryColor: '#7c3aed', scale: 1.2, vfxOverride: 'GRID_FIELD' }, // Lockdown
    'rb_u5': { archetype: 'STORM', primaryColor: '#fff', secondaryColor: '#60a5fa', scale: 0.5, count: 20 }, // Overload

    // MAGE
    'mb_u1': { archetype: 'DOMAIN', primaryColor: '#000000', secondaryColor: '#8b5cf6', scale: 1.5, vfxOverride: 'GIANT_HEX' }, // Black Hole
    'mb_u2': { archetype: 'DOMAIN', primaryColor: '#bfdbfe', secondaryColor: '#3b82f6', scale: 1.2, vfxOverride: 'GRID_FIELD' }, // Frostfall
    'mb_u3': { archetype: 'DOMAIN', primaryColor: '#fef08a', secondaryColor: '#fcd34d', scale: 2.0 }, // Time Stop
    'mb_u4': { archetype: 'STORM', primaryColor: '#a855f7', secondaryColor: '#d8b4fe', scale: 1.0, count: 15 }, // Arcane Torrent
    'mb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.0 }, // Focus Beam

    // SUPPORT
    'sb_u1': { archetype: 'SANCTUARY', primaryColor: '#fef3c7', secondaryColor: '#fbbf24', scale: 1.2, count: 1 }, // Intervention (One big pillar)
    'sb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#86efac', secondaryColor: '#fff', scale: 1.0, height: 1500, timing: 0.5 }, // Resurrection
    'sb_u3': { archetype: 'STORM', primaryColor: '#3b82f6', secondaryColor: '#fff', scale: 0.8, count: 10 }, // Hymn
    'sb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#f59e0b', scale: 1.2 }, // Wrath
    'sb_u5': { archetype: 'STORM', primaryColor: '#86efac', secondaryColor: '#dcfce7', scale: 1.0, count: 30, vfxOverride: 'BEAM' }, // Rain

    // ================= COVENANT (RED) =================

    // TANK
    'tr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.2, height: 1200, vfxOverride: 'GIANT_HEX' }, // Guillotine
    'tr_u2': { archetype: 'DOMAIN', primaryColor: '#3f6212', secondaryColor: '#a3e635', scale: 1.5, vfxOverride: 'GRID_FIELD' }, // Undead Army
    'tr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#000', scale: 1.5, vfxOverride: 'SHOCKWAVE' }, // Blood Embrace
    'tr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#16a34a', secondaryColor: '#000', scale: 1.2, vfxOverride: 'GLOW' }, // Undying
    'tr_u5': { archetype: 'STORM', primaryColor: '#3f6212', secondaryColor: '#bef264', scale: 1.0, count: 15 }, // Rot

    // WARRIOR
    'wr_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#ea580c', secondaryColor: '#7f1d1d', scale: 2.0, vfxOverride: 'GRID_FIELD' }, // Ragnarok
    'wr_u2': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#991b1b', scale: 1.2, count: 25 }, // Blood Storm
    'wr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#000', secondaryColor: '#7f1d1d', scale: 1.5 }, // Demon
    'wr_u4': { archetype: 'STORM', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.0, count: 12, vfxOverride: 'SHARD' }, // Unlimited
    'wr_u5': { archetype: 'INSTANT_IMPACT', primaryColor: '#000', secondaryColor: '#450a0a', scale: 1.5 }, // Devastate

    // RANGER
    'rr_u1': { archetype: 'BEAM_SNIPE', primaryColor: '#000', secondaryColor: '#ef4444', scale: 2.0 }, // Railgun
    'rr_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#ef4444', secondaryColor: '#f97316', scale: 2.0, height: 2000, vfxOverride: 'BLAST' }, // Nuke
    'rr_u3': { archetype: 'STORM', primaryColor: '#f87171', secondaryColor: '#fff', scale: 1.0, count: 30, vfxOverride: 'BEAM' }, // Bullet Time
    'rr_u4': { archetype: 'STORM', primaryColor: '#ea580c', secondaryColor: '#fcd34d', scale: 1.0, count: 15, vfxOverride: 'SPARK' }, // Inferno
    'rr_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.0 }, // Headhunter

    // MAGE
    'mr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#f97316', secondaryColor: '#7c2d12', scale: 1.8, height: 1500, vfxOverride: 'FIREBALL' }, // Meteor
    'mr_u2': { archetype: 'BEAM_SNIPE', primaryColor: '#dc2626', secondaryColor: '#000', scale: 1.5 }, // Death Finger
    'mr_u3': { archetype: 'STORM', primaryColor: '#22c55e', secondaryColor: '#16a34a', scale: 1.0, count: 12 }, // Chaos Rain
    'mr_u4': { archetype: 'DOMAIN', primaryColor: '#581c87', secondaryColor: '#000', scale: 1.5, vfxOverride: 'GIANT_HEX' }, // Void Portal
    'mr_u5': { archetype: 'STORM', primaryColor: '#9333ea', secondaryColor: '#d8b4fe', scale: 1.0, count: 20 }, // Soul Burn

    // SUPPORT
    'sr_u1': { archetype: 'SANCTUARY', primaryColor: '#581c87', secondaryColor: '#a855f7', scale: 1.2, count: 8 }, // Soul Link
    'sr_u2': { archetype: 'DOMAIN', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.5 }, // Ancestors
    'sr_u3': { archetype: 'STORM', primaryColor: '#84cc16', secondaryColor: '#bef264', scale: 1.0, count: 10 }, // Voodoo
    'sr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#dc2626', secondaryColor: '#f87171', scale: 1.5 }, // Blood Pact
    'sr_u5': { archetype: 'DOMAIN', primaryColor: '#4c1d95', secondaryColor: '#a78bfa', scale: 1.5 }, // Nightmare
};
