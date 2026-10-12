# U6 子計畫：`UnitInspectorHUD` → 視窗 `inspector`（**已核准 2026-10-10**）

> 計畫 §4 規定 U6（最大元件、264→290 行）動工前要先回報分段方案。本文件即該方案。**使用者已核准下列 5 項決定（全部採建議值），代理可依「分段」動工；執行順序見文末。**
> 現況：E6 已把寫入改為 `EDIT_AGENT`/`REBUILD_AGENT_AI`；T1e 的 e2e 已能「點 canvas 選單位 → 改職業/maxHp → 斷言引擎」，可直接當回歸防線。

## 現況盤點

- `App.tsx:67`：`!hideHUD && state.selectedAgent` 時渲染 `<UnitInspectorHUD agent engine onClose>`（自己是 `useDraggable` 釘選在右下、寬度 `320/420px` 寫死、有「最小化藥丸」`isMinimized`、`viewMode: NONE|AI|SKILLS` 決定寬度、`setInterval(100ms)` 自己刷新）。
- `data/ui/windows.ts` 已有 `inspector` 定義（`defaultRect {24,80,340,520}`、`minSize {300,240}`、`visibleInShowcase:false`），`WINDOW_REGISTRY` 尚未註冊。
- 子元件：`UnitStatusTab`、`BehaviorTreeTab`（BT 圖，含 `z-[9999]`）。

## 已核准的決定（D6–D10，使用者 2026-10-10 全部採用建議值）

1. **D6 預設位置**：沿用視窗預設 `{24,80,340,520}`，使用者拖動後依 D5 記住（原本右下釘選不再保留）。
2. **D7 最小化藥丸**：改為視窗既有的「收合（只留標題列）」，不另做藥丸。
3. **D8 ☰ 選單列出 Inspector**：列出；無選取單位時視窗內顯示「請先選取單位」空狀態（不自動消失）。
4. **D9 關閉 ✕**：關閉視窗＝取消選取（`onClose` 行為不變）；在畫布選到別的單位時視窗自動開啟、保留上次 rect。
5. **D10 `viewMode` 寬度切換（320↔420）**：移除，由使用者拉視窗大小；視窗內用分頁（狀態 / AI / 技能）。

## 分段（每段 ≤3 檔、各自 commit、各自驗證）

| 段 | 內容 | 檔案 | 驗證 |
| :-- | :-- | :-- | :-- |
| **U6a** | 新增 `UnitInspectorBody.tsx`：純內容（身分列、設定抽屜、分頁、狀態條），props 只收 `engine`、`agentId`；資料用 `useEngineView(engine, (e) => selectAgentView(e, agentId))`，**不含** `useDraggable`、藥丸、`setInterval`、寬度寫死。尚未接畫面（舊 HUD 仍運作）。 | 新增 `components/ui/inspector/UnitInspectorBody.tsx`（必要時抽 `InspectorHeader.tsx`） | lint/test/build；單元測試（selector 穩定性已有）；舊畫面 e2e 不變 |
| **U6b** | `windowRegistry` 註冊 `inspector`（`flush`）；render ctx 增加 `selectedAgentId`；`App.tsx`：`selectedAgent` 變動 → `open/close('inspector')`（保留 rect，D5）；移除 `<UnitInspectorHUD>` 渲染；視窗 ✕ → `setSelectedAgent(null)`。 | `windowRegistry.tsx`、`App.tsx`、（必要時 `useGameApp.ts`） | lint/test/build + **e2e**：把 `inspector` 加進 SUITES（用 canvas 點擊 + `__TACTICAL_ENGINE__` 開啟，通用 12 項全過）；T1e 套件仍通過；選另一個單位視窗 rect 不變；Showcase/結算時隱藏 |
| **U6c** | 刪除舊 `UnitInspectorHUD.tsx`；`BehaviorTreeTab` 的 `z-[9999]` 改為視窗內局部層（不得高於 `UI_Z` 視窗層以免蓋住選單）；E9 `setInterval` 計數下調；若 `BehaviorTreeTab`/`UnitStatusTab` 內有自己的輪詢也改 `useEngineView`。 | `UnitInspectorHUD.tsx`（刪）、`BehaviorTreeTab.tsx`、`ui-boundary.baseline.json` | lint/test/build/e2e（含 ☰ 選單蓋在 inspector 之上） |

## 風險與防護

- 畫布點擊選取與視窗的事件穿透：視窗是 Canvas 的 DOM 兄弟，已有 `WindowLayer` 穿透；e2e 檢查「視窗外點擊仍可選取/取消選取」。
- 取消選取 ↔ 關閉視窗互相觸發造成迴圈：用 id 比對（只在狀態真的不同時才呼叫），單元/e2e 各測一次。
- `useEngineView` 對「單位死亡/移除」的 selector 要回 `null`，視窗顯示空狀態而非丟例外。
- 回滾：U6a 不接畫面；U6b 單獨 commit，出問題可 `git revert` 單一 commit。

## 執行順序

在 `docs/UI_AGENT_PROMPT_4.md` 中排在 `R8`/`REPORT3` 之後、`S1`（視覺回歸護欄）之前：這樣 S1 的 style baseline 會包含新的 Inspector 視窗外觀，後續 U11 Token 化才能逐像素比對。
