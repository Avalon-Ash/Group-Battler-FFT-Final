
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_OS_v9.4_System_Architecture.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL.OS - 系統架構白皮書 (Kernel v9.4)
Generated: ${new Date().toLocaleString()}
Status: PRODUCTION_READY
================================================================================

[1. 視覺投影 SSOT 規範 (Spatial Truth)]
--------------------------------------------------------------------------------
系統強制執行「單一座標真理來源」，所有 2D 渲染必須遵循下列公式：
V_Y = (World_Y * ISO_SCALE_Y) - World_Z + Layer_Bias

* ISO_SCALE_Y: ${ISO_SCALE_Y}
* BLOCK_HEIGHT: ${BLOCK_HEIGHT}
* UNIT_BODY_OFFSET: ${UNIT_BODY_OFFSET}
* HORIZON_BIAS: ${VisualMath.HORIZON_Y_PCT} (Screen Height %)

[2. AI 決策權重矩陣 (Decision Matrix)]
--------------------------------------------------------------------------------
目標選取算法 (TargetingSystem V2) 採用加權評分機制：

Score = (DistWeight) + (HpWeight) + (ThreatWeight) + (StickyBonus)

1. 距離權重 (Exponential Falloff):
   Score += 2000 / (Distance + 0.5)
   * 極大幅度優先攻擊近身單位，防止近戰單位無視眼前敵人跑去追後排。

2. 血量權重 (Execute Priority):
   Score += (1 - HpPct) * 50
   * 優先攻擊殘血單位以減少敵方輸出。

3. 威脅權重 (Threat Assessment):
   * 詠唱 ULT: +200
   * 詠唱 ACTIVE: +50
   * 優先打斷高威脅目標。

4. 黏著加分 (Hysteresis):
   * 當前目標: +300
   * 防止在分數相近的目標間頻繁切換 (防抖)。

[3. 立體機動與尋路 (Topological Pathfinding)]
--------------------------------------------------------------------------------
移動邏輯採用非對稱垂直檢定 (Asymmetric Verticality)：

1. 向上攀爬 (Climbing Up):
   * 限制: Height_Diff <= Jump_Stat * BLOCK_HEIGHT
   * 成本: Base + (Height_Diff penalty)

2. 向下跳躍 (Jumping Down):
   * 限制: 無限制 (允許跳崖)
   * 成本: 固定微量懲罰 (鼓勵平地移動，但允許戰術跳躍)
   * 後果: 落地時觸發 PhysicsEngine.applyFallDamage

[4. 特效渲染管線 (VFX Pipeline Map)]
--------------------------------------------------------------------------------
GameEvent (Logic) -> EventVFXMapper (Adapter) -> VFXSystem (State)
                                                      |
[Render Loop] ----------------------------------------+
      |
      v
RenderPipeline
  +-- RenderList (Sort & Cull)
  +-- RenderDispatcher
        |
        +-- ProceduralPainter (Vector Geometry: BlackHole, HexBeam)
        +-- BillboardPainter (Sprite/Texture: Smoke, Spark)
        +-- GroundPainter (Projection: Shockwave, Grid)
        +-- VolumePainter (3D Extrusion: Shields, Pillars)

[5. 資源索引 (Asset Registry)]
--------------------------------------------------------------------------------
* UnitFactory: Base Token, Role Icons
* EnvironmentFactory: Procedural Obstacles (Tree, Crystal, Rock)
* VFXFactory: Texture Generation (Noise, Gradients)
* UIFactory: Skill Icons, Status Hexes

================================================================================
END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED
`;
    }
}