# 0025 PLAY 模式與瞄準放慢的倍率擁有者

狀態：採用
日期：2026-11-23

## 背景

G3 第一片（ADR 0022）讓玩家在手動模式的 Inspector 接手一個單位，點地面移動、點敵人攻擊。使用者 11-20 試玩後說手動模式是工作平台式的介面，要改成主動式的遊戲 UI。11-23 使用者定了前提：一隻主角、桌機優先、獨立的 PLAY 模式、技能按鈕＋點目標、即時進行但選目標時自動放慢。

時間倍率 `state.time.targetTimeScale` 已經有三個寫入處：`UICommandSystem`（`SET_TIME_SCALE`）、`VictorySystem`（結算慢動作與還原）、`engine/game.ts`（兩個重設）。瞄準放慢若也寫它，會和玩家選的倍率、結算慢動作互相覆蓋。

## 決定

- PLAY 是獨立的應用模式（`AppMode` 的 `'PLAY'`）：流程由 `MatchFlowSystem` 的一個分支負責（選主角 → 佈陣 → 開戰 → 結算 → 再來一場），佈陣用 `engine/systems/match/Deployment.ts`，不另寫一份。手動模式維持編輯用途。
- 瞄準放慢是另一個倍率因子 `state.time.aimFactor`，唯一寫入者是 `UICommandSystem` 的 `SET_AIM_SLOWMO`（畫面指令，不進紀錄）。每幀跑幾個固定步長 tick 用 `timeScale × aimFactor` 計算。`targetTimeScale` 的三個既有寫入者不動，也不新增寫入者。
- 「哪個技能正在選目標」是 UI 狀態，只存在 React 端；引擎只收到最後的 `ORDER_CAST`。可選目標的判斷是 `engine/systems/ui/` 的一個純函式，HUD 與戰場高亮共用。
- PLAY 模式不提供 undo；undo 留在手動模式與回放。

## 放棄的做法

- 在手動模式裡接手後換一套操作介面：工具視窗與遊戲 HUD 混在同一個模式，`WindowDef.modes` 分不開。
- 瞄準時送 `SET_TIME_SCALE`：會蓋掉玩家選的倍率與結算慢動作，取消瞄準時也不知道該還原成多少。
- 整場放慢：會改變一場的時長與平衡量測的意義。

## 後果

- 模擬一律固定步長（ADR 0016），放慢只改每幀跑幾個 tick，回放、指紋不受影響。
- 時間倍率的寫入者仍有三處（既有耦合，本決策沒有處理），之後要收斂另行提案。
- PLAY 的 UI 放延遲載入的 chunk，進入點的 bundle 預算不變。

## 證據

- `docs/plans/play-mode.md`
- ADR 0016、0021、0022
- `engine/systems/VictorySystem.ts`、`engine/systems/ui/UICommandSystem.ts`
