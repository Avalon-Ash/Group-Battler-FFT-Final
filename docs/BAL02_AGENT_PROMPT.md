# 執行指令：平衡重跑（BAL-02）

> 用法：在 IDE 代理對話輸入 `/goal docs/BAL02_AGENT_PROMPT.md`。
> 背景：上一輪平衡（BL，2026-10-20）後，2026-10-25～26 合併了三項玩法改動：奧義有效詠唱下限 1.5 秒、天降類奧義詠唱結束就必中、12 招普攻／主動技的雷射改成真投射物（tr_a5 改近身命中爆發）。主代理 2026-10-26 在 `main`（2e665b2）跑標準量測：
> - **一般站位藍方勝率 44.0%（±3.1%），交換站位 47.4%（±3.1%），合併 45.7%（±2.2%）**；上一輪合併時是 48.4%／51.7%／50.0%，藍方掉了約 4 個百分點。
> - 對戰時間 p50 17.4 秒（p10 12.1、p90 28.7）。
> - picks ≥ 300 且勝率差超過 ±0.08 的技能 1 招：`tr_b2` 血腥肉鉤 +0.092（紅坦普攻，目前 power 40、cd 1.4、range 1）。
> - 同職業每場傷害（藍／紅）：坦克 480／503、戰士 1006／999、遊俠 1292／1172。
> **本輪只調數值，不改機制。** 不碰渲染。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`tools/balance/batch-sim.mjs`、`tools/balance/report.mjs`、`data/skills/*`、`data/vfx/ult_visuals.ts`（只看 `ultImpactDelay` 與 archetype 欄位）、`engine/systems/combat/CombatSystem.ts`（天降延遲結算）、`engine/systems/combat/SkillExecutor.ts`、`engine/systems/combat/ProjectileSystem.ts`、`data/ui/skillEditor.ts`（`normalizeSkillCast`）、`tests/SkillDataIntegrity.test.ts`、`docs/ULT_VISUAL_CLAUDE_REPORT.md` §5。
- 從 `main` 開分支 `feat/balance-02`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:fidelity`（記下各場景數值）、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`，以及下面的標準量測（要和背景的數字一致，±0.5% 內；不一致就停下回報）。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。只有 `STATE=DONE EXIT=0` 算通過；`TIMEOUT` 重跑一次，`LOST` 改前景補跑一次。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）；範圍外的錯誤立即停下回報。必要的驗證沒完成，該任務就標「未完成」，不得宣稱驗收通過。逾時參考：標準量測每次 120 秒（單次約 35 秒）、`perf:fidelity` 300 秒、`br-soak` 600 秒。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`engine/**`（全部引擎程式碼）、`data/vfx/**`、`constants/**`、`tools/balance/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向。**保真基準一律不得重錄**（`battle_frozen` 因戰鬥軌跡改變而失敗是預期的，見 §3 BAL3）。
- 不准 `push`、不准動 `main`、不准合併。

**標準量測（每個任務結束前都要跑，指令固定）**：
1. `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --out=tools/ui-e2e/out/balance_a.json`
2. `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --swapSides --out=tools/ui-e2e/out/balance_b.json`
3. `node tools/balance/report.mjs tools/ui-e2e/out/balance_a.json tools/ui-e2e/out/balance_b.json`（輸出 markdown，報告的驗收表就從這裡來）
調參期間可先用 `--battles=300` 快速試，但每個任務結束前必須跑標準量測。同參數兩次結果完全相同（決定性），不同就停下回報。

### 1. 已查證的事實（DOM，2026-10-26，`main` 2e665b2）
- **天降類奧義（9 招）**：`ultImpactDelay(id) > 0` 的 ULT＝`tb_u3`、`wb_u1`、`rb_u1`、`rb_u3`、`sb_u2`、`tr_u1`、`rr_u2`、`mr_u1`、`sr_u4`。傷害在「詠唱結束＋ultImpactDelay」結算；**詠唱結束後施法者被暈、被打斷或陣亡都照樣結算**，落點與目標在詠唱結束當下記下（`CombatSystem.ts` 的 `_deferredCasts`，DECISIONS §5 2026-10-26）。以前落下途中被打斷會取消傷害，所以這 9 招實際上變強了。
- **雷射改投射物（12 招）**：`rb_b3`、`mb_b2`、`mb_b5`、`sb_b1`、`sb_b3`、`sb_b5`、`mr_b2`、`sr_b1`、`sr_b4`、`tb_a4`、`mb_a2`、`sr_a1`，現在 `projectileSpeed` 950～2200，抵達才結算（多 0.1～0.3 秒）。投射物追蹤目標、不會打空；但目標在飛行中死亡就不結算。其中 9 招是藍方，藍方勝率下降很可能與此有關。
- **tr_a5 靈魂吞噬**：射程 1，維持瞬發，只改了外觀。
- **奧義詠唱下限**：ULT 的 `cast` 不得低於 `COMBAT_PARAM.ULT_MIN_CAST_SEC` = 1.5（`constants/combat.ts`），`normalizeSkillCast` 會把較短的值拉回 1.5；改 ULT 的 `cast` 只能 ≥ 1.5。
- **`docs/ULT_VISUAL_CLAUDE_REPORT.md` §5 的玩法缺口**（本輪只評估、不改機制）：
  - STORM 類 10 招：畫面上 8 段落點，傷害其實在詠唱結束時一次結算。
  - `mr_u3` 與 `sr_u3`：都是 BANISH，差在 mr_u3 有傷害。
  - `tb_u2`、`tb_u5`、`sb_u3`：都給全隊護盾。
  - `rb_u5`：同時有真投射物（2500）和 STORM 落點。

### 2. 目標與規則（DOM）
**驗收目標（標準量測，與上一輪相同）**
- 兩種站位的藍方勝率都落在 **46%～54%**，合併後 **47%～53%**。
- 抽到次數 ≥ 300 的技能，勝率差都在 **±0.08** 以內。
- 對戰時間中位數 **12～22 秒**（不要用「大家都變肉」或「大家都變脆」的方式達標）。
- 每場各職業傷害：同職業紅藍差距在 **±25%** 以內（輔助比治療量）。

**可以改的欄位**：`power`、`cd`、`cast`（ULT 只能 ≥ 1.5）、`cost`、`gain`、`range`、`aoeRadius`、`ccDur`、`ccForce`、`ccDur2`、`ccForce2`、`effectVal`、`effectVal2`、`projectileSpeed`（只限上面 12 招與原本就是投射物的技能，不得把 0 改成正值或把正值改成 0）。
**不可以改**：`type`、`ccType`／`effectType`（增刪效果）、`ccSelf`、`element`、`tag`、`role`、`team`、`id`、`name`、`visual*`；`data/units.ts`；任何引擎、特效、常數程式碼。
**幅度上限**：單一技能的 `power` 與 `cd` 相對改前各不超過 ±50%，`range` 不超過 ±2，`ccDur` 不超過 ±50%，`projectileSpeed` 不超過 ±50%。
**陣營特色要保留**：藍方＝護盾、控制、聖光；紅方＝持續傷害、吸血、自損換爆發。不要把紅方調成藍方的複製品。
**`desc` 一致**：數值改動若讓描述不再成立，一起修 `desc`；`tests/SkillDataIntegrity.test.ts` 必須照過。
**優先處理順序**：先看藍方下降是不是來自 12 招投射物（比較這些技能 picks 時的勝率差、每次施放傷害）與 9 招天降；能用這些技能本身的數值修回來，就不要動其他技能。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **BAL0** | 跑 §0 的基準與標準量測，產出 `docs/BAL02_BASELINE.md`：report.mjs 輸出＋你對「藍方為何掉 4 個百分點」的分析（12 招投射物、9 招天降各自的勝率差與每次施放傷害；`tr_b2` 為何偏強）。不改數值。 | 標準量測與背景數字一致（±0.5%） |
| **BAL1** | **陣營整體**：先處理上述兩組改動造成的落差，必要時再以職業×類別（BASIC／ACTIVE／ULT）微調。每批調整跑快速量測，記錄「改了什麼 → 勝率變多少」。結束前跑標準量測。 | lint／test／build；標準量測達第一項目標 |
| **BAL2** | **個別技能**：處理勝率差超過 ±0.08 的技能（先 `tr_b2`，再處理新出現的）。每批跑快速量測；結束前跑標準量測。 | 標準量測達全部目標；br-soak 10/10 |
| **BAL3** | **評估 §1 的玩法缺口**：只用允許欄位能做出差異的（例如全隊護盾三招以 `effectVal`／`ccDur`／`cd` 拉開定位、兩招 BANISH 以 `ccDur`／`power` 拉開）就做，並在報告說明定位；需要改機制的（STORM 分段結算、rb_u5 雙重表現）只寫建議，不改。結束前跑標準量測。 | 標準量測仍達全部目標；`perf:fidelity` 5 張地形與改前相同（`battle_frozen` 若失敗：**不得重錄**，報告寫改前／改後數值與 `tools/ui-e2e/out/fidelity/` 的差異圖路徑） |
| **REPORT** | `docs/BAL02_REPORT.md`：改前／改後標準量測表（report.mjs 輸出）、每個被改技能的 改前→改後 數值與理由（表格）、每批調整的勝率軌跡、§1 玩法缺口的處理與建議、沒達標的項目與原因、回退指南（每個任務的 commit）。 | — |

- 每個任務一個 commit；BAL1、BAL2 分多批時，每批一個 commit，訊息寫「改了哪些技能、快速量測勝率」。

### 4. 守則與停下條件（INV）
- 只改 §2 允許的欄位；超過幅度上限才能達標時：停下，把需要的改動與理由寫進報告，交給主代理決定。
- 調了 15 批仍達不到目標：停下回報目前最佳狀態與卡住的原因。
- 發現「看起來是 bug」的現象（例如某技能每場施放 0 次、投射物技能命中率異常低、天降技從不結算）：只記錄，不要修。
- `br-soak` 失敗：還原該批、找原因；兩次仍失敗就停下回報。
- 證據不支持改動時可以不改（例如某招偏離只出現在一種站位且在信賴區間內），在報告寫明理由。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「BAL-02 跑完了」，主代理會審查 `git diff main...feat/balance-02`、重跑標準量測、依取證流程重錄 `battle_frozen`，再問你要不要合併。
2. 實機看幾場展示戰鬥，確認兩邊沒有一面倒。
