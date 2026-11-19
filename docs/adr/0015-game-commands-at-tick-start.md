# 0015 戰鬥中遊戲指令於下一個 tick 開頭套用並記錄

狀態：採用
日期：2026-11-09

## 背景

過去 UI 送出的遊戲指令於收到當下立即修改引擎狀態，指令執行時間點未對齊模擬 tick 編號，造成即使使用相同亂數種子與操作序列也無法決定性地重播出同一場戰鬥。

## 決定

- 戰鬥進行中收到的 `GameCommand` 先排入 `engine/core/CommandQueue.ts`，於下一個 `engine/game.ts` `tick` 開頭由 `UICommandSystem.flushQueued()` 依序套用，並連同 `state.time.tick` 記進指令紀錄。
- 畫面指令（`VIEW_COMMAND_TYPES`）立即套用且不寫入紀錄；例外為 `STOP_GAME`（先套用排在前面的佇列指令以保持順序）、`SET_TIME_SCALE`、`SET_BATTLE_SETUP` 與 `SET_SHOWCASE_MODE`，此四者在戰鬥中也立即套用。
- 尚未開戰時（tick 0 且未運行），所有指令一律立即套用。

## 放棄的做法

原紀錄沒有寫。

## 後果

- 同一份種子加指令紀錄可重播出逐 tick 相同的戰鬥（`tests/CommandQueue.test.ts` 驗證 600 tick，含戰中 `EDIT_AGENT` 與 `SET_OBSTACLE`），構成回放與 undo 的基礎。
- 戰鬥中送出 `GameCommand` 後不可在當下立即讀取變更後的模擬狀態，必須等下一個 tick 套用；換場流程先送 `STOP_GAME`，因此不受延後影響。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §1 第 5 點
- `engine/core/CommandQueue.ts`、`engine/systems/ui/UICommandSystem.ts`、`engine/game.ts`
- `tests/CommandQueue.test.ts`
- `docs/WORKLOG.md` §2 BU
