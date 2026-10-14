# 外出執行指令 #10：大逃殺（縮圈）兩大 bug —— 掉落單位殘留、單位站著發呆

> 用法：`/goal docs/BR_FIX_AGENT_PROMPT.md`（IDE 本機代理，**整份一次跑完**）。
> **分支**：從目前 `main` 開 **`fix/br-ghosts-idle`**，只在此分支工作。**不得 push、不得合併、不得動 `main`**、不得 `git add package-lock.json`。開工分支已存在 → 接續；`main` 不乾淨 → 停下回報。
> 本輪的重點是**先重現、量到證據、再修**。**禁止「看起來合理」的猜測式修法**：每個修正都要能指向 B0 重現工具抓到的具體事件。

## 0. 守則（摘要；全文見 `AGENTS.md`、`docs/HANDOFF.md`）

- SSOT：`types.ts`、`constants.ts`、`data/**`；**不得新增魔術數字**（進 `constants.ts`）。`Agent` 是純資料，**不得新增方法**。系統間只透過 `engine.bus`。渲染器無狀態。**禁止** `as any`、`Math.random`（模擬邏輯要用 `engine/math/rng.ts` 的種子亂數）、渲染／tick 迴圈內 `console.log`、新增依賴。保留既有註解。
- 縮圈導致的 `hp = 0`／虛空落下是 `AGENTS.md` 明列的**直接寫入例外**，可保留，但**必須走單一、完整的死亡收尾流程**（見 B1）。
- 檔案編碼：`constants.ts` 等多數原始檔為 CRLF，編輯保持原行尾；新檔用 LF；不得輸入 `&gt;` `&lt;` 等 HTML 實體；改完用 `git diff --stat` 確認沒有整檔行尾變動。
- 每個任務結束必須 `npm run lint`、`npm test`、`npm run build` 全綠再 commit（一任務一 commit，格式 `fix(br): B<n> ...`）。同題失敗 3 次 → 記錄並跳到下一任務。
- **先讀**：`AGENTS.md`、`docs/HANDOFF.md`、`types.ts`、`constants.ts`（`DEFAULT_ZONE_CONFIG`、`PHYSICS`、`AGENT_CONSTANTS`）、`engine/systems/ZoneSystem.ts`、`engine/physics/PhysicsEngine.ts`、`engine/systems/agentManager.ts`（`handleDeadState`／`updateDeathState`）、`engine/systems/AnimationSystem.ts`、`engine/game.ts`（`tick`／`updateEntities`）、`engine/map/**`（`registerAgent`／`unregisterAgent`／`getAgentAt`／`isValid`）、`engine/ai/**`（`BTRegistry.ts`、`TargetingSystem.ts`）、`engine/behaviorTree.ts`、`engine/systems/movement/**`、`engine/renderers/status/StatusOrchestrator.ts`、`engine/renderers/units/painters/UnitBodyPainter.ts`／`UnitDeathPainter.ts`、`tools/ui-e2e/lib/*.mjs`（沿用既有的啟動／種子／`__stepFrames` 慣例）。

## 1. 已知現象與線索（讀碼確認，不要照單全收）

**現象 A（掉落單位殘留）**：縮圈後地塊消失，單位模型連同**護盾稜柱、頭頂狀態**一直停在空地上（懸空），直到換場才消失。
**現象 B（發呆）**：大逃殺中某些單位站在原地不動、不攻擊，行為樹「不明原因」沒有任何動作；先前的 AI 代理一直抓不出來。

**讀碼已看到的疑點**（皆需用 B0 證據驗證或排除）：
1. `ZoneSystem.ts` 縮圈處理（搜尋 `RING_OUT`）：對站在被移除地塊上的單位直接 `hp = 0`、`physics.vz = -(…)`、`physics.z = 80`、`deadLogged = true`，**註解寫「避免 handleDeadState 重複事件」→ 沒有呼叫 `handleDeadState`**，因此：沒有 `unregisterAgent`（地圖佔位仍指向它）、沒有 `AGENT_DIED`／`AGENT_RESET`、沒有重置 `deathTimer`、沒有 Ragdoll 快照。
2. `PhysicsEngine.stepPhysics` 第一行 `if (a.hp <= 0) return;`（「死者物理凍結」）→ 上述單位的初始下墜速度永遠不會生效，凍結在 `z = 80`；`update()` 對 `fullyDead／banished／outOfBounds` 也直接 return（**被放逐的單位在地塊消失時也不會掉落**）。
3. `deathTimer` 同時被 `agentManager.updateDeathState`（累加）與 `AnimationSystem`（`deathTimer > 0` 時遞減，否則 `fullyDead = true`）操作，且 `game.tick` 以 `fullyDead` 過濾 `agents`——兩邊的語意是否互相抵銷、`deathTimer` 初值為何，要用實測確認。
4. 虛空落下（`z < -1000`）分支才會呼叫 `handleDeadState` 並設 `outOfBounds = true`；`handleDeadState` 內又會 `outOfBounds = false`、把 `physics.z` 歸零——**順序與重入要驗證**。
5. `UnitBodyPainter` 對 `hp<=0／banished／outOfBounds` 不畫本體，但**護盾（`ShieldPainter`，由 `StatusOrchestrator` 呼叫）與其他狀態繪製器是否有同樣的檢查**要確認（截圖中的懸空護盾暗示沒有）。
6. 發呆候選：目標選擇回傳「站在已消失地塊／已死但未 `fullyDead`／殘留佔位」的目標；`MovementSystem` 路徑為空或被「幽靈佔位」擋住而回報成功；行為樹節點卡在 RUNNING（等待永不遞減的計時器，如 `stunTimer`、`castTimer`）；安全區外「逃生」邏輯與攻擊邏輯互相搶優先權；`isWarningTile`／hazard 過濾讓所有可走格被判為不可走。**現象 A 的殘留佔位很可能同時造成現象 B**（兩者共用同一根因的可能性要驗證）。

## 2. 任務（依序）

### B0 · 重現與偵測工具（不改引擎行為）

新增 `tools/ui-e2e/br-soak.mjs`（`playwright-core`＋Vite dev server，沿用既有腳本寫法與 `?mute&quality=0`），自動跑大逃殺並偵測兩類事件：
- 以 `UI_COMMAND`（`SET_ZONE_CONFIG`，參考 `DEFAULT_ZONE_CONFIG`；找不到開關就讀 `ZoneSystem` 的啟用條件）啟用縮圈，快速縮圈（間隔／半徑用 `constants.ts` 的可調範圍，使 120 秒內多次縮圈）。
- 用 `__resetSeed(seed)` 跑 **20 個種子**，每個以高 `timeScale`／`__stepFrames` 推進 **模擬 180 秒或分出勝負**，每 0.5 模擬秒取樣全部單位。
- **GHOST 偵測**：任一單位同時滿足 ① 所在 `(q,r)` 的地塊已不存在（`!engine.map.isValid`），且 ② 距離該地塊消失超過 `GHOST_GRACE_SEC`（腳本內常數，建議 6 秒）仍滿足以下任一：仍在 `engine.agents`；`engine.map.getAgentAt(q,r)` 回傳它；`physics.z` 沒有下降（凍結）；`hp<=0` 卻 `fullyDead=false`。另檢查「已 `fullyDead` 的單位是否仍被地圖佔位引用」。
- **IDLE 偵測**：存活（`hp>0`）、非 `stun／banished／fear／stasis`、非施法中、場上仍有敵人，卻連續 `IDLE_GRACE_SEC`（建議 6 秒）位置不變且沒有任何攻擊／施法／移動。**觸發時立即擷取快照**：單位 id／role／`(q,r)`、是否在安全區內、所在地塊是否有效／警告／hazard、`target`（id、hp、`banished`、`outOfBounds`、其地塊是否有效、與自己的距離）、`path.length`、`isMoving`、`animState`、各冷卻／計時器（`stunTimer`、`castTimer`、技能 CD）、行為樹最近決策（用 `engine.log` 最後幾筆該單位紀錄；有 `DesignExporter` 的 BT 輸出就一併帶上）、6 個相鄰格的可走性與佔位者（含死者）。
- 輸出 `tools/ui-e2e/out/br_soak.json`（事件清單＋快照）與終端摘要表（各類事件數、各種子是否乾淨、最常見的卡住型態）。**腳本不得修改引擎狀態**（只讀＋推進時間）。
- **完成條件**：在**未修改引擎**的 `main` 上跑一次，記錄 GHOST／IDLE 事件數與代表性快照，貼進 `docs/BR_FIX_REPORT.md` §1。**若兩類事件都完全重現不出來**：把種子數加到 60、模擬長度加到 300 秒再跑一次；仍無 → 在報告如實寫「重現失敗」，附已測條件，**停止並跳到報告**，不得憑空修改。

### B1 · 修正掉落單位殘留（現象 A）

依 B0 證據修正，**要求的最終行為**：縮圈地塊消失時，站在上面的單位——
1. 經**單一、完整的死亡收尾**（重用 `agentManager.handleDeadState` 或把共同必要步驟抽成同一入口；**不得複製貼上第二套**）：只觸發**一次** `AGENT_DIED`／`AGENT_RESET`；`engine.map.unregisterAgent`；`deathTimer` 正確起算；`deadLogged` 防重入維持有效。
2. 視覺上**落下消失**或在 `UnitDeathPainter` 既有時序內淡出，**最長在 `DEATH_ANIM_DURATION`＋小餘裕後從 `engine.agents` 移除**（`fullyDead` 過濾生效）；不得再有「凍結在半空」。若需要讓死者落下，請用最小、有註解的方式處理 `PhysicsEngine` 的「死者物理凍結」（例如只對「失去地面的死者」放行垂直落下），**不得影響一般死亡的行為**。
3. **所有**依附單位的繪製（護盾、狀態圖示、光環、血條、陰影、Ragdoll 殘片）對 `hp<=0／outOfBounds／fullyDead／已被放逐且地塊消失` 的單位一律不畫或只畫死亡動畫——補齊 `StatusOrchestrator` 與相關繪製器的檢查（集中在 `StatusOrchestrator` 一處做 early return 為佳，避免每個繪製器各寫一份）。
4. 被放逐（`banished`）或凍結等「物理被略過」的單位，在腳下地塊消失時也要走上述收尾（不得永遠懸空）。
- **測試**：vitest 測試（可建立精簡的無頭 `GameEngine`；若引擎在 Node 下無法建構，改以 `br-soak.mjs --assert` 作為驗收並在報告說明）：縮圈殺死單位後 N 秒內 ① 不在 `engine.agents`、② 無地圖佔位、③ 事件各只發一次、④ 同一單位再被處理不會重複發事件。
- **驗收**：`br-soak.mjs` 20 種子 **GHOST 事件 = 0**。

### B2 · 修正單位發呆（現象 B）

用 B0 的 IDLE 快照找出**共同的根因**（可能不只一個）並修在根因處（`engine/ai`／`TargetingSystem`／`MovementSystem`／行為樹節點／清理流程），**不要用「發呆就隨機走一步」之類掩蓋**。報告 §2 必須列出：每種卡住型態、佔比、根因、修法、對應 commit。
- **安全網（僅在根因都修完後、且報告說明仍有殘餘型態時才加）**：資料驅動的「發呆看門狗」：存活單位連續 `AI_IDLE_WATCHDOG_SEC`（新常數）無任何動作時，清除其目標與路徑並強制下一個 tick 重新決策，記錄一次 `engine.log`（非迴圈內 console）。須使用種子亂數、可被常數關閉、不得改變正常戰鬥的行為（`perf:fidelity`／e2e 不受影響）。
- **測試**：針對每個確診根因寫一個回歸測試（能在修前失敗、修後通過；用純函式或精簡引擎重現該局面，例如「目標站在已消失地塊上」「路徑被死者佔位擋住」）。
- **驗收**：`br-soak.mjs` 20 種子 **IDLE 事件 = 0**（或殘餘事件全數被看門狗在 `AI_IDLE_WATCHDOG_SEC` 內解除並於報告列明）。

### B3 · 全量驗證與報告

- `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`（5 地形＋`battle_frozen` 必須維持 **0 差異**；有差異＝改壞了一般渲染，找原因，**不得重錄 baseline**）、`npm run e2e:ui`（兩次 ALL PASSED）。
- `br-soak.mjs` 前後對照表（事件數、種子乾淨率）。
- `docs/BR_FIX_REPORT.md`：§1 重現證據（修前）、§2 根因與修法（逐項）、§3 修後驗證（soak、測試、perf:guard、e2e）、§4 殘餘風險與建議、§5 **使用者目視檢查清單**（開大逃殺看縮圈殺人是否乾淨消失、護盾／血條是否一併消失、被放逐者在縮圈時、觀察 3 分鐘是否仍有發呆者）。
- 在 `docs/HANDOFF.md` §2 補一行本輪分支與狀態。
- 工作樹乾淨、不 push、打本地 tag `br-fix-final`。

## 3. 本輪額外規則

- **不得**重錄任何 fidelity baseline、放寬任何門檻、動 UI 樣式、動 `engine/audio/**`、動美術素材。
- 改動檔案數 >3 時，在 commit 訊息說明原因（本輪預期會觸及 `ZoneSystem`／`PhysicsEngine`／`agentManager`／`StatusOrchestrator`／AI 相關檔，視為已授權，但每個檔案的改動必須能對應到 B0 證據）。
- 任何時候中斷，都要確保工作樹乾淨且最後一個 commit 全綠。
- 停工原則：只有遇到會導致產品壞掉且本文件未涵蓋的情況才停下；其餘選最低風險、可回退的做法並寫進報告。**重現不出來時如實回報，不要編造修法。**

---

## 回來後使用者要做的事（給人看）

1. 讀 `docs/BR_FIX_REPORT.md`，確認根因與修法合理。
2. 在主螢幕開大逃殺看縮圈：殺人乾淨、護盾血條一起消失；觀察一陣子有無發呆。
3. 交給主代理審查（`git diff main...fix/br-ghosts-idle`）後再合併。
