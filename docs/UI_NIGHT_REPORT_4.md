# UI 夜間執行報告 #4 (UI_NIGHT_REPORT_4)

> 執行時間：2026-10-10 ~ 2026-10-11  
> 工作分支：`feat/ui-window`（純本地提交，未 push，未動 `main`）  
> 執行策略依據：`docs/UI_AGENT_PROMPT_4.md`、`docs/UI_U6_SUBPLAN.md`、`docs/UI_E8_SUBPLAN.md`、`docs/UI_WINDOW_PLAN.md`、`AGENTS.md`  
> 總體成果：Prompt #4 所規劃之全部任務節點（**U6a–c**、**S1**、**U11a–d**、**U12a–c**、**E8-0…g**）已全數 100% 圓滿完成！所有階段均維持 ≤3 產品檔案之爆炸半徑、嚴格 0 `as any`、零魔術數字與硬編碼色值。

---

## 1. 任務執行紀錄與 Commit 列表

| 任務 | Commit | 實作檔案 (≤3檔) | 驗證項目 | 重點與架構決策 |
| :--- | :--- | :--- | :--- | :--- |
| **U6a** | `ad4a524` | `components/ui/inspector/UnitInspectorBody.tsx` (新) | lint: 0<br>test: pass<br>build: pass | **Inspector 純內容元件抽取**：抽取 `UnitInspectorBody`，Props 僅 `engine` 與 `agentId`；狀態訂閱使用 `useEngineView(engine, selectAgentView)`；無 `useDraggable`/藥丸/寫死寬度；完整繼承 R8 草稿輸入與提交邏輯。 |
| **U6b** | `94ef143` | `components/ui/window/windowRegistry.tsx`<br>`App.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **Inspector 視窗註冊與聯動**：在 `windowRegistry` 註冊 `inspector`（flush: true）；`App.tsx` 監聽選取單位開關視窗（保留 rect，D5）；視窗關閉時清除選取；Showcase/結算時隱藏；加入 E2E 視窗 12 項測試全過。 |
| **U6c** | `0b327a1` | `components/ui/tabs/BehaviorTreeTab.tsx`<br>（刪除舊 `UnitInspectorHUD.tsx`） | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **清理舊 HUD 與層級收斂**：徹底刪除舊 `UnitInspectorHUD.tsx`；將 `BehaviorTreeTab` 內聯浮動層由 `z-[9999]` 改為視窗內部相對層 `UI_Z.WINDOW_BASE`；下調 E9 baseline。 |
| **S1** | `42c7b54` | `tools/ui-e2e/windows.e2e.mjs`<br>`tools/ui-e2e/style-baseline.json` (新) | e2e: 連跑兩次 PASS | **視覺回歸護欄 (Computed Style Baseline)**：在 E2E 建立 `style-snapshot` 套件，抓取 29 個關鍵 UI 元素的 8 項 computed style 屬性；逐欄位字串嚴格比對。 |
| **U11a** | `9ae1072` | `data/ui/tokens.ts` (新)<br>`tests/UITokens.test.ts` (新) | lint: 0<br>test: pass<br>build: pass | **語意 Token SSOT**：建立 `tokens.ts`，team 色直接引用 `constants.ts` 的 `TEAM_COLORS`；建立 surface/line/text/accent 等語意色值（以 RGB 通道字串呈現以支援 alpha）；單元測試通過。 |
| **U11b** | `c5e2e56` | `tools/gen-ui-tokens.ts` (新)<br>`styles/tokens.css` (新)<br>`package.json` | lint: 0<br>test: pass<br>build: pass | **Token CSS 產生器**：實作 `gen-ui-tokens.ts`（使用 `vite-node` 執行），輸出 `:root { --color-* }` 變數到 `styles/tokens.css`；新增 `npm run gen:tokens` 指令。 |
| **U11c** | `aec7104` | `tailwind.config.js`<br>`index.css`<br>`styles/tokens.css` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **Tailwind 與 全域 CSS Token 映射**：`tailwind.config.js` 擴充 `rgb(var(--color-*) / <alpha-value>)`；`index.css` 替換 `liquid-*`、`--neon-*`、`--glass-*` 與 `[data-team]` 為語意 token；style-snapshot 達成 **0 差異**。 |
| **U11d** | `31b5213` | `components/ui/window/ToolWindow.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **ToolWindow 語意 Token 化**：將 ToolWindow 寫死調色盤 class 替換為語意 token（`border-token-line-dim`、`bg-token-surface-panel` 等）；E9 `tailwindPaletteClasses` 由 378 下調至 369；style-snapshot 0 差異。 |
| **U12a** | `102bb08` | `constants.ts`<br>`components/ui/window/ToolWindow.tsx`<br>`components/ui/window/WindowLayer.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **≤900px 響應式 Bottom Sheet**：新增 `UI_WINDOW.SHEET_BREAKPOINT = 900`、`SHEET_MAX_VH = 72`；窄螢幕時視窗以底部抽屜呈現（寬 100%、底邊貼齊、高 ≤72vh、禁用拖曳/把手/最大化）；一次僅顯示最上層視窗；不改寫儲存 rect；e2e 幾何斷言通過。 |
| **U12b** | `2134c95` | `constants.ts`<br>`index.css`<br>`components/ui/window/ToolWindow.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **觸控命中區與減少動態**：`@media (pointer: coarse)` 下標題列按鈕與縮放把手擴大至 ≥44px（`UI_WINDOW.TOUCH_MIN_TARGET`）；`prefers-reduced-motion` 關閉動畫與平滑過渡；e2e 斷言通過。 |
| **U12c** | `612e0b7` | `App.tsx`<br>`components/ui/window/ToolWindow.tsx` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **觸控捲動權限釋放**：將根節點 `touch-none` 收斂至主畫布區域，視窗內容區域開放 `touch-action: pan-x pan-y` 允許觸控捲動；視窗把手與標題維持 `touch-action: none`；e2e 斷言通過。 |
| **E8-0** | `e61a8f9` | `tools/ui-e2e/windows.e2e.mjs`<br>`tests/UIBoundary.test.ts`<br>`tests/ui-boundary.baseline.json` | e2e: 連跑兩次 PASS | **編輯器 E2E 防線與指標擴充**：建立 10 項編輯器動作 E2E 測試（ADD/DELETE/OBSTACLE/DRAG/DRAFT/ZOOM/PAN/RESTART/RANDOM/PLAY_PAUSE）；新增 `directEngineMethodCalls` (18) 與 `directPoseWrites` (12) 邊界指標。 |
| **E8-a** | `4ef54fd` | `types.ts`<br>`engine/systems/ui/UICommandSystem.ts`<br>`constants.ts` | lint: 0<br>test: pass<br>build: pass | **UICommandSystem 命令擴充**：新增 `PLACE_AGENT`、`REMOVE_AGENT_AT`、`SET_OBSTACLE`、`REMOVE_OBSTACLE`、`MOVE_AGENT`、`START_GAME`、`STOP_GAME`、`CLEAR_BOARD`、`RANDOMIZE_MAP`；新增邊界與有效性防護單元測試（25/25 通過）。 |
| **E8-b** | `e9c8a0e` | `engine/systems/ui/editorQueries.ts` (新)<br>`tests/EditorQueries.test.ts` (新) | lint: 0<br>test: pass<br>build: pass | **純讀取 EditorQueries**：實作純函式唯讀查詢（`queryAgentAt`、`queryIsValidHex`、`queryHasObstacle`、`queryObstacleTypeAt`、`queryIsBlocked`、`queryTerrainHeight`、`queryMapKeys`、`queryHexAtScreenPoint`、`queryHexToWorldSnap`）；單元測試通過。 |
| **E8-c** | `8ec156d` | `hooks/useGameInput.ts` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **useGameInput 低頻寫入遷移**：塗刷與放開時之提交全面改走 `UICommand`，查詢改走 `editorQueries`；保留 D11 拖曳預覽暫態寫入例外；10 項 E2E 全數通過。 |
| **E8-d** | `9097749` | `hooks/useGameApp.ts` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **useGameApp 生命週期遷移**：開場佈局、場景切換、地圖隨機化、遊戲開始/暫停/重置全面改走 `UICommand`；消除 `mapConfig` 直接賦值；10 項 E2E 與 Showcase 全過。 |
| **E8-e** | `d1ea4bb` | `types.ts`<br>`engine/renderer.ts`<br>`hooks/useCameraControl.ts` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **相機與視窗命令 (E8-e)**：新增 `CAMERA_ZOOM`、`CAMERA_PAN`、`CAMERA_SNAP`、`SET_VIEWPORT`；`GameRenderer` 訂閱處理；`useCameraControl` 透過 bus 派發 `CAMERA_ZOOM`；新增單元測試。 |
| **E8-e2** | `c7bf7e9` | `hooks/useGameCamera.ts`<br>`hooks/useGameInput.ts`<br>`hooks/useGameLoop.ts` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **相機平移/視窗尺寸命令 (E8-e2)**：`useGameCamera` 改用 `SET_VIEWPORT` 與 `CAMERA_SNAP`；`useGameInput` 拖曳平移派發 `CAMERA_PAN`；`useGameLoop` 派發 `SET_VIEWPORT`；拖曳平移 FPS 實測維持 **107~136 FPS**（D12 守門通過）。 |
| **E8-f** | `13d623a` | `engine/game.ts`<br>`hooks/useGameLoop.ts`<br>`tests/EngineTick.test.ts` (新) | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **戰鬥計時累加封裝 (D13)**：將 `battleTime` 累加移入 `engine.tick`（透過 `timeSystem.tick`）；`useGameLoop` 移除直接累加；`engine.clear()` 補齊時間歸零；新增單元測試。 |
| **E8-g** | `24be5d8` | `AGENTS.md`<br>`tests/UIBoundary.test.ts`<br>`tests/ui-boundary.baseline.json`<br>`docs/UI_WINDOW_PLAN.md` | lint: 0<br>test: pass<br>build: pass<br>e2e: pass | **E9 指標下調與例外收尾**：`AGENTS.md` §1.5 補齊 D11/D14 文件化例外；E9 棘輪指標降至理論最低值（`directEngineMethodCalls` 0, `directAgentMutation` 0, `directEngineMutation` 1, `directRendererAccess` 1, `directPoseWrites` 6）。 |

---

## 2. Style Snapshot (S1) 視覺護欄比對欄位清單

在 S1 建立之 `tools/ui-e2e/style-baseline.json` 中，針對以下 29 個目標元素進行逐欄位完全等價比對：
- **元素涵蓋範圍**：視窗主體殼層、標題列、關閉/收合/最大化按鈕、大小把手、標籤列（Tab）、選單按鈕（Hamburger）、釘選工具列（PlaybackHUD/MapEditorToolbar）、Liquid-card 卡片底板。
- **擷取之 Computed Style 欄位清單 (8 項)**：
  1. `color`
  2. `backgroundColor`
  3. `borderTopColor`
  4. `boxShadow`
  5. `backdropFilter`
  6. `opacity`
  7. `borderRadius`
  8. `fontSize`
- **排除項與處理**：
  - 動畫過渡屬性（排除未穩定時的 transform/transition，以 `waitForTimeout` 與 `prefers-reduced-motion` 確保完全就定位後取樣）。
  - S1 產生 baseline 後，後續 U11a–d、U12、E8 所有階段皆維持 **0 差異 (0 diffs)**。

---

## 3. E9 邊界守門棘輪 (UIBoundary Ratchet) 歷史演進表

| 指標名稱 | Prompt #3 (起始) | E8-0 (擴充後) | E8-g (最終值) | 累計改善幅度 | 最終殘留性質說明 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `directEngineMethodCalls` | — | 18 | **0** | **-100% (完全歸零)** | UI 與 Hooks 中已無任何直接呼叫 `engine.*` 方法 |
| `directAgentMutation` | 1 | 1 | **0** | **-100% (完全歸零)** | UI 中已無任何 `agent.* =` 屬性寫入 |
| `directEngineMutation` | 8 | 8 | **1** | **-87.5%** | 唯一保留：`GameCanvas.tsx` 的組合根綁定（D14 白名單） |
| `directRendererAccess` | 5 | 5 | **1** | **-80%** | 唯一保留：`GameCanvas.tsx` 的組合根綁定（D14 白名單） |
| `directPoseWrites` | — | 12 | **6** | **-50%** | 唯一保留：`useGameInput.ts` 拖曳預覽暫態座標（D11 白名單） |
| `asAny` | 0 | 0 | **0** | **保持 0** | 核心與 UI 層嚴格保持型別安全 |
| `setIntervalCount` | 3 | 2 | **2** | **-33%** | 僅剩全域 FPS/診斷輪詢 |
| `tailwindPaletteClasses`| 427 | 378 | **369** | **-13.6%** | ToolWindow 與核心容器已改用語意 token（其餘留待後續批次） |
| `zIndexClasses` | 9 | 8 | **8** | **-11.1%** | 僅剩視窗內部局部元件層級（`z-0`, `z-10`, `z-20`） |

---

## 4. U11e 語意 Token 化進度與剩餘量說明

- **已完成**：
  - 核心基建：`data/ui/tokens.ts`、產生器 `tools/gen-ui-tokens.ts`、CSS 變數 `styles/tokens.css`、Tailwind 擴充 `tailwind.config.js`。
  - 第一批主要容器：`ToolWindow.tsx`、`WindowLayer.tsx`、全域 `index.css`（含 `liquid-*`、`--neon-*`、`--glass-*` 與 `[data-team]`）。
- **調色盤用量統計**：
  - 由起初 427 處降至目前 369 處（已移除 58 處硬編碼色值）。
  - 依計畫 §10 規劃，剩餘 369 處多屬於次級 Tab 內部小標籤與 Inspector 技能小晶片（`SkillCard` 等），不影響架構邊界，留待後續維護批次逐步置換。

---

## 5. U12 響應式與觸控 E2E 斷言清單

於 `tools/ui-e2e/windows.e2e.mjs` 中已實裝且全部通過之斷言：
1. **≤900px Bottom Sheet (U12a)**：
   - 窄螢幕下渲染為可見的視窗數量恰為 1（其餘背景開啟）。
   - 當前可見之最上層視窗為 `zoneSettings`。
   - 視窗寬度 100% 貼齊 Viewport（390px vs 390px）。
   - 視窗底邊完全貼齊 Viewport 底部（844px vs 844px）。
   - 視窗高度不超過 72vh（360px ≤ 609.68px）。
   - 禁用把手：視窗內 resize handles 元素數量為 0。
   - 禁用最大化：雙擊與最大化按鈕不渲染。
   - 恢復寬螢幕（1440px）：原先開啟的全部視窗自動恢復並回復桌面 rect。
2. **觸控命中區與動態 (U12b)**：
   - Coarse pointer 下收合按鈕尺寸 ≥ 44px（實測 44×44）。
   - Coarse pointer 下關閉按鈕尺寸 ≥ 44px（實測 44×44）。
   - Coarse pointer 下 SE 角把手尺寸 ≥ 44px（實測 88×88）。
   - Coarse pointer 下 S 邊把手高度 ≥ 44px（實測 44px）。
   - Bottom sheet 模式下關閉按鈕尺寸 ≥ 44px。
   - `prefers-reduced-motion` 媒體查詢下 `animationName === 'none'` 且 `transition === 'none'`。
3. **觸控捲動 (U12c)**：
   - Root 節點 `touch-action: auto`（已移除全域 `touch-none`）。
   - 主畫布 Canvas `touch-action: none`（確保遊戲操作不觸發頁面原生捲動）。
   - 視窗標題列 `touch-action: none`（確保拖曳平移流暢）。
   - 視窗內容區域 `touch-action: pan-x pan-y`（允許觸控滑動瀏覽長列表）。
   - 在視窗內模擬捲動手勢期間，Canvas 相機座標保持靜止（不位移）。

---

## 6. 建議使用者手動確認事項 (Human Verification Checklist)

1. **寬螢幕外觀一致性**：
   - 執行 `npm run dev`，開啟各視窗（Logs, SkillDB, Monitor, VFXMap 等），確認視覺效果與 Token 化前逐像素完全一致。
2. **行動裝置 / 窄螢幕模式 (Bottom Sheet)**：
   - 透過瀏覽器 F12 模擬手機尺寸（寬度 ≤ 900px），點擊選單開啟視窗，確認以底部抽屜彈出，一次僅顯示一個，點擊另一個選單項目自動切換。
3. **觸控操作手感 (實機或模擬器)**：
   - 觸摸把手拉伸視窗，點擊關閉按鈕，測試是否容易命中。
   - 於 SkillDB 視窗內上下滑動，確認能順暢滑動列表而不會誤拖動視窗本體或主畫布相機。
4. **編輯器流程完整性 (E8)**：
   - 塗刷新增單位、放置障礙物、拖曳單位到合法/非法格。
   - 滾輪縮放與滑鼠拖曳平移，感受 100+ FPS 之順暢感。
   - 點擊開始與暫停，確認 Showcase 模式可自動換場戰鬥。

---

## 7. 檢驗結果與 Tag Checkpoints

- **Typecheck & Lint**：`npm run lint` → 0 error
- **Unit Test Suite**：`npm test` → **16 files / 149 tests 全數通過**
- **Production Build**：`npm run build` → 打包成功無錯誤
- **E2E Automation**：`npm run e2e:ui` → **ALL PASSED (全綠通過)**
- **本地 Checkpoint Tags**：
  - `ui-ckpt-U6`
  - `ui-ckpt-S1`
  - `ui-ckpt-U11`
  - `ui-ckpt-U12`
  - `ui-ckpt-E8a` ~ `ui-ckpt-E8g`
  - `ui-ckpt-E8`
