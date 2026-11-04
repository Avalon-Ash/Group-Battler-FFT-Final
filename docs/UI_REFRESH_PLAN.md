# UI 改版計劃（feat/ui-refresh）

> 建立：2026-11-04。做完就把紀錄寫進 `docs/WORKLOG.md` 並刪除本檔。定義的理由在 `docs/DECISIONS.md`。
> 長期目標：遊戲從模擬工具過渡到可玩、可編輯。這輪只把 UI 解耦並換裝，不做玩家操控。

## 定義（使用者逐題確認）
- UI 是純投影：元件只讀 selector 產的 view model、只發指令，領域判斷放 selector 或資料表。hover、開合、分頁這類純介面狀態留在元件。
- 依賴方向：`components` 只能碰 `hooks`、view 型別、`data/ui`；只有 `GameCanvas` 可碰 renderer。`data/ui` 不准 import `components`。
- 視窗版面與選取單位都在 UI 層 store，引擎不知道它們。選取存成集合，之後多選不用重改。
- 材質分級：HUD、選單、彈出層、聚焦視窗用真模糊；沒聚焦、最大化、手機底部面板用純色；內部元件不模糊。
- 層級：HUD < 一般視窗 < 選單 < 最大化視窗 < 全域提示 < 彈出層。Esc 還原最大化。
- 視窗、分頁、區塊標題用英文全大寫等寬（JetBrains Mono）；內文、技能名、日誌維持中文。
- 設計值走 token，className 不用任意值與調色盤 class。執行期算出來的值（如百分比寬度）不算魔法數字。
- 外部元件庫可以用，不重造輪子：Radix（互動元件）、lucide（圖示）、TanStack Virtual（長列表）、cva（樣式變體）、axe（無障礙檢查）。

## 分工與狀態

| 代號 | 內容 | 誰做 | 狀態 |
| :-- | :-- | :-- | :-- |
| M1 | 視窗層級、Esc 還原、遮擋 e2e | 主代理 | 做中 |
| M2 | token 三層、材質、字型、捲軸、焦點環、視窗外殼 | 主代理 | 待做 |
| M3 | `EnginePort`、指令分類、靜態稽核 `audit:ui` | 主代理 | 待做 |
| P | 元件庫與樣張頁 `?ui-gallery` | agy Sonnet | 待做 |
| V | 樣張截圖審查 | GPT，再給使用者看 | 待做 |
| M4 | 行為樹視窗、選取 store、`selectBehaviorTreeView` | 主代理 | 待做 |
| L1 | HUD：`PlaybackHUD`、`MapEditorToolbar`、`SystemMenu` | agy Flash | 待做 |
| L2 | 設定：`SchemaForm`、`AudioSettingsWindow`、`ShowcaseSettings`、`ShowcaseOverlay` | agy Flash | 待做 |
| L3 | 單位：`UnitInspectorBody`、`UnitStatusTab`、`DirectorMonitorHUD`、`TreeNode` | agy Sonnet | 等 M4 |
| L4 | 資料：`SkillDbTab`、`SkillNumberInput`、`LogTab`、`VFXMapTab`、`SkillIcon`、結算畫面 | agy Flash | 待做 |
| M5 | 倍率兩份狀態、手機 START 消失 | 主代理 | 待做 |
| M6 | 整合、全庫稽核歸零、樣式基準取證重錄 | 主代理 | 待做 |
| 實機 | 手機 FPS 與畫面 | 使用者 | 最後 |

每條線的完成條件是 `npm run audit:ui -- <線>` 退出碼 0。線之間檔案不重疊：selector 放 `engine/systems/ui/views/<線>.ts`，型別放 `types/ui/<線>.ts`，標籤放 `data/ui/labels/<線>.ts`。

## 額度停損
主代理週額度低於約 10% 就停在整合前，把狀態更新到本檔，等 11/08 21:00 刷新再收尾。

## 這輪不做（下一輪「可玩地基」）
指令佇列（tick 開頭處理）、Controller 抽象（AI 或玩家控制同一單位）、倍率改成跑多個固定步長、行為樹資料化與編輯器。
