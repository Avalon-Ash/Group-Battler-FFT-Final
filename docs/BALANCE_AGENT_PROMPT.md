# 執行指令：技能平衡輪（BL）

> 用法：在 IDE 代理對話輸入 `/goal docs/BALANCE_AGENT_PROMPT.md`。
> 背景：技能正確性修正已合併（`docs/SKILL_FIX_REPORT.md`）。主代理 2026-10-20 寫了無畫面批次對戰工具 `tools/balance/batch-sim.mjs`（Node 直接 tick 引擎，1000 場約 25 秒，同種子結果完全相同），基準量測：
> - **藍方勝率 71.5%（±2.8%，1000 場）；交換左右站位後 73.8%** → 不是站位，是陣營強弱。
> - 每場各職業技能直接傷害（藍／紅）：坦克 486／322、戰士 1159／729、遊俠 1298／667、法師 1613／768、輔助 409／198（治療 698／353）。紅方全面約只有一半。
> - 原因是數值系統性偏低：紅方各類技能平均威力約為藍方的 75～80%（BASIC 48 vs 63、ACTIVE 106 vs 134、ULT 432 vs 567），射程較短（ACTIVE 3.6 vs 4.4、ULT 3.2 vs 4.9），範圍技較少。
> - 量測盲點：持續傷害（DOT）、危害區、反傷、吸血回復不經過 `resolveHit`，沒有計入；紅方較依賴 DOT。
> **本輪只調數值，不改機制。**

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前
- 先讀：`AGENTS.md`（全部）、`tools/balance/batch-sim.mjs`（全部）、`data/skills/*`、`data/units.ts`、`engine/systems/combat/SkillExecutor.ts`、`engine/systems/combat/DamageCalculator.ts`、`engine/systems/status/EffectSystem.ts`、`engine/systems/combat/CCManager.ts`、`tests/SkillDataIntegrity.test.ts`、`docs/SKILL_FIX_REPORT.md`。
- 從 `main` 開分支 `feat/balance`；`git status` 必須乾淨。先跑一次並記進報告（不綠就停下回報）：`npm run lint`、`npx vitest run --dir tests`、`npm run build`、`npm run perf:fidelity`（記下各場景數值）、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`engine/renderers/RenderSpec.ts`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

### 1. 量測工具補強（BL0，先做完才開始調數值）
1. **DOT 歸屬**：`CCManager` 套用 DOT 時把施法者 id 寫進 `effects.DOT.sourceId`（槽位已有此欄位，只是 DOT 沒填；這是資料欄位，不改任何行為）。`batch-sim` 包住 `EffectSystem.prototype.update`（或等效入口）量每幀 DOT 扣血，依 `sourceId` 與 `tag` 歸到施放該 DOT 的技能（同一單位身上的 DOT 是哪個技能施放的：在 `CCManager` 套用 DOT 的同一處，batch-sim 以包住 `CCManager.applyCC` 的方式記下「目標 id → 技能 id」）。
2. **其他未歸屬傷害**：每場記錄雙方「總失血」（所有來源），報告列出 已歸屬（技能直接＋DOT）／未歸屬（危害、縮圈、墜落、反傷…）的比例。
3. **吸血／反傷**：在 `resolveHit` 包裝裡同時量 `source` 的血量變化，吸血回復歸到該技能的 `heal`、反傷造成的自損另列 `reflected`。
4. **報告產生器** `tools/balance/report.mjs`：讀一或多個 `balance*.json`，輸出 markdown：陣營勝率（含 95% 信賴區間，兩種站位分列與合併）、對戰時間 p10／p50／p90、各職業每場 傷害／治療（分陣營）、技能表（picks、勝率差＝該技能被抽到時所屬陣營勝率 − 該陣營整體勝率、每場施放次數、每場傷害、每次施放傷害、治療），以勝率差排序。
5. `package.json` 加 `"balance:sim": "node tools/balance/batch-sim.mjs"`、`"balance:report": "node tools/balance/report.mjs"`。
6. 驗證：同參數跑兩次結果完全相同；BL0 不改任何技能數值，`batch-sim` 的勝率與主代理基準一致（藍方 71.5%／73.8%，±0.5% 內，DOT 歸屬只改統計不改勝負）。

**標準量測（之後每一輪都用這組）**：`--battles=1000 --seed=1` 與 `--battles=1000 --seed=1 --swapSides` 各一次，合併成一份報告。調參期間可先用 `--battles=300` 快速試，但每個任務結束前必須跑標準量測。

### 2. 平衡目標與規則

**驗收目標（標準量測）**
- 兩種站位的藍方勝率都落在 **46%～54%**，合併後 47%～53%。
- 抽到次數 ≥ 300 的技能，勝率差都在 **±0.08** 以內。
- 對戰時間中位數在 **12～22 秒**（目前約 16 秒；不要用「大家都變肉」或「大家都變脆」的方式達標）。
- 每場各職業傷害：同職業紅藍差距在 ±25% 以內（治療輔助比治療量）。

**可以改的欄位**：`power`、`cd`、`cast`、`cost`、`gain`、`range`、`aoeRadius`、`ccDur`、`ccForce`、`ccDur2`、`ccForce2`、`effectVal`、`effectVal2`、`projectileSpeed`。
**不可以改**：`type`（SINGLE／AOE）、`ccType`／`effectType`（增刪效果）、`ccSelf`、`element`、`tag`、`role`、`team`、`id`、`name`、`visual*`；`data/units.ts`（雙方共用，不是陣營差距的來源）；任何引擎程式碼（BL0 的 `sourceId` 一行除外）。
**幅度上限**：單一技能的 `power` 與 `cd` 相對改前各不超過 ±50%，`range` 不超過 ±2，`ccDur` 不超過 ±50%。
**陣營特色要保留**：藍方＝護盾、控制、聖光；紅方＝持續傷害、吸血、自損換爆發。不要把紅方調成藍方的複製品（例如不要把 DOT 技能的 DOT 拿掉改成直傷，本來就不能改 ccType）。
**`desc` 一致**：數值改動若讓描述不再成立（例如「大範圍」但 aoeRadius 改小），一起修 `desc`；`tests/SkillDataIntegrity.test.ts` 必須照過。

### 3. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **BL0** | §1 工具補強。 | lint／test／build；兩次同參數結果相同；勝率與基準一致 |
| **BL1** | 跑標準量測，產出 `docs/BALANCE_BASELINE.md`（report.mjs 的輸出＋你對差距來源的分析：哪些職業、哪些技能、DOT 補算後差距變多少）。不改數值。 | — |
| **BL2** | **陣營整體**：先以職業×技能類別（BASIC／ACTIVE／ULT）為單位調紅方（必要時小幅調藍方），目標是勝率回到 46%～54%、對戰時間中位數維持。每做一批調整就跑快速量測，記錄「改了什麼 → 勝率變多少」。結束前跑標準量測。 | lint／test／build；標準量測達第一項目標 |
| **BL3** | **個別技能**：處理勝率差超過 ±0.08 的技能（先處理偏離最大的），每批處理後跑快速量測；結束前跑標準量測。 | 標準量測達全部目標；br-soak 10/10；**fidelity 5 張地形與改前相同**（`battle_frozen` 若變動：不得重錄，報告寫改前／改後數值與差異圖路徑） |
| **REPORT** | `docs/BALANCE_REPORT.md`：改前／改後標準量測表（report.mjs 輸出）、每個被改技能的 改前→改後 數值與理由（表格）、每批調整的勝率軌跡、沒達標的項目與原因、回退指南（每個任務的 commit）。 | — |

- 每個任務一個 commit；BL2、BL3 若分多批，每批一個 commit，訊息寫「改了哪些技能、快速量測勝率」。

### 4. 守則與停下條件
- 只改 §2 允許的欄位；超過幅度上限才能達標時：停下，把需要的改動與理由寫進報告，交給主代理決定。
- 調了 15 批仍達不到目標：停下回報目前最佳狀態與卡住的原因（例如某個機制本身在 AI 下用不好，需要改機制）。
- 發現「看起來是 bug」的現象（例如某技能每場施放 0 次、某效果從不觸發）：只記錄，不要修。
- `br-soak` 失敗：還原該批、找原因。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「平衡跑完了」，主代理會審查 `git diff main...feat/balance`、重跑標準量測、再問你要不要合併。
2. 實機看幾場展示戰鬥，感覺紅方是不是不再一面倒地輸。
