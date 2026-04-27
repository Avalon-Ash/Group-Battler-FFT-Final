
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
   * 處於危險區 (IsInWarningZone): 系統唯一危險判定閘 (SSOT)，整合縮圈邊界、敵方 hazard 與友軍 hazard 過濾，強制觸發 Dijkstra 逃生尋路。
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

[8. AI 戰術評估與大逃殺規避邏輯 (AI Evasion & Survival System)]
--------------------------------------------------------------------------------
* 狀態驅動攔截器 (Survival Interceptor): 採用頂層優先級攔截器模式。一旦偵測到危險，AI 會切入 EVADING_URGENT 狀態，完全掛起下層的掃描、追擊與常規攻擊邏輯，直至抵達安全區或狀態解除，徹底消除決策震盪。
* 動態危險預測 (Dynamic Danger Prediction): 
  - 運動投影: 基於 physics.vx/vy 與當前位移剩餘幀數 (stuckTicks) 進行物理投影，預判受力位移後的最終落點。
  - 路徑終點檢定: 尋路過程中會同步驗證路徑終點 (TargetHex) 的安全性，防止單位主動走入未來的警告區域。
* 精準對齊的致死詠唱中斷 (SSOT Casting Interruption): 建立基於地形坍塌計時器 (shrinkTimer) 與詠唱進度 (castTimer) 的競爭條件判定。若計算結果顯示無法在傷害生效前完成施法，系統將強制中斷高價值技能以優先保命，反之則維持施法以最大化 DPS。
* 職責隔離的開路索敵 (Decoupled Path-Clearing): 逃生動作中整合了線型遮蔽掃描 (Line Raycast)。單位能自動識別通往安全路徑上的敵方路障，並將其定位為推拉技能的優先目標，而非依賴全域的 TargetingSystem 進行耦合判定。
* 拓樸逃生尋路 (Topological Navigation): 尋路算法對高度差進行非對稱加權。向上攀爬依舊受 Jump 屬性嚴格限制，但向下跳躍被視為無成本戰術動作，賦予 AI 在危急時刻執行「戰術跳崖」的求生本能。
* 型別絕對防禦 (Strict Type & Protocol Security): 核心服務 (如 SpatialProvider) 的所有傳輸與引數不再使用任何強制轉型 (as any)，而是運用 TypeScript 3.8+ 特定的實體推導與 import type 阻斷型別逃逸。
* SSOT 真實高度算繪 (Absolute Terrain Projection): 所有飛行軌跡與特效繪製撤銷了基於舊幀紀錄緩存的高度臆測。直接由管線母體同步供應當前時間切片的絕對地形高度 (Absolute Terrain Z)，即便是瞬移與跨幀大距離移動都能完美貼合地表。
* 介面隔離原則 (Interface Segregation / IoC): 對核心業務邏輯的相依性進行了精細切分。例如將日誌服務 (LogProvider) 從空間服務 (SpatialProvider) 中徹底剝離，使得諸如 StackingResolver 等子系統只依賴真正需要的行為，斬斷了因 GameEngine 單例膨脹而產生的耦合技術債。
* 狀態快照與記憶體回收隔離 (State Snapshot & GC Boundary): 將戰鬥中為減少渲染與邏輯運算負擔而實行的「陣亡實體回收 (Garbage Collection)」機制，與「初始編制名冊 (Initial Roster Snapshot)」進行分離。確保戰場重置時 (Restart)，不會因為運行時優化機制而遺失參照，徹底保障重製功能的冪等性與狀態完整度。
* 亞幀記憶體回收安全網 (Sub-Tick Garbage Collection Safety): 將陣亡實體的註銷延遲至當前 Tick 迴圈的最末端集中執行，消滅了因提早釋放參照導致同幀中後續系統 (如 StackingResolver) 讀取懸空指標或引發位移計算異常的邊界隱患。
* 複合控制狀態競爭排解 (Concurrent CC Resolution): 針對實體同時掛載恐懼 (Fear) 與定身 (Root) 等多重干擾的極端情境，引入絕對層級覆蓋機制 (Strict Hierarchy Override)，徹底根除複數狀態在同一影格內競寫路徑與位移屬性所引發的抖動與死鎖。
* 行為樹時序防抖與重入保護 (BT Stateful Debounce & Re-entry Guard): 在 EscapeWarning 等核心逃生行為中引入基於 escapeCooldown 的提早跳出 (Early-Exit) 與 RUNNING 狀態維持。完美解決了資料層防抖與行為樹每幀強制 tick 脫節所引發的「原地反覆決策死鎖 (Stand-and-Die)」現象。
* 友軍危害排除與 SSOT 統一 (Friendly Hazard Immunity & SSOT Unification): 徹底將大逃殺底層生存判斷、背水一戰路徑淨空 (CastPushPull) 收攏至唯一真相來源 BTConditions["IsInWarningZone"]，並在空間層面嚴格剃除同隊環境干擾 (Friendly Hazards)，確保多重法術堆疊下的 AI 避險動作絕不發生誤判與恐慌亂跑。
* 偽隨機時間窗鎖定機制 (Buffered RNG Temporal Lock): 獨立緩存大逃殺隨機縮圈階段 (Final Phase) 的目標索引 (finalPhaseTargetKey)。防止在「警告 (Warning)」與「執行 (Execution)」的跨幀等待期間內因種子滾動而發生跳格翻轉，確保時序邊界上的絕對一致性。
* 獨立數值控制防護層 (Immutable Shield Bypass): 將護盾 (SHIELD) 自控制減免矩陣 (Diminishing Returns) 中剝離，解決了後補增益意外干擾系統時序衰減的問題，維持單元邏輯封裝的純潔性。

[9. 控制流與戰鬥狀態機隔離 (Control Flow & Combat State Constraints)]
--------------------------------------------------------------------------------
* AOE/單體目標智能陣營決別 (Smart Coalition Identification): 徹底重構以 power 與 ccType 聯合驅動的敵我識別防護機制。對於增益性技能 (power < 0 或 power === 0 且 isBuffCC) 與傷害/控場技能進行嚴格分流，阻斷將護盾 (SHIELD) 或持續恢復 (HOT) 施加於敵方標靶的架構性漏洞。
* 被動與附帶增益的投射轉向 (Secondary CC Redirection): 在命中解析階段，對附帶自身增益的攻擊技能實施智能 ccTarget 重定向。在技能將增益效果派發給敵方目標前，自動反折向施法者，實現無縫的「打擊自防禦」攻防一體聯動。
* 遞減回報嚴格閾值判定 (Strict DR Immunity Floor): 修正控制遞減矩陣的免疫容差，將乘積比重設定為 <= 0.25，確保「三次疊加後免疫」的數學設計確切發揮。
* 狀態渲染的異步反抖技術 (Asynchronous Feedback Decoupling): 將視覺回饋的計時器狀態機以命名空間分離為 _dot 與 _hot。根除了複數週期狀態在同幀競爭單一輸出通道時發生的 UI 靜默與信息遮蓋問題，保證複合狀態結算的視覺保真度。
* 互斥控制權競爭的絕對防禦 (Mutually Exclusive CC Override): 將基礎硬控場 (Stun) 疊加至最高層級的位移奪取過濾器中，實體上杜杜絕了在暈眩狀態下因底層恐懼 (Fear) 所引發的狀態越權與異常滑行現象。

[10. 投射物與戰鬥屬性精密計算 (Projectile & Combat Math Integrity)]
--------------------------------------------------------------------------------
* 邏輯與視覺座標軸的降維打擊 (Hex-Logical AOE & Projectile Alignment): 徹底消滅投射物 AOE 判定的像素魔術數字 (Magic Numbers)。採用目標快取 (TargetHex Q/R) 取代視覺錨點 (UnitAnchor)，將 Projectile 落地判定的坐標系強烈約束於與即時技能完全相同的 HexArea 六角拓樸運算中，一併打通了 Hazard 地圖物件延伸渲染的任督二脈。
* 死者實體快取追蹤 (Post-Mortem Projectile Caching): 引入拋射初期目標死結算快取機制。當導彈在飛行末期目標實體已被 Memory Clean 拋棄時，依然依靠 targetHex 緩存完成最後視覺爆破點與落點波及，杜絕目標驟死導致的 UI 彈道視覺回歸原點撕裂現象。
* 戰場疲勞期絕對縮放矩陣 (Sudden Death Scaling Strict Ordering): 重新調整 60 秒驟死機制的乘算順序。將 Execute (斬殺) 追加傷害計算明確前置於全局疲勞係數的乘法放流之前，保證角色血線檢定的純粹比例轉換，化解高時長下固定斬殺額度失真的防線崩潰。
* 物理格擋之治療白名單 (Healing Bypass for Tank Mitigation): 於角色物理減傷階段 (Tank Block) 加入絕對的 !isHeal 判定。徹底阻止將友方支援或自身再生與護盾當作負能量進行抗性衰減，確保核心單體防禦者能夠足秤吃足醫療回報。
* 單一爆擊判定 (Unified Sub-Cast Pre-roll): 對 AOE 多目標覆蓋重構單一物理判定 (Pre-roll Crit)。使法術發動的瞬間便決定此輪波次是否爆擊，避免同次火雨部分產生紅字爆擊而其餘為一般傷害的機率剝離，還原了古典戰棋技能結算的實體張力。

[11. 生存法則與逃生路由系統 (Survival Protocol & Escape Routing)]
--------------------------------------------------------------------------------
* 逃生起點剔除機制 (Escape Origin Elimination): 修復 A* 在危險邊界起步時立刻當前格認證通過而返回原地的判定失誤。要求演算法嚴格跳過起點格子進行「安全審查」，強制展開尋路，切斷了單位立於危險交界「站著等死」的致命發呆行為。
* 求生獨立決策代理 (Autonomous Escape Proxying): 移除 'EscapeWarning' 高壓生存期內對一般對話層 'updateTarget' 的呼叫依賴，改於行為樹局部直接向 'Pathfinder' 發起緊急空投調度。斬斷了 'Targeting' 在預測態與發作態的落差下產生的目的地重置邏輯矛盾。
* 狀態復原之無干涉防護 (Cooldown-Safe Fast Exit): 當單位遁入純淨板塊但 'escapeCooldown' 未竟之時，允許脫離 EVADING_URGENT 並轉交給戰術核心，釋放 AI 在殘存的 0.2 秒無謂冰凍。
* 全鏈路危險塗層感知 (End-to-End Hazard Awareness): 在尋路終點鑑定及舊路還魂的複檢迴路 (moveAgentToHex Validation) 雙向置入 'spatial.getHazard' 的敵意審查，從實體上掐滅了避開縮圈落入火坑的連續判定真空。

================================================================================
END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED
`;
    }
}