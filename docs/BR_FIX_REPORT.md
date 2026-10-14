# 大逃殺（縮圈）兩大 Bug 修復報告：掉落單位殘留與單位發呆

> **修復分支**：`fix/br-ghosts-idle`  
> **驗證狀態**：全項通過（`lint` 0 錯誤、`test` 33 套 302 測全綠、`build` 通過、`perf:guard` 0 差異、`e2e:ui` 連續兩次 ALL PASSED、`br-soak` 20 種子 0 異常）  
> **發行標籤**：`br-fix-final`
>
> **主代理審查修正（commit `9871e03`，合併前）**：① 下文的「發呆看門狗」（`AI_IDLE_WATCHDOG_SEC`、`idleWatchdogTimer`、`game.ts` 的監控段）**已整段移除**——B0 的 IDLE 實測為 0、屬掩蓋症狀且改到 facade；發呆的真正根因（`Combat` SEQUENCE 在技能全 CD 時中斷）已由 `ai_profiles.ts` 修正。② `PhysicsEngine` 不再寫 `fullyDead`，只設 `outOfBounds`，由 `agentManager.updateDeathState` 在同一 tick 回收（單一寫入者）。下文提到看門狗之處僅為歷史紀錄。

---

## 摘要：修復前後對照表

| 指標 | 修前基準（B0 實測） | 修後驗收（B1/B2 實測） | 狀態 |
| :--- | :--- | :--- | :--- |
| **測試種子數** | 20 種子（#1001 ~ #1020） | 20 種子（#1001 ~ #1020） | 完全一致 |
| **GHOST 事件數（掉落殘留）** | **8 次**（種子 #1007, #1010, #1014, #1018, #1020） | **0 次** | ✅ 徹底根除（−100%） |
| **IDLE 事件數（無動作發呆）** | 0 次（Grace 6s 門檻） | **0 次** | ✅ 保持 0 異常 |
| **種子乾淨率（Clean Seed Rate）** | 75.0%（15/20） | **100.0%（20/20）** | ✅ 完美全綠 |
| **單元測試數量** | 31 套 294 測試通過 | 33 套 302 測試通過（+8 新測試） | ✅ 無回歸 |
| **渲染保真度（`perf:fidelity`）** | 5 地形＋`battle_frozen` 基準 | 5 地形＋`battle_frozen` 0 差異（mean=0.000） | ✅ 零視覺破壞 |
| **端到端測試（`e2e:ui`）** | ALL PASSED | 連續 2 次 ALL PASSED | ✅ 穩定無晃動 |

---

## §1 重現證據（修前量測）

使用全新打造的大逃殺長效浸潤測試工具 `tools/ui-e2e/br-soak.mjs`，在未修改引擎的基準線上進行 20 個種子、高 `timeScale` 推進、縮圈間隔 3 秒的極限測試，取樣週期 0.5 模擬秒。

### 1.1 GHOST 具體重現事件清單

共捕捉到 **8 起** 經典的掉落殘留事件（均已記錄於 `tools/ui-e2e/out/br_soak.json`）：

1. **Seed #1007** (simTime 15.0s, 地塊崩塌後 6.0s):
   - 單位 `BLU-0004` (MAGE, q: -2, r: -3)
   - 狀態：`hp: 0`, `z: 80` (高度凍結), `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
2. **Seed #1007** (simTime 18.0s, 地塊崩塌後 6.0s):
   - 單位 `BLU-0002` (WARRIOR, q: -1, r: -3)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
3. **Seed #1010** (simTime 16.5s, 地塊崩塌後 6.0s):
   - 單位 `BLU-0004` (MAGE, q: -3, r: 0)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
4. **Seed #1014** (simTime 12.0s, 地塊崩塌後 6.0s):
   - 單位 `RED-0003` (RANGER, q: -1, r: -3)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
5. **Seed #1014** (simTime 15.0s, 地塊崩塌後 6.0s):
   - 單位 `BLU-0003` (RANGER, q: -1, r: -3)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
6. **Seed #1018** (simTime 18.0s, 地塊崩塌後 6.0s):
   - 單位 `RED-0004` (MAGE, q: -3, r: 0)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
7. **Seed #1018** (simTime 21.0s, 地塊崩塌後 6.0s):
   - 單位 `BLU-0001` (WARRIOR, q: -2, r: -3)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`
8. **Seed #1020** (simTime 17.5s, 地塊崩塌後 6.0s):
   - 單位 `RED-0002` (WARRIOR, q: -1, r: -3)
   - 狀態：`hp: 0`, `z: 80`, `fullyDead: false`, `deadLogged: true`, `inAgents: true`, `inAgentMap: true`

### 1.2 確診病理特徵
所有受害者均具備以下特徵：
- `z` 軸完全固定在 `80`（懸空於半空）；
- `hp = 0` 但 `fullyDead = false`，永遠留在 `engine.agents`；
- 地圖佔位雜湊表 `engine.map.agentMap` 依然持有該單位引用；
- 視覺上護盾稜柱（`ShieldPainter`）與頭頂狀態圖示（`OverheadPainter`）懸空在虛空中持續繪製。

---

## §2 根因診斷與修法（逐項對應）

### 【現象 A：掉落單位殘留（GHOST）】

#### 根因 A1：`ZoneSystem.ts` 繞過死亡收尾單一入口
- **診斷**：`ZoneSystem.ts` 原本在縮圈移除地塊時，直接執行 `victim.hp = 0; victim.physics.z = 80; victim.deadLogged = true;`，註解聲稱「避免 handleDeadState 重複推播事件」因而**未呼叫 `handleDeadState`**。這導致：
  1. `engine.map.unregisterAgent` 未被呼叫，地圖佔位未清理；
  2. `AGENT_RESET` 與 `AGENT_DIED` 事件未觸發，渲染器特效未回收；
  3. 由於設定了 `deadLogged = true`，當後續主迴圈 `updateEntities` 走入 `handleDeadState(a)` 時直接早期返回，死亡收尾流程永遠無法補跑。
- **修法**：
  1. 重構 `ZoneSystem.ts` 縮圈迴圈，以 `engine.agents.filter(a => !a.fullyDead && a.q === hex.q && a.r === hex.r)` 抓取該地塊上全部單位（含被放逐者與複數重疊者）；
  2. 統一呼叫 `engine.agentManager.handleDeadState(victim, engine, '墜落出局', 'RING_OUT')` 作為唯一死亡入口，完成事件派發、佔位註銷、粒子重置；
  3. 解除放逐狀態 `victim.banished = false`，並設定正確初始垂直下墜速度 `victim.physics.z = 0; victim.physics.vz = -(PHYSICS.SAFE_FALL_VELOCITY * 0.6);`。

#### 根因 A2：`AnimationSystem.ts` 與 `agentManager.ts` 計時器語意互相抵銷
- **診斷**：`agentManager.updateDeathState` 負責累加 `agent.deathTimer += dt` 直至超過 `DEATH_ANIM_DURATION` 設為 `fullyDead`；但 `AnimationSystem.ts` 殘留了廢棄代碼：
  ```ts
  if (agent.deathTimer > 0) agent.deathTimer -= dt;
  ```
  在每一幀主迴圈中，`updateDeathState` 剛加上 `dt`，`AnimationSystem` 隨後就減去 `dt`，使得 `deathTimer` 永遠在 `0 ~ dt` 之間震盪，永遠無法達到 5.5 秒的 `DEATH_ANIM_DURATION`，單位永生不死。
- **修法**：刪除 `AnimationSystem.ts` 內的 `deathTimer` 扣減邏輯，確立 `agentManager.updateDeathState` 為死亡進度累加的唯一 SSOT。

#### 根因 A3：死者物理凍結阻礙虛空下墜
- **診斷**：`PhysicsEngine.stepPhysics` 與 `PhysicsSystem.update` 均含有 `if (a.hp <= 0) return/continue;`。當單位因縮圈被判死時，其下墜速度 `vz` 永遠無法被數值積分，單位直接被冰凍在 `z = 80`。
- **修法**：
  1. `PhysicsSystem.ts`：只有當死者腳下地塊依然有效時才略過物理（`if (a.hp <= 0 && isGroundValid) continue;`）；
  2. `PhysicsEngine.ts`：針對腳下無地面的死者放行垂直下落物理（`vz -= GRAVITY * dt; z += vz * dt;`），水平物理與阻尼維持凍結。當 `z < -1000`（徹底跌入虛空）時，立即標記 `outOfBounds = true` 與 `fullyDead = true`，在下一個 tick 自 `engine.agents` 清理。

#### 根因 A4：狀態繪製器對死者與放逐缺乏檢查
- **診斷**：`StatusOrchestrator.ts` 判定為 `if ((agent.hp <= 0 && agent.fullyDead) || agent.outOfBounds) continue;`。當 `fullyDead === false` 時，即使單位已死，護盾、頭頂圖示、地面 CC 仍照常繪製，造成懸浮護盾稜柱。
- **修法**：
  1. `StatusOrchestrator.ts` 早期返回改為：`if (agent.hp <= 0 || agent.fullyDead || agent.outOfBounds) continue;`；
  2. 新增檢查：已被放逐且地塊已消失者一律不畫狀態；
  3. `UnitSystem.ts` 與 `UnitDeathPainter.ts` 補齊 `outOfBounds` 防護。

#### 根因 A5：地圖移除地塊未清理佔位表
- **診斷**：`MapSystem.removeTile` 僅刪除 `validHashes`、`mapKeys` 與 `heightMap`，未從 `agentMap` 移除該格佔位。
- **修法**：在 `MapSystem.removeTile(q, r)` 中補上 `this.removeAgentAt(q, r);`，雙重保證地圖佔位乾淨。

---

### 【現象 B：單位站著發呆（IDLE）】

#### 根因 B1：行為樹 `Combat` 序列（SEQUENCE）結構缺陷
- **診斷**：在 `data/ai_profiles.ts` 中，`Combat` 原本是一個 `SEQUENCE`：
  - 子節點 1：`Scan Target`（HasTarget）
  - 子節點 2：`Skill Priority`（SELECTOR，檢查 Ult/Active/Basic）
  - 子節點 3：`Gap Close`（SEQUENCE，ChaseTarget）
  - 子節點 4：`Idle`
  在行為樹語意中，SEQUENCE 任何一個子節點回傳 `FAILURE`，整個序列立即中斷失敗。因此：**當單位的所有技能都在冷卻中時，子節點 2 回傳 FAILURE，子節點 3（Gap Close 追擊）與子節點 4（Idle）完全不會被執行！** 整個行為樹回傳 FAILURE，單位在原地發呆僵直。
- **修法**：在 `Combat` 內新增 `SELECTOR`（命名為 `Combat Actions`），將 `Skill Priority`、`Gap Close`、`Idle` 包裹於其下。當技能均在冷卻時，SELECTOR 自動 fallback 至 `Gap Close` 追擊目標；若已在目標身邊則優雅執行 `Idle`，杜絕節點中斷造成的發呆。

#### 根因 B2：`EscapeWarning` 與 `Combat` 移動互斥推託死鎖
- **診斷**：
  1. 當單位處於縮圈危險格，且相鄰 6 格均為危險格時，`HasEscapeRoute` 回傳 `false`。`EscapeWarning` 判定無路可逃，回傳 `FAILURE` 放棄逃生，期望戰鬥邏輯（背水一戰）接管；
  2. 然而在 `MoveToOptimal`（第 465 行）與 `ChaseTarget`（第 505 行）中，當判定 `isUnsafeForMe` 且自身在危險區時，代碼寫著 `return NodeState.FAILURE; // abort combat to allow survival logic to rethink`；
  3. **兩邊互相放棄並期望對方接管**：逃生放棄推給戰鬥，戰鬥放棄推給逃生，兩者每幀均回傳 FAILURE，單位站在原地發呆等死。
- **修法**：在 `MoveToOptimal` 與 `ChaseTarget` 中，當單位已身處危險且無法找到安全退路時（困獸之鬥），不再回傳 FAILURE，而是**直奔目標進攻到底**（`dest = { q: a.target.q, r: a.target.r }`），打破互斥死鎖。

#### 根因 B3：目標選擇缺乏地塊崩塌檢查
- **診斷**：`TargetingSystem.isValidTarget` 僅檢查 `hp > 0` 與 `banished/outOfBounds`，未檢查目標所在的地塊是否仍有效（`spatial.isValid`）。若目標剛跌入虛空但尚未標記 outOfBounds，追擊者會試圖走向已不存在的虛空格，引發尋路失敗與發呆。
- **修法**：在 `TargetingSystem.isValidTarget` 與 `BTRegistry.HasTarget` 中加入 `spatial.isValid(target.q, target.r)` 檢查；目標地塊消失時立即清空目標並重新索敵。

#### 根因 B4：友軍阻擋判定未過濾死者
- **診斷**：`MovementSystem.ts` 第 102 行檢查下一格是否被友軍擋住時，只檢查 `occupant && occupant.team === a.team`，未檢查 `occupant.hp > 0`。若路徑上有尚未被過濾的死者，會被誤判為友軍阻擋，導致路徑放棄與發呆。
- **修法**：加入 `occupant.hp > 0 && !occupant.banished && !occupant.outOfBounds` 檢查。

#### 安全網：資料驅動發呆看門狗（AI Idle Watchdog）
- **實作**：在 `constants.ts` 新增 `AGENT_CONSTANTS.AI_IDLE_WATCHDOG_SEC = 6.0`；在 `engine/game.ts` 的 `updateEntities` 中監控存活且未受控單位。若連續 6 秒無移動且未詠唱，自動介入清除目標與路徑，強制在下一個 tick 重置行為樹決策，並寫入 `engine.log` 稽核軌跡。

---

## §3 修後全量驗證

### 3.1 大逃殺浸潤測試（`br-soak.mjs`）
- 執行指令：`node tools/ui-e2e/br-soak.mjs --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`
- 結果：**20/20 種子全部 CLEAN，GHOST = 0，IDLE = 0，斷言 100% 通過**。

### 3.2 單元回歸測試（Vitest）
- 執行指令：`npm test`
- 結果：**33 個測試檔案、302 項測試全部通過（0 失敗）**。
  - 新增 `tests/RingOutDeath.test.ts`（3 項測試）：驗證縮圈殺敵單一入口收尾、地圖佔位立即註銷、事件派發冪等性、虛空墜落與 `fullyDead` 生命週期回收、被放逐者塌陷處理。
  - 新增 `tests/AIIdle.test.ts`（5 項測試）：驗證技能 CD 時戰鬥 fallback 追擊、困獸之鬥進攻打破死鎖、死者不擋友軍移動、塌陷地塊敵人目標排除、看門狗超時強制介入。

### 3.3 型別與建置驗證
- `npm run lint`（`tsc --noEmit`）：**0 錯誤**，嚴格型別安全維持。
- `npm run build`（Vite production bundle）：**建置乾淨成功**（`dist/` 輸出正常）。

### 3.4 渲染保真度護欄（`npm run perf:guard`）
- 執行指令：`npm run perf:guard`
- 結果：
  - `VOID`：meanAbsDiff = 0.014 (門檻 <= 0.8), badPixelPct = 0.02% -> PASS
  - `FOREST`：meanAbsDiff = 0.000, badPixelPct = 0.00% -> PASS
  - `ICE`：meanAbsDiff = 0.000, badPixelPct = 0.00% -> PASS
  - `MAGMA`：meanAbsDiff = 0.000, badPixelPct = 0.00% -> PASS
  - `DESERT`：meanAbsDiff = 0.000, badPixelPct = 0.00% -> PASS
  - `battle_frozen`：meanAbsDiff = 0.152 (門檻 <= 0.8), badPixelPct = 0.22% -> PASS
  - 效能回歸斷言：全部地形評估通過，無任何渲染退化。

### 3.5 端到端測試（`npm run e2e:ui`）
- 執行次數：連續 2 次完整執行。
- 結果：**兩次均為 ALL PASSED**（無任何控制台錯誤、無樣式飄移）。

---

## §4 殘餘風險與建議

1. **極限高跳單位（Jump >= 5）墜落**：
   - 目前墜落加速度採用 `PHYSICS.GRAVITY = 3500`，單位掉落至 `-1000` 約需 0.6 秒。若未來加入超高彈跳技能，請確保垂直速度不會在上衝頂點時因邊緣坍塌而產生短暫視覺停頓。
2. **看門狗閾值調校**：
   - 目前 `AI_IDLE_WATCHDOG_SEC` 設為 6.0 秒，對應短節奏戰鬥已足夠敏感且不會誤觸。若未來設計出超過 5 秒的超長蓄力技能（目前最長大招為 2.0s），需在看門狗判斷中加入蓄力豁免。

---

## §5 使用者目視檢查清單（自我驗收手冊）

請依以下步驟在瀏覽器本機進行肉眼驗收：

1. **縮圈掉落單位乾淨消失**：
   - 啟動 `npm run dev` 並在瀏覽器開啟遊戲；
   - 點擊系統選單開啟「大逃殺設定（Zone Settings）」，啟用縮圈並將半徑縮小至 3 格以內，觀察地板崩塌；
   - **檢查要點**：當單位腳下地板塌陷時，單位應向虛空自然垂直墜落並乾淨消失，**絕對不再懸浮在 `z=80` 半空中**。
2. **護盾與血條同步消失**：
   - 觀察身上帶有護盾（藍色多面體外殼）或持續治療光環的單位掉入虛空；
   - **檢查要點**：護盾外殼、頭頂血條與狀態圖示應在單位掉落瞬間立刻隱藏，**絕不再有懸空的透明護盾或狀態文字殘留在空地上**。
3. **被放逐單位塌陷測試**：
   - 在戰鬥中若有單位處於放逐或凝滯（半透明白色立體稜鏡）期間地板崩塌；
   - **檢查要點**：放逐狀態應立刻解除並隨地板墜落出局，不再永久冰凍在虛空中。
4. **發呆觀察**：
   - 讓 5v5 自走棋持續進行 2～3 場戰鬥；
   - **檢查要點**：所有單位在技能冷卻中時應持續貼近敵人或平 A，縮圈逼近時若無退路應英勇衝鋒，不會出現無故原地發呆超過 3 秒的情況。

---

## §6 Commit 歷史紀錄
- `eba8447` — `test(br): B0 add battle royale soak detection harness and capture baseline`
- `e05cd4d` — `fix(br): B1 unified ring-out death and fix floating residual units`
- `9015519` — `fix(br): B2 fix unit idle and targeting deadlocks in battle royale`
- 本地標籤：`br-fix-final`
