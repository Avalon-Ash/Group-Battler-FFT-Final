# 執行指令：奧義詠唱逐步扣魔（K2，ADR 0026）

> 派工：主代理用 agy 派（agent-prompt skill）；備援是使用者在 IDE 輸入 `/goal <本檔路徑>`。
> 背景：ADR 0026 讓玩家可以取消任何前搖（K1 已合併）。為了不讓奧義「起手→取消」變成免費的假動作，使用者定案奧義（tag `ULT`）改成詠唱中逐步扣魔，所有單位（含 AI）都適用。本包只做逐步扣魔；指紋基準重錄與平衡量測由主代理做。輸入層（K3）在另一條分支，不碰。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_k1_orders`（分支 `feat/k2-ult-drain`，主代理已建好並提交了紅色驗收）。

### 0. 開工前（INV）
- **讀檔一律用內建檔案工具，不用終端機指令。**
- 先讀：`AGENTS.md`（全部）、`docs/adr/0026-player-order-interrupt-and-ult-mana-drain.md`、`tests/UltManaDrain.test.ts`（你的驗收）、`engine/systems/combat/SkillStateMachine.ts`、`engine/systems/combat/CastingEngine.ts` 全檔，`engine/systems/combat/CombatSystem.ts` 的 `initiateCast` 與 `completeCast`。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告：
  - `npm run lint`（預期綠）
  - `npm test`（**預期只有 `tests/UltManaDrain.test.ts` 的 5 則失敗**：「前搖中每 tick 依經過時間扣魔」「前搖中 mp 已低於 cost…」「自己取消…」「被打斷…」「實戰（AI…）」；其他全綠。不是這樣就停下回報）
  - `npm run build`、`npm run knip`
  - `npm run balance:fingerprint`（預期 PASS，這是改前基準）
- **只能跑這些指令**：`git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`git log --oneline -10`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`npm run balance:fingerprint`、`node tools/ui-e2e/runtime-smoke.mjs`、`npx vitest run tests/UltManaDrain.test.ts`、`npx vitest run tests/SkillStateMachine.test.ts`、`npx vitest run tests/CastingDeathInterruption.test.ts`、`npx vitest run tests/PlayerOrderInterrupt.test.ts`、`npx vitest run tests/PlayerOrders.test.ts`。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 一次性的探針一律寫在 `tools/ui-e2e/out/`（不進版控）。
- 必要的驗證沒完成，該任務就標「未完成」。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/adr/**`、`docs/plans/**`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/check-bundle-budget.mjs`、`tools/balance/**`（含 `fingerprint.baseline.json`）、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json`、`tests/**`（全部測試檔，含你的驗收）。**指紋基準不准 `--record`，保真基準不准重錄。**
- 不要 commit、不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，主代理 11-25 讀碼，「目前」的狀態）
- `engine/systems/combat/SkillStateMachine.ts`：
  - 43～52 行 `resourceBlock`：前搖中的那一招（`castingSkillIdx === idx`）只跳過冷卻檢查，**50 行的魔力檢查照樣做**。逐步扣魔後第一個 tick 就 `mp < cost`，`activationBlock`（64 行）會回 `MANA`。它在前搖中每次決策都被問：`CombatSystem.initiateCast`（`CombatSystem.ts` 47 行，回 FAILURE）、`BTRegistry` 的 `SkillReady`（`engine/ai/BTRegistry.ts` 266 行），`playerCastRefusal`（58 行）也會讓 HUD 鈕變暗。
  - 80～85 行 `beginWindup`：時長 `Math.max(skill.cast, CAST_RULES.MIN_CAST_DURATION)`（`constants/combat.ts` 264 行，0.016）。
  - 88～92 行 `advanceWindup(a, dt)`：`castTimer -= dt`，最後一個 tick `castTimer` 會變成負的（過衝）。
  - 95～103 行 `commitSkill`：96 行 `a.mp = Math.min(a.maxMp, Math.max(0, a.mp - skill.cost + skill.gain))`（一次扣整招）。
  - 125～130 行 `cancelWindup`：註解寫「不扣魔」（K1 的玩家取消）。
- `engine/systems/combat/CastingEngine.ts`：20 行 `updateCasting` 先查控制（被控就 `handleInterruption`），47 行呼叫 `advanceWindup`，走完呼叫 `onComplete`（`CombatSystem.completeCast` → `commitSkill`，`CombatSystem.ts` 142 行）。53 行 `handleInterruption`：陣亡或被控時結束前搖，不扣魔。
- `castTimer` 只有三個寫入處：`SkillStateMachine.ts` 83、89、118 行（另有 `engine/core/AgentLifecycle.ts` 47 行重設）。`mp` 的寫入不只這裡（回魔、燃魔等效果），但扣技能消耗只在 `commitSkill`。
- 另外三處 `a.mp >= s.cost`（`BTRegistry.ts` 386、1007 行，`engine/ai/TargetingSystem.ts` 166 行）是 AI 看「別的招能不能放」，是既有的重複判斷：**這包不動，在報告裡列出即可**。

### 2. 目標與規則（DOM）
- 驗收：`tests/UltManaDrain.test.ts` 10 則全綠；其他測試全綠；lint、build、knip 綠；`node tools/ui-e2e/runtime-smoke.mjs` 綠。
- **`npm run balance:fingerprint` 改後一定會退出碼 1**（奧義被打斷會損失魔力，AI 模擬會變）：這是預期，**不算失敗、不准 `--record`、不要為了讓它過而改程式**。把每個情境「幾場相同／幾場不同」照抄進報告。場上沒有玩家單位時，除了奧義扣魔的時間點，不應有其他行為差異；如果你懷疑某個差異不是扣魔造成的，寫進報告。
- 規則（ADR 0026）：
  1. 奧義（`skill.tag === 'ULT'`）在前搖中逐步扣魔：每 tick 扣 `cost × (這一 tick 實際走掉的前搖時間) ÷ 時長`。「實際走掉的時間」＝ `min(dt, 推進前的 castTimer)`，最後一 tick 不過衝，總扣量剛好等於 `cost`。時長和 `beginWindup` 用同一個算式：把它抽成一個具名函式，兩處共用，不要各寫一次 `Math.max(...)`。
  2. 扣到 0 為止（`mp` 不小於 0），詠唱照常完成，不新增失敗狀態。
  3. 完成時（`commitSkill`）奧義不再扣整招，只加 `gain`（照舊受 `maxMp` 上限），照舊進冷卻。非奧義技能完全照舊。
  4. 自己取消（`cancelWindup`）或被打斷（`handleInterruption`）：已扣的不退。更新 `cancelWindup` 的註解，讓它說的和行為一致。
  5. 前搖中的那一招如果是逐步扣魔的招，`resourceBlock` 不再檢查魔力（開始詠唱前仍要 `mp ≥ cost`）。非奧義技能的這個判斷照舊，避免改到不相干的 AI 行為。
- **「這招是不是逐步扣魔」只判斷一處**：寫一個具名函式（例如 `drainsManaDuringWindup(skill)`），`advanceWindup`、`commitSkill`、`resourceBlock` 都呼叫它，不在三處各寫 `tag === 'ULT'`。
- **不新增 `Agent` 欄位**：每 tick 的扣量用推進前的 `castTimer` 和時長就算得出來，不需要另存「已扣多少」。如果你認為非加不可，停下回報理由，不要加。
- 更新 `SkillStateMachine.ts` 的方框檔頭：「扣魔進冷卻」那句要改成反映奧義逐步扣魔。
- 不可以改：平衡數值（`data/**` 的 cost、gain、cast）、AI 模式圖、行為樹節點、HUD。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| K2-0 | 開工前檢查（§0） | 指令＋退出碼 |
| K2-1 | 規則 1～3：前搖中扣魔、完成時不重複扣、時長函式共用、判斷函式 | `npx vitest run tests/UltManaDrain.test.ts`：前兩則「曲線」「完成」與「mp 多於 cost」綠 |
| K2-2 | 規則 4～5：取消與打斷不退、前搖中不算魔力不足、註解與檔頭 | `npx vitest run tests/UltManaDrain.test.ts` 10 則全綠 |
| K2-3 | 全部閘門：`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run balance:fingerprint`（預期退出碼 1，照抄每個情境的相同／不同場數） | 指令＋退出碼 |
| REPORT | `docs/K2_ULT_DRAIN_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的指令＋退出碼、指紋改前改後、§1 那三處 `a.mp >= s.cost` 的位置、沒做到的事與原因、回退指南。只寫數字與指令輸出，不寫效果形容詞；每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證） | — |

### 4. 守則與停下條件（INV）
- 除了 `tests/UltManaDrain.test.ts`，有任何既有測試因為這次改動失敗 → 不要改那個測試，停下回報哪一則、斷言什麼、你認為它和 ADR 0026 是否矛盾。
- 發現某則驗收在你看來和 ADR 0026 矛盾 → 停下回報，不改驗收。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。
- **驗證不准動**：現有測試、驗收、斷言強度一律不改；不准 mock 被驗證的對象；不准用空的 `catch`。同一個驗收失敗兩次就停下回報。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、重錄指紋基準（commit 寫明原因）、跑兩個種子的 `balance:sim` 比較勝率，再問你要不要合併。
2. 實機要看：PLAY 放奧義時魔力條是不是在詠唱中慢慢減少；奧義放一半取消，魔力不會回來。
