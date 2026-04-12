
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_OS_v9.5_System_Architecture.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL.OS - 系統架構白皮書 (Kernel v9.5)
Generated: ${new Date().toLocaleString()}
Status: PRODUCTION_READY
================================================================================

[1. 基礎設施與解耦 (Infrastructure & Decoupling)]
--------------------------------------------------------------------------------
* EventBus: 採用 Set<Handler> 儲存結構，從資料結構層面強制防堵重複訂閱，並在註銷時精確釋放記憶體。
* SpatialProvider: 抽象空間提供者介面。移動系統 (MovementSystem)、尋路 (Pathfinder) 與目標選取 (TargetingSystem) 完全切斷對 MapSystem 的具體依賴，強制透過 SpatialProvider 請求空間障礙與地形狀態。
* ZoneSystem: 獨立於地圖系統的生存空間控制器，負責處理 Battle Royale 模式的縮圈邏輯、警告區域計算與地形動態塌陷 (Collapsing Tiles)。

[2. 視覺投影 SSOT 規範 (Spatial Truth)]
--------------------------------------------------------------------------------
系統強制執行「單一座標真理來源」，所有 2D 渲染必須遵循下列公式：
V_Y = (World_Y * ISO_SCALE_Y) - World_Z + Layer_Bias

* ISO_SCALE_Y: ${ISO_SCALE_Y}
* BLOCK_HEIGHT: ${BLOCK_HEIGHT}
* UNIT_BODY_OFFSET: ${UNIT_BODY_OFFSET}
* HORIZON_BIAS: ${VisualMath.HORIZON_Y_PCT} (Screen Height %)
* HexGeometry V3.6: 採用「先旋轉後投影」算法，確保六邊形特效在旋轉時依然保持正確的等角透視比例。
* 渲染層 Z 軸數值強制動態調用 grid.getTerrainHeight，嚴禁在事件監聽器中硬編碼高度補償。
* 渲染管線 (RenderPipeline) 的 transitionT 更新強制綁定 dt 運算，確保轉場動畫與真實時間流逝掛鉤。

[3. AI 決策權重矩陣 (Decision Matrix)]
--------------------------------------------------------------------------------
目標選取算法 (TargetingSystem V2) 採用加權評分機制：

Score = (DistWeight) + (HpWeight) + (ThreatWeight) + (StickyBonus) + (SurvivalWeight)

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

4. 生存權重 (Survival Logic & Last Stand):
   * 處於縮圈警告區: 強制觸發 EVADE_ZONE 行為，使用 Dijkstra 算法尋找保證可達的安全格子。
   * 背水一戰 (Last Stand): 若逃生路徑被完全阻擋 (FAILURE)，AI 將放棄逃生，強制切換回戰鬥模式，並優先使用具備推拉 (KNOCKBACK/PULL) 效果的技能將敵人擊入虛空。
   * 生存加分 (Survival Bonus): 對於同樣處於危險區的敵人，給予額外 +500 權重，優先清除競爭逃生路線的對手。

5. 黏著加分 (Hysteresis):
   * 當前目標: +300
   * 防止在分數相近的目標間頻繁切換 (防抖)。

[4. 導播與監控系統 (Director & Monitor)]
--------------------------------------------------------------------------------
* DirectorSystem: 自動化鏡頭語言控制器。
  - Focus Logic: 優先鎖定正在施放奧義 (ULT) 或發生激烈交戰 (HP 劇烈變動) 的區域。
  - Dynamic Zoom: 根據戰場單位密度自動調整縮放倍率。
* Director Monitor HUD: 實時遙測數據面板，提供被鎖定單位的決策矩陣 (BT Status) 與生命體徵 (Vitals) 監控。

[4. 立體機動與尋路 (Topological Pathfinding)]
--------------------------------------------------------------------------------
移動邏輯採用非對稱垂直檢定 (Asymmetric Verticality)：

1. 向上攀爬 (Climbing Up):
   * 限制: Height_Diff <= Jump_Stat * BLOCK_HEIGHT
   * 成本: Base + (Height_Diff penalty)

2. 向下跳躍 (Jumping Down):
   * 限制: 無限制 (允許跳崖)
   * 成本: 固定微量懲罰 (鼓勵平地移動，但允許戰術跳躍)
   * 後果: 落地時觸發 PhysicsEngine.applyFallDamage

[5. 特效渲染管線 (VFX Pipeline Map)]
--------------------------------------------------------------------------------
* 動態高度綁定 (Dynamic Height Binding): 特效系統在獲取空間資訊時，會攔截正在塌陷的網格 (Collapsing Tiles)，並回傳其動態下墜高度 (h + z)，確保粒子與碎石完美貼合下墜中的地形，防止穿模。

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

[6. 資源索引 (Asset Registry)]
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