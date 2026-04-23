
import { MAX_TERRAIN_TIER, BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";

export class DesignExporter {

    static downloadSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `Tactical_OS_v9.7_System_Architecture.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    private static generateSpec(): string {
        return `
================================================================================
TACTICAL.OS - 系統架構白皮書 (Kernel v9.7)
Generated: ${new Date().toLocaleString()}
Status: PRODUCTION_READY
================================================================================

[1. 基礎設施與解耦 (Infrastructure & Decoupling)]
--------------------------------------------------------------------------------
* EventBus: 採用 Set<Handler> 儲存結構，從資料結構層面強制防堵重複訂閱，並在註銷時精確釋放記憶體。
* SpatialProvider: 抽象空間提供者介面。移動系統 (MovementSystem)、尋路 (Pathfinder) 與目標選取 (TargetingSystem) 完全切斷對 MapSystem 的具體依賴。
* ZoneSystem & Dynamic Hazard: 獨立於地圖系統的生存空間控制器，負責處理縮圈邏輯與警告區域計算。
* Flying Unit Physics: 飛行單位在空間屬性上標記為無視「單位碰撞 (Agent Occupancy)」，允許自由穿透隊友與敵人，消滅密集戰鬥下的導航死鎖。

[2. 視覺投影與 SSOT 規範 (Spatial Truth & Topology)]
--------------------------------------------------------------------------------
系統強制執行「單一座標真理來源」，所有 2D 渲染必須遵循下列公式與拓撲結構：
V_Y = (World_Y * ISO_SCALE_Y) - World_Z + Layer_Bias

* ISO_SCALE_Y: ${ISO_SCALE_Y}
* BLOCK_HEIGHT: ${BLOCK_HEIGHT}
* UNIT_BODY_OFFSET: ${UNIT_BODY_OFFSET}
* HORIZON_BIAS: ${VisualMath.HORIZON_Y_PCT} (Screen Height %)
* HexGeometry V3.6: 採用「先旋轉後投影」算法，確保六邊形特效在旋轉時依然保持正確的等角透視比例。
* Radial Map Generation: 放棄矩形迴圈，採用以 (0,0) 為中心的完全對稱的六大扇形擴張算法 (Giant Hexagon Island)，免除邊界畸變。
* Stepped Height Field (劇院景深地形): 根據離中心點距離與 Y 軸視角深度 (Visual Depth) 下移前景地形並抬高後方邊界，構成無遮擋的戰鬥碗狀地形。
* Footprint Z-Sorting: 所有實體 (包含地形、警告區、角色與特效) 強制以「視覺落地位址」(Visual Base Y) 作為 RenderOp.y 的優先排序權重，消滅 2.5D 遮擋破圖。

[3. AI 決策權重與射程修正 (Decision Matrix & Range)]
--------------------------------------------------------------------------------
目標選取算法 (TargetingSystem V2.5) 採用加權評分與動態射程檢定：

Score = (DistWeight) + (HpWeight) + (ThreatWeight) + (StickyBonus) + (SurvivalWeight)

1. 高低差動態射程 (Height Advantage/Penalty):
   * 高打低加成: 每高出 24px (1 層) 增加 +1 射程，上限 +2。
   * 低打高懲罰: 每低於 24px (1 層) 減少 -1 射程，上限 -2，且近戰保底射程為 1。
   * 系統容差 (Unified Tolerance): 統一使用 0.1 容差，消除 AI 判斷與實體結算間的死區 (Deadzone)。

2. 距離權重 (Exponential Falloff):
   Score += 2000 / (Distance + 0.5)
   * 極大幅度優先攻擊近身單位。

3. 威脅與生存邏輯:
   * 詠唱 ULT: +200 權重，優先成為集火目標。
   * 處於危險區 (IsInWarningZone): 強制觸發 Dijkstra 逃生尋路。
   * 背水一戰 (Last Stand): 若逃生失敗，強制使用推拉 (KNOCKBACK/PULL) 技能將攔路者擊退。

4. 黏著加分 (Hysteresis):
   * 當前目標: +300
   * 防止在分數相近的目標間頻繁切換 (防抖)。

[4. 導播與監控系統 (Director & Monitor)]
--------------------------------------------------------------------------------
* DirectorSystem: 自動化鏡頭語言控制器。
  - Focus Logic: 優先鎖定正在施放奧義 (ULT) 或發生激烈交戰 (HP 劇烈變動) 的區域。
* Director Monitor HUD: 實時遙測數據面板，提供被鎖定單位的決策矩陣 (BT Status) 與視覺狀態 (SpecialVisualStatus: DANGER/STASIS/FROZEN)。

[5. 立體機動與尋路 (Topological Pathfinding)]
--------------------------------------------------------------------------------
移動邏輯採用非對稱垂直檢定 (Asymmetric Verticality)：

1. 向上攀爬 (Climbing Up):
   * 限制: Height_Diff <= Jump_Stat * BLOCK_HEIGHT (飛行單位無視此限制)。
   * 成本: Base + (Height_Diff penalty)。

2. 向下跳躍 (Jumping Down):
   * 限制: 無限制 (允許戰術跳崖)。
   * 成本: 固定微量懲罰 (0.2)，鼓勵平地移動但不禁止跳崖逃生。

[6. 特效渲染管線 (VFX Pipeline Map)]
--------------------------------------------------------------------------------
* 動態高度綁定 (Dynamic Height Binding): 特效系統在獲取空間資訊時，會攔截正在塌陷的網格 (Collapsing Tiles)，並回傳其動態下墜高度 (h + z)，確保粒子與碎石完美貼合下墜中的地形，防止穿模。
* 投射物動態視覺軌跡 (Projectile Motion Blur & Adaptive Trails): 
  - 投射物實體會在繪圖管線中依據物理真實速度 (px/s) 計算出速度拉伸倍率 (Velocity Stretch)，製造出速度越快拉得越長的運動模糊錯覺。
  - 尾跡採樣策略捨棄了固定的時間步長，改為基於空間的「常數距離推算 (Adaptive Step)」，保證在任何物理速度與低 FPS 環境下，尾跡粒子仍然保持物理與視覺上 100% 的綿密平滑連接。
* 衝擊波彈性緩動 (Explosive Easing Shockwaves): 
  - 地面破壞波 (GroundPainter) 採用了四次方彈性爆發曲線 (Ease-Out Quartic)。
  - 在爆發前 10% 時間就會充滿 80% 的空間體積，產生極強烈的「打擊」與「過曝」效果，以防止在低配環境或跳幀時看不見技能閃光。

GameEvent (Logic) -> EventVFXMapper (Adapter) -> VFXSystem (State)
                                                      |
[Render Loop] ----------------------------------------+
      |
      v
RenderPipeline
  +-- RenderList (Sort by Footprint Y)
  +-- RenderDispatcher
        |
        +-- ProjectileDrawer (Motion Blur, Trail Density)
        +-- ProceduralPainter (Vector Geometry: BlackHole, HexBeam)
        +-- BillboardPainter (Sprite/Texture: Smoke, Spark)
        +-- GroundPainter (Projection: Cubic Easing Shockwaves, Grid)
        +-- VolumePainter (3D Extrusion: Shields, Pillars)

[7. 資源索引 (Asset Registry)]
--------------------------------------------------------------------------------
* UnitFactory: Base Token, Role Icons
* EnvironmentFactory: Procedural Obstacles (Tree, Crystal, Rock)
* VFXFactory: Texture Generation (Noise, Gradients)
* UIFactory: Skill Icons, Status Hexes

[8. AI 戰術評估與邊界機制 (AI & Boundary Mechanics)]
--------------------------------------------------------------------------------
* 逃生與環境感知 (Survival & Danger Zone Awareness): AI 的 TargetSelection 及 Pathfinding 取用了與大逃殺環節掛鉤的 SpatialProvider.isWarningTile 介面。當處於危險潰縮區時，會啟動生存權重補償 (Survival Bonus)，極度優先利用位移技能 (Knockback, Pull) 或逃跑路徑；打破原本死戰到底的硬邏輯。
* 強制位移邊界 (CC Collision Bounds): 在進行 Knockback 或 Pull 等地塊位移結算時，嚴格要求最終落點不得違反 spatial.isValid 與 spatial.hasObstacleHash，阻止了模型被推拉出網格或卡入牆壁內的錯誤行為。
* 地形射程補償 (Topographical Range Compensation): 所有技能射程基於高度差異會產生浮動（向下增加、向上減少的動態 Range Bonus），消弭在高低落差間的無效施法判斷。
* 型別絕對防禦 (Strict Type & Protocol Security): 核心服務 (如 SpatialProvider) 的所有傳輸與引數不再使用任何強制轉型 (as any)，而是運用 TypeScript 3.8+ 特定的實體推導與 import type 阻斷型別逃逸。
* SSOT 真實高度算繪 (Absolute Terrain Projection): 所有飛行軌跡與特效繪製撤銷了基於舊幀紀錄緩存的高度臆測。直接由管線母體同步供應當前時間切片的絕對地形高度 (Absolute Terrain Z)，即便是瞬移與跨幀大距離移動都能完美貼合地表。

================================================================================
END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED
`;
    }
}