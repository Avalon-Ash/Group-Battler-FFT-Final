# 執行指令：玩家指令打斷規則（K1，ADR 0026）

> 派工：主代理用 agy 派（agent-prompt skill）；備援是使用者在 IDE 輸入 `/goal <本檔路徑>`。
> 背景：PLAY 試玩「控制不貼手」。主代理實測（`docs/plans/control-feel.md` §2）：主角閒著時指令 1～3 tick 生效；普攻前搖中下移動要等前搖走完（中位數 0.48 秒）；走路中改目的地要等 0.25 秒；冷卻中、魔力不足、射程 0 技能身邊沒敵人時，施放指令讓主角原地乾等。規則已由使用者定案（`docs/adr/0026-player-order-interrupt-and-ult-mana-drain.md`）。本包只做 ADR 0026 的前四點（打斷、換路、拒收＋HUD 提示、自身技直接放）；奧義逐步扣魔是 K2，輸入層是 K3／K4，都不做。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_k1_orders`（分支 `feat/k1-orders`，主代理已建好並提交了紅色驗收）。

### 0. 開工前（INV）
- **讀檔一律用內建檔案工具，不用終端機指令。**
- 先讀：`AGENTS.md`（全部）、`docs/adr/0026-player-order-interrupt-and-ult-mana-drain.md`、`docs/adr/0022-player-control-mode-graph-and-orders.md`、`docs/adr/0012-skill-action-pipeline-flat-agent.md`、`tests/PlayerOrderInterrupt.test.ts`（你的驗收），以及 §1 列的每個檔案的方框檔頭。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告：`npm run lint`、`npm test`（預期只有 `tests/PlayerOrderInterrupt.test.ts` 的 7 則失敗，其他全綠；不是這樣就停下回報）、`npm run build`、`npm run knip`、`npm run balance:fingerprint`（記下結果，這是改前基準）。
- **只能跑這些指令**：`git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`git log --oneline -10`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`npm run balance:fingerprint`、`node tools/ui-e2e/runtime-smoke.mjs`、`npx vitest run tests/PlayerOrderInterrupt.test.ts`、`npx vitest run tests/PlayerOrders.test.ts`、`npx vitest run tests/contracts/G3.contract.test.ts`、`npx vitest run tests/TapIntent.test.ts`。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 一次性的探針一律寫在 `tools/ui-e2e/out/`（不進版控）。
- 必要的驗證沒完成，該任務就標「未完成」。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/adr/**`、`docs/plans/**`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json`、`tests/PlayerOrderInterrupt.test.ts`、`tests/PlayerOrders.test.ts`、`tests/contracts/**`。**保真基準與指紋基準一律不得重錄。**
- 不要 commit、不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，主代理 11-25 讀碼，「目前」的狀態）
- 指令驗證：`engine/systems/ui/UICommandSystem.ts` 約 525～542 行 `ORDER_CAST`（目前不看冷卻與魔力）；544～551 行 `ORDER_STOP`（`clearOrder`，只在沒前搖時停移動）。`ORDER_MOVE`／`ORDER_ATTACK` 在同檔附近。驗證與套用都在 tick 開頭（ADR 0015）。
- `Agent.order` 唯一寫入處：`engine/core/Orders.ts`（`issueOrder`、`clearOrder`、`onSkillReleased`）。
- 執行節點：`engine/ai/BTRegistry.ts` 約 497 行 `OrderMove`（511 行「正在前搖：放完再走」）、523 行 `OrderAttack`（533 行「別的招正在前搖：放完再說」）、541 行 `OrderCast`（552 行同上；570 行沒指定目標時走 `FindOptimalTarget`，射程 0 的招身邊沒敵人就 `standBy`）；`castIfAble` 約 420 行、`standBy` 約 437 行。
- 換路間隔：`engine/systems/movement/MovementSystem.ts` 106～136 行：移動中目的地變了，`battleTime < a.nextRepathAt` 時沿舊路走；139 行設 `a.nextRepathAt = battleTime + PATH_RULES.REPATH_MIN_S`（`constants/ai.ts` 95 行，0.25）。`nextRepathAt` 的擁有者登記在 `engine/core/AgentOwnership.ts` 78 行。
- 前搖狀態機：`engine/systems/combat/SkillStateMachine.ts`：`SKILL_PHASE_EDGES`（24～32 行，目前沒有「取消」這條邊）、`activationBlock`（42 行，回傳 `COOLDOWN`、`MANA` 等原因；HUD 檢視 `engine/systems/ui/views/play.ts` 85 行已讀它）、`commitSkill`（扣魔在前搖走完才發生）、86～93 行的中斷鎖定 `_interruptCooldown`。
- 打斷路徑：`engine/systems/combat/CombatSystem.ts` 82 行 `breakCast` → `engine/systems/combat/CastingEngine.ts` 53 行 `handleInterruption`：會呼叫 `applyInterruptPenalty`（設 `_interruptCooldown`）並發 `CAST_BREAK` 事件、寫「詠唱被打斷」紀錄。**玩家自己取消不是被打斷**：不能套懲罰、不設鎖定。
- 選目標方式：`engine/systems/ui/castTargeting.ts` 31 行 `targetModeOf`（SELF／UNIT／UNIT_OR_GROUND），是「這招怎麼選目標」的唯一判斷。HUD 對 SELF 的招送不帶目標的 `ORDER_CAST`（`components/ui/play/PlayHUD.tsx` 46～54 行 `pressSlot`）。
- HUD：`PlayHUD.pressSlot` 目前不看能不能放；技能鈕已有冷卻遮罩（`play-slot-cooldown`）。文字表在 `data/ui/labels/play.ts`（`PLAY_TEXT`）。UI 規則照 `AGENTS.md` 的 UI 章節（不寫魔術數字、樣式用 token、`audit:ui` 規則）。

### 2. 目標與規則（DOM）
- 驗收：`tests/PlayerOrderInterrupt.test.ts` 7 則全綠；其他測試全綠；`npm run balance:fingerprint` 與改前完全相同（場上沒有玩家單位，AI 行為不得改變）。
- 規則（ADR 0026）：
  1. **新的玩家指令取消自己的前搖**：`ORDER_MOVE`、`ORDER_ATTACK`、`ORDER_CAST`、`ORDER_STOP` 套用成功時，若該單位在前搖中就取消。例外：新指令會延續同一個前搖時不取消（`ORDER_CAST` 同一槽同一目標；`ORDER_ATTACK` 同一目標而正在放普攻）。取消不進冷卻、不設中斷鎖定、不扣魔、不寫「被打斷」紀錄。被拒收的指令不取消任何東西。
  2. **玩家移動指令立即換路**：新的移動指令（或玩家指令導致的目的地改變）不受 `REPATH_MIN_S` 限制。AI 的換路行為不變。
  3. **冷卻中、魔力不足的 `ORDER_CAST` 在驗證時拒收**（判斷讀 `activationBlock` 的 `COOLDOWN`、`MANA`，不另寫一份）。HUD：該技能鈕依同一個檢視欄位變暗；按下（含快捷鍵）不送指令，在瞄準提示的位置短暫顯示原因（文字放 `PLAY_TEXT`，顯示時長做成具名常數）。
  4. **選目標方式為 SELF 的招，玩家下令（不帶目標）就直接放**，不經 `FindOptimalTarget`。SELF 的判斷不得另寫一份：BT 需要時把 `targetModeOf` 搬到 `engine/core/SkillQueries.ts` 並讓 `castTargeting` 讀它。
- 「指令能打斷什麼」寫在一處（一個函式或一張表），`UICommandSystem`、`BTRegistry`、`MovementSystem` 不各判一次。取消前搖要走前搖狀態機（例如 `SKILL_PHASE_EDGES` 加一條取消的邊，由施法域的函式執行），不要在 UI 或 BT 直接改 `castingSkillIdx`。新增或改動欄位寫入者時同步 `AgentOwnership.ts`。
- 不可以改：AI 模式圖（`data/ai_profiles.ts` 的 `AI_MODE_GRAPH`）、AI 節點的既有行為、平衡數值。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| K1-0 | 開工前檢查（§0） | 指令＋退出碼 |
| K1-1 | 規則 1：玩家指令取消前搖（含 `ORDER_STOP`） | `npx vitest run tests/PlayerOrderInterrupt.test.ts` 前三則綠 |
| K1-2 | 規則 2：玩家移動立即換路 | 第四則綠 |
| K1-3 | 規則 3：拒收＋HUD 變暗與提示 | 第五、六則綠；`npm run build` |
| K1-4 | 規則 4：SELF 招直接放 | 第七則綠 |
| K1-5 | 全部閘門：`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`npm run balance:fingerprint`（和改前相同）、`node tools/ui-e2e/runtime-smoke.mjs` | 指令＋退出碼 |
| REPORT | `docs/K1_ORDERS_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的指令＋退出碼、指紋改前改後、沒做到的事與原因、回退指南。只寫數字與指令輸出，不寫效果形容詞；每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證） | — |

### 4. 守則與停下條件（INV）
- 指紋和改前不同 → 不要嘗試調整，停下回報差在哪裡。
- 發現某則驗收在你看來和 ADR 0026 矛盾 → 停下回報，不改驗收。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網（例如看門狗、逾時自動清指令）。
- **驗證不准動**：現有測試、驗收、斷言強度一律不改；不准 mock 被驗證的對象；不准用空的 `catch`。同一個驗收失敗兩次就停下回報。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、跑 PLAY e2e 與實跑，代為 commit，再問你要不要合併。
2. 實機要看：反擊中點地面是否立刻轉身走；冷卻中、沒魔力時按技能鈕的提示看不看得懂。
