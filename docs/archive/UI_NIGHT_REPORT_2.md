# UI 夜間執行報告 #2 (UI_NIGHT_REPORT_2)

> 執行時間：2026-10-10  
> 工作分支：`feat/ui-window`（純本地提交，未 push，未動 `main`）  
> 執行策略依據：`docs/UI_AGENT_PROMPT_2.md`、`docs/UI_WINDOW_PLAN.md`、`AGENTS.md`  
> 成果總結：完成清單內全部 9 項任務（`E4` → `U5` → `U7a` → `U7b` → `U8` → `E6` → `E7` → `U9` → `U10`）。所有任務均通過 `npm run lint`（0 error）、`npm test`（87/87 全綠）、`npm run build`（乾淨建置）以及無頭瀏覽器 `npm run e2e:ui`（7 大視窗幾何/拖曳/縮放/雙擊最大化/localStorage持久化/視口邊界限制/畫布穿透 100% ALL PASSED）。

---

## 1. 任務執行紀錄與 Commit 列表

| 任務 | Commit | 實作檔案 (≤3檔) | 驗證項目 | 重點與架構決策 |
| :--- | :--- | :--- | :--- | :--- |
| **E4** | `fa6b101` | `constants.ts`<br>`data/ui/settingsSchema.ts`<br>`components/ui/settings/SchemaForm.tsx` | lint: 0<br>test: 82/82<br>build: pass | 建立設定 SSOT `settingsSchema.ts` 與資料驅動 `SchemaForm`。解決 §10.2 F4 缺陷：相機 fallback 與 `SNAPSHOT_HZ` 統一引用 `UI_SETTINGS`。 |
| **U5** | `f25bd1f` | `DirectorMonitorHUD.tsx`<br>`windowRegistry.tsx`<br>`App.tsx` | lint: 0<br>test: 82/82<br>build: pass<br>e2e: monitor PASS | `DirectorMonitorHUD` 遷移至浮動視窗（id: `monitor`），改用 `useEngineView` 共用 ticker，徹底移除組件內部私有 `setInterval` 與自製拖曳。E9 baseline 下調（setIntervalCount 5 → 4）。 |
| **U7a** | `c03cc48` | `SystemMenu.tsx`<br>`windowRegistry.tsx`<br>`App.tsx` | lint: 0<br>test: 82/82<br>build: pass<br>e2e: 全數 PASS | `SystemMenu` 轉型為 ToolMenu，動態列出 `WINDOW_REGISTRY` 已註冊之視窗（含補足的 VFXMap 入口），並附帶青色開啟狀態指示點與「重設版面」動作。同步更新 e2e 測試 `openViaMenu` 支援 `data-testid` 開啟。 |
| **U7b** | `4d4b132` | `SettingsWindows.tsx`<br>`SystemMenu.tsx`<br>`windowRegistry.tsx` | lint: 0<br>test: 82/82<br>build: pass<br>e2e: 6視窗 PASS | 新增 `directorSettings` 與 `zoneSettings` 視窗，底層由 `SchemaForm` 與 `useEngineCommands` 驅動。徹底拔除 `SystemMenu` 內直接寫入引擎變數（`engine.* =`）與私有 modal 狀態。E9 baseline 大幅下調。 |
| **U8** | `7a2ed59` | `ShowcaseSettings.tsx`<br>`windowRegistry.tsx`<br>`App.tsx` | lint: 0<br>test: 82/82<br>build: pass<br>e2e: 7視窗 PASS | `ShowcaseSettings` 視窗化（id: `showcaseSettings`，設定 `visibleInShowcase: true`），Showcase 模式下仍可維持操作。刪除重複的 Camera/Zone JSX 並改用 `SchemaForm` 與 `UICommand`。E9 baseline 大幅下調。 |
| **E6** | `da1a0fb` | `UnitInspectorHUD.tsx`<br>`BehaviorTreeTab.tsx` | lint: 0<br>test: 84/84<br>build: pass<br>e2e: 7視窗 PASS | 嚴守「不做視窗化（U6 禁止）」紅線。將屬性修改全面改為 `EDIT_AGENT` 命令，行為樹重建改為 `REBUILD_AGENT_AI`，唯讀狀態走 `selectAgentView`。E9 baseline 下調（directAgentMutation 6 → 1）。 |
| **E7** | `ee2d6c9` | `selectors.ts`<br>`LogTab.tsx` | lint: 0<br>test: 85/85<br>build: pass<br>e2e: 7視窗 PASS | `LogTab` 遷移至 `selectLogView` / `selectLogs` 與 `useEngineView`。徹底消除私有 `setInterval` 輪詢與 `engine.logs` 直接取用。匯出 JSON 改走 selector 快照。E9 baseline 下調（setIntervalCount 4 → 3）。 |
| **U9** | `1c02278` | `useDraggable.ts`<br>`MapEditorToolbar.tsx`<br>`PlaybackHUD.tsx` | lint: 0<br>test: 87/87<br>build: pass<br>e2e: 7視窗 PASS | 釘選工具列增加 `storageKey`（`tactical_toolbar_map_editor` / `tactical_toolbar_playback`）位置持久化記憶，透過 `ResizeObserver` 實作顯示/縮放時邊界 clamp，強化 Pointer/觸控事件（`onPointerCancel` 容錯），依約「不加縮放」。 |
| **U10** | `fcc3e47` | `PlaybackHUD.tsx`<br>`MapEditorToolbar.tsx` | lint: 0<br>test: 87/87<br>build: pass<br>e2e: 7視窗 PASS | z-index 收斂：將具備 1:1 對應關係的 `z-40` 全面替換為 `style={{ ...style, zIndex: UI_Z.WINDOW_BASE }}`。舊代碼中無 1:1 對應的值依法跳過並記錄。 |

---

## 2. E9 邊界守門棘輪 (UIBoundary Ratchet) 變化前後

在各項任務推進過程中，我們持續嚴格遵守「只准減少、不准增加」的棘輪守則，即時下調 `tests/ui-boundary.baseline.json`：

| 指標名稱 | 初始基準 (Run #2 前) | 中途演進 | 最終基準 (Run #2 後) | 減少量 | 降幅 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `directEngineMutation` | **18** | 15 (U7b) → 8 (U8) | **8** | -10 | **-55.6%** |
| `directAgentMutation` | **6** | 1 (E6) | **1** | -5 | **-83.3%** |
| `directRendererAccess` | **19** | 12 (U7b) → 5 (U8) | **5** | -14 | **-73.7%** |
| `asAny` | **0** | 0 | **0** | 0 | 0% (保持零容忍) |
| `setIntervalCount` | **5** | 4 (U5) → 3 (E7) | **3** | -2 | **-40.0%** |
| `tailwindPaletteClasses` | **505** | 461 (U7b) → 427 (U8) | **427** | -78 | **-15.4%** |

> **說明**：
> - 殘留的 1 處 `directAgentMutation` 位於 `hooks/useGameInput.ts`，屬於高風險的 `E8`（編輯器輸入重構）範疇，依約保留至後續獨立子計畫。
> - 殘留的 3 處 `setInterval` 位於 `UnitInspectorHUD.tsx`（等候 U6 視窗化）、`useGameApp.ts`（等候 E8）、`useEngineView.ts`（SSOT 唯一共用 ticker 單例）。

---

## 3. U10 z-index 收斂分析與跳過項目說明

依照指令 25 號規定：`僅在舊值與 UI_Z 現有值能一對一對應時才換；對不上就跳過並寫入報告。`

現有 `constants.ts` 內 `UI_Z` 定義如下：
```ts
export const UI_Z = {
    WINDOW_BASE: 40,
    WINDOW_MAX: 80,
    TOP_OVERLAY: 90,
} as const;
```

### 成功收斂項目 (1:1 替換)
- `PlaybackHUD.tsx`：舊值 `z-40` ➜ 1:1 映射為 `style={{ ...style, zIndex: UI_Z.WINDOW_BASE }}`（數值皆為 40）。
- `MapEditorToolbar.tsx`：舊值 `z-40` ➜ 1:1 映射為 `style={{ ...style, zIndex: UI_Z.WINDOW_BASE }}`（數值皆為 40）。

### 跳過項目與原因記錄
1. `components/ui/UnitInspectorHUD.tsx` (`z-30`)：
   - 原因：`UI_Z` 目前無對應之 30 階層。且 UnitInspectorHUD 尚未視窗化（等待 U6），一旦在 U6 轉為浮動視窗後，其層級將自動由 `WindowStore` 的動態 `zCounter` (40~80) 自動管理，不宜在此硬塞魔術數字。
2. `App.tsx` (`z-50`, 陣營警示條 `state.showFactionWarning`)：
   - 原因：舊值為 50，介於視窗動態堆疊 (40~80) 之間。若強行換成 `UI_Z.TOP_OVERLAY` (90) 會改變視覺層次覆蓋關係；若換成 `WINDOW_BASE` (40) 則可能被高層視窗遮蔽。無 1:1 對應值，故跳過。
3. `components/ui/showcase/ShowcaseOverlay.tsx` (`z-50`)：
   - 原因：同上，全螢幕後製渲染畫布舊值為 50，無 1:1 對應值，保留原狀。
4. `components/GameCanvas.tsx` (`z-50`, 結算勝利彈窗)：
   - 原因：同上，勝負結算彈窗舊值為 50，無 1:1 對應值，保留原狀。

---

## 4. 嚴格迴避的排除項目（保持未動工）

依照指示第 8 點與全域守則，本次**絕對未碰觸**下列項目：
1. **`U6` (UnitInspectorHUD 視窗化)**：保持原佈局與 DOM 結構，僅在 `E6` 內部抽換寫入/讀取邏輯。
2. **`E8` (編輯器輸入命令化)**：未修改 `useGameInput.ts` 與 `GameCanvas.tsx` 之直接輸入路徑。
3. **`U11` ~ `U13`**：Token 轉換、行動端響應式等後續階段均未提前實作。
4. **Git 操作**：未執行任何 `git push`，未切換或合併至 `main` 分支。

---

## 5. 使用者回來後建議操作與驗證指引

1. **查閱 Git 歷史**：
   ```bash
   git log feat/ui-window --oneline -n 12
   ```
2. **啟動本機預覽**：
   ```bash
   npm run dev
   ```
3. **建議手動驗證流程**：
   - **☰ 系統選單 (ToolMenu)**：
     - 點擊左上角漢堡按鈕，確認列出所有 7 個已註冊視窗（Logs、SkillDB、VFXMap、Monitor、導演設定、區域設定、展示模式設定）。
     - 觀察視窗開啟時右側對應之青色指示亮點。
     - 點擊選單外部區域，確認可正常收合。
     - 測試「重設版面」動作，確認視窗位置與尺寸可一鍵還原預設值。
   - **浮動工具視窗**：
     - 打開「導演設定」與「區域設定」視窗，操作 Slider 與 Toggle，確認數值即時變更且不再觸發直接變數賦值。
     - 切換至 Showcase 模式，開啟「Showcase Settings」視窗，驗證在展示模式下浮動視窗正常互動。
     - 拖曳、8向縮放、雙擊標題列最大化、縮回、重整頁面確認 localStorage 記憶。
   - **釘選工具列**：
     - 拖曳底部播放器（PlaybackHUD）與地圖編輯器工具列（MapEditorToolbar）至新位置，重整瀏覽器確認位置記憶正常，並在縮放視窗時驗證邊界自動限制（clamp）。
   - **單位檢查器 (UnitInspectorHUD)**：
     - 選取戰場單位，開啟檢查器齒輪設定，修改職業/HP/MP，確認透過 `UICommandSystem` 正確更新；切換至 AI 分頁確認行為樹即時串流正常。
