# 0028 無畫面工具的佈陣一律經由 Deployment.ts

狀態：採用
日期：2026-11-27

## 背景

「換圖、取出生格、排陣營與職業、決定放置順序、放上戰場」除了 `engine/systems/match/Deployment.ts`（`planRoster`、`deployRoster`），五支無畫面工具還各有一份：`tools/balance/simFingerprint.ts`、`ai-idle-sim.mjs`、`batch-sim.mjs`、`mobility-probe.mjs`、`tools/replay/record-bench.mjs`。各份的排法和遊戲本身不同（例如交錯放置、各自的洗牌），所以工具量到的是遊戲不會產生的陣容；放置順序又會改變每個單位抽到的技能（`addAgent` 依序從全域 `random()` 抽）。開案書 `docs/plans/tool-deployment.md`（2026-11-24 Fable 撰寫，使用者 2026-11-26 同意動工含 P5）。

## 決定

- 「取出生格、排陣營與職業、決定放置順序、送 PLACE_AGENT」只定義在 `engine/systems/match/Deployment.ts`（`planRoster`、`deployRoster`）。
- 無畫面工具要一場佈陣完成的戰鬥，只能呼叫 `tools/sim/headlessBattle.ts` 的 `buildHeadlessBattle`；該檔只組合 `Deployment.ts` 的函式，不自己挑格子、不洗牌、不決定 team 與 side。
- 工具之間的差異只能是 `buildHeadlessBattle` 的參數：`setup`、`map`、`roleOf`、`mirrorSides`、`matchSalt`、`round`。需要新的差異時加參數，不在工具裡另寫佈陣。對戰規模只定義在 `simFingerprint.ts` 的 `SIM_SCENARIOS`，其他工具與測試讀它。
- 佈陣的亂數只用 `engine/math/rng.ts` 的序列。
- `tools/balance/`、`tools/replay/`、`tools/sim/`（除 `headlessBattle.ts` 外）不得直接送 `PLACE_AGENT`，也不得呼叫 `querySpawnableHexes`、`layoutFactionHexes`。`tools/ui-e2e/` 的探針為了擺出特定場面而指定格子放人（例如深度、粒子預算探針），不是「一場對局的佈陣」，不受此限。
- 指紋基準只在「佈陣定義改變」或「故意改玩法」時由主代理重錄；重錄的 commit 要寫明原因、各情境變動場數，以及 `engine/`、`data/`、`constants/` 是否有修改。

## 放棄的做法

- 各工具保留自己的佈陣、只加註解：工具繼續量遊戲不會產生的陣容，新工具也會再抄一份。
- 把入口放進 `engine/`：入口要 `new GameEngine`，模擬層不得反過來 import 組合根 `engine/game.ts`。
- 給 `deployRoster` 加工具專用參數：遊戲本身的佈陣會因工具需求長出分支。

## 後果

- 工具輸出在這一輪改變：同種子的 batch-sim、ai-idle、mobility、record-bench 數字和 2026-11-27 以前的紀錄不能直接比（`WORKLOG` 或設計文件引用的舊數字以 `31c74032` 為分界）。改前改後用合併種子的兩比例 z 檢定比對，ai-idle TEAMS 種子 1～9 各職業勝率 |z|≤0.75、swapSides 合計在雜訊內（開案書 §3.2(c)、文末）。
- 新工具排法和遊戲相同：左邊陣營一律先放，`--swapSides` 的差同時含站位與放置先後。
- 依賴特定種子湊站位的測試會在佈陣改變時失效；這一輪 `PlayerOrders`（縮圈）、`PlayerStance`（反擊）兩則改成明寫前提（`1bfa2e80`）。
- `tests/HeadlessBattle.test.ts` 掃 `tools/balance`、`tools/replay`、`tools/sim`，有直接佈陣就失敗。
- 回退順序：P3（`b50f01f4`）依賴 P2（`6d55d9b9`）與情境表收斂（`5ba85f97`），要先退後者之後的 commit；P4 可單獨退。P5 退回時程式與基準同一個 commit，不用 `--record` 回退。

## 證據

- 開案書 `docs/plans/tool-deployment.md`（含 P0 取證、§3.2(c) 判準、P5 停下紀錄）。
- commit：P0 `1e02cd6a`、P1 `7e7955e1`、P4 `f7b275d6`、P2 `6d55d9b9`、P3 `b50f01f4`、判準 `4ec72ed9`、情境表 `5ba85f97`、測試前提 `1bfa2e80`、P5 `31c74032`。
- 程式：`tools/sim/headlessBattle.ts`、`engine/systems/match/Deployment.ts`、`tools/balance/simFingerprint.ts`。
- 測試：`tests/HeadlessBattle.test.ts`、`npm run balance:fingerprint`（重錄後 180/180）。
