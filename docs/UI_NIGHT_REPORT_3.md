# UI 夜間執行報告 #3 (UI_NIGHT_REPORT_3)

> 執行時間：2026-10-10  
> 工作分支：`feat/ui-window`（純本地提交，未 push，未動 `main`）  
> 執行策略依據：`docs/UI_AGENT_PROMPT_3.md`、`docs/UI_WINDOW_PLAN.md`、`AGENTS.md`  
> 成果總結：完成審查缺陷修復（F10–F17）與 e2e 測試缺口補全（T1a–T1e、R7、R8）全部 16 個任務節點。所有任務均通過 `npm run lint`（0 error）、`npm test`（107/107 全綠，12 個測試檔案）、`npm run build`（無 `__TACTICAL_ENGINE__` 字串外洩）以及 `npm run e2e:ui`（連跑兩次 ALL PASSED，涵蓋 ToolMenu、SchemaForm→Engine、Showcase 可見性、工具列位置記憶與邊界 clamp、以及 Inspector Live Agent 突變）。

---

## 1. 任務執行紀錄與 Commit 列表

| 任務 | Commit | 實作檔案 (≤3檔) | 驗證項目 | 重點與架構決策 |
| :--- | :--- | :--- | :--- | :--- |
| **R1a** | `11393db` | `constants.ts`<br>`engine/systems/CameraSystem.ts`<br>`selectors.ts` | lint: 0<br>test: pass<br>build: pass | **修復 F10 相機剛度預設值**：將 `UI_SETTINGS.CAMERA_STIFFNESS` 修正為 `followDefault: 0.25` / `zoomDefault: 0.2`（移除錯誤的 `default: 3.5`）；`CameraSystem` 與 `selectCameraTuningView` 引用常數。單元測試覆蓋 fallback 吻合。 |
| **R1b** | `0453477` | `SettingsWindows.tsx`<br>`ShowcaseSettings.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F10+F11 設定 hook 共享**：`SettingsWindows` 匯出 `useDirectorSettingsValues` 與 `useZoneSettingsValues`（零字面數字，全面引用 `UI_SETTINGS`）；`ShowcaseSettings` 複用 hook 刪除重複與寫死的 `?? 3.5 / 8 / 15 / 1`。 |
| **R2** | `290a2ca` | `selectors.ts`<br>`DirectorMonitorHUD.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F12 導演目標快取污染**：搬移導演目標 selector 至 `selectors.ts`（`selectDirectorTargetView`），以 per-engine `WeakMap<GameEngine, ...>` 取代全域模組快取；`agentViewCache` 同步升級為 per-engine `WeakMap`；`DirectorMonitorHUD` 移除未用變數。 |
| **R3** | `bf11747` | `constants.ts`<br>`ShowcaseSettings.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F11 Showcase 滑桿範圍**：動畫速度改用 `UI_SETTINGS.TIME_SCALE`（**預期行為差異：上限由 3.0 變 5.0**）；新增 `UI_SETTINGS.MATRIX_SPEED` 與 `MATRIX_GAP`（消除寫死數字）。 |
| **R4** | `e40b0c0` | `constants.ts`<br>`hooks/useDraggable.ts` | lint: 0<br>test: pass<br>build: pass | **修復 F13 工具列常數散落**：新增 `UI_PIN` 常數（`FALLBACK_VIEWPORT`、`FALLBACK_SIZE`、`STORAGE_KEYS`）；`useDraggable` 抽取 `clampToolbarPosition` 與 safe load/save 純函式，補全損毀 JSON、storage 例外安全與邊界 clamp 單元測試。 |
| **R4b** | `b53818f` | `MapEditorToolbar.tsx`<br>`PlaybackHUD.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F13 工具列 Key 引用**：`MapEditorToolbar` 與 `PlaybackHUD` 改引用 `UI_PIN.STORAGE_KEYS`，保持既有 localStorage key 字串值不變以相容使用者既有位置。 |
| **R5** | `177f080` | `SystemMenu.tsx`<br>`App.tsx`<br>`windows.e2e.mjs` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F14 SystemMenu 殘留 props**：移除 `SystemMenu` 未使用 props（`onToggleLogs/DB/VFXMap/Monitor/engine/monitorEnabled`）與 `App.tsx` 傳參；`windows.e2e.mjs` 的 `openViaMenu` 收斂至純 `data-testid` 選取（刪除舊 `nth()` 路徑）。 |
| **R6a** | `bb0b8b5` | `constants.ts`<br>`SystemMenu.tsx`<br>`UnitInspectorHUD.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F15 z-index 具名層收斂 (1)**：`UI_Z` 新增同值具名層（`INSPECTOR: 30`, `OVERLAY: 50`, `MENU_BACKDROP: 55`, `MENU: 60`, `OVERLAY_CONTROLS: 60`）；`SystemMenu` 與 `UnitInspectorHUD` 替換為 `style={{ zIndex: UI_Z.* }}`。 |
| **R6b** | `b7c158b` | `ShowcaseOverlay.tsx`<br>`GameCanvas.tsx`<br>`App.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **修復 F15 z-index 具名層收斂 (2) + E9 守門**：`ShowcaseOverlay`（50/55/60）、`GameCanvas`（z-50）、`App`（z-50）換為 `UI_Z` 樣式；保留局部內部層級；E9 新增 `zIndexClasses` 棘輪指標（基準值 9，只准減）。 |
| **T1a** | `54aaa81` | `hooks/useGameApp.ts` | lint: 0<br>test: pass<br>build: pass | **補 e2e 可觀測性**：僅在 `import.meta.env.DEV` 下於 `window` 暴露 `__TACTICAL_ENGINE__`（嚴格型別化無 `as any`，使用 `Window & { __TACTICAL_ENGINE__?: GameEngine }`）；grep 驗證 `dist/` 產物中 0 殘留。 |
| **T1b** | `4bf4c5c` | `tools/ui-e2e/windows.e2e.mjs` | e2e: 連跑兩次 PASS | **補 e2e ToolMenu 套件**：驗證 7 個視窗項目 + `menu-item-reset-layout` + `menu-item-spec` 存在；點擊 backdrop 關閉選單；開關狀態點同步；重設版面清除 localStorage 並還原預設 rect。 |
| **T1c** | `b10514b` | `tools/ui-e2e/windows.e2e.mjs` | e2e: 連跑兩次 PASS | **補 e2e SchemaForm→Engine 驗證**：透過 `__TACTICAL_ENGINE__` 驗證 `zoneSettings` 開關與半徑滑桿能實際改變引擎 `zoneConfig`；`directorSettings` 剛度初值吻合引擎（0.25 非 3.5），拖曳更新受 `UI_SETTINGS` clamp 保護。 |
| **T1d** | `9fa0f22` | `tools/ui-e2e/windows.e2e.mjs`<br>`hooks/useDraggable.ts` | e2e: 連跑兩次 PASS | **補 e2e Showcase 與釘選工具列**：驗證 Showcase 模式下標準視窗隱藏、齒輪圖示能打開 `showcaseSettings`；手動模式標準視窗還原；Playback 工具列拖曳記憶（reload 後位置 ±2px）與 420×400 小視窗邊界 clamp；優化 `useDraggable.ts` 的 `clampToolbarPosition` 有效邊距計算。 |
| **T1e** | `6a3b27f` | `tools/ui-e2e/windows.e2e.mjs` | e2e: 連跑兩次 PASS | **補 e2e Inspector 命令驗證**：透過 `__TACTICAL_ENGINE__` 取得活體 agent 世界/地形座標推算 Canvas 點擊位置選取單位；展開抽屜切換職業、修改 maxHp 為 123 並斷言引擎 `agent.role`、`agent.maxHp`、`agent.hp` 確實即時更新。 |
| **R7** | `1f2a34a` | `showcaseConfigStore.ts` (新)<br>`ShowcaseSettings.tsx`<br>`ShowcaseOverlay.tsx` | lint: 0<br>test: 107/107<br>build: pass<br>e2e: pass | **修復 F16 Showcase 狀態架構**：新增純 TS `showcaseConfigStore.ts`（不可變凍結快照 + `subscribe` + `useSyncExternalStore` hooks），徹底消除模組級 `sharedConfig/sharedLayout/configListeners` 變數與 `show`-bridge hack；`ShowcaseOverlay` 透過 `useWindowActions` 打開視窗並移除 bridge 元件；外觀與視覺 100% 不變。新增 store 單元測試。 |
| **R8** | `a539113` | `UnitInspectorHUD.tsx`<br>`windows.e2e.mjs` | lint: 0<br>test: 107/107<br>build: pass<br>e2e: 連跑兩次 PASS | **修復 F17 Inspector 數字欄位受控卡死**：生命值與能量值輸入改為「本地草稿字串 + blur / Enter 提交」，提交時才驗證並發送 `EDIT_AGENT`，解決受控 input 無法倒退清空、輸入 NaN 立即彈回舊值之缺陷；非法輸入自動還原顯示；e2e 同步更新 Enter 提交驗證。 |

---

## 2. E9 邊界守門棘輪 (UIBoundary Ratchet) 變化前後

在本次執行中，不僅既有 6 項指標持續維持在最佳低位，且配合 R6b 成功在 `UIBoundary.test.ts` 新增第 7 項守門指標 `zIndexClasses`：

| 指標名稱 | 初始基準 (Report #2 後) | 本輪 (Report #3 後) | 變化量 | 說明 |
| :--- | :---: | :---: | :---: | :--- |
| `directEngineMutation` | **8** | **8** | 0 | 保持低位（8 處均在允許白名單或低頻系統） |
| `directAgentMutation` | **1** | **1** | 0 | 保持低位（僅剩 `useGameInput.ts` 等候 E8） |
| `directRendererAccess` | **5** | **5** | 0 | 保持低位 |
| `asAny` | **0** | **0** | 0 | **零容忍保持 0** |
| `setIntervalCount` | **3** | **3** | 0 | 保持低位 |
| `tailwindPaletteClasses` | **427** | **427** | 0 | 等候 U11 語意 Token 大幅下降 |
| `zIndexClasses` (新增) | — | **9** | **+9 (新設)** | 掃描 `components/**` 與 `App.tsx` 中的 `\bz-\[?\d+\]?` class，只准減不准增 |

> **`zIndexClasses` 殘留的 9 處分佈**：
> 全部屬於**局部元件內部相對堆疊**（例如 `z-0`、`z-10`、`z-20`），無全域跨層級破壞，符合架構約定。

---

## 3. 已驗證行為差異清單 (Expected Behavioral Diffs)

以下為本輪重構帶來的**預期且已核准**的行為差異：

1. **Showcase 動畫速度滑桿上限 (R3)**：
   - 舊行為：上限寫死為 `3.0`。
   - 新行為：收斂至 `UI_SETTINGS.TIME_SCALE`，滑桿範圍為 `0.1` ~ `5.0`（step: 0.1）。
2. **導演設定 / Showcase 相機剛度初始顯示值 (R1a / F10)**：
   - 舊行為：在引擎 view 尚未更新或 fallback 時會閃現或顯示 `3.5`（錯誤的常數預設）。
   - 新行為：統一顯示 `0.25`（追蹤剛度）與 `0.2`（縮放剛度），與 `CameraSystem` 真實引擎物理數值完全一致。
3. **Inspector 屬性輸入編輯體驗 (R8 / F17)**：
   - 舊行為：輸入框為受控數字，使用者按 Backspace 清空時會立即被 `NaN` 攔截並彈回舊數值，無法流暢修改。
   - 新行為：輸入框支援本地草稿，使用者可完整清空並重新輸入，按下 `Enter` 或離開焦點 (`blur`) 時才發送命令；輸入非數字、負數或留空時自動恢復原引擎數值。

---

## 4. 未驗證 / 跳過項目與原因

- **無**：Prompt #3 要求的所有任務（R1a–R8、T1a–T1e）全數完成且全數通過自動化驗證。
- **嚴守邊界**：高風險項目（`U6`、`E8`、`U11`、`U12`、`U13`）在本次執行中**嚴格未碰觸**。
- **Git 狀態**：未執行任何 `git push`，未動 `main` 分支。

---

## 5. 驗證總結

1. **TypeScript Lint**：
   ```bash
   npm run lint
   # 0 errors
   ```
2. **單元測試 (Vitest)**：
   ```bash
   npm test
   # 12 passed (12 test files, 107 passed tests)
   ```
3. **生產建置 (Vite Production Build)**：
   ```bash
   npm run build
   # 乾淨完成，grep dist/ 驗證 __TACTICAL_ENGINE__ 為 0 出現
   ```
4. **無頭瀏覽器端對端測試 (Playwright E2E)**：
   ```bash
   npm run e2e:ui
   # 連跑兩次全數 ALL PASSED
   ```

---

## 6. 使用者回來後建議操作

1. **查閱 Git 歷史**：
   ```bash
   git log feat/ui-window --oneline -n 16
   ```
2. **啟動本機預覽**：
   ```bash
   npm run dev
   ```
3. **建議手動目視驗證**：
   - 點擊左上角 ☰ 選單，確認 7 個視窗與重設版面正常運作。
   - 打開導演設定視窗，確認剛度滑桿初值顯示為 `0.3 / 0.2` 左右，而非 `3.5`。
   - 進入 Showcase 模式，點擊齒輪圖示打開設定視窗，測試動畫速度可調至 `5.0`。
   - 在戰鬥生成單位後點擊一個單位打開 Inspector，展開屬性抽屜，以 Backspace 清空生命值並輸入新數值按 Enter 提交，確認即時生效。
4. **準備推進後續**：
   - 依據 `docs/UI_AGENT_PROMPT_4.md`，下一步即可啟動 U6 / S1 視覺回歸護欄與 U11 語意 Token 遷移。
