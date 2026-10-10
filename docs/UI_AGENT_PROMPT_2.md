# 外出執行指令 #2（貼給 IDE 代理）

> 用法：在 IDE 代理對話輸入 `/goal docs/UI_AGENT_PROMPT_2.md`（或把「指令本文」整段貼上）。
> 範圍刻意限定在**低/中風險、可由自動化驗證**的任務；高風險任務（U6、E8、U11 之後、U12、U13）一律不做，由使用者回來後決定。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理，接續上一輪（`docs/UI_NIGHT_REPORT.md`）與我（主代理）已完成的 U0b/U3/U4。請嚴格依照文件工作：

1. 先完整閱讀：`AGENTS.md`、`docs/UI_WINDOW_PLAN.md`（**特別是 §0 決策、§2 守則、§3 架構、§8 停下條件、§10 審查發現 F1–F9、§11 無頭瀏覽器發現、§12 e2e 工具**）、`types.ts`、`constants.ts`、`tools/ui-e2e/windows.e2e.mjs`。
2. 確認目前在分支 **`feat/ui-window`**（`git branch --show-current`）。**絕對不要 push、不要切到或修改 `main`**（`main` 推送會觸發 GitHub Pages 自動部署）。`package-lock.json` 被 `.gitignore` 忽略是刻意的，不要加入。
3. 只執行下列任務，**依序**，每個完成才做下一個：

   `E4` → `U5` → `U7a` → `U7b` → `U8` → `E6` → `E7` → `U9` → `U10`

   任務內容、檔案範圍以 `docs/UI_WINDOW_PLAN.md` §4 為準。補充：
   - **E4**：同時處理 §10.2 F4（`useEngineView.ts` 內自訂的 `SNAPSHOT_HZ`、`selectCameraTuningView` 的 `?? 3.5` fallback 改用 `UI_SETTINGS`）。`UI_SETTINGS` 已有範圍常數（zone radius 3–20、interval 1–60、min radius 0–10、camera stiffness 0.1–20、time scale 0.1–5），沿用並補預設值。
   - **U5**：Monitor 改用 `useEngineView`，移除自己的 `setInterval`（E9 baseline 的 setInterval 計數要降低）。
   - **U7a**：`SystemMenu` → ToolMenu，列出 `WINDOW_REGISTRY` **已註冊**的視窗（`data/ui/windows.ts` 中尚未在 registry 註冊的，例如 inspector，**不要列出**）。這會補上目前缺失的 VFXMap 入口。保留既有「導演/區域/下載」等非視窗動作的行為不變，直到 U7b/U8 搬走。為選單按鈕加穩定的 `data-testid`。
   - **U7b / U8**：設定改視窗後，`SystemMenu` / `ShowcaseSettings` 內的 `engine.* =` 直接寫入必須全部改為 `UICommand`（經 `useEngineCommands`）。`ShowcaseSettings` 設 `visibleInShowcase`，Showcase 模式下仍可操作。
   - **E6**：`EDIT_AGENT` / `REBUILD_AGENT_AI` 命令與 `UICommandSystem` 驗證；`UnitInspectorHUD`/`BehaviorTreeTab` 只改「寫入走命令、唯讀走 selector」，**不做視窗化（那是 U6，禁止）**，也不改版面。
   - **U9**：釘選工具列只加「位置記憶 + 顯示時 clamp + Pointer/觸控」，不加縮放。
   - **U10**：`z-30/40/50/55/60/70` → `UI_Z`，用 `style={{ zIndex: UI_Z.X }}`（Tailwind 無法引用常數）。**僅在舊值與 `UI_Z` 現有值能一對一對應時才換**；對不上就跳過並寫入報告。每批 ≤3 檔。
4. 每個任務的流程：
   1. 照 §4 該任務檔案範圍實作（**≤3 檔**；**新增的測試檔、`docs/**`、`tools/ui-e2e/**`、`tests/ui-boundary.baseline.json` 不計入檔數**）。
   2. 執行 `npm run lint`（0 errors）、`npm test`（全綠）、`npm run build`（成功）。
   3. **凡是接進 React 的任務（U5、U7a、U7b、U8、U9、U10）還必須跑 `npm run e2e:ui`（headless Edge/Chrome，需全數 PASS）**，並：
      - 把新視窗加入 `tools/ui-e2e/windows.e2e.mjs` 的 `SUITES`（有選單入口用 `menuIndex` 或改成以 `data-testid` 開啟；U7a 會改變選單結構，**必須同步更新 e2e 的 `openViaMenu`**，不得刪檢查來讓它通過）。
      - 若有截圖在 `tools/ui-e2e/out/`，用影像檢視確認版面（沒有多模態能力就略過，改靠 e2e 的幾何檢查）。
      - `UI_WINDOW` 互動與命中測試相關的 bug **單元測試抓不到**，e2e 是唯一防線；e2e 不能跑時該任務標「未驗證」並停下。
   4. 若遷移減少了 E9 守門計數（直接寫引擎/agent、`.renderer`、`setInterval` 等），**同步下調 `tests/ui-boundary.baseline.json`** 並讓 `UIBoundary` 測試通過；絕不可調高。
   5. 在 `docs/UI_WINDOW_PLAN.md` §4.1 進度表把該任務標 ☑（備註：日期 + commit hash + 重點）。
   6. `git add -A && git commit -m "<任務代號>: <一句話>"`（一任務一 commit，只在本地分支）。
5. 同一問題嘗試 3 次仍失敗 → 停下，寫進報告，不要硬過（不可刪測試、不可放寬斷言、不可 `as any`）。
6. **已知陷阱（上一輪踩過）**：
   - **React 整合 bug**：store 必須維持「不可變快照」，否則 `useSyncExternalStore` 不重繪；`.liquid-card` 有 `transition-all`，視窗盒子需 `transition:none`；事件穿透靠 `WindowLayer`。不要動 `windowStore.ts` / `ToolWindow.tsx` 的這些行為，除非任務需要並補 e2e。
   - 輪詢一律用 `useEngineView`（單一共用 ticker），不要新增 `setInterval`。
   - `Agent` 不可加方法；UI 寫入只能經 `UICommand` → `UICommandSystem`；事件使用 `GameEventPool`，新增欄位要同步重設。
   - 事件匯流排（`engine.bus`）：系統不得直接呼叫另一個系統。
   - 檔案換行風格保持與原檔一致（多數 CRLF）。含中文的檔案**不要**用 PowerShell `Get-Content -Raw | Set-Content`（會亂碼）；用 `[IO.File]::ReadAllText/WriteAllText` + `UTF8Encoding($false)`，或直接用編輯工具。e2e 腳本內的中文字串用 `\uXXXX` 跳脫。
   - 顏色/尺寸/時間常數進 `constants.ts` 或 `data/ui/**`；不得 `console.log`；保留既有註解。
7. **以下情況立即停止並回報，不要自行決定**：
   - 任務需要超過 3 個檔案（不含上述例外），或需要新依賴。
   - 需要修改授權範圍外的引擎檔（`engine/game.ts` 與 `engine/renderer.ts` 除了已有的註冊/訂閱行外一律不碰）。
   - 測試/建置/e2e 反覆失敗，或與 `AGENTS.md` 衝突。
   - 發現產品行為會改變（不只是重構）而計畫沒有寫到。
8. **本次絕對不要做**：`U6`（Inspector 視窗化）、`E8`（編輯器輸入）、`U11` 及之後、`U12`、`U13`，以及任何 `git push` / 動 `main`。完成 `U10` 後即停止。
9. 結束時寫 `docs/UI_NIGHT_REPORT_2.md`：逐任務結果（commit hash、lint/test/build/e2e 輸出摘要）、E9 baseline 變化前後、跳過/未驗證項目與原因、遇到的問題與決定、建議使用者回來先看什麼（例如手動開每個視窗、選單、Showcase 設定）。**不要 push。**

---

## 回來後使用者要做的事（給人看）

1. `git log feat/ui-window --oneline`，讀 `docs/UI_NIGHT_REPORT_2.md`。
2. `npm run dev` 手動點一輪：☰ 選單（應列出 Logs/SkillDB/VFXMap/…）、設定視窗、Showcase 設定。
3. 可再要主代理做 `U6`（先看分段方案）、`U11`（token）、`U12`（響應式/觸控）、`E8`（需子計畫核准）。
4. 合併進 `main` 前先別 push（push 會更新 GitHub Pages）。
