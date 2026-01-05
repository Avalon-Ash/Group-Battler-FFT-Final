
// =========================================================================================
// 🌟 ULTIMATE VISUAL CONFIGURATION (v9.0 Fully Detailed)
// 
// Defines the visual archetype for every Ultimate skill (IDs u1-u5).
// Each entry is uniquely tuned for color, scale, and FX type.
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
    
    // --- TANK (Paladin/Mech) ---
    // tb_u1: 聖光結界 (Stun) - Golden Sanctuary
    'tb_u1': { archetype: 'SANCTUARY', primaryColor: '#fbbf24', secondaryColor: '#fff', scale: 1.2, count: 6, vfxOverride: 'PILLAR_HOLY' },
    // tb_u2: 王者之風 (Buff) - Massive Shockwave
    'tb_u2': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#fffbeb', scale: 1.8, vfxOverride: 'FX_ULT_BLUE_KINGS_BLESSING' },
    // tb_u3: 絕對防禦 (Shield) - Falling Monolith
    'tb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.5, height: 1000, vfxOverride: 'GIANT_HEX' },
    // tb_u4: 泰坦降臨 (Smash) - Earth Shatter
    'tb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#d97706', secondaryColor: '#fcd34d', scale: 1.4, vfxOverride: 'FX_ULT_BLUE_TITAN_SMASH' },
    // tb_u5: 鋼鐵長城 (Shield) - Tech Grid Dome
    'tb_u5': { archetype: 'DOMAIN', primaryColor: '#60a5fa', secondaryColor: '#93c5fd', scale: 1.2, vfxOverride: 'DOMAIN_SHIELD' },

    // --- WARRIOR (Thunder/Blade) ---
    // wb_u1: 雷霆之怒 (Stun) - Lightning Strike
    'wb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#3b82f6', secondaryColor: '#22d3ee', scale: 1.3, height: 1500, vfxOverride: 'FX_ULT_BLUE_THUNDER_SLAM' },
    // wb_u2: 破曉聖擊 (AOE) - Light Bomb
    'wb_u2': { archetype: 'INSTANT_IMPACT', primaryColor: '#fef3c7', secondaryColor: '#f59e0b', scale: 1.6, vfxOverride: 'FX_HIT_BLUE_HOLY' },
    // wb_u3: 誓約勝利 (Exec) - Giant Slash
    'wb_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#facc15', secondaryColor: '#eab308', scale: 2.0, vfxOverride: 'FX_ULT_BLUE_EXCALIBUR' },
    // wb_u4: 劍刃風暴 (AOE) - Blue Tornado
    'wb_u4': { archetype: 'STORM', primaryColor: '#60a5fa', secondaryColor: '#bae6fd', scale: 1.0, count: 16, timing: 0.05, vfxOverride: 'SLASH' },
    // wb_u5: 光速斬擊 (Blink) - Flash Step
    'wb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#e0f2fe', secondaryColor: '#fff', scale: 2.5, vfxOverride: 'SLASH_CONNECT' },

    // --- RANGER (Ice/Sniper) ---
    // rb_u1: 極地冰河 (Freeze) - Ice Meteor
    'rb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#bae6fd', secondaryColor: '#fff', scale: 1.4, height: 1200, vfxOverride: 'SHARD' },
    // rb_u2: 星辰墜落 (Storm) - Starfall
    'rb_u2': { archetype: 'STORM', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 0.8, count: 12, timing: 0.1, vfxOverride: 'SPARK' },
    // rb_u3: 軌道轟炸 (Nuke) - Ion Cannon
    'rb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#06b6d4', secondaryColor: '#22d3ee', scale: 1.5, height: 2500, timing: 0.1, vfxOverride: 'FX_ULT_BLUE_ORBITAL_BEAM' },
    // rb_u4: 絕對封鎖 (Root) - Tech Cage
    'rb_u4': { archetype: 'DOMAIN', primaryColor: '#7c3aed', secondaryColor: '#8b5cf6', scale: 1.3, vfxOverride: 'GRID_TECH_BLUE' },
    // rb_u5: 系統超載 (Self) - Electric Overload
    'rb_u5': { archetype: 'STORM', primaryColor: '#fff', secondaryColor: '#38bdf8', scale: 0.6, count: 30, timing: 0.05, vfxOverride: 'SPARK' },

    // --- MAGE (Arcane/Gravity) ---
    // mb_u1: 事件視界 (Pull) - Black Hole
    'mb_u1': { archetype: 'DOMAIN', primaryColor: '#000', secondaryColor: '#8b5cf6', scale: 1.8, vfxOverride: 'FX_ULT_BLUE_BLACKHOLE' },
    // mb_u2: 絕對零度 (Freeze) - Ice Field
    'mb_u2': { archetype: 'DOMAIN', primaryColor: '#bfdbfe', secondaryColor: '#3b82f6', scale: 1.5, vfxOverride: 'FX_ULT_BLUE_GLACIAL_BURST' },
    // mb_u3: 時間停止 (Stop) - Clock Domain
    'mb_u3': { archetype: 'DOMAIN', primaryColor: '#fef08a', secondaryColor: '#fcd34d', scale: 2.2, vfxOverride: 'MAGIC_CIRCLE' },
    // mb_u4: 奧術洪流 (Dmg) - Missiles
    'mb_u4': { archetype: 'STORM', primaryColor: '#a855f7', secondaryColor: '#d8b4fe', scale: 1.0, count: 20, vfxOverride: 'PROJ_BLUE_ORB' },
    // mb_u5: 聚能光束 (Laser) - Kamehameha
    'mb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 3.0, vfxOverride: 'DEATH_RAY' },

    // --- SUPPORT (Heal/Buff) ---
    // sb_u1: 神聖干涉 (Invul) - Divine Light
    'sb_u1': { archetype: 'SANCTUARY', primaryColor: '#fef3c7', secondaryColor: '#fbbf24', scale: 1.5, count: 4, vfxOverride: 'PILLAR_HOLY' },
    // sb_u2: 復活之光 (Res) - Mass Resurrection
    'sb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#86efac', secondaryColor: '#fff', scale: 1.2, height: 1500, timing: 0.5, vfxOverride: 'FX_ULT_BLUE_RESURRECTION' },
    // sb_u3: 英勇讚美 (Buff) - Hymn
    'sb_u3': { archetype: 'STORM', primaryColor: '#3b82f6', secondaryColor: '#fff', scale: 0.8, count: 15, vfxOverride: 'GLOW' },
    // sb_u4: 神之怒火 (Dmg) - Smite
    'sb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#f59e0b', scale: 1.3, vfxOverride: 'FX_ACTIVE_BLUE_HOLY_SMITE' },
    // sb_u5: 寧靜之雨 (HoT) - Rain
    'sb_u5': { archetype: 'STORM', primaryColor: '#86efac', secondaryColor: '#dcfce7', scale: 0.5, count: 40, timing: 0.05, vfxOverride: 'BEAM' },

    // ================= COVENANT (RED - Chaos/Blood/Fire) =================

    // --- TANK (Blood/Undead) ---
    // tr_u1: 處決斷頭台 (Exec) - Guillotine
    'tr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.3, height: 1000, vfxOverride: 'FX_ULT_RED_GUILLOTINE_IMPACT' },
    // tr_u2: 亡靈瘟疫 (DoT) - Toxic Cloud
    'tr_u2': { archetype: 'DOMAIN', primaryColor: '#3f6212', secondaryColor: '#a3e635', scale: 1.6, vfxOverride: 'GRID_RED_POISON' },
    // tr_u3: 不朽屍王 (Shield) - Blood Armor
    'tr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#000', scale: 1.5, vfxOverride: 'SHOCKWAVE' },
    // tr_u4: 永恆夢魘 (Fear) - Darkness
    'tr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#581c87', secondaryColor: '#000', scale: 2.0, vfxOverride: 'FX_ACTIVE_RED_SHADOW_SCREAM' },
    // tr_u5: 鮮血之牆 (Shield) - Blood Wall
    'tr_u5': { archetype: 'STORM', primaryColor: '#991b1b', secondaryColor: '#ef4444', scale: 1.0, count: 8, vfxOverride: 'PILLAR_VOID' },

    // --- WARRIOR (Rage/Fire) ---
    // wr_u1: 諸神黃昏 (Dmg) - Eruption
    'wr_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#ea580c', secondaryColor: '#7f1d1d', scale: 2.5, vfxOverride: 'FX_ULT_RED_RAGNAROK_ERUPTION' },
    // wr_u2: 血腥旋風 (AOE) - Blood Spin
    'wr_u2': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#991b1b', scale: 1.2, count: 30, vfxOverride: 'SLASH' },
    // wr_u3: 惡魔降臨 (Buff) - Transformation
    'wr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#000', secondaryColor: '#7f1d1d', scale: 1.5, vfxOverride: 'FX_ACTIVE_RED_BLOOD_RAGE' },
    // wr_u4: 無限劍制 (Fear) - Blade Field
    'wr_u4': { archetype: 'STORM', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.0, count: 20, vfxOverride: 'PROJ_RED_AXE' },
    // wr_u5: 毀滅重擊 (KB) - Earth Breaker
    'wr_u5': { archetype: 'INSTANT_IMPACT', primaryColor: '#450a0a', secondaryColor: '#000', scale: 1.8, vfxOverride: 'FX_ACTIVE_RED_WAR_STOMP' },

    // --- RANGER (Explosive/Dark) ---
    // rr_u1: 終極爆破 (Exec) - Railgun
    'rr_u1': { archetype: 'BEAM_SNIPE', primaryColor: '#000', secondaryColor: '#ef4444', scale: 3.0, vfxOverride: 'DEATH_RAY' },
    // rr_u2: 戰術核彈 (Nuke) - Mushroom Cloud
    'rr_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#ef4444', secondaryColor: '#f97316', scale: 2.5, height: 2500, vfxOverride: 'FX_ULT_RED_NUKE_FLASH' },
    // rr_u3: 煉獄火雨 (Fire) - Firestorm
    'rr_u3': { archetype: 'STORM', primaryColor: '#f87171', secondaryColor: '#fff', scale: 1.0, count: 40, timing: 0.05, vfxOverride: 'PROJ_RED_CHAOS_ORB' },
    // rr_u4: 血腥獵殺 (Snipe) - Headhunter
    'rr_u4': { archetype: 'STORM', primaryColor: '#ea580c', secondaryColor: '#fcd34d', scale: 1.0, count: 15, vfxOverride: 'SPARK' },
    // rr_u5: 末日審判 (Fear) - Doom
    'rr_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.5, vfxOverride: 'BEAM_RED_DRAIN' },

    // --- MAGE (Fel/Void) ---
    // mr_u1: 毀滅隕石 (Stun) - Meteor
    'mr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#f97316', secondaryColor: '#7c2d12', scale: 2.0, height: 1500, vfxOverride: 'FX_ULT_RED_METEOR_IMPACT' },
    // mr_u2: 死亡一指 (Exec) - Finger of Death
    'mr_u2': { archetype: 'BEAM_SNIPE', primaryColor: '#dc2626', secondaryColor: '#000', scale: 2.0, vfxOverride: 'DEATH_RAY' },
    // mr_u3: 虛空降臨 (Portal) - Void Gate
    'mr_u3': { archetype: 'DOMAIN', primaryColor: '#22c55e', secondaryColor: '#16a34a', scale: 1.8, vfxOverride: 'PILLAR_VOID' },
    // mr_u4: 末世毒雨 (DoT) - Fel Rain
    'mr_u4': { archetype: 'DOMAIN', primaryColor: '#a3e635', secondaryColor: '#000', scale: 1.5, vfxOverride: 'GRID_RED_POISON' },
    // mr_u5: 靈魂爆燃 (Chain) - Soul Burn
    'mr_u5': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#fca5a5', scale: 1.2, count: 25, vfxOverride: 'FX_HIT_RED_FEL' },

    // --- SUPPORT (Blood/Curse) ---
    // sr_u1: 靈魂連結 (Root) - Soul Link
    'sr_u1': { archetype: 'SANCTUARY', primaryColor: '#581c87', secondaryColor: '#a855f7', scale: 1.2, count: 8, vfxOverride: 'BEAM_RED_LINK' },
    // sr_u2: 鮮血契約 (Heal) - Blood Pact
    'sr_u2': { archetype: 'DOMAIN', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.5, vfxOverride: 'GRID_BLOOD' },
    // sr_u3: 群體恐慌 (Fear) - Mass Fear
    'sr_u3': { archetype: 'STORM', primaryColor: '#4c1d95', secondaryColor: '#a78bfa', scale: 1.0, count: 12, vfxOverride: 'FX_STATUS_FEAR_LOOP' },
    // sr_u4: 猩紅血月 (Buff) - Blood Moon
    'sr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#991b1b', scale: 2.0, vfxOverride: 'FX_HIT_RED_BLOOD' },
    // sr_u5: 惡靈附身 (Shield) - Possession
    'sr_u5': { archetype: 'DOMAIN', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.5, vfxOverride: 'FX_HIT_RED_SHADOW' },
};
