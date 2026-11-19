# 0016 固定步長模擬與倍率控制

狀態：採用
日期：2026-11-09

## 背景

L3 以前每個模擬 tick 的 `dt` 隨畫面幀間隔與時間倍率浮動，使同一場戰鬥在不同顯示更新率或不同倍率下產生不同計算結果，無法支持決定性回放；此外平衡工具曾寫死 1/30 秒步長，與實機模擬不一致。

## 決定

- 每個模擬 tick 的 `dt` 固定為 1/60 秒（`GAME_LOOP_PARAM.SIM_HZ`，單一步進常數 `SIM_STEP_S` 位於 `engine/core/Replay.ts`）。
- 時間倍率只決定每幀跑幾個固定步長 tick（`engine/core/FixedStep.ts`），每幀上限為 15 個（`MAX_TICKS_PER_FRAME`），超過的積欠時間直接丟棄（掉幀時遊戲變慢、不追趕）。
- 模擬系統不得讀取 `timeScale` 改變模擬結果；S1 起平衡工具預設步長亦對齊 1/60 秒（`tests/BalanceToolStep.test.ts`）。

## 放棄的做法

原紀錄沒有寫。

## 後果

- 1 倍速與 5 倍速跑出的模擬結果完全相同（`tests/CommandQueue.test.ts` 驗證），且平衡工具量測的是玩家實際遊玩的模擬步長。
- 5 倍速時每幀需執行 5 個 tick，CPU 成本隨倍率線性增加；高刷新率螢幕（120／239 Hz）與掉幀時的畫面平滑須由渲染層插值（R1）補足。

## 證據

- `docs/DECISIONS.md`「UI」
- `AGENTS.md` §1 第 5 點
- `engine/core/FixedStep.ts`、`engine/core/Replay.ts`、`hooks/useGameLoop.ts`
- `tests/CommandQueue.test.ts`、`tests/BalanceToolStep.test.ts`
- `docs/WORKLOG.md` §2 BU、§2 BW
