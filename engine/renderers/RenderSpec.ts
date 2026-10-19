// ╔══════════════════════════════════════════════════════════╗
// ║  RenderSpec — 渲染座標協議 SSOT（層序、排序鍵、座標、錨點）║
// ║  職責：記錄所有「位置／高度／排序／發射點」規則的唯一文件 ║
// ║  上游：RenderList.sort（SUB_LAYER）、VisualMath（錨點）、  ║
// ║        RenderPipeline（繪製用地面高度）、UnitFrame（單位）  ║
// ║  [ARCH] 改到任何一條規則，必須在同一個 commit 更新本檔與  ║
// ║  受影響檔案的方框檔頭；tests/CoordinateProtocol.test.ts   ║
// ║  以只減不增的基準擋住偏離。                                ║
// ╚══════════════════════════════════════════════════════════╝

export class RenderSpec {
    static generateSpec(): string {
        let s = "# TACTICAL.OS — 渲染管線座標協議 (Renderer v2.0, 2026-10-17)\n\n";
        s += "本文件是位置、高度、排序與發射點的唯一規格。各檔方框檔頭（職責／上游／[ARCH]）是它的局部說明。\n";
        s += "改到任何一條規則，必須在同一個 commit 同步更新本檔與受影響檔案的檔頭；tests/CoordinateProtocol.test.ts 擋住偏離。\n\n";

        s += "## 1. RenderOp 層序總表 (Layer Order SSOT)\n\n";
        s += "唯一定義點：RenderList.ts 的 SUB_LAYER。排序鍵：\n\n";
        s += "  finalSortY = op.y + op.sortBias ＋ tiebreak（CORPSE +0.5、VFX／PROJECTILE +1.0）\n";
        s += "  sortKey    = floor((finalSortY + 10000) * 100) + subLayer\n";
        s += "             空中 VFX／PROJECTILE／AURA：**高度 z 不進鍵**；鍵 = 足跡 Y ＋ 固定前緣 AIR_SORT_BIAS（§2），對粒子壽命單調\n";
        s += "             ＋ UNIT：agent id 雜湊 * 0.00001（同鍵決定性）\n";
        s += "             ＋ 奧義或 z > 600：+1e8（永遠在最上層）\n\n";
        s += "subLayer 只決定「同一個 Y 桶」內的先後；跨格遮擋由 finalSortY 決定（相鄰格 Y 差約 24 px，tiebreak 必須遠小於它）。\n\n";

        s += "| RenderOpType     | subLayer | 描述 |\n";
        s += "|------------------|----------|------|\n";
        s += "| TERRAIN          | 10       | 地塊本體＋地表細節＋地塊狀態疊層＋蓋到這格的貼地鋪設特效（§9，不是獨立 op） |\n";
        s += "| HAZARD           | 30       | 持續性空間危害（熔岩、毒沼、冰封、重力場；HazardPainter 零件層，錨點＝格子頂面中心，flat 層 ≤ HAZARD_RENDER.FLAT_MAX_RADIUS） |\n";
        s += "| VFX (isGround)   | 32       | 一般貼地特效（小型平貼、直立的柱／光束／結界），不套 z-boost；大型平貼特效改走 §9 |\n";
        s += "| AURA             | 38       | 單位施法圈 |\n";
        s += "| OVERLAY          | 42       | 射程、懸停、警告、背水一戰 |\n";
        s += "| OBSTACLE         | 44       | 地形障礙物 |\n";
        s += "| UNIT             | 46       | 角色（棋座＋核心＋角色投影） |\n";
        s += "| CORPSE           | 48       | 死亡單位（擊飛、淡出） |\n";
        s += "| VFX (air)        | 50       | 空中特效，套 z-boost |\n";
        s += "| PROJECTILE       | 50       | 投射物，套同一套 z-boost |\n\n";

        s += "--- \n\n";

        s += "## 2. sortBias 協議 (sortBias Protocol)\n\n";
        s += "sortBias 是「視覺前緣補償」：不改變 op.y 的意義，只把排序用的 Y 往前推。只抬不降（唯一例外：UNIT／CORPSE 的腳點死區，見下）。\n\n";
        s += "| 提交者 | op | sortBias |\n";
        s += "|--------|----|----------|\n";
        s += "| GridRenderStrategy | TERRAIN、OBSTACLE、HAZARD | 0 |\n";
        s += "| GridRenderStrategy | OVERLAY | 0（畫在格子頂面，同格先於障礙與單位；2026-10-18 拿掉半格前緣） |\n";
        s += "| UnitSystem | AURA | VFX_RENDER.AIR_SORT_BIAS（op.y＝UnitFrame.sortFootY，死區濾波後的足跡 Y，不含高度；光環是掛在施法者身上的空中效果，鍵比施法者高一個前緣，永遠排在施法者與腳下格之後） |\n";
        s += "| VFXRenderer | VFX (air)、PROJECTILE | VFX_RENDER.AIR_SORT_BIAS（HEX_SIZE * 0.5）：空中物件當作站在它飄過那一格的前緣；粒子高度 z 不進鍵 |\n";
        s += "| VFXRenderer | BEAM（光束） | AIR_SORT_BIAS ＋ max(0, 終點螢幕 Y − 起點螢幕 Y)：以兩端中最靠前的足跡排序，整條畫在經過的地塊之後（2026-10-18） |\n";
        s += "| UnitSystem（值來自 UnitFrame） | UNIT、CORPSE | max(死區濾波後的腳點 Y, 排序用腳下格格心 Y) − 腳 Y：腳進入前方格時，排在該格地塊之後（排序用腳下格帶滯後與腳點死區，見下）。濾波使它可為 ≥ −SORT_DEADBAND_PX 的小負值，但鍵永遠不低於腳下格格心 |\n";
        s += "| VFXRenderer | VFX (isGround) | gHalfH + VFX_RENDER.GROUND_SORT_BIAS（法陣前緣） |\n\n";
        s += "**排序用腳下格帶滯後**（UnitFrameStore 的視覺狀態：每個單位上一幀的排序格）：腳點原始所在格與記憶格不同時，\n";
        s += "只有「到新格格心的距離 + UNIT_FRAME.HEX_HYSTERESIS_PX < 到記憶格格心的距離」才切換；離記憶格超過一環（瞬移、擊飛）立即切換；\n";
        s += "腳點連續 UNIT_FRAME.HEX_RELEASE_FRAMES 幀待在同一個錨點 STILL_PX 內（累積位移）也切換，每次靜止只放開一次（停在格界的單位／屍體不會卡在舊格而被自己腳下的地塊蓋住，也不會隨次像素抖動來回跳，2026-10-19）。\n";
        s += "否則 sortBias 在格界上是鋸齒函數（腳壓著格界走，鍵每幀跳約半格）。高度（getUnitGroundHeight）不受影響，只有排序格有滯後。\n";
        s += "記憶只在 UnitFrameStore 內，單位不在列表時清除。\n\n";
        s += "**腳點死區**（UNIT_FRAME.SORT_DEADBAND_PX＝2）：排序用腳點 Y 離上次採用的值不超過死區就不動，超過才跟隨（落後 ≤ 死區）。\n";
        s += "根因：受擊後退是 PhysicsEngine 的彈簧（applyImpulse 的 HIT_IMPULSE 衝量），physics.y 擺盪約 1～2 px——真實位移、不是 bug、肉眼不可分辨；\n";
        s += "連續的鍵卻會讓靜止的單位在鄰近的鍵（屍體 0.5 px 平局值、法陣粒子）兩側來回穿越。死區只作用在排序鍵：op.y／op.ty（繪製）仍是真實腳點。\n";
        s += "鍵＝max(濾波後腳點, 腳下格格心)，所以單位永遠排在自己腳下那格地塊之後。\n\n";
        s += "**空中物件的鍵（VFX air、PROJECTILE、AURA）= 足跡 Y ＋ 固定 AIR_SORT_BIAS，不含高度 z**。足跡 Y 是粒子在地面的投影（op.y），\n";
        s += "高度只影響繪製位置（op.ty）。舊的 `op.z * 20`（z > 0）與固定 `+60`（z == 0）和 y*100 互相抵銷，往下掉的碎片鍵在鄰居兩側來回，\n";
        s += "相對地塊／單位／疊層逐幀翻轉（docs/COORD_GUARD_FINDINGS.md H3）。現在掉落的碎片 y 不變則鍵不變，水平移動則鍵單調，\n";
        s += "對任何靜止物件最多翻轉一次。投射物的 op.z = 5000 + 高度是刻意的：z > 600 的 +1e8 讓它永遠在最上層。\n";
        s += "AURA 去掉舊的 `高度 * TERRAIN_SORT_SCALE`（證據：docs/COORD_GUARD_FINDINGS.md §8，景深預言判 AURA 的穩定錯序 361 → 70）。\n\n";
        s += "**沒有「法陣抬升」**：舊規則（RenderList.sort 把站在大型法陣橢圓內的單位／屍體的鍵抬到法陣前緣之後）已移除——它隨法陣生滅、縮放而開關，\n";
        s += "是 docs/COORD_GUARD_FINDINGS.md 量到的 85% 排序震盪。單位站在法陣後半需要「前緣格 < 法陣 < 單位 < 前方地塊」，這是環，沒有任何單一排序鍵能滿足；\n";
        s += "解法是讓法陣不再是獨立排序單位（§9）。\n\n";
        s += "**繪製時才套用的位移必須進排序鍵**（腳點 op.y 含 physics.y 與屍體擊飛滑行；腳下格以含位移的腳點判斷）。\n";
        s += "唯一例外是 §5 漂浮位移：整片地形一起起伏，相鄰格相位差很小，不改變前後關係，所以不進排序鍵。\n\n";

        s += "--- \n\n";

        s += "## 3. 座標系 (Coordinate Spaces)\n\n";
        s += "世界座標（px, py）是 HexUtils.toPx 的輸出：已經是等角投影後的螢幕平面座標，高度另計。\n\n";
        s += "visualBaseY    = py + transitionOffset           地塊足跡 Y。TERRAIN／OVERLAY 的 op.y 與 op.ty\n";
        s += "visualSurfaceY = getIsoVisualY(visualBaseY, h)   地塊頂面 Y。OBSTACLE／HAZARD 的 op.ty\n";
        s += "OBSTACLE／HAZARD 的 op.y = visualBaseY：與地塊、單位同一把尺，高度不進排序鍵\n";
        s += "  （2026-10-18 依 docs/DEPTH_ORDER_FINDINGS.md 拿掉 h*0.7：它讓高台上的障礙／危害蓋住同一座高台上前方的單位）\n";
        s += "OBSTACLE 精靈錨點＝格子中心地面點，對齊 (op.tx, op.ty)：預渲染圖集讀 public/assets/obstacles/manifest.json 的 ax／ay\n";
        s += "  （ObstacleSpriteStore，依 q,r 雜湊選變體）；未載入時退回程序化 ENV_SPRITE.ANCHOR_X／Y。精靈高度不影響排序。\n";
        s += "AURA 的 op.y = 施法者腳點 Y（sortY）：同樣不含高度（§2）。TERRAIN_SORT_SCALE 與 terrainSortY 已不存在，沒有任何 op 的排序 Y 含高度。\n\n";
        s += "單位（UnitFrame 計算，UnitSystem 提交；見 §4）：\n";
        s += "  op.tx = px + physics.x（屍體再加擊飛滑行 x）\n";
        s += "  op.y  = py + physics.y + transitionOffset（屍體再加擊飛滑行 y）＝腳點，排序用\n";
        s += "  op.ty = op.y − 腳下地面高度（§4 getUnitGroundHeight；屍體用 computeDeathGround）\n";
        s += "  physics.z（跳躍、飛行）在繪製時再往上扣，不進 op.y。\n\n";
        s += "VFX 粒子：p.y 是「未投影 Y」＝螢幕 Y / ISO_SCALE_Y（VFXPlayer 存入時除、VFXRenderer 提交時乘回）；p.z 是世界高度（含地形）。\n";
        s += "投射物：startY／endY 是螢幕 Y，ProjectileRenderer 內轉成未投影 Y 插值後再乘回。\n\n";
        s += "事件座標（GameEvent.pos）：xy 是「發生在哪」的世界座標；pos.z 若存在，**一律是世界高度**（模擬高度，\n";
        s += "engine.getTerrainHeight 的尺度，單位事件含 physics.z 空中高度），沒有 z＝地面上某處，由消費端查該格高度。\n";
        s += "發射端只能用 engine/events/EventPos.ts 的 unitEventPos／hexEventPos／pointEventPos 建構（§4），不手寫 pos 字面量。\n";
        s += "視覺端一律以 sourceId／targetId 經 §4 的 SSOT 函式解析活著的單位；單位已死／出局時才用 pos，\n";
        s += "並只加身體中心偏移，不再加地形高度（EventVFXMapper.resolvePoint）。\n\n";
        s += "像素對齊（2026-10-19）：RenderDispatcher 對 op.tx／op.ty 做「裝置像素」對齊——RenderPipeline.drawWorld 在套好相機變換後\n";
        s += "呼叫 RenderDispatcher.setDeviceGrid(ctx) 記下縮放與平移，snap(v)＝(round(v×縮放＋平移)−平移)／縮放；變換含旋轉／非等比時不對齊。\n";
        s += "以前在世界座標取整數，相機縮放非整數時每格各偏 0～1 個實際像素，格線參差、移動時抖動。TerrainRenderer.drawBlock 不再自行 Math.floor。\n";
        s += "只動繪製點，不動排序鍵 op.y。每幀繪製的主畫布與貼地離屏 imageSmoothingQuality＝RENDER_QUALITY.IMAGE_SMOOTHING（low；high 會讓幀時間加倍），\n";
        s += "一次性烘焙畫布（CanvasUtils.createCanvas）用 high。\n\n";

        s += "--- \n\n";

        s += "## 4. SSOT 錨點函式 (Anchor Helpers, engine/math/VisualMath.ts)\n\n";
        s += "禁止在繪製、特效、HUD 程式碼裡自己用 getTerrainHeight(agent.q, agent.r) 算單位高度。\n\n";
        s += "| 用途 | 函式 | 定義 |\n";
        s += "|------|------|------|\n";
        s += "| 單位腳下地面高度 | getUnitGroundHeight | 邏輯格高度；移動中依 UNIT_STEP_BLEND 過渡；精靈實際所在格較高時取較高者（腳不陷進柱子） |\n";
        s += "| 投影中心 | projectionCenterAt(x, y, 腳下高度, physics.z, 體型) | 腳下高度 + physics.z + projectionCenterHeight(體型)；高度＝精靈腳底懸浮 + 頭頂高度 × centerFraction（頭頂高度＝UNIT_SPRITE.targetHeightCanvasUnits × 體型 heightScale，data/units/appearance/projection.ts，從精靈資料推導，不依賴圖集，模擬端可直接讀）。**發射點、受擊點、核心寶石都是這一點** |\n";
        s += "| 受擊點／身體中心 | getUnitAnchor | ＝投影中心 |\n";
        s += "| 施法／投射物／光束起點 | getCoreAnchor | ＝投影中心（與受擊點同一點，沒有水平位移；飛行單位從身體中心發射，含 physics.z）。核心寶石投影成形後藏在這裡，所以「從核心出發」與「從投影中心出發」是同一件事 |\n";
        s += "| 投影中心（繪製） | getProjectionCenterY(腳底繪製 Y, physics.z, 體型) | 腳底繪製 Y − physics.z − projectionCenterHeight(體型)；UnitCorePainter 用，與上列同一個高度公式 |\n";
        s += "| 血條錨點 | UnitFrame.hudAnchorY（hudBarHeight） | 腳底繪製 Y − physics.z − (頭頂高度 + HUD_ANCHOR.barHeadMargin)；血條上緣在錨點之上 5px。量表（GaugePainter）與頭頂狀態圖示（錨點之下 HUD_ANCHOR.overheadBelowBar，落在頭頂上方）都掛在它上面 |\n";
        s += "| 狀態零件層（StatusPartPainter） | GROUND／BODY／HEAD 三種錨點（data/vfx/status_parts.ts） | 全部讀 UnitFrame 與 projection SSOT：GROUND＝floorY − physics.z（腳下，貼地層半徑 ≤ STATUS_PART_RENDER.GROUND_MAX_RADIUS，因為狀態在單位之後的總覽層繪製、不做 §9 鋪設，必須待在腳下那格）；BODY＝投影中心（floorY − physics.z − projectionCenterHeight）；HEAD＝頭頂（projectionTopHeight）+ STATUS_PART_RENDER.HEAD_MARGIN，頭頂標記擠在頭與血條之間，同一單位只畫優先序最高者。繪製順序：GROUND → BODY → HEAD。層格式與繪製共用 PartLayerPainter（危害也用）。護盾由 ShieldPainter 畫 prism 零件，底面＝腳底、高度＝頭頂＋headMargin（computeShieldGeometry） |\n";
        s += "| 浮動文字基準線 | hudTextHeight | 血條錨點 + HUD_ANCHOR.textGap（傷害數字、詠唱字、KILL_STREAK；EventHUDMapper 依事件主角的體型取值） |\n";
        s += "| 精靈繪製原點 | getVisualBodyCenterY(腳底繪製 Y, physics.z) | 腳底繪製 Y − physics.z − UNIT_BODY_OFFSET − UNIT_HOVER_OFFSET。**這是 UnitBodyPainter／護盾／包裹類狀態的繪製原點（精靈腳底落在它之下 42px，見 UNIT_SPRITE.footOffsetLocal），不是投影中心**：投影中心在腳底之上頭頂高度的一半（目前約 29.5px），繪製原點在腳底之上 42px。UNIT_BODY_OFFSET／UNIT_HOVER_OFFSET 只剩這個繪製慣例與護盾稜柱貼地在用，錨點不再讀它們 |\n";
        s += "| 地面目標點 | resolveTargetPoint（ground-q,r） | 格高 + 2 |\n";
        s += "| 漂浮位移 | floatBobAt／isFloatingBiome | 見 §5 |\n";
        s += "| 單位事件位置 | unitEventPos（engine/events/EventPos.ts） | xy＝px+physics；z＝getUnitGroundHeight（模擬高度）+ physics.z |\n";
        s += "| 格子事件位置 | hexEventPos | 六角格中心；z＝getTerrainHeight(q, r) |\n";
        s += "| 純 2D 事件位置 | pointEventPos | 只有 xy（無 z），消費端自查該格高度 |\n\n";
        s += "**單位的繪製座標只有一個出處：UnitFrame**（engine/renderers/frame/UnitFrame.ts）。RenderPipeline 在 drawWorld 開頭用繪製用高度函式建一次\n";
        s += "UnitFrameStore，每個單位一份：footX／footY（含 physics、屍體擊飛）、transition、groundH（拖曳預覽＝游標格；屍體＝computeDeathGround）、\n";
        s += "floorY、drawY（＝UNIT op.ty）、sortY（＝op.y）、sortBias、bodyCenterY（繪製原點）、hudAnchorY（血條錨點）。UNIT／CORPSE／AURA 提交、剪影、血條、狀態、\n";
        s += "選取連線只讀 frames，**拿不到地形高度函式**，所以無法自己重算；engine/renderers 內只有 UnitFrame.ts 可以呼叫 getUnitGroundHeight（棘輪測試擋住）。\n";
        s += "HUD、狀態用不含轉場位移的 floorY／hudAnchorY（沿用原行為）。模擬端（EventVFXMapper、AgentVFXSystem、hud.ts SHOUT 跟隨）在 tick 內執行，\n";
        s += "讀不到每幀快照，維持用下表的模擬高度函式。\n\n";
        s += "**核心寶石（UnitCorePainter）**：投影可見（活著、出生動畫結束、非拖曳預覽）時畫在投影中心，在角色之後（上層）、低不透明度（CORE_VISUAL.projectedAlpha），\n";
        s += "施法時光暈拉高（projectedCastGlow）；位置＝getProjectionCenterY，再加純繪製位移（受擊晃動 visualOffset），跟著 physics.z 與 §5 漂浮（單位整體一起浮）。\n";
        s += "投影不可見（編輯模式拖曳預覽、放置幽靈、出生前）維持實體寶石，懸在棋座上（CORE_VISUAL.hoverHeight）；出生動畫期間依 spawnTimer 從棋座升到投影中心並淡出成內光。\n\n";
        s += "高度有兩種：模擬高度 engine.getTerrainHeight（物理、AI、事件）與繪製用高度（RenderPipeline 傳給各繪製端的 getTerrainHeight，\n";
        s += "＝模擬高度 − 該格漂浮位移）。單位、屍體、狀態、HUD、貼地特效用繪製用高度；模擬端永遠不讀繪製用高度。\n\n";

        s += "--- \n\n";

        s += "## 5. 漂浮位移 (Floating Bob: VOID／MAGMA)\n\n";
        s += "唯一實作 VisualMath.floatBobAt(格心 x, 格心 y, battleTime)，參數 FLOAT_BOB（constants.ts），取整數像素，正值往下。\n";
        s += "- 地塊、障礙、危害、射程疊層：GridRenderStrategy 把位移加在 op.ty（不加在 op.y）。\n";
        s += "- 單位、屍體、狀態、HUD、剪影：從繪製用高度自動取得（RenderPipeline 的高度函式扣掉位移）。\n";
        s += "- 貼地特效、貼花：VFXRenderer 以「模擬高度 − 繪製用高度」補到 op.ty。\n";
        s += "- 不套用：空中特效粒子、發射點／受擊點（模擬端座標，不含漂浮）；排序鍵一律不含位移。\n";
        s += "- 發射點與投影中心的對齊（繪製時補償，模擬端不動）：位移取自「模擬高度 − 繪製用高度」（＝該格的 floatBobAt）。\n";
        s += "  投射物：ProjectileRenderer 把發射格目前的位移加在繪製位置與尾跡，權重由 1 線性淡出，飛行進度 t 到 FLOAT_BOB.LAUNCH_FADE_T 時為 0。\n";
        s += "  光束：VFXRenderer 把起點格位移加在 op.ty、終點格與起點格的位移差寫進 Particle.beamEndDy（PartPainter.drawBeam 讀），兩端各跟自己的投影中心。\n";
        s += "- 地形 sprite 快取鍵不含位移（TerrainBlockCache 固定傳 0），否則每個縮放級距上千種組合（docs/PERF_LIFECYCLE_FINDINGS.md）。\n";
        s += "驗證：node tools/ui-e2e/float-align-probe.mjs --biome=VOID（單位與腳下地塊的距離必須恆定）。\n\n";

        s += "--- \n\n";

        s += "## 6. 技能視覺欄位 → 繪製路徑 (Skill Visual Fields → Painter Route)\n\n";
        s += "技能（data/skills/**）有四個視覺欄位，每個都指向一張 SSOT 表；tests/ReferenceIntegrity.test.ts 與開機時的 VFXValidator 檢查全部引用：\n\n";
        s += "| 欄位 | 指向 | 繪製 |\n";
        s += "|------|------|------|\n";
        s += "| visualHitEffect | VFX_REGISTRY（data/vfx/registry/**，全部是零件） | 粒子 → ParticleRenderer → PartPainter（後端由 constants.ts PARTICLE_TRAITS 決定） |\n";
        s += "| visualProjectileEffect | PROJECTILE_VISUALS（data/vfx/projectile_visuals.ts） | ProjectileRenderer 提交 PROJECTILE op（§1、§3）→ 投射物繪製器 |\n";
        s += "| 奧義原型（ult_visuals.ts）／序列（SkillSequences.ts） | VFX_REGISTRY 鍵＋BEAM_STYLES 鍵（beam_styles.ts） | SequenceSystem 排動作；光束 → PartPainter.drawBeam（光束零件） |\n";
        s += "| visual（ARROW／FIREBALL／BOLT／SLASH／SMASH／BEAM／BOMB） | 圖示與後備外觀鍵 | 技能圖示（UIFactory，量表 GaugePainter 與 Inspector 共用）；沒有 visualProjectileEffect 時當投射物外觀鍵 |\n\n";
        s += "粒子後端只有一個出處：constants.ts 的 PARTICLE_TRAITS（PART／PART_GROUND／PART_DEBRIS 走零件；BEAM 掛光束零件；\n";
        s += "天氣也是 PART 粒子（VFXAmbience，T4）；其餘舊型別只畫洋紅除錯點，tests/VFXBackend.test.ts 以只減不增的棘輪擋住）。\n\n";
        s += "單位本體外觀不在本表：陣營外觀唯一入口是 data/units/factionSkin.ts 的 getFactionSkin（docs/FACTION_SLOTS.md），\n";
        s += "精靈圖集與體型在 data/units/appearance/（sprite.ts、bodyTypes.ts、projection.ts），棋座顏色在 appearance/imperial.ts、covenant.ts。\n\n";

        s += "--- \n\n";

        s += "## 7. isGround 旗標語意 (isGround Semantics)\n\n";
        s += "isGround 由 VFX_GROUND_TYPES 決定，是排序行為與 Painter 路徑的分類旗標。\n\n";
        s += "- isGround = true：subLayer 32，不套 z-boost；op.z = max(p.z + GROUND_Z_BIAS, GROUND_Z_BIAS)，\n";
        s += "  繪製位置再扣 GROUND_VISUAL_BIAS（只動 op.ty，不動排序用 op.y）。isGround 且型別在 GROUND_DRAPE.MODE、\n";
        s += "  gHalfH ≥ GROUND_DRAPE.MIN_HALF_H 的粒子不產生 op，走 §9 鋪設\n";
        s += "- isGround = false（空中特效、HEX_PRISM、護盾、平面空中 Billboard）：subLayer 50，sortBias = VFX_RENDER.AIR_SORT_BIAS，\n";
        s += "  z 不進排序鍵（z > 0 與 z == 0 同一規則；op.z 只用於 z > 600 的 +1e8 與繪製）\n\n";

        s += "--- \n\n";

        s += "## 8. 新增渲染類型或改座標規則的標準作業流程 (SOP)\n\n";
        s += "缺少任何一步均視為未完成：\n";
        s += "1. RenderList.ts：在 RenderOpType enum 新增值、在 SUB_LAYER 取得一個 subLayer\n";
        s += "2. RenderList.ts：確認 RenderOp.clear() 重設了新欄位\n";
        s += "3. 提交端（Strategy/System）：op.y＝足跡 Y（含所有繪製時位移，§2）、op.ty＝繪製 Y、高度取自 §4 的 SSOT 函式\n";
        s += "4. RenderDispatcher.ts：新增 case\n";
        s += "5. 本文件：更新層序表、sortBias 表或座標章節\n";
        s += "6. 受影響檔案的方框檔頭（職責／上游／[ARCH]）同步更新\n";
        s += "7. npm test（含 tests/CoordinateProtocol.test.ts）；動到畫面再本機實跑截圖\n";
        s += "※ 若涉及單位外觀（非 VFX），改 data/units/appearance/ 的 RoleAppearance，而非新增 RenderOpType。\n";

        s += "\n--- \n\n";

        s += "## 9. 貼地鋪設 (Ground Drape, FFT 風格)\n\n";
        s += "大型平貼特效（法陣、震波、龜裂…）是一張橫跨多格、高度可能不同的圖；它和站在上面的單位、前方高地塊之間沒有一致的單一排序。\n";
        s += "所以它不再是 RenderList 的 op，而是和 FFT 的範圍標記一樣**鋪在它蓋到的每一格頂面**：\n\n";
        s += "- 登記：VFXRenderer.submitRenderables 對符合條件的粒子呼叫 GroundDrapeLayer.add（engine/renderers/GroundDrape.ts，每幀 begin，池化）。\n";
        s += "  條件：粒子型別在 GROUND_DRAPE.MODE，且投影後半高 ≥ GROUND_DRAPE.MIN_HALF_H。其餘貼地特效維持 §1 的 VFX (isGround) op。\n";
        s += "- 繪製：RenderDispatcher 的 TERRAIN 在地塊、地表細節、基礎疊層之後呼叫 GroundDrapeLayer.drawOnTile：以足跡座標判斷哪些格被蓋到，\n";
        s += "  裁切到該格頂面六邊形（半徑 + CLIP_EXPAND_PX，相鄰格重疊避免接縫），特效的地平面貼在該格頂面：\n";
        s += "  y = 特效足跡 Y（含轉場位移）+ 該格漂浮位移（TERRAIN op.ty − op.y）− 該格高度（op.th）。所以橫跨不同高度的法陣在每格各自貼合頂面，VOID／MAGMA 跟著地塊浮動。\n";
        s += "- 掉落中的地塊（op.z < 0）不畫鋪設特效。\n";
        s += "- 模式：DIRECT＝每格裁切後直接畫粒子（單一 drawImage／少量填色，混合模式與原本一致）；OFFSCREEN＝多段描邊的向量特效，每幀只畫一次到池化離屏畫布\n";
        s += "  （目前裝置縮放，容量只增不減），再逐格複製與該格外框相交的部分，以粒子混合模式貼上。\n";
        s += "- 分類（SSOT 在 constants.ts GROUND_DRAPE.MODE）：粒子只有 PART_GROUND（DIRECT，單張零件）；施法 AOE 預警等繪製函式走 OFFSCREEN。\n";
        s += "- 非粒子鋪設：施法 AOE 地面預警（UnitRenderSystem.paintAoeIndicator，GroundDrapeLayer.addPainted）一律走離屏畫布，逐格貼在頂面；\n";
        s += "- 懸空平面（GroundDrapeLayer.addPlane，planeZ＝腳下繪製高度＋UnitAuraPainter.RING_LIFT）：詠唱法陣（magicCircle 零件）、奧義聖域、AOE 擴張波紋是腰部高度的水平面，\n";
        s += "  以 screen 貼回（GROUND_DRAPE.PLANE_BLEND＝CAST_RING.BLEND，兩者必須一致，否則施法者那格的補畫與鋪設結果不同），\n";
        s += "  逐格以平面高度裁切繪製；格子頂面高過平面＝被擋住不畫（前景高地照樣遮擋）。施法者腳下那格只畫後半，\n";
        s += "  前半由 AURA op（UnitRenderSystem.drawAura）在施法者之後補畫，所以環繞在身體前後。垂直部分（上升粒子、能量柱）留在 AURA op。\n";
        s += "  不鋪設（直立或有高度，維持 VFX (isGround) op、前緣 sortBias、無抬升）：PILLAR、HEX_BEAM（立柱）、DOMAIN（80px 稜柱）、GIANT_HEX（懸浮三層＋角柱）、BLACK_HOLE（球狀核心）。\n";
        s += "- 排序後果：站在某格的單位在該格 TERRAIN 之後才畫（§2 sortBias），棋座壓在法陣上（ART_SPEC §13）；高地塊、障礙、危害、疊層都在鋪設之後，自然遮住法陣。\n";
        s += "  奧義（pIsUlt）的貼地法陣不再有 +1e8 的永遠最上層，因為它不再是排序單位。\n\n";

        s += "--- \n\n";

        s += "## 10. 衝刺／高速移動殘影 (Afterimages)\n\n";
        s += "殘影是**單位 op 的一部分**（沒有新的 op）：UnitBodyPainter 在畫本體之前、同一個 drawAssembly 的 ctx 裡畫，所以跟著單位排序。\n\n";
        s += "- 軌跡來源：Agent.trailHistory＝繪製位置 px + physics 的最近 AFTERIMAGE.HISTORY_LENGTH 點（每個物理 tick 一點），**唯一寫入者 PhysicsSystem**（AgentOwnership）。\n";
        s += "  衝刺是 SkillExecutor 把 px/py 設到終點、physics.x/y 設成反向差值再由彈簧拉回，所以速度大、軌跡走過整段路徑；擊退滑行同理。\n";
        s += "- 換算：UnitFrame.fill 呼叫 Afterimage.computeAfterimageGhosts，把軌跡點換成**相對單位目前腳底繪製點**的偏移：\n";
        s += "  dx = 點.x − footX；dy = (點.y − 該點腳下繪製用高度) − floorY；z = 點.physics.z。腳下高度用繪製用高度函式（已扣漂浮位移），VOID／MAGMA 上殘影跟著地塊浮。\n";
        s += "- 條件：物理速度 > VFX_PARAM.SPEED_TILT_THRESHOLD；屍體、拖曳預覽、剪影、變羊沒有殘影；距離本體不到 AFTERIMAGE.MIN_SEPARATION_PX 的點省略。\n";
        s += "- 繪製：UnitAfterimagePainter。原點＝腳底繪製點；每個殘影 translate(dx, getVisualBodyCenterY(dy, z))、scale(UNIT_SCALE)、同本體的旋轉與漂浮，\n";
        s += "  畫 SpriteUnitRenderer.resolveFrame 解析出的**同一張影格**（同朝向），染成陣營軌跡色（getFactionSkin(team).projection.trailColor）的快取畫布。\n";
        s += "  染色影格每 (圖集, Mip, 影格, 顏色) 一張，第一次用到才建立，數量上限 AFTERIMAGE.MAX_TINTED_FRAMES；每幀零分配。\n";
        s += "- 品質階層：殘影數 ≤ AFTERIMAGE.GHOSTS_BY_TIER[tier]。\n";
        s += "- 舊的 assets.base 糊影（MaterialPainter.drawMotionTrail）與梯形預留圖形已移除。\n";
        s += "- 舊的 UnitFlightPainter（飛行緞帶與「引擎光點」）已移除：它在 UNIT_SCALE 與本體旋轉之後畫世界座標差，軌跡被縮成 0.65 倍並跟著傾斜轉，\n";
        s += "  15 個 tick 的軌跡在正常飛行速度下只有十幾 px；引擎光點是舊程序化身體的殘留。飛行單位的移動感由懸浮浮動（UNIT_BODY_MOTION）與衝刺殘影提供。\n\n";

        s += "--- \n\n";

        return s;
    }

    static downloadSpec() {
        const text = RenderSpec.generateSpec();
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Tactical_OS_v2.0_Render_Pipeline_Spec.md';
        anchor.click();
        URL.revokeObjectURL(url);
    }
}
