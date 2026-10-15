# 地形 R1 報告：地表光照與高度接合

分支 `feat/terrain-r1`。量測工具：`node tools/ui-e2e/terrain-contrast.mjs [--grid] [--name=x] [--layout=POINTY] [--skin='{json}']`。
亮度＝Rec.709 luma（sRGB 值），height = 2*BLOCK_HEIGHT，FLAT，variant 0，scale 1；頂面中央 9x9、側面中段 7x7。

## 1. T0 基線（改動前）與 T3 最終（改動後）
| biome | path | T0 top | T0 light/top | T0 dark/top | T3 top | T3 light/top | T3 dark/top |
| :-- | :-- | --: | --: | --: | --: | --: | --: |
| VOID | texture | 43.1 | 0.629 | 0.463 | 23.3 | 0.893 | 0.330 |
| FOREST | texture | 88.1 | 0.655 | 0.696 | 52.6 | 0.682 | 0.278 |
| ICE | texture | 164.1 | 0.657 | 0.774 | 127.6 | 0.558 | 0.261 |
| MAGMA | texture | 96.8 | 0.295 | 0.286 | 46.4 | 0.418 | 0.178 |
| DESERT | texture | 150.2 | 0.838 | 0.616 | 104.7 | 0.893 | 0.297 |
| VOID | procedural | 40.0 | 1.588 | 0.567 | 同 T0 | | |
| FOREST | procedural | 66.9 | 1.206 | 0.532 | 同 T0 | | |
| ICE | procedural | 123.3 | 0.776 | 0.469 | 同 T0 | | |
| MAGMA | procedural | 49.8 | 1.079 | 0.452 | 同 T0 | | |
| DESERT | procedural | 98.3 | 1.340 | 0.656 | 同 T0 | | |

- 驗收（貼圖路徑 <= 程序化 x1.15）：T0 時 FOREST、ICE 的 dark/top 未過（0.696 > 0.612、0.774 > 0.539）；T3 FLAT 與 POINTY 兩種 layout 全部通過。
- 注意：程序化路徑（`useSkin === false`）是平塗色，不是舊基準的漸層外觀，所以它的 light/top 常大於 1。舊外觀請看對照圖。
- 頂面平均 RGB（T3）對照 `theme.top`：VOID 18,23,40 vs #1e293b；FOREST 13,67,23 vs #14532d；ICE 56,139,229 vs #3b82f6；MAGMA 141,21,14 vs #7f1d1d；DESERT 199,86,10 vs #b45309。色系一致，亮度因漸層（rim → top → sideDark）中央偏暗。

## 2. 混合選擇
`bakeBlock` 現在先以光照漸層全強度填底色（頂面 `rim → top → sideDark`；側面 亮側 `sideLight → sideDark`、暗側 `sideDark → TERRAIN_SKIN.sideShadeFloor`），再以 `globalCompositeOperation` 疊貼圖。
試過三組（`terrain-contrast.mjs --skin`），都通過驗收：
| 組 | 結果 |
| :-- | :-- |
| soft-light 0.7 | 細節最淡，ICE／DESERT 偏平；對照圖 `terrain_r1_grid_soft-light_0.7.png` |
| **overlay 0.5（採用）** | 細節清楚、頂面較亮、dark/top 全在 0.18-0.33；`terrain_r1_grid_overlay_0.5.png` |
| multiply 0.5 | 整體變暗（ICE top 90、DESERT top 76），只跑數字未出圖 |
理由：overlay 在不改變光照明暗的前提下保留最多貼圖細節，且 ICE／DESERT 高低差回來。已知取捨：VOID 與 FOREST 頂面偏暗（VOID top luma 23）。要更亮調 `topDetail.alpha` 或換 soft-light。
最終對照圖：`tools/ui-e2e/out/terrain_r1_grid.png`（左舊 13ad34c、右新）、`terrain_r1_grid_t2.png`（T2 完成當下）。戰場截圖：`terrain_r1_battle_start.png`、`terrain_r1_battle_shrink.png`、`terrain_r1_battle_late.png`。

## 3. 遮罩位元配置與邊方向推導
- `CachedTile.edgeMask`：6 bit，bit i = 邊 i（`HexGeometry.getVertices` 頂點 i → i+1）。快取鍵 bit 25-30（`EDGE_MASK_BIT_SHIFT = 25`），其餘欄位不動，總長 < 2^31。
- 推導（`GridCache.getEdgeTable(layout)`，每種 layout 算一次）：以 `HexMath.neighbors` 取六個鄰格方向，用 `HexUtils.toPx` 取鄰格中心相對方向，找夾角餘弦最大的邊中點；六條邊必須各被認領一次，否則丟錯。前側／背側由鄰格中心相對位置的 y 分量判定（>= 0 為前側）。
- 方向 → 邊（`HexMath.directions` 順序 (1,0) (1,-1) (0,-1) (-1,0) (-1,1) (0,1)）：FLAT = 邊 0,5,4,3,2,1；POINTY = 邊 5,4,3,2,1,0。測試以獨立幾何推導的表驗證。
- FLAT：前側 {0,1,2}、背側 {3,4,5}。POINTY：前側 {0,1,2,5}、背側 {3,4}。POINTY 的邊 2、5 是左右兩條垂直邊，法線 y 恰為 0，依合約「y >= 0」歸前側，但它們在畫面上沒有可見的側面；若不想要亮邊落在垂直邊上，需要改合約的判定（目前遊戲預設 FLAT）。
- 邏輯：前側 bit = 鄰格不存在或比本格低 >= `edge.minStep`；背側 bit = 鄰格比本格高 >= `edge.minStep`。掉落中的地塊遮罩為 0。只在貼圖路徑烘焙亮邊／陰影／輪廓淡化，程序化路徑不變。
- 每幀成本：`drawBlock` 只多一個整數參數併入 key；鄰格查詢只在 `GridCache.rebuild`（`mapVersion` 變動）。`perf:ab --assert` 通過。

## 4. 快取 sprite 數與 evictions（`?perf`、`TerrainRenderer.store.getStats()`）
單一地圖（seed 1337）、每個 scale 的 sprite 數（5 個級距 1/1.5/2/3/4 各自數量相同）：
| biome | 無遮罩（T1） | 有遮罩（T2） |
| :-- | --: | --: |
| VOID／MAGMA | 127 | 159 |
| FOREST／ICE／DESERT | 26 | 114 |
- 單一地形跑完 5 個級距：最多 159 x 5 = 795，未超過 `MAX_TERRAIN_SPRITES` 一半（1024），evictions 0。
- **合約字面驗收未通過**：五個地形 x 所有級距全部累積在同一個快取，T2 後 sprite 總數 1752、evictions 1548（miss 3300）；T1（無遮罩）同樣流程已是 1660，本來就超過 1024。三個種子累計仍是 evictions 持續增加但沒有 clear。依指示未調整上限，請主代理決定（例如減少遮罩位元的實際組合、降低 variant 數，或把上限改為每地形計）。

## 5. 驗證結果
`npm run lint` 0 錯誤；`npm test` 35 檔 324 測試通過（新增 `tests/TerrainEdgeMask.test.ts` 18 項）；`npm run build` 成功；`npm run perf:ab -- --assert` 通過；T4 重錄後 `npm run perf:fidelity` 六張全部 0 差異；`npm run perf:guard` 通過。戰場實跑（含縮圈）：單位、地塊、障礙物深度順序正常，掉落地塊無殘留黑邊；console 只有一筆 404 資源錯誤（未追查，疑為 favicon）。

## 6. 回退指南
| commit | 內容 |
| :-- | :-- |
| `ec331dc` | T0 量測工具與報告草稿 |
| `5993805` | T1 光照／貼圖拆層（`constants.ts`、`TerrainRenderer.ts`） |
| `dff0b28` | T2 鄰格遮罩（資料管線、烘焙、測試） |
| `7cf50f3` | T4 重錄 6 張保真基準 |
回退順序：先 `git revert 7cf50f3`，再 `dff0b28`，再 `5993805`（基準要與程式一起回退，否則 `perf:fidelity` 會失敗）；`ec331dc` 只是工具，可保留。只想關掉 T2 的視覺：把 `TERRAIN_SKIN.edge` 的 `flatRimAlpha` 設成與 `cliffRimAlpha` 相同、`lip.alpha` 與 `ao.strength` 設 0（鍵仍含遮罩，快取數量不變）。

## 7. 調整手冊（`constants.ts` 的 `TERRAIN_SKIN`；改後需重錄地形保真基準）
- 頂面貼圖細節強弱／混合：`topDetail.blend`（soft-light / overlay / multiply）、`topDetail.alpha`。
- 側面貼圖細節：`sideDetail.blend`、`sideDetail.alpha`。
- 暗側面底端色：`sideShadeFloor`（亮側底端取 `theme.sideDark`）。
- 崖邊亮邊：`edge.lip.width`、`edge.lip.alpha`（顏色取 `theme.rim`）。
- 接觸陰影：`edge.ao.widthRatio`（寬度比例）、`edge.ao.strength`（起點強度）。
- 輪廓線：`edge.flatRimAlpha`（平接邊）、`edge.cliffRimAlpha`（有落差邊）。
- 判定落差的最小高度差：`edge.minStep`（預設 `BLOCK_HEIGHT`）。
- `tintStrength` 已標 deprecated，不再影響畫面。
