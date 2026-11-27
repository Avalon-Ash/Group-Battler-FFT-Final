# 提案：「這招出手時會不會移動自己」只判斷一處

> 狀態：已完成（2026-11-26，使用者同意，WORKLOG §2 DN）。提議於 2026-11-24（主代理 Opus）。`retreated` 照 §2 改用 `castMotion === 'BACK'`。
> 起因：2026-11-24 PLAY 選目標要問「機動技會不會位移」，新增了 `SkillQueries.castMotion`；同一件事另外還有三處各自讀 `skill.onCast`（全域憲法：既有耦合先回報、先提案）。

## 1. 現況（`git grep -n "onCast" engine`，資料檔除外）

| 位置 | 判斷 | 用途 | 和 `castMotion` 的關係 |
| :-- | :-- | :-- | :-- |
| `engine/systems/ui/castTargeting.ts`（`targetModeOf`） | `castMotion(skill)` | PLAY 選目標方式 | 本身 |
| `engine/systems/combat/SkillExecutor.ts:91` `mobilityDash` | `tag === 'MOBILITY'` 且 `onCast` 有 `DASH` | 突進類 AOE 以落點為中心（`:93`），主目標改用近戰格判定（`:145`） | **不同**：不含 `BLINK` |
| `engine/systems/combat/SkillExecutor.ts:92` `retreated` | `onCast` 有 `RETREAT` | 後撤後主目標免射程檢查（`SkillExecutor.ts:145`：退開了仍打得到出手時鎖定的目標） | 等於 `castMotion === 'BACK'` |
| `engine/systems/combat/SkillExecutor.ts:108` | `!skill.onCast?.length` | 有出手位移的不再前衝（lunge） | 目前等於 `castMotion === null` |
| `engine/systems/combat/SkillStateMachine.ts:49` | `skill.onCast?.length` | 定身時不能放「會移動自己」的招（DECISIONS 2026-11-04） | 目前等於 `castMotion !== null` |
| `engine/ai/BTRegistry.ts:110` `hasLanding` | 逐個動作規劃落點（要 `tiles`） | AI 判斷有沒有地方落 | 不是判斷式，**不收** |

「目前等於」成立的前提：`types.ts` 的 `CastAction` 只有 `DASH`、`BLINK`、`RETREAT` 三種，全都是移動自己。之後若加入不移動自己的出手動作，`onCast.length` 的兩處會悄悄變意思——這正是要收斂的理由。

## 2. 改法

- `SkillQueries` 再加一個 `movesSelf(skill) = castMotion(skill) !== null`；`SkillExecutor.ts:108`、`SkillStateMachine.ts:49` 改用它，`SkillExecutor.ts:92` 改用 `castMotion(skill) === 'BACK'`。
- `SkillExecutor.ts:91` 的 `mobilityDash` **保留**「只有 DASH」的語意，但改成讀 `SkillQueries` 的一個具名查詢（例如 `hasCastAction(skill, 'DASH')`），不在執行器裡直接掃 `onCast`。要不要把 `BLINK` 也算進去是玩法決定，不在本案。
- `castMotion` 加一個型別層的保護：`CastAction` 新增種類時，`castMotion` 的 switch 少處理一種就編譯失敗（`never` 檢查），逼新增者決定它算不算移動。
- `BTRegistry.hasLanding` 不動。

## 3. 怎麼證明行為不變

- `npm run balance:fingerprint` 180/180（模擬逐位元相同）。
- `npm test`（`SkillMechanics`、`PlayerOrders`、`PLAY` 契約）、lint、build、knip。
- 改的是同義替換：`CastAction` 目前三種全是移動，所以 `onCast.length > 0 ⇔ castMotion !== null`；`mobilityDash` 的語意不變（仍只看 DASH）。

## 4. 回退

一個 commit，`git revert`。

## 5. 規模與執行者

3 個引擎檔＋`SkillQueries`＋1 則型別保護測試，小而機械：主代理自己做，或派 agy Hydrogen（紅色驗收＝指紋 180/180）。
