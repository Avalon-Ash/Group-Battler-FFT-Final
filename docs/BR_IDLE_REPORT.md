# 大逃殺單位發呆：第二輪根因與修正

> 分支 `claude/br-idle-priority-315d25`。第一輪（`docs/BR_FIX_REPORT.md`）修的是 `Combat` SEQUENCE→SELECTOR；這輪是使用者仍看到的零星發呆。**沒有加看門狗**，全部對應到可重現的根因。

## 1. 「發呆」的精確定義（`tools/ui-e2e/br-soak.mjs`）

單位同時滿足下列條件、持續 ≥ `--idleGrace` 秒（預設 6，嚴格檢查用 2.5）才算一次 idle 事件：

- 存活，且場上有「可被選為目標」的敵人（存活、未放逐、未出界、腳下格仍存在）；
- 非 stun／放逐／恐懼／stasis；**定身（root）只在「沒有敵人進入普攻射程」時才豁免**（定身仍可出手，射程內站著不打就是 bug）；
- 這段期間 (a) 像素位移 ≤ `--idleMovePx`（3）、(b) 從未在詠唱、(c) 沒有任何技能被發動（沒有冷卻值上升）。

`isMoving`／`actionState` 這類**自報狀態不算活動**（可能過期，成因 B 就是它們說謊）。事件快照新增：最後一次 BT tick 走過的節點與結果（`btTrace`）、各技能 CD／MP／射程、鎖定計時、縮圈計時與層級、六鄰格狀態、尋路探針（`probe`）、每個 Action 節點的最近呼叫紀錄（`actLog`）。新增旗標：`--assert-idle`、`--seedStart=`、`--idleMovePx=`；`TRACE_AGENT=<id> TRACE_FROM=<秒>` 可逐幀追單一單位（並抓 `isMoving` 被誰清掉）。附帶修了舊 harness 一個 bug：事件快照讀 `l.time.toFixed`（time 是字串）會在第一次偵測到 idle 時直接崩潰。

## 2. 發現與分類

基準（修前，40 seeds，`shrinkInterval=3`）：

| 門檻 | idle 事件 | 說明 |
| :-- | :-- | :-- |
| 6 s | 3（3 seeds） | 全是成因 A |
| 2.5 s（A 修好後） | 21（13 seeds） | B 5、C 11、D 5 |

| 成因 | BT 路徑特徵 | 根因 |
| :-- | :-- | :-- |
| **A** 逃生「到達」卻沒動 | `Survival → Run!=S`，單位站在敵方 hazard（GRAVITY）上，每 0.08 s 記一次「已抵達」 | `getEffectiveRange(..., baseRange=0)` 仍套用高低差加成：站高處逃往相鄰低格，有效射程 = 1，`moveAgentToHex` 判定「已在射程內」直接回 SUCCESS，**不動**。`Survival` 序列成功，`Combat` 永遠輪不到。 |
| **B** 被定身仍一直「逃」 | `Run!=R`，`isMoving=1/path=1` 卻 `moveProgress` 恆為 0 | `ControlSystem` 每幀因 `rootTimer>0` 清掉 `isMoving/path`；BT 每 tick 又重設。`Run!` 因此永遠 RUNNING，定身者就算敵人貼身也不出手。 |
| **C** 被困在塌陷格站樁 | `Run!=F → Combat → Gap Close: Stick To Target=S`（`warn=true`） | `HasEscapeRoute` 為假（鄰格全塌陷／被佔／敵方 hazard）時，`SkillReady` 的「塌陷格不准普攻／長詠唱」仍生效；`ChaseTarget` 在射程內回 SUCCESS（沒事做的 SUCCESS）。結果：逃不掉又不還手，乾站到塌陷。 |
| **D** 追擊被拒後 Idle | `Move To Spot=F, Chase=F, Stick To Target=F, Idle=S`（我安全、目標也安全） | `MoveToOptimal`／`ChaseTarget` 用「目標腳下有無危險」判斷，目標站在敵方（含我方自己丟的）hazard 或塌陷格時直接 FAILURE，沒有後備走位，掉到 `Idle`。 |

其餘排查過、**未**成為成因：`_interruptCooldown`／`_castCompleteCooldown` 鎖定迴圈（事件快照中鎖定皆為 0）、目標選到不可達目標（`probe` 皆有路徑）、逃生 vs 攻擊乒乓（無）。

另有 2 件在 harness 修正前被歸為 idle、實為合法：場上所有敵人都被放逐／腳下格已塌（`HasTarget` 失敗，沒有可打的人）。已納入定義的豁免。

## 3. 修正（明確優先序，資料驅動）

`data/ai_profiles.ts` 檔頭寫明優先序（SELECTOR 由上到下，順序即優先序，不比權重）：

1. Dead／CC → 2. **Survival: Run!**（走得動、有路）→ 3. **Last Stand** 推拉 → 4. **Combat: Skill Priority**（Ult > Active > Basic；被釘住時原地戰鬥）→ 5. **Gap Close** → 6. **Reposition**（新）→ 7. **Idle**（最後手段）

邏輯在 `engine/ai/BTRegistry.ts`：

- **A**：`TargetingSystem.getEffectiveRange` 在 `baseRange===0`（精確抵達該格：逃生、自身 PBAOE）直接回 0，不吃高低差。`EscapeWarning` 抵達後若腳下仍危險回 FAILURE，不再以 SUCCESS 吞掉整個 tick。
- **B**：新條件 `CanMove`（root／stun／放逐／恐懼為假）。`EscapeWarning`、`MoveToOptimal` 在不能動時回 FAILURE；`ChaseTarget` 不能動時「射程內 = SUCCESS（就位），否則 FAILURE」，絕不 RUNNING。
- **C**：新條件 `IsPinned`（不能動，或站在塌陷格但無逃生路）。`SkillReady` 的塌陷格保護只在**未被釘住**時生效，被釘住就原地出手。
- **D**：新 helper `approachEndsOnCollapse`：只檢查「靠近後停下的那一格」是否即將塌陷（致死），目標腳下的 hazard 只是扣血、路徑成本已懲罰，不再拒絕追擊。新 Action `Reposition`：追擊被拒時往「嚴格更靠近目標、非塌陷、無敵方 hazard、無人佔用」的安全格挪（半徑 3，不會來回震盪），找不到才交給 `Idle`。

## 4. 驗證

| 項目 | 結果 |
| :-- | :-- |
| soak 40 seeds，`shrinkInterval=3`，idleGrace 6 | idle **0**、ghost **0**（修前 idle 3） |
| soak 40 seeds，`shrinkInterval=3`，idleGrace 2.5 | idle **0**、ghost 0（修前 21） |
| soak 40 seeds，`shrinkInterval=10`（遊戲預設），idleGrace 6（只在 A 修好後測，未再重跑） | idle 0、ghost 0 |
| `npm run lint` | 通過 |
| `npx vitest run --dir tests` | 464 全過（新增 `tests/AIIdlePriority.test.ts` 14 則；對修前程式碼會有 12 則失敗，確認不是空測試） |
| `npm run build` | 通過 |
| `npm run perf:guard` | 通過（battle_frozen meanAbsDiff 0.280 ≤ 0.8，基準未重錄、門檻未動） |

注意：soak 的單一 seed 在整批連跑與單獨跑時對局不完全相同（對局亂數受先前生成影響），所以逐 seed 比對修前修後不可靠，以整批總數為準。

## 5. 已知限制／後續

- `tests/AIIdle.test.ts` 既有的幾則測試在 `addAgent` 回 null 時直接 `return`，預設地圖有障礙物時可能空轉；新測試先清地形並在 `addAgent` 失敗時 throw。建議之後把舊測試一併改掉。
- `HasEscapeRoute`（`Pathfinder.canEscape`）把「被友軍佔住的安全鄰格」視為不可逃；擁擠時單位會判定被釘住而原地戰鬥，不是發呆但可能不如擠出去。要改需評估與 `StackingResolver` 的互動，這輪沒動。
- `EscapeWarning` 的鄰格備援評分把敵方 hazard（100）排得比塌陷格（10）更差，與「塌陷致死、hazard 只扣血」的直覺相反；只在 `HasEscapeRoute` 為真且尋路失敗時才走到，這輪的 soak 沒遇到，未改。
