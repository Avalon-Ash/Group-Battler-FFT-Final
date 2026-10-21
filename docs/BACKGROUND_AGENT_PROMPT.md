# 執行指令：場景背景管線現代化（BG）

> 用法：在 IDE 代理對話輸入 `/goal docs/BACKGROUND_AGENT_PROMPT.md`。可以跑一整晚，照 §4 的觀測與重試規則，不要停在等待。
> 背景：視覺管線（特效、狀態、危害、HUD、地形）都已改成「預烘焙＋每幀只 drawImage、參數集中、跟隨品質階層」，只剩場景背景（`engine/renderers/background.ts`）還是早期寫法。主代理 2026-10-21 實測（`tools/ui-e2e/bg-probe.mjs`，2560×1440）：一次背景約 0.02～0.06 ms，現在**不是**效能瓶頸。所以本輪目標是**讓背景對齊其他管線的標準、外觀不變**，不是重新設計：每幀零漸層建立、零配置、參數進 `constants`、跟隨品質階層、結果確定（不用 `Math.random`）、高 DPI 清晰。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部，**特別是 §7「Long commands」**）、`engine/renderers/RenderSpec.ts`（背景是第一個繪製的螢幕層；本輪不改任何座標或層序規則）、`engine/renderers/background.ts`（全部）、`constants/terrain.ts` 的 `BACKGROUND_COLORS`／`BACKGROUND_FX`、`engine/renderers/RenderQuality.ts`、`tools/ui-e2e/bg-probe.mjs`，以及每個要改的檔案的方框檔頭。
- 從 `main` 開分支 `feat/bg-pipeline`；`git status` 必須乾淨。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`。**指令還在跑時不得結束回合，不得只回覆「等待中」**；`STATE=LOST` 就改用前景 `node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令>` 跑一次。同一步失敗或逾時兩次就記進報告、跳下一個任務。
- 先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`（記下 6 個場景 meanAbsDiff）、`node tools/ui-e2e/runtime-smoke.mjs`、`node tools/ui-e2e/bg-probe.mjs`（記下每個場景的整行數字）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/VFX_PIPELINE_MAP.md`、`docs/ART_SPEC.md`、`.claude/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`tools/ui-e2e/bg-probe.mjs`、`data/**`、Facade（`engine/renderer.ts`、`engine/game.ts`）、`engine/systems/**`、`engine/presentation/**`、其他測試的基準放寬方向。**保真基準一律不得重錄**。不准 `push`、不准動 `main`、不准合併。
- **可以改**：`engine/renderers/background.ts`（可拆出同目錄的新檔，例如 `engine/renderers/background/*.ts`，`background.ts` 保留為入口）、`engine/renderers/RenderPipeline.ts`（只限呼叫背景的那幾行）、`constants/terrain.ts`（`BACKGROUND_COLORS`／`BACKGROUND_FX`）、`tests/**`（新增背景測試；`tests/constants-snapshot.json`／`ConstantsBarrel` 只因新增或搬移背景參數而更新）、新報告 `docs/BACKGROUND_REPORT.md`。

### 1. 已查證的事實（DOM，2026-10-21 的 main）
- 呼叫點：`engine/renderers/RenderPipeline.ts` 約 136～149 行，`this.background.draw(ctx, lW, lH, sc, cfg, realTime)`（邏輯尺寸、真實時間：暫停時背景仍會動）。
- `background.ts`（346 行）：
  - `draw`（17～25 行）：場景或尺寸改變才重建靜態快取，再 `drawDynamicElements`。
  - 靜態快取 `updateStaticCache`（33～153 行）：底色漸層、`SKY_RIVER` 或星空、`DUNES` 或山脈、地平線接縫漸層（`seamHeight = 350`）、暗角徑向漸層。快取畫布是**邏輯尺寸**（`createCanvas(w, h)`），高 DPI 時被放大變糊。`drawStaticStars`（約 121～130 行）位置用 `sin`／`cos` 公式（固定），但大小與透明度用 `Math.random()`（每次重建都不同；保真 harness 因 `__resetSeed` 才固定）。
  - 動態層 `drawDynamicElements`（198～224 行）**每幀**：50 個光點逐一 `arc` + `fill`（第 201～208 行，數字 50／53／97 寫死）；地平線光暈**每幀 `createRadialGradient`**（211 行，半徑隨 `pulse` 變化）並以 `screen` 填半個畫面；再依 `bgFeature` 分支。
  - `drawAurora`（227～274 行）：已有低解析度離屏（`BACKGROUND_FX.AURORA`），但每幀 `createLinearGradient`（253 行）。
  - `drawCanopyRays`（276～284 行）：4 道旋轉光柱 `overlay` 混合（數字寫死）。
  - `drawHeatHaze`（286～303 行）：每幀 `createLinearGradient`（290 行）＋ 5 條全寬 `fillRect`。
  - `drawFogLayers`（305～313 行）：4 團霧 sprite（`AssetManager.getFogCloud`）。
  - `drawSandStorm`（315～346 行，`DESERT`）：每幀兩個 `createLinearGradient`（319、333 行），`overlay` 填滿**整個畫面**，6 團霧、30 條風線。
- 參數：`constants/terrain.ts` 71～97 行只有 `BACKGROUND_COLORS` 與 `BACKGROUND_FX.AURORA`，其餘全是程式內的數字。
- 品質階層：`RenderQuality.ts` 的 `getQualityTier()`（0 最高、3 最低）、`getRenderDpr()`。背景目前不看品質階層。
- 場景：`data/scenes.ts` 的 `SCENE_DB`，5 個：`VOID`（SKY_RIVER）、`FOREST`（CANOPY）、`ICE`（AURORA）、`MAGMA`（HEAT_WAVE）、`DESERT`（DUNES＋沙塵暴）。
- 保真：`npm run perf:fidelity` 的 5 個地形場景畫面包含背景，所以背景的像素變動會直接反映在分數上（門檻 meanAbsDiff ≤ 0.8、badPixel ≤ 0.5%）。harness 以 `__resetSeed` 固定 `Math.random`。

### 2. 目標與規則（DOM）
- **外觀不變**：構圖、顏色、動態節奏都維持；本輪不是美術重設計。
- **每幀零漸層建立、零配置**：所有 `createLinearGradient`／`createRadialGradient` 只在快取重建時發生（依場景、尺寸、dpr 快取）。地平線光暈的 `pulse` 改成「預烘焙一張光暈 sprite，每幀用縮放與 alpha 畫」；熱浪、沙塵暴、極光的漸層依尺寸快取或預烘焙成 sprite。50 個光點改成預烘焙的小光點 sprite + `drawImage`（同樣的位置公式與透明度）。
- **參數集中**：動態層與靜態層用到的數字（數量、速度、透明度、尺寸、接縫高度、星星數…）全部搬進 `BACKGROUND_FX`（依區塊分組：`MOTES`、`HORIZON_GLOW`、`CANOPY`、`HEAT_HAZE`、`FOG`、`SANDSTORM`、`STATIC`），每個值寫註解；顏色進 `BACKGROUND_COLORS`。搬移時數值完全不變。
- **確定性**：星星位置公式不動；大小與透明度不用 `Math.random`，改用以索引算出的雜湊（整數雜湊或黃金比例），範圍與現在相同（大小 0～1.8、透明度 0.2～0.8），同一場景每次重建一模一樣。背景其他地方若還有 `Math.random` 也一併換掉。
- **高 DPI**：靜態快取依 `getRenderDpr()` 以裝置像素烘焙，繪製時縮回邏輯尺寸；dpr 改變時重建。
- **品質階層**：tier 0／1 原樣；tier 2 光點與霧／沙團數量減半；tier 3 只畫靜態快取（動態層全關）。數量比例放進 `BACKGROUND_FX`。
- **新增測試 `tests/BackgroundRenderer.test.ts`**：用一個會計數的假 `CanvasRenderingContext2D`（記錄 `createLinearGradient`、`createRadialGradient`、`arc`、`createCanvas` 次數），每個場景先畫一幀（暖機、建快取），再畫 120 幀：漸層建立次數與 `arc` 次數必須為 0；同一場景重建兩次靜態快取的繪製呼叫序列完全相同（確定性）；tier 3 時動態層不呼叫任何繪製。測試先寫、先記下改前的數字（會失敗的就用棘輪基準記錄），最後歸零。

### 3. 任務（依序，每個任務一個 commit）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| BG0 | 基準（§0），全部數字記進報告 | 全綠 |
| BG1 | `tests/BackgroundRenderer.test.ts`＋改前數字的基準（此時記錄每場景每幀的漸層數、arc 數） | 測試通過（以基準記錄現況） |
| BG2 | 參數搬進 `BACKGROUND_FX`／`BACKGROUND_COLORS`（數值不變、行為不變） | lint／test／build；`perf:fidelity` 6 個場景數值與 BG0 **相同** |
| BG3 | 動態層每幀零漸層、零 arc（光暈 sprite、光點 sprite、漸層快取）；測試基準歸零 | 同上；`perf:fidelity` 全部 PASS |
| BG4 | 星空確定性雜湊＋靜態快取依 dpr 烘焙 | 同上（星星位置會變，見 §4） |
| BG5 | 品質階層降級 | 測試；`runtime-smoke` |
| BG6 | 最後驗證：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`runtime-smoke`、`bg-probe`（全部用 run.mjs 分段） | 全綠；bg-probe 每個場景「一次背景」不高於 BG0 |
| REPORT | `docs/BACKGROUND_REPORT.md`：改前／改後數字表（保真 6 場景、bg-probe 每場景整行、測試的每幀漸層／arc 數）、每個改動的位置與理由、未完成項目與 log 路徑、回退指南（每個 commit） | — |

### 4. 守則與停下條件（INV）
- **觀測與重試**：長指令用 `--detach`＋`--wait`；`--wait` 顯示 DONE 就讀結果繼續，絕不等已結束的指令；同一步兩次失敗或逾時 → 報告記「未完成：<名稱>（log 路徑）」，跳下一個任務。
- BG2、BG3 之後任何地形場景或 `battle_frozen` 保真分數比 BG0 **變差** → 停在該任務，報告寫數值與差異圖路徑（`tools/ui-e2e/out/fidelity/`），回頭找原因（多半是 sprite 尺寸、混合模式或 alpha 沒對齊）。
- BG4 換掉 `Math.random` 後星星大小與亮度必然改變，而且保真 harness 的亂數序列少了這段消耗，之後其他用 `Math.random` 的東西也可能錯位：若任何場景保真**超過門檻**，**不得重錄**，停下回報附差異圖（並說明差異是只在星星、還是別處也有），由主代理取證重錄；未超過門檻就記數值繼續。dpr 烘焙在保真 harness（dpr 1）下應該 0 差異。
- 不改背景的構圖與顏色；不新增背景元素；不碰座標協議與層序。
- 不新增依賴、不用 `as any`、渲染迴圈不放 `console.log`、不加安全網、渲染迴圈每幀零配置。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「背景跑完了」，主代理審查並本機實跑後問你要不要合併。
2. 實機看 5 張地圖的背景跟以前一樣（星星大小、亮度會略不同），高 DPI 螢幕上背景是否更清晰。
