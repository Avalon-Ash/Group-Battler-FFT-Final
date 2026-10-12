# UI 視窗系統與解耦基礎設施 夜間執行報告 (Night Report)

- **執行日期**：2026-10-10
- **工作分支**：`feat/ui-window`（所有變更僅在本地分支，**未 push**，**未動 main**）
- **總計任務數**：11 / 11 依序全部完成（`U0a` → `U1` → `U1b` → `U1c` → `U2` → `E1` → `E2` → `E2b` → `E3` → `E3b` → `E9`）
- **當前測試狀態**：8 個測試套件、73 個測試全部通過（73 passed, 0 failed）
- **TypeScript 型別檢查**：`tsc --noEmit` 0 errors
- **生產環境建置**：`vite build` 成功建置，CSS `@apply` / `@tailwind` 完全由 PostCSS 編譯

---

## 1. 逐任務執行結果與 Commit 清單

| 任務 | Commit Hash | 檔案變更範圍 (≤3 檔) | 驗證與輸出摘要 |
| :--- | :--- | :--- | :--- |
| **U0a** | `a0cdbb3` | `package.json`<br>`tailwind.config.js` (新增)<br>`postcss.config.js` (新增) | 安裝 `tailwindcss@^3.4`、`postcss`、`autoprefixer`。建置後 `dist/assets/*.css` 驗證無殘留 `@apply` 或 `@tailwind`。Grep 動態類名並配置 safelist。 |
| **U1** | `7bde1e7` | `types.ts`<br>`constants.ts`<br>`components/ui/window/windowStore.ts` (新增) | 定義 `UI_WINDOW`、`UI_Z`；`WindowId`、`WindowRect`、`WindowState`、`WindowDef`；純 TS 函式與狀態容器（clampRect、restoreState、serialize、z-index 重編號防溢出）。 |
| **U1b** | `d4e8360` | `tests/WindowStore.test.ts` (新增) | **16/16 測試全綠**：clamp 邊界、負數 x/y 保留可見區、損毀 JSON 回退、無效型別丟棄、z-index 循環重編號、storage 拋例外防護。 |
| **U1c** | `6b2190a` | `data/ui/windows.ts` (新增)<br>`hooks/useWindowStore.ts` (新增) | 建立 8 個標準視窗定義 SSOT（logs, db, vfxmap, inspector, monitor, directorSettings, zoneSettings, showcaseSettings），封裝 `useSyncExternalStore` 薄 hook 與 actions。 |
| **U2** | `dd96bfb` | `hooks/useWindowInteraction.ts` (新增)<br>`components/ui/window/ToolWindow.tsx` (新增)<br>`components/ui/window/WindowLayer.tsx` (新增) | 支援 Pointer Events 標題列拖曳、8 向邊角縮放（含觸控把手命中區）、雙擊最大化、收合按鈕、置頂事件、視窗外點擊穿透至 Canvas。拖曳/縮放期間 direct DOM style 寫入以維持 60fps。 |
| **E1** | `dd2c06e` | `types.ts`<br>`types/UIViewModel.ts` (新增) | 定義 `UICommand` 聯集命令、`EventMap['UI_COMMAND']`，以及唯讀視圖契約 `AgentView`、`DirectorView`、`ZoneView`、`CameraTuningView`、`LogView`、`GamePlaybackView`。 |
| **E2** | `cab3d43` | `engine/systems/ui/UICommandSystem.ts` (新增)<br>`engine/game.ts`<br>`engine/renderer.ts`<br>`AGENTS.md` | 實作 UI 唯一寫入閘門 `UICommandSystem`（驗證數值範圍/防禦式寫入）；`game.ts` 註冊一行；`renderer.ts` 訂閱相機命令；`AGENTS.md` §1.5 補入閘門規定。 |
| **E2b** | `9dbc6dc` | `tests/UICommandSystem.test.ts` (新增) | **11/11 測試全綠**：驗證 Director/Zone/Agent/AI 重建/重置/時間縮放命令；驗證越界 clamp 與未知命令不崩潰。 |
| **E3** | `6d0ddd9` | `engine/systems/ui/selectors.ts` (新增)<br>`hooks/useEngineView.ts` (新增)<br>`hooks/useEngineCommands.ts` (新增) | 實作純函式 selectors（快取與參考穩定性）；`EngineViewTicker` 共用輪詢器（10 Hz，訂閱為 0 自動清除 timer）；型別安全派發 hook。 |
| **E3b** | `8de1e47` | `tests/UISelectors.test.ts` (新增) | **11/11 測試全綠**：測試 selectors 數值未變時回傳相同參考（`toBe`）、數值改變回傳新參考；測試 `EngineViewTicker` 訂閱計數與自動啟停。 |
| **E9** | `f6b40bd` | `tests/ui-boundary.baseline.json` (新增)<br>`tests/UIBoundary.test.ts` (新增) | **6/6 測試全綠**：邊界守門棘輪測試，靜態掃描 `components/**` 與 `hooks/**`，禁止新增直接 engine/agent 寫入、禁止 `as any`、禁止新增 `setInterval` 與 Tailwind 色盤 class。 |

---

## 2. 遇到的問題與技術決定

1. **U0a 動態類名 Grep 分析結果**：
   - 全專案掃描發現約 36 處 template string className，例如 `${isBlue ? 'bg-blue-500' : 'bg-red-500'}`、`${isOpen ? '...' : '...'}`。
   - **所有 class 皆為完整字串常值**，並無 `${prefix}-${color}-500` 等截斷式拼接，因此 Tailwind 靜態 content 掃描器能正確提取絕大多數類別。
   - 為防止漏網之魚，`tailwind.config.js` 額外配置了 `safelist` 正則表達式，涵蓋 cyan、blue、red、amber、emerald 等核心調色盤與透明度。
   - PostCSS 建置生效後，`dist/assets/*.css` 檔案大小由 4.14 kB 成長至 201 kB，`.liquid-card`、`.liquid-btn` 等元件 class 首次由 Tailwind 編譯為實際樣式。
2. **事件匯流排型別安全 (`GAME_RESET`)**：
   - `EventMap['GAME_RESET']` 型別為 `Record<string, never> | void`，在 `EventBus.emit` 的嚴格型別檢查下需帶入 `{}` 作為酬載；`UICommandSystem` 中已按引擎標準以 `emit('GAME_RESET', {})` 處理。
3. **Agent 建構式參數順序**：
   - `Agent` 實體建構式為 `constructor(id, team, q, r, mapConfig)`，在 E2b / E3b 單元測試建立 mock agent 時嚴格遵守主契約型別。
4. **邊界守門棘輪基準線 (Baseline)**：
   - 經靜態掃描，目前既有程式碼基準線數值為：
     - `directEngineMutation`: 18
     - `directAgentMutation`: 6
     - `directRendererAccess`: 19
     - `asAny`: 0（專案全域維持嚴格型別，無 `as any`）
     - `setIntervalCount`: 5（現有各面板舊輪詢）
     - `tailwindPaletteClasses`: 505
   - 未來階段 D（面板遷移）每完成一個元件，此基準線將會向下調低，確保解耦過程只減不增。

---

## 3. 尚未完成項（依指示本次刻意不執行）

- `U0b`：移除 `index.html` 的 CDN `<script>`（需人工逐面板目視比對）
- `U3`：Logs 視窗試點接入（需在桌機與手機上實際操作手感）
- `U4`、`E4`、`U5`、`U7`、`U8`、`E6`、`U6`、`E7`、`U9`~`U13`、`E8`：後續視窗化遷移與高風險輸入重構任務

---

## 4. 使用者起床後建議先做的事

1. **檢視 Git 歷史**：
   ```bash
   git log feat/ui-window --oneline -n 12
   ```
2. **本機啟動與驗證**：
   ```bash
   npm test        # 確認 8 套件、73 測試全綠
   npm run lint    # 確認 0 errors
   npm run dev     # 啟動開發伺服器（此階段 CDN 仍在，現有畫面與操作完全正常）
   ```
3. **準備下一階段**：
   - 當您確認目前架構無誤後，可通知代理開始進行 `U0b`（目視比對報告）或 `U3`（Logs 視窗試點接入）。
