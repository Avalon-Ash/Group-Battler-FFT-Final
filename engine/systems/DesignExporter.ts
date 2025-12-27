
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
Version: 6.3.0 (Projectile 2.0 & High-Fidelity Assets)
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
  - 墜毀判定: 處於 [暈眩 STUN / 冰凍 FROZEN / 變形 POLYMORPH] 狀態時，升力消失，強制切換至重力物理運算。

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

* 視覺渲染 (Visual Rendering):
  - 獨立繪圖器 (ProjectilePainter): 支援高精度 Canvas 繪圖 (Hex Dart, Crystal, Axe).
  - 拖尾系統 (Trail History): 記錄最近 N 幀位置以繪製平滑拖尾。
  - 速度調整: 彈速下調至 800-1500 px/s 以適應肉眼動態捕捉。

[4. 戰鬥邏輯與判定 (Combat Logic & Calculations)]
--------------------------------------------------------------------------------
* 高地優勢 (Elevation Advantage):
  - 公式: Effective_Range = Skill_Range + max(0, floor(Attacker_H - Target_H) / ${BLOCK_HEIGHT}).
  - 描述: 垂直高度每領先一階，遠程射程提升 1 格。

* 傷害模型 (Damage Modeling):
  - 斬殺判定 (Execute): 目標 HP < 30% 時，觸發 ${COMBAT_PARAM.BASE_EXECUTE_MULTIPLIER}x 傷害係數。
  - 吸血機制 (Vampirism): 預設轉化 50% 傷害為生命回復。
  - 擊退衝擊 (Impulse): 基於傷害量計算向量位移，最大限制 ${COMBAT_PARAM.HIT_IMPULSE_MAX} 向量單位。

[5. 渲染管線技術 (Rendering Pipeline)]
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

[6. 系統架構解耦 (Decoupled Architecture)]
--------------------------------------------------------------------------------
* 核心原則 (Core Principles):
  - 數學純粹性 (Pure Math): 所有軌跡運算 (拋物線、螺旋、正弦波) 獨立於 \`engine/math/TrajectoryMath.ts\`。
  - 資產配置化 (Data-Driven Assets): 視覺定義 (Cast, Projectile, Hazard) 完全移至 \`data/vfx/*.ts\`，渲染器僅負責讀取與繪製。
  - 系統專責化 (Single Responsibility): 
    - \`VFXSystem\`: 粒子生命週期與物理。
    - \`GridSystem\`: 地形緩存與圖層計算。
    - \`ProjectileRenderer\`: 僅負責將邏輯位置轉換為視覺像素。

[7. 陣營視覺語義 (Faction Visual Semantics)]
--------------------------------------------------------------------------------
* 藍軍 (Imperial):
  - 色彩: 鈷藍 (Cobalt), 黃金 (Gold), 能量青 (Cyan).
  - 形狀: 圓形、六角、規整對稱。
  - 投射物: 科技飛鏢 (Hex Dart), 水晶 (Crystal), 能量球 (Orb).
* 紅軍 (Covenant):
  - 色彩: 深紅 (Crimson), 黃銅 (Brass), 邪能綠 (Fel Green).
  - 形狀: 尖銳、不規則鋸齒、混沌發散。
  - 投射物: 飛斧 (Axe), 混沌火球 (Chaos Orb), 重型弩箭 (Heavy Bolt).

================================================================================
END OF SPECIFICATION
`;
    }
}
