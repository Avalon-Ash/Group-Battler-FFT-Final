
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
Version: 6.7.0 (Theater Mode & Atmospheric Update)
Generated: ${new Date().toLocaleString()}
Engine: Hybrid 2.5D Isometric (Flat-Top) / Phys-Logical 3D
================================================================================

[1. 空間幾何與座標系統 (Spatial Geometry & Coordinates)]
--------------------------------------------------------------------------------
系統採用等距視角 (Isometric 2.5D) 表現，底層邏輯運行於擬 3D 空間。

* 轉換公式 (Coordinate Transformation):
  - 網格類型: Flat-Top Hexagon (旋轉 0 度).
  - 投影比例 (ISO_Y): ${ISO_SCALE_Y}
  - 渲染基準 (Pivot): 地塊繪製使用 3-Face Prism (Left/Center/Right) 以呈現厚度體積感。
  - 像素換算: 
    x = size * 3/2 * q
    y = size * sqrt(3) * (r + q/2) * ISO_Y

* 地形規則 (Terrain Architecture):
  - 最大高度: ${MAX_TERRAIN_TIER} 階梯層級 (Tiers).
  - 單層物理高度: ${BLOCK_HEIGHT} px.
  - Slab Base: 地塊底部延伸 ${12}px (SLAB_THICKNESS) 確保無懸空感。

[2. 物理模擬與運動學 (Physics & Kinematics)]
--------------------------------------------------------------------------------
* 重力系統 (Gravitational Field):
  - 全域重力: 1800 units/s².
  - 碰撞檢測: 實時地表高度檢索 (Heightmap Lookup).
  - 彈性係數: 0.5 (落地反彈與動能損耗).

* 飛行機制 (Flight Mechanics):
  - 戰術懸停 (Tactical Hover): 飛行單位擁有全息投影錨點 (Holographic Anchor)，連接身體與地表網格中心。
  - 懸浮高度: 55 px (動態正弦波浮動).
  - 阻擋規避: 飛行單位無視一般障礙物與地形落差，僅受 "BlocksFlying" 屬性建築阻擋。

[3. 投射物彈道學 (Projectile Ballistics 2.0)]
--------------------------------------------------------------------------------
* 發射與命中 (Launch & Impact):
  - 起點修正 (Origin): 投射物從單位 "胸口" (Body Offset: 45px) 發射，而非腳底。
  - 動態追蹤 (Homing): 目標高度 (Target Z) 實時鎖定對方物理中心 (TerrainH + JumpH + BodyOffset)。

[4. 異常狀態體系 (Control Status System)]
--------------------------------------------------------------------------------
* 硬控場 (Hard CC): 暈眩 (Stun), 恐懼 (Fear), 嘲諷 (Taunt), 放逐 (Banish).
* 軟控場 (Soft CC): 禁錮 (Root), 沉默 (Silence), 致盲 (Blind).
* 防禦機制 (Defense): 護盾 (Shield), 抗性遞減 (DR) ${COMBAT_PARAM.DR_RESET_TIME}s.

[5. 渲染管線技術 (Rendering Pipeline)]
--------------------------------------------------------------------------------
* 環境渲染 (Atmospheric Rendering):
  - 靜態層 (Static): 預渲染背景梯度、星空、遠景山脈輪廓。
  - 動態層 (Dynamic): 
    - God Rays (體積光束) - Forest/Desert 場景。
    - Aurora (極光) - Ice 場景。
    - Atmospheric Fog (流動霧氣)。
  
* 障礙物渲染 (Obstacle 2.5D):
  - 幾何適配: 所有障礙物重構為 3-Face Perspective 以匹配 Flat-Top 網格視角。
  - 陰影: 使用自適應 ISO 投影陰影。

================================================================================
END OF SPECIFICATION
`;
    }
}
