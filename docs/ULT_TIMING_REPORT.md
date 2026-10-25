# ULT-T01 報告：奧義有效詠唱下限 1.5 秒

日期 2026-10-25。執行者：Claude（主代理自己實作）。base `66d9e76`（main），head `e004d34`（分支 `feat/ult-timing`）。這份報告是 ULT-V01 視覺整合的入口依據。

## 1. 50 招 cast（秒，修改前→修改後）

| 職業 | u1 | u2 | u3 | u4 | u5 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| tb | 0.5→1.5 | 0.8→1.5 | 1.2→1.5 | 0.8→1.5 | 0.5→1.5 |
| wb | 0.8→1.5 | 1.0→1.5 | 0.6→1.5 | 0.5→1.5 | 0.3→1.5 |
| rb | 1.0→1.5 | 1.5 | **2.0** | 0.8→1.5 | 0.5→1.5 |
| mb | 1.0→1.5 | 1.2→1.5 | 0.7→1.5 | 1.5 | 1.5 |
| sb | 0.8→1.5 | 1.5 | 1.0→1.5 | 0.8→1.5 | 1.0→1.5 |
| tr | 0.5→1.5 | 0.7→1.5 | 0.3→1.5 | 0.5→1.5 | 0.4→1.5 |
| wr | 0.7→1.5 | 0.4→1.5 | 0.3→1.5 | 0.5→1.5 | 0.7→1.5 |
| rr | 1.2→1.5 | 1.4→1.5 | 1.2→1.5 | 0.3→1.5 | 1.0→1.5 |
| mr | 1.5 | 1.5 | 0.8→1.5 | 1.2→1.5 | 1.3→1.5 |
| sr | 0.8→1.5 | 0.6→1.5 | 0.8→1.5 | 0.5→1.5 | 0.5→1.5 |

改了 43 招；6 招原本就是 1.5，穿日神矢 `rb_u3` 保留 2.0。非 ULT 技能沒有改動（diff 只動到兩個 ult 資料檔）。

## 2. 有效時間流與唯一寫入者

- **規則**：`COMBAT_PARAM.ULT_MIN_CAST_SEC = 1.5`（`constants/combat.ts`）。純函式 `normalizeSkillCast(tag, cast)` 和 `buildSkillUpdate(skill, field, value)` 放在 `data/ui/skillEditor.ts`。
- **skillDB 的寫入入口只有兩個**：
  - 開局時以 `[...DEFAULT_SKILL_DB]` 取得預設資料（`engine/game.ts`）。這份資料本身已經滿足下限，由測試鎖住。
  - `UPDATE_SKILL`（技能資料庫面板）。改用 `buildSkillUpdate`：先驗證單一欄位，再以「套用後的完整技能」套用下限。ULT 改成較短的 cast，或把 tag 改成 ULT 時，cast 都會補到 1.5；NaN、負數照舊拒絕。
- **單位換技能**：`SET_AGENT_SKILL` 只改 `skillIds`，技能物件仍取自 skillDB。
- **施法途中**：
  - 有任何單位正在詠唱某一招時，`UPDATE_SKILL` 拒絕修改這一招。
  - `SET_AGENT_SKILL` 拒絕替換正在詠唱的那一格。
- **只有一個值**：`skill.cast` 本身就是有效值，所以以下都讀同一個數，不存在 0.3 秒和 1.5 秒兩套數值；執行期刻意不另外 clamp：
  - `CombatSystem.initiateCast` 的 `castTimer`／`castingAnimationTimer`
  - 讀條（`BarPainter`、`GaugePainter`、`selectors`）
  - 光環淡入（`UnitAuraPainter`）
  - `CAST_START` payload
  - `VisualSystem` 的 `startDelay = cast − hitAt` 與 F02 的 `lockAt = battleTime + cast`
  - AI 縮圈安全判斷（`BTRegistry`）
- **取消**：沿用既有的 `CAST_BREAK` 與 `SequenceSystem.cancel` 管線，沒有新增中斷原因。

## 3. 變更清單

| 檔案 | 改動 |
| :-- | :-- |
| `constants/combat.ts` | 新增 `ULT_MIN_CAST_SEC`，附說明 |
| `data/skills/blue_ult.ts`、`red_ult.ts` | 43 招 cast 改成 1.5 |
| `data/ui/skillEditor.ts` | `normalizeSkillCast`、`buildSkillUpdate` |
| `engine/systems/ui/UICommandSystem.ts` | `UPDATE_SKILL` 改用候選更新並加施法中拒絕；`SET_AGENT_SKILL` 拒絕替換正在施法的格 |
| `tests/UltCastTiming.test.ts` | 新增 9 項（見 §4） |
| `tests/constants-snapshot.json` | 只新增 `ULT_MIN_CAST_SEC` 一行 |

沒有改傷害、治療、護盾、控場、CD、耗魔、AI 或目標規則，也沒有改視覺配方、facade 和 tick 順序。

## 4. 真實引擎驗證（`tests/UltCastTiming.test.ts`）

- **預設資料**：50 招都 ≥ 1.5；`rb_u3` 是 2.0；其餘 49 招剛好是 1.5。
- **編輯入口**：
  - ULT 改 0.3 會變成 1.5；改 1.8 保留。
  - 改成 NaN 或 −1 會被拒絕。
  - ACTIVE 切成 ULT 會補到 1.5；切回 ACTIVE 後可以改回原值。
- **施法途中**：改 cast、替換該格都會被拒絕；收尾後可以修改。
- **不同 dt**：用 1/144、1/60、1/30 各跑 3 場種子戰鬥（1001～1003，最長 120 秒），每次 ULT 的 `CAST_START`→`CAST_FINISH` 都滿足 `elapsed + dt ≥ cast` 且 `elapsed ≤ cast + dt`。開始那一幀已經先扣一次 dt，所以最多差一個 tick，不會提前。
- **中斷**：詠唱中死亡或暈眩都會發出 `CAST_BREAK`；被打斷的那一次在下一次 `CAST_START` 之前沒有 `CAST_FINISH`。之後重新詠唱是新的一次施法。
- **重置**：詠唱中 `RESET_GAME` 再重開，沒有殘留上一場的結算。

## 5. 指令與退出碼

| 指令 | 退出碼 | 結果 |
| :-- | :-: | :-- |
| `npm run lint` | 0 | |
| `npm test` | 0 | 92 個檔、802 項（只為新常數更新 `ConstantsBarrel` 快照） |
| `npm run build` | 0 | |
| `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0 | battleTime 0.52→4.55 s，0 個頁面錯誤 |
| `npm run perf:guard` | 0 | 保真 6/6，`battle_frozen` 0.000，效能護欄通過 |
| `npm run e2e:ui` | 0 | ALL PASSED |

log 在 `tools/ui-e2e/out/ult-t01/`（不進版控）。

## 6. 未完成與影響

- **平衡沒有跑**：照計畫在 ULT-V01 完成後鎖定 commit 再統一跑。詠唱變長預期會拉長戰鬥時間、提高中斷率，AI 縮圈時也比較少選奧義。
- **ULT-V01 要接的事**：
  - 奧義演出改依 1.5 秒以上的詠唱重新設計起手、中段成形和峰值。目前配方的 `hitAt` 是照舊短詠唱設計的，C1（`hitAt ≤ cast + 0.02`）仍然通過，但前段可能是空的。
  - 演出必須直接讀 `skill.cast` 和 `CAST_START`，不能另建計時。
- **既有現象，這輪沒改**：`skillDB` 是 `DEFAULT_SKILL_DB` 的淺拷貝，面板編輯會改到共用的預設物件（同一頁內其他引擎也會看到）。
