# 執行指令：行為樹優化與技能強度重調（BT）

> 用法：在 IDE 代理對話輸入 `/goal docs/BT_OPT_AGENT_PROMPT.md`。
> 背景：主代理先行錄製 30 場 5v5 全職業無頭對戰（`SEED = 42`、`DT = 1/60`、共 3,120 次技能施放、268,476 單位 tick），量化出四類不自然的 AI 行為：
> 1. **主目標卡在友軍身上（`allyTargetTicks = 13,317` ticks）**：輔助施放治療／護盾／增益後，`BTRegistry.FindOptimalTarget` 把 `a.target` 設為友軍，而 `BTConditions.HasTarget` 未檢查 `a.target.team !== a.team`，導致後續戰鬥索敵、`_savedCombatTarget` 與 `ChaseTarget` 追著友軍跑。
> 2. **自身範圍技（`range === 0 && type === 'AOE'`）在空地空放（對敵傷害／控制型 PBAOE 空放 `21` 次）**：`TargetingSystem.calculateOptimalTarget` 在 `skill.range === 0` 時無條件回傳腳下格，`IsTargetInRange` 距離為 0 恆過，導致開場 `t = 0.08 s` 離敵人 7～9 格就原地空放 `wb_a1` 旋光劍舞、`wr_a1` 旋風斬、`tr_a3` 戰爭踐踏、`tb_a1` 六稜壁障、`tb_a3` 磐石禁錮、`sb_u4` 神之怒火、`wr_u4` 千刃魔相、`wr_u5` 毀滅重擊、`sr_u1` 靈魂連結等招式；且若改為沒敵人時回傳 `null` 進入 `ChaseTarget`，`ChaseTarget` 會把 `skill.range`（`0`）傳給 `moveAgentToHex`，要求尋路踏進敵人佔據的那一格而失敗。
> 3. **對滿血／近滿血友軍空放治療，以及對自身施放自殘補血（`healFullHpCasts = 66` 次，其中 `sr_b4` 鮮血治癒 31 次、`sr_a3` 治療圖騰 11 次、`sr_a5` 黑暗犧牲 8 次、`sr_a1` 生命轉移 4 次）**：`calculateOptimalTarget` 在 `skill.power < 0` 時對 100% HP 友軍仍給出 `0 > -Infinity` 的有效目標；`range === 0` 的群補（`sr_a3` 治療圖騰、`sb_u2` 復活之光、`sb_u5` 寧靜之雨、`sr_u2` 鮮血契約）在檢查友軍血量前就提早回傳腳下格；且 `sr_a1`／`sr_a5`（`effectType === 'SELF_DAMAGE'`）未排除自身，會扣自己的血補自己。
> 4. **短效自身／團隊戰鬥增益在遠離敵人時提早開掉**：`range === 0 && power === 0` 的短效戰鬥增益／護盾（如 `tb_a5` 稜鏡反射、`tr_a4` 鮮血護盾、`wr_a5` 嗜血狂熱、`tr_u3` 不朽屍王、`wr_u3` 惡魔降臨、`sr_u4` 猩紅血月）在開場離敵人 > 3 格且全員滿血時立即施放，走到接戰時效已浪費大半。
>
> **為什麼必須同步重調技能強度（`data/skills/*.ts`）**：上一輪平衡（`99d0531`～`ccaf42b`）是在「AI 會空放 PBAOE、空補滿血隊友、提早浪費短效增益」的前提下調出的數值。當上述行為修好後，這些技能的實際有效命中率、每場有效治療量與增益覆蓋率指標都會大幅上升。因此本輪在修完行為樹後，**必須重新量測並調整 `data/skills/*.ts` 的數值欄位**，使 `tools/balance/report.mjs` 的 6 項平衡驗收指標全部 PASS。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`types.ts`、`constants/combat.ts`、`data/status/effect_defs.ts`、`data/ai_profiles.ts`、`engine/behaviorTree.ts`、`engine/systems/ai.ts`、`engine/ai/BTRegistry.ts`、`engine/ai/TargetingSystem.ts`、`engine/ai/Pathfinder.ts`、`tools/balance/batch-sim.mjs`、`tools/balance/report.mjs`。
- 從 `main` 開分支 `feat/bt-opt`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`node tools/ui-e2e/runtime-smoke.mjs`。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json`（`constants-snapshot.json` 除外）、`engine/game.ts`、`engine/renderer.ts`。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM）
- **常數 SSOT（`constants/combat.ts:52-77`）**：
  - `COMBAT_CONFIG` 已收納 AI 相關閾值（`AI_CD_TOLERANCE: 0.01`、`AI_PERCEPTION_BONUS_ULT: 5`、`AI_PERCEPTION_BONUS_NORMAL: 2`）。
  - 新增常數必須加在 `constants/combat.ts` 的 `COMBAT_CONFIG` 內，並同步更新 `tests/constants-snapshot.json`（由 `tests/ConstantsBarrel.test.ts` 守門）。
- **狀態極性 SSOT（`data/status/effect_defs.ts`）**：
  - 正向增益／護盾／持續回血（BUFF 類）：`'SHIELD' | 'INVINCIBLE' | 'HASTE' | 'REFLECT' | 'LIFESTEAL' | 'HOT'`。
  - 對敵控制／減益／位移（DEBUFF 類）：`'STUN' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND' | 'BANISH' | 'STASIS' | 'POLYMORPH' | 'VULNERABLE' | 'DOT' | 'KNOCKBACK' | 'PULL'`。
- **主目標友軍殘留（`engine/ai/BTRegistry.ts`）**：
  - `BTConditions.HasTarget`（`BTRegistry.ts:26-40`）：第 34 行 `if (!tauntLocked && a.target && a.target.hp > 0 && !a.target.outOfBounds && !a.target.banished) return true;` **沒有檢查 `a.target.team !== a.team`**。
  - `BTActions.FindOptimalTarget`（`BTRegistry.ts:150-167`）：第 157-159 行當對友軍技能選中 `result.targetAgent`（友軍）時，會把 `a.target` 改寫為友軍；若進場時 `a.target` 已經是友軍，`_savedCombatTarget` 也會存成友軍；且施法後下一 tick 的 `HasTarget` 未排除友軍目標。
  - `BTActions.ChaseTarget`（`BTRegistry.ts:509-538`）：當 `a.target` 為友軍時，必須先還原為敵方主目標（或呼叫 `TargetingSystem.updateTarget(a, engine)`），絕不對友軍執行 `ChaseTarget`；當輔助的純治療普攻（如 `sr_b4` 鮮血治癒）因無友軍受傷而 `FindOptimalTarget` 回傳 `false` 時，`ChaseTarget(0)` 應朝敵方主目標保持普攻射程推進，讓輔助正常跟隨隊伍前進而非發呆或追隊友。
- **PBAOE（`skill.range === 0`）空放與追擊距離（`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts`）**：
  - `TargetingSystem.calculateOptimalTarget`（`TargetingSystem.ts:225-228`）目前在任何敵我檢查之前就直接回傳 `{ targetHex: { q: source.q, r: source.r } }`。
  - 技能資料庫中 `skill.range === 0` 的 37 個技能依效果分為三類：
    1. **對敵傷害或對敵控制 PBAOE**（`skill.type === 'AOE'` 且（`skill.power > 0` 或 `ccType`／`ccType2` 屬於未帶 `ccSelf`/`ccSelf2` 的對敵 DEBUFF），例如 `tb_a1` 六稜壁障、`tb_a3` 磐石禁錮、`wb_a1` 旋光劍舞、`wb_a3` 聖言禁語、`tr_a2` 血腥挑釁、`tr_a3` 戰爭踐踏、`wr_a1` 旋風斬、`tb_u1`～`tb_u3`、`wb_u2`、`wb_u4`、`rb_u2`、`mb_u3`、`sb_u4`、`tr_u2`、`tr_u4`、`wr_u2`、`wr_u4`、`wr_u5`、`rr_u3`、`mr_u4`、`sr_u1`）：
       - 必須在 `radius = Math.max(1, skill.aoeRadius || 1)` 內**至少有 1 名有效敵軍**（`!isEnemyUntargetable(e)`），才回傳 `{ targetAgent: null, targetHex: { q: source.q, r: source.r } }`；若範圍內 0 名敵軍，回傳 `{ targetAgent: null, targetHex: null }`。
    2. **純友軍群體治療／持續回血 PBAOE**（`skill.type === 'AOE' && skill.power < 0` 且無 `SHIELD`／`INVINCIBLE`／`HASTE` 主動增益，即 `sr_a3` 治療圖騰 `r=2`、`sb_u2` 復活之光 `r=6`、`sb_u5` 寧靜之雨 `r=5`、`sr_u2` 鮮血契約 `r=8`）：
       - 只有在 `radius = Math.max(1, skill.aoeRadius || 1)` 內**至少有 1 名友軍（`sr_u2` 帶 `SELF_DAMAGE` 時不含滿血自身）滿足 `ally.hp < ally.maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD`** 時，才回傳腳下格；否則回傳 `{ targetAgent: null, targetHex: null }`。
    3. **自身或友軍戰鬥增益／護盾（`skill.range === 0 && skill.power <= 0` 且主效果為 `SHIELD`／`INVINCIBLE`／`HASTE`／`REFLECT`／`LIFESTEAL`）**（如單體自身 `tb_a5` 稜鏡反射、`tr_a4` 鮮血護盾、`wr_a5` 嗜血狂熱、`tr_u3` 不朽屍王、`wr_u3` 惡魔降臨，以及群體增益 `sb_a5` 疾風祝禱、`tb_u5` 鋼鐵長城、`sb_u3` 英勇讚美、`tr_u5` 鮮血之牆、`sr_u4` 猩紅血月）：
       - 必須滿足**自身或範圍內友軍已受損（`hp < maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD`）**，**或最近有效敵軍距離 `<= COMBAT_CONFIG.AI_SELF_BUFF_ENGAGE_DIST`**（3 格）時才回傳腳下格，避免開場在出生點空開短效增益。
  - **PBAOE 的 `ChaseTarget` 追擊距離修正（`engine/ai/BTRegistry.ts:509-538`）**：
    - 目前 `ChaseTarget` 第 527 行寫 `const range = skill ? skill.range : 1;`，當 `skill.range === 0` 時把 `range = 0` 傳給 `engine.moveAgentToHex(a, dest, 0, speedMult)`，而 `TargetingSystem.getEffectiveRange(a, dest, 0, engine)`（第 37 行）回傳 `0`，導致 `Pathfinder.findPath` 要求單位走進敵人佔據的那一格（`dist <= 0`）而失敗。
    - 修法：在 `ChaseTarget`（以及 `approachEndsOnCollapse`）中，若 `skill && skill.range === 0`，追擊射程應為：對敵 PBAOE 取 `Math.max(1, skill.aoeRadius || 1)`，自身／友軍技能取角色普攻射程（`a.skillIds[0]` 的射程或 `1`），讓單位能正常走向敵群接戰。
- **單體純治療與自殘治療目標選擇（`engine/ai/TargetingSystem.ts:235-268`）**：
  - 在 `calculateOptimalTarget` 的 `isSupportSkill` 分支中：
    - 若該技能**沒有**主動防護／加速增益（即 `!['SHIELD', 'INVINCIBLE', 'HASTE', 'REFLECT', 'LIFESTEAL'].includes(skill.ccType as string)`，例如 `sb_a1` 神聖癒合、`sb_a3` 天使祝福、`sr_b4` 鮮血治癒、`sr_a1` 生命轉移、`sr_a5` 黑暗犧牲），在遍歷 `allies` 挑選 `bestAlly` 時，**必須略過 `ally.hp >= ally.maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 的未受傷友軍**。
    - 當 `skill.effectType === 'SELF_DAMAGE'`（`sr_a1` 生命轉移、`sr_a5` 黑暗犧牲）時，候選 `allies` **必須排除 `ally.id === source.id`**（禁止扣自己的血補自己）。

### 2. 目標與規則（DOM）
- **第一部分：行為樹不自然行為歸零（`tests/BTOptimization.test.ts`）**：
  1. `HasTarget` 在 `a.target` 為同隊友軍時必回傳 `false` 並重新鎖定敵方目標；非施法時段 `a.target` 絕不殘留為友軍。
  2. 對敵 PBAOE（如 `wr_a1`、`wb_a1`、`tb_a3`、`tr_a3`、`wr_u4`）在 `aoeRadius` 內無敵軍時不空放，並能透過 `ChaseTarget` 追擊至 `aoeRadius` 內施放。
  3. 純治療／HOT 技能（如 `sr_b4`、`sb_a1`、`sb_a3`、`sr_a3`、`sb_u2`、`sb_u5`、`sr_u2`）在範圍內無 `hp < maxHp * COMBAT_CONFIG.AI_HEAL_HP_THRESHOLD` 友軍時不空放；`effectType === 'SELF_DAMAGE'` 的單體補血（`sr_a1`、`sr_a5`）不對自身施放。
  4. 自身／團隊 `range === 0` 增益護盾在全員滿血且最近敵人距離 `> COMBAT_CONFIG.AI_SELF_BUFF_ENGAGE_DIST` 時不提早空開。
  5. 30 場無頭對戰稽核（`SEED = 42, BATTLES = 30`）：`emptyPbaoeCasts === 0`、`healFullHpCasts === 0`、`allyTargetTicks === 0`。
- **第二部分：技能強度重調與 6 項平衡指標驗收（`tools/balance/report.mjs`）**：
  - 跑 1000 場一般站位＋1000 場 `--swapSides`（開發調參迭代時可用各 300～500 場快速收斂，定稿必須跑各 1000 場 `--seed=1`），使用 `node tools/balance/report.mjs` 檢查全部 6 項指標 PASS：
    1. **一般站位藍方勝率**：**46.0% ～ 54.0%**
    2. **交換站位藍方勝率**：**46.0% ～ 54.0%**
    3. **合併藍方勝率**：**47.0% ～ 53.0%**
    4. **對戰時間中位數 (p50)**：**12s ～ 22s**（且 0 場 `TIMEOUT`）
    5. **高頻技能勝率差**：`picks >= 300` 的技能 `|勝率差| <= 0.08`（超標數 **0 筆**）
    6. **職業紅藍差距**：同職業紅藍傷害差距（輔助為治療差距）**`<= ±25%`**
- **可以改**：
  - AI 與常數：`constants/combat.ts`、`tests/constants-snapshot.json`、`engine/ai/TargetingSystem.ts`、`engine/ai/BTRegistry.ts`、`tests/BTOptimization.test.ts`
  - 技能數值欄位：`data/skills/blue_basic.ts`、`data/skills/blue_active.ts`、`data/skills/blue_ult.ts`、`data/skills/red_basic.ts`、`data/skills/red_active.ts`、`data/skills/red_ult.ts`（只准改數值欄位 `power`、`cd`、`cast`、`ccDur`、`ccForce`、`ccDur2`、`ccForce2`、`effectVal`；**注意**：奧義 `cast` 必須維持 `>= 0.3` 以遵守 `tests/UltSpec.test.ts` C1，且 `tests/SkillDataIntegrity.test.ts` 必須維持 0 違規）
  - 報告：`docs/BT_OPT_REPORT.md`

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| BT0 | 開分支 `feat/bt-opt`，跑開工前基準檢查（`lint`、`test`、`build`、`runtime-smoke`） | 全部通過 |
| BT1 | 在 `constants/combat.ts` 的 `COMBAT_CONFIG` 新增 `AI_HEAL_HP_THRESHOLD: 0.95` 與 `AI_SELF_BUFF_ENGAGE_DIST: 3`，同步更新 `tests/constants-snapshot.json` | `npx vitest run tests/ConstantsBarrel.test.ts` |
| BT2 | 修改 `engine/ai/TargetingSystem.ts` 與 `engine/ai/BTRegistry.ts` 修正四類不自然行為，並新增 `tests/BTOptimization.test.ts`（含單點單元測試與 30 場對戰 `emptyPbaoeCasts === 0`、`healFullHpCasts === 0`、`allyTargetTicks === 0` 斷言） | `npm run lint`、`npx vitest run tests/BTOptimization.test.ts tests/AIIdlePriority.test.ts` |
| BT3 | 跑行為修正後的初步平衡量測，分析因不再空放而過強或失衡的技能／職業，調整 `data/skills/*.ts` 數值欄位，直到 `seed=1` 各 1000 場（一般＋`--swapSides`）在 `node tools/balance/report.mjs` 的 **6 項驗收指標全部 ✅ PASS** | `npx vitest run tests/SkillDataIntegrity.test.ts tests/UltSpec.test.ts tests/MeleeFxSpec.test.ts`、`npm run balance:report` 6/6 PASS |
| BT4 | 跑全套驗證：`npm run lint`、`npm test`、`npm run build`、`node tools/ui-e2e/runtime-smoke.mjs` | 全部通過 |
| REPORT | 撰寫 `docs/BT_OPT_REPORT.md`：① 改前／改後 30 場不自然行為統計表；② 行為修正後、調參前 vs 調參後的平衡指標對照表（附上 `report.mjs` 的 6 項檢驗表與各職業表現表）；③ 每個調整技能的舊值→新值與理由；④ 回退指南（每個任務的 commit） | `npx vitest run tests/DocDrift.test.ts` |

- 每個任務一個 commit。

### 4. 守則與停下條件（INV）
- `data/skills/*.ts` 只准修改數值欄位，不得改動 `id`、`name`、`type`、`visual`、`visualHitEffect`、`element` 或特效綁定；每次改完技能數值必跑 `npx vitest run tests/SkillDataIntegrity.test.ts tests/UltSpec.test.ts`。
- 調參迭代最多 4 輪；若 4 輪後仍有個別指標差一點未過，將完整表格與原因寫入 `docs/BT_OPT_REPORT.md` 後停下回報，不要無限重跑。
- 不新增依賴、不用 `as any`、tick 與 AI 迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「行為樹優化與技能重調跑完了」，主代理會審查 `git diff main...feat/bt-opt` 與 2000 場平衡報告，再問你要不要合併。
2. 實機開一場 5v5 戰鬥，觀察近戰與坦克是否不再於開場原地空放範圍技、輔助是否不再對滿血隊友空補或追著隊友跑，以及整體對戰節奏。
