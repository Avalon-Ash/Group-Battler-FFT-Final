# 外出執行指令 #6：效能第二輪——戰鬥／Showcase 殘餘成本（貼給 IDE 代理）

> 用法：`/goal docs/PERF_AGENT_PROMPT_2.md`
> **前置條件**：在分支 `perf/render-opt` 上進行（HEAD 應為 `04a94db` 或其後代；第一輪已含 governor 修正）。**不得在 `main` 上工作、不得 push、不得合併**。同一時間只能有一個代理在此工作樹執行。
> **前情**：第一輪（`docs/PERF_REPORT.md`）已把「地形」成本壓平（5 場景閒置 7.7 → 4.5 ms，headless）。剩餘：`manual_battle` ≈ 26.6 ms、`showcase` ≈ 30.4 ms（headless 軟體光柵）。第一輪 profile 顯示 JS 自身時間熱點皆 ≤0.5%，成本在 **native Canvas 操作**（`shadowBlur` 全專案 ~60 處、`save/restore`、漸層、`globalCompositeOperation`），以及 Showcase 的**矩陣雨全螢幕 `mix-blend-screen` canvas**（DSF2 下佔 ~40%）。
> **長期目標**（使用者）：FFT／Tactics Ogre 質感、HD 風格、目前不旋轉；閒置 ≤5 ms、戰鬥 ≤6 ms（≈165 FPS）、極限 4.2 ms（240 FPS）。方向＝「烘焙渲染」：程序化材質只在開機時烘焙成圖集，執行期只 blit；日後素材槽可換手繪／AI 圖。**WebGL 仍禁用（`AGENTS.md` §1.4）。**
> **整串一次跑完（無待核定事項）。** **不做**：push／動 `main`／合併、CSS/Tailwind 改動、預設外觀改變、新增依賴。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程、守則、陷阱、停下條件**完全沿用 `docs/PERF_AGENT_PROMPT.md` 的「指令本文」與「本輪額外規則」**（≤3 檔、lint/test/build、一任務一 commit、不 push、同題失敗 3 次就停、保真鐵律、量測紀律「交錯兩輪、<5% 視為雜訊」、不 `as any`、常數進 `constants.ts`、渲染迴圈無 `console.log`）。差異：① 進度寫在新檔 `docs/PERF_BASELINE_2.md`「任務進度」表；② 結束後把摘要補進 `docs/DECOUPLING_HANDOFF.md` §10.4 之後（新增 §10.5「效能第二輪」）；③ `e2e:ui` 只在 **[E2E]** 任務與 FINAL 跑（各連跑兩次）；④ 所有量測／e2e 網址一律 `?quality=0`。

**核心原則（本輪新增）**：
- **預設外觀必須與現在逐像素等價**（`perf:fidelity` 不得放寬門檻、不得重錄 baseline）。
- **會改變外觀的優化（例如 shadowBlur → 預烘焙光暈）一律做成「預設關閉」的旗標／品質階層**，產出「前／後」截圖供使用者目視核定；**由使用者決定是否轉為預設，代理不得自行開啟為預設。**
- 「只做有數據佐證的優化」：每項需要 profile／計數前後對照；未達驗收 → 還原。

先閱讀：`AGENTS.md`、`docs/PERF_REPORT.md`、`docs/PERF_BASELINE.md`、`docs/DECOUPLING_HANDOFF.md` §10、`types.ts`、`constants.ts`、`engine/renderers/RenderQuality.ts`、`engine/renderers/RenderStats.ts`、`engine/renderers/RenderPipeline.ts`、`engine/renderers/units/**`、`engine/graphics/painters/**`、`engine/systems/vfx/renderers/**`、`engine/renderers/hud/**`、`components/ui/showcase/useMatrixRain.ts`、`tools/ui-e2e/perf-*.mjs`、`tools/ui-e2e/render-fidelity.mjs`。

**開工檢查**：分支必須是 `perf/render-opt`（不是 → `git checkout perf/render-opt`；不存在 → 停下回報）；`git status` 乾淨（否則停下回報）；`npm run lint`、`npm test`、`npm run build`、`npm run e2e:ui`、`npm run perf:guard` 全綠。若 `docs/PERF_BASELINE_2.md` 已存在，從第一個未完成任務接續。

### 任務（依序）

`Q0` → `Q1` → `Q2` → `Q3a` → `Q3b` **[E2E]** → `Q4a` → `Q4b` → `Q4c` **[E2E]** → `Q5` → `Q6` → `Q7` → `REPORT` → `FINAL`

| 任務 | 內容 | 檔案（≤3；測試/docs/tools/baseline 不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **Q0** | 建立 `docs/PERF_BASELINE_2.md`（任務進度表 + 改前基準）。重跑 `PERF_SECONDS=6 perf:profile`（含 `manual_battle`）、`perf:ab`（5 場景）、`PERF_MODE=showcase perf:ab`，並記錄機器資訊。把 battle 與 showcase 的「各階段 ms」（`?perf` 的 RenderStats 輸出，用 CDP 或在頁面內讀取）列入——**目標：知道 battle 的 26 ms 分別落在 background/world(submit,sort,dispatch)/post/hud 哪一段**。 | docs、tools | 數據入檔 |
| **Q1** | **Canvas 操作計數器（診斷，不改行為）**：在 `RenderStats.ts` 旁新增 `engine/renderers/CtxOpCounter.ts`：僅在 `RenderStats.enabled` 且 URL 含 `?perfops` 時，以 `Proxy`／包裝**對主畫布 context** 計數每幀 `shadowBlur`（設為非 0）、`save`、`restore`、`createLinearGradient/RadialGradient/Pattern`、`drawImage`、`fill/stroke`、`globalCompositeOperation` 變更次數；**未啟用時零成本（模組載入時決定，不得在熱路徑每次判斷 Proxy）**；`?perfops` 另在 `drawDebug` 多印一行。用 `perf-profile`／頁面讀取，產出「battle 每幀各操作次數＋依檔案（呼叫來源 painter）分組」表（可在診斷模式下用 `performance.now` 包 painter 呼叫累計各 painter 耗時：units/vfx/hud/status/projectile 等，分 painter 名稱列出 top 10）。**預設路徑像素必須零差異（`perf:fidelity`）。** | `CtxOpCounter.ts`（新）、`RenderPipeline.ts`、`constants.ts` | lint/test/build/fidelity；排名表入檔 |
| **Q2** | **讓單位／VFX 被保真護欄覆蓋**：檢查 `render-fidelity.mjs` 的 `battle_frozen` 是否存在且決定性（連錄兩次逐像素相同）。若第一輪被剔除 → 找出非決定性來源（`Math.random`／`Date`／`performance.now`／粒子池初始化／React 非同步），在 init script 或「測試用固定種子」注入點封住（**不得改遊戲邏輯；若必須改 engine，僅限「RNG 注入點」且 ≤3 檔，否則改為在 init script 取代全域 `Math.random`**）。成功後 `--record` 一次（**這是本輪唯一授權的 record**，僅新增 `battle_frozen`，**不得重錄既有 5 場景**）並加入 `perf:guard`。**若仍不可決定性 → 改為「單位 token 專用的靜態測試場景」**：暫停戰鬥（`engine.pause`／不 tick）、步進渲染 N 幀（VFX 為空）、截圖，涵蓋兩陣營單位繪製；至少要讓 Q4 的「預設關閉旗標」能被證明等價。 | tools、baseline PNG（≤3 工具檔） | 兩次互比 0 差異；`perf:guard` 含新場景 |
| **Q3a** | **矩陣雨減載（只在 `quality≥1` 或 `?quality` 指定時啟用；階層 0 完全不變）**：`useMatrixRain.ts` 在 `getQualityTier()≥1` 時：① 內部解析度降為 0.5×（CSS 尺寸不變，`image-rendering` 不新增 CSS，用 canvas 實體尺寸降低即可）② 更新頻率節流至 30 Hz；`≥2` 時自動停止繪製（保持元素存在、清空畫布）。階層取自 `RenderQuality` 的 getter（**不得新增依賴方向反轉：Showcase hook 只讀 getter，不寫任何遊戲狀態**）。常數進 `constants.ts`（`RENDER_QUALITY.MATRIX_RAIN_*`）。 | `useMatrixRain.ts`、`constants.ts`、`RenderQuality.ts`（若需新 getter） | lint/test/build；Showcase 在 `?quality=0` 與改前**畫面無差異**（人工比對截圖存 `tools/ui-e2e/out/`）；`PERF_MODE=showcase perf:ab` 在 `?quality=1/2` 下 avg ms 較 `?quality=0` 下降（寫進報告） |
| **Q3b** **[E2E]** | 單元測試（純函式：根據階層回傳 `{scale, hz, enabled}` 的 `getMatrixRainBudget(tier)`，放 `RenderQuality.ts`）＋ `e2e:ui` 兩次 ALL PASSED。 | tests | lint/test/build/e2e |
| **Q4a** | **光暈烘焙器（旗標，預設關）**：新增 `engine/renderers/GlowSpriteCache.ts`：純衍生資源快取（同 `TerrainBlockCache` 的 store 模式，容量上限、可注入 `createSurface` 供測試）。匯出 `getGlowSprite(kind: 'disc'|'ring'|'rect', colorKey, radiusStep, blurStep)`：離屏預畫「純色形狀 + `shadowBlur`」一次，執行期以 `drawImage` + `globalAlpha` 取代即時 `shadowBlur`。色彩量化、半徑／模糊半徑量化級距進 `constants.ts`（`RENDER_GLOW`）。旗標 `RENDER_QUALITY.GLOW_SPRITES`（預設 `false`；`?glow=1` 或品質階層 ≥2 時為 true）。 | `GlowSpriteCache.ts`（新）、`constants.ts`、`tests/GlowSpriteCache.test.ts` | lint/test/build；單元測試（命中率、量化、容量上限） |
| **Q4b** | **套用到 Q1 排名最高的 ≤3 個 `shadowBlur` 呼叫點**（依 Q1 的次數×耗時選，通常是 `BarPainter`／`ParticlePainter`／`ProjectilePainter`／`TextPainter` 之一；**只動排名前三且每點佔該幀 `shadowBlur` 次數 ≥15%**）。每點寫成 `if (GLOW_SPRITES) drawGlowSprite(...) else <原程式碼原封不動>`——**旗標關閉時行為與位元組級邏輯完全不變**。每點有改前／改後（旗標開）的 `perf:ab` 數據：avg ms 下降 ≥5% 才保留，否則還原該點。另產出「旗標關／開」的並排截圖（`battle_frozen` 或 Q2 的靜態場景，3 個場景 × 關/開），存 `tools/ui-e2e/out/glow_compare_*.png`，並用同一個比較器量出關/開的 meanAbsDiff／badPixelPct 寫進報告（**僅供使用者決定，不設門檻**）。 | ≤3 個 painter（本任務可拆成最多 3 個 commit，每個 1 檔 + 呼叫點） | lint/test/build；旗標關時 `perf:fidelity` 0 差異 |
| **Q4c** **[E2E]** | 以 `?glow=1` 啟動做冒煙測試（畫面可開、點擊可選取、無 pageerror）+ `e2e:ui` 兩次 ALL PASSED（旗標預設關）。 | tools | e2e |
| **Q5** | **只做設計、不改程式——「烘焙渲染」藍圖** `docs/BAKED_RENDERING_DESIGN.md`：① 單位 token／VFX 粒子目前哪些已烘焙（`ImperialTokenFactory`／`CovenantTokenFactory`／`SpriteManager`／`bakeCache`）、哪些仍即時繪製，用 Q1 數據佐證 ② 「靜態地形層快取」可行性：地形與單位在同一個深度排序 RenderList 內交錯，列出 2–3 種分層方案（整張地形烘焙＋單位前後景分割／高度分帶烘焙／維持現狀）與各自的失效條件（地塊掉落、MAGMA 液面、相機縮放、編輯器改圖）、預期收益 ③ 圖集（atlas）資料格式草案：資源槽 key、尺寸、錨點，如何讓日後手繪／AI HD 素材可替換（對應 `data/units/appearance/` SSOT，渲染器不得硬寫視覺設定）④ 風險與分階段路線圖（含「何時才值得評估 WebGL 例外」的客觀判準：例如在 Q1–Q4 完成後，battle 在目標機 headed 模式仍 >6 ms 且主要成本在 native 操作而非 JS）。 | docs | — |
| **Q6** | **真機量測腳本整備（不改行為）**：`perf-ab.mjs` 的 `PERF_HEADED=1` 已存在 → 新增 `npm run perf:headed`（一次跑 `?quality=0`：5 場景閒置 + `manual_battle` + `showcase`，每項 6 秒，輸出單一 `tools/ui-e2e/out/perf_headed.json` 與 markdown 表，含 `window.devicePixelRatio`、螢幕解析度、GPU 字串（`WEBGL_debug_renderer_info`，僅用於讀取診斷字串，**不使用 WebGL 繪製**）、`?perf` 各階段 ms）。使用者之後只要跑這一行並回貼輸出。**若此機器可跑 headed 模式，順便跑一次並把結果附在 `PERF_BASELINE_2.md`（與 headless 並列，標明差異）。** | tools、`package.json` | 腳本可跑 |
| **Q7** | **改後重量測**：同 Q0 的指令（含 headless 與可行時的 headed），把 battle／showcase 的「各階段 ms」「avg ms」「各旗標關/開」整理成對照表寫入 `PERF_BASELINE_2.md`，列出殘餘熱點排名與下一步建議（是否已逼近 6 ms 目標、哪些要等使用者核定光暈外觀）。 | docs | — |
| **REPORT** | `docs/PERF_REPORT_2.md`：①改前改後對照（每場景／battle／showcase）②每任務 commit、結果、被還原的嘗試③保真結果（含 `battle_frozen` 狀態；旗標關＝0 差異的證明）④**光暈旗標的關/開對照（附截圖路徑與差異數值，請使用者核定是否轉預設）**⑤矩陣雨減載的階層行為表⑥未驗證項（headless 軟體光柵的限制；真機數字待使用者以 `npm run perf:headed` 回報）⑦回退指南（各 tag）。並補寫 `DECOUPLING_HANDOFF.md` §10.5。 | docs | — |
| **FINAL** | 全量驗證：lint/test/build/`e2e:ui`（兩次）/`perf:guard`；工作樹乾淨、未 push；打本地 tag：`perf2-ckpt-Q2`（Q2 後）、`perf2-ckpt-Q3`、`perf2-ckpt-Q4`、`perf2-ckpt-final`（Q2/Q3/Q4 完成當下就先打）。 | docs | — |

### 本輪額外規則

- **取捨順序**（額度吃緊時）：`Q0 → Q1 → Q2 → Q3a/Q3b → Q4a/Q4b/Q4c → Q6`，其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。**
- **不得改變預設外觀**：Q3a 僅在階層 ≥1 生效；Q4 旗標預設關。若發現任何預設路徑像素有差，立即還原該任務。
- **headless 數字只作相對比較**（軟體光柵）；不得用 headless 絕對 ms 宣稱達標。
- 若 Q1 顯示 battle 的主要成本**不是** `shadowBlur`（例如是 `save/restore`、漸層建立或 `globalCompositeOperation`）→ 把 Q4 改為針對實際熱點（同樣「旗標預設關或像素等價」原則），並在報告說明；仍須每點有數據佐證。
- 停工原則同第一輪：只有遇到會改變使用者可見預設外觀、且文件未涵蓋的情況才停下；其餘自行選最低風險、可回退的做法並記錄。

---

## 回來後使用者要做的事（給人看）

1. `git log perf/render-opt --oneline`，讀 `docs/PERF_REPORT_2.md`、`docs/BAKED_RENDERING_DESIGN.md`。
2. 跑 `npm run perf:headed`，把輸出貼給主代理（尤其：螢幕解析度、Windows 縮放 %、DPR、各階段 ms）。另請在 Edge 打開 `edge://gpu`，確認 Canvas 顯示「Hardware accelerated」。
3. 看 `tools/ui-e2e/out/glow_compare_*.png`，決定光暈烘焙（`?glow=1`）是否可轉為預設。
4. 不要 push；合併進 `main`（= 發佈到 GitHub Pages）前先等主代理審查。
