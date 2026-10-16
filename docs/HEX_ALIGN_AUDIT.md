# 六角地面視覺 × 地圖格對齊稽核（FLAT／POINTY）

> 範圍：所有畫六角形的地方，是否跟著 `engine.mapConfig.layout`、等距壓扁（`ISO_SCALE_Y`）與半徑是否與格頂一致、高度與深度排序鍵。
> 結論：只有「V1 預烘焙零件」與「MaterialPainter 預烘焙地面貼圖」兩條管線在 POINTY 地圖錯位 30°，已修；其餘管線本來就吃 layout。**FLAT 輸出逐像素不變**（見 §4）。

## 1. 唯一來源

`HexGeometry`（`engine/graphics/utils/HexGeometry.ts`）：

- `layoutAngle(layout)`：FLAT = 0（平頂，頂點在左右）、POINTY = π/6。`getVertices` 也改由它取角度。
- `alignRotation(layout, bakedAngle = 0)`：以 `bakedAngle` 烘焙的六角圖，在地面平面上要再轉多少才與該版面的格子同向。FLAT 烘焙的圖在 FLAT 為 0、在 POINTY 為 π/6（六角每 60° 對稱，所以轉 π/6 即等同換成尖頂）。

## 2. 稽核表

「跟 layout」＝六角頂點方向由 `layout` 決定；「壓扁」＝ `ISO_SCALE_Y` 在旋轉之後套用（先在地面轉再投影）。

| 繪製處 | 跟 layout | 壓扁／半徑 | 錨點高度 | 深度鍵 | 結果 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 地形格 `TerrainRenderer.bakeBlock`／`TerrainLoopAtlas`／`SurfacePainter`（液面、冰光） | 是 | 是，r = HEX_SIZE | `getIsoVisualY(base, h)`；VOID／MAGMA 整塊以 `floatOffset` 平移 | `y = visualBaseY + h·0.7` | 正確 |
| `GridOverlays`（懸停、射程、縮圈預警、最後一戰、區域、燈光） | 是 | 是；0.9～1.0 倍 | 格頂 `visualSurfaceY`，**不含漂浮位移**（見 §5-A） | OVERLAY：`y = visualBaseY`、`sortBias = HEX_SIZE·0.5` | 對齊（POINTY 截圖確認） |
| `ZoneRenderer`（區域預警圈） | 是 | 是 | 同 GridOverlays | 同 OVERLAY | 正確 |
| AOE 預警高亮（`GridRenderStrategy` 的 `_castingAOE` → OVERLAY） | 是 | 是 | 格頂 | 同 OVERLAY | 正確 |
| `HazardPainter`（液面、延伸柱、霧） | 是（`drawLiquid`／`drawExtrusion` 傳 layout；霧為圓形貼圖） | 是 | 格頂＋`applyLayerBias` | HAZARD：`y = visualBaseY + h·0.7` | 正確 |
| `GroundEffectPainter`、`UnitIndicatorPainter`（技能落點環）、`UnitAuraPainter`（詠唱／奧義光環） | 是（`traceHex`／`traceRotatedHex` 傳 layout） | 是 | 單位腳底 `surfaceY` | AURA：`y = 腳底 + h·0.7`、`sortBias = HEX_SIZE·0.5` | 正確 |
| 護盾稜柱 `ShieldPainter`→`VolumePainter.draw3DPrism` | 是 | 是；`SHIELD_VISUAL.radius` | body center ＋ `computeShieldGeometry` | 隨單位 | 正確 |
| 障礙物 sprite `EnvironmentFactory.generateObstacle`（快取鍵含 layout） | 是 | 是 | 格頂 | OBSTACLE | 正確 |
| 直接繪製管線 `ProceduralPainter`（`GIANT_HEX`、`HEX_BEAM`、`DOMAIN`、`BLACK_HOLE`…）、`GroundPainter` 向量部分（`SHOCKWAVE`／`RING`／`BLAST`／`HEX_GLOW`／`GRID_FIELD` 一般格） | 是 | 是 | 粒子 z／groundZ | 地面粒子：`sortBias = gHalfH + 15` | 正確 |
| **`GroundPainter` 材質場 `drawFireField`／`drawIceField`／`drawPoisonField`／`drawVoidField`**（`MaterialPainter.bake*` 以 FLAT 烘焙，`traceHex(..., false)` 預設 FLAT） | **否** | 是 | 同上 | 同上 | **POINTY 錯位 30° → 已修**（繪製時轉 `alignRotation`） |
| **V1 零件 `PART_GROUND`**（六角環、斷裂環、法陣外框、`cast_break`、奧義法陣）：`PartBakers.hexVertex` 起始角 `VFX_PARTS.HEX.ANGLE_OFFSET_RAD = 0` | **否** | 是（`scaleY = ISO_SCALE_Y`） | 同上 | 地面粒子：`gHalfW` 取 sprite 範圍×縮放 | **POINTY 錯位 30° → 已修**（見 §3） |
| V1 零件 `PART`／`PART_DEBRIS`（看板：光暈、火焰、碎片、閃電…） | 不適用（不貼地） | 不壓扁 | — | AIR_VFX | 不處理 |
| `HEX_*` 粒子貼圖（`HEX_LOCK`／`HEX_HALO`／`HEX_PRISM`／`HEX_RUNE`／`HEX_SHIELD`／`HEX_SKULL`／`HEX_ANGRY`、`ROCK`、`HEX_GRID`）、UI 圖示（`UIFactory`） | 否（`applyIso=false` 的看板圖示／UI） | 不壓扁 | 看板 | AIR_VFX | 不貼地，刻意不跟版面；不處理 |
| `MaterialPainter` 單位底座／冰殼等（`weatherToken`、`bakeIceCrust` 供材質場使用） | — | — | — | — | 材質場已於上列處理 |
| 地形 `drawTerrainDetail`（草、冰光、沙紋） | 是（line 224 依 layout） | 是 | 格頂 | 隨地形 | 正確 |
| `GridCache` 鄰格高度遮罩 | 是（`getVertices(1, true, layout)` 的邊序） | — | — | — | 正確（`TerrainEdgeMask` 測試涵蓋 FLAT／POINTY） |

## 3. 修法

1. **一個角度來源**：`HexGeometry.layoutAngle` / `alignRotation`（上述）；`getVertices` 沿用同一來源，行為不變。
2. **零件**：`PartPainter.draw` 對 `PART_GROUND` 在 `drawPart` 的旋轉上加 `alignRotation(layout, VFX_PARTS.HEX.ANGLE_OFFSET_RAD)`。`drawPart` 本來就是「先 `scale(1, ISO_SCALE_Y)` 再 `rotate`」，等同在地面平面轉完再投影。每幀成本不變（無配置，FLAT 時旋轉值為 0 且不呼叫 `rotate`）。`ParticleRenderer` 把 `layout` 傳進來。
3. **有方向的圖騰**：獅盾、顱骨、倒三角整張轉 π/6 會歪。這三種法陣在 POINTY 時由 `VFXPartStore.get(spec, groundRotation)` 另烘一張「圖騰反向轉 −π/6」的版本（外框、刻度仍是六角、跟著格子轉；圖騰在螢幕上保持正向），快取鍵多一段 `emblemRot`。太陽紋（12 道放射、24 刻度，皆為 30° 倍數）本身對稱，直接跟著轉、不另烘。FLAT 的快取鍵與烘焙內容不變。`VFXPlayer` 在生成 emitter 時用 `VFXSystem.hexLayout`（讀 `engine.mapConfig.layout`）決定要不要傳 `groundRotation`；換版面後新生成的粒子會用對應 sprite，舊粒子自然淡出。
4. **材質場**：`GroundPainter` 四處 `drawImage(MaterialPainter.bake*)` 在 `ctx.scale(1, ISO_SCALE_Y)` 後加 `alignBakedHex(ctx, layout)`（FLAT 為 0，不呼叫 `rotate`）。
5. 沒有動：資料檔（`data/vfx/registry/**` 的零件配方）、`TerrainRenderer.bakeBlock`、`engine/renderers/units/**`、`RenderList` 排序鍵。

## 4. 驗證

- 截圖：`node tools/ui-e2e/hex-align-shot.mjs [--layouts=FLAT,POINTY] [--tag=before|after]`，輸出 `tools/ui-e2e/out/hex-align/<layout>_<shot>_<tag>.png`（gitignore）。涵蓋覆蓋層（懸停、射程、縮圈預警、危險區、護盾）、AOE 預警、詠唱中斷（施法者環＋AOE 斷裂環）、四種法陣圖騰、四種材質場、七格 r=48 斷裂環。
- **FLAT 修改前後 10 張逐像素相同**（`PIL.ImageChops.difference` 皆為空）；POINTY 受影響的 8 張（斷裂環、法陣、材質場）改變，覆蓋層與 AOE 預警（本來就吃 layout）相同。
- 單元測試：`tests/HexLayoutAlign.test.ts`（角度來源、FLAT 為 0、POINTY 旋轉後頂點與 `getVertices('POINTY')` 一致、圖騰另烘條件、`PartPainter` 旋轉在壓扁之後且看板不轉）。
- `npm run lint` 0 錯；`npx vitest run --dir tests` 44 檔 421 測試全過；`npm run build` 成功；`npm run perf:guard` 保真 6 項全 PASS（沒有重錄基準）、效能比值 1.00。

## 5. 發現但沒修（不屬本輪範圍或會碰別人的檔案）

**A. 漂浮地圖（VOID／MAGMA）上，地形整塊 ±4 px 上下漂浮，覆蓋層／危險區／地面特效／單位不漂浮。**
`TerrainRenderer.drawBlock` 以 `floatOffset = sin(t·1.5 + x·0.01 + y·0.01)·4`（量化到 `RENDER_CACHE.FLOAT_STEP`）平移地形；`GridOverlays`、`HazardPainter`、`VFXRenderer` 的地面粒子、單位的 `terrainHeight` 都沒有加同一個位移。結果：格線與其上的六角圖形、單位腳底在垂直方向最多相差 4 px 並隨時間振盪，格頂看起來「浮動」而上面的東西釘在原位。**這很可能就是「單位陷進地形／格線閃爍」類現象的來源之一**，但修法要碰地形與單位的深度鍵（`floatOffset` 若併入單位 `terrainHeight` 或 `sortBias` 需同步排序鍵），建議交給 `fix/unit-sink-flicker`。我沒有改任何排序鍵。
**B. `SpriteManager.getSpecialModel('ICE')` 寫死 `generateIceBlock('FLAT')`**（`engine/sprites.ts:90`）。冰凍單位的冰塊是直立的單位覆蓋（`UnitBodyPainter` 以 96×128 貼在單位上，`hard-light`），不是貼地圖形，POINTY 下底座六角會是平頂；影響很小。繪製點在 `engine/renderers/units/**`（他人範圍），要修需把 layout 傳進去並讓快取鍵含 layout。
**C. 旋轉中的法陣**：`vRotation` 讓法陣整張在地面上旋轉，旋轉中外框與格線本來就不會對齊（FLAT 也一樣），我只保證起始方向對齊。要求持續對齊的特效應把 `vRotation` 設 0 或用 60° 倍數。
**D. 深度（只記錄，沒改）**：地面粒子的前緣 `gHalfH = halfW·ISO_SCALE_Y`（圓形外接）對 FLAT（前緣頂點 y = 0.433r）與 POINTY（0.5r）都 ≥ 實際前緣，單位抬升判定（橢圓）偏寬鬆但不會漏判；OVERLAY／AURA 的 `sortBias = HEX_SIZE·0.5` 等於 POINTY 前緣、比 FLAT 前緣（0.433r ≈ 20.8）多約 3 px，目前沒有可見問題。以上都與旋轉對齊修正無關，旋轉不改變零件的外接圓，所以 `gHalfW`／`gHalfH` 與抬升判定在兩種版面都維持有效。
