# 0012 技能為動作清單加狀態機、Agent 不拆元件

狀態：採用
日期：2026-11-04

## 背景

舊版技能資料僅提供有限數量的控制與附帶效果欄位，由 `CCManager` 以 switch 分派並依技能元素隱性決定是否生成危害區，無法實作技能描述承諾的多種機制；同時須決定擴充機制時是否將 `Agent` 改寫為標準 ECS 元件模型。

## 決定

- 技能定義為四個執行時機（`onCast`、`onImpact`、`onHit`、`onEnd`）的動作清單，由 `engine/systems/combat/SkillActions.ts` 的 handler 表逐一執行；危害區改為明寫於 `onImpact` 的 `HAZARD` 動作；外部查詢技能能力一律呼叫 `engine/core/SkillQueries.ts`。
- 施法流程由 `engine/systems/combat/SkillStateMachine.ts`（狀態為 READY／WINDUP／COOLDOWN，由既有欄位推導，不另存一份）與單一入口 `activationBlock` 控制；狀態阻擋規則寫於 `data/status/effect_defs.ts`。
- `engine/core/Agent.ts` 維持扁平純資料容器，不拆成獨立元件儲存。

## 放棄的做法

- 將 `Agent` 與模擬引擎改寫為標準 ECS 元件儲存（`docs/STATE_OWNERSHIP_DESIGN.md` §3.2 已否決）。
- 繼續在固定控制欄位上擴充 switch 分支，或由元素隱性決定危害區。

## 後果

- 新機制依「型別定義 → handler → 對照組測試 → 技能資料」接線，150 招遷移期 `balance:fingerprint` 180 場全數相同；由 `tests/SkillStateMachine.test.ts` 與 `tests/SkillMechanics.test.ts` 把守。
- 技能編輯面板透過 `data/skills/flatView.ts` 在表單欄位與動作清單間轉換，表單無法表達的動作維持原樣保留。

## 證據

- `docs/DECISIONS.md`「AI 與大逃殺」
- `docs/SKILL_PIPELINE_DESIGN.md`、`docs/STATE_OWNERSHIP_DESIGN.md` §3.2
- `engine/core/Agent.ts`、`engine/systems/combat/SkillStateMachine.ts`、`engine/systems/combat/SkillActions.ts`
- `engine/core/SkillQueries.ts`、`data/status/effect_defs.ts`、`data/skills/flatView.ts`
- `tests/SkillStateMachine.test.ts`、`tests/SkillMechanics.test.ts`
- `docs/WORKLOG.md` §2 BK、§2 BL
