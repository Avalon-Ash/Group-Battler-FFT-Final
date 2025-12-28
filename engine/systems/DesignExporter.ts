
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, UNIT_VISUAL_HEIGHT, COMBAT_PARAM, ISO_SCALE_Y, UNIT_SCALE, UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from "../../constants";

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
Version: 7.1.1 (Precision Patch)
Generated: ${new Date().toLocaleString()}
Engine: Hybrid 2.5D Isometric (Flat-Top) / Phys-Logical 3D
================================================================================

[1. 空間幾何與座標系統 (Spatial Geometry & Coordinates)]
--------------------------------------------------------------------------------
系統採用等距視角 (Isometric 2.5D) 表現，底層邏輯運行於擬 3D 空間。

* 視覺縮放 (Visual Scale):
  - 全域單位縮放 (Unit Scale): ${UNIT_SCALE} (70% Original Size).
  - 確保單位與 10x10 網格的比例更為協調，保留戰術空間感。

* 轉換公式 (Coordinate Transformation):
  - 網格類型: Flat-Top Hexagon (旋轉 0 度).
  - 投影比例 (ISO_Y): ${ISO_SCALE_Y}
  - 渲染基準 (Pivot): 地塊繪製使用 3-Face Prism 以呈現體積感。

* 地形規則 (Terrain Architecture):
  - 地圖尺寸限制: 8x8 ~ 10x10 (Performance Optimized).
  - 最大高度: ${MAX_TERRAIN_TIER} 階梯層級 (Tiers).
  - 單層物理高度: ${BLOCK_HEIGHT} px.

[2. 物理模擬與運動學 (Physics & Kinematics)]
--------------------------------------------------------------------------------
* 重力系統 (Gravitational Field):
  - 全域重力: 2500 units/s² (Snappy falls).
  - 碰撞檢測: 實時地表高度檢索 (Heightmap Lookup).

* 飛行機制 (Flight Mechanics):
  - 戰術懸停 (Tactical Hover): 飛行單位擁有全息投影錨點。
  - 懸浮高度: 55 px (動態正弦波浮動).
  - 視覺錨點修正: 飛行線條現在正確連接至縮小後的單位底部。

[3. 投射物彈道學 (Projectile Ballistics 2.0)]
--------------------------------------------------------------------------------
* 發射與命中 (Launch & Impact):
  - 核心修正 (Core Fix): 彈道起點與終點現在嚴格對齊單位的 "視覺核心" (Visual Chest)。
  - 高度公式: TerrainZ + PhysicsZ + BodyOffset(${UNIT_BODY_OFFSET}) + HoverLift(${UNIT_HOVER_OFFSET}) + (VisualHeight * 0.4 * Scale).
  - 這解決了 "射腳底" (Toe-Shooting) 的視覺誤差。

[4. 異常狀態體系 (Control Status System)]
--------------------------------------------------------------------------------
* 硬控場 (Hard CC): 暈眩 (Stun), 恐懼 (Fear), 嘲諷 (Taunt), 放逐 (Banish).
* 軟控場 (Soft CC): 禁錮 (Root), 沉默 (Silence), 致盲 (Blind).
* 防禦機制 (Defense): 護盾 (Shield), 抗性遞減 (DR) ${COMBAT_PARAM.DR_RESET_TIME}s.

================================================================================
END OF SPECIFICATION
`;
    }
}
