# 0019 Undo 採從開戰快照重跑、不存中途快照

狀態：採用
日期：2026-11-17

## 背景

契約 S3 須實作回放跳轉（`seekTo`）與復原最後一筆操作（`undoLastCommand`）；由於 `Agent` 有數十個運行期模擬欄位與計時器，須決定倒退時間點應透過保存中途快照或從頭重跑實現。

## 決定

- `engine/core/Replay.ts` 的 `seekTo(tick)` 與 `undoLastCommand` 一律以 `restoreMatch` 還原開戰快照，再呼叫固定步長快轉重跑至目標 tick（undo 為重跑至最後一個非中性指令的前一個 tick 並將其從紀錄移除）。
- 快轉期間將 `engine/events/EventBus.ts` 設為靜音（僅放行 `UI_COMMAND`），並於 `GameEngine` 跳過表現層視覺事件處理、音訊 cue 與導播更新；快轉結束後呼叫一次 renderer `resync()` 清除暫態特效與序列。

## 放棄的做法

- 定期儲存或逐幀保存中途狀態快照。
- 實作 `Agent` 與各系統全部運行期狀態的序列化與反序列化。

## 後果

- 實測無畫面模擬約 1.9 萬 tick／秒，平均一場（約 1,150 tick）重跑約 60 毫秒、兩分鐘長局約 0.4 秒，無須維護運行期快照序列化與記憶體開銷。
- 模擬層禁止監聽會被快轉靜音的事件（由 `tests/SimBusListeners.test.ts` 把守）；此外因模擬流為模組層單一狀態，同一行程內兩顆引擎不可交錯步進。

## 證據

- `docs/DECISIONS.md`「UI」
- `docs/plans/optimization-2026-11.md` §0、§1 第 5 點、§4 S3
- `engine/core/Replay.ts`、`engine/events/EventBus.ts`
- `tests/contracts/S3.contract.test.ts`、`tests/Replay.test.ts`、`tests/SimBusListeners.test.ts`
- `docs/WORKLOG.md` §2 BX
