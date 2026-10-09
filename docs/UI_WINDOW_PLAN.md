# UI 視窗系統修改計畫（參考 slot-llm-project）

> 對象：低階代理 / 後續執行者。**本文件僅為計畫，未經使用者核准 §6 的決策點前不得動工。**
> 參考專案（唯讀）：`C:\Git\slot-llm-project\prototype\cascade-testbed-v4\`
> 　`js/core/tool-window.js`、`js/editors/window-chrome.js`、`js/editors/tool-menu.js`、`css/tools.css`、`css/tokens.css`
> 治理規則：`AGENTS.md`（≤3 檔/任務、無 `as any`、無寫死顏色/魔術數字、不加 `console.log`、完成後 `npm run lint` + `npm test` + `npm run build`）。

---

## 0. 執行守則（與 `DECOUPLING_HANDOFF.md` §0 相同精神）

1. 一次只做一個任務（U#），做完驗證、勾進度表，才做下一個。
2. 每個任務 ≤3 個檔案（新增檔也算）。超過 → 停下來問。
3. **不改引擎**（`engine/**`）。本計畫只動 `components/`、`hooks/`、`App.tsx`、`styles/`、`constants.ts`、`types.ts`、`data/ui/`、`index.html`、`index.css`。
4. 不新增 npm 依賴（U14 除外且需明確核准）。不引入 UI 框架 / zustand / react-rnd。
5. 顏色、尺寸、z-index、時間常數 → `constants.ts`（`UI_WINDOW`、`UI_Z`）或 token，**不得在新元件內寫死**。
6. 每個任務完成都要手動瀏覽器驗證（見 §5 檢查清單對應項），並回報結果。
7. 遇到 §7「停下來問」條件 → 立即停止。

---

## 1. 現況痛點盤點

| # | 痛點 | 位置 / 證據 |
| :-- | :-- | :-- |
| P1 | **視窗只能拖不能縮放**；沒有最大化、沒有最小尺寸、沒有記憶位置/大小 | [useDraggable.ts](file:///c:/Git/Group-Battler-FFT-Final/hooks/useDraggable.ts) 僅 translate3d；固定 `w-64`/`320px/420px`/`300px` |
| P2 | **Logs / SkillDB / VFXMap 是全螢幕 backdrop modal**，一次只能一個、遮住戰場、點背景就關 | [ModalManager.tsx](file:///c:/Git/Group-Battler-FFT-Final/components/ui/ModalManager.tsx)（`h-[90%] max-w-6xl`） |
| P3 | ModalManager 標題 bug：同時開兩個旗標時標題會同時顯示多個、內容疊在一起 | ModalManager L35-37 / L46-48 |
| P4 | **沒有 z-order 管理**：z-30/40/50/55/60/70 散落各處，點擊視窗不會置頂 | `UnitInspectorHUD` z-30、`DirectorMonitorHUD` z-40、`ModalManager` z-50、`SystemMenu` z-[70] |
| P5 | **視窗開關狀態散在 `useGameApp` 的旗標**（`showLogs/showDB/showVFXMap/showDirectorMonitor/selectedAgent`），SystemMenu 內還有私有 `showDirectorModal/showZoneModal` | [App.tsx](file:///c:/Git/Group-Battler-FFT-Final/App.tsx)、[SystemMenu.tsx](file:///c:/Git/Group-Battler-FFT-Final/components/ui/SystemMenu.tsx) |
| P6 | 拖曳行為不一致：`UnitInspectorHUD` 只有 header 能拖；`DirectorMonitorHUD` **整個視窗**都是拖曳把手（內容無法選取/操作）；有「最小化成藥丸」的只有 Inspector | 各 HUD |
| P7 | 設定彈窗用 `absolute top-24 right-24` 寫死位置，會互相遮擋/跑出視窗 | SystemMenu Director/Zone popup、ShowcaseSettings |
| P8 | **重新整理後全部歸位**，使用者排好的版面無法保留；視窗被拖出畫面外後只有 resize 事件才拉回，且邊界是固定 margin | `useDraggable.clampToScreen` |
| P9 | 無響應式/觸控策略：根節點 `touch-none select-none`，小螢幕上視窗直接超出 | `App.tsx` 根 div |
| P10 | **樣式無 token**：Tailwind 走 CDN（`index.html`）、顏色寫死在 className（cyan/slate/red/amber…）、`liquid-*` 玻璃擬態類別各自為政 | `index.html`、`index.css`、各元件 |
| P11 | 輪詢更新（`setInterval 100ms`）在每個 HUD 內各自存在，視窗收合/隱藏時仍在跑 | `UnitInspectorHUD`、`DirectorMonitorHUD` |
| P12 | 工具列（MapEditor/Playback）可拖但位置不記憶，且與一般視窗是兩套行為 | `MapEditorToolbar`、`PlaybackHUD` |

---

## 2. 參考設計（slot-llm-project）要搬什麼

| slot-llm 機制 | 原始碼 | 本專案對應 |
| :-- | :-- | :-- |
| 視窗註冊表 `registerToolWin / open / close / toggle / front` | `tool-window.js` | `windowStore`（純 TS store）+ `windowRegistry` |
| 標題列拖曳（pointer capture、忽略按鈕/輸入、最大化時停用） | `tool-window.js` | `useWindowInteraction` |
| 縮放：原生 `resize: both`、`min-width:300 / min-height:160` | `tools.css` | **改用自訂 8 向把手**（原生 resize 僅右下角且 iOS Safari 不支援，本專案根節點又是 `touch-none`） |
| 雙擊標題最大化 + ▢ 按鈕；最大化填滿「狀態列下方工作區」並留 `--space-sm` 邊距 | `window-chrome.js` | `ToolWindow` 標題列 + `UI_WINDOW.MAXIMIZE_MARGIN` |
| 點視窗任何位置置頂（`is-front`） | `toolWinFront` | store 內 `zCounter` |
| **localStorage 持久化 `{x,y,w,h,max}`**（key `toolWindowsV1`），ResizeObserver 去抖 300ms | `tool-window.js` | key `tacticalWindowsV1`，儲存 `{x,y,w,h,max,open,collapsed}` |
| 還原時 clamp，保留 `WIN_KEEP_X=120 / WIN_KEEP_Y=80` 可見區，避免視窗「丟失」 | `tool-window.js` | `UI_WINDOW.KEEP_VISIBLE_X/Y` |
| 單一 ☰ 工具選單列出所有視窗、顯示開啟狀態、點外面關閉 | `tool-menu.js` | `SystemMenu` 改為 ToolMenu |
| `bus.emit('toolwin.change')` | `tool-window.js` | store `subscribe`（`useSyncExternalStore`） |
| 設計 token SSOT（顏色/間距/圓角/尺寸/陰影/動效/字級），元件只引用 token | `tokens.css`（由 `tools/design/gen-tokens.py` 產生） | `data/ui/tokens.ts` → 產生 `styles/tokens.css` |
| 響應式：≤900px 視窗變 bottom sheet（一次一個、禁拖/最大化）；`pointer:coarse` 44px；`prefers-reduced-motion` | `tools.css` | U12 |
| 晶片式狀態列 + FPS、`.win-tabs`、`.win-cmd` 命令列、`.info-tip`、`.ui-dialog` | `window-chrome.js`、`tools.css` | U13（選配） |

> 不搬：slot-llm 的 vanilla-DOM 實作方式、`resize: both`、以 CSS 檔為 SSOT（本專案 SSOT 規則是 TS：`constants.ts`/`types.ts`）。

---

## 3. 目標架構

```text
components/ui/window/
  windowStore.ts        # 純 TS：狀態、clamp、restore、persist（可 vitest）；無 React
  ToolWindow.tsx        # 視窗殼：標題列 / 8 向 resize / 最大化 / 收合 / 關閉 / 置頂
  WindowLayer.tsx       # 固定覆蓋層 pointer-events-none；依 store 渲染所有開啟的視窗
  windowRegistry.tsx    # id → { title, icon, defaultRect, minSize, render(ctx) }
hooks/
  useWindowInteraction.ts  # pointer 拖曳 / 縮放（取代 useDraggable 對視窗的用途）
  useWindowStore.ts        # useSyncExternalStore 薄封裝
constants.ts            # UI_WINDOW（尺寸、邊距、去抖）、UI_Z（層級表）
types.ts                # WindowId、WindowRect、WindowState、WindowDef
```

**行為規格（驗收依據）**

- 視窗是 `position: fixed` 的 DOM 元素，在 `WindowLayer`（`pointer-events-none`）內；視窗本身 `pointer-events-auto`，因此**視窗外的點擊仍穿透到 Canvas**。
- 拖曳：只有標題列；按鈕/輸入/select 不觸發；最大化時停用。
- 縮放：4 邊 + 4 角把手（各 ≥ `UI_WINDOW.HANDLE_PX`），受 `minW/minH` 與 viewport 限制；縮放中內容不重排卡頓（以 `will-change` 與 pointer capture 實作，不得每幀 setState 全樹，rect 用 ref + 直接寫 style，放開時才 commit 到 store）。
- 最大化：標題雙擊或 ▢ 按鈕；填滿 viewport 扣除 `UI_WINDOW.MAXIMIZE_MARGIN`；再按還原到原 rect。
- 收合（collapse）：只留標題列（取代 Inspector 的「藥丸最小化」）；收合時 HUD 輪詢暫停。
- 置頂：`pointerdown` 於視窗任何位置 → `zCounter++`；z 範圍落在 `UI_Z.WINDOW_BASE ~ UI_Z.WINDOW_MAX`，超過時整體重新編號。
- 持久化：`tacticalWindowsV1`；`JSON.parse` 失敗/欄位型別錯誤 → 丟棄並使用預設；還原時 clamp，使標題列至少 `KEEP_VISIBLE_X/Y` 在畫面內；viewport 改變時同樣 clamp（不改寫已存的 rect，僅顯示時 clamp）。
- 預設位置：由 registry `defaultRect`（可用 anchor）決定，第一次開啟才計算；多視窗開啟時階梯偏移 `UI_WINDOW.CASCADE_STEP`。
- 「重設版面」：ToolMenu 內一個動作，清除儲存並回預設。
- Showcase/結算畫面：`WindowLayer` 以 `hidden` 隱藏（保留狀態，不卸載引擎綁定之外的內容）。
- 可被引擎事件驅動的視窗（Inspector）：選取單位 → `openWindow('inspector')`；取消選取 → `closeWindow('inspector')`（保留 rect）。

---

## 4. 任務清單（風險由低到高；每項 ≤3 檔）

| # | 任務 | 檔案（≤3） | 風險 |
| :-- | :-- | :-- | :-- |
| **U1** | 常數與型別：`UI_WINDOW`、`UI_Z`、`WindowRect/WindowState/WindowDef/WindowId`；純函式 store（`clampRect`、`restoreState`、`serialize`、open/close/toggle/front/setRect/maximize/collapse，storage 以參數注入以利測試） | `constants.ts`、`types.ts`、新增 `components/ui/window/windowStore.ts` | 低 |
| **U1b** | `tests/WindowStore.test.ts`：clamp 保留可見區、損毀 JSON 回退預設、z 重新編號、max/還原、storage 不可用不丟例外 | 新增 `tests/WindowStore.test.ts` | 低 |
| **U2** | 視窗殼（先不接任何畫面）：`useWindowInteraction`（拖曳 + 8 向縮放 + 雙擊最大化）、`ToolWindow`、`WindowLayer`、`useWindowStore` | 新增 `hooks/useWindowInteraction.ts`、`components/ui/window/ToolWindow.tsx`、`components/ui/window/WindowLayer.tsx`（`useWindowStore` 併入 `windowStore.ts` 匯出的 hook 檔——若需第 4 檔 → 停下來問） | 中 |
| **U3** | **試點：Logs 視窗**。建立 `windowRegistry.tsx`（僅 `logs`），App 掛 `<WindowLayer>`；`showLogs` 旗標改由 store 驅動；ModalManager 暫時只處理 DB/VFX | `components/ui/window/windowRegistry.tsx`、`App.tsx`、`components/ui/ModalManager.tsx` | 中 |
| **U4** | SkillDB、VFXMap 改為視窗；**刪除 `ModalManager`**（一併消除 P3）；三個視窗可同時開 | `windowRegistry.tsx`、`App.tsx`、刪 `ModalManager.tsx` | 中 |
| **U5** | `DirectorMonitorHUD` → 視窗 `monitor`（移除整窗拖曳把手與寫死 `300px`；內容維持；可縮放時內容用 `min-w-0`/flex 自適應） | `DirectorMonitorHUD.tsx`、`windowRegistry.tsx`、`App.tsx` | 中 |
| **U6** | `UnitInspectorHUD` → 視窗 `inspector`（藥丸最小化改為 collapse；`viewMode` 320/420 寬度改為各自 `defaultRect`/`minSize`；內容區 `overflow-auto`；輪詢在 collapsed 時暫停） | `UnitInspectorHUD.tsx`、`windowRegistry.tsx`、`App.tsx` | **高**（最大元件 264 行，先停下回報再動工分段） |
| **U7a** | `SystemMenu` → ToolMenu（列出所有 registry 視窗 + 開啟狀態點 + 「重設版面」；點外面關閉） | `SystemMenu.tsx`、`windowRegistry.tsx`、`App.tsx` | 中 |
| **U7b** | SystemMenu 內 Director AI / Zone 設定兩個 `absolute` popup → 視窗 `directorSettings`、`zoneSettings`（新增兩個內容元件，邏輯照搬，不改行為） | 新增 `components/ui/settings/DirectorSettings.tsx`、`ZoneSettings.tsx`、`SystemMenu.tsx`（registry 需改 → 為第 4 檔，**先停下來問**或拆成 U7b-1/U7b-2） | 中 |
| **U8** | `ShowcaseSettings` 改視窗（Showcase 模式中保持可用，不被 `WindowLayer hidden` 隱藏 → registry 加 `visibleInShowcase`） | `ShowcaseSettings.tsx`、`windowRegistry.tsx`、`types.ts` | 中 |
| **U9** | 工具列（MapEditor / Playback）：維持 pill 外觀，但套用同一套 persistence + clamp（`useDraggable` 增加 `storageKey`；不加縮放） | `useDraggable.ts`、`MapEditorToolbar.tsx`、`PlaybackHUD.tsx` | 低 |
| **U10** | z-index 收斂：全專案 `z-30/40/50/55/60/70` → `UI_Z`（以 style 或 token class） | 逐檔分批，每批 ≤3 檔 | 低 |
| **U11** | **Token SSOT**：`data/ui/tokens.ts` → `tools/gen-ui-tokens.ts` 產生 `styles/tokens.css`；定義 color/space/radius/size/shadow/motion/type；`liquid-*` 改引用 token | 新增 `data/ui/tokens.ts`、`tools/gen-ui-tokens.ts`、`index.css` | 中 |
| **U11b…n** | 依元件批次去除 className 內寫死顏色（改用 token class / CSS var）；每批 ≤3 檔，**視覺需逐批比對** | 逐檔分批 | 中 |
| **U12** | 響應式/觸控：≤900px 視窗→bottom sheet（一次一個、禁拖/最大化/縮放、`max-height: min(72vh, …)`）；`pointer:coarse` 命中區 44px；`prefers-reduced-motion`；`touch-none` 僅保留在 Canvas 區 | `ToolWindow.tsx`、`App.tsx`、`index.css` | 高 |
| **U13** | 選配 chrome：`Tabs`、`CommandBar`、`InfoTip`、`Dialog`、頂部狀態列（FPS/時間/勝負晶片） | 另立計畫 | — |
| **U14** | 選配：移除 Tailwind CDN，改裝 `tailwindcss` + postcss（含 `tailwind.config` 映射 token）；`index.html` importmap 的 React 亦需評估 | **需使用者核准** | 高 |

### 4.1 進度表

| 任務 | 狀態 | 備註 |
| :-- | :-- | :-- |
| U1 | ☐ | |
| U1b | ☐ | |
| U2 | ☐ | |
| U3 | ☐ | 試點，完成後請使用者實測手感再繼續 |
| U4 | ☐ | |
| U5 | ☐ | |
| U6 | ☐ | 先回報分段方案 |
| U7a | ☐ | |
| U7b | ☐ | |
| U8 | ☐ | |
| U9 | ☐ | |
| U10 | ☐ | |
| U11 | ☐ | |
| U12 | ☐ | |
| U13 | ☐ | 另立計畫 |
| U14 | ☐ | 需核准 |

---

## 5. 驗證

### 5.1 自動
```bash
npm run lint    # 0 errors
npm test        # 含 U1b 新測試
npm run build
```

### 5.2 手動（`npm run dev`，每個接上視窗的任務都要跑）

- [ ] 標題列拖曳順暢；按下按鈕不會開始拖曳。
- [ ] 8 個方向都能縮放；縮到 `minW/minH` 停止；內容不溢出（內部捲動）。
- [ ] 雙擊標題 / ▢ 最大化，再按還原回原位原大小。
- [ ] 點擊視窗內任何位置會置頂；開啟新視窗在最上層。
- [ ] 重新整理後位置/大小/開關狀態保留；清除 localStorage 後回預設。
- [ ] 縮小瀏覽器視窗：視窗被拉回畫面（標題列仍可抓）。
- [ ] 視窗外點擊/拖曳 Canvas（選單位、放置、鏡頭）完全正常；視窗內操作不會誤觸 Canvas。
- [ ] Showcase 模式 / 結算時視窗隱藏，返回後恢復。
- [ ] 同時開 Logs + SkillDB + VFXMap + Inspector + Monitor 不互相擋住操作。
- [ ] 損毀的 localStorage（手動改成 `{`）不造成白屏。

---

## 6. 需使用者決策（動工前）

1. **哪些面板要做成自由視窗**：建議 Logs / SkillDB / VFXMap / Inspector / Monitor / Director 設定 / Zone 設定 / ShowcaseSettings 皆為視窗；**MapEditor / Playback 保持「釘選工具列」**（可拖、可記憶位置、不可縮放）。同意？
2. **視覺風格**：保留現有玻璃擬態（`liquid-*`），還是改採 slot-llm 的扁平深色 token 風格？（影響 U11 規模；建議先保留外觀、只把顏色抽成 token。）
3. **持久化範圍**：只存視窗 rect/開關，還是也存 Inspector 的 tab 狀態？（建議只存 rect/開關/收合。）
4. **行動裝置/觸控**是否為正式支援目標？（決定 U12 是否做、是否優先於 U11。）
5. 是否**移除 Tailwind CDN**（U14）？（CDN 需要連網且有 production 警告；但會牽動 importmap/React 的載入方式。）
6. Inspector 選取單位切換時：**沿用同一視窗位置**（建議）還是每次回預設位置？

---

## 7. 停下來問的條件

- 任務需要改 `engine/**`、`types.ts` 以外的 Facade（`engine/game.ts` 等）。
- 任務超過 3 檔，或需新增 npm 依賴。
- 視窗接上後 Canvas 的選取/放置/鏡頭操作出現任何回歸。
- `UnitInspectorHUD` 內容需要改動資料流（目前它直接讀 `agent` 並 `setVersion` 輪詢）；本計畫只換外殼，不改資料流。
- 縮放時出現明顯掉幀（需改為更保守的實作前先回報）。
- 需要改動 SystemMenu 內直接寫 `engine.zoneConfig` / `engine.director` / `renderer.camera` 的行為（屬 UI→引擎直接寫入，**另案處理**，本計畫保持原樣搬移）。

---

## 8. 不在範圍內（記錄備查）

- UI 元件直接 mutate 引擎狀態（`SystemMenu` 寫 `engine.zoneConfig`、`UnitInspectorHUD.setRole` 直接改 `agent.role`）→ 應改走 engine action/bus，屬 ECS 解耦後續。
- 各 HUD 內重複的 100ms 輪詢 → 可整合成單一 `useEngineSnapshot` hook，另案。
- Canvas 內繪製（Announcer/EventHUD）的顏色 SSOT → 見 `DECOUPLING_HANDOFF.md` T6.6。
