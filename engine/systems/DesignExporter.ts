import { BLOCK_HEIGHT, ISO_SCALE_Y, UNIT_BODY_OFFSET } from "../../constants";
import { VisualMath } from "../math/VisualMath";
import { RenderSpec } from '../renderers/RenderSpec';

export class DesignExporter {

    static downloadArchitectureSpec() {
        const text = DesignExporter.generateSpec();
        const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "Tactical_OS_v9.7_System_Architecture.md";
        anchor.click();
        URL.revokeObjectURL(url);
    }

    static downloadAll() {
        DesignExporter.downloadArchitectureSpec();
        // 加入短暫延遲，避免瀏覽器攔截兩次同步 click
        setTimeout(() => {
            RenderSpec.downloadSpec();
        }, 300);
    }

    static downloadSpec() {
        DesignExporter.downloadArchitectureSpec();
    }

    private static generateSpec(): string {
        let s = "# TACTICAL.OS — 系統架構白皮書 (Kernel v9.7)\n\n";
        s += "Generated: " + new Date().toLocaleString() + "\n";
        s += "Status: PRODUCTION_READY\n\n";

        s += "## 1. 基礎設施與解耦 (Infrastructure & Decoupling)\n\n";
        s += "- EventBus: 採用 Set<Handler> 儲存結構，從資料結構層面強制防堵重複訂閱，並在註銷時精確釋放記憶體。\n";
        s += "- SpatialProvider: 抽象空間提供者介面。移動系統 (MovementSystem)、尋路 (Pathfinder) 與目標選取 (TargetingSystem) 完全切斷對 MapSystem 的具體依賴。\n";
        s += "- ZoneSystem & Dynamic Hazard: 獨立於地圖系統的生存空間控制器，負責處理縮圈邏輯與警告區域計算。\n";
        s += "- Spatial Hazard Entity Pattern (空間危害實體化): 徹底將持續性 AOE 效果（如熔岩、毒霧）從網格節點 (GridNode) 的狀態屬性中剝離，轉化為具備獨立生命週期與空間坐標集的「空間實體」。此舉確保了地形靜態拓撲的純潔性，大幅降低因地形狀態頻繁切換導致的尋路緩存失效與效能抖動。\n";
        s += "- Flying Unit Physics: 飛行單位在空間屬性上標記為無視「單位碰撞 (Agent Occupancy)」，允許自由穿透隊友與敵人，消滅密集戰鬥下的導航死鎖。\n";
        s += "- Stable Z-Sorting Tiebreaker: 在 RenderList 中引入基於 Agent ID Hash 的確定性偏移量（10^-5 級別），徹底消滅 2.5D 環境中兩個單位在同一 Y 坐標時產生的每幀前後閃爍（Z-fighting）現象。\n";
        s += "- Layered Overlay Architecture: 將射程指示器 (Range Overlay) 與懸停高亮從地形渲染器中抽離，獨立為 `OVERLAY` 渲染子層 (SubLayer 25)。此架構確保指示器層級穩定高於地面貼圖 (DECAL, 20) 但低於動態危害 (HAZARD, 30)，在大範圍戰場縮減時提供更穩定的視覺回饋。\n\n";

        s += "## 2. 視覺投影與 SSOT 規範 (Spatial Truth & Topology)\n\n";
        s += "- 視覺中心鎖定 (Visual Center Tracking): 非同步導播系統 (DirectorSystem) 拋棄傳統的「地板根節點」追蹤，全面改採 VisualMath.getVisualBodyCenterY 計算。鏡頭重心主動對齊單位的「胸口高度」，即便是被擊飛至空中的單位，鏡頭也能精確跟隨其視覺質心，而非留在地面。\n";
        s += "- 障礙物遮擋輪廓 (Obstacle Occlusion Silhouette): 擴展 Occlusion 系統越過地形高度差，系統會實時檢測單位是否位於 Obstacle（如樹木、石頭）後方。若發生空間遮擋，單位自動切換為 Silhouette (藍色輪廓) 渲染模式，保證戰場資訊在複雜地形下的絕對可視化。\n";
        s += "- 障礙物拖動 Ghost 高度修正 (Obstacle Ghost ISO Y Alignment):\n";
        s += "  GameCanvas.tsx 的 draggedObstacle ghost 繪製，現在在 drawImage 前透過\n";
        s += "  VisualMath.getIsoVisualY 計算含地形高度的視覺 Y 座標，確保障礙物預覽在\n";
        s += "  不同高度地形上精準對齊，不再僅使用網格中心的 px/py。\n\n";
        s += "- Core 光點拖動高度即時同步 (Core Dot Drag Height Sync):\n";
        s += "  UnitVisualProcessor.ts 的 terrainHeight 計算現在優先檢查 agent.dragOverQ/R，\n";
        s += "  確保單位在跨高度地形拖動時，Core 光點（Blue 模式）即時跟隨棋座浮動，\n";
        s += "  不再發生高度落後或超前。\n\n";
        s += "- PointerProjector SSOT 職責邊界 (PointerProjector Responsibility Contract):\n";
        s += "  engine/math/PointerProjector.ts 是所有指標座標轉換的唯一真相來源（SSOT）。\n";
        s += "  負責處理 DPR 縮放、canvas offset 校正與 ISO 視覺座標投影。\n";
        s += "  與 VisualMath 的職責邊界：VisualMath 處理遊戲邏輯座標→視覺座標的轉換，\n";
        s += "  PointerProjector 處理瀏覽器輸入座標→遊戲邏輯座標的逆投影。\n";
        s += "  任何指標相關計算必須通過 PointerProjector，禁止在 UI 層直接計算 offsetX/Y。\n\n";
        s += "- `ISO_SCALE_Y`: " + ISO_SCALE_Y + "\n";
        s += "- `BLOCK_HEIGHT`: " + BLOCK_HEIGHT + "\n";
        s += "- `UNIT_BODY_OFFSET`: " + UNIT_BODY_OFFSET + "\n";
        s += "- `HORIZON_BIAS`: " + VisualMath.HORIZON_Y_PCT + " (Screen Height %)\n";
        s += "- HexGeometry V3.6: 採用「先旋轉後投影」算法，確保六邊形特效在旋轉時依然保持正確的等角透視比例。\n";
        s += "- Radial Map Generation: 放棄矩形迴圈，採用以 (0,0) 為中心的完全對稱的六大扇形擴張算法 (Giant Hexagon Island)，免除邊界畸變。\n";
        s += "- Stepped Height Field (劇院景深地形): 根據離中心點距離與 Y 軸視角深度 (Visual Depth) 下移前景地形並抬高後方邊界，構成無遮擋的戰鬥碗狀地形。\n";
        s += "- Footprint Z-Sorting: 所有實體 (包含地形、警告區、角色與特效) 強制以「視覺落地位址」(Visual Base Y) 作為 RenderOp.y 的優先排序權重，消滅 2.5D 遮擋破圖。\n\n";

        s += "## 3. AI 決策權重與射程修正 (Decision Matrix & Range)\n\n";
        s += "- 目標選取算法 (TargetingSystem V2.5) 採用加權評分與動態射程檢定：\n\n";
        s += "```\n";
        s += "Score = (DistWeight) + (HpWeight) + (ThreatWeight) + (StickyBonus) + (SurvivalWeight)\n";
        s += "```\n\n";
        s += "1. 高低差動態射程 (Height Advantage/Penalty):\n";
        s += "   - 高打低加成: 每高出 24px (1 層) 增加 +1 射程，上限 +2。\n";
        s += "   - 低打高懲罰: 每低於 24px (1 層) 減少 -1 射程，上限 -2，且近戰保底射程為 1。\n";
        s += "   - 系統容差 (Unified Tolerance): 統一使用 0.1 容差，消除 AI 判斷與實體結算間的死區 (Deadzone)。\n\n";
        s += "2. 距離權重 (Exponential Falloff):\n";
        s += "```\n";
        s += "Score += 2000 / (Distance + 0.5)\n";
        s += "```\n";
        s += "   - 極大幅度優先攻擊近身單位。\n\n";
        s += "3. 威脅與生存邏輯:\n";
        s += "   - 詠唱 ULT: +200 權重，優先成為集火目標。\n";
        s += "   - 處於危險區 (IsInWarningZone): 系統唯一危險判定閘 (SSOT)，整合縮圈邊界、敵方 hazard 與友軍 hazard 過濾，強制觸發 Dijkstra 逃生尋路。\n";
        s += "   - 背水一戰 (Last Stand): 若逃生失敗，強制使用推拉 (KNOCKBACK/PULL) 技能將攔路者擊退。\n\n";
        s += "4. 黏著加分 (Hysteresis):\n";
        s += "   - 當前目標: +300\n";
        s += "   - 防止在分數相近的目標間頻繁切換 (防抖)。\n\n";

        s += "## 4. 導播與監控系統 (Director & Monitor)\n\n";
        s += "- DirectorSystem V3.0: 自動化鏡頭語言控制器。\n";
        s += "  - Focus Logic: 優先鎖定正在施放奧義 (ULT, Weight=1.2) 或發生激烈交戰 (HP 劇烈變動, Weight=0.5~1.0) 的區域。\n";
        s += "  - Cinematic Inertia: 採用極低 stiffness (0.2~0.25) 的物理緩動算法，確保大範圍戰場位移時鏡頭平滑過渡。\n";
        s += "  - Zoom Deadzone (縮放死區): 引入 ±5% zoom 容差過濾器。微幅的單位位移將不再觸發鏡頭縮放震盪，從而消滅鏡頭「呼吸感」過重引發的視覺疲勞。\n";
        s += "- Director Monitor HUD: 實時遙測數據面板，提供被鎖定單位的決策矩陣 (BT Status) 與視覺狀態 (SpecialVisualStatus: DANGER/STASIS/FROZEN/INVINCIBLE/POLYMORPH)。\n\n";

        s += "## 5. 立體機動與尋路 (Topological Pathfinding)\n\n";
        s += "移動邏輯採用非對稱垂直檢定 (Asymmetric Verticality)：\n\n";
        s += "1. 向上攀爬 (Climbing Up):\n";
        s += "   - 限制: Height_Diff <= Jump_Stat * `BLOCK_HEIGHT` (飛行單位無視此限制)。\n";
        s += "   - 成本: Base + (Height_Diff penalty)。\n\n";
        s += "2. 向下跳躍 (Jumping Down):\n";
        s += "   - 限制: 無限制 (允許戰術跳崖)。\n";
        s += "   - 成本: 固定微量懲罰 (0.2)，鼓勵平地移動但不禁止跳崖逃生。\n\n";

        s += "## 6. 特效渲染管線與主權回收 (VFX Pipeline & Ownership)\n\n";
        s += "- 主權绑定與即時過期 (OwnerID Lifecycle Binding): VFX 系統擴展了生命週期協議。CC 類特效（如 Stun, Root）在生成時會與綁定單位的 ID 關聯。一旦該單位死亡（unregister），系統會在當前 Tick 立即將關聯粒子標記為 expired (life = -1) 並從記憶體池中回收，徹底根除「浮空殘留特效」問題。\n";
        s += "- AgentVFX 記憶體隔離 (Timer Sanitization): 針對 Agent 狀態特效計時器 (vfxTimers) 引入 10 秒周期性垃圾清理機制。主動剔除已離開戰場的單位殘留 Key，防止長時間戰鬥下引發的 Map 物件累積與洩漏。\n";
        s += "- Strict Footprint AURA Sorting (貼地光環精確排序): 針對光環與施法圈等 Ground-VFX，實施與單位渲染 op 分離的獨立提交機制。其 Z-Sorting 權重絕對鎖死在目標網格的 Visual Base Y，而非隨角色跳躍高度動態偏移。這徹底解決了在等角透視 (2.5D) 下，大型光環會「刺穿」後方高地地形或覆蓋前景障礙物的深度衝突瑕疵。\n";
        s += "- 動態高度綁定 (Dynamic Height Binding): 特效系統在獲取空間資訊時，會攔截正在塌陷的網格 (Collapsing Tiles)，並回傳其動態下墜高度 (h + z)，確保粒子與碎石完美貼合下墜中的地形。\n";
        s += "- Zero-Latency Optical Sync (零延遲打擊同步): 基礎打擊火花從非同步事件總線中剝離，改為與 `hitFlashTimer` 在同一幀同步發射，確保模型閃白、受擊抖動與粒子爆發在渲染管線中絕對對齊。\n";
        s += "- Shield Hit Branching (護盾斷言分支): `DAMAGE` 事件新增 `absorbed` 欄位。當結算偵測到護盾吸收時，視覺管線自動轉向 `FX_HIT_SHIELD_SPARK` 專屬資產（包含 `HEX_SHARD` 與 `RIPPLE` 紋理），阻斷常規血花與金屬火花。\n";
        s += "- 投射物動態視覺軌跡 (Projectile Motion Blur & Adaptive Trails): \n";
        s += "  - 投射物實體會在繪圖管線中依據速度計算倍率 (Velocity Stretch)，製造出運動模糊錯覺。\n";
        s += "  - 尾跡採樣採用基於空間的「常數距離推算 (Adaptive Step)」，保證在任何環境下尾跡粒子仍然保持 100% 的綿密連接。\n";
        s += "- § VFX 粒子預算 (Particle Budget):\n";
        s += "  - MAX_PARTICLES: 全域粒子硬上限，VFXPlayer spawn 前檢查，防止極端情況下的渲染崩潰。\n";
        s += "  - MAX_POOL_SIZE: pool 回收上限，releaseParticle 檢查，避免物件池無限制擴張導致記憶體占用。\n";
        s += "  - HAZARD_FIELD_MAX_PER_CELL: 每格 locked Hazard Field 粒子上限，確保 Hazard 視覺清晰且不造成局部過度渲染。\n";
        s += "  - IDLE_VFX_CULL_DIST_SQ: AgentVFXSystem idle 粒子的距離剔除閾值。超出攝影機焦點（導演目標）半徑的單位不生成背景粒子。\n";
        s += "  - 所有數值集中於 constants.ts VFX_PARAM，為唯一修改入口。\n\n";
        s += "```\n";
        s += "GameEvent (Logic) -> EventVFXMapper (Adapter) -> VFXSystem (State)\n";
        s += "                                                       |\n";
        s += "[Render Loop] ----------------------------------------+\n";
        s += "      |\n";
        s += "      v\n";
        s += "RenderPipeline\n";
        s += "  +-- RenderList (Sort by Footprint Y + ID Hash Tiebreaker)\n";
        s += "  +-- RenderDispatcher\n";
        s += "        |\n";
        s += "        +-- ProjectileDrawer (Motion Blur, Trail Density)\n";
        s += "        +-- ProceduralPainter (Vector Geometry: BlackHole, HexBeam)\n";
        s += "        +-- BillboardPainter (Sprite/Texture: Smoke, Spark)\n";
        s += "        +-- GroundPainter (Projection: Cubic Easing Shockwaves, Grid)\n";
        s += "        +-- VolumePainter (3D Extrusion: Shields, Pillars)\n";
        s += "```\n\n";

        s += "## 7. 資源索引 (Asset Registry)\n\n";
        s += "- UnitFactory: Base Token, Role Icons\n";
        s += "- EnvironmentFactory: Procedural Obstacles (Tree, Crystal, Rock)\n";
        s += "- VFXFactory: Texture Generation (Noise, Gradients)\n";
        s += "- UIFactory: Skill Icons, Status Hexes\n\n";
        
        s += "## 7-A. 單位外觀 SSOT (Unit Appearance Registry)\n\n";
        s += "說明：所有單位外觀資料由 `data/units/appearance/` 統一管理，\n";
        s += "Faction Renderer 不再持有任何 hardcoded 顏色或尺寸。\n\n";
        s += "SSOT 入口: `data/units/appearance/index.ts` → `UNIT_APPEARANCE`\n\n";
        s += "| 欄位           | 型別                              | 用途                         |\n";
        s += "|----------------|-----------------------------------|------------------------------|\n";
        s += "| bodyWidth      | number                            | 身體最大寬度（canvas unit）  |\n";
        s += "| bodyHeight     | number                            | 身體高度（canvas unit）      |\n";
        s += "| headRadius     | number                            | 頭部半徑                     |\n";
        s += "| primaryColor   | string (hex)                      | 主色：裝甲/主體              |\n";
        s += "| secondaryColor | string (hex)                      | 次色：武器/邊框              |\n";
        s += "| accentColor    | string (hex)                      | 強調色：眼睛/發光            |\n";
        s += "| weaponType     | 'sword'|'spear'|'bow'|'staff'|... | 武器形狀路由                 |\n";
        s += "| capeColor      | string (hex) | null              | 披風色；null = 無披風        |\n";
        s += "| tokenRadius    | number         | Token 圓形半徑                        |\n";
        s += "| deepColor      | string (hex)   | 深色調：陰影面 / 內層                 |\n";
        s += "| rimColor       | string (hex)   | 外框高光色                            |\n";
        s += "| rimShadowColor | string (hex)   | 外框陰影色                            | \n";
        s += "| iconColor      | string (hex)   | Role Icon 主色                        |\n";
        s += "| iconGlow       | string (hex)   | Role Icon 發光色                      | \n\n";
        s += "映射方式: UNIT_APPEARANCE[Team.BLUE | Team.RED].roles[Role.*]\n\n";
        s += "修改流程:\n";
        s += "  調整顏色/尺寸/風格  → data/units/appearance/imperial.ts 或 covenant.ts\n";
        s += "  調整繪製方式/動畫   → engine/renderers/units/factions/\n";
        s += "                        engine/renderers/units/painters/\n\n";

        s += "## 8. HUD 視覺管線 (HUD Visual Pipeline)\n\n";
        s += "### 8-1. 管線拓撲\n\n";
        s += "```\n";
        s += "GameEvent[]\n";
        s += "  └→ VisualSystem.flush()          [路由器 Facade，不持有外觀資料]\n";
        s += "       └→ EventHUDMapper.process() [事件 → addFloatingText 映射]\n";
        s += "            └→ HUDSystem           [FloatingText 物件池 + 物理更新]\n";
        s += "```\n\n";
        s += "### 8-2. 浮字類型\n\n";
        s += "| type         | 觸發事件       | 特殊行為                          |\n";
        s += "|--------------|----------------|-----------------------------------|\n";
        s += "| DAMAGE       | DAMAGE         | 隨機散射 (DAMAGE_TEXT_SCATTER)    |\n";
        s += "| HEAL         | HEAL           | 隨機散射                          |\n";
        s += "| CC           | CC_APPLIED     | 固定偏移 (STATUS_TEXT_OFFSET_X)   |\n";
        s += "| SHOUT        | CAST_START     | 跟隨單位移動，詠唱時間驅動 life   |\n";
        s += "| KILL_STREAK  | KILL_STREAK    | 全場唯一，觸發時清除舊實例        |\n\n";
        s += "### 8-3. 顏色來源 (SSOT 邊界)\n\n";
        s += "| 顏色用途         | 來源                                    |\n";
        s += "|------------------|-----------------------------------------|\n";
        s += "| 毒/DOT 傷害      | STATUS_VISUALS['POISON'].primaryColor   |\n";
        s += "| 回復文字         | STATUS_VISUALS['REGEN'].primaryColor    |\n";
        s += "| 技能詠唱文字     | event.skill.color (Skill 定義層)        |\n";
        s += "| 一般傷害         | event.color (combat 結算層)             |\n";
        s += "| 暴擊 (#ef4444)   | inline 業務規則 (val > 100)             |\n";
        s += "| 吸收 (#bae6fd)   | inline 業務規則 (text === 'ABSORB')     |\n\n";
        s += "### 8-5. 狀態效果視覺管線 (Status VFX Pipeline SSOT)\n\n";
        s += "SSOT 入口: `data/vfx/status_visuals.ts` → `STATUS_VISUALS`\n\n";
        s += "```\n";
        s += "StatusOrchestrator (路由器，負責放逐守門)\n";
        s += "  ├── GroundEffectPainter  ← floorColor / floorOpacity 動態讀自 STATUS_VISUALS\n";
        s += "  │     ├── DoT 地板色: DOT_COLORS[agent.dotType] (POISON/BURN/REGEN)\n";
        s += "  │     └── CC 地板光暈: POLYMORPH / FROZEN / INVINCIBLE\n";
        s += "  ├── OverheadPainter     ← iconShape 動態讀自 STATUS_VISUALS\n";
        s += "  │     └── 支援: STUN/SILENCE/ROOT/FEAR/TAUNT/BLIND/VULNERABLE/STASIS/INVINCIBLE/POLYMORPH\n";
        s += "  ├── ShieldPainter       ← SHIELD 護盾光環（⚠ 顏色目前仍由 agent.team 決定，SSOT 待補）\n";
        s += "  └── StateModelPainter   ← POLYMORPH(SHEEP) / FROZEN(ICE_BLOCK) / BANISH(透明)\n";
        s += "```\n\n";
        s += "修改流程：\n";
        s += "  調整任何 CC / DoT / Buff 的顏色、圖標、地板光暈  → data/vfx/status_visuals.ts\n";
        s += "  調整地板渲染行為（形狀、動畫）                    → GroundEffectPainter.ts\n";
        s += "  調整頭頂圖標渲染行為                              → OverheadPainter.ts\n";
        s += "  調整模型替換邏輯                                  → StateModelPainter.ts\n\n";

        s += "### 8-4. 佈局常數 (SSOT)\n\n";
        s += "HUD_TEXT_OFFSET / HUD_LAYOUT → constants.ts\n\n";
        s += "修改流程：\n";
        s += "  調整浮字顏色/大小    → EventHUDMapper.handleCombatText()\n";
        s += "  調整浮字物理行為     → HUDSystem.update()\n";
        s += "  調整佈局偏移常數     → constants.ts (HUD_LAYOUT)\n";
        s += "  調整毒/回復顯示色    → data/vfx/status_visuals.ts\n\n";

        s += "## 9. 資產快取層 (Asset Cache Layer)\n\n";
        s += "入口：engine/sprites.ts → SpriteManager\n\n";
        s += "職責：包裹 UnitFactory / EnvironmentFactory，提供 key-based HTMLCanvasElement 快取\n";
        s += "不持有繪製邏輯，只做快取存取。\n\n";
        s += "快取 Key 格式：\n";
        s += "  TOKEN_BASE_{team}_V3        → UnitFactory.generateTokenBase\n";
        s += "  ROLE_ICON_{role}_{team}_V3  → UnitFactory.generateRoleIcon\n";
        s += "  FULL_{role}_{team}          → UnitFactory.generateLayers\n";
        s += "  OBSTACLE_{styleKey}_{layout}→ EnvironmentFactory.generateObstacle\n";
        s += "  MODEL_SHEEP / MODEL_ICE     → UnitFactory.generateSheep / EnvironmentFactory.generateIceBlock\n\n";
        s += "修改流程：\n";
        s += "  調整單位外觀繪製邏輯 → engine/graphics/units/ImperialTokenFactory\n";
        s += "                          engine/graphics/units/CovenantTokenFactory\n";
        s += "  調整快取策略         → engine/sprites.ts (SpriteManager)\n";
        s += "  換新模型後需清除快取 → SpriteManager 內三個 Map 清空\n\n";
        s += "⚠️  美術優化注意事項：\n";
        s += "  SpriteManager 快取為純 session 記憶體（Map），\n";
        s += "  瀏覽器刷新即全部清空，無持久化機制。\n";
        s += "  修改 Factory 後直接重跑即可，不需要手動清除快取或更新版號。\n\n";

        s += "## 10. AI 戰術評估與大逃殺規避邏輯 (AI Evasion & Survival System)\n\n";
        s += "- 行為狀態 SSOT 架構 (ActionState SSOT Architecture):\n";
        s += "  - 引入 ActionState 枚舉作為代理人行為的單一真理性來源 (SSOT)。\n";
        s += "  - AnimationSystem 僅根據 ActionState 推導視覺動畫，實現邏輯與表現的徹底解耦。\n";
        s += "  - 關鍵狀態包含: IDLE, WALKING, ATTACKING, EVADING, CASTING, STUNNED, DYING。\n";
        s += "- 視覺系統時序編排 (Visual System Tick Orchestration):\n";
        s += "  - 視覺事件渲染 (flushVisualEvents) 強制在 Tick 循環的最末端執行，確保所有邏輯結算（包含位移與狀態變更）在 VFX 產生前已 100% 同步。\n";
        s += "- AI 更新頻率計量 (AI Update Frequency Metering):\n";
        s += "  - 引入 `aiUpdateTimer`，支持非同步心跳頻率。\n";
        s += "  - 不同單位可擁有不同的 `aiUpdateInterval`，在維持戰鬥流暢度的同時大幅優化大規模戰鬥下的 CPU 負載。\n";
        s += "- 恐懼位移解耦 (Fear Motion Decoupling):\n";
        s += "  - 獨立 `FearMoveTimer` 管理恐懼狀態下的隨機位移頻率，確保在 CC 狀態下即便 BT 被掛起，物理竄逃行為依然保持穩定。\n";
        s += "- 狀態驅動攔截器 (Survival Interceptor): 採用頂層優先級攔截器模式。一旦偵測到危險，AI 會切入 EVADING_URGENT 狀態，完全掛起下層的掃描、追擊與常規攻擊邏輯，直至抵達安全區或狀態解除，徹底消除決策震盪。\n";
        s += "- 動態危險預測 (Dynamic Danger Prediction): \n";
        s += "  - 運動投影: 基於 `physics.vx/vy` 與當前位移剩餘幀數 (`stuckTicks`) 進行物理投影，預判受力位移後的最終落點。\n";
        s += "  - 路徑終點檢定: 尋路過程中會同步驗證路徑終點 (TargetHex) 的安全性，防止單位主動走入未來的警告區域。\n";
        s += "- 精準對齊的致死詠唱中斷 (SSOT Casting Interruption): 建立基於地形坍塌計時器 (shrinkTimer) 與詠唱進度 (castTimer) 的競爭條件判定。若計算結果顯示無法在傷害生效前完成施法，系統將強制中斷高價值技能以優先保命，反之則維持施法以最大化 DPS。\n";
        s += "- 職責隔離的開路索敵 (Decoupled Path-Clearing): 逃生動作中整合了線型遮蔽掃描 (Line Raycast)。單位能自動識別通往安全路徑上的敵方路障，並將其定位為推拉技能的優先目標，而非依賴全域的 TargetingSystem 進行耦合判定。\n";
        s += "- 拓樸逃生尋路 (Topological Navigation): 尋路算法對高度差進行非對稱加權。向上攀爬依舊受 Jump 屬性嚴格限制，但向下跳躍被視為無成本戰術動作，賦予 AI 在危急時刻執行「戰術跳崖」的求生本能。\n";
        s += "- 型別絕對防禦 (Strict Type & Protocol Security): 核心服務 (如 SpatialProvider) 的所有傳輸與引數不再使用任何強制轉型 (as any)，而是運用 TypeScript 3.8+ 特定的實體推導與 import type 阻斷型別逃逸。\n";
        s += "- SSOT 真實高度算繪 (Absolute Terrain Projection): 所有飛行軌跡與特效繪製撤銷了基於舊幀紀錄緩存的高度臆測。直接由管線母體同步供應當前時間切片的絕對地形高度 (Absolute Terrain Z)，即便是瞬移與跨幀大距離移動都能完美貼合地表。\n";
        s += "- 介面隔離原則 (Interface Segregation / IoC): 對核心業務邏輯的相依性進行了精細切分。例如將日誌服務 (LogProvider) 從空間服務 (SpatialProvider) 中徹底剝離，使得諸如 StackingResolver 等子系統只依賴真正需要的行為，斬斷了因 GameEngine 單例膨脹而產生的耦合技術債。\n";
        s += "- 狀態快照與記憶體回收隔離 (State Snapshot & GC Boundary): 將戰鬥中為減少渲染與邏輯運算負擔而實行的「陣亡實體回收 (Garbage Collection)」機制，與「初始編制名冊 (Initial Roster Snapshot)」進行分離。確保戰場重置時 (Restart)，不會因為運行時優化機制而遺失參照，徹底保障重製功能的冪等性與狀態完整度。\n";
        s += "- 亞幀記憶體回收安全網 (Sub-Tick Garbage Collection Safety): 將陣亡實體的註銷延遲至當前 Tick 迴圈的最末端集中執行，消滅了因提早釋放參照導致同幀中後續系統 (如 StackingResolver) 讀取懸空指標或引發位移計算異常的邊界隱患。\n";
        s += "- 複合控制狀態競爭排解 (Concurrent CC Resolution): 實體同時掛載恐懼 (Fear) 與定身 (Root) 等多重干擾的極端情境，引入絕對層級覆蓋機制 (Strict Hierarchy Override)，徹底根除複數狀態在同一影格內競寫路徑與位移屬性所引發的抖動與死鎖。\n";
        s += "- 行為樹記憶機制與中斷器 (Behavior Tree Memory and Selector Interrupts):\n";
        s += "  - Selector 引入 runningIdx 記憶機制，大幅降低每幀重複評估高權重節點的效能損耗。\n";
        s += "  - 支援 interruptCount 前置攔截：死亡檢測 (Dead Check) 與 硬控檢測 (CC Check) 被設為不可跳過的「攔截哨兵」，確保即便在 RUNNING 逃生期間，被 STUN 或死亡時能立刻切斷逃生動作並執行正確的狀態等待。\n";
        s += "- 硬控詠唱熔斷 (Hard-CC Casting Fuse):\n";
        s += "  - 在 Wait Action 中偵測到 CC_INTERRUPTED 狀態時，強制執行「硬控熔斷」。\n";
        s += "  - 命中 STUN/BANISH/FEAR 的瞬間，castingSkillIdx 會被歸零並重置相關計時器，徹底打斷非法施法，且此中斷邏輯與「戰術逃生中斷」完全隔離。\n";
        s += "- 行為樹時序防抖與重入保護 (BT Stateful Debounce & Re-entry Guard): 在 EscapeWarning 等核心逃生行為中引入基於 escapeCooldown 的提早跳出 (Early-Exit) 與 RUNNING 狀態維持。完美解決了資料層防抖與行為樹每幀強制 tick 脫節所引發的「原地反覆決策死鎖 (Stand-and-Die)」現象。\n";
        s += "- 友軍危害排除與 SSOT 統一 (Friendly Hazard Immunity & SSOT Unification): 徹底將大逃殺底層生存判斷、背水一戰路徑淨空 (CastPushPull) 收攏至唯一真相來源 BTConditions[\"IsInWarningZone\"]，並在空間層面嚴格剃除同隊環境干擾 (Friendly Hazards)，確保多重法術堆疊下的 AI 避險動作絕不發生誤判與恐慌亂跑。\n";
        s += "- 偽隨機時間窗鎖定機制 (Buffered RNG Temporal Lock): 獨立緩存大逃殺隨機縮圈階段 (Final Phase) 的目標索引 (finalPhaseTargetKey)。防止在「警告 (Warning)」與「執行 (Execution)」的跨幀等待期間內因種子滾動而發生跳格翻轉，確保時序邊界上的絕對一致性。\n";
        s += "- 獨立數值控制防護層 (Immutable Shield Bypass): 將護盾 (SHIELD) 自控制減免矩陣 (Diminishing Returns) 中剝離，解決了後補增益意外干擾系統時序衰減的問題，維持單元邏輯封裝的純潔性。\n\n";

        s += "## 9. 控制流與戰鬥狀態機隔離 (Control Flow & Combat State Constraints)\n\n";
        s += "- AOE/單體目標智能陣營決別 (Smart Coalition Identification): 徹底重構以 power 與 ccType 聯合驅動的敵我識別防護機制。對於增益性技能 (power < 0 或 power === 0 且 isBuffCC) 與傷害/控場技能進行嚴格分流，阻斷將護盾 (SHIELD) 或持續恢復 (HOT) 施加於敵方標靶的架構性漏洞。\n";
        s += "- 被動與附帶增益的投射轉向 (Secondary CC Redirection): 在命中解析階段，對附帶自身增益的攻擊技能實施智能 ccTarget 重定向。在技能將增益效果派發給敵方目標前，自動反折向施法者，實現無縫的「打擊自防禦」攻防一體聯動。\n";
        s += "- 遞減回報嚴格閾值判定 (Strict DR Immunity Floor): 修正控制遞減矩陣的免疫容差，將乘積比重設定為 <= 0.25，確保「三次疊加後免疫」的數學設計確切發揮。\n";
        s += "- 狀態渲染的異步反抖技術 (Asynchronous Feedback Decoupling): 將視覺回饋的計時器狀態機以命名空間分離為 _dot 與 _hot。徹底根治複數週期狀態在同幀競爭單一輸出通道時發生的 UI 靜默與信息遮蓋問題，保證複合狀態結算的視覺保真度。\n";
        s += "- 互斥控制權競爭的絕對防禦 (Mutually Exclusive CC Override): 將基礎硬控場 (Stun) 疊加至最高層級的位移奪取過濾器中，實體上杜絕了在暈眩狀態下因底層恐懼 (Fear) 所引發的狀態越權與異常滑行現象。\n\n";

        s += "## 10. 投射物與戰鬥屬性精密計算 (Projectile & Combat Math Integrity)\n\n";
        s += "- 邏輯與視覺座標軸的降維打擊 (Hex-Logical AOE & Projectile Alignment): 徹底消滅投射物 AOE 判定的像素魔術數字 (Magic Numbers)。採用目標快取 (TargetHex Q/R) 取代視覺錨點 (UnitAnchor)，將 Projectile 落地判定的坐標系強烈約束於與即時技能完全相同的 HexArea 六角拓樸運算中，一併打通了 Hazard 地圖物件延伸渲染的任督二脈。\n";
        s += "- 死者實體快取追蹤 (Post-Mortem Projectile Caching): 引入拋射初期目標死結算快取機制。當導彈在飛行末期目標實體已被 Memory Clean 拋棄時，依然依靠 targetHex 緩存完成最後視覺爆破點與落點波及，杜絕投射物在目標死後回歸原點的情況。\n";
        s += "- 戰場疲勞期絕對縮放矩陣 (Sudden Death Scaling Strict Ordering): 重新調整 60 秒驟死機制的乘算順序。將 Execute (斬殺) 追加傷害計算明確前置於全局疲勞係數的乘法放流之前，保證角色血線檢定的純粹比例轉換，化解高時長下固定斬殺額度失真的防線崩潰。\n";
        s += "- 物理格擋之治療白名單 (Healing Bypass for Tank Mitigation): 於角色物理減傷階段 (Tank Block) 加入絕對的 !isHeal 判定。徹底阻止將友方支援或自身再生與護盾當作負能量進行抗性衰減，確保核心單體防禦者能夠足秤吃足醫療回報。\n";
        s += "- 單一爆擊判定 (Unified Sub-Cast Pre-roll): 對 AOE 多目標覆蓋重構單一物理判定 (Pre-roll Crit)。使法術發動的瞬間便決定此輪波次是否爆擊，避免同次火雨部分產生紅字爆擊而其餘為一般傷害的機率剝離，還原了古典戰棋技能結算的實體張力。\n\n";

        s += "## 11. 生存法則與逃生路由系統 (Survival Protocol & Escape Routing)\n\n";
        s += "- 逃生起點剔除機制 (Escape Origin Elimination): 修復 A* 在危險邊界起步時立刻當前格認證通過而返回原地的判定失誤。要求演算法嚴格跳過起點格子進行「安全審查」，強制展開尋路，切斷了單位立於危險交界「站著等死」的致命發呆行為。\n";
        s += "- 求生獨立決策代理 (Autonomous Escape Proxying): 移除 'EscapeWarning' 高壓生存期內對一般對話層 'updateTarget' 的呼叫依賴，改於行為樹局部直接向 'Pathfinder' 發起緊急空投調度。斬斷了 'Targeting' 在預測態與發作態的落差下產生的目的地重置邏輯矛盾。\n";
        s += "- 物理碰撞覆蓋 (Escape Squeeze Proxy): 在 'moveAgentToHex' 底側徹底解放 'spatial.isBlocked' 對奔逃路徑的僵化否決，若遭遇友軍甚至敵軍，皆允許轉入 NodeState.RUNNING，透過 'MotionEngine' 推進進度，觸發 'StackingResolver' 的彈性推擠機制，根絕 AI 因為路徑遇敵而卡死原地站立等死的致命死鎖。\n";
        s += "- 管線化陣亡視覺殘留 (Deferred Garbage Collection for VFX): 將 'GameEngine' 清理 fullyDead 單位的過濾器推遲至 Tick 循環最前端執行，確保同一幀產生的 DEATH event 進入 Renderer / 'EventVFXMapper' 解析時不會遭遇實體無法索引之「視覺蒸發」空窗。\n";
        s += "- 死亡記錄除多工流 (Death Handling Demultiplexer): 引入 'deadLogged' 屏障，將戰場邏輯回收 (unregister / fullyDead) 與視覺日誌脫鉤。阻止同一影格遭受多重致死判定 (縮圈崩塌、物理落傷) 而重複發送死亡 VFX 與日誌。\n";
        s += "- 雙零殭局防護 (Mutual Destruction Intercept): 在 VictorySystem 引入與單邊獲勝均等的雙零 (blue === 0 && red === 0) 平局收口檢定。拔除戰局中最後兩人同歸於盡所引發的無限輪迴假死狀態。\n";
        s += "- 狀態復原之無干涉防護 (Cooldown-Safe Fast Exit): 當單元進入安全區且 escapeCooldown 結束後，系統會自動歸還決策權給戰術核心，避免無謂的狀態鎖定。\n";
        s += "- 背水一戰狀能維續 (Last Stand State Persistence): 在 CastPushPull 執行移動前即標記 LAST_STAND_PUSH 狀態，確保行為樹的記憶恢復邏輯即使在移動中斷後也能穩定找回戰鬥目標。\n";
        s += "- 全鏈路危險塗層感知 (End-to-End Hazard Awareness): 在尋路終點鑑定及舊路還魂的複檢迴路 (moveAgentToHex Validation) 雙向置入 'spatial.getSpatialHazardsAt' 的敵意矩陣審查。徹底支援單一網格內的多重疊加危害 (Multiple Hazards on single Hex)，實體上掐滅了避開縮圈落入複合火坑的連續判定真空。\n";
        s += "- 目標板塊安全雙重驗證 (Target Hex Secondary Verification): 強化行為樹逃生目標判斷，除了靜態地形塌陷外，執行移動前嚴格檢查敵方所有 hazards 動態部署，徹底阻止「逃出毒圈卻踏進複合火場」的決策延遲。\n";
        s += "- 移除板塊失效斷言 (Tile Invalidation Assertion): 行為樹 Condition 與 Action 現具備物理邊界檢查，若單位因位移慣性暫留在已移除 (isRemoved) 的板塊上，系統會強制拋出危險信號並刷新路徑，終止單位在虛無空間發呆。同時，逃生目標檢定新增 `engine.map.isValid` 驗證，從源頭切斷對不存在座標的移動請求及相關邏輯死鎖。\n\n";

        s += "## 12. 背水一戰：終局決算機制 (Last Stand: Final Resolution)\n\n";
        s += "當戰場縮減至僅剩唯一安全網格（Last Stand Trigger）時，系統會切入極端決算模式，以強制結束僵局：\n\n";
        s += "1. 數值管線熔斷 (Combat Pipeline Override):\n";
        s += "   - 防禦與治癒禁絕: 關閉所有護盾 (Shield) 吸收、格擋 (Block) 減傷。治癒類技能 (Heal) 的有效輸出強制歸零。\n";
        s += "   - 絕對穿透 (Absolute Penetration): 攻擊行為無視致盲 (Blind) 導致的 Miss 判定。攻擊者獲得 100% 命中率。\n";
        s += "   - 斬殺倍率 (Execute Multiplier): 所有有效傷害疊加 3.0x 全局乘數，使戰鬥迅速轉化為「一擊必中，中者即死」的終局態勢。\n\n";
        s += "2. 空間與尋路死鎖解鎖 (Spatial & Pathing Overrides):\n";
        s += "   - 碰撞體積覆寫 (Collision Override): 在最後安全格內，系統自動解除 StackingResolver 的位移排斥檢定，允許所有存活單位座標完全重疊，防堵物理體積導致的尋路死鎖。\n";
        s += "   - 向心脈衝牽引 (Centripetal Pull): MotionEngine 會對外圍尚未入陣的單位施加瞬時向心向量（Pull Vector），強制將其拖拽入中心格，阻斷任何形式的消極拖延。\n\n";
        s += "3. 視覺與渲染優先權 (Visual & Rendering Pipeline):\n";
        s += "   - 螢幕淨空 (Visual Continuity): 廢除干擾性的大型光柱或震動。採用貼地的高頻呼吸脈衝 (HEX_WARNING_PULSE) 與全螢幕邊緣血紅暗角 (Red Vignette) 進行狀態暗示，將螢幕中心的核心視野 100% 留給戰鬥結算。\n";
        s += "   - 地向衝擊回饋 (Ground EMP Shockwave): 單位入陣瞬間觸發一次性貼地衝擊波 (FX_LAST_STAND_LOCKED)，提供強烈的物理回饋感。\n\n";
        s += "---\n";
        s += "> END OF SPECIFICATION - SYSTEM ARCHITECT SIGNED\n";
        return s;
    }
}
