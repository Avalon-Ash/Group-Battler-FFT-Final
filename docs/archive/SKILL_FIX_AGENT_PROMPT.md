# 執行指令：技能正確性修正＋三種新效果（SK）

> 用法：**S4（常數拆檔）合併進 `main` 之後**，在 IDE 代理對話輸入 `/goal docs/archive/SKILL_FIX_AGENT_PROMPT.md`。
> 背景：主代理 2026-10-19 稽核 150 個技能（`data/skills/*`，稽核腳本 `tools/ui-e2e/out/_scratch_skill_audit.mjs`），使用者決定：**缺的機制做成新效果；這輪只修正確性，不調平衡數值**。
> 稽核結果摘要：
> - 增益控制（護盾、持續回血）只有打中敵人時才「轉給施法者」，AOE 打到幾個敵人就疊幾次，沒打到人就沒有（`SkillExecutor.ts` 的 `isBuff && target.team !== source.team ? source : target`）；`INVINCIBLE` 不在轉向名單裡。
> - 8 個技能描述有、遊戲卻沒有的機制：攻速／移速（加速）、反傷、吸血增益。
> - `sb_u1 神聖干涉`「單體無敵」實際是對隊友放逐（放逐是減益，對隊友會被擋，只剩治療）。
> - `wr_a5 嗜血狂熱` 是 0 威力的 VAMP（吸血量＝傷害×比例＝0，技能沒有效果）。
> - 42 個技能沒有 `element`；3 個描述與效果不符。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前
- 先讀：`AGENTS.md`（全部）、`types.ts` 的 `Skill`／`EffectKind`、`data/status/effect_defs.ts`、`engine/core/Effects.ts`、`engine/systems/combat/SkillExecutor.ts`、`engine/systems/combat/CCManager.ts`、`engine/systems/combat/DamageCalculator.ts`、`engine/systems/status/ControlSystem.ts`、`engine/systems/status/CooldownSystem.ts`、`engine/systems/movement/MotionEngine.ts`、`data/ui/skillEditor.ts`、`components/inspector/InspectorConstants.ts`、`data/skills/*`。新效果的狀態外觀會畫在單位身上：**先讀 `engine/renderers/RenderSpec.ts` 與 `engine/renderers/status/*` 的檔頭**，本輪不得改任何位置、高度、排序規則。
- 從 `main` 開分支 `feat/skill-fix`；`git status` 必須乾淨。先跑一次並記進報告（改前基準；不綠就停下回報）：`npm run lint`、`npx vitest run --dir tests`、`npm run build`、`npm run perf:fidelity`（記下每個場景數值）、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`engine/renderers/RenderSpec.ts`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向。**保真基準一律不得重錄**（見 §3）。
- 不准 `push`、不准動 `main`、不准合併。一個任務一個 commit。

### 1. 目標設計（照做，不要自行改設計；有矛盾就停下回報）

**A. 控制效果作用對象（取代「打敵人就轉給自己」）**
- `Skill` 新增 `ccSelf?: boolean`、`ccSelf2?: boolean`：為 `true` 時，該控制**每次施放只對施法者套用一次**（無論打中幾個、有沒有打中），不再對受擊者套用。
- 刪除 `SkillExecutor` 內「增益打到敵人就改給施法者」的轉向；之後增益只會由 `CCManager` 依極性套給同隊受擊者（`EFFECT_DEFS` 的 polarity 已在擋）。
- 自我套用的實作點：放在現在套用 CC 的同一個流程裡，用一個輔助函式；即時技能在執行時、投射物技能在第一次命中時（以現行 CC 實際套用的位置為準，兩條路徑都要涵蓋）。
- `ccSelf` 加進 `data/ui/skillEditor.ts` 的可編輯欄位與 `InspectorConstants.ts` 的表單（布林用 select：`true`／`false`）。

**B. 三種新效果**（`EffectKind` 加在 `VULNERABLE` 之後、`DOT` 之前；三者 polarity 都是 `BUFF`、`hardCC: false`）

| 效果 | `ccDur` | `ccForce` 的意義 | 規則（唯一實作點） |
| :-- | :-- | :-- | :-- |
| `HASTE` 加速 | 秒 | 百分比（30＝+30%） | 移動速度 ×(1+v/100)（`MotionEngine` 速度乘數，與危害減速相乘）；技能冷卻遞減速度 ×(1+v/100)（`CooldownSystem`）。施法時間不變。 |
| `REFLECT` 反傷 | 秒 | 百分比 | 受到**敵方技能直接傷害**（不含 DOT、危害、墜落、反傷本身）後，對攻擊者造成 實際扣血量×v/100 的真實傷害（`applyDirectDamage`），浮字「反傷」；可致死（走 `agentManager.handleDeadState`）。 |
| `LIFESTEAL` 吸血 | 秒 | 百分比 | 造成技能直接傷害時，額外回復 實際扣血量×v/100（與技能自帶 `VAMP` 相加，走現有吸血回復與浮字流程）。 |

- 寫入：`CCManager.applyCC` 新增三個分支（與 `INVINCIBLE` 同寫法：取較長時間、`max`＝時間、`value`＝ccForce）。遞減由 `ControlSystem` 的 `EFFECT_KINDS` 迴圈自動處理（確認不必改迴圈）。
- 參數上限與浮字顏色放常數（`constants/combat.ts`：`EFFECT_LIMITS = { HASTE_MAX_PCT, REFLECT_MAX_PCT, LIFESTEAL_MAX_PCT }`，值 100；`constants/palette.ts` 的 `DAMAGE_TEXT_COLORS` 加 `REFLECT`）。
- 狀態外觀：`STATUS_VISUALS` 加三筆（label：加速／反傷／吸血；顏色沿用現有色盤）；狀態零件（`STATUS_PARTS`）**沿用現有零件組合**，不新增零件種類、不改畫法與位置。`tests/StatusParts.test.ts` 等登記完整性測試要能涵蓋新效果。
- `Skill.ccType`／`ccType2` 型別聯集加入三者；`InspectorConstants` 的選單同步。

**C. 技能資料修正（逐筆照表，數值只照表填，不得另調）**

| id | 修正 |
| :-- | :-- |
| `tb_a1` 六稜壁障、`tr_a2` 血腥挑釁 | SHIELD 那一格加 `ccSelf`（傷害與擊退／嘲諷照舊打敵人） |
| `wb_b5` 絕對招架 | SHIELD 加 `ccSelf` |
| `tr_b3` 尖刺防禦「反傷準備」 | SHIELD 加 `ccSelf`；`ccType2: 'REFLECT', ccDur2: 3, ccForce2: 20, ccSelf2: true` |
| `tb_a5` 稜鏡反射「反傷護盾」 | SHIELD 加 `ccSelf`；`ccType2: 'REFLECT', ccDur2: 4, ccForce2: 30, ccSelf2: true` |
| `sb_a5` 疾風祝禱「群體加速」 | 保留 SHIELD；`ccType2: 'HASTE', ccDur2: 4, ccForce2: 30`（套給範圍內隊友） |
| `wr_a5` 嗜血狂熱「攻速吸血」 | 刪 `effectType: 'VAMP'`；`ccType: 'HASTE', ccDur: 5, ccForce: 30, ccSelf: true`；`ccType2: 'LIFESTEAL', ccDur2: 5, ccForce2: 30, ccSelf2: true` |
| `wr_u3` 惡魔降臨「單體攻速吸血」 | 原 HOT 改為 `ccType: 'HASTE', ccDur: 6, ccForce: 40, ccSelf: true`；`ccType2: 'LIFESTEAL', ccDur2: 6, ccForce2: 40, ccSelf2: true` |
| `sr_u4` 猩紅血月「全隊吸血」 | `ccType: 'LIFESTEAL', ccDur: 6, ccForce: 30`；原 HOT（6 秒／100）移到 `ccType2` |
| `sb_u1` 神聖干涉「單體無敵」 | `ccType: 'INVINCIBLE', ccDur: 3.5`，`specialVisualStatus: 'INVINCIBLE'`（取代 BANISH／STASIS），治療照舊 |
| 其餘所有「射程 0、SINGLE、`power` ≤ 0、只有增益控制」的技能（例如 `tr_a4` 鮮血護盾、`tr_u3` 不朽屍王） | 增益控制加 `ccSelf`（逐一列在報告；上面已處理的 `tb_a5`、`wr_a5`、`wr_u3` 不重複） |
| `rb_u1` 極地冰河 | `desc` 改「單體凍結」（實際是單體） |
| `wr_u1` 諸神黃昏 | `desc` 改「近身爆發」 |
| `sb_u3` 英勇讚美 | `desc` 改「全隊治療與護盾」 |
| 42 個缺 `element` 的技能 | 依名稱、`visualHitEffect`、顏色補上最貼切的 `element`；**報告列出每一筆與理由**，並列出因此開始生成危害區（`HazardManager`：FIRE／ICE／VOID）的技能 |

- 射程大於 0 的增益技（例如 `sb_a2`、`sr_a2` 對隊友施放）**不加** `ccSelf`。判斷有疑義就列進報告，不要自行擴大範圍。

**D. 資料完整性測試** `tests/SkillDataIntegrity.test.ts`（這輪結束時違規必須為 0）
- 需要持續時間的控制（STUN、SILENCE、ROOT、FEAR、TAUNT、BLIND、BANISH、POLYMORPH、INVINCIBLE、VULNERABLE、DOT、HOT、HASTE、REFLECT、LIFESTEAL）`ccDur > 0`；SHIELD、KNOCKBACK、PULL、DOT、HOT、HASTE、REFLECT、LIFESTEAL 要 `ccForce > 0`；HASTE／REFLECT／LIFESTEAL 的 `ccForce` 不超過 `EFFECT_LIMITS`。
- `power > 0`（傷害技）上的增益控制必須 `ccSelf`；`power < 0`（治療技）上不得有減益控制。
- `effectType: 'VAMP'` 必須 `power > 0`；`type: 'AOE'` 必須有 `aoeRadius`；每個技能都有 `element` 與 `desc`。
- 描述關鍵字對照（暈→STUN、沉默→SILENCE、禁錮→ROOT、恐懼→FEAR、嘲諷→TAUNT、致盲→BLIND、放逐→BANISH、變羊→POLYMORPH、無敵→INVINCIBLE、易傷→VULNERABLE、擊退→KNOCKBACK、牽引→PULL、護盾→SHIELD、吸血→VAMP 或 LIFESTEAL、加速／攻速→HASTE、反傷→REFLECT、突進→DASH、斬殺→EXECUTE）：描述有關鍵字就必須有對應效果。

### 2. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **SK0** | `tests/SkillDataIntegrity.test.ts`（§1 D），違規清單寫在測試內當基準（＝當下實測），**只准減少**。 | lint／test |
| **SK1** | §1 A：`ccSelf`／`ccSelf2`、刪轉向、自我套用輔助函式；表單與可編輯欄位。新增單元測試：AOE 傷害技帶自我護盾打中 3 個敵人時施法者只得到 1 次護盾；沒打中也有護盾。資料先只改 `tb_a1`、`tr_a2`、`wb_b5`、`tr_b3` 的 SHIELD（其餘留給 SK3）。 | lint／test／build／br-soak 10/10 |
| **SK2** | §1 B：三種新效果（型別、`EFFECT_KINDS`、`EFFECT_DEFS`、`CCManager`、三處規則、常數、`STATUS_VISUALS`、狀態零件）。每種效果一個單元測試（加速：冷卻遞減與移動速度倍率；反傷：反彈量、DOT 不觸發、反傷不連鎖；吸血：回復量與 VAMP 相加）。 | lint／test／build／br-soak 10/10 |
| **SK3** | §1 C 全部資料修正。SK0 棘輪必須歸零，改成「0 且不得再出現」。 | lint／test／build／**fidelity**／br-soak 10/10 |
| **REPORT** | `docs/SKILL_FIX_REPORT.md`：每個任務的檔案數、SK0 違規前後數字、42 筆 element 判斷表、新生成危害區的技能、`ccSelf` 套用清單、fidelity 改前／改後每場景數值、br-soak 結果、回退指南（每個任務的 commit）。發現「原本好像是 bug」的地方只記錄，不要順手修。 | — |

### 3. 守則與停下條件
- 數值只照 §1 C 的表填，其他技能的 power、cd、cast、cost、range 一律不動（這輪不做平衡）。
- **保真**：5 張地形基準（VOID、FOREST、ICE、MAGMA、DESERT）必須與改前實測相同（差 0.01 以內）。`battle_frozen` 是種子戰鬥快照，技能行為改了會合理地變動：**不得重錄**，把改前／改後數值與差異圖路徑寫進報告，由主代理審查後決定是否重錄。
- `br-soak` 失敗（幽靈、發呆、或任何種子 battleTime < 5 秒）：還原該任務、找原因。
- 同一個任務失敗 3 次、或發現本文件與程式碼現況矛盾（例如 CC 套用點不只一處、投射物路徑另有轉向）：停下，把發現寫進報告，`git status` 保持乾淨（最後一個 commit 全綠）。
- 單次改動超過 3 個檔案時在 commit 訊息說明；不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加掩蓋症狀的安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「技能跑完了」，主代理會審查 `git diff main...feat/skill-fix`、本機實跑、再問你要不要合併。
2. 實機看：稜鏡反射／尖刺防禦的反傷浮字、疾風祝禱與嗜血狂熱的加速、猩紅血月的吸血、神聖干涉的無敵。
