# 地形 R2 報告：地表氛圍效果正式化

分支 `feat/terrain-r2`。量測：`node tools/ui-e2e/terrain-cost.mjs`（2560x1440 有頭、不鎖幀率、RTX 4070、只有地形、ROUNDS=3、每回合 5 秒）。結果 JSON：`tools/ui-e2e/out/terrain_cost_T0.json`、`terrain_cost_T4.json`（gitignored）。

## 0. 結論（先看這裡）
- **T4 第 2 項驗收（成本下降 >= 60%）沒有通過**，依合約停下回報數字，沒有放寬門檻。因此 **沒有執行 T5（重錄基準）**。
- 但現有基準不重錄也全過：`perf:fidelity` 六張 meanAbsDiff 0.000～0.218（門檻 0.8）、`perf:guard` 通過。是否仍要重錄由主代理決定。
- 以 `drawTerrainDetail`／`drawLiquid` 的自耗計：FOREST -69%、ICE -62%、DESERT -92% 達 60%；MAGMA 液面只 -3%（見 §2）。

## 1. 成本表（ms，中位數／p99）
`cost` = baseline - no_all（地表細節＋液面＋天氣粒子）；`surface` = baseline - no_surface（只關地表細節＋液面）。`self` = `drawTerrainDetail`＋`drawLiquid` 每幀自耗。幀間隔解析度 0.1 ms，差值有 +-0.1～0.2 ms 雜訊。

| biome | T0 med | T4 med | T0 p99 | T4 p99 | cost med T0 -> T4 | surface med T0 -> T4 | self T0 -> T4 |
| :-- | --: | --: | --: | --: | :-- | :-- | :-- |
| VOID | 1.8 | 1.2 | 6.5 | 3.5 | 0.8 -> 0.3 (-63%) | 0.5 -> 0.1 (-80%) | 0.304 -> 0.034 |
| FOREST | 2.4 | 1.6 | 8.0 | 13.1 | 1.4 -> 0.7 (-50%) | 1.1 -> 0.5 (-55%) | 0.724 -> 0.225 (-69%) |
| ICE | 2.9 | 2.1 | 20.2 | 19.6 | 0.6 -> 0.9 (+50%，雜訊) | 1.0 -> 0.5 (-50%) | 0.542 -> 0.208 (-62%) |
| MAGMA | 1.7 | 1.5 | 6.3 | 7.2 | 0.6 -> 0.5 (-17%) | 0.4 -> 0.4 (0%) | 0.321 -> 0.237 (-26%) |
| DESERT | 2.2 | 2.0 | 8.0 | 6.5 | 1.3 -> 1.1 (-15%) | 0.3 -> 0.1 (-67%) | 0.434 -> 0.036 (-92%) |

驗收判定（FOREST／DESERT／ICE／MAGMA，`baseline - no_all` 中位數至少 -60%）：FOREST 未過（-50%）、DESERT 未過（-15%）、ICE 未過（+50%）、MAGMA 未過（-17%）。
- `no_all` 同時關掉天氣粒子，而天氣在 R2 的 tier 0 刻意不變（DESERT 常駐約 185 顆、ICE 約 115 顆），它是 `cost` 的大宗：DESERT 的 `cost` 1.3 ms 只有約 0.3 ms 是地表細節。所以 `cost` 指標對 DESERT／ICE 結構上不可能達標；改看 `surface` 與 `self` 較準。
- 整體幀中位數：VOID 1.8->1.2、FOREST 2.4->1.6、ICE 2.9->2.1、MAGMA 1.7->1.5、DESERT 2.2->2.0。
- p99 沒有改善且雜訊大（FOREST 13.1、ICE `no_all` 34.5 都是單次尖峰），見 §4 ICE 調查。
- 量測工具修正（T0）：R0 版天氣粒子其實沒有生成（引擎未在跑，`simDt` 為 0；設成 running 也會因無單位立刻 `stop()`）。現改為攔截 `VFXSystem.prototype.update`，dt 為 0 時餵真實幀間隔。因此 R0 的「天氣粒子量不到差異」不成立。

## 2. 每個效果改成什麼
| 效果 | 方式 | 每格每幀 |
| :-- | :-- | :-- |
| DESERT 沙紋 | 烘進 `bakeBlock`（頂面貼圖與 grain 之後、R1 邊緣處理之前；非貼圖路徑也烘）。偏移改依 `variant`（`SAND_RIPPLES.variantPhases`），不再依螢幕座標 | 0（在 sprite 內） |
| VOID 紋路 | 同上烘焙；「只有部分格有紋路」改由 `VOID_RUNES.variantMask[variant]` 決定（4 個 variant 取 2 個，舊版約 59% 的格子） | 0 |
| ICE 冰面反光 | `TerrainLoopAtlas.getIce`：24 張預先裁成六角形的影格，週期 5 s（= `slideWrap / 0.5`）。執行期無 clip／漸層 | 1 次 drawImage |
| FOREST 草叢 | 3 叢草合成同一張，每個 `variant` 一組（tuft 精靈編號隨 variant 輪替，variant 0 與舊版相同）x 16 張風擺影格，週期 2π/1.2 s；`x * windXPhase` 做相位偏移保留波浪 | 1 次 |
| MAGMA 液面 | `drawLiquid` 簽名不變；`TerrainLoopAtlas.getLiquid` 依（顏色、layout、量化強度 0.1）分槽，每槽 60 張影格、週期 12 s、諧波數皆為整數（頭尾無縫）；槽數上限 `RENDER_CACHE.LOOP_LIQUID_SLOTS`=16（LRU） | 1 次 |
| 天氣粒子 | `VFXAmbience` 讀 `WEATHER_AMBIENCE`；生成間隔除以 `VFX_BUDGET.TIER_EMISSION_RATIOS[tier]`；同時存在的 `ATMOSPHERE` 上限 `maxActive` x 同係數 | - |

MAGMA 為何沒變快：舊版液面本來就是「快取槽 hit 後一次 drawImage」，每 0.05 秒才重畫一次，攤提後成本很小；R2 讓它不再重畫（也讓 `HazardPainter` 的液態區同樣受益），但主要成本是 drawImage 本身，已到下限。要再降只能減少格數（剔除視窗外、合併成大圖），超出本輪範圍。

其他：`constants.ts` 的 `RENDER_CACHE.LIQUID_TIME_STEP`／`LIQUID_CACHE_SLOTS` 現已無人引用（合約只准加欄位，所以保留）；`VFXFactory.getTerrainDetail` 的 FOREST 分支（三角形）原本就沒有呼叫者，未動。

## 3. 圖檔（`tools/ui-e2e/out/`）
- `terrain_r2_grid.png`：左 = `main` 的保真基準（R1），右 = R2（`terrain-contrast.mjs --grid --base=main --grid-out=terrain_r2_grid.png`）。
- `terrain_r2_anim.png`：ICE／FOREST／MAGMA 在週期 0、1/4、1/2、3/4 的同位置裁切（`--anim`，以 `battleTime` 驅動）。ICE 高光帶與 MAGMA 氣泡、暗斑明顯移動；FOREST 風擺幅度只有 4 px，肉眼差異細微，且各格相位不同，沒有整片同步閃爍。
- `terrain_r2_battle.png`：實際進戰場（骰到 DESERT，沙塵粒子 100 顆、單位與地塊深度順序正常）。

## 4. 調查結果
**粒子重複加入**：沒有。`VFXStateManager.getParticle()` 只從池取出或新建，從不放進 `particles`；全專案每個 `getParticle()` 呼叫點各自 `particles.push` 恰一次（`VFXAmbience`、`VFXPlayer`、`VFXSystem.playBeam`、`UnitShatter`、`SequenceSystem`）。實跑驗證：5 個地圖各 8 秒後 `new Set(particles).size === particles.length`；戰場中 242 顆也無重複。

**ICE p99 約 19 ms 的來源**：ICE 地圖的 `AURORA` 背景（`engine/renderers/background.ts` 的 `drawAurora`，3 條全寬 `screen` 混合漸層帶，不在本輪範圍，**只報告未修**）。證據（`?perf` 尖峰記錄＋rAF，2560x1440，20 秒）：
| 條件 | 中位數 | p99 | >8.4 ms 幀數 |
| :-- | --: | --: | --: |
| ICE 預設 | 2.10 | 19.50 | 284 / 6841 |
| ICE 關色調分級 | 1.70 | 19.10 | 465 / 7419 |
| ICE 把 `bgFeature` 改 NONE | 1.60 | 6.20 | 38 / 11780 |
| VOID 預設 | 1.30 | 3.50 | 23 / 14309 |
尖峰約每 30～100 ms 出現一次，大小集中在 18～20 ms；尖峰記錄顯示 CPU 階段加總不到 1 ms，卡在 `post` 階段（GPU 工作的等待落在那裡）。所以與地表細節、液面、天氣、色調分級無關。建議另開一輪處理 aurora（預渲染成低解析度循環影格或改漸層 sprite）。

## 5. 驗證
`npm run lint` 0 錯誤；`npm test` 36 檔 341 項通過（新增 `tests/TerrainAmbience.test.ts` 17 項）；`npm run build` 成功；`npm run perf:ab -- --assert` 通過；`npm run perf:fidelity` 六張全過（未重錄，`perf:guard` = 兩者皆過）；`terrain-contrast.mjs` 驗收 PASS。

## 6. 回退指南
| commit | 內容 |
| :-- | :-- |
| `cb89e8a` | T0 量測工具與報告草稿（可保留） |
| `b486593` | T1 設定表（`data/vfx/terrainAmbience.ts`、`types.ts`）與 `VFXAmbience` |
| `9ec7f59` | T2 DESERT／VOID 靜態細節烘焙 |
| `728e3a7` | T3 循環影格（`TerrainLoopAtlas`、`SurfacePainter`、`TerrainRenderer`、測試） |
| `675f742` | T4 `terrain-contrast.mjs` 新選項（可保留） |
回退順序：`git revert 728e3a7`，再 `9ec7f59`，再 `b486593`（後做的先退；T3 依賴 T1 的設定表，T2 的 `SurfacePainter` 改動也被 T3 覆蓋）。只想關掉粒子上限／階層係數：把 `WEATHER_AMBIENCE[*].maxActive` 設很大。

## 7. 調整手冊（`data/vfx/terrainAmbience.ts`；動畫影格改後需重新整理頁面或呼叫 `TerrainLoopAtlas.reset()`，烘焙型細節隨地形 sprite 重烘）
- 冰面反光：`ICE_SHEEN.loop.frames`（細緻度）、`bandHalfWidth`／`bandPeakColor`（高光帶寬度與亮度）、`scratches`（刮痕）。
- 草叢風擺：`GRASS_DETAIL.windAmplitude`（幅度 px）、`windXPhase`（波浪密度）、`loop.frames`、`tufts`（位置）、`sprite`（單叢外觀）。
- 熔岩液面：`TERRAIN_AMBIENCE.MAGMA.liquid`（顏色、強度）；`TERRAIN_LIQUID.loop`（週期、影格數；諧波 `flowHarmonic*`／`bubbleHarmonic*` 必須是整數）、`intensityStep`（強度分槽粒度，越小槽越多）。槽數上限 `constants.ts` 的 `RENDER_CACHE.LOOP_LIQUID_SLOTS`。
- 沙紋：`SAND_RIPPLES.alpha`、`lineWidth`、`variantPhases`；紋路貼圖：`VOID_RUNES.variantMask`、`alpha`、`armLength`。
- 天氣：`WEATHER_AMBIENCE[ambientType]` 的 `interval`（生成間隔）、`maxActive`（上限）、`colors`／`primaryChance`、`size`／`vx`／`vy`（`min + random * spread`）、`life`（null = 飛越範圍）、`blendMode`；生成範圍 `WEATHER_BOUNDS`。
