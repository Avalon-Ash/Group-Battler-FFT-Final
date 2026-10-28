# 執行指令：平衡調整 BAL-03（近戰高低差規則之後）

> 給 GPT（Codex App）。怎麼拆、怎麼試由你決定；下面只寫目標、事實、硬限制和驗收。
> 背景：2026-10-28 合併 R6，**近戰（技能射程 1）每差一層高度算一格距離，只能打同一層的相鄰格；遠程保留高地加成**（`COMBAT_PARAM.MELEE_RANGE`、`TargetingSystem.getEffectiveRange`）。近戰打不到的目標在選目標時扣分（`MELEE_UNREACHABLE_PENALTY`），有可用突進／拉取技能時不扣。這條規則讓近戰職業輸出下降、戰局偏向藍方。**本輪只調技能數值，不改機制。**

## 現況（主代理 2026-10-28 在 main 量，標準量測，技能數值與 BAL-02 結束時相同）
- 藍方勝率：一般站位 **51.6%**、交換站位 **53.8%**、合併 **52.7%**（BAL-02 結束時 49.3／50.4／49.9）。
- 對戰時間 p10／p50／p90：12.4／18.0／30.5 秒（BAL-02：12.1／17.4／28.5）。
- 抽到 ≥ 300 次且勝率差超過 ±0.08：`mr_u5` +0.10（紅法奧義，AOE 半徑 2、power 630）、`mr_u3` −0.10（紅法奧義，單體放逐，power 620、ccDur 3.0）、`mb_u3` −0.09（藍法奧義，aoeRadius 10、power 0）。
- 每場傷害（藍／紅）：坦克 455／407、戰士 947／877、遊俠 1417／1213、法師 1566／1294、輔助 411／353（治療 1003／766）。R6 前坦克 503／474、戰士 1025／984。
- 完整報告：`docs/R6_MELEE_ZOOM_REPORT.md`。

## 目標（標準量測，與 BAL-02 相同）
- 兩種站位的藍方勝率都在 **46%～54%**，合併 **47%～53%**；合併盡量回到 50% 附近。
- 抽到次數 ≥ 300 的技能，勝率差都在 **±0.08** 以內。
- 對戰時間中位數 **12～22 秒**（不要用「大家都變肉」或「大家都變脆」的方式達標）。
- 同職業紅藍每場傷害差距 **±25%** 以內（輔助比治療量）。
- 近戰職業（坦克、戰士）因規則變慢是預期的；若要補，用它們自己技能的數值補，不要回頭削遠程。

## 標準量測（指令固定，每次報數字都用這組）
1. `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --out=tools/ui-e2e/out/balance_a.json`
2. `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --swapSides --out=tools/ui-e2e/out/balance_b.json`
3. `node tools/balance/report.mjs tools/ui-e2e/out/balance_a.json tools/ui-e2e/out/balance_b.json`
- 開工時先跑一次，數字要和上面的「現況」一致（勝率 ±0.5% 內）；不一致就停下回報（代表環境或分支不對）。
- 試參可以用 `--battles=300`，但最後的驗收一定用 1000 場。同參數跑兩次結果要完全相同（決定性），不同就停下回報。

## 可以改／不可以改
- **可以改的欄位**：`power`、`cd`、`cast`（ULT 只能 ≥ 1.5，`COMBAT_PARAM.ULT_MIN_CAST_SEC`）、`cost`、`gain`、`range`、`aoeRadius`、`ccDur`、`ccForce`、`ccDur2`、`ccForce2`、`effectVal`、`effectVal2`、`projectileSpeed`（只限原本就是投射物的技能，不得把 0 改成正值或正值改成 0）。
- **`range` 的特別規則**：射程 1 ↔ 2 會讓技能在近戰／遠程規則之間切換，**不准跨過這條線**（射程 1 的維持 1，≥ 2 的不得改成 1）。
- **不可以改**：`type`、`ccType`／`effectType`（增刪效果）、`ccSelf`、`element`、`tag`、`role`、`team`、`id`、`name`、`visual*`；`data/units.ts`；任何 `engine/`、`constants/`、`data/vfx/`、`tools/` 程式碼。
- **幅度上限**：單一技能的 `power` 與 `cd` 相對 main 現值各不超過 ±50%，`ccDur` ±50%，`projectileSpeed` ±50%。超過才能達標時停下，把需要的改動與理由寫進報告。
- **陣營特色要保留**：藍方＝護盾、控制、聖光；紅方＝持續傷害、吸血、自損換爆發。
- 數值改動讓 `desc` 不再成立時一起修 `desc`；`tests/SkillDataIntegrity.test.ts` 必須照過。

## 硬限制
- 從最新 `main` 開分支 `feat/balance-03`；不准 rebase、不准合併、不准 push、不准動 `main`。
- **受保護檔案**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/R6_MELEE_ZOOM_REPORT.md`、`.claude/**`、`.codex/**`、`tools/**`、`tests/*.baseline.json`、`tools/ui-e2e/baseline/**`。
- **保真基準不得重錄**：`battle_frozen` 會因戰鬥軌跡改變而失敗，這是預期的；5 張地形保真必須照過。
- 不新增依賴、不用 `as any`、不加安全網。
- 發現「看起來是 bug」的現象（某技能每場施放 0 次、近戰單位大量原地不動、投射物命中率異常）：只記錄，不修。

## 驗收（交回前全部要有）
1. 標準量測達到上面全部目標。
2. `npm run lint`、`npm test`、`npm run build` 通過。
3. `node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle` 10/10（不得出現發呆）。
4. `npm run perf:fidelity`：5 張地形通過；`battle_frozen` 寫 meanAbsDiff 與差異圖路徑。
5. 報告 `docs/BAL03_REPORT.md`：改前／改後標準量測表（report.mjs 輸出）、每個被改技能的改前 → 改後與理由、試參過程的勝率軌跡（簡表即可）、沒達標的項目與原因、回退指南（每個 commit 改了什麼）。

## 回來後（給使用者看）
把 GPT 的最後回覆貼給主代理；主代理審 `git diff main...feat/balance-03`、重跑標準量測、依取證流程重錄 `battle_frozen`，再問要不要合併。
