
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, UNIT_VISUAL_HEIGHT, COMBAT_PARAM, ISO_SCALE_Y } from "../../constants";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_Design_Spec_v${new Date().toISOString().split('T')[0]}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL BATTLE SYSTEM - TECHNICAL DESIGN SPECIFICATION
Version: 6.2.0 (Stable)
Generated: ${new Date().toLocaleString()}
Engine: Hybrid 2.5D Isometric / Phys-Logical 3D
================================================================================

[1. 空間幾何與座標系統 (Spatial Geometry & Coordinates)]
--------------------------------------------------------------------------------
系統採用等距視角 (Isometric 2.5D) 表現，底層邏輯運行於擬 3D 空間。

* 轉換公式 (Coordinate Transformation):
  - 投影比例 (ISO_Y): ${ISO_SCALE_Y}
  - 網格單元: 六角網格 (Axial / Cube Coordinates).
  - 像素換算: 物理 X/Y/Z 直接映射至畫布 translate 變換，Z 軸轉化為垂直位移偏移。

* 地形規則 (Terrain Architecture):
  - 最大高度: ${MAX_TERRAIN_TIER} 階梯層級 (Tiers).
  - 單層物理高度: ${BLOCK_HEIGHT} px.
  - 視覺標準: 單位頭部參考高度為地表上方 ${UNIT_VISUAL_HEIGHT} px.

[2. 物理模擬與運動學 (Physics & Kinematics)]
--------------------------------------------------------------------------------
* 重力系統 (Gravitational Field):
  - 全域重力: 1800 units/s².
  - 碰撞檢測: 實時地表高度檢索 (Heightmap Lookup).
  - 彈性係數: 0.5 (落地反彈與動能損耗).

* 飛行機制 (Flight Mechanics):
  - 懸浮高度 (Hover Height): 55 px (動態正弦波浮動).
  - 阻擋規避: 飛行單位無視一般障礙物與地形落差，僅受 "BlocksFlying" 屬性建築阻擋。
  - 墜毀判定: 處於 [暈眩 STUN / 冰凍 FROZEN / 變形 POLYMORPH / 恐懼 FEAR] 狀態時，升力消失，強制切換至重力物理運算。

* 移動導航 (Navigation):
  - 地面單位受限於 [Jump] 屬性，落差 > (Jump * ${BLOCK_HEIGHT})px 之相鄰網格不可通行。
  - 碰撞解析 (Stacking): 同一網格靜止點僅允許單一單位，動態重疊會觸發解離推力 (Force: 5)。
  - 強制位移 (Forced Movement): 
    * FEAR: 強制背向來源移動，速度 120%。
    * CONFUSION: 隨機相鄰格移動，速度 80%。
    * KNOCKBACK/PULL: 物理向量推移，無視地形高度差 (空中)。

[3. 戰鬥邏輯與判定 (Combat Logic & Calculations)]
--------------------------------------------------------------------------------
* 高地優勢 (Elevation Advantage):
  - 公式: Effective_Range = Skill_Range + max(0, floor(Attacker_H - Target_H) / ${BLOCK_HEIGHT}).
  - 描述: 垂直高度每領先一階，遠程射程提升 1 格。

* 傷害模型 (Damage Modeling):
  - 斬殺判定 (Execute): 目標 HP < 30% 時，觸發 ${COMBAT_PARAM.BASE_EXECUTE_MULTIPLIER}x 傷害係數。
  - 吸血機制 (Vampirism): 預設轉化 50% 傷害為生命回復。
  - 擊退衝擊 (Impulse): 基於傷害量計算向量位移，最大限制 ${COMBAT_PARAM.HIT_IMPULSE_MAX} 向量單位。

* 控場階級 (CC Hierarchy):
  - 完全失控 (Hard CC):
    * STUN (暈眩): 禁止所有行動，停止移動。
    * BANISH (放逐): 禁止所有行動，單位無敵/不可選取 (含 Polymorph/Stasis)。
    * FEAR (恐懼): 禁止攻擊/施法，強制逃跑，打斷詠唱。
    * CONFUSION (混亂): 禁止攻擊/施法，隨機移動，打斷詠唱。
  
  - 行動限制 (Soft/Mobility CC):
    * ROOT (定身): 禁止移動 (Velocity=0)，可攻擊/施法。
    * SILENCE (沉默): 禁止主動/奧義技能，可普攻/移動。
    * SLOW (緩速): 移動速度降低 50%，不影響其他行動。

  - 遞減機制 (Diminishing Returns): 
    * 針對上述所有類型 (Dot/Hot 除外) 進行獨立計數。
    * 同類型連續施加時時長衰減 (100% -> 50% -> 25% -> 0%)。
    * 免疫重置時間: ${COMBAT_PARAM.DR_RESET_TIME} 秒。

[4. 渲染管線技術 (Rendering Pipeline)]
--------------------------------------------------------------------------------
* 繪製流程:
  1. 靜態背景緩存 (Static Background Caching).
  2. 動態環境要素 (Atmospheric Fog / Dynamic Clouds).
  3. 渲染隊列構建 (RenderList Collection): 遍歷 Tile, Unit, VFX, Projectile.
  4. 深度排序 (Painters Algorithm): 以 Ground_Y 為 Key，配合 SortBias 修正 Z-Fighting.
  5. 像素對齊 (Pixel Snapping): 所有 tx/ty 進行 Math.round()，消除 sub-pixel 模糊。

* 後處理 (Post-Processing):
  - 震動 (Trauma): 基於平方衰減的相機位移。
  - 色差 (Chromatic Aberration): 戰鬥高潮與轉場時的 RGB 頻道分離特效。
  - 高斯模糊 (Finish Blur): 模擬毛玻璃質感的轉場與勝利介面。

[5. AI 行為決策樹 (AI Behavior Tree)]
--------------------------------------------------------------------------------
採用決策優先級 (Selector) 結構：

1. [狀態檢查]: 優先處理死亡 (Dead)、受控 (CC) 狀態。
2. [奧義判斷]: MP 滿載且 CD 就緒時，掃描全場最佳施法點 (AOE 最大化/斬殺優先)。
3. [技能循環]: 依序檢查 Active -> Basic 技能的可用性與射程。
4. [戰術移動]: 若目標超出射程，利用 A* 尋路進行位移 (支持 Charge 加速)。
5. [待機]: 若無可行動作，保持警戒。

[6. 陣營視覺語義 (Faction Visual Semantics)]
--------------------------------------------------------------------------------
* 藍軍 (Imperial):
  - 色彩: 鈷藍 (Cobalt), 黃金 (Gold), 能量青 (Cyan).
  - 風格: 秩序、科技、幾何對稱、神聖光輝。
* 紅軍 (Covenant):
  - 色彩: 深紅 (Crimson), 黃銅 (Brass), 邪能綠 (Fel Green).
  - 風格: 混沌、原始、尖刺、鮮血與腐化。

================================================================================
END OF SPECIFICATION
`;
    }
}
