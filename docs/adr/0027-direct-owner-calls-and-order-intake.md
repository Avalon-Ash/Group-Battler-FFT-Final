# 0027 改狀態直接呼叫擁有者的 API、匯流排只通知；指令套用點在模擬層

狀態：採用
日期：2026-11-26

## 背景

合約寫「系統之間只透過 `engine.bus` 溝通、不直接呼叫別的系統」，但 ADR 0019 為了回放快轉把匯流排靜音（只放行 `UI_COMMAND`），並禁止模擬層監聽匯流排；ADR 0002 規定跨域修改要經擁有者匯出的寫入 API。程式實際上也是直接呼叫：行為樹與 `CCManager` 呼叫 `engine.combat.breakCast`，多個系統呼叫 `stopMovement`。2026-11-25 K1～K4 終審指出玩家指令的套用（取消前搖、停步、解除換路節流、寫入指令）寫在 `UICommandSystem` 的私有方法裡、直接呼叫戰鬥與移動系統：照合約字面是違規，照 ADR 0022 則是職責放錯（該檔只該驗證），而且之後 AI 要下同一種指令時沒有入口。研究與選項在 `docs/plans/play-order-decoupling.md`。

## 決定

- 模擬層的系統要改別的系統擁有的狀態時，直接呼叫該欄位擁有者開的 API（擁有者依 `engine/core/AgentOwnership.ts`）；不直接寫別人的欄位。
- `engine.bus` 只用來通知：訂閱者是表現層、音訊、UI 與組合層。模擬層不訂閱匯流排（`UI_COMMAND` 除外），沿用 ADR 0019 的規則與 `tests/SimBusListeners.test.ts`。
- 指令的套用點是 `engine/systems/orders/OrderIntake.ts` 的 `applyOrder(engine, agent, order)`：依 `engine/core/Orders.ts` 的 `orderInterrupts` 呼叫各擁有者（`CombatSystem.cancelCast`、`MotionCommands.stopMovement`、`MovementSystem.allowImmediateRepath`），再經 `Orders.ts` 寫入或清掉指令。它不擁有任何欄位，也不驗證指令。
- `UICommandSystem` 對 `ORDER_*` 只驗證（是不是玩家單位、目標合不合法、冷卻與魔力拒收），通過後呼叫 `applyOrder`。ADR 0022 的三個落點與 ADR 0026 的打斷規則不變。
- 合約裡「系統之間只透過 `engine.bus`」那一句改寫成上面兩條。

## 放棄的做法

- 套用改發匯流排事件、由戰鬥與移動系統各自訂閱：要推翻 ADR 0019，回放快轉時事件被靜音，打斷會漏掉；先後順序也改由訂閱順序決定。
- 在 `Agent` 上掛「待取消前搖」旗標、由擁有者下次更新時消化：取消會從 tick 開頭延到戰鬥更新，和 ADR 0026「打斷發生在套用指令的那一個 tick」不同，還要多一個欄位。
- 維持現狀只補註解：職責放錯與合約字面的矛盾都留著。

## 後果

- `applyOrder` 的內容是原 `applyPlayerOrder` 原樣搬移，行為不變：`balance:fingerprint` 180／180，固定種子加 `ORDER_*` 腳本的逐 tick 狀態比對相同。
- 打斷規則目前只給玩家指令用（唯一呼叫者已驗證是玩家單位）。讓 AI 單位經 `applyOrder` 下令會改變純 AI 模擬與指紋，要另外決定。
- 審查清單不再把「直接呼叫別的系統」當違規；要查的是「有沒有繞過擁有者直接寫欄位」與「模擬層有沒有訂閱匯流排」。

## 證據

- `docs/plans/play-order-decoupling.md`
- ADR 0002、0019、0021、0022、0026
- `engine/systems/orders/OrderIntake.ts`、`engine/systems/ui/UICommandSystem.ts`、`engine/core/Orders.ts`
- `engine/core/Replay.ts`、`tests/SimBusListeners.test.ts`、`tests/AgentOwnership.test.ts`
- `engine/ai/BTRegistry.ts`、`engine/systems/combat/CCManager.ts`、`engine/systems/movement/MotionCommands.ts`
