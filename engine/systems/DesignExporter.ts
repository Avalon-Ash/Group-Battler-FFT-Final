
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
Version: 6.5.0 (Pipeline Architecture Update)
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

[3. 投射物彈道學 (Projectile Ballistics 2.0)]
--------------------------------------------------------------------------------
* 發射與命中 (Launch & Impact):
  - 起點修正 (Origin): 投射物從單位 "胸口" (Body Offset: 45px) 發射，而非腳底。
  - 動態追蹤 (Homing): 目標高度 (Target Z) 實時鎖定對方物理中心 (TerrainH + JumpH + BodyOffset)，確保空中單位被準確擊中。

* 軌跡演算法 (Trajectory Algorithms):
  - Linear: 直線高速彈道 (如: 狙擊彈, 能量束).
  - Arc: 拋物線重力模擬 (如: 箭矢, 炸彈), ArcHeight 可配置.
  - Wobble: 正弦波側向擾動 (如: 火球, 混沌法球).
  - Spin: 獨立於移動方向的自旋角速度 (如: 飛斧 15 rad/s).

[4. 異常狀態體系 (Control Status System)]
--------------------------------------------------------------------------------
* 硬控場 (Hard CC):
  - 暈眩 (Stun): 無法移動、無法施法、無法迴避。
  - 恐懼 (Fear): 強制隨機移動，打斷施法。
  - 嘲諷 (Taunt): 強制攻擊施法者，無法切換目標。
  - 放逐 (Banish/Stasis): 移出戰場，無敵且無法行動。

* 軟控場 (Soft CC):
  - 禁錮 (Root): 無法移動，但可施法/攻擊。
  - 沉默 (Silence): 無法施放技能，僅能普攻。
  - 致盲 (Blind): 普攻與指向性技能高機率 MISS。

* 防禦機制 (Defense):
  - 護盾 (Shield): 優先扣除護盾值，吸收 DoT 與直傷。
  - 抗性遞減 (DR): 同一類型 CC 在 ${COMBAT_PARAM.DR_RESET_TIME} 秒內重複施加效果減半。

[5. 渲染管線技術 (Rendering Pipeline)]
--------------------------------------------------------------------------------
* 繪製流程:
  1. 靜態背景緩存 (Static Background Caching).
  2. 動態環境要素 (Atmospheric Fog / Dynamic Clouds).
  3. 渲染隊列構建 (RenderList Collection): 遍歷 Tile, Unit, VFX, Projectile.
  4. 深度排序 (Painters Algorithm): 以 Ground_Y 為 Key，配合 SortBias 修正 Z-Fighting.
  5. 像素對齊 (Pixel Snapping): 所有 tx/ty 進行 Math.round()，消除 sub-pixel 模糊。

================================================================================
END OF SPECIFICATION
`;
    }
}
