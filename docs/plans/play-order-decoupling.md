# 開案書：PLAY 指令路徑的三項既有耦合（2026-11-26）

> 撰寫：Fable 5.2 子代理（設計顧問）。只有研究與設計，沒有改程式、沒有 commit。
> 狀態：提議，等使用者同意才動工。第 1 項要使用者在選項裡選一個（§2.4）。
> 來源：2026-11-25 K1～K4 終審列的三項架構問題（`docs/HANDOFF.md` §2 PLAY 那條）。
> 行號以 2026-11-26 的 `main`（`08f81481`）為準。

## 0. 結論（只讀這段就能拍板）

1. **`applyPlayerOrder` 直接呼叫戰鬥與移動系統：不改走 `engine.bus`，只搬家。** 改走 bus 行不通：回放快轉時 bus 是靜音的，ADR 0019 已經禁止模擬層訂閱 bus（有測試把守），走 bus 的指令在回放裡會漏掉。業界（OpenRA、0 A.D.）和本專案現有程式也都是「指令驗證後直接呼叫單位的 API」。真正的問題是「套用打斷」寫在 UI 系統裡，之後 L4 的 AI 指令進不來。建議把這 14 行搬到模擬層的單一入口 `applyOrder`（新檔），`UICommandSystem` 回到 ADR 0022 說的「只驗證」。**合約裡「系統之間只透過 `engine.bus`」那一句和 ADR 0019、和現有程式都不一致，要使用者同意改寫並新開 ADR 0027**；不同意就維持現狀、只補註解。
2. **`currentTelegraph` 有三個寫入者：收給 `SkillStateMachine` 一個。** 進前搖時由 `beginWindup` 寫、離開前搖時由 `endWindup` 清（狀態機的進入／離開動作），`CombatSystem`、`CastingEngine` 不再直接寫，欄位登記進 `AgentOwnership` 讓棘輪測試守住。純重構，行為不變，不用使用者決定。
3. **`PlayHUD` 自己判斷拖曳門檻：把「超過門檻沒」收成 `tapIntent.ts` 的一個純函式**，`useGameInput` 兩處直接讀它，`PlayHUD` 經既有的 `PlayPointerPort` 問（元件不能直接 import 引擎的這個模組）。Unity、Android 都是全系統一個門檻、元件不自己比。整段拖曳狀態機先不搬出 `PlayHUD`（只有一個使用者，搬了是過度設計）。純重構，不用使用者決定。

三包都小（各 3～5 檔），互不相依，建議主代理自己做。全部不重錄任何基準；任何一包讓 `balance:fingerprint` 不是 180／180 就停。

## 1. 研究：業界怎麼做

只寫實際讀到的，都用轉述。讀不到的列在 §1.4。

### 1.1 指令路徑（第 1 項）

| 來源 | 讀到什麼 |
| :-- | :-- |
| Game Programming Patterns〈Command〉 | 輸入處理只產生指令、不執行；由消費端對指定角色執行。AI 也產生同一種指令物件，所以玩家與 AI 可以互換（書裡舉的例子是把 AI 接到玩家角色上做展示模式）；指令流可以記錄下來重播。 |
| Game Programming Patterns〈Event Queue〉 | 佇列只在需要把送出與處理在時間上錯開時才值得用；送出者需要回應時不適合；複雜度本身是成本，能用更簡單的模式就不要加。 |
| OpenRA `UnitOrders.cs` | 指令到達後先過全部驗證器（`OrderValidators`），通過才呼叫 `order.Subject.ResolveOrder(order)`。驗證與套用是兩段，套用是直接呼叫。 |
| OpenRA `Mobile.cs` | `IssueOrder` 只建立指令物件；`ResolveOrder` 在模擬側直接改單位的活動：Move 是 `QueueActivity`，Stop 是 `CancelActivity`。沒有經事件匯流排。 |
| OpenRA bot `StateBase.cs` | 機器人下令是 `Bot.QueueOrder(new Order("Move", …))`：和 `Mobile.cs` 消化的是同一種 `Order`、同一個 "Move" 字串。 |
| 0 A.D. `Commands.js` | `ProcessCommand(player, cmd)` 先濾掉該玩家不能控制的單位（`CanControlUnit`），再查表 `g_Commands[cmd.type]`；walk／attack／stop 直接呼叫 UnitAI 的 `Walk`、`Attack`、`Stop`。目標合不合法留給 UnitAI 自己檢查。 |
| 0 A.D. AI `entity.js` | AI 用 `Engine.PostCommand(PlayerID, { type: "walk" … })`、`"attack"`、`"stop"`：和 `Commands.js` 查表的型別字串相同。 |

共通形狀：**產生指令（輸入或 AI）→ 佇列／紀錄 → 驗證 → 一個模擬側的入口直接呼叫單位 API**。讀到的沒有一個是「驗證後發事件、各系統各自訂閱」。

### 1.2 狀態欄位的擁有者（第 2 項）

Game Programming Patterns〈State〉：跟某個狀態綁在一起的設定與清理，放在那個狀態的進入動作與離開動作；離開動作就是切換前對「要離開的那個狀態」呼叫的方法，不必在每一條轉移上各寫一次。預警格是「前搖」這個狀態的附屬資料，正好是這個形狀。

### 1.3 拖曳門檻（第 3 項）

| 來源 | 讀到什麼 |
| :-- | :-- |
| Unity `EventSystem` API 頁 | `pixelDragThreshold` 是 EventSystem 上的一個整數屬性，說明是拖曳的緩衝範圍（像素）。 |
| Unity 文件（搜尋摘要，沒逐頁讀） | Inspector 上是 EventSystem 的「Drag Threshold」一欄；個別手勢可用 `PointerEventData.useDragThreshold` 選擇不套用。 |
| Android `ViewConfiguration` | 這個類別集中放 UI 用的標準常數；`getScaledTouchSlop()` 是觸控可以漂移多少像素才算開始捲動，各 View 讀它。 |

共通形狀：**門檻定義一處、「開始拖了沒」由輸入層回答，元件只收結果。**

### 1.4 沒讀到的

- LoL、StarCraft II、Warcraft III 的內部指令架構：沒有公開原始碼，沒讀到，本文不引用。
- Dota 2：Valve 開發者 wiki（Bot Scripting、`ExecuteOrderFromTable`）回 403；moddota API 頁抓不到內容。只有搜尋摘要提到 `ExecuteOrderFromTable` 用一張表下令，沒讀到原文，不當依據。
- GDC 講稿、Godot／Unity 的 RTS 範例專案：沒讀。
- OpenRA、0 A.D. 的玩家介面怎麼組出指令：沒讀那一側的檔，只從型別字串相同推論同一入口。

### 1.5 來源網址

- https://gameprogrammingpatterns.com/command.html
- https://gameprogrammingpatterns.com/event-queue.html
- https://gameprogrammingpatterns.com/state.html
- https://raw.githubusercontent.com/OpenRA/OpenRA/bleed/OpenRA.Game/Network/UnitOrders.cs
- https://raw.githubusercontent.com/OpenRA/OpenRA/bleed/OpenRA.Mods.Common/Traits/Mobile.cs
- https://raw.githubusercontent.com/OpenRA/OpenRA/bleed/OpenRA.Mods.Common/Traits/BotModules/Squads/States/StateBase.cs
- https://raw.githubusercontent.com/0ad/0ad/master/binaries/data/mods/public/simulation/helpers/Commands.js
- https://raw.githubusercontent.com/0ad/0ad/master/binaries/data/mods/public/simulation/ai/common-api/entity.js
- https://docs.unity3d.com/Packages/com.unity.ugui@1.0/api/UnityEngine.EventSystems.EventSystem.html
- https://docs.unity3d.com/462/Documentation/ScriptReference/EventSystems.EventSystem-pixelDragThreshold.html （搜尋摘要）
- https://developer.android.com/reference/android/view/ViewConfiguration

## 2. 第 1 項：`applyPlayerOrder` 直接呼叫戰鬥與移動系統

### 2.1 現況

- `engine/systems/ui/UICommandSystem.ts:103-117`：`applyPlayerOrder(agent, order)` 讀 `orderInterrupts`（規則，`engine/core/Orders.ts:62-68`），然後直接做四件事：
  - `:106` `this.engine.combat.cancelCast(agent, this.engine)`
  - `:107` `stopMovement(agent)`（`engine/systems/movement/MotionCommands.ts:23`）
  - `:108` `this.engine.movement.allowImmediateRepath(agent)`（`engine/systems/movement/MovementSystem.ts:71`）
  - `:109-116` 清掉或寫入指令；`ORDER_STOP` 另外寫 `aiUpdateTimer`、`forceAiUpdate`（`:112-113`）
- 呼叫它的是四個指令的驗證分支：`:530`（`ORDER_MOVE`）、`:538`（`ORDER_ATTACK`）、`:565`（`ORDER_CAST`）、`:574`（`ORDER_STOP`）。
- 這條路**已經在指令管線裡**：`ORDER_*` 是 `GameCommand`，戰鬥中進佇列（`:66-68`）、tick 開頭套用（`engine/game.ts:350` 的 `flushQueued`）、套用前寫進紀錄（`:85`）。回放、undo 都吃得到。所以「沒走指令管線」不成立；成立的是「沒走 `engine.bus`」。

### 2.2 `engine.bus` 在本專案實際怎麼用

- **模擬層不准訂閱 bus**：ADR 0019（`docs/adr/0019-undo-by-rerun.md:13`、`:23`）決定回放快轉時把 bus 靜音、只放行 `UI_COMMAND`（`engine/core/Replay.ts:123`），所以「模擬層禁止監聽會被快轉靜音的事件」，由 `tests/SimBusListeners.test.ts` 把守。ADR 0021 也因為同一個理由不讓 `MatchFlowSystem` 訂閱 bus（`docs/adr/0021-match-flow-in-engine.md:13`、`:19`）。
- 實際訂閱者全在表現層、音訊、UI 與組合層。指令：`grep -rn "bus\.on(" engine hooks components`，結果只有 `DirectorSystem`、`VFXSystem`、`engine/renderer.ts`、`AudioSystem`、`UICommandSystem`（收 `UI_COMMAND`）、`useGameApp`、`GameCanvas`。
- 模擬層要別的系統改狀態時，現有做法就是直接呼叫擁有者的 API：
  - `engine/ai/BTRegistry.ts:597`、`:685`、`:1043` 呼叫 `engine.combat.breakCast`；`:995` 呼叫 `engine.movement.forceStep`
  - `engine/systems/combat/CCManager.ts:180` 呼叫 `engine.combat.breakCast`
  - `stopMovement(...)` 被 `BTRegistry`、`CCManager`、`SkillActions`、`ControlSystem`、`StackingResolver` 直接呼叫（`engine/core/AgentOwnership.ts:52` 的註記：其他系統一律呼叫 `MotionCommands.stopMovement`）
  - ADR 0002 的決定也是「跨域修改必須透過擁有者匯出的寫入 API」。
- 所以合約那一句（`AGENTS.md:30`「Systems never call another system's methods directly」、`CLAUDE.md:24`、`docs/METHODOLOGY.md:15`、審查清單 `.claude/agents/reviewer.md:23` 與 `.codex/agents/reviewer.toml:22`）和 ADR 0002、0019 以及程式都不一致。實際的規則是：**改狀態＝呼叫擁有者的 API；通知表現層＝bus**。`applyPlayerOrder` 的三個呼叫都是前者，而且呼叫的都是擁有者開的入口（`cancelCast`、`stopMovement`、`allowImmediateRepath`），沒有違反單一擁有者。

### 2.3 真正的問題

1. **職責放錯地方**：ADR 0022 的落點①是「`UICommandSystem` 只驗證合法性」，但現在它還負責「套用打斷」。
2. **L4 進不來**：之後行為樹資料化，AI 節點若要「下一道指令」，沒有入口可用（入口是 `UICommandSystem` 的 private 方法，前面綁著「必須是玩家單位」的驗證）。
3. `:112-113` 在 UI 系統裡寫 `aiUpdateTimer`、`forceAiUpdate`（這兩個欄位不在所有權表，寫入者本來就多：`engine/game.ts:430-431`、`engine/core/Orders.ts:21`、`CastingEngine.ts:108`、`CCManager.ts:183`、`HazardSystem.ts:61`、`ZoneSystem.ts:230`）。

### 2.4 選項（要使用者選）

| 選項 | 做法 | 優點 | 代價 |
| :-- | :-- | :-- | :-- |
| **A（建議）搬到模擬層的單一入口** | 新檔 `engine/systems/orders/OrderIntake.ts`，匯出 `applyOrder(engine, agent, order)`，內容就是現在 `applyPlayerOrder` 的函式本體原封不動。`UICommandSystem` 四個分支驗證完呼叫它。 | 和 OpenRA（`ResolveOrder`）、0 A.D.（`g_Commands`）同形狀；`UICommandSystem` 回到只驗證；L4 有入口；行為逐位元不變。 | 仍是直接呼叫，要改合約那一句並寫 ADR 0027。 |
| B 改走 bus 事件 | `UICommandSystem` 發 `ORDER_ACCEPTED`，`CombatSystem`、`MovementSystem` 各自訂閱後取消前搖、解除節流。 | 字面符合 `AGENTS.md:30`。 | **要推翻 ADR 0019**：模擬層不准訂閱 bus，快轉時事件被靜音，回放與 undo 裡的打斷會漏掉；要把新事件加進放行清單並改 `tests/SimBusListeners.test.ts`。另外：呼叫順序改由訂閱順序決定（取消前搖要在寫入指令之前，現在由程式順序保證）、多一個事件型別。 |
| C 掛旗標、由擁有者自己消化 | `Orders.ts` 在 `Agent` 上記「待取消前搖」，`CombatSystem.update`、`MovementSystem` 下一次更新時讀。 | 沒有跨系統呼叫。 | **時機會變**：取消從 tick 開頭（`engine/game.ts:350`）延到 `combat.update`（`:414`），和 ADR 0026「打斷發生在套用指令的那一個 tick 開頭」不同，中間隔著冷卻、狀態、控制的更新（`:404-406`），結果可能不同（沒驗證）。`Agent` 多一個欄位。 |
| D 不動 | 只在 `applyPlayerOrder` 上補註解，說明這是指令套用點。 | 零風險。 | 問題 1、2 留著，L4 開案時再處理；合約字面的矛盾也留著。 |

**建議 A。** B 要推翻 ADR 0019、C 會改行為，照派工單的停問條款都不硬給；A 不推翻任何 ADR。

### 2.5 A 的設計細節

- **新檔** `engine/systems/orders/OrderIntake.ts`（方框檔頭照慣例）：
  ```ts
  /** 套用一道已驗證的指令（null＝停止）：照 Orders.orderInterrupts 取消前搖、停步、解除換路節流，再寫入或清掉指令。 */
  export function applyOrder(engine: GameEngine, agent: Agent, order: Order | null): void
  ```
  內容＝`UICommandSystem.ts:105-116` 原樣搬過來（含 `:112-113` 兩行，保持行為）。純函式入口，不是新的 System 類別，不掛到 `engine/game.ts`（不動 Facade）。
- **誰擁有什麼**（都不變）：規則在 `engine/core/Orders.ts` 的 `orderInterrupts`；`Agent.order` 只由 `Orders.ts` 寫；前搖欄位只由 `SkillStateMachine` 寫（經 `CombatSystem.cancelCast`）；`nextRepathAt` 只由 `MovementSystem` 寫；`isMoving`／`path` 經 `stopMovement`。`OrderIntake` 自己不擁有任何欄位，只是「依規則呼叫各擁有者」的那一處。
- **資料流**：輸入（`tapIntent` 的結果）→ `UI_COMMAND` → `UICommandSystem`（佇列、紀錄、驗證：是不是玩家單位、目標合不合法、冷卻魔力拒收）→ `applyOrder` → 各擁有者的 API → `Agent.order` → 玩家模式圖的 `Order*` 節點執行。
- **不放 `engine/core/`**：`engine/core` 目前沒有任何檔案 import `engine/systems`（`grep -rn "from '\.\./systems" engine/core` 無結果），不要破這個方向。
- **不新增型別、不新增常數。** `Order`、`OrderInterrupt` 沿用。
- **簽名不寫「player」**，但現在唯一的呼叫者是 `UICommandSystem`（已驗證 `controller === 'PLAYER'`），所以行為不變。
- **合約文字**（主代理改，使用者同意後）：
  - 同一句話有五處，一起改成實際規則（要別的系統改狀態，呼叫該欄位擁有者開的 API；`engine.bus` 只用來通知表現層、音訊、UI、組合層，模擬系統不訂閱）：`AGENTS.md:30`、`CLAUDE.md:24`、`docs/METHODOLOGY.md:15`、`.claude/agents/reviewer.md:23`、`.codex/agents/reviewer.toml:22`（後兩個照 `codex-dispatch` skill 同步）。
  - `AGENTS.md:43`（G3 那條）補一句：驗證後交給 `OrderIntake.applyOrder` 套用。
  - 新 ADR `docs/adr/0027-…`：記錄「改狀態直接呼叫擁有者、bus 只通知」與「指令套用點在模擬層」。它和 ADR 0002、0019、0021 一致，也不推翻 0022、0026（0022 的三個落點不變，只是把夾在①裡的套用拿出來）；被取代的只有合約裡那一句。寫法照 `adr` skill，並在 `docs/DECISIONS.md` 加索引列。

### 2.6 和 L4（行為樹資料化）的關係

- A 之後，「產生指令」的來源可以不只玩家：GPP、OpenRA、0 A.D. 都是 AI 和玩家產生同一種指令物件、走同一個消化入口。`Order` 這個型別就是共用詞彙。
- **但現在不設計 AI 走這條路**。ADR 0026 的打斷規則（新指令取消前搖、不進冷卻）只對玩家；AI 若也經 `applyOrder`，被打斷的行為與指紋都會變。這是 L4 開案時的決定，列在 §8 的停問點。

### 2.7 改哪些檔（選 A）

| 檔案 | 改動 |
| :-- | :-- |
| `engine/systems/orders/OrderIntake.ts`（新） | `applyOrder`，內容自 `UICommandSystem.ts:105-116` 搬來 |
| `engine/systems/ui/UICommandSystem.ts` | 刪 `applyPlayerOrder`（`:103-117`），四個呼叫點改 `applyOrder(this.engine, agent, …)`；清掉不再用的 import（`:512` 的 `SET_CONTROLLER` 還在用 `stopMovement`、`:508` 還在用 `clearOrder`，留著） |
| `engine/core/Orders.ts` | 只改方框檔頭「上游」一行（多了 `OrderIntake`） |
| `AGENTS.md`、`CLAUDE.md`、`docs/METHODOLOGY.md`、`.claude/agents/reviewer.md`、`.codex/agents/reviewer.toml` | §2.5 的那一句 |
| `docs/adr/0027-*.md`（新）、`docs/DECISIONS.md` | ADR 與索引列 |

合約檔在工作階段中途改，下一個工作階段才生效：D3 排在收尾時做。

不在範圍內（看到了，不順手改）：`UICommandSystem.ts:507-513` 的 `SET_CONTROLLER` 也直接呼叫 `AgentManager.rebuildAI`、`stopMovement`；`aiUpdateTimer`／`forceAiUpdate` 的多個寫入者。

## 3. 第 2 項：`currentTelegraph` 有多個寫入者

### 3.1 現況

指令：`grep -rn "currentTelegraph" engine`。

| 位置 | 動作 |
| :-- | :-- |
| `engine/systems/combat/CombatSystem.ts:68` | 開始前搖且會發 `CAST_START` 的招（`announcesCast`）：寫入 `getImpactArea(...)` 的結果 |
| `engine/systems/combat/CastingEngine.ts:106` | `resetCaster`（完成、被打斷、死亡）：`endWindup` 之後清成 null |
| `engine/systems/combat/SkillStateMachine.ts:149` | `cancelWindup`（玩家取消）：`endWindup` 之後清成 null |
| `engine/core/AgentLifecycle.ts:50` | 重設單位時清掉（生命週期，正常） |

- 讀它的只有表現：`engine/renderers/grid/GridRenderStrategy.ts:65-68`（畫預警格）、`CastingEngine.ts:65`、`:93`（`CAST_BREAK` 事件帶的 `hexes`）。
- 它**不在** `engine/core/AgentOwnership.ts` 的 `AGENT_FIELD_OWNERS` 裡（`grep -n currentTelegraph engine/core/AgentOwnership.ts` 無結果），所以 `tests/AgentOwnership.test.ts` 的棘輪沒在守，K1 才會在 `SkillStateMachine` 再加一個寫入點而沒被擋。
- `SkillStateMachine.ts` 的檔頭自己寫「施法狀態欄位的唯一寫入處」，其他前搖欄位（`castingSkillIdx`、`castTimer`、`castingAnimationTimer`、`castTarget`）都已經收在 `beginWindup`／`endWindup`。只有 `currentTelegraph` 漏在外面。
- 兩個清除點都緊跟在 `endWindup` 後面：`endWindup` 只有這兩個呼叫者（`grep -rn "endWindup(" engine`：`CastingEngine.ts:105`、`SkillStateMachine.ts:148`）。

### 3.2 結論設計

**擁有者：`SkillStateMachine`（single）。** 預警格是前搖狀態的附屬資料：進前搖時定下、離開前搖時清掉（§1.2 的進入／離開動作）。

- `beginWindup(a, idx, skill, telegraph: Hex[] | null = null)`：多收一個參數並寫入 `a.currentTelegraph`。預設 null，`tests/UltManaDrain.test.ts:57` 的既有呼叫不用改。
- `endWindup(a, completed)`：加一行 `a.currentTelegraph = null`。
- `cancelWindup`：刪掉 `:149`（`endWindup` 已經清了）。
- `CastingEngine.resetCaster`：刪掉 `:106`。
- `CombatSystem.initiateCast`：把 `:67-68` 的計算移到 `beginWindup` 之前，結果當參數傳入；不發 `CAST_START` 的招（普攻、`cast` 為 0）傳 null，和現在一樣不寫。
  - 可以前移的依據：`getImpactArea`（`engine/ai/TargetingSystem.ts:413-419`）只讀 `targetHex`、`skill`、`spatial.isValid`，不讀施法者狀態、不用亂數；`castAim`（`SkillStateMachine.ts:167-169`）讀 `castTarget`／`target`，`beginWindup` 不寫這兩個欄位。所以算在 `beginWindup` 前後結果相同。
- `AGENT_FIELD_OWNERS` 加一筆：`currentTelegraph: { group: 'casting', kind: 'single', owners: ['engine/systems/combat/SkillStateMachine.ts'], lifecycle: ['engine/core/AgentLifecycle.ts'], note: … }`。之後誰再直接寫就會被 `tests/AgentOwnership.test.ts` 擋下（基準 `tests/agent-ownership.baseline.json` 目前是 `[]`，不用動）。
- 不新增型別、不新增常數。`CombatSystem` 仍負責「算哪些格」（它知道技能與目標），狀態機只負責存與清。

**為什麼不登記成 domain 就好**：所有權表有 `kind: 'domain'`（同一 tick 階段的一組模組算同一擁有者，`_interruptCooldown` 就是），`docs/STATE_OWNERSHIP_DESIGN.md:48` 當初也把這個欄位標成「戰鬥域內」。把三個檔登記成 domain、程式一行不改，也過得了 ADR 0002。不選它的理由：三個寫入點裡有兩個是同一個動作（離開前搖要清）各寫一次，正是「同一個判斷出現在兩處」；K1 加第三個清除點就是因為沒有單一出口。收成 single 的代價只有約 20 行，而且和其他前搖欄位的管法一致。

### 3.3 為什麼行為不變

- 寫入：值相同（§3.2 的前移依據），時機都在 `initiateCast` 同一次呼叫內，中間沒有人讀。
- 清除：兩條路原本就是「`endWindup` 的下一行清」，移進 `endWindup` 後時機相同。
- `CAST_BREAK` 讀 `hexes`（`CastingEngine.ts:65`、`:93`）都在 `resetCaster`（`:69`、`:99`）之前，順序不變。
- 完成時 `onComplete(a)`（`:48`）在 `resetCaster`（`:49`）之前，`completeCast` 不讀預警格。

### 3.4 改哪些檔

`engine/systems/combat/SkillStateMachine.ts`、`engine/systems/combat/CombatSystem.ts`、`engine/systems/combat/CastingEngine.ts`、`engine/core/AgentOwnership.ts`，加一則測試（§5）。`docs/STATE_OWNERSHIP_DESIGN.md:48` 那一列是設計當時的紀錄，不改。

## 4. 第 3 項：`PlayHUD` 自己判斷拖曳門檻

### 4.1 現況

同一個判斷（「按下後漂移超過門檻＝開始拖」）寫在三處。指令：`grep -rn "DRAG_DRIFT" hooks components`。

| 位置 | 內容 |
| :-- | :-- |
| `components/ui/play/PlayHUD.tsx:138-139` | 技能鈕拖曳：依 `pointerType` 選 `DRAG_DRIFT_TOUCH_PX`／`DRAG_DRIFT_MOUSE_PX`，`Math.hypot(...) <= threshold` 就還不算拖 |
| `hooks/useGameInput.ts:248-250` | 畫布按下後：同樣依 `pointerType` 選門檻，`Vector.dist(...) > driftThreshold` 進拖曳／平移／塗刷 |
| `hooks/useGameInput.ts:266-267` | 鏡頭鍵按下後：固定用 `DRAG_DRIFT_MOUSE_PX`，超過就開始平移 |

- 常數本身只有一份（`constants/ui.ts:248-252` 的 `GAME_INPUT_PARAM`），重複的是「怎麼選門檻、怎麼比」。
- `tapIntent.ts` 的檔頭寫「規則只寫在這裡，輸入層不自己判斷按鍵、指數、敵我」，上游也列了 `PlayHUD`；拖曳門檻是唯一還留在外面的手勢規則。
- `AGENTS.md` §3a：條件放 selector 或資料表，不放元件。`PlayHUD` 其他判斷（能不能放、能點誰、放開的結果）都已經讀引擎的投影，或經 `PlayPointerPort`（`hooks/useGameInput.ts:65-69`）問 `tapIntent`，只剩這一個。
- **元件不能直接 import `tapIntent`**：`tools/ui-e2e/ui-audit-static.mjs:36` 的 `engine-import` 規則只准元件 import `engine/systems/ui/selectors` 與 `views/`（`tests/UIAudit.test.ts` 把守）。所以 `PlayHUD` 要經埠拿結果，和 `quickCast`、`dropSkill` 同一條路。
- `PlayHUD` 的拖曳狀態本身（`dragRef`、`suppressClickRef`、pointer capture，`:60-67`、`:118-179`）是 DOM 互動的簿記，不是規則。

### 4.2 結論設計

**最小解：`tapIntent.ts` 加一個純函式；`useGameInput` 直接讀，`PlayHUD` 經 `PlayPointerPort` 讀。**

```ts
// engine/systems/ui/tapIntent.ts
/** 按下後的位移算不算開始拖曳（門檻依指標種類：觸控手指粗、其餘照滑鼠）。 */
export function isPastDragSlop(dxPx: number, dyPx: number, pointerType: string): boolean

// hooks/useGameInput.ts 的 PlayPointerPort 多一個查詢（實作就是轉呼叫上面那個函式）
isPastDragSlop(dxPx: number, dyPx: number, pointerType: string): boolean;
```

- 內容＝位移長度 `>`（`pointerType === 'touch'` 用 `GAME_INPUT_PARAM.DRAG_DRIFT_TOUCH_PX`，其餘用 `DRAG_DRIFT_MOUSE_PX`）。常數留在 `constants/ui.ts`，不新增。
- 三處改呼叫：
  - `useGameInput.ts:248-250`、`:266-267` → 直接呼叫 `isPastDragSlop(…, e.pointerType)`。
  - `PlayHUD.tsx:138-139` → `playPointerRef?.current?.isPastDragSlop(e.clientX - drag.startX, e.clientY - drag.startY, e.pointerType)`；`PlayHUD` 不再 import `GAME_INPUT_PARAM`。
- `:267` 原本固定用滑鼠門檻：`CAMERA_DOWN` 只會從 `CAMERA`／`CAMERA_OR_CANCEL` 進來，而 `pointerGesture` 只在 `pointerType === 'mouse'` 時回這兩個（`engine/systems/ui/tapIntent.ts:74`），所以傳 `e.pointerType` 結果相同。
- 觸控筆（`pen`）三處原本都走滑鼠門檻，函式也一樣。
- 擁有者：手勢規則＝`tapIntent.ts`；門檻數值＝`constants/ui.ts`；DOM 簿記留在各自的元件與 hook。

**唯一的行為差異（邊界，要在實作時定）**：埠還沒填（`playPointerRef.current` 是 null，畫布沒掛上）時，現在的 `PlayHUD` 仍會自己判定開始拖、送 `SET_AIM`，放開時因為沒有埠而取消。改成經埠之後，埠是 null 就當作「還沒開始拖」，放開等同點一下（進瞄準）。PLAY 模式下畫布一定掛著（HUD 和畫布同時存在），實際碰不到；`e2e:play` 的技能鈕拖曳情境會驗到正常路徑。

**不做（列為之後的選項）：把技能鈕拖曳的整段狀態機搬到 hook**（例如 `hooks/usePressDrag.ts`，回傳 pointer 事件處理器，`PlayHUD` 只接點一下／開始拖／拖動／放開／取消）。現在只有技能鈕一個使用者，搬了只是換位置；等出現第二個「HUD 元件拖到戰場」的需求（例如道具、行為編輯器的節點）再做，那時這個函式可以直接沿用。

### 4.3 為什麼行為不變

- 比較式相同（都是嚴格大於才算拖）。位移一處用 client 座標、一處用畫布相對座標，相減後一樣。
- `useGameInput` 原本用 `Vector.dist`、`PlayHUD` 用 `Math.hypot`：收成一個之後，兩者只可能在剛好落在門檻上的最後一位浮點數有差，實際指標事件測不出來。實作時看 `Vector.dist` 的定義擇一即可。
- 埠為 null 的邊界見 §4.2。

### 4.4 改哪些檔

`engine/systems/ui/tapIntent.ts`、`hooks/useGameInput.ts`（兩處改呼叫＋埠多一個查詢）、`components/ui/play/PlayHUD.tsx`、`tests/PointerGesture.test.ts`（加門檻的邊界案例）。

## 5. 怎麼證明行為不變

`balance:fingerprint` 只能證明一半：指紋的場上沒有玩家單位（`grep -n "ORDER_\|SET_CONTROLLER" tools/balance/simFingerprint.ts` 無結果），狀態欄位也不含 `currentTelegraph`（`tools/balance/simFingerprint.ts:90-91` 只有 `castingSkillIdx`、`castTimer`）。所以逐項用分辨得出來的檢查。

**三包動工前先在 `main` 錄一次 A/B 探針的輸出**（下表第 4 列），D1、D3 都拿它比對：D1 動到玩家取消那條路與預警格，D3 動到指令套用。

| 項目 | 檢查 | 指令 | 通過條件 |
| :-- | :-- | :-- | :-- |
| 共同 | AI 模擬沒被動到 | `npm run balance:fingerprint` | 180／180，**不重錄** |
| 共同 | 型別、單元測試、打包、死碼 | `npm run lint`、`npm test`、`npm run build`、`npm run knip` | 全過，knip 不多新項目 |
| 1 | 玩家指令的既有驗收 | `npx vitest run tests/PlayerOrders.test.ts tests/PlayerOrderInterrupt.test.ts tests/PlayReviewFixes.test.ts tests/UltManaDrain.test.ts tests/Replay.test.ts tests/SimBusListeners.test.ts tests/contracts/G3.contract.test.ts tests/contracts/PLAY.contract.test.ts` | 全過，測試檔零修改 |
| 1、2 | **有玩家指令的逐位元比對**（指紋的缺口）：一次性探針 `tools/ui-e2e/out/order-ab.mjs`（不進版控），固定種子開一場、把一個單位 `SET_CONTROLLER` 成 PLAYER，在固定 tick 送一串 `ORDER_MOVE`／`ORDER_ATTACK`／`ORDER_CAST`（含前搖中換指令、詠唱中取消、冷卻中被拒收）／`ORDER_STOP`，每個 tick 輸出 `stateOf(e)`（`tests/contracts/simState.ts:17`）加每個單位的 `order`、`currentTelegraph`、`aiUpdateTimer`、`nextRepathAt` | 改之前在 `main` 跑一次存檔，每包改完再跑，`diff` 兩份輸出 | 完全相同。探針先自檢：取消前搖、立即換路、拒收、預警格出現又清掉，各至少真的發生一次（METHODOLOGY §4 第 11 條），否則比對不算數 |
| 2 | 預警格的生命週期（新測試 `tests/TelegraphOwnership.test.ts`，先寫紅再實作）：起手後有值；完成、被控打斷、死亡、玩家取消四種離開後都是 null；普攻起手不寫 | `npx vitest run tests/CastingDeathInterruption.test.ts tests/GroundPriority.test.ts tests/TelegraphOwnership.test.ts` | 全過 |
| 2 | 所有權棘輪 | `npx vitest run tests/AgentOwnership.test.ts` | 過；基準維持 `[]` |
| 2 | 畫面護欄（讀預警格的是 `GridRenderStrategy`；基準畫面裡有沒有預警格沒查，所以這列只是護欄，分辨靠上面兩列與探針） | `npm run perf:fidelity`、`node tools/ui-e2e/runtime-smoke.mjs` | 保真 0 差異、不重錄；smoke 過 |
| 3 | 手勢規則與 UI 邊界 | `npx vitest run tests/PointerGesture.test.ts tests/TapIntent.test.ts tests/CameraInput.test.ts tests/UIAudit.test.ts`、`npm run audit:ui -- all` | 全過，audit 維持 0 |
| 1、3 | 實跑 PLAY | `npm run e2e:play`（在主資料夾跑） | 全過。這組有已知偶發（HANDOFF §2 D：「瞄準時點敵人沒送出指令」「畫面裡沒有敵人」），失敗時改前改後各跑 3 次比對，同一項在 `main` 也會失敗才算偶發 |
| D3 的文件 | 合約與 ADR 的檢查 | `npx vitest run tests/AdrIndex.test.ts tests/HarnessContract.test.ts tests/DocDrift.test.ts` | 全過 |

## 6. 回退

- 三包各一個 commit、互不相依，任何一包出問題 `git revert <該 commit>` 即可。
- 沒有資料格式、存檔、回放紀錄、基準檔的變動，回退不需要重錄或遷移。
- 第 1 項若使用者之後不要 A：revert 程式 commit；ADR 0027 照規則新開一份標取代，不改原文；合約那一句另外 revert。

## 7. 拆包

| 包 | 內容 | 檔數 | 大小 | 建議執行者 | 驗收指令 | 需要使用者 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| D0 | 在 `main` 寫 A/B 探針並錄基準輸出（不進版控） | 0 | S | 主代理 | 探針自檢通過（§5 第 4 列） | 不用 |
| D1 | 第 2 項：`currentTelegraph` 收給 `SkillStateMachine`，登記所有權，新測試 | 4＋1 測試 | S（約 20 行） | 主代理 | §5「共同」＋第 2 項三列＋探針比對 | 不用 |
| D2 | 第 3 項：`isPastDragSlop` 進 `tapIntent`，`useGameInput` 兩處與 `PlayHUD`（經埠）改讀 | 3＋1 測試 | S（約 20 行） | 主代理 | §5「共同」＋第 3 項＋`e2e:play` | 不用 |
| D3 | 第 1 項選 A：`OrderIntake.applyOrder`、`UICommandSystem` 改呼叫、ADR 0027、合約那一句五處、`AGENTS.md` G3 條文 | 3 程式＋7 文件 | S（搬 14 行）＋文件 | 主代理（合約與 ADR 本來就由主代理維護） | §5「共同」＋第 1 項＋探針比對＋`e2e:play`＋文件那列 | **要**：選 A／B／C／D，同意改合約那一句 |

- 順序：D0 最先；D1、D2 隨時可做、可同一個工作階段連著做；D3 等使用者選完，排在工作階段收尾（合約中途改下一個工作階段才生效）。三包不碰渲染與座標，不占渲染線。
- 執行者的理由：每包一個 context 裝得下、改動前後相依（先錄探針輸出、再改、再比對），照「動手原則」主代理自己做比派工便宜。要外派的話 D1、D2 各自可以給 agy Neon medium（主代理先寫紅色測試、`AgentOwnership` 那一筆與 `PlayPointerPort` 的型別由主代理先加），D3 不外派。
- WORKLOG 節號：三包合記一節 DN（HANDOFF §1 的下一個節號）；做完把 HANDOFF §2 PLAY 那條裡的三項架構問題刪掉。

## 8. 什麼情況停下來問使用者

- **D3 動工前**：選項 A／B／C／D，以及要不要改合約那一句（五處）。選 B 等於推翻 ADR 0019，要另寫開案書。
- `balance:fingerprint` 不是 180／180，或 A/B 探針輸出有任何差異：停，不重錄、不調探針讓它過。
- `perf:fidelity` 出現非 0 差異：停，照 `rebaseline-fidelity` 的精神先看差異圖，不重錄。
- D1 實作時發現 `getImpactArea` 其實讀了施法者狀態或亂數（和 §3.2 的依據不符）：改成「`beginWindup` 之後呼叫狀態機的寫入函式」保持原順序，並回報。
- D2 的埠為 null 邊界（§4.2）在實跑時真的碰得到：停下回報，不自己加第二份門檻判斷當後備。
- 需要改 `tests/contracts/*`、`tests/contracts/simState.ts` 等受保護檔，或要改 Facade（`engine/game.ts`）才能做完：停。照本文設計不應該需要。
- 有人想讓 AI 單位也經 `applyOrder` 下令（L4）：那會把 ADR 0026 的打斷規則套到 AI、改變指紋，是 L4 開案的決定，不在這三包裡做。
- D2 之後又出現第二個「HUD 元件拖到戰場」的需求：那時再提 §4.2 的 hook 方案，不在這包裡預做。
