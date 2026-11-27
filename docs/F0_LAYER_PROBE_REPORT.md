# F0 戰場分層亮度與彩度探針

## 結果

探針輸出 12 張三欄圖與 `layers.json`。12 張都有單位本體像素，且分層像素總和等於原生畫布像素數。FOREST 桌機、手機都只保留 9／10 個存活單位的本體像素。兩次覆蓋驗收都回傳 1，第二次停在這兩筆。亮度順序有 12 筆違反。數字來源為下方 P2 命令及 `tools/ui-e2e/out/agent-logs/f0-layers-wide.log`。

## P1 來源與遮罩算法（靜態）

- 主畫布依排序後的 RenderOp 逐一分發，再畫剪影與狀態。色調分級複製原畫布並套 Canvas filter，之後才畫螢幕 HUD。探針在同一幀代理主畫布 context，照實際呼叫先後重放到透明畫布。色調分級及其他全畫面後處理沿用當時的歸屬，讀回的 RGB 取自原畫布全部畫完以後。見 `engine/renderers/RenderSpec.ts:31`、`engine/renderers/RenderPipeline.ts:205`、`engine/renderers/RenderPipeline.ts:318`、`engine/renderers/PostProcessor.ts:59`、`tools/ui-e2e/layer-luma-probe.mjs:139`、`tools/ui-e2e/layer-luma-probe.mjs:213`、`tools/ui-e2e/layer-luma-probe.mjs:317`。
- 透明畫布沿用原呼叫的變換、路徑、裁切、取樣與 alpha。同一歸屬連續繪製時按 source-over 累積覆蓋，像素 alpha 達到 64／255 才覆寫前一筆歸屬。此規則也套用加法、screen 和 multiply 混合的來源覆蓋。數字量的是合成後顏色，遮罩歸屬依 alpha，無法反推出混色中各來源的亮度貢獻。所有像素起始歸背景。見 `tools/ui-e2e/layer-luma-probe.mjs:40`、`tools/ui-e2e/layer-luma-probe.mjs:150`、`tools/ui-e2e/layer-luma-probe.mjs:167`、`tools/ui-e2e/layer-luma-probe.mjs:239`。
- 地形烘焙先畫側面，再畫頂面。探針截取烘焙時使用的六角頂點、縮放與錨點。實際 blit 時先以完整精靈 alpha 標側面，再以裁到六角內的同一張精靈標頂面。六角外的崖邊裝飾隨側面計入，地表液面、細節和棋座／投影陰影隨頂面計入。貼地特效用 GroundDrape 呼叫另行標記。見 `engine/renderers/grid/TerrainRenderer.ts:254`、`engine/renderers/grid/TerrainRenderer.ts:385`、`engine/renderers/grid/TerrainRenderer.ts:451`、`engine/renderers/RenderDispatcher.ts:65`、`tools/ui-e2e/layer-luma-probe.mjs:74`、`tools/ui-e2e/layer-luma-probe.mjs:128`、`tools/ui-e2e/layer-luma-probe.mjs:222`。
- 障礙物由 OBSTACLE op 畫出圖集切片或退回精靈，合成影格含樹冠、樹幹和陰影。主畫布的 blit 無法分出樹冠，障礙物只量整層。背景畫布的遠景樹冠隨背景計入。見 `engine/renderers/RenderDispatcher.ts:83`、`engine/renderers/grid/ObstacleSpriteStore.ts:235`、`engine/renderers/RenderPipeline.ts:180`、`tools/ui-e2e/layer-luma-probe.mjs:113`。
- 單位本體用 UnitBodyPainter 的 agent ID 錨定。SpriteUnitRenderer 讀已染色並降採樣的離屏圖集，探針重放它的來源裁切，保留輪廓 alpha、縮放、旋轉及毒材質替換。變羊替換本體沿用相同 ID。核心、殘影、凍結牢籠、附身狀態效果、死亡演出及遮擋剪影記入 VFX。血條、狀態圖示、畫布上戰術資訊與導播框記入 HUD。HTML 疊層在量測的 Canvas 之外。見 `engine/renderers/units/SpriteAtlasStore.ts:332`、`engine/renderers/units/SpriteAtlasStore.ts:463`、`engine/renderers/units/factions/SpriteUnitRenderer.ts:194`、`engine/renderers/units/painters/UnitBodyPainter.ts:118`、`engine/renderers/RenderPipeline.ts:223`、`tools/ui-e2e/layer-luma-probe.mjs:113`、`tools/ui-e2e/layer-luma-probe.mjs:254`。
- Y 為 Rec.709 權重套用 sRGB 8-bit 通道，直接讀 `terrain-contrast.mjs` 的運算式。S 為 HSV saturation，範圍 0～1，黑色為 0。百分位數按排序位置線性插值。每個有像素的單位取最高及最低四分之一，樣本數向下取整且至少一個，亮組均值除以暗組均值。中位數使用可見單位的有效比值，暗均值為 0 的比值記為 null。這是可見像素的亮暗對比代理值，沒有對幾何表面做受光面的辨識。見 `tools/ui-e2e/terrain-contrast.mjs:149`、`tools/ui-e2e/layer-luma-probe.mjs:23`、`tools/ui-e2e/layer-luma-probe.mjs:269`、`tools/ui-e2e/layer-luma-probe.mjs:324`、`tools/ui-e2e/layer-luma-probe.mjs:351`。

## P2 場景和輸出（實跑）

```powershell
$env:E2E_BROWSER_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node tools/ui-e2e/layer-luma-probe.mjs
```

最終退出碼 **1**。同一命令以 repo 的 `tools/agent/run.mjs` 執行，完整終端表在 `tools/ui-e2e/out/agent-logs/f0-layers-wide.log`。npm 入口為 `package.json:19`。

沿用 fidelity 的合成時鐘、逐幀 rAF、固定地圖規格與戰鬥的骰子佈陣。五群系的 fidelity 地圖樣本沒有陣容，本探針補入同一批種子陣容，再跑 36 個畫面至 tick 35，使引擎完成出生淡入。戰鬥維持 120 個畫面，取 tick 119。兩類場景在最後一幀用既有鏡頭命令取戰場全景。這些是 F0 的取樣條件，群系及戰鬥影像與 fidelity 原基準的鏡頭和陣容條件有差異。見 `tools/ui-e2e/render-fidelity.mjs:203`、`tools/ui-e2e/render-fidelity.mjs:225`、`tools/ui-e2e/layer-luma-probe.mjs:20`、`tools/ui-e2e/layer-luma-probe.mjs:284`、`tools/ui-e2e/layer-luma-probe.mjs:435`。

桌機每欄 1280×720、DPR 1。手機模擬為 393×852 CSS px、DPR 3，依引擎上限以 DPR 2 畫入 786×1704 原生畫布。量測使用原生像素，手機對照圖每欄輸出 1179×2556。見 `tools/ui-e2e/perf-mobile-emu.mjs:62`、`engine/renderers/RenderQuality.ts:127`、`tools/ui-e2e/layer-luma-probe.mjs:26`、`tools/ui-e2e/layer-luma-probe.mjs:359`。

- 桌機及手機各有 `VOID`、`FOREST`、`ICE`、`MAGMA`、`DESERT`、`battle_frozen`，檔名為 `tools/ui-e2e/out/layers/<場景>_<裝置>.png`，裝置為 `desktop` 或 `mobile`。左欄原圖、中欄 Y 灰階、右欄遮罩疊圖。見 `tools/ui-e2e/layer-luma-probe.mjs:359`、`tools/ui-e2e/layer-luma-probe.mjs:425`。
- `tools/ui-e2e/out/layers/layers.json` 每幀附原生尺寸的索引遮罩 PNG。解碼 `mask.pngBase64` 後，R、G、B 按低位元組到高位元組組成 `mask.labels` 的索引，`unit:<ID>` 代表個別角色本體。圖例可查同檔的 `palette`。見 `tools/ui-e2e/layer-luma-probe.mjs:334`、`tools/ui-e2e/layer-luma-probe.mjs:364`、`tools/ui-e2e/layer-luma-probe.mjs:507`。
- 實際開圖檢視 `battle_frozen_desktop.png` 及 `FOREST_desktop.png`。粉色沿人物本體輪廓，黃色覆蓋血條與狀態圖示。FOREST 右方一棵樹冠上有橘色遮擋剪影，上方有紅方血條。兩裝置的索引表都有 `unit:RED-0007`，最終遮罩的可見本體統計沒有該 ID。見 `tools/ui-e2e/out/layers/layers.json`、`tools/ui-e2e/layer-luma-probe.mjs:129`、`tools/ui-e2e/layer-luma-probe.mjs:351`。

## 驗收

| 項目 | 驗證級別 | 結果與位置 |
| --- | --- | --- |
| 場景、桌機與手機輸出 | 實跑 | 12 張 PNG 及 JSON，見 `tools/ui-e2e/layer-luma-probe.mjs:425`、`tools/ui-e2e/layer-luma-probe.mjs:507` |
| 單位遮罩像素大於 0 | 實跑 | 12／12 張通過，見 `tools/ui-e2e/layer-luma-probe.mjs:474` 及下表 |
| 遮罩單位 ID 數等於引擎存活數 | 實跑，未完成 | 10／12 張通過。FOREST 兩裝置皆為 9／10，差 −1，缺 `RED-0007`，額外 ID 為 0。見 `tools/ui-e2e/layer-luma-probe.mjs:467` 及下表 |
| 分層像素加總 | 實跑 | 12／12 張通過。桌機每張 921,600、手機每張 1,339,344 原生像素，地形合計只計一次。見 `tools/ui-e2e/layer-luma-probe.mjs:466` |
| 地形頂面／側面 | 實跑 | 各自有像素數與 Y、S 統計，見 `tools/ui-e2e/layer-luma-probe.mjs:343` 及下表 |
| 障礙物樹冠拆分 | 靜態，未完成 | 主畫布的障礙物來源將樹冠與其餘部分烘為同幀。見 `engine/renderers/grid/ObstacleSpriteStore.ts:235` |
| 原圖、灰階與遮罩目視 | 實跑 | 已開兩張桌機圖，見 P2 記錄及 `tools/ui-e2e/layer-luma-probe.mjs:359` |
| `--assert-order` | 判式實跑，旗標備妥未跑 | 預設命令執行同一判式，列出 12 筆違反。旗標的獨立執行會重新做覆蓋驗收，因此按兩次失敗停下條件保留結果。見 `tools/ui-e2e/layer-luma-probe.mjs:478`、`tools/ui-e2e/layer-luma-probe.mjs:511` |

### 明度順序

依 `docs/ART_SPEC.md:14` 和派工指定的不等式。下表中位數及違反來源為 P2 命令，詳見 `layers.json` 的 `order` 陣列。兩裝置均有以下違反。可見單位 Y50 < 特效 Y50 在 12 張均成立。

| 場景 | 裝置 | 違反條件 | 左側 Y50 | 右側 Y50 |
| --- | --- | --- | ---: | ---: |
| FOREST | desktop | obstacle <= unit | 100.34 | 58.20 |
| ICE | desktop | terrain < unit | 75.67 | 57.26 |
| ICE | desktop | obstacle <= unit | 118.38 | 57.26 |
| DESERT | desktop | terrain < unit | 82.55 | 58.05 |
| DESERT | desktop | obstacle <= unit | 157.50 | 58.05 |
| battle_frozen | desktop | obstacle <= unit | 100.40 | 62.20 |
| FOREST | mobile | obstacle <= unit | 100.17 | 58.20 |
| ICE | mobile | terrain < unit | 75.39 | 57.41 |
| ICE | mobile | obstacle <= unit | 117.10 | 57.41 |
| DESERT | mobile | terrain < unit | 82.40 | 58.09 |
| DESERT | mobile | obstacle <= unit | 157.50 | 58.09 |
| battle_frozen | mobile | obstacle <= unit | 99.96 | 62.15 |

### 單位覆蓋與亮暗比

下表的像素數、ID 差值、亮暗比中位數均由 P2 命令產生。每個單位的分組平均與比值見 `layers.json` 的 `units`。

| 場景 | 裝置 | 單位像素 | 遮罩 ID／存活 ID | 差值 | 比值中位數 | 像素加總 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| VOID | desktop | 12042 | 10/10 | 0 | 3.503 | 921600 |
| FOREST | desktop | 10103 | 9/10 | -1 | 3.327 | 921600 |
| ICE | desktop | 11995 | 10/10 | 0 | 3.342 | 921600 |
| MAGMA | desktop | 11893 | 10/10 | 0 | 3.658 | 921600 |
| DESERT | desktop | 12047 | 10/10 | 0 | 3.244 | 921600 |
| battle_frozen | desktop | 9082 | 10/10 | 0 | 3.409 | 921600 |
| VOID | mobile | 10473 | 10/10 | 0 | 3.544 | 1339344 |
| FOREST | mobile | 8846 | 9/10 | -1 | 3.241 | 1339344 |
| ICE | mobile | 10498 | 10/10 | 0 | 3.262 | 1339344 |
| MAGMA | mobile | 10377 | 10/10 | 0 | 3.626 | 1339344 |
| DESERT | mobile | 10536 | 10/10 | 0 | 3.178 | 1339344 |
| battle_frozen | mobile | 7932 | 10/10 | 0 | 3.375 | 1339344 |

### 完整分層數據

下表轉錄 P2 命令的終端數字。Y 依序為 P05／P50／P95／平均，S 為 P50／P95／平均。地形合計與其兩個子層是重疊統計。

#### desktop

| 場景 | 層 | 像素 | Y | S |
| --- | --- | ---: | --- | --- |
| VOID | terrain | 405760 | 1.877 / 35.188 / 86.291 / 38.908 | 0.676 / 1.000 / 0.705 |
| VOID | background | 381168 | 1.588 / 37.703 / 73.025 / 35.600 | 0.732 / 1.000 / 0.788 |
| VOID | terrainTop | 207442 | 25.325 / 38.060 / 107.745 / 48.050 | 0.659 / 0.739 / 0.626 |
| VOID | terrainSide | 198318 | 1.372 / 17.397 / 77.009 / 29.344 | 0.846 / 1.000 / 0.786 |
| VOID | obstacle | 36891 | 20.317 / 49.866 / 166.781 / 58.605 | 0.438 / 0.744 / 0.434 |
| VOID | unit | 12042 | 25.909 / 56.315 / 185.242 / 74.384 | 0.359 / 0.835 / 0.382 |
| VOID | vfx | 92 | 69.703 / 123.065 / 212.975 / 131.063 | 0.412 / 0.697 / 0.408 |
| VOID | hud | 85647 | 53.664 / 70.515 / 128.698 / 79.351 | 0.708 / 0.797 / 0.668 |
| FOREST | terrain | 362058 | 1.155 / 53.219 / 109.703 / 51.858 | 0.981 / 1.000 / 0.925 |
| FOREST | background | 376636 | 28.412 / 52.027 / 97.827 / 56.431 | 1.000 / 1.000 / 0.998 |
| FOREST | terrainTop | 180738 | 38.772 / 59.589 / 120.044 / 67.460 | 0.952 / 1.000 / 0.884 |
| FOREST | terrainSide | 181320 | 0.866 / 27.184 / 86.663 / 36.306 | 1.000 / 1.000 / 0.965 |
| FOREST | obstacle | 96651 | 34.979 / 100.341 / 150.086 / 97.747 | 0.753 / 1.000 / 0.743 |
| FOREST | unit | 10103 | 26.143 / 58.198 / 183.749 / 74.047 | 0.389 / 0.870 / 0.425 |
| FOREST | vfx | 2586 | 94.466 / 163.963 / 193.323 / 158.582 | 0.489 / 0.735 / 0.510 |
| FOREST | hud | 73566 | 52.923 / 88.237 / 131.780 / 89.312 | 0.779 / 0.885 / 0.735 |
| ICE | terrain | 400873 | 3.452 / 75.667 / 131.466 / 69.467 | 0.860 / 1.000 / 0.818 |
| ICE | background | 386207 | 34.305 / 55.696 / 109.627 / 63.217 | 1.000 / 1.000 / 0.995 |
| ICE | terrainTop | 209138 | 59.699 / 87.168 / 134.199 / 89.160 | 0.833 / 0.877 / 0.767 |
| ICE | terrainSide | 191735 | 0.866 / 41.479 / 127.451 / 47.987 | 0.920 / 1.000 / 0.873 |
| ICE | obstacle | 36105 | 49.763 / 118.382 / 239.789 / 137.455 | 0.272 / 0.884 / 0.403 |
| ICE | unit | 11995 | 26.646 / 57.262 / 183.953 / 73.165 | 0.379 / 0.864 / 0.419 |
| ICE | vfx | 1063 | 85.925 / 147.477 / 237.484 / 154.075 | 0.371 / 0.664 / 0.367 |
| ICE | hud | 85357 | 68.682 / 94.745 / 137.376 / 98.190 | 0.530 / 0.644 / 0.526 |
| MAGMA | terrain | 387504 | 0.866 / 28.760 / 135.731 / 39.543 | 0.943 / 1.000 / 0.923 |
| MAGMA | background | 379964 | 9.504 / 36.835 / 70.481 / 37.405 | 0.868 / 0.974 / 0.877 |
| MAGMA | terrainTop | 199897 | 17.626 / 37.809 / 160.963 / 56.536 | 0.914 / 1.000 / 0.883 |
| MAGMA | terrainSide | 187607 | 0.722 / 10.417 / 63.550 / 21.437 | 1.000 / 1.000 / 0.965 |
| MAGMA | obstacle | 58061 | 21.937 / 37.856 / 118.906 / 47.799 | 0.359 / 0.979 / 0.424 |
| MAGMA | unit | 11893 | 26.429 / 55.331 / 184.127 / 72.456 | 0.403 / 0.865 / 0.440 |
| MAGMA | vfx | 1103 | 73.975 / 119.450 / 217.954 / 131.129 | 0.553 / 0.863 / 0.524 |
| MAGMA | hud | 83075 | 50.467 / 80.409 / 130.950 / 82.541 | 0.841 / 0.944 / 0.810 |
| DESERT | terrain | 391725 | 2.487 / 82.553 / 121.482 / 73.156 | 1.000 / 1.000 / 0.969 |
| DESERT | background | 384910 | 18.272 / 50.432 / 101.186 / 52.969 | 0.969 / 1.000 / 0.879 |
| DESERT | terrainTop | 202962 | 60.943 / 85.703 / 121.783 / 87.615 | 1.000 / 1.000 / 0.962 |
| DESERT | terrainSide | 188763 | 0.578 / 50.616 / 121.269 / 57.609 | 1.000 / 1.000 / 0.977 |
| DESERT | obstacle | 50796 | 55.762 / 157.497 / 194.399 / 147.908 | 0.362 / 1.000 / 0.445 |
| DESERT | unit | 12047 | 26.646 / 58.050 / 183.944 / 73.391 | 0.403 / 0.875 / 0.446 |
| DESERT | vfx | 1150 | 89.083 / 145.865 / 212.848 / 146.961 | 0.723 / 0.985 / 0.714 |
| DESERT | hud | 80972 | 64.595 / 91.747 / 138.480 / 96.870 | 0.894 / 0.987 / 0.853 |
| battle_frozen | terrain | 380473 | 0.939 / 55.290 / 111.595 / 54.650 | 0.972 / 1.000 / 0.916 |
| battle_frozen | background | 341765 | 28.340 / 52.171 / 100.117 / 57.843 | 1.000 / 1.000 / 0.997 |
| battle_frozen | terrainTop | 208589 | 40.918 / 60.786 / 120.039 / 68.322 | 0.946 / 1.000 / 0.880 |
| battle_frozen | terrainSide | 171884 | 0.794 / 28.615 / 87.188 / 38.057 | 1.000 / 1.000 / 0.960 |
| battle_frozen | obstacle | 87187 | 35.695 / 100.402 / 151.367 / 97.894 | 0.753 / 1.000 / 0.747 |
| battle_frozen | unit | 9082 | 26.143 / 62.201 / 184.527 / 76.635 | 0.420 / 0.831 / 0.438 |
| battle_frozen | vfx | 14300 | 82.756 / 136.231 / 214.448 / 140.261 | 0.521 / 0.816 / 0.511 |
| battle_frozen | hud | 88793 | 38.532 / 85.461 / 138.436 / 87.967 | 0.733 / 0.873 / 0.691 |

#### mobile

| 場景 | 層 | 像素 | Y | S |
| --- | --- | ---: | --- | --- |
| VOID | terrain | 350440 | 1.588 / 34.762 / 84.209 / 37.835 | 0.679 / 1.000 / 0.712 |
| VOID | background | 883208 | 1.588 / 44.068 / 75.592 / 42.336 | 0.736 / 1.000 / 0.770 |
| VOID | terrainTop | 176431 | 25.397 / 38.052 / 107.725 / 47.738 | 0.658 / 0.738 / 0.629 |
| VOID | terrainSide | 174009 | 1.372 / 16.473 / 74.280 / 27.794 | 0.850 / 1.000 / 0.796 |
| VOID | obstacle | 32420 | 20.385 / 49.866 / 164.712 / 58.433 | 0.438 / 0.744 / 0.437 |
| VOID | unit | 10473 | 25.790 / 56.401 / 185.378 / 74.342 | 0.358 / 0.836 / 0.382 |
| VOID | vfx | 81 | 79.651 / 130.160 / 211.579 / 135.233 | 0.372 / 0.667 / 0.390 |
| VOID | hud | 62722 | 39.961 / 70.035 / 134.133 / 80.938 | 0.706 / 0.805 / 0.660 |
| FOREST | terrain | 307560 | 1.155 / 52.794 / 109.040 / 51.458 | 0.982 / 1.000 / 0.927 |
| FOREST | background | 890086 | 26.837 / 55.177 / 98.687 / 64.016 | 1.000 / 1.000 / 0.998 |
| FOREST | terrainTop | 153689 | 38.700 / 59.583 / 119.681 / 67.398 | 0.952 / 1.000 / 0.886 |
| FOREST | terrainSide | 153871 | 0.866 / 26.968 / 86.188 / 35.537 | 1.000 / 1.000 / 0.968 |
| FOREST | obstacle | 78796 | 34.835 / 100.169 / 149.874 / 97.287 | 0.753 / 1.000 / 0.744 |
| FOREST | unit | 8846 | 26.143 / 58.200 / 184.172 / 73.978 | 0.385 / 0.870 / 0.424 |
| FOREST | vfx | 2274 | 94.197 / 163.750 / 189.172 / 157.664 | 0.489 / 0.731 / 0.511 |
| FOREST | hud | 51782 | 40.000 / 88.040 / 133.063 / 89.038 | 0.767 / 0.886 / 0.729 |
| ICE | terrain | 340501 | 2.448 / 75.394 / 129.863 / 68.723 | 0.861 / 1.000 / 0.822 |
| ICE | background | 895523 | 36.451 / 66.081 / 109.627 / 73.392 | 1.000 / 1.000 / 0.993 |
| ICE | terrainTop | 178291 | 59.503 / 87.036 / 136.851 / 89.014 | 0.833 / 0.877 / 0.768 |
| ICE | terrainSide | 162210 | 0.866 / 40.755 / 116.753 / 46.420 | 0.923 / 1.000 / 0.882 |
| ICE | obstacle | 31558 | 49.825 / 117.097 / 239.789 / 137.086 | 0.272 / 0.883 / 0.402 |
| ICE | unit | 10498 | 26.646 / 57.409 / 184.242 / 73.047 | 0.377 / 0.864 / 0.418 |
| ICE | vfx | 928 | 84.273 / 148.487 / 221.522 / 151.033 | 0.374 / 0.683 / 0.376 |
| ICE | hud | 60336 | 50.151 / 94.383 / 138.447 / 97.602 | 0.529 / 0.673 / 0.525 |
| MAGMA | terrain | 334524 | 0.794 / 28.248 / 130.229 / 38.299 | 0.944 / 1.000 / 0.926 |
| MAGMA | background | 884490 | 9.079 / 39.536 / 71.953 / 43.152 | 0.866 / 0.974 / 0.872 |
| MAGMA | terrainTop | 169981 | 17.486 / 37.578 / 158.547 / 56.312 | 0.915 / 1.000 / 0.885 |
| MAGMA | terrainSide | 164543 | 0.722 / 10.064 / 58.790 / 19.690 | 1.000 / 1.000 / 0.968 |
| MAGMA | obstacle | 50590 | 22.719 / 37.856 / 118.627 / 47.906 | 0.359 / 0.974 / 0.423 |
| MAGMA | unit | 10377 | 26.428 / 55.278 / 184.318 / 72.305 | 0.400 / 0.865 / 0.440 |
| MAGMA | vfx | 978 | 73.537 / 119.667 / 208.060 / 129.100 | 0.575 / 0.852 / 0.531 |
| MAGMA | hud | 58385 | 45.008 / 79.439 / 131.614 / 82.157 | 0.836 / 0.944 / 0.804 |
| DESERT | terrain | 333139 | 1.428 / 82.398 / 121.269 / 72.607 | 1.000 / 1.000 / 0.971 |
| DESERT | background | 894674 | 17.905 / 52.501 / 118.872 / 59.409 | 0.974 / 1.000 / 0.908 |
| DESERT | terrainTop | 172990 | 60.537 / 85.611 / 121.711 / 87.425 | 1.000 / 1.000 / 0.962 |
| DESERT | terrainSide | 160149 | 0.578 / 49.829 / 120.612 / 56.600 | 1.000 / 1.000 / 0.980 |
| DESERT | obstacle | 41801 | 55.762 / 157.497 / 194.612 / 147.510 | 0.362 / 1.000 / 0.449 |
| DESERT | unit | 10536 | 26.646 / 58.087 / 184.242 / 73.313 | 0.400 / 0.875 / 0.445 |
| DESERT | vfx | 1013 | 88.244 / 147.345 / 203.189 / 145.132 | 0.729 / 0.974 / 0.717 |
| DESERT | hud | 58181 | 47.795 / 91.804 / 138.897 / 96.627 | 0.894 / 0.987 / 0.847 |
| battle_frozen | terrain | 309709 | 1.011 / 55.438 / 111.263 / 54.927 | 0.972 / 1.000 / 0.917 |
| battle_frozen | background | 869099 | 26.837 / 54.461 / 98.831 / 64.506 | 1.000 / 1.000 / 0.998 |
| battle_frozen | terrainTop | 177244 | 41.275 / 60.800 / 119.044 / 68.253 | 0.945 / 1.000 / 0.882 |
| battle_frozen | terrainSide | 132465 | 0.794 / 27.683 / 86.763 / 37.096 | 1.000 / 1.000 / 0.964 |
| battle_frozen | obstacle | 73238 | 35.983 / 99.956 / 151.014 / 97.679 | 0.753 / 1.000 / 0.746 |
| battle_frozen | unit | 7932 | 26.062 / 62.153 / 184.600 / 76.715 | 0.421 / 0.834 / 0.438 |
| battle_frozen | vfx | 12441 | 82.004 / 134.542 / 211.169 / 138.530 | 0.530 / 0.817 / 0.519 |
| battle_frozen | hud | 66925 | 36.876 / 86.648 / 162.114 / 90.106 | 0.715 / 0.879 / 0.675 |

## P3 專案檢查

| 命令 | 驗證級別 | 退出碼 | 結果來源 |
| --- | --- | ---: | --- |
| `node --check tools/ui-e2e/layer-luma-probe.mjs` | 靜態 | 0 | `tools/ui-e2e/layer-luma-probe.mjs:1` |
| `npm run lint` | 靜態 | 0 | `tools/ui-e2e/out/agent-logs/f0-lint.log` |
| `$env:HOMEDRIVE = 'C:'` 後執行 `npx vitest run --exclude "**/AgentRunner.test.ts"` | 實跑 | 0 | 183 個測試檔、1697 個測試通過，見 `tools/ui-e2e/out/agent-logs/f0-test-edge.log` |
| `npm run knip` | 靜態 | 0 | 0 項 findings，見 `tools/ui-e2e/out/agent-logs/f0-knip.log` |
| `npm run build` | 靜態 | 0 | 入口 257.0 kB、初始合計 380.1 kB，見 `tools/ui-e2e/out/agent-logs/f0-build.log` |
| `git -c safe.directory=C:/Git/_wt_visual_f0 diff --check` | 靜態 | 0 | `package.json:19` |

## 阻礙

- 第一次探針記錄在 `tools/ui-e2e/out/agent-logs/f0-layers.log`，退出碼 1。群系 tick 0 的單位尚未從出生動畫淡入。戰鬥原導播鏡頭的本體遮罩為桌機 5／10、手機 6／10。加入出生暖機並以全景取樣後，兩張戰鬥圖均為 10／10，FOREST 仍為 9／10。最終的 FOREST 遮罩保留樹冠和剪影歸屬，沒有把剪影像素回填單位本體。依停下條件，單位數一致驗收未完成。
- Playwright 通道起初找不到 Edge／Chrome。探針以 `E2E_BROWSER_PATH` 使用已安裝的 Edge。原測試指令第一次因 `tests/StatusResume.test.ts:22` 固定使用 `msedge` 通道退出 1。重跑只補 `HOMEDRIVE=C:`，讓 Playwright 搜尋系統的 Program Files，測試退出 0。見 `tools/ui-e2e/out/agent-logs/f0-test.log`、`tools/ui-e2e/out/agent-logs/f0-test-edge.log`。
- 沙盒拒絕 WMI 的 `Win32_Process.Create`，repo runner 用其 spawn 路徑啟動並寫入 PID。兩次探針 PID 為 37804、40464，相關 runner 狀態和退出碼均在 `tools/ui-e2e/out/agent-logs/`。Vite 與瀏覽器由探針在 `finally` 關閉，見 `tools/ui-e2e/layer-luma-probe.mjs:512`。
- 自動 shell 啟動曾無回應，改用工作區 Node 執行後讀檔、測試和產出均可執行。樹冠獨立遮罩與 `--assert-order` 獨立行程仍未完成，驗證級別見上表。
