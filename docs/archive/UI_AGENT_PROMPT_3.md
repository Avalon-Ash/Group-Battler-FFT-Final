# 外出執行指令 #3（貼給 IDE 代理）

> 用法：在 IDE 代理對話輸入 `/goal docs/UI_AGENT_PROMPT_3.md`（或把「指令本文」整段貼上）。
> 內容來自主代理對 `UI_NIGHT_REPORT_2` 的審查（lint/test/build/e2e 全綠，但發現下列缺陷與測試缺口）。
> 範圍：**修審查缺陷 + 補 e2e 缺口**。全部可自動驗證，無需人眼。高風險任務（U6、E8、U11+、U12、U13）仍不做。

---

## 審查摘要（給代理看的背景）

已確認 OK：9 個任務皆在計畫範圍內、`npm run e2e:ui` 全綠、E9 baseline 只減不增、`as any` 為 0、未 push。

審查發現（本輪要修）：

| # | 問題 | 位置 |
| :-- | :-- | :-- |
| F10 | **相機剛度預設值錯誤**：真正的預設是 `CameraSystem.followStiffness=0.25 / zoomStiffness=0.2`，但 `UI_SETTINGS.CAMERA_STIFFNESS.default=3.5`，且 `SettingsWindows`/`ShowcaseSettings` 的 fallback 寫死 `?? 3.5`（引擎還沒回 view 時會閃出錯值）。 | `constants.ts`、`engine/systems/CameraSystem.ts`、兩個設定元件 |
| F11 | 設定元件內仍有魔術數字：`?? 8 / 15 / 1`（本應用 `UI_SETTINGS.*.default`）；Showcase 的滑桿範圍 `0.1–3.0`、矩陣 `speed 0.1–5`、`gap 0–1` 寫死。 | `SettingsWindows.tsx`、`ShowcaseSettings.tsx` |
| F12 | 「導演目標」selector 與模組級快取 `prevTargetSnapshot` 寫在 **元件檔** 內（直接讀 `engine.agents`，E9 看不到）；且快取不分 engine 實例（F5 同類：`agentViewCache`）。 | `DirectorMonitorHUD.tsx`、`selectors.ts` |
| F13 | `useDraggable` 內魔術數字 `1920/1080/200/60` 與工具列 localStorage key 字串散落。 | `useDraggable.ts`、`MapEditorToolbar.tsx`、`PlaybackHUD.tsx` |
| F14 | `SystemMenu` 殘留未用 props（`onToggleLogs/DB/VFXMap/Monitor/engine/monitorEnabled`）；e2e `openViaMenu` 保留舊的 `nth(index)` 路徑。 | `SystemMenu.tsx`、`App.tsx`、`windows.e2e.mjs` |
| F15 | U10 被跳過的 z-index：`UI_Z` 缺少對應的具名層（30/50/55/60）。**不要硬換成不同數值**，而是新增**同值**的具名層。 | `constants.ts`、各檔 |
| F16 | `ShowcaseSettings` 用**模組級可變變數** `sharedConfig/sharedLayout` + listener Set + 「bridge 元件回傳 null」的 hack；`ShowcaseOverlay` 也走這條。 | `ShowcaseSettings.tsx`、`ShowcaseOverlay.tsx` |
| F17 | Inspector 數字欄位：E6 後遇到 `NaN`/空字串就整個忽略 → 受控 input 清空時會彈回舊值，難以編輯。 | `UnitInspectorHUD.tsx` |
| T1 | e2e 缺口：沒測 ToolMenu 行為、SchemaForm 是否**真的**改到引擎、Showcase 模式下的視窗可見性、釘選工具列位置記憶、Inspector 命令是否生效。 | `tools/ui-e2e/windows.e2e.mjs` |

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理，接續 `docs/UI_NIGHT_REPORT_2.md`。請嚴格依照文件工作：

1. 先閱讀：`AGENTS.md`、`docs/UI_WINDOW_PLAN.md`（§2 守則、§8 停下條件、§10–§12）、`docs/UI_AGENT_PROMPT_2.md`（流程與已知陷阱，**全部沿用**）、上面的審查摘要，以及每個任務要動的檔案。
2. 確認在 `feat/ui-window`（`git branch --show-current`）。**不要 push、不要動 `main`。** `package-lock.json` 不要 commit。
3. 只做下列任務，**依序**：

   `R1a` → `R1b` → `R2` → `R3` → `R4` → `R5` → `R6a` → `R6b` → `T1a` → `T1b` → `T1c` → `T1d` → `T1e` → `R7` → `R8`

   | 任務 | 內容 | 檔案（≤3，測試/docs/e2e/baseline 不計） | 驗證 |
   | :-- | :-- | :-- | :-- |
   | **R1a** | F10：`UI_SETTINGS.CAMERA_STIFFNESS` 改成 `followDefault: 0.25`、`zoomDefault: 0.2`（移除錯的 `default: 3.5`，同步改所有引用）；`CameraSystem` 的初始值改引用這兩個常數（**唯一允許動的引擎檔改動：只改這兩行初始值，不改邏輯**）。 | `constants.ts`、`engine/systems/CameraSystem.ts`、（必要時 `selectors.ts` 的 fallback） | lint/test/build；新增/更新單元測試：`selectCameraTuningView` 的 fallback 等於常數 |
   | **R1b** | F10+F11：`SettingsWindows.tsx` 匯出 `useDirectorSettingsValues(engine)` / `useZoneSettingsValues(engine)`（內含 fallback，一律用 `UI_SETTINGS.*` 常數，**零字面數字**）；`ShowcaseSettings` 的 CAMERA / GAMEPLAY 分頁改用這兩個 hook，刪除重複與 `?? 3.5/8/15/1`。 | `SettingsWindows.tsx`、`ShowcaseSettings.tsx` | lint/test/build/**e2e** |
   | **R2** | F12：把導演目標 selector 搬到 `engine/systems/ui/selectors.ts`（名稱 `selectDirectorTargetView`），快取改為 **`WeakMap<GameEngine, …>`**（per-engine）；順手把 F5 的 `agentViewCache` 也改 per-engine `WeakMap`。`DirectorMonitorHUD` 只 import selector、移除未用變數（`teamColor`、`onClose` 等）。 | `DirectorMonitorHUD.tsx`、`selectors.ts` | 單元測試：同值回傳同參考、換 engine 不串快取、無目標回 null；lint/test/build/**e2e**；E9 baseline 若下降要調 |
   | **R3** | F11：Showcase 滑桿範圍進 `UI_SETTINGS`：動畫速度改用 `UI_SETTINGS.TIME_SCALE`（min/max/step；**行為差異：上限由 3.0 變 5.0，寫進報告**）；新增 `UI_SETTINGS.MATRIX_SPEED`、`MATRIX_GAP`（`{min,max,step}`，沿用現有 0.1–5.0/0.1、0–1.0/0.05）。 | `constants.ts`、`ShowcaseSettings.tsx` | lint/test/build/e2e |
   | **R4** | F13：新增 `UI_PIN`（`FALLBACK_VIEWPORT:{w,h}`、`FALLBACK_SIZE:{w,h}`、`STORAGE_KEYS:{mapEditor,playback}` 或前綴）；`useDraggable`/兩個工具列改引用；**localStorage key 字串值不變**（避免使用者既有位置失效）。補 `useDraggable` 單元測試：clamp 邊界、損毀 JSON 回退預設、storage 丟例外不崩。 | `constants.ts`、`useDraggable.ts`、`MapEditorToolbar.tsx`、`PlaybackHUD.tsx`（超過 3 檔：**拆成 R4（constants+useDraggable）與 R4b（兩個工具列）兩個 commit**） | lint/test/build/e2e |
   | **R5** | F14：移除 `SystemMenu` 未用 props 與 `App.tsx` 對應傳參；`windows.e2e.mjs` 的 `openViaMenu` 只保留 `data-testid` 路徑（刪 `nth()` 舊路徑與 `.or(...)` fallback）。 | `SystemMenu.tsx`、`App.tsx`、`windows.e2e.mjs` | lint/test/build/e2e |
   | **R6a** | F15：`UI_Z` 新增**同值**具名層：`INSPECTOR: 30`、`OVERLAY: 50`、`MENU_BACKDROP: 55`、`MENU: 60`、`OVERLAY_CONTROLS: 60`（名稱可微調，**數值必須等於現有 class 數值**，`WINDOW_BASE/WINDOW_MAX/TOP_OVERLAY` 不動）。把 `SystemMenu`、`UnitInspectorHUD` 的對應 `z-*` 換成 `style={{ zIndex: UI_Z.X }}`。 | `constants.ts`、`SystemMenu.tsx`、`UnitInspectorHUD.tsx` | lint/test/build/e2e（多視窗置頂 + 選單疊在視窗上方） |
   | **R6b** | 同上，換 `ShowcaseOverlay.tsx`（50/55/60）、`GameCanvas.tsx`（z-50）、`App.tsx`（z-50）。**`z-0/z-10/z-20` 等元件內部局部層級不動。** 並在 E9 增加一項計數 `zIndexClasses`（`\bz-\[?\d+\]?`，掃 `components/**`、`App.tsx`），baseline 設為換完後的數字，只准減。 | `ShowcaseOverlay.tsx`、`GameCanvas.tsx`、`App.tsx`（+ `tests/UIBoundary.test.ts`、baseline 不計） | lint/test/build/e2e |
   | **T1a** | e2e 可觀測性：**僅在 `import.meta.env.DEV`** 下於 `window` 暴露 `__TACTICAL_ENGINE__`（型別化，**不得 `as any`**，用 `Window & { __TACTICAL_ENGINE__?: GameEngine }`）。位置選 `hooks/useGameApp.ts`（engine 建立處）。`npm run build` 後的 `dist` 不得含此字串（以 grep 確認並寫進報告）。 | `hooks/useGameApp.ts` | lint/test/build + grep dist |
   | **T1b** | e2e ToolMenu 套件：列出 7 個視窗項目 + `menu-item-reset-layout` + `menu-item-spec`；點項目開啟後狀態點變亮、再點關閉；點外面（backdrop）關閉選單；「重設版面」把被拖動過的視窗恢復預設 rect 並清掉 localStorage 內該 id 的自訂值。 | `tools/ui-e2e/windows.e2e.mjs` | e2e |
   | **T1c** | e2e SchemaForm → 引擎：用 `__TACTICAL_ENGINE__` 讀值。拖 `zoneSettings` 的 `initialRadius` 滑桿、切換 `zoneEnabled`，斷言引擎 `zoneConfig`（或對應欄位，先讀 `UICommandSystem` 確認寫入位置）在範圍內被改；拖 `directorSettings` 的剛度滑桿，斷言 `engine.renderer.camera.followStiffness` 被改且被 clamp 在 `UI_SETTINGS` 範圍；開窗時顯示值等於引擎目前值（避免 F10 的回歸）。 | `tools/ui-e2e/windows.e2e.mjs` | e2e |
   | **T1d** | e2e Showcase 與釘選工具列：(1) 進入 Showcase 模式（不點「啟動戰術模擬」）→ 一般視窗（logs 等）不可見、`showcaseSettings` 在 ☰ 開啟後可見且可操作；進入手動模式後其他視窗恢復。(2) 拖動 Playback 工具列 → reload → 位置保留（±2px）；縮小 viewport 到 420×400 → 工具列完整在可視範圍內。 | `tools/ui-e2e/windows.e2e.mjs` | e2e |
   | **T1e** | e2e Inspector 命令：用 `__TACTICAL_ENGINE__` 取一個 agent 並讓 UI 選取它（先讀 `useGameApp`/`GameCanvas` 找到「選取」的合法入口；若只能靠點 canvas，就用 `engine` 的 hex→螢幕座標推算點擊位置）；在 Inspector 把職業改成另一個 Role、maxHp 改成 123 → 斷言該 agent 的 `role/maxHp/hp` 已變。 | `tools/ui-e2e/windows.e2e.mjs` | e2e；**若選取入口找不到，標「未驗證」並跳過，不要硬寫不穩定的測試** |
   | **R7** | F16：新增 `components/ui/showcase/showcaseConfigStore.ts`（純 TS，不可變快照 + `subscribe`，`useSyncExternalStore` hook），取代 `ShowcaseSettings` 的 `sharedConfig/sharedLayout/configListeners` 與 `show`-bridge hack；`ShowcaseOverlay` 與設定視窗都讀同一個 store。打開設定視窗改由 `windowStore` / `useWindowActions` 完成（不再於 effect 內 import 單例）。**Showcase 的視覺與行為必須完全不變**。 | 新增 `showcaseConfigStore.ts`、`ShowcaseSettings.tsx`、`ShowcaseOverlay.tsx` | 單元測試（store 快照不可變、subscribe/unsubscribe）；lint/test/build/e2e（T1d 的 Showcase 檢查要仍通過） |
   | **R8** | F17：Inspector 數字欄位改為「本地草稿字串 + blur/Enter 提交」，提交時才驗證並發 `EDIT_AGENT`；非法輸入還原顯示；不改其他版面。 | `UnitInspectorHUD.tsx` | lint/test/build/e2e；T1e 仍通過（若 T1e 未驗證則標未驗證） |

4. 每個任務的流程、驗證與 commit 規則**完全沿用 `UI_AGENT_PROMPT_2.md` 第 4–7 點**（≤3 檔、lint/test/build、接 React 的任務跑 `npm run e2e:ui`、E9 baseline 只減不增、`UI_WINDOW_PLAN.md` §4.1/§13 更新、一任務一 commit、不 push、同題失敗 3 次就停）。額外規則：
   - **R 系列不得改變使用者可見的行為**（R3 的時間倍率上限、F10 的預設值顯示是唯一預期的差異，需在報告中列出）。
   - **T1 系列只能新增檢查，不得刪除或放寬既有斷言**；若新檢查不穩定（flaky），重跑 3 次仍不穩定就把該檢查移除並在報告記錄原因，不可用長 sleep 硬蓋。
   - e2e 每次新增套件後要**連跑兩次**確認穩定。
   - 若 `e2e:ui` 總時間超過 10 分鐘，把 SUITES 的通用檢查改為可用環境變數 `E2E_ONLY=<id,...>` 篩選（只改 e2e 腳本）。
5. **以下情況立即停止並回報**：需要改 `engine/**`（R1a 的兩行初始值除外）、需要新依賴、需要超過 3 檔又無法拆分、與 `AGENTS.md` 衝突、發現產品行為會改變而本文件沒寫。
6. **本次絕對不要做**：`U6`、`E8`、`U11`+、`U12`、`U13`，以及任何 `git push` / 動 `main`。完成 `R8` 即停止。
7. 結束時寫 `docs/UI_NIGHT_REPORT_3.md`：逐任務結果（commit hash、lint/test/build/e2e 摘要與 e2e 檢查數）、E9 baseline 前後（含新增的 `zIndexClasses`）、行為差異清單、未驗證/跳過項與原因、建議使用者回來先看什麼。**不要 push。**

---

## 回來後使用者要做的事（給人看）

1. `git log feat/ui-window --oneline`，讀 `docs/UI_NIGHT_REPORT_3.md`。
2. `npm run dev` 手動點：☰ 選單、導演設定的剛度滑桿（預設應顯示 0.3/0.2 左右而非 3.5）、Showcase 設定、拖動底部播放器後重新整理。
3. 接下來要主代理處理的：`U6`（Inspector 視窗化，先給你分段方案）、`U11`（token）、`U12`（響應式/觸控，需看畫面）、`E8`（編輯器輸入，需子計畫核准）。
4. 合併進 `main`（= 發佈到 GitHub Pages）前先別 push。
