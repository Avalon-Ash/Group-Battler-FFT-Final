# 外出執行指令 #7：效能第三輪——真機歸因與有據優化（貼給 IDE 代理）

> 用法：`/goal docs/PERF_AGENT_PROMPT_3.md`
> **前置條件**：在**新分支 `perf/render-opt-3`** 上進行（由 `main` 開出；`main` 已包含第一、二輪與主代理審查修正，使用者已核准合併）。開工時若分支不存在 → 停下回報，**不要自行從別的分支開**。**不得在 `main` 上工作、不得 push、不得合併**。同一時間只能有一個代理在此工作樹執行。
>
> **前情（必讀 `docs/PERF_REPORT_2.md` 末尾「審查更正」）**：第二輪的數字有幾處**不可採信**，原因已查明：
> 1. 先前所有 headless/「headed」量測落在 **AMD 內顯 + 59 Hz 副螢幕** 上（使用者機器：主螢幕 2560×1440 @ 239 Hz 由 RTX 4070 驅動；副螢幕 1920×1080 @ 59 Hz 由 AMD Radeon iGPU 驅動，Windows 縮放 100%）。所以才會出現「閒置 16.7 ms＝60 FPS 封頂」「戰鬥 26–34 ms」這類數字；它們量到的是 60 Hz 垂直同步與 iGPU，不是程式成本。
> 2. 先前的 `battle_frozen` 與光暈比較**其實從未生成單位**（Playwright `click({force:true})` 在合成時間框架下靜默無效，畫面是模糊的空場景）。主代理已改用 DOM click + 單位數量斷言並重錄 baseline；光暈比較已重跑（真的有單位）：旗標開/關 meanAbsDiff 0.07–0.09、壞像素 0.5–0.6%，肉眼幾乎無差，戰鬥幀耗時 −14%（8.5→7.3 ms，交錯兩輪）。
> 3. **光暈預烘焙已由使用者目視核定並設為預設開**（`RENDER_QUALITY.GLOW_SPRITES = true`；`?glow=0` 明確關閉、`?glow=1` 明確開啟；`battle_frozen` baseline 已用新預設重錄，這是使用者核准的唯一外觀變更）。\n> 4. 主代理在 RTX 4070 / DPR 1 / 1440×900 / headed 實測（`?perf`，含 RenderStats 開銷）：VOID 9.5、FOREST 6.2、ICE 9.6、MAGMA 9.6、DESERT 6.5、manual_battle 9.1、showcase 12.6 ms（avg）；JS 側各階段合計僅 ≈2.5–3.5 ms（world 1.2–2.7、post 0.5–0.7、hud ≤0.25）。**avg 被 240 Hz 垂直同步量化**（4.17/8.33/12.5 ms 的整數倍），所以要用**取消幀率限制**的方式才量得到真實吞吐。
> 5. 場景間差異：VOID/ICE/MAGMA（≈9.5）比 FOREST/DESERT（≈6.3）慢約 3 ms，但 JS 的 world 階段反而更小 → 差異在 **GPU／光柵側**（填充率、sprite 未命中重烘、半透明層、浮動動畫），需要歸因。
>
> **長期目標**：閒置 ≤5 ms、戰鬥 ≤6 ms（≈165 FPS）、極限 4.2 ms（240 FPS）；FFT／Tactics Ogre 質感、HD 風格。WebGL 仍禁用（`AGENTS.md` §1.4）。
> **整串一次跑完（無待核定事項）。** **不做**：push／動 `main`／合併、CSS/Tailwind 改動、預設外觀改變、新增依賴、重錄既有 5 個地形 baseline。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程、守則、陷阱、停下條件**完全沿用 `docs/PERF_AGENT_PROMPT.md` 的「指令本文」與「本輪額外規則」**（≤3 檔、lint/test/build、一任務一 commit、不 push、同題失敗 3 次就停、保真鐵律、不 `as any`、常數進 `constants.ts`、渲染迴圈無 `console.log`），再加上 `docs/PERF_AGENT_PROMPT_2.md` 的核心原則（預設外觀逐像素等價；會改變外觀者做成預設關閉的旗標並出前後對照圖）。差異：① 進度寫在新檔 `docs/PERF_BASELINE_3.md`；② 結束後在 `docs/archive/DECOUPLING_HANDOFF.md` 新增 §10.6；③ `e2e:ui` 只在 **[E2E]** 任務與 FINAL 跑（各連跑兩次）；④ 所有量測網址一律 `?quality=0`（除非該任務明說）。

### 本輪新增的「量測可信度」鐵律（違反＝該任務結果作廢）

- **每個量測腳本必須在輸出中印出並寫入 JSON：GPU 字串、DPR、視窗尺寸、`screen` 更新率推估、是否 headed。** 若 GPU 字串含 `AMD` 或 `Radeon`（iGPU）→ 腳本以非 0 結束並印出提示「此次落在內顯，結果無效」（可用 `PERF_ALLOW_ANY_GPU=1` 覆寫，但報告必須標註「非主 GPU」）。
- **量吞吐請取消幀率／垂直同步限制**：headed 啟動參數加 `--disable-frame-rate-limit`、`--disable-gpu-vsync`（只用於量測腳本；不得改動產品程式）。同時回報兩種數字：「受 vsync 的 avg」與「取消限制的 avg」。
- **所有腳本觸發「隨機生成戰場」一律用 DOM click**（`page.evaluate(() => button.click())`），且之後**斷言 `engine.agents.length ≥ 2`**，否則丟錯。禁止再使用 `locator.click({ force: true })` 觸發骰子按鈕。需檢查並修正：`perf-headed.mjs`、`perf-stages.mjs`、`perf-profile.mjs`、`perf-ops-breakdown.mjs`、`perf-ab.mjs`（manual_battle 路徑）。
- 同一變體至少 **3 輪交錯**；單次差距 <5% 視為雜訊；比較用中位數並附 min/max。
- 量測期間不得同時跑其他重負載（`e2e`、建置）。
- **避免被「戰鬥結束／場景切換」污染（使用者回報 showcase 量測會失真）**：manual_battle 量測期間必須確認戰鬥**仍在進行**（engine.isRunning === true 且尚未收到 GAME_OVER）；每個取樣視窗開始與結束都檢查，若期間戰鬥已結束 → 該視窗作廢並重跑（可在量測腳本內於戰鬥快結束前重新生成陣容／重置，或把單位 HP 調高以確保整個視窗內持續交戰）。showcase 因為會自動換場（OUT 1.2 s + IN 1.5 s 的轉場），**要把取樣切成「純交戰區間」**：監聽 session 轉場（	ransitionPhase !== 'IDLE' 或 engine.agents.length === 0）期間的幀一律丟棄，另外回報「轉場期間」的 ms 以供參考。每個視窗輸出實際採用的幀數與丟棄的幀數。

先閱讀：`AGENTS.md`、`docs/PERF_REPORT.md`、`docs/PERF_REPORT_2.md`（含審查更正）、`docs/PERF_BASELINE_2.md`、`docs/BAKED_RENDERING_DESIGN.md`、`docs/archive/DECOUPLING_HANDOFF.md` §10、`constants.ts`、`engine/renderers/RenderQuality.ts`、`RenderStats.ts`、`CtxOpCounter.ts`、`GlowSpriteCache.ts`、`engine/renderers/grid/TerrainRenderer.ts`、`TerrainBlockCache.ts`、`engine/renderers/RenderPipeline.ts`、`tools/ui-e2e/perf-*.mjs`、`tools/ui-e2e/render-fidelity.mjs`。

**開工檢查**：分支必須是 `perf/render-opt-3`；`git status` 乾淨（否則停下回報）；`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard` 全綠（`perf:guard` 內 `battle_frozen` 必須是**有單位**的畫面——自行打開 `tools/ui-e2e/baseline/fidelity/battle_frozen.png` 目視確認，若是模糊空場景 → 停下回報）。若 `docs/PERF_BASELINE_3.md` 已存在，從第一個未完成任務接續。

### 任務（依序）

`R0a` → `R0b` → `R1` → `R2` → `R3a` → `R3b` → `R4` **[E2E]** → `R5` → `R6` → `REPORT` → `FINAL`

| 任務 | 內容 | 檔案（≤3；測試/docs/tools 不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **R0a** | **量測腳本修復**：套用上方「量測可信度鐵律」到 `perf-headed.mjs`（新增 `PERF_UNTHROTTLED=1` 預設開，同時輸出 vsync 版與取消限制版兩組數字）、`perf-stages.mjs`、`perf-profile.mjs`、`perf-ops-breakdown.mjs`、`perf-ab.mjs`。抽出共用小模組 `tools/ui-e2e/lib/perf-common.mjs`（`launchBrowser`、`assertMainGpu`、`clickDice`、`assertAgents`），避免各腳本重複。`npm run perf:headed` 一行跑完：5 場景閒置 + `manual_battle` + `showcase`，各 6 秒 × 3 輪交錯，輸出 `tools/ui-e2e/out/perf_headed.json` 與 markdown 表。 | tools、`package.json` | 在本機跑一次：GPU 為 NVIDIA、戰鬥場景 `agents ≥ 2`；若跑到 AMD → 腳本報錯（可在 Windows 圖形設定指定 Edge 為高效能，或用 `PERF_ALLOW_ANY_GPU=1` 並標註） |
| **R0b** | **重新建立真實基準**：以 R0a 的腳本在本機（primary 螢幕）跑 `perf:headed`（取消限制 + vsync 版）、`perf:ab`（headed，`PERF_HEADED=1`）、`PERF_MODE=showcase perf:ab`。建立 `docs/PERF_BASELINE_3.md`（任務進度表 + 機器資訊含 GPU/DPR/更新率 + 真實基準表）。**把第二輪報告中所有 headless 60 Hz 數字標為「作廢，僅留存」。** | docs | 數據入檔 |
| **R1** | **歸因：為何 VOID/ICE/MAGMA 比 FOREST/DESERT 慢 ~3 ms，以及戰鬥 vs 閒置的真實差距**。headed、取消限制，對每個場景做**開關式 A/B**（用 URL 診斷參數或 `page.evaluate` 在量測腳本內注入；**不得改產品預設**）：① 關單位 ② 地形改畫純色（跳過 sprite blit）③ 關 post/色調 ④ 關 HUD/overlay ⑤ 畫布實體解析度 ×0.5（`?quality=3` 近似） ⑥ 關 `backdrop-filter` ⑦ 關矩陣雨（showcase）。另用 **CDP Tracing**（categories：`gpu`, `disabled-by-default-gpu.service`, `cc`, `viz`）抓 3 秒，彙整 GPU process 忙碌時間占比與每幀 `DrawQuad`/`Raster` 次數（寫一支 `tools/ui-e2e/perf-trace.mjs`，輸出摘要而不是原始 trace）。同時統計 `TerrainBlockCache` 與 `GlowSpriteCache` 的 **命中率/每幀未命中數**（VOID 的 `floatOffset` 動畫是否造成持續重烘；用 `RenderStats` 擴充或在量測腳本內讀取快取統計；若需要在 `TerrainBlockCache` 暴露唯讀統計 getter，允許 1 個小改動）。把結論整理成「成本歸因表」：每個因子的 ms 貢獻、占比、是否可優化、風險。 | tools、docs、（≤1 個小 getter） | 歸因表入檔；每個結論都有 A/B 數字（中位數 + min/max） |
| **R2** | **依 R1 結論決定優化目標清單（寫進 `PERF_BASELINE_3.md`「R2 決策」）**，只選 **預期收益 ≥10% 幀耗時**且**預設外觀逐像素等價**的項目，**最多 2 項**；每項有改前改後的取消限制 headed 數據（中位數，≥5% 才保留，否則還原）。可能的方向（僅供參考，以 R1 數據為準）：(a) VOID 浮動地塊量化級距加粗／分組以提高 sprite 命中率；(b) 半透明地塊（ICE）以預合成降低重疊填充；(c) MAGMA 液面層改為低頻更新或離屏緩衝；(d) post 階段合併（apply + toneGrade 少一次全螢幕 pass）；(e) 畫布 `desynchronized`／context 選項（僅在不改外觀、且不破壞 `getImageData` 路徑時）。**逐像素等價者以 `perf:fidelity`（含有單位的 `battle_frozen`）0 差異驗證；若某項無法逐像素等價 → 做成旗標預設關，出前後對照圖，不得預設開啟。** | 每項 ≤3 檔 | lint/test/build/`perf:guard`；數據佐證 |
| **R3a** | **無風險小贏：移除無效的 shadowBlur**。`UnitAmbientPainter` 第二段（`globalAlpha = 0` 後以 `shadowBlur` 畫 1px 圓）在 Canvas 規格下陰影 alpha 受 `globalAlpha` 影響，**實際不可見但每個單位每幀付出 blur 成本**。以 `CtxOpCounter`（`?perfops`）證明前後 `shadowBlur` 計數下降、且 `perf:fidelity` 的 `battle_frozen` **逐像素 0 差異**（嚴格比較，非鄰域）後，把旗標關閉路徑中的這段 no-op 刪除（保留 `ctx.globalAlpha = 1`、`ctx.shadowBlur = 0` 的後置狀態以維持狀態等價；若後續程式依賴 `shadowColor`，保留該賦值）。同樣檢查其他位置是否存在「`globalAlpha=0` 或 `fillStyle` 全透明 + `shadowBlur`」的無效模式（`grep` 全部 `shadowBlur`），列出清單並逐一處理（每處需 `battle_frozen` 0 差異佐證）。 | ≤3 個 painter | lint/test/build/`perf:guard`；`shadowBlur` 每幀計數前後對照 |
| **R3b** | **光暈預烘焙品質補強（目前預設開，須維持外觀不退步）**：審查發現 `GlowSpriteCache` 套用有三處與原行為不完全等價，請修正並重新出對照圖：① `BarPainter`：glow 矩形寬度量化為**向上**取整，實際發光比填充條寬；改為以「實際填充寬度」烘焙（寬度量化級距加密或改為 1px 級距並設上限）② `UnitCorePainter`：原本設定的陰影會**持續影響同一 `save()` 區塊內後續的核心描邊**，旗標開時改為只畫一圈環形光暈，後續描邊失去陰影——改為依 `drawImperialCore`/`drawCovenantCore` 的實際形狀烘焙，或在旗標開時保留這些後續描邊的光暈等價物③ `RENDER_GLOW.QUERY_KEY` 與 `RENDER_QUALITY.GLOW_QUERY_KEY` 重複，保留一個（SSOT）。每個修正後以 `tools/ui-e2e/glow-compare.mjs`（**已修為真的有單位**）重出三張並排圖並量 meanAbsDiff/badPixelPct，目標：meanAbsDiff ≤0.05、badPixelPct ≤0.3%；達不到就在報告中列出殘差位置截圖（局部放大裁切圖存 `tools/ui-e2e/out/glow_crop_*.png`）。**因為已是預設開，baseline 重錄只准在本任務且僅限 `battle_frozen`，並需附新舊對照圖與差異數字**；以 `?glow=0` 作為原生 shadowBlur 的比較基準。 | ≤3 檔 | lint/test/build；旗標關時 `perf:fidelity` 0 差異；對照圖入檔 |
| **R4** **[E2E]** | 以 `?glow=1` 與 `?quality=2`、`?quality=3` 各做啟動冒煙（畫面可開、點選單位、無 pageerror）；`e2e:ui` 連跑兩次 ALL PASSED。另補一項**治理器實機檢查**：在主 GPU headed 模式下停留 60 秒，確認品質階層**保持 0**（不應被誤降階；若降階 → 回報並修正 `RenderQuality` 門檻，不得靠放寬測試）。把階層時間序列寫進報告。 | tools | lint/test/build/e2e |
| **R5** | **矩陣雨 Tier 1 反而更慢的疑點**：第二輪數據 Tier0 30.4 → Tier1 39.3 ms（降階卻變慢）。以取消限制 headed、3 輪交錯重測 `?quality=0/1/2` 的 showcase；若 Tier 1 確實不優於 Tier 0 → 找原因（`ctx.save/scale` 每幀、畫布縮放後的 CSS 放大成本、`getMatrixRainBudget` 每幀呼叫）並修正，或把 Tier 1 的行為改成對效能確實有益的方案（例如只降頻不降解析度）；仍只在 tier ≥1 生效，Tier 0 逐像素不變。 | `useMatrixRain.ts`、`RenderQuality.ts`、`constants.ts` | lint/test/build；數據佐證 |
| **R6** | **烘焙渲染第一步可行性驗證（只做原型量測，不進產品路徑）**：依 `BAKED_RENDERING_DESIGN.md` 的「高度分帶烘焙」方案，在 `tools/` 下寫一個**獨立原型頁**（`tools/baked-terrain-proto.html` + 腳本）：離屏把整張靜態地形烘焙成 2 層（單位後方／前方）後，每幀僅 2 次 `drawImage` + 單位繪製，與現行 per-hex blit 比較 headed 取消限制的 ms 與 GPU 忙碌。**不得改 `engine/**` 或產品檔。** 結論寫進 `PERF_BASELINE_3.md`：預期收益（ms 與 %）、失效條件、實作風險，以及「是否值得進入第四輪實作」的建議。 | tools、docs | 原型可跑；數據入檔 |
| **REPORT** | `docs/PERF_REPORT_3.md`：①真實基準（vsync 版與取消限制版）②成本歸因表③R2/R3 優化前後數據與保真（含有單位的 `battle_frozen`、嚴格比較）④光暈旗標關/開對照圖與殘差⑤治理器實機時間序列⑥R6 原型結論⑦**使用者要做的事**（見下）⑧回退指南（各 tag）。補寫 `DECOUPLING_HANDOFF.md` §10.6。 | docs | — |
| **FINAL** | 全量驗證：lint/test/build/`e2e:ui`（兩次）/`perf:guard`；工作樹乾淨、未 push；本地 tag：`perf3-ckpt-R0`、`perf3-ckpt-R2`、`perf3-ckpt-R3`、`perf3-ckpt-final`（完成當下就打）。 | docs | — |

### 本輪額外規則

- **取捨順序**（額度吃緊時）：`R0a → R0b → R1 → R3a → R2 → R3b → R4 → R5 → R6`，其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。**
- 若 R1 顯示成本主要在**瀏覽器合成／光柵端**而非我們的 Canvas 命令（例如 GPU process 忙碌占比高、JS 階段很短）→ 把重點轉向「減少每幀繪製面積／層數／overdraw」（例如 R6 的烘焙分帶），並在報告說明；不得為了「有改」而保留無收益的改動。
- 任何涉及 `battle_frozen` 的比較，一律用嚴格逐像素（無鄰域對齊）作為「等價」判定；地形 5 場景沿用既有門檻，**不得放寬、不得重錄**。
- 停工原則同前：只有遇到會改變使用者可見預設外觀、且文件未涵蓋的情況才停下。

---

## 回來後使用者要做的事（給人看）

1. 讀 `docs/PERF_REPORT_3.md` 與 `git log perf/render-opt-3 --oneline`。
2. **確認瀏覽器視窗放在主螢幕（2560×1440 @ 239 Hz，RTX 4070）**；不要拖到 59 Hz 的副螢幕（AMD 內顯）。Windows「設定 → 系統 → 顯示器 → 圖形」把你用的瀏覽器指定為「高效能」。
3. 在部署後的網站（或 `npm run dev`）網址加 `?perf`，回報畫面上的 FPS 與各階段 ms，以及你實際玩的情境（Showcase 或手動戰鬥）。
4. 看 `tools/ui-e2e/out/glow_compare_*.png`，確認光暈預烘焙（現為預設開）外觀仍可接受；不滿意可改回 `RENDER_QUALITY.GLOW_SPRITES = false`。
5. 不要 push；合併進 `main` 前先等主代理審查。
