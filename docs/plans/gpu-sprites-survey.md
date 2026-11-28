# 精靈改由顯示卡成批畫：Canvas 2D 功能盤點（2026-11-28）

> 開案書 `docs/plans/lighting-cost.md` §5 C5 的輸入。只讀盤點，沒改任何程式、規則、檔頭。

**範圍**：`engine/renderers/**`、`engine/presentation/**` 裡每個會對 `CanvasRenderingContext2D` 下繪製呼叫的 painter；被它們呼叫、位在 `engine/graphics/painters/SurfacePainter.ts` 的液面、草、冰面也列入（不在範圍的目錄只列到這一個檔）。
**方法**：讀碼。先讀 `AGENTS.md`、`engine/renderers/RenderSpec.ts` §1、§9、各檔方框檔頭、`engine/renderers/RenderPipeline.ts`（繪製順序）、`engine/renderers/RenderDispatcher.ts`（op 分發）、`engine/renderers/CtxOpCounter.ts`（計數 scope）。沒有跑瀏覽器、vite 或任何量測。
**數字來源**：
- **實測（op 數）**：`tools/ui-e2e/out/lit-cost.json` 的 `scene` 第 3 段（`perf:lit-cost` 輸出，本機檔、不進版控；`lit-cost-before-c1.json` 同場景同數字）。固定凍結戰鬥、2560×1440、DPR 1、品質階層 0：TERRAIN 169、OVERLAY 42、OBSTACLE 18、UNIT 9、CORPSE 1、AURA 3、HAZARD 7、VFX 101（另兩段 66 與 118）、PROJECTILE 1（第 1 段）。
- **推算（每個 op 的繪製呼叫數）**：repo 內沒有存好的 `?perfops` 計數輸出（`CtxOpCounter` 依 `terrain`、`units`、`vfx`、`projectile`、`hazard`、`obstacle`、`overlay`、`other` 分 scope，見 `RenderPipeline.ts:326-336`，但結果只畫在畫面上、沒有檔案）。下表「每幀」欄＝op 數（實測）× 每 op 呼叫數（推算，由程式讀出）；寫「推算」的就是這樣來的。`docs/BAKED_RENDERING_DESIGN.md` 記過一個更早的數字：地塊每幀 269 次 `drawImage`（2026-10，場景與版本和上面不同，只當參考）。
- 一個 `drawImage` 同時帶一次 `globalAlpha` 與混合模式設定的，只算 1 次 `drawImage`。

## 1. 主表：每幀執行期的 painter

分類：**貼** = 貼已烘好的圖（`drawImage` 來源是快取畫布、圖集、精靈）；**程** = 程序化繪製（路徑、漸層、文字、clip、pattern、filter）。「混合」欄只列 `source-over` 以外的模式。

### 1.1 RenderList 內的 op（`RenderPipeline.drawWorld`，`RenderPipeline.ts:325-338` 迴圈）

| # | painter | 檔案:行 | RenderOpType | 類 | 用到的功能 | 每幀 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `TerrainRenderer.drawBlock` 地塊本體 | `grid/TerrainRenderer.ts:207-282`（`drawImage` 在 264-270） | TERRAIN | 貼 | `save`／`translate`／`globalAlpha`、1 次 `drawImage`（`TerrainBlockCache` 快取畫布；縮放級距不為 1 時帶目的寬高） | 169 個 op × 1（推算）＝169 |
| 2 | 同上，液面分支 `SurfacePainter.drawLiquid` | `grid/TerrainRenderer.ts:272-280`、`graphics/painters/SurfacePainter.ts:22-46`（`drawImage` 在 43） | TERRAIN | 貼 | 循環影格圖集切片 `drawImage`（9 參數）、`translate`；只有 MAGMA（`data/vfx/terrainAmbience.ts:153`） | MAGMA 每格 +1；其他地形 0 |
| 3 | `TerrainRenderer.drawTerrainDetail` 動態地表細節 | `grid/TerrainRenderer.ts:576-590`；`SurfacePainter.drawGrass` `:48-64`、`drawIceSheen` `:69-79` | TERRAIN | 貼 | 循環影格圖 `drawImage`（草另依 x 取相位）、`globalAlpha`；只有 FOREST（草）與 ICE（冰面反光）；DESERT、VOID 的細節烘進地塊本體 | FOREST／ICE 每格 +1（推算）；其他 0 |
| 4 | `GridOverlays.drawOverlays` 基礎疊層（狀態底色、區域、地塊光、背水一戰） | `grid/GridOverlays.ts:48-109` | TERRAIN（由 TERRAIN op 分發，`RenderDispatcher.ts:67`） | 程 | 六角路徑 `traceHex`＋`fill`（狀態底色 `:75-83`、地塊光 `:97-107`、背水一戰 `fill`＋`stroke` `:51-69`）、`globalCompositeOperation='screen'`（地塊光）、`save`／`translate`／`restore`；區域波紋走 `SoftTile`（見 #7） | 只有該格有狀態、區域、地塊光時才畫；本場景 `lit-cost` 的 `terrain_tag` 條件判斷在 `LightingPass.ts:495`（`oStatus \|\| oDanger \|\| oHasUnit \|\| oLightCol`）；每幀幾格未量，不能從 op 數推 |
| 5 | `GroundDrapeLayer.drawOnTile` 貼地鋪設（法陣、震波、AOE 預警） | `GroundDrape.ts:276-300`（呼叫在 `RenderDispatcher.ts:69`） | TERRAIN | 貼＋程（見 #6） | 每格：與該格相交的鋪設平面各 1 次 `drawImage`（矩形，`blitPlane` `:373-392`），混合＝平面的 `blendMode`（`screen`／`lighter`／`source-over`，`constants/vfx.ts:88-90`）；詠唱環（懸空平面）每格另 `save`／`rect`／`clip`／`drawImage`（`:313-323`，只在施法者那格有 `clip`） | 無鋪設特效時 0（`:277` 提早返回）；有鋪設時＝被蓋到的格數 × 平面數（推算） |
| 6 | `GroundDrapeLayer.renderPlanes`／`maskedLayer`／`ensureRendered`（合成離屏圖） | `GroundDrape.ts:331-380`、`:447-470`、`:473-511`；`DrapeHexMask.ts:73-88` | TERRAIN（本幀第一次畫地塊時做，不是逐格） | 程 | 每個平面一張離屏畫布，逐成員再分發 `ParticleRenderer`／`DrapePainter`（含 `setTransform`、混合模式）；`maskedLayer` 每色（三色）1 次 `drawImage` ＋ `destination-in` ＋ `createPattern('repeat')` 填滿 `fillRect`（`DrapeHexMask.ts:73-88`）；`setTransform` 帶非等比縮放 | 每幀每個平面 1 次合成＋最多 3 次遮罩（每色本幀第一次用到時）；平面數＝不同混合模式數（推算，通常 1～2） |
| 7 | `SoftTile.draw`（射程、預警、滑過、區域波紋） | `grid/SoftTile.ts:50-56`；呼叫：`GridOverlays.ts:34-38`、`ZoneRenderer.ts:55-67` | OVERLAY（也在 TERRAIN 的區域波紋） | 貼 | 1 次 `drawImage`（烘焙好的柔光格）；混合 `screen`（`GridOverlays.ts:112`、`ZoneRenderer.ts:50`），施法範圍用 `CAST_BLEND`（`constants/terrain.ts:48`，目前 `source-over`）；烘焙時才用 `filter=blur`（`SoftTile.ts:35-39`） | OVERLAY 42 個 op × 約 1～3（預警、射程、滑過各一，推算）；區域波紋最多 2 |
| 8 | `GridOverlays.drawOverlays` 的 OVERLAY 分支（射程／滑過／預警外框） | `grid/GridOverlays.ts:111-143`（OVERLAY 分發 `RenderDispatcher.ts:73-75`） | OVERLAY | 貼 | `save`／`translate`／`globalAlpha`（預警脈動）、混合 `screen`，實際繪製都是 #7 的 `SoftTile` | 同 #7 |
| 9 | `HazardPainter.draw` | `grid/painters/HazardPainter.ts:55-80`（分發 `RenderDispatcher.ts:77-79`） | HAZARD | 貼 | 液面 `drawLiquid` 1 次（有 `liquid` 的危害）；之後每層 `drawPartLayer`（見 #10）；`globalAlpha`；層的混合模式 | 7 個 op × （液面 1 ＋ 層數×份數）（推算；層數表 `data/vfx/hazard_visuals`） |
| 10 | `drawPartLayer`／`drawPart`（零件層共用） | `vfxparts/PartLayerPainter.ts:55-111`、`vfxparts/VFXPartStore.ts:150-176` | HAZARD／狀態層／AURA 共用 | 貼 | 每份 1 次 `drawImage`；需要旋轉或壓扁（`scaleY`＝`ISO_SCALE_Y`，貼地零件一律）時加 `save`／`translate`／`scale`／`rotate`／`restore`（`:163-171`）；`globalAlpha`＝透明度；混合模式 `lighter`（預設，`PartSpec.ts:204-215`）或 `source-over`，也可被層的 `blend` 覆寫（資料裡有 `overlay` 2、`soft-light` 1 處，見 `data/vfx/**` 搜 `blend:`） | 每份 1 次 |
| 11 | `ObstacleSpriteStore`／分發的障礙物本體＋疊層 | `RenderDispatcher.ts:82-96`（取圖 `grid/ObstacleSpriteStore.ts:61` 起） | OBSTACLE | 貼 | 1 次 `drawImage`（可帶來源矩形，9 參數）；動畫疊層 `glow`／`glint`：再 1 次 `drawImage`＋`globalAlpha`＋`globalCompositeOperation='lighter'`（`:90-95`）；`sway` 是換影格不加呼叫 | 18 個 op × 1，有疊層的再 +1（推算）≥ 18 |
| 12 | `UnitRenderSystem.drawAssembly`（單位組裝） | `presentation/unit/UnitSystem.ts:127-168`（分發 `RenderDispatcher.ts:99-104`） | UNIT／CORPSE | 貼＋程（見下列子項） | `save`／`translate`／`restore`、墜落時 `globalAlpha`；下列 12a～12h 的總和 | 10 個 op（9 活 1 屍） |
| 12a | `UnitShadowPainter.draw`（影子與棋座） | `units/painters/UnitShadowPainter.ts:12-48` | UNIT | 貼 | 2 次 `drawImage`（`SHADOW_BLOB` 貼圖，混合 **`multiply`** `:34`；棋座 `assets.base` `:44`）；`save`／`translate`／`scale`×2／`restore`×2 | 每活單位 2（推算）＝約 18 |
| 12b | `UnitCorePainter.draw`（核心寶石 BEHIND／FRONT） | `units/painters/UnitCorePainter.ts:83-131`（`drawImage` 127、130） | UNIT | 貼 | 光暈 `drawImage` 混合 **`lighter`**（`:126`）＋晶體 `drawImage`；`save`／`translate`／`scale`；BEHIND、FRONT 各一次 | 每活單位 約 2～4（推算） |
| 12c | `UnitBodyPainter.draw` → `SpriteUnitRenderer.draw`（本體） | `units/painters/UnitBodyPainter.ts:46-146`、`units/factions/SpriteUnitRenderer.ts:182-237`（`drawImage` 215、221） | UNIT／CORPSE | 貼 | 圖集切片 `drawImage`（9 參數，來源 `SpriteAtlasStore` 依 mip 選圖集）；`translate`／`scale`／`rotate`（傾斜、受擊抖動、出生下落、奧義脈動、墜落翻滾）、`globalAlpha`；中毒時改 `PoisonMaterialStore.draw`（`status/PoisonMaterialStore.ts:48-72`，`drawImage` 自同一組頁面圖）；備援（圖集沒載入）`arc`＋`fill`（`UnitBodyPainter.ts:129`、`UnitDeathPainter.ts:75-78`） | 每單位 1 |
| 12d | `SpriteUnitRenderer.draw` 受擊閃白 | `SpriteUnitRenderer.ts:229-236` | UNIT | 貼 | 第 2 次 `drawImage`（同切片，剪影圖集），`globalAlpha`；`save`／`restore` | 只在 `hitFlashTimer>0` 時 +1 |
| 12e | `UnitOutlinePass.capture`／`flush`（PLAY 主角輪廓光） | `units/UnitOutlinePass.ts:54-125` | UNIT 之後的覆蓋（`RenderPipeline.ts:239` 疊層階段） | 程 | 離屏 `drawImage` 剪影→`source-in` 上色（`fillRect`）→4～8 方向位移疊畫（`drawImage` ×(DIRS×2)）→`destination-out` 挖空→`drawImage` 回主畫布；全部在離屏畫布 | 只有 PLAY 主角 1 個；每個主角約 20 次呼叫（`DIRS` 數量決定，推算） |
| 12f | `UnitAfterimagePainter.draw`（衝刺殘影） | `units/painters/UnitAfterimagePainter.ts:43-100`（`getTintedFrame` 烘焙 `:43-56`） | UNIT | 貼 | 每殘影 1 次 `drawImage`（染色後的快取畫布）、`globalAlpha`、`translate`／`scale`／`rotate`；染色（`source-atop`＋`fillRect`）只在烘焙 | 只有高速移動的單位；每殘影 1 |
| 12g | `PolymorphPainter`／`FrozenPainter`（變羊、冰凍） | `units/painters/PolymorphPainter.ts:45-55`、`units/painters/FrozenPainter.ts:29` | UNIT | 貼 | 圖集切片 `drawImage` 1～2 次；`globalAlpha`、`scale` | 只有該狀態的單位 |
| 12h | `UnitDeathPainter.draw`（死亡） | `units/painters/UnitDeathPainter.ts:55-80` | CORPSE | 貼 | 呼叫 `SpriteUnitRenderer.draw`（同 12c）；`globalAlpha`、`translate`、`scale` | 1 個 op（場景中 1 具屍體） |
| 13 | `UnitRenderSystem.drawAura`＋`UnitAuraPainter` | `presentation/unit/UnitSystem.ts:170-214`；`units/painters/UnitAuraPainter.ts:87-153` | AURA | 貼 | `drawPart` 多次（環、內環、核心、塵點、石柱）；施法者那格前半：**六角路徑 `traceHex`＋`clip`＋矩形 `clip`**（`UnitSystem.ts:199-206`）；混合 `PLANE_BLEND`＝`screen`（`:208`）；`scaleY`＝`ISO_SCALE_Y` | 3 個 op × 5～8 次 `drawPart`（推算）；施法者那格 +1 次雙 clip |
| 14 | `ParticleRenderer.drawSingleParticle` → `PartPainter.draw`（一般粒子、零件） | `presentation/vfx/renderers/ParticleRenderer.ts:15-39`、`.../painters/PartPainter.ts:29-52`；分發 `RenderDispatcher.ts:106-114` | VFX | 貼 | 每粒子 `save`／`translate`／`restore`（`RenderDispatcher.ts:107-111`）＋ 1 次 `drawPart`＝1 次 `drawImage`；縮放、旋轉、`scaleY`（`PART_GROUND`）、`globalAlpha`；混合模式 `p.blendMode`（`lighter`／`screen`／`source-over`，`data` 裡只有這三種字面值）或零件預設（`lighter` 多） | 101 個 op × 1 ≈ 101 次 `drawImage`（推算；實測 op 數 66～118） |
| 15 | `PartPainter.drawBeam`（光束） | `.../painters/PartPainter.ts:60-98` | VFX | 貼＋程 | **`clip`（自訂六邊形路徑）**＋沿光束長度平鋪 `drawImage`（迴圈 `for x += tile`，`:84`）＋`rotate`；兩端光點 `drawPart`×2；混合 `p.blendMode ?? sprite.blend`（光束預設 `lighter`） | 每條光束 3 + 磚數（推算；場上不一定有） |
| 16 | `ParticleRenderer.drawDebugDot`（除錯點） | `ParticleRenderer.ts:43-47` | VFX | 程 | `arc`＋`fill` | 0（正常不應出現） |
| 17 | `ProjectilePartPainter.draw`（投射物） | `.../painters/ProjectilePartPainter.ts:84-117` | PROJECTILE | 貼 | 拖尾：`drawTrailStreak`（`renderers/vfxparts/TrailStreak.ts:12-44`，每段 `save`／`translate`／`rotate`／`drawImage`／`restore`，每段 `globalAlpha` 遞減，混合＝光束磚的 `lighter`）或煙（`drawPart` 每隔 N 點）；頭部光暈 `drawPart`；本體 `save`／`translate`／`rotate`／`scale`／`drawImage`，混合 `body.blend` | 每發＝拖尾點數＋2（推算，場景有 1 發） |

### 1.2 RenderList 之外（`drawWorld` 尾端與 `draw` 其他段）

| # | painter | 檔案:行 | 層 | 類 | 用到的功能 | 每幀 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 19 | `SilhouetteMask.draw`（遮擋剪影） | `units/SilhouetteMask.ts:72-130`；呼叫 `RenderPipeline.ts:344-366` | 世界尾端（`engine.isRunning` 且有被遮的單位） | 程 | 地塊柱：**多邊形路徑＋`clip`**，剪影 `drawSilhouette`（`SpriteUnitRenderer` 的剪影圖集 `drawImage`）；障礙物：離屏畫布 `drawImage`＋**`destination-in`** 疊障礙物圖＋`setTransform` 後貼回主畫布 | 每個被前方高地塊或障礙物擋住的單位：地塊柱 1 次 clip＋1 次剪影；每個擋住它的障礙物 3 次 `drawImage`（推算）；場景中被擋的數目未量 |
| 20 | `StatusPartPainter.draw` | `status/painters/StatusPartPainter.ts:110-135`（`drawPartLayer` 在 127、129） | 世界尾端（狀態層） | 貼 | `drawPartLayer`（#10）：腳下／投影中心／頭頂各層；方向由 `StatusDirection` 決定旋轉 | 每單位 0～N 層（依狀態）×份數（推算） |
| 21 | `ShieldPainter.draw` | `status/painters/ShieldPainter.ts:79、105` | 世界尾端 | 貼 | `drawPart`（稜柱／殼）；混合依零件 | 有護盾的單位 |
| 22 | `StatusArtPainter.root／torso／stars` | `status/painters/StatusArtPainter.ts:20-54`（`drawImage` 在 `blit`） | **UNIT 本體組裝內**（`UnitBodyPainter.ts:119-143`） | 貼 | 狀態美術圖集切片 `drawImage`（藤蔓、燃燒、中毒、暈星）；`translate`／`rotate`／`scale`（暈眩失衡） | 每個有該狀態的單位 1～4 |
| 23 | `UnitIndicatorPainter.drawAoeIndicator`（施法 AOE 預警） | `units/painters/UnitIndicatorPainter.ts:45-64`，經 `UnitRenderSystem.paintAoeIndicator` `UnitSystem.ts:224-228` 進 `GroundDrapeLayer.addPainted` | 鋪設層（進 #6 的合成圖，不直接進 ctx） | 貼 | `drawPart`（環、光暈） | 每個施法中的 AOE 技 2～3 |
| 24 | `LightingPass.tag`（遮罩重畫，**只在打光開啟時**） | `lighting/LightingPass.ts:481-548`、`:398-465`（`beginItem`、`endItem`、`flushItems`） | 世界尾端，每 op 一次（CORPSE 略過） | 貼＋程 | 單位：`drawSilhouette` 1 次進暫存畫布（含 `save`／`resetTransform`／`rect`×2 `clip`／`source-atop`＋`drawImage` 蓋漸層章）＋2 次 `destination-out` 的 `drawSilhouette` ＋整幀 1 次 `flushItems` 迴圈貼回幾何遮罩；障礙物：同上，但 `RenderDispatcher.dispatch` 重畫 3 次（`:517-522`、`:540-543` 是 `destination-out`）；VFX／PROJECTILE／AURA／HAZARD：`RenderDispatcher.dispatch` 再畫 1 次進 `glowCtx`；OVERLAY：再畫 1 次進 `infoCtx`；TERRAIN：`GridOverlays.drawOverlays`（有狀態時）進 `infoCtx`，`drape.drawOnTile` 進 `glowCtx` | 9 單位 × 約 5（推算）＋18 障礙物 × 約 5（推算）＋特效類 op 各 +1（101＋3＋7＋1…）＋42 OVERLAY ＋ TERRAIN 的鋪設；`lighting-cost.md` §2.1 量到整個 tag 約 4.35 ms |

### 1.3 螢幕層（RenderList 之外、`RenderPipeline.draw` 各段）

| # | painter | 檔案:行 | 層 | 類 | 用到的功能 | 每幀 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 25 | `BackgroundRenderer.draw` 靜態層貼圖 | `background.ts:59-95`（`drawImage` 76、80、86） | 背景 | 貼 | 1 張全螢幕快取畫布 `drawImage`（轉場淡入時 2 張＋`globalAlpha`） | 1（轉場時 2） |
| 26 | `BackgroundRenderer.drawDynamicElements` 光點、地平線光暈 | `background.ts:325-358`（`arc`＋`fill` 在 338，地平線 `drawImage` 在 350） | 背景 | 程＋貼 | 光點逐顆 `beginPath`／`arc`／`fill`／`globalAlpha`（`M.COUNT`×階層倍率；2026-10-21 實測 sprite 化反而慢，`background.ts:330` 註解）；地平線光暈 1 次 `drawImage`，混合 `screen`，來源矩形隨脈動縮放 | 光點數＝`BACKGROUND_FX.MOTES.COUNT`×階層倍率（`constants` 查，這裡不推）；光暈 1 |
| 27 | `drawAurora`／`drawCanopyRays`／`drawHeatHaze`／`drawFogLayers`／`drawSandStorm`（依地圖） | `background.ts:361-516` | 背景 | 程＋貼 | 低解析離屏畫布畫三條帶（`createLinearGradient`、`source-over`／`screen`，`:382-411`）再 1 次 `drawImage` 放大（`:414`）；樹冠光束 `drawImage` ×N 混合 `overlay`（`:419-427`）；熱浪 `createLinearGradient`＋`fillRect`×N 混合 `screen`（`:431-455`）；霧 sprite `drawImage`×N 混合 `screen`（`:460-467`）；沙塵 `createLinearGradient`×N、`fillRect`、`overlay`（`:471-513`） | 依地圖只開其中 1～2 種；每種 5～20 次（推算）。**每幀建立漸層**（`createLinearGradient` 在 `drawHeatHaze`／`drawSandStorm` 內逐帶呼叫） |
| 28 | `PostProcessor.apply`（震動色差、轉場色差） | `PostProcessor.ts:24-58`（`drawImage` 41、47、48） | 後製 | 貼 | 整張主畫布複製到暫存畫布 `drawImage`、再以 ±offset 兩次 `drawImage` 貼回；`globalCompositeOperation`（色差）；只在 trauma>0 或轉場 | 0（無震動時）或 3 |
| 29 | `PostProcessor.applyToneGrade`（色調分級） | `PostProcessor.ts:60-83`（`ctx.filter` 在 79-81） | 後製 | 程 | **`ctx.filter`＝`MaterialPainter.gradeFilter()`**（CSS filter 字串）＋整張畫布 2 次 `drawImage`；**打光開啟時不跑**（`RenderPipeline.ts:225`） | 打光關閉時 2 次整畫面 `drawImage`＋1 次 filter |
| 30 | `PostProcessor.applyFinishBlur`（結束／轉場模糊） | `PostProcessor.ts:85-109`（`filter` 在 100-103） | 後製 | 程 | **`ctx.filter = blur()＋grayscale()`**、整張畫布複製＋貼回、`fillRect`（壓暗）；品質階層 2／3 跳過 | 只在勝利結束與轉場（約數秒） |
| 31 | `LightingPass.present`（打光後貼回主畫布） | `lighting/LightingPass.ts:610-744`（`drawImage` 743、`blitUnlit` 602） | 後製（打光開啟時取代 #29） | 貼 | 1 次 `drawImage` 貼 GL 畫布；GL 端上傳畫布做貼圖（`upload`） | 1（另有 GL 上傳數張，見 `lighting-cost.md` §2.2） |
| 32 | `UltWorldRenderer.draw` | `ult/UltWorldRenderer.ts:57-90`（`drawImage` 86） | 疊層（後製之後、HUD 之前） | 貼 | 衝擊光暈 sprite `drawImage`，`globalAlpha`，混合 `lighter`；sprite 以 `createRadialGradient`＋`fillRect` 烘一次（`:40-49`） | 每個衝擊波 1（只在奧義命中時） |
| 33 | `TacticalRenderer.drawOverlay`（軌跡、目的地、瞄準圈） | `tactical.ts:63-148`（`stroke` 84、111、143、`createLinearGradient` 99、`arc` 138、178） | 疊層（世界變換內） | 程 | 路徑 `moveTo`／`lineTo`／`stroke`（軌跡）；**每幀 `createLinearGradient`**（`:99`，選取單位對目標的連線）；`arc`＋`stroke`（瞄準圈、目的地）；`setLineDash` 未查 | 選取單位時 約 3～5；PLAY 瞄準時每個目標 1 圈（推算） |
| 34 | `TacticalRenderer.drawPlayerArrows` | `tactical.ts:152-170` | 疊層 | 程 | 路徑 `stroke` | 每個玩家單位 1（PLAY） |
| 35 | `HUDRenderer.draw`＋`BarPainter`、`StatusStripPainter`、`GaugePainter` | `HUDRenderer.ts:20-40`、`hud/BarPainter.ts:67-157`、`hud/StatusStripPainter.ts:73-127`、`hud/GaugePainter.ts:15-62` | HUD | 貼＋程 | 血條外框 `roundRect`＋`fill`／`stroke`（`BarPainter.ts:85-99`）、血量／魔力／詠唱條 `fillRect`、血條光澤切片 `drawImage`（`:64`，皮膚在 `:39-54` 烘焙，含 `createLinearGradient`＋`shadowBlur`＋`roundRect`）；狀態圖示 `drawImage`＋圓形進度扇形 `arc`＋`fill`（`StatusStripPainter.ts:110-120`）；詠唱環形 gauge：`arc`＋`clip`＋`drawImage`（圖示）＋`stroke`（`GaugePainter.ts:26-58`） | 每活單位 約 6～10 次呼叫（推算）≈ 60～100 |
| 36 | `TextPainter.drawFloatingText`（傷害數字、詠唱字） | `hud/TextPainter.ts:39-232`（`fillText` 93、133、154-158、192、232；`strokeText` 91、230） | HUD | 程 | **`fillText`／`strokeText`**、`font`、`textAlign`；詠唱字光暈用 `GlowTextCache`（烘焙後 `drawImage` `:130`、`:213`）；爆擊 `lighter` 抖動字（`:152-158`）；`clip`＋`fillRect`（掃描線效果 `:199-206`）；`createLinearGradient`（`:26`，單位區間快取後 scale） | 場上浮動數字數（0～數十）×1～3 次 `fillText`／`strokeText`（推算） |
| 37 | `HUDRenderer.drawLastStandBanner`（背水一戰） | `HUDRenderer.ts:42-95` | HUD | 程＋貼 | `fillRect`×2（漸層快取 `g.vignette`、`g.banner`）、`strokeText`＋`fillText`（標題、副標）、`drawImage`（光暈字） | 只在背水一戰時 |
| 38 | `TacticalRenderer.drawHUD`（導播攝影機框） | `tactical.ts:187-244`（`stroke` ×4、`arc`、`fillText` 238、241） | HUD | 程 | 路徑 `stroke`（取景框 4 邊）、`arc`＋`fill`（REC 點）、`fillText`×2 | 導播模式（非 PLAY）每幀 約 8 次呼叫 |
| 39 | `TacticalRenderer.drawDebug`（除錯字、SUDDEN DEATH 字） | `tactical.ts:246-275` | HUD | 程 | `fillText` | 開 `?perf` 或縮圈時才有 |
| 40 | 轉場黑幕、背景清屏 | `RenderPipeline.ts:192`（清屏 `fillRect`）、`:273`（黑幕 `fillRect`＋`globalAlpha`） | 背景、最上層 | 程 | 單色 `fillRect` | 清屏 1；黑幕只在轉場 |


## 2. 烘焙端（只在快取未命中時執行，不是每幀）

這些檔案用到的 Canvas 2D 功能最多，但都只在貼圖產生時跑一次；搬到顯示卡成批畫時，它們的輸出（快取畫布）才是新路徑的輸入：

| 檔案 | 烘什麼 | 功能（行數粗計） |
| :-- | :-- | :-- |
| `vfxparts/PartBakers.ts`（1863 行） | 所有特效零件（光暈、環、雷、火焰、煙、法陣、稜柱、導彈…） | `createLinearGradient` 10、`createRadialGradient` 11、`bezierCurveTo`／`quadraticCurveTo` 約 25、`ctx.filter` 10、`shadowBlur` 12、`globalCompositeOperation` 4、`clip` 2 |
| `grid/TerrainRenderer.ts` `bakeBlock`、`paintStaticDetail` | 地塊（頂面、側面、邊緣光暈、AO、紋理疊合） | 路徑、`clip`（`:371-372`、`:400-401`、`:458`）、`createLinearGradient`、`createPattern`＋`setTransform`（`:426-428`、`:482-484`）、`globalCompositeOperation`（`TERRAIN_SKIN.*.blend`） |
| `grid/TerrainLoopAtlas.ts`、`grid/TerrainBlockCache.ts` | 液面、草、冰面循環影格；地塊快取容器 | `createImageData`／`putImageData`（`TerrainLoopAtlas.ts:96-122`） |
| `grid/ObstacleSpriteStore.ts` | 障礙物合成圖、`glow` 疊層（`ctx.filter = blur()` `:202-204`）、`glint` | `filter`、`getImageData`／`putImageData`（`:272-285`） |
| `units/SpriteAtlasStore.ts`、`units/FactionTextureStore.ts`、`units/CcBodyStore.ts` | 單位圖集（陣營染色、剪影）、羊剪影 | `getImageData`／`putImageData`（`SpriteAtlasStore.ts:350-361`）、`source-in`＋`fillRect`（`CcBodyStore.ts:66-69`） |
| `status/PoisonMaterialStore.ts` | 中毒材質頁面（分幀） | `getImageData`／`putImageData` 逐像素（`:96-120`） |
| `grid/SoftTile.ts`、`hud/GlowTextCache.ts`、`hud/BarPainter.ts`（皮膚） | 柔光格、光暈字、血條皮膚 | `ctx.filter=blur`、`shadowBlur`、`createLinearGradient`、`roundRect` |

## 3. 小結

### 3.1 可以直接搬成 instanced quad（純貼圖、只有 alpha／加法混合）

來源圖已是快取畫布或圖集，繪製參數只有位置、縮放、旋轉、`scaleY`、透明度、混合模式 `source-over`／`lighter`：

- 地塊本體 `drawBlock`（#1）：每格 1 個 quad，來源 `TerrainBlockCache`（`grid/TerrainRenderer.ts:264-270`）。
- 液面（#2）與草、冰面反光（#3）：圖集切片、影格索引由時間決定，換成 uniform 或 instance 屬性（`SurfacePainter.ts:43`、`:63`、`:78`）。
- 障礙物本體與 `lighter` 疊層（#11）：`RenderDispatcher.ts:82-96`。
- 單位本體、受擊閃白、殘影、變羊、冰凍、核心寶石、棋座、狀態美術（#12a～12d、12f～12h、#22）：全是 `drawImage` 加 `translate`／`scale`／`rotate`／`globalAlpha`（`UnitBodyPainter.ts:46-146`、`SpriteUnitRenderer.ts:182-237`、`UnitCorePainter.ts:126-130`）。
- 零件與零件層（#10、#13、#14、#20、#21、#23 的 `drawPart` 路徑）：`VFXPartStore.ts:150-176` 只用 `drawImage`／`globalAlpha`／混合／平移縮放旋轉；混合只有 `lighter`、`screen`、`source-over`（`data` 裡 `blendMode` 字面值）。
- 投射物本體、頭部光暈、煙拖尾（#17）與光痕（`TrailStreak.ts:30-40`，每段是一個拉伸旋轉的 quad）。
- 柔光格 `SoftTile`（#7）：1 次 `drawImage`，混合 `screen`（`SoftTile.ts:50-56`）。
- 背景靜態層、後製貼回（#25、#31、#32）已經是整張貼圖，不需成批。

要新增支援的混合模式（不是 alpha 或加法）：`screen`（柔光格、地塊光、背景霧、鋪設特效）、`multiply`（影子 `UnitShadowPainter.ts:34`）、`overlay`（背景樹冠光束與沙塵 `background.ts:419、473`、以及資料裡 2 處 `blend:'overlay'`）、`soft-light`（資料裡 1 處）。`screen`、`multiply` 在片段著色器裡是逐像素公式，不需要讀目的像素以外的東西；`overlay`、`soft-light` 要讀目的像素（讀 framebuffer），在 GL 上要另開一趟或用 ping-pong。

### 3.2 有程序化繪製，要先烘成圖或改寫成著色器

- **地塊基礎疊層 `GridOverlays.drawOverlays`（#4）**：六角 `traceHex`＋`fill` 填色，`screen` 混合（`GridOverlays.ts:75-107`）。六角形狀固定，可改成一張單色六角圖（或在著色器裡用距離函數）乘上顏色與透明度。
- **狀態底色、區域底色、背水一戰（#4）**：同上；背水一戰另有 `stroke`（`GridOverlays.ts:62-69`），兩個半徑的六角描邊要烘成圖。
- **背景動態層（#26、#27）**：光點逐顆 `arc`、霧／熱浪／沙塵／極光用每幀建立的 `createLinearGradient`＋`fillRect`（`background.ts:338`、`:438-453`、`:478-513`、`:391`）。可烘成 1 張漸層貼圖加 uniform，或直接寫成全螢幕著色器（它們本來就是全螢幕）。這一組不在「精靈」範圍內，可以留在 Canvas 2D 不動。
- **選取連線與瞄準提示（#33、#34）**：路徑 `stroke`、每幀漸層（`tactical.ts:99`）。數量小；留在 Canvas 2D 疊層即可。
- **血條與狀態圖示列（#35）**：`roundRect`、`fillRect`、`arc` 扇形（`BarPainter.ts:85-149`、`StatusStripPainter.ts:110-120`）。皮膚已烘焙，剩下的 `fillRect` 與扇形可改成貼圖加著色器裡算角度，但每幀只有每單位數次，優先級低。
- **輪廓光（#12e）**：離屏畫布上做 `source-in` 上色、多方向位移疊畫、`destination-out` 挖空（`UnitOutlinePass.ts:103-118`），改寫成後製著色器（對剪影取邊緣）比較自然；現在只有 PLAY 主角 1 個。
- **打光遮罩重畫（#24）**：這正是 C5 要消掉的那一份：成批畫時同時輸出類別資訊，就不用 `LightingPass.tag` 再分發一次（`LightingPass.ts:481-548`）。

### 3.3 用到 GPU 上難做的功能

- **`destination-out`／`destination-in`（挖洞、遮罩）**：`LightingPass.tag` 的單位與障礙物挖洞（`LightingPass.ts:517-521`、`:540-543`）；`DrapeHexMask.applyHexMask` 的 `destination-in` ＋ pattern（`DrapeHexMask.ts:76-88`）；`SilhouetteMask` 障礙物剪影的 `destination-in`（`SilhouetteMask.ts:120-123`）；`UnitOutlinePass` 的 `destination-out`（`UnitOutlinePass.ts:116-118`）。GL 上要用模板緩衝、額外的輸出附件，或改成著色器內的遮罩取樣；順序相依，成批畫時要保留繪製順序（RenderSpec §1 的 sortKey）。
- **`clip`（路徑裁切）**：`SilhouetteMask` 地塊柱多邊形 clip（`SilhouetteMask.ts:82-92`）、`UnitSystem.drawAura` 的六角＋矩形雙 clip（`UnitSystem.ts:199-206`）、`GroundDrape.drawPlaneOnTile` 的矩形 clip（`GroundDrape.ts:313-320`）、`PartPainter.drawBeam` 的六邊形 clip（`PartPainter.ts:70-83`）、`GaugePainter`／`StatusStripPainter` 的圓形 clip（`GaugePainter.ts:37`、`StatusStripPainter.ts:46`）。GL 要用 scissor（只有矩形）、模板緩衝或著色器內的 `discard`；順序相依的需要整幀的模板重設。
- **貼地鋪設（#5、#6）**：同時用到離屏合成（依混合模式分平面）、三色六角遮罩（`createPattern` ＋ `destination-in`）、逐格矩形貼回（`GroundDrape.ts:331-380`、`DrapeHexMask.ts`）。GL 版會是另一套做法（對地塊 quad 直接取樣鋪設圖，不需要三色技巧），要整組重寫。
- **`globalCompositeOperation` 讀目的像素**：`overlay`、`soft-light`（見 3.1）。
- **`ctx.filter`（模糊、灰階、色調）**：`PostProcessor.applyToneGrade`、`applyFinishBlur`（`PostProcessor.ts:79-81`、`:100-103`）；打光開啟時色調分級已由打光通道自己做，只剩結束／轉場模糊。烘焙端的 `filter`（`SoftTile.ts:35`、`ObstacleSpriteStore.ts:202`、`PartBakers.ts` 10 處）不在每幀。
- **文字（`fillText`／`strokeText`）**：浮動數字、詠唱字、背水一戰標題、導播框、除錯字（`TextPainter.ts:91-232`、`HUDRenderer.ts:62-80`、`tactical.ts:238-241`）。GL 上要字型圖集或 SDF；建議留在 Canvas 2D 疊層，不進成批。
- **每幀建立的漸層與 pattern**：背景（#27）、`tactical.ts:99`；其餘已快取（`TextPainter.ts:24-26`、`BarPainter.ts` 皮膚、`HazardPainter` 解析快取）。
- **逐像素 CPU 處理**：中毒材質分幀產生用 `getImageData`／`putImageData`（`PoisonMaterialStore.ts:96-120`）。已經是非同步分幀、結果是一張頁面圖，成批畫時當一般貼圖用，不受影響。
- **非等比 `setTransform`／`scaleY`**：貼地零件一律 `scaleY=ISO_SCALE_Y`（`PartLayerPainter.ts:105`、`PartPainter.ts:47`、`UnitAuraPainter.ts:99-115`）；instance 矩陣可直接表達，沒有困難，只是要確認旋轉在壓扁之前（`VFXPartStore.ts:166-168` 的順序）。

### 3.4 還沒查的

- 每幀實際呼叫數（上面標「推算」的）沒有檔案可引用；`?perfops` 的結果只畫在畫面（`CtxOpCounter.drawDebug`）。要量實數：在有視窗的瀏覽器開 `?perf&perfops` 讀 `CtxOpCounter` 的 `scopeCounts`（沒做，這次不跑瀏覽器）。
- `HazardPainter` 每個危害類型的層數與份數、背景光點數量、`MaterialPainter.gradeFilter()` 的字串內容、`TacticalRenderer` 是否用 `setLineDash`，沒有逐一查。
- 單位動畫影格選擇（`SpriteUnitRenderer.resolveFrame`）、`SpriteAtlasStore` 的 mip 選擇是 CPU 端決策，搬到顯示卡時要決定放在 CPU 端算好 instance 資料還是上傳圖集索引；沒有讀其內容。
