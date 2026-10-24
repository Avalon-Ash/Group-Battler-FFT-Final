# A3-F01 實作事實報告

開工 SHA：`092c997fe4d4b87afdd913706f7a4b875c6da8a3`（包含基底 `8967054` 祖先，工作目錄乾淨無外部追蹤修改）。

## 1. 實際改動（五檔授權範圍）

- `engine/systems/combat/CastingEngine.ts`：於死亡分支（`hp <= 0`）補齊合法詠唱技能判定（非 BASIC、`cast > 0`），透過 `EventPool.get` 派發帶有當前進度與 AOE hexes 的 `CAST_BREAK` 事件，最後執行 `resetCaster`；不變更 lockout、CD 懲罰或 log；補充檔頭責任與上下游註解。
- `engine/events/GameEventPool.ts`：`get()` 補進 `event.hexes = opts.hexes` 參照賦值；`release()` 補進 `event.hexes = undefined` 參照清理；補充檔頭責任與上下游註解。
- `tests/CastingDeathInterruption.test.ts`：新增 6 項回歸測試，覆蓋死亡中斷、AOE hexes 保留、重複調用保護、冷卻與鎖定維持、無效條件不發送、SINGLE hexes undefined 與存活中斷對照。
- `tests/Core.test.ts`：於 GameEventPool 測試區新增 hexes 回歸測試，以 try/finally 驗證取得保留與釋放清理。
- `docs/PROJECT_CLEANUP_F01_REPORT.md`：本報告。

## 2. 四案 Before / After 原始數據

| 案例 | hadCastBreak | queueAtDeath | actionsDispatchedAfterDeath | damageDealt | defectObserved | 狀態 |
| --- | --- | --- | --- | --- | --- | --- |
| C1_run1 (before) | false | 5 | 5 | 0 | true | OBSERVED |
| C1_run1 (after) | true | 0 | 0 | 0 | false | NOT_REPRODUCED |
| C1_run2 (before) | false | 5 | 5 | 0 | true | OBSERVED |
| C1_run2 (after) | true | 0 | 0 | 0 | false | NOT_REPRODUCED |
| C2_run1 (before) | false | 5 | 5 | 0 | true | OBSERVED |
| C2_run1 (after) | true | 0 | 0 | 0 | false | NOT_REPRODUCED |
| C2_run2 (before) | false | 5 | 5 | 0 | true | OBSERVED |
| C2_run2 (after) | true | 0 | 0 | 0 | false | NOT_REPRODUCED |

## 3. 對照組行為驗證

- `F01_A_normal_completion`：completedSuccessfully=true，damageDealt=548。
- `F01_B_stun_interruption`：queueCleanedByBreak=true，damageDealt=0。
- `F01_E1_ai_rebuild_during_cast`：queueRemained=true（對照行為維持）。
- `F01_E2_game_reset_during_cast`：queueCleared=true。
- `F01_D_projectile_in_flight`：projectileHitOccurred=true，damageDealt=102。
- `F02`（AOE/SINGLE 鎖定）與 `F03`（API/UI 邊界）：維持既有 OBSERVED。

## 4. 驗證命令與日誌

- `f01-before`：EXIT=0，`tools/ui-e2e/out/agent-logs/f01-before.log`
- `f01-red`：EXIT=1（產品修復前預期失敗 4 項，回歸證明），`tools/ui-e2e/out/agent-logs/f01-red.log`
- `f01-lint`：EXIT=0（tsc --noEmit 零錯誤），`tools/ui-e2e/out/agent-logs/f01-lint.log`
- `f01-test`：EXIT=0（90 檔 / 714 項全數通過），`tools/ui-e2e/out/agent-logs/f01-test.log`
- `f01-build`：EXIT=0（303 modules 成功），`tools/ui-e2e/out/agent-logs/f01-build.log`
- `f01-after`：EXIT=0（13 案全部完成），`tools/ui-e2e/out/agent-logs/f01-after.log`
- `f01-smoke`：EXIT=0（battleTime 0.52 -> 4.57s，零錯誤），`tools/ui-e2e/out/agent-logs/f01-smoke.log`
- `f01-guard`：EXIT=0（保真與效能門檻全數通過），`tools/ui-e2e/out/agent-logs/f01-guard.log`

固定檢查命令執行結果：`F01_FIXED_AND_CONTROLS_PRESERVED`（EXIT=0，嚴格 node 斷言通過）。

## 5. 未完成項目與回退

- 未完成項目：F01 實作已完成；F02、F03、COORD01 及全庫清單留待後續專屬輪次，本輪未越權修復。
- 回退方式：`git revert <commit-sha>` 即可乾淨復原。
