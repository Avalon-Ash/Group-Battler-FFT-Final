# 執行指令：地塊烘焙 Phase 2-A 原型（`?bake=1`）

> 給 GPT（Codex App）。目標導向：自己拆步驟，只有下面列的停下條件才停。
> 背景：手機 1% low 約 13 FPS；CPU profile 中地塊／網格占 JS 時間 23～25%，是最大的一類，瓶頸是每幀的繪製呼叫數。已有的快取（`TerrainBlockCache` 逐格 sprite、零件、液面、障礙物、光暈文字）沒有減少呼叫數。本輪做一個**預設關閉**的原型，量出值不值得做成預設。

## 目標
加一個 URL 旗標 `?bake=1`：把「可以安全預先合成」的地塊畫到一張（或少數幾張）離屏畫布上，每幀用一次 `drawImage` 取代逐格繪製；其餘維持現在的動態排序。旗標關閉時，行為與畫面必須和現在**完全相同**。

## 已查證的事實
- 設計藍圖：`docs/BAKED_RENDERING_DESIGN.md`（§2 分層方案、§4 路線圖）。主代理 2026-10-28 擬好的規則在 `docs/HANDOFF.md` §4「地形烘焙」，照它做：
  - **可烘格**：後方畫面重疊範圍內沒有更低的格子就可烘（地圖 0～6 層起伏）；高台前緣等仍走動態排序。
  - **不烘**：VOID、MAGMA 整張地圖（浮動、液面）；塌落中的格子；轉場期間。地表細節動畫、狀態底色、縮圈染色、貼地特效在烘焙圖之後另開地面疊層 pass。
  - **鏡頭**：烘焙解析度＝量化縮放×DPR×品質階層；換地圖、塌落、縮放級距變動、換階層時重烘；縮放中先拉伸舊圖，停穩約 0.3 秒再重烘；觸控裝置上限 16 MB，超過退回逐格。
  - 原型只開 FOREST、ICE、DESERT 三種地形。
- 座標協議 SSOT：`engine/renderers/RenderSpec.ts`（層序、sortBias、三種 Y、腳下高度）。地塊目前由 `engine/renderers/grid/TerrainRenderer.ts`、`TerrainBlockCache.ts`、`GridRenderStrategy.ts` 畫，排序在 `engine/renderers/RenderList.ts`。
- 品質階層：`engine/renderers/RenderQuality.ts`；URL 旗標的讀法照 `RENDER_QUALITY.QUERY_KEY` 的寫法。
- 量測工具：`npm run perf:fidelity`（保真）、`npm run verify:coords -- --order`（排序錯誤；基準參數見 `tools/ui-e2e/coord-guard.mjs` 檔頭的 COORD-R1）、`npm run perf:mobile -- --cpu=4 --seconds=60 --headed`（手機 CPU 模擬）、`?perf` HUD 的尖峰記錄。

## 硬性限制
- 先讀 `AGENTS.md` 全部、`RenderSpec.ts`、所改檔案的方框檔頭。改到層序、排序、Y 的規則時，同一個 commit 更新 `RenderSpec.ts` 與檔頭。
- 旗標關閉時：`npm run perf:fidelity` 全部 PASS；而且用**同環境 A/B**（同一次執行切換改前／改後程式碼，截六個保真場景，逐像素比）證明 0 差異。保真數字跨次執行會漂移，不要拿兩次執行的數字比。
- **保真基準不得重錄、門檻不得放寬**；不准改 `tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`。
- 受保護檔案：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`.agents/**`、`tools/hooks/**`。
- 不准 WebGL／Three／Pixi；不准 `as any`；渲染迴圈不放 `console.log`；新增數字放 `constants/`（`tests/MagicNumberBudget.test.ts` 只減不增）；一次性探針寫在 `tools/ui-e2e/out/`（`tests/ToolsReferenced.test.ts`）。
- 不 push、不合併進 `main`；在分支 `feat/bake-p2a` 上工作。如果沙盒不能 commit，改動留在工作樹，報告列出檔案。git 指令遇到 dubious ownership 時用 `git -c safe.directory=<工作樹> …`。

## 驗收（全部寫進報告 `docs/BAKE_P2A_REPORT.md`）
1. 旗標關閉：同環境 A/B 六場景 0 差異；`perf:fidelity`、`npm run lint`、`npm test`、`npm run build`、`npx knip` 全過。
2. 旗標開啟（FOREST／ICE／DESERT）：`verify:coords -- --order` 的錯誤數**不比關閉時多**；附三張開／關對照截圖與差異圖，說明差異只來自「同高度平地上單位的腳不再被前一格切到一點」這類預期變化。
3. 效能：`perf:mobile --cpu=4 --headed` 開／關各跑一次，列平均與 1% low 幀時間、每幀繪製呼叫數（`?perf` HUD 或 `CtxOpCounter`）、地塊類別的 CPU 占比；另外列出重烘尖峰（縮放、塌落、換地圖時的最長一幀）。
4. 記憶體：觸控模擬下烘焙畫布總量，不得超過 16 MB；超過時確認有退回逐格。
5. 結論：一句話建議「值得做成預設（P2-B）／不值得」，附理由。

## 停下條件（只有這些）
- 旗標關閉時 A/B 出現任何差異，而且找不到原因。
- `--order` 錯誤數變多，而且兩次修正都壓不回去。
- 記憶體上限無法守住。
- 需要改受保護檔案或重錄基準才能前進。
遇到時寫報告後停下，不要為了讓檢查通過而放寬比較規則或關掉效果。
