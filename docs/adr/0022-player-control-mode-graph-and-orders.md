# 0022 玩家操控以模式圖切換與固定指令落點實作

狀態：採用
日期：2026-11-18

## 背景

為支援即時＋可暫停下令的玩家單位操控，須讓單一或部分單位能接收移動、攻擊、施放與停止指令並納入指令佇列與回放紀錄，同時保證純 AI 模擬結果不受任何影響且不複製 AI 決策程式碼。

## 決定

- 單位的 `controller`（`types/Orders.ts`）決定切換使用 `AI_MODE_GRAPH` 或 `PLAYER_MODE_GRAPH`（`data/ai_profiles.ts`），外部仍統一呼叫 `a.bt.tick(a)`；沒有指令時原地堅守，嘲諷優先蓋過指令與堅守。
- `SET_CONTROLLER` 與 `ORDER_*` 皆為 `GameCommand`，並固定三個實作落點：① `engine/systems/ui/UICommandSystem.ts` 只驗證合法性；② `Agent.order` 只由 `engine/core/Orders.ts` 寫入；③ `engine/ai/BTRegistry.ts` 的執行節點（`OrderMove`、`OrderAttack`、`OrderCast`）直接呼叫既有 AI 節點，不複製選招、射程與追擊邏輯。
- 施放指令在 `commitSkill` 才算完成（被打斷、冷卻中或魔力不足時保留重試）；有指令的單位每個 tick 都決策（`engine/game.ts`）；開戰前下的指令存入開戰快照；點擊轉意圖規則單一集中於 `engine/systems/ui/tapIntent.ts`，輸入層只送出結果。

## 放棄的做法

- 在玩家指令節點中複製一套獨立的戰鬥、射程或施放決策程式碼。
- 在各輸入層元件分散編寫點擊選取／移動／攻擊的判斷邏輯；手機端採用拖曳框選。

## 後果

- 指令自動進入佇列與紀錄、支援回放與 undo；場上無玩家單位時 `balance:fingerprint` 180／180 完全相同；由 `tests/contracts/G3.contract.test.ts`、`tests/PlayerOrders.test.ts` 與 `tests/TapIntent.test.ts` 守門。
- 堅守單位在射程外受遠程攻擊不會反擊且不會自動躲避即將塌陷地塊；戰鬥中才切換為玩家操控的單位在 `RESET_GAME` 還原開戰快照時會變回 AI。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §1 第 5 點
- `docs/plans/optimization-2026-11.md`「契約」、§4 G3
- `types/Orders.ts`、`data/ai_profiles.ts`、`engine/core/Orders.ts`、`engine/ai/BTRegistry.ts`
- `engine/systems/ui/UICommandSystem.ts`、`engine/systems/ui/tapIntent.ts`、`engine/game.ts`
- `tests/contracts/G3.contract.test.ts`、`tests/PlayerOrders.test.ts`、`tests/TapIntent.test.ts`
- `docs/WORKLOG.md` §2 CC
