# 0018 回放以開戰快照、種子與戰中指令為單位

狀態：採用
日期：2026-11-17

## 背景

佈陣階段混有 UI 端抽號（地圖大小、佈局、出生格洗牌）、手動拖曳與地圖編輯器操作，且舊版 `RESET_GAME` 會呼叫 `MapGenerator.rebuild` 重新抽亂數；探針實測 5 顆種子重開後地形高度與障礙物 5／5 不同、4／5 有單位站在障礙物上。

## 決定

- `START_GAME` 於 tick 0 透過 `engine/core/MatchSnapshot.ts`（`captureMatch`）擷取純資料開戰快照 `MatchSnapshot`（`types/Match.ts`）並重新播種模擬亂數（tick > 0 時為暫停後繼續，不重擷取）。
- 回放、重開（`RESET_GAME`）與 undo 一律透過 `restoreMatch` 從開戰快照還原，只重播開戰後的指令紀錄，不重播佈陣指令、不重新生成地圖。
- UI 佈陣端亂數移往 `engine/math/rng.ts` 的獨立序列 `setupRandom`，由 `tests/RngSplit.test.ts` 禁止 `hooks/` 與 `components/` 匯入模擬流。

## 放棄的做法

- 開局種子化後逐指令重播佈陣階段（要求 UI 與引擎兩端抽號順序永久一致，任一方多抽一次即造成整串亂數位移）。
- 重開戰局時重新執行 `MapGenerator.rebuild`。

## 後果

- S2 契約 13 則與 TEAMS、ROYALE、SQUADS 三模式 600 tick 重播比對完全相同，並直接附帶「存檔與分享佈陣」能力。
- 開戰快照必須涵蓋全部會影響模擬的開戰前狀態（出廠技能副本、每引擎一份的 `matchSalt`、開戰前指令與實體計數器）。

## 證據

- `docs/DECISIONS.md`「UI」
- `docs/plans/optimization-2026-11.md`「契約」、§1 第 2 點、§4 S2
- `types/Match.ts`、`engine/core/MatchSnapshot.ts`、`engine/math/rng.ts`
- `tests/contracts/S2.contract.test.ts`、`tests/RngSplit.test.ts`
- `docs/WORKLOG.md` §2 BW
