# 執行指令：行為樹與目標選擇優化（BT）

> 用法：在 IDE 代理對話輸入 `/goal docs/BT_OPT_AGENT_PROMPT.md`。
> 背景：主代理先行錄製 30 場 5v5 全職業無頭對戰（`SEED = 42`、`DT = 1/60`、共 3,120 次技能施放、268,476 單位 tick），量化出四類不自然的 AI 行為：
> 1. **主目標卡在友軍身上（`allyTargetTicks = 13,317` ticks）**：輔助施放治療／護盾／增益後，`BTRegistry.FindOptimalTarget` 把 `a.target` 設為友軍，而 `BTConditions.HasTarget` 未檢查 `a.target.team !== a.team`，導致後續戰鬥索敵、`_savedCombatTarget` 與 `ChaseTarget` 追著友軍跑。
> 2. **自身範圍技（`range === 0 && type === 'AOE'`）在空地空放（`emptyPbaoeCasts = 32` 次，外加 `power === 0` 的控制型 PBAOE 如 `sr_u4` 暗影迷霧 10 次、`wr_u3` 惡魔降臨 2 次）**：`TargetingSystem.calculateOptimalTarget` 在 `skill.range === 0` 時無條件回傳腳下格，`IsTargetInRange` 距離為 0 恆過，導致開場 `t = 0.08 s` 離敵人 7～9 格就原地空放旋風斬、戰爭踐踏、磐石禁錮、暗影迷霧等招式；且若改為沒敵人時回傳 `null` 進入 `ChaseTarget`，`ChaseTarget` 會把 `skill.range`（`0`）傳給 `moveAgentToHex`，要求尋路踏進敵人佔據的那一格而失敗。
> 3. **對滿血／近滿血友軍空放治療（`healFullHpCasts = 66` 次，其中 `sr_b4` 鮮血治癒 31 次、`sr_a5` 黑暗犧牲 8 次、`sr_a3` 治療圖騰 6 次）**：`calculateOptimalTarget` 在 `skill.power < 0` 時對 100% HP 友軍仍給出 `0 > -Infinity` 的有效目標，且 `range === 0` 的群補在檢查友軍血量前就提早回傳腳下格。
> 4. **短效自身增益／護盾在遠離敵人時提早開掉（`prematureSelfBuffCasts`）**：`range === 0 && power === 0` 的自身增益／護盾（如 `tb_a5` 稜鏡反射 4s、`tr_a4` 鮮血護盾 5s、`wr_a5` 嗜血狂熱 4s、`tr_u3` 不朽屍王 4s）在開場離敵人 > 3 格且滿血時立即施放，走到接戰時效已過大半。
>
> 本輪只修 `constants/combat.ts`、`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts` 與測試；改完必須重跑標準平衡模擬（`npm run balance:sim` 一般與 `--swapSides`），確認合併勝率維持在 **45%～55%**。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`types.ts`、`constants/combat.ts`、`data/ai_profiles.ts`、`engine/behaviorTree.ts`、`engine/systems/ai.ts`、`engine/ai/BTRegistry.ts`、`engine/ai/TargetingSystem.ts`、`engine/ai/Pathfinder.ts`、`docs/BALANCE_BASELINE.md`。
- 從 `main` 開分支 `feat/bt-opt`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`node tools/ui-e2e/runtime-smoke.mjs`。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json`、`engine/game.ts`、`engine/renderer.ts`、`data/skills/**`。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM）
- **常數 SSOT（`constants/combat.ts:52-77`）**：
  - `COMBAT_CONFIG` 已收納 AI 相關閾值（`AI_CD_TOLERANCE: 0.01`、`AI_PERCEPTION_BONUS_ULT: 5`、`AI_PERCEPTION_BONUS_NORMAL: 2`）。
  - 新增常數必須加在 `constants/combat.ts` 的 `COMBAT_CONFIG` 內，並同步更新 `tests/constants-snapshot.json`（由 `tests/ConstantsBarrel.test.ts` 守門）。
- **主目標友軍殘留（`engine/ai/BTRegistry.ts`）**：
  - `BTConditions.HasTarget`（`BTRegistry.ts:26-40`）：第 34 行 `if (!tauntLocked && a.target && a.target.hp > 0 && !a.target.outOfBounds && !a.target.banished) return true;` **沒有檢查 `a.target.team !== a.team`**。
  - `BTActions.FindOptimalTarget`（`BTRegistry.ts:150-167`）：第 157-159 行當對友軍技能選中 `result.targetAgent`（友軍）時，會把 `a.target` 改寫為友軍；雖在 `createSkillRoutine` 開頭（第 138 行）存了 `(a as any)._savedCombatTarget = a.target`，但若進場時 `a.target` 已經是友軍，`_savedCombatTarget` 也會存成友軍；或者當 `FindOptimalTarget` 成功選中友軍並進入 `ExecuteSkill` 後，並沒有在施法後或下一 tick 的 `HasTarget` 排除友軍目標。
  - `BTActions.ChaseTarget`（`BTRegistry.ts:509-538`）：第 514-518 行若 `a.target` 是友軍，且後續攻擊技能的 `FindOptimalTarget` 回傳 `false` 並還原了友軍目標，`ChaseTarget` 就會追著友軍走；若對友軍的治療技能（如 `sr_b4` 鮮血治癒）因無人受傷而 `FindOptimalTarget` 回傳 `false`，`ChaseTarget(0)` 若還原敵方主目標並向敵方推進，輔助就能正常跟隨隊伍前進而不會卡在原地。
- **PBAOE（`skill.range === 0`）空放與追擊距離（`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts`）**：
  - `TargetingSystem.calculateOptimalTarget`（`TargetingSystem.ts:225-228`）：
    ```ts
    // 1. 自身爆發 (PBAOE) - Range 0 強制鎖定腳下
    if (skill.range === 0) {
        return { targetAgent: null, targetHex: { q: source.q, r: source.r } };
    }
    ```
    這段在任何敵我檢查之前就直接回傳 `{ targetHex: { q: source.q, r: source.r } }`。
  - 技能資料庫中 `skill.range === 0` 的技能分為四種：
    1. **純友軍群體治療**（`skill.type === 'AOE' && skill.power < 0 && !skill.ccType && !skill.ccType2`）：如 `sb_u2`（復活之光 `r=4`）、`sb_u5`（寧靜之雨 `r=4`）、`sr_u2`（鮮血契約 `r=3`）。只有在 `aoeRadius` 內至少有 1 名友軍（含自身）滿足 `ally.hp < ally.maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 時才應回傳腳下格，否則回傳 `{ targetAgent: null, targetHex: null }`。
    2. **友軍群體增益／護盾**（`skill.type === 'AOE' && skill.power <= 0` 且 `ccType` 為 `'HASTE'`／`'SHIELD'`／`'INVINCIBLE'`，如 `sb_a5` 疾風祝禱）：至少有 1 名友軍或敵人進入交戰距離（或 `aoeRadius` 內有友軍且最近敵人距離 `<= COMBAT_CONFIG.AI_SELF_BUFF_ENGAGE_DIST + (skill.aoeRadius || 1)`）時施放。
    3. **複合型／敵方傷害或敵方控制 PBAOE**（`skill.type === 'AOE'` 且（`skill.power > 0` 或含有對敵控制／減益 `ccType`／`ccType2`，包含 `sr_a3` 治療圖騰 `power: -120, ccType: POISON, r=2`、`sr_u4` 暗影迷霧 `BLIND, r=3`、`wr_u3` 惡魔降臨 `FEAR, r=2`、`tb_a1` 六稜壁障 `power: 130, r=1`、`tr_a2` 血腥挑釁 `TAUNT, r=2` 等））：
       - 對於 `sr_a3`（治療圖騰，`power < 0` 且 `ccType === 'POISON'`）：只要 `aoeRadius` 內有受傷友軍（`hp < maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD`）**或** `aoeRadius` 內有有效敵軍，即可施放；若兩者皆無則回傳 `{ targetAgent: null, targetHex: null }`。
       - 對於其餘對敵傷害／對敵控制 PBAOE：必須在 `radius = Math.max(1, skill.aoeRadius || 1)` 內**至少有 1 名有效敵軍**（`!isEnemyUntargetable(e)`），才回傳 `{ targetAgent: null, targetHex: { q: source.q, r: source.r } }`；若範圍內 0 名敵軍，回傳 `{ targetAgent: null, targetHex: null }`。
    4. **自身單體增益／護盾**（`skill.range === 0 && skill.type === 'SINGLE' && skill.power === 0` 且無對敵控制，如 `tb_a5` 稜鏡反射、`tr_a4` 鮮血護盾、`wr_a5` 嗜血狂熱、`tr_u3` 不朽屍王）：必須滿足 `source.hp < source.maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` **或**最近有效敵軍距離 `<= COMBAT_CONFIG.AI_SELF_BUFF_ENGAGE_DIST`（3 格）時才回傳腳下格，避免開場在出生點空開 4 秒增益。
  - **PBAOE 與治療落空時的 `ChaseTarget` 追擊距離修正（`engine/ai/BTRegistry.ts:509-538`）**：
    - 當 `skill.range === 0` 的技能因範圍內無敵軍而讓 `FindOptimalTarget` 回傳 `false` 時，`createSkillRoutine` 會進入 `ChaseTarget(skillSlot)`。
    - 目前 `ChaseTarget` 第 527 行寫 `const range = skill ? skill.range : 1;`，把 `range = 0` 傳給 `engine.moveAgentToHex(a, dest, 0, speedMult)`，而 `TargetingSystem.getEffectiveRange(a, dest, 0, engine)`（第 37 行）在 `baseRange === 0` 時回傳 `0`，導致 `Pathfinder.findPath` 要求單位走進敵人所在的那一格（`dist <= 0`）而尋路失敗！
    - 修法：在 `ChaseTarget`（以及 `approachEndsOnCollapse`）中，若 `skill && skill.range === 0`，追擊用的等效射程應為 `Math.max(1, skill.aoeRadius || 1)`（即走到敵人進入 `aoeRadius` 內即可停步施放 PBAOE）。
- **單體治療與犧牲治療對滿血友軍空放（`engine/ai/TargetingSystem.ts:235-268`）**：
  - 在 `calculateOptimalTarget` 的 `isSupportSkill` 分支（`skill.power < 0 || skill.ccType === ControlType.SHIELD || skill.ccType === ControlType.INVINCIBLE || skill.ccType === ControlType.HASTE`）：
  - 若該技能**沒有**主動增益效果（即 `!['SHIELD', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'].includes(skill.ccType as string)`，屬於純治療如 `sb_a1` 神聖癒合、`sr_b4` 鮮血治癒、`sr_a1` 生命轉移、`sr_a5` 黑暗犧牲、`sr_u5` 惡靈附身），在遍歷 `allies` 挑選 `bestAlly` 時，**必須略過 `ally.hp >= ally.maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 的未受傷友軍**！
  - 此外，對會扣自身血量的犧牲治療（`sr_a1` 生命轉移、`sr_a5` 黑暗犧牲，即 `skill.ccSelf === ControlType.VULNERABLE` 或自身不應選自己），`ally.id === source.id` 時拿自己的血補自己並給自己上易傷完全不合理：當 `skill.ccSelf === ControlType.VULNERABLE` 時，候選 `allies` 應排除 `ally.id === source.id`。

### 2. 目標與規則（DOM）
- 驗收目標：
  1. 新增單元測試 `tests/BTOptimization.test.ts`，驗證：
     - `HasTarget` 在 `a.target` 為同隊友軍時必回傳 `false` 并重新鎖定敵方目標；友軍技能施放完畢或取消後，戰鬥主目標不會殘留為友軍。
     - 對敵 PBAOE（`range === 0, type === 'AOE'`，如 `wr_a1`、`tb_a3`、`sr_u4`、`wr_u3`）在 `aoeRadius` 內無敵軍時，`calculateOptimalTarget` 回傳 `{ targetAgent: null, targetHex: null }`，且 `ChaseTarget` 能以 `Math.max(1, skill.aoeRadius || 1)` 追擊敵軍直到進入半徑後施放。
     - 純治療技能（如 `sr_b4`、`sb_a1`、`sb_u2`、`sb_u5`）在所有友軍 `hp >= maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 時不空放；`sr_a1`／`sr_a5`（`ccSelf === ControlType.VULNERABLE`）不會對自身施放。
     - 自身短效增益（`range === 0, power === 0`，如 `tb_a5`、`wr_a5`）在滿血且最近敵人距離 `> COMBAT_CONFIG.AI_SELF_BUFF_ENGAGE_DIST` 時不空放，敵人進入距離或自身受損時正常施放。
     - 30 場無頭對戰稽核（與背景相同的 `SEED = 42, BATTLES = 30`）：`emptyPbaoeCasts === 0`、`healFullHpCasts === 0`、`allyTargetTicks === 0`。
  2. 跑標準平衡模擬（`tools/balance/batch-sim.mjs` 一般與 `--swapSides` 各 200 場以上，若時間充裕跑各 500 場）：
     - 藍方一般勝率、交換站位勝率與合併勝率皆維持在 **45.0%～55.0%** 區間內。
     - 0 場 `TIMEOUT`。
- 可以改：`constants/combat.ts`、`tests/constants-snapshot.json`、`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts`、`tests/BTOptimization.test.ts`、`docs/BT_OPT_REPORT.md`。
- 不可以改：技能數值（`data/skills/**`）、渲染器、特效、Facade 檔案。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| BT0 | 開分支 `feat/bt-opt`，跑開工前基準檢查（`lint`、`test`、`build`、`runtime-smoke`） | 全部通過 |
| BT1 | 在 `constants/combat.ts` 的 `COMBAT_CONFIG` 新增 `AI_HEAL_HP_THRESHOLD: 0.95` 與 `AI_SELF_BUFF_ENGAGE_DIST: 3`，同步更新 `tests/constants-snapshot.json` | `npx vitest run tests/ConstantsBarrel.test.ts` |
| BT2 | 修改 `engine/ai/TargetingSystem.ts` 與 `engine/ai/BTRegistry.ts`：① 修正 `HasTarget`／`_savedCombatTarget`／`FindOptimalTarget` 防止 `a.target` 殘留為友軍；② 修正 `calculateOptimalTarget` 的 `range === 0` 分支與 `isSupportSkill` 分支（消除空放 PBAOE、對滿血友軍空放治療、對自己放易傷犧牲補血、遠距空開短效自身增益）；③ 修正 `ChaseTarget` 與 `approachEndsOnCollapse` 在 `skill.range === 0` 時的追擊射程為 `Math.max(1, skill.aoeRadius || 1)`。新增 `tests/BTOptimization.test.ts` 覆蓋上述行為與 30 場對戰不自然行為歸零斷言 | `npm run lint`、`npx vitest run tests/BTOptimization.test.ts tests/AIIdlePriority.test.ts` |
| BT3 | 執行全套測試、建置、平衡模擬（`node tools/balance/batch-sim.mjs --battles=500 --seed=1 --out=tools/ui-e2e/out/balance_bt_normal.json` 與 `--swapSides --out=tools/ui-e2e/out/balance_bt_swap.json`）與 `runtime-smoke.mjs`，確認合併勝率在 45%～55% 且 0 TIMEOUT | `npm run lint`、`npm test`、`npm run build`、`balance:sim`、`runtime-smoke` |
| REPORT | 撰寫 `docs/BT_OPT_REPORT.md`：改前／改後 30 場不自然行為統計表、500+500 場平衡模擬勝率與技能施放變化表、每個改動的理由、回退指南（每個任務的 commit） | `npx vitest run tests/DocDrift.test.ts` |

- 每個任務一個 commit。

### 4. 守則與停下條件（INV）
- 若平衡模擬合併勝率超出 45%～55%，先分析是哪個職業／技能因不再空放而勝率偏移，僅微調 `COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 或 `AI_SELF_BUFF_ENGAGE_DIST`（不得偷改 `data/skills/**`）；若調過一次仍超出 45%～55%，只記錄數據並停下回報。
- 不新增依賴、不用 `as any`（既有程式碼若動到可一併改為型別安全寫法）、tick 與 AI 迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「行為樹優化跑完了」，主代理會審查 `git diff main...feat/bt-opt` 與平衡數據，再問你要不要合併。
2. 實機開一場 5v5 戰鬥，觀察近戰與坦克是否不再於開場原地空放範圍技、輔助是否不再對滿血隊友空補或追著隊友跑。
