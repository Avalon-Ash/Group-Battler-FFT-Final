
// =========================================================================================
// 🌟 ULTIMATE VISUAL CONFIGURATION (v8.1 Complete)
// 
// Defines the visual archetype for every Ultimate skill (IDs u1-u5).
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
    // ================= IMPERIAL (BLUE - Order/Tech/Holy) =================
    
    // TANK (Paladin/Mech)
    'tb_u1': { archetype: 'SANCTUARY', primaryColor: '#fbbf24', secondaryColor: '#3b82f6', scale: 1.0, count: 6 }, // 聖域
    // FIXED: Changed FX_IMPACT_HOLY (Invalid) to FX_HIT_BLUE_HOLY
    'tb_u2': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 1.5, vfxOverride: 'FX_HIT_BLUE_HOLY' }, // 王者
    'tb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.5, height: 800, vfxOverride: 'GIANT_HEX' }, // 神盾
    'tb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#b45309', scale: 1.2 }, // 泰坦
    'tb_u5': { archetype: 'DOMAIN', primaryColor: '#60a5fa', secondaryColor: '#fff', scale: 1.0 }, // 防線

    // WARRIOR (Thunder/Blade)
    'wb_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#3b82f6', secondaryColor: '#22d3ee', scale: 1.2, vfxOverride: 'FX_ULT_BLUE_THUNDER_SLAM' }, // 雷霆
    'wb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#fffbeb', secondaryColor: '#f59e0b', scale: 1.5, height: 100, timing: 1.0 }, // 破曉
    'wb_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#facc15', secondaryColor: '#eab308', scale: 1.5 }, // 王劍
    'wb_u4': { archetype: 'STORM', primaryColor: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.0, count: 12, timing: 0.1 }, // 劍刃
    'wb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#e0f2fe', secondaryColor: '#fff', scale: 2.0 }, // 光速

    // RANGER (Ice/Sniper)
    'rb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#bae6fd', scale: 1.2, height: 1200, vfxOverride: 'SHARD' }, // 冰河
    'rb_u2': { archetype: 'STORM', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 1.0, count: 8 }, // 星隕
    'rb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#22d3ee', secondaryColor: '#06b6d4', scale: 1.0, height: 2000, timing: 0.1, vfxOverride: 'FX_ULT_BLUE_ORBITAL_BEAM' }, // 軌道
    'rb_u4': { archetype: 'DOMAIN', primaryColor: '#8b5cf6', secondaryColor: '#7c3aed', scale: 1.2, vfxOverride: 'GRID_FIELD' }, // 封鎖
    'rb_u5': { archetype: 'STORM', primaryColor: '#fff', secondaryColor: '#60a5fa', scale: 0.5, count: 20 }, // 超載

    // MAGE (Arcane/Gravity)
    'mb_u1': { archetype: 'DOMAIN', primaryColor: '#000000', secondaryColor: '#8b5cf6', scale: 1.5, vfxOverride: 'GIANT_HEX' }, // 黑洞
    'mb_u2': { archetype: 'DOMAIN', primaryColor: '#bfdbfe', secondaryColor: '#3b82f6', scale: 1.2, vfxOverride: 'FX_ULT_BLUE_GLACIAL_BURST' }, // 零度
    'mb_u3': { archetype: 'DOMAIN', primaryColor: '#fef08a', secondaryColor: '#fcd34d', scale: 2.0 }, // 時停
    'mb_u4': { archetype: 'STORM', primaryColor: '#a855f7', secondaryColor: '#d8b4fe', scale: 1.0, count: 15 }, // 洪流
    'mb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.0 }, // 聚焦

    // SUPPORT (Heal/Buff)
    'sb_u1': { archetype: 'SANCTUARY', primaryColor: '#fef3c7', secondaryColor: '#fbbf24', scale: 1.2, count: 1 }, // 干涉
    'sb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#86efac', secondaryColor: '#fff', scale: 1.0, height: 1500, timing: 0.5, vfxOverride: 'FX_ULT_BLUE_RESURRECTION' }, // 復活
    'sb_u3': { archetype: 'STORM', primaryColor: '#3b82f6', secondaryColor: '#fff', scale: 0.8, count: 10 }, // 讚美
    'sb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#f59e0b', scale: 1.2 }, // 天譴
    'sb_u5': { archetype: 'STORM', primaryColor: '#86efac', secondaryColor: '#dcfce7', scale: 1.0, count: 30, vfxOverride: 'BEAM' }, // 恩雨

    // ================= COVENANT (RED - Chaos/Blood/Fire) =================

    // TANK (Blood/Undead)
    'tr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.2, height: 1200, vfxOverride: 'SHARD' }, // 斷頭 (Updated to SHARD to match script)
    'tr_u2': { archetype: 'DOMAIN', primaryColor: '#3f6212', secondaryColor: '#a3e635', scale: 1.5, vfxOverride: 'GRID_FIELD' }, // 瘟疫
    'tr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#000', scale: 1.5, vfxOverride: 'SHOCKWAVE' }, // 不朽
    'tr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#581c87', secondaryColor: '#000', scale: 1.2, vfxOverride: 'GLOW' }, // 夢魘
    'tr_u5': { archetype: 'STORM', primaryColor: '#991b1b', secondaryColor: '#ef4444', scale: 1.0, count: 15 }, // 血牆

    // WARRIOR (Rage/Fire)
    'wr_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#ea580c', secondaryColor: '#7f1d1d', scale: 2.0, vfxOverride: 'FX_ULT_RED_RAGNAROK_ERUPTION' }, // 諸神
    'wr_u2': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#991b1b', scale: 1.2, count: 25 }, // 血風
    'wr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#000', secondaryColor: '#7f1d1d', scale: 1.5 }, // 狂戰
    'wr_u4': { archetype: 'STORM', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.0, count: 12, vfxOverride: 'SHARD' }, // 惡魔
    'wr_u5': { archetype: 'INSTANT_IMPACT', primaryColor: '#450a0a', secondaryColor: '#000', scale: 1.5 }, // 碎地

    // RANGER (Explosive/Dark)
    'rr_u1': { archetype: 'BEAM_SNIPE', primaryColor: '#000', secondaryColor: '#ef4444', scale: 2.0 }, // 毀滅
    'rr_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#ef4444', secondaryColor: '#f97316', scale: 2.0, height: 2000, vfxOverride: 'FX_ULT_RED_NUKE_FLASH' }, // 核彈 (Updated to Flash key)
    'rr_u3': { archetype: 'STORM', primaryColor: '#f87171', secondaryColor: '#fff', scale: 1.0, count: 30, vfxOverride: 'BEAM' }, // 煉獄
    'rr_u4': { archetype: 'STORM', primaryColor: '#ea580c', secondaryColor: '#fcd34d', scale: 1.0, count: 15, vfxOverride: 'SPARK' }, // 獵頭
    'rr_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.0 }, // 末日

    // MAGE (Fel/Void)
    'mr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#f97316', secondaryColor: '#7c2d12', scale: 1.8, height: 1500, vfxOverride: 'FX_ULT_RED_METEOR_IMPACT' }, // 隕石
    'mr_u2': { archetype: 'BEAM_SNIPE', primaryColor: '#dc2626', secondaryColor: '#000', scale: 1.5 }, // 死指
    'mr_u3': { archetype: 'STORM', primaryColor: '#22c55e', secondaryColor: '#16a34a', scale: 1.0, count: 12 }, // 虛空
    'mr_u4': { archetype: 'DOMAIN', primaryColor: '#a3e635', secondaryColor: '#000', scale: 1.5, vfxOverride: 'GIANT_HEX' }, // 末世
    'mr_u5': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#fca5a5', scale: 1.0, count: 20 }, // 爆燃

    // SUPPORT (Blood/Curse)
    'sr_u1': { archetype: 'SANCTUARY', primaryColor: '#581c87', secondaryColor: '#a855f7', scale: 1.2, count: 8 }, // 連結
    'sr_u2': { archetype: 'DOMAIN', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.5 }, // 血契
    'sr_u3': { archetype: 'STORM', primaryColor: '#4c1d95', secondaryColor: '#a78bfa', scale: 1.0, count: 10 }, // 恐慌
    'sr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#991b1b', scale: 1.5 }, // 血月
    'sr_u5': { archetype: 'DOMAIN', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.5 }, // 附身
};
