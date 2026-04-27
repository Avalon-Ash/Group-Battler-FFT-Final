
// =========================================================================================
// 🌟 ULTIMATE VISUAL CONFIGURATION (v10.0 HEXAGON PERFECTED)
// 
// "Based on Hexagons, Ending with Hexagons."
// All effects now utilize 2.5D Volumetric Hex Geometry.
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
    vfxOverride?: string;   // Specific particle ID to use
}

export const ULT_VISUALS: Record<string, UltVisualDef> = {
    // ================= IMPERIAL (BLUE - Order/Tech/Holy) =================
    
    // --- TANK (Paladin/Mech) ---
    // tb_u1: 聖光結界 -> 巨大的六邊形光牆聖域
    'tb_u1': { archetype: 'SANCTUARY', primaryColor: '#fbbf24', secondaryColor: '#fff', scale: 1.5, count: 6, vfxOverride: 'FX_ULT_BLUE_SANCTUARY_IMPACT' },
    // tb_u2: 王者之風 -> 全場六邊形脈衝
    'tb_u2': { archetype: 'DOMAIN', primaryColor: '#fcd34d', secondaryColor: '#fffbeb', scale: 2.5, vfxOverride: 'FX_ULT_BLUE_KINGS_BLESSING' },
    // tb_u3: 絕對防禦 -> 天降巨大六邊形光盾 (Monolith)
    'tb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 1.8, height: 1200, vfxOverride: 'FX_ULT_BLUE_AEGIS_IMPACT' },
    // tb_u4: 泰坦降臨 -> 六邊形地裂
    'tb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#d97706', secondaryColor: '#fcd34d', scale: 1.6, vfxOverride: 'FX_ULT_BLUE_TITAN_SMASH' },
    // tb_u5: 鋼鐵長城 -> 巨型全息網格
    'tb_u5': { archetype: 'DOMAIN', primaryColor: '#3b82f6', secondaryColor: '#93c5fd', scale: 1.5, vfxOverride: 'FX_ULT_BLUE_FINAL_DEFENSE' },

    // --- WARRIOR (Thunder/Blade) ---
    // wb_u1: 雷霆之怒 -> 天降雷霆六邊柱
    'wb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#3b82f6', secondaryColor: '#22d3ee', scale: 1.4, height: 1500, vfxOverride: 'FX_ULT_BLUE_THUNDER_SLAM' },
    // wb_u2: 破曉聖擊 -> 擴散的六邊形光爆
    'wb_u2': { archetype: 'INSTANT_IMPACT', primaryColor: '#fef3c7', secondaryColor: '#f59e0b', scale: 1.8, vfxOverride: 'FX_ULT_BLUE_DAYBREAK' },
    // wb_u3: 誓約勝利 -> 巨大光刃 (仍保留 Slash，但加上六邊形底座)
    'wb_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#facc15', secondaryColor: '#eab308', scale: 2.2, vfxOverride: 'FX_ULT_BLUE_EXCALIBUR' },
    // wb_u4: 劍刃風暴 -> 六邊形刀光風暴
    'wb_u4': { archetype: 'STORM', primaryColor: '#60a5fa', secondaryColor: '#bae6fd', scale: 1.2, count: 12, timing: 0.05, vfxOverride: 'FX_ULT_BLUE_BLADESTORM' },
    // wb_u5: 光速斬擊 -> 瞬移軌跡連線 (Beam)
    'wb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#e0f2fe', secondaryColor: '#fff', scale: 2.5, vfxOverride: 'FX_ULT_BLUE_LIGHTSPEED' },

    // --- RANGER (Ice/Sniper) ---
    // rb_u1: 極地冰河 -> 天降巨大冰晶六邊體
    'rb_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#bae6fd', secondaryColor: '#fff', scale: 1.6, height: 1200, vfxOverride: 'FX_ULT_BLUE_GLACIAL_BURST' },
    // rb_u2: 星辰墜落 -> 六邊形流星雨
    'rb_u2': { archetype: 'STORM', primaryColor: '#fcd34d', secondaryColor: '#fff', scale: 0.9, count: 10, timing: 0.1, vfxOverride: 'FX_ULT_BLUE_STARFALL' },
    // rb_u3: 軌道轟炸 -> 衛星離子砲 (垂直巨型六邊柱)
    'rb_u3': { archetype: 'HEAVEN_FALL', primaryColor: '#06b6d4', secondaryColor: '#22d3ee', scale: 1.8, height: 2500, timing: 0.1, vfxOverride: 'FX_ULT_BLUE_ORBITAL_BEAM' },
    // rb_u4: 絕對封鎖 -> 六邊形牢籠
    'rb_u4': { archetype: 'DOMAIN', primaryColor: '#7c3aed', secondaryColor: '#8b5cf6', scale: 1.4, vfxOverride: 'FX_ULT_BLUE_LOCKDOWN' },
    // rb_u5: 系統超載 -> 自身周圍的高頻六邊形火花
    'rb_u5': { archetype: 'STORM', primaryColor: '#fff', secondaryColor: '#38bdf8', scale: 0.7, count: 15, timing: 0.05, vfxOverride: 'FX_ULT_BLUE_OVERLOAD' },

    // --- MAGE (Arcane/Gravity) ---
    // mb_u1: 事件視界 -> 黑洞 (唯一保留球體特徵，但加上六邊形吸積盤)
    'mb_u1': { archetype: 'DOMAIN', primaryColor: '#000', secondaryColor: '#8b5cf6', scale: 2.0, vfxOverride: 'FX_ULT_BLUE_BLACKHOLE' },
    // mb_u2: 絕對零度 -> 擴散的凍結領域
    'mb_u2': { archetype: 'DOMAIN', primaryColor: '#bfdbfe', secondaryColor: '#3b82f6', scale: 1.8, vfxOverride: 'FX_ULT_BLUE_GLACIAL_BURST' },
    // mb_u3: 時間停止 -> 巨大的黃金時鐘 (魔法陣)
    'mb_u3': { archetype: 'DOMAIN', primaryColor: '#fef08a', secondaryColor: '#fcd34d', scale: 2.5, vfxOverride: 'FX_ULT_BLUE_TIMESTOP' },
    // mb_u4: 奧術洪流 -> 導彈群
    'mb_u4': { archetype: 'STORM', primaryColor: '#a855f7', secondaryColor: '#d8b4fe', scale: 1.0, count: 12, vfxOverride: 'FX_ULT_BLUE_TORRENT' },
    // mb_u5: 聚能光束 -> 粗大的六邊形雷射
    'mb_u5': { archetype: 'BEAM_SNIPE', primaryColor: '#60a5fa', secondaryColor: '#3b82f6', scale: 3.5, vfxOverride: 'FX_ULT_BLUE_FOCUS_BEAM' },

    // --- SUPPORT (Heal/Buff) ---
    // sb_u1: 神聖干涉 -> 無敵六邊形結界
    'sb_u1': { archetype: 'SANCTUARY', primaryColor: '#fef3c7', secondaryColor: '#fbbf24', scale: 1.6, count: 4, vfxOverride: 'FX_ULT_BLUE_INTERVENTION' },
    // sb_u2: 復活之光 -> 天降重生光柱
    'sb_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#86efac', secondaryColor: '#fff', scale: 1.4, height: 1500, timing: 0.5, vfxOverride: 'FX_ULT_BLUE_RESURRECTION' },
    // sb_u3: 英勇讚美 -> 上升的音波紋
    'sb_u3': { archetype: 'STORM', primaryColor: '#3b82f6', secondaryColor: '#fff', scale: 0.9, count: 10, vfxOverride: 'FX_ULT_BLUE_HYMN' },
    // sb_u4: 神之怒火 -> 天譴
    'sb_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#fcd34d', secondaryColor: '#f59e0b', scale: 1.5, vfxOverride: 'FX_ULT_BLUE_WRATH' },
    // sb_u5: 寧靜之雨 -> 六邊形光雨
    'sb_u5': { archetype: 'STORM', primaryColor: '#86efac', secondaryColor: '#dcfce7', scale: 0.6, count: 20, timing: 0.05, vfxOverride: 'FX_ULT_BLUE_RAIN' },

    // ================= COVENANT (RED - Chaos/Blood/Fire) =================

    // --- TANK (Blood/Undead) ---
    // tr_u1: 處決斷頭台 -> 巨大的紅色斷頭台刃 (Vertical Slash)
    'tr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.5, height: 1000, vfxOverride: 'FX_ULT_RED_GUILLOTINE_IMPACT' },
    // tr_u2: 亡靈瘟疫 -> 擴散的綠色毒霧領域
    'tr_u2': { archetype: 'DOMAIN', primaryColor: '#3f6212', secondaryColor: '#a3e635', scale: 1.8, vfxOverride: 'FX_ULT_RED_PLAGUE' },
    // tr_u3: 不朽屍王 -> 血色晶體護甲
    'tr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#be123c', secondaryColor: '#000', scale: 1.6, vfxOverride: 'FX_ULT_RED_UNDYING' },
    // tr_u4: 永恆夢魘 -> 黑色六邊形夢魘領域
    'tr_u4': { archetype: 'INSTANT_IMPACT', primaryColor: '#581c87', secondaryColor: '#000', scale: 2.2, vfxOverride: 'FX_ULT_RED_NIGHTMARE' },
    // tr_u5: 鮮血之牆 -> 從地面升起的六邊形血柱
    'tr_u5': { archetype: 'SANCTUARY', primaryColor: '#991b1b', secondaryColor: '#ef4444', scale: 1.4, count: 6, vfxOverride: 'FX_ULT_RED_BLOOD_WALL' },

    // --- WARRIOR (Rage/Fire) ---
    // wr_u1: 諸神黃昏 -> 地面爆發
    'wr_u1': { archetype: 'INSTANT_IMPACT', primaryColor: '#ea580c', secondaryColor: '#7f1d1d', scale: 2.8, vfxOverride: 'FX_ULT_RED_RAGNAROK_ERUPTION' },
    // wr_u2: 血腥旋風 -> 旋轉的血刃
    'wr_u2': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#991b1b', scale: 1.3, count: 15, vfxOverride: 'FX_ULT_RED_BLOODSTORM' },
    // wr_u3: 惡魔降臨 -> 變身爆發
    'wr_u3': { archetype: 'INSTANT_IMPACT', primaryColor: '#000', secondaryColor: '#7f1d1d', scale: 1.6, vfxOverride: 'FX_ULT_RED_DEMON_FORM' },
    // wr_u4: 無限劍制 -> 劍塚 (大量 PILLAR)
    'wr_u4': { archetype: 'STORM', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.0, count: 12, vfxOverride: 'FX_ULT_RED_UNLIMITED_BLADE' },
    // wr_u5: 毀滅重擊 -> 擊碎地面的六邊形裂痕
    'wr_u5': { archetype: 'INSTANT_IMPACT', primaryColor: '#450a0a', secondaryColor: '#000', scale: 2.0, vfxOverride: 'FX_ULT_RED_DEVASTATE' },

    // --- RANGER (Explosive/Dark) ---
    // rr_u1: 終極爆破 -> 黑色電磁砲
    'rr_u1': { archetype: 'BEAM_SNIPE', primaryColor: '#000', secondaryColor: '#ef4444', scale: 3.5, vfxOverride: 'FX_ULT_RED_RAILGUN' },
    // rr_u2: 戰術核彈 -> 核彈 (完美的 Heaven Fall)
    'rr_u2': { archetype: 'HEAVEN_FALL', primaryColor: '#ef4444', secondaryColor: '#f97316', scale: 3.0, height: 2500, timing: 0.4, vfxOverride: 'FX_ULT_RED_NUKE_FLASH' },
    // rr_u3: 煉獄火雨 -> 燃燒彈幕
    'rr_u3': { archetype: 'STORM', primaryColor: '#f87171', secondaryColor: '#fff', scale: 1.0, count: 20, timing: 0.05, vfxOverride: 'FX_ULT_RED_INFERNO' },
    // rr_u4: 血腥獵殺 -> 鎖定標記 (Beam Snap)
    'rr_u4': { 
        archetype: 'BEAM_SNIPE', 
        primaryColor: '#ea580c', 
        secondaryColor: '#fcd34d', 
        scale: 2.0, 
        vfxOverride: 'FX_ULT_RED_HEADHUNTER' 
    },
    // rr_u5: 末日審判 -> 末日降臨 (STORM)
    'rr_u5': { archetype: 'STORM', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.8, count: 12, timing: 0.1, vfxOverride: 'FX_ULT_RED_DOOM' },

    // --- MAGE (Fel/Void) ---
    // mr_u1: 毀滅隕石 -> 召喚巨大隕石 (Heaven Fall)
    'mr_u1': { archetype: 'HEAVEN_FALL', primaryColor: '#f97316', secondaryColor: '#7c2d12', scale: 2.2, height: 1800, vfxOverride: 'FX_ULT_RED_METEOR_IMPACT' },
    // mr_u2: 死亡一指 -> 紅色死光
    'mr_u2': { archetype: 'BEAM_SNIPE', primaryColor: '#dc2626', secondaryColor: '#000', scale: 2.5, vfxOverride: 'FX_ULT_RED_DEATH_FINGER' },
    // mr_u3: 虛空降臨 -> 虛空傳送門 (Domain)
    'mr_u3': { archetype: 'DOMAIN', primaryColor: '#22c55e', secondaryColor: '#16a34a', scale: 2.0, vfxOverride: 'FX_ULT_RED_VOID_PORTAL' },
    // mr_u4: 末世毒雨 -> 腐蝕酸雨
    'mr_u4': { archetype: 'DOMAIN', primaryColor: '#a3e635', secondaryColor: '#000', scale: 1.8, vfxOverride: 'FX_ULT_RED_POISON_RAIN' },
    // mr_u5: 靈魂爆燃 -> 連鎖爆炸
    'mr_u5': { archetype: 'STORM', primaryColor: '#dc2626', secondaryColor: '#fca5a5', scale: 1.2, count: 12, vfxOverride: 'FX_ULT_RED_SOUL_BURN' },

    // --- SUPPORT (Blood/Curse) ---
    // sr_u1: 靈魂連結 -> 靈魂鎖鏈陣
    'sr_u1': { archetype: 'SANCTUARY', primaryColor: '#581c87', secondaryColor: '#a855f7', scale: 1.4, count: 5, vfxOverride: 'FX_ULT_RED_SOUL_WEB' },
    // sr_u2: 鮮血契約 -> 鮮血魔法陣
    'sr_u2': { archetype: 'DOMAIN', primaryColor: '#ef4444', secondaryColor: '#fca5a5', scale: 1.6, vfxOverride: 'FX_ULT_RED_BLOOD_PACT' },
    // sr_u3: 群體恐慌 -> 混亂迷霧
    'sr_u3': { archetype: 'STORM', primaryColor: '#4c1d95', secondaryColor: '#a78bfa', scale: 1.0, count: 10, vfxOverride: 'FX_ULT_RED_VOODOO' },
    // sr_u4: 猩紅血月 -> 升起的紅月 (使用 Giant Hex 模擬月亮)
    'sr_u4': { archetype: 'HEAVEN_FALL', primaryColor: '#be123c', secondaryColor: '#991b1b', scale: 2.5, height: 800, vfxOverride: 'FX_ULT_RED_BLOOD_MOON' }, // Reverse fall? No, just impact feel
    // sr_u5: 惡靈附身 -> 附身儀式
    'sr_u5': { archetype: 'DOMAIN', primaryColor: '#7f1d1d', secondaryColor: '#000', scale: 1.5, vfxOverride: 'FX_ULT_RED_POSSESSION' },
};
