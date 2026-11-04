# 技能管線設計

> 2026-11-04 完成。參考 Unreal GAS（Ability 的 CanActivate、Tag 阻擋）、Dota 2 的資料驅動技能（事件加動作清單）、Overwatch Statescript（技能是狀態機）。`Agent` 維持純資料，沒有拆元件（`docs/STATE_OWNERSHIP_DESIGN.md` §3.2）。

## 1. 兩個狀態機

- **單位想做什麼**：`data/ai_profiles.ts` 的 `AI_MODE_GRAPH`。
- **這招做到哪**：`engine/systems/combat/SkillStateMachine.ts`，階段是 READY、WINDUP、COOLDOWN，邊宣告在 `SKILL_PHASE_EDGES`。階段由 `castingSkillIdx`、`curCDs` 推導，不另存一份。

`activationBlock(a, idx)` 是「能不能放、為什麼不能」的唯一答案，`SkillReady` 和 `initiateCast` 都問它。施法欄位在戰鬥系統裡只有狀態機寫（`tests/SkillStateMachine.test.ts` 掃原始碼）。

狀態禁止什麼寫在 `EFFECT_DEFS[kind].blocks`（`MOVE`、`CAST`、`SKILL`），由 `isActionBlocked` 讀。新增控制只改那張表。

## 2. 技能是四個時機的動作清單

| 時機 | 什麼時候 | 動作 |
| :-- | :-- | :-- |
| `onCast` | 前搖走完，分流到瞬發、投射物、天降之前 | `DASH`、`BLINK`、`RETREAT` |
| `onImpact` | 落點，一次施放一次 | `HAZARD`（可帶 `onEnter` 變成陷阱） |
| `onHit` | 打中每個目標 | `STATUS`、`VAMP`、`MANA_BURN`、`MANA_RESTORE`、`EXECUTE`、`SELF_DAMAGE`、`PIERCE`、`RAGE`、`TRUE_STRIKE`、`RANDOM_POWER`、`BREAK_SHIELD`、`DISPEL`、`CHANCE`、`RANDOM_OF`、`CHAIN`、`LINE_THROUGH`、`SWAP` |
| `onEnd` | 結算完，一次施放一次，對自己 | `STATUS` |

每種動作一個 handler，在 `engine/systems/combat/SkillActions.ts`；handler 表的型別要求每種動作都有實作。傷害修飾由 `DamageCalculator` 讀，handler 是空的。其他程式碼要知道一招會做什麼，一律問 `engine/core/SkillQueries.ts`。

**新增機制**：`types.ts` 加型別 → `SkillActions.ts` 加 handler → `tests/SkillMechanics.test.ts` 加對照組 → 資料裝到技能上。

危害區以前由元素和主控制隱性決定，現在是每招明寫的 `onImpact`，改哪招留不留只改資料。

## 3. AI 怎麼挑招

- `intents`：`GAP_CLOSE`（衝向敵人）、`HOOK`（把敵人拉來）、`PEEL`（推開貼身的）、`ESCAPE`（自己脫離）。AI 問意圖，不看動作細節。
- `activation`：技能自己宣告什麼情況值得放。`targetBeyond`（目標在射程內且比這遠）、`enemyWithin`（有敵人靠這麼近）、`minTargets`（範圍內至少幾人）。
- `targetPreference: 'HIGHEST_HP'`：單體大招打血最多的，不浪費在殘血上。
- 機動槽的節點 `MOBILITY` 排在 `ENGAGE`、`FIGHT` 兩棵小樹最前面，先問 `ActivationMet`。

## 4. 機動槽與強制位移

- 第 4 槽（`SKILL_SLOTS.MOBILITY`，索引 3），每職業每隊兩招，大逃殺也抽自己職業的。不花魔力、回 10 魔，靠冷卻 6.5～8.5 秒控頻率，不帶硬控。
- 戰士：突進、鉤。騎士：鉤、推。遊俠、法師：後撤、推。輔助：推、後撤。
- 被定身不能放會移動自己的技能（`activationBlock` 的 `ROOTED`）。
- 強制位移：力道 2 以上至少推 1 格；`UNIT_DB.weight` 是抵銷幾格力道（騎士 2、戰士 1、後排 0）。

## 5. 技能編輯面板

表單欄位不變（兩個控制槽、兩個效果槽、危害區），讀寫經 `data/skills/flatView.ts` 轉成動作清單；表單表達不了的動作轉換時原樣保留。遊戲邏輯不讀這個視圖，測試用 `tests/helpers/flatSkill.ts` 寫技能。

## 6. 關卡

`npm run balance:fingerprint`：同 seed 180 場模擬逐場雜湊所有單位狀態。行為不變的重構必須完全相同；故意改玩法時由主代理 `--record`，commit 訊息寫原因。
