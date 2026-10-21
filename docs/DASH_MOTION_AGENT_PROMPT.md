# 執行指令：位移技能軌跡、近戰前衝與奧義 C1 歸零（DM）

> 用法：在 IDE 代理對話輸入 `/goal docs/DASH_MOTION_AGENT_PROMPT.md`。
> 背景：
> 1. 目前衝刺技能（`SkillExecutor.ts` 的 `DASH` 區段）直接呼叫 `teleportTo(source, bestH.q, bestH.r, engine)` 並只加 `vz += VISUAL_JUMP_DASH`：水平初速 `vx = 0, vy = 0`，前幾幀速度從 0 緩慢爬升（不像爆發突進）、前兩幀沒有速度傾斜與殘影，且跨高度衝刺時有兩個垂直跳變 bug（上坡第一幀 `PhysicsEngine.stepPhysics` 把 `absorbGroundShift` 的負 `physics.z` 直接夾成 `0` 並歸零 `vz`，瞬間傳送到高台頂；下坡在 `px + physics.x` 跨過格界時 `getUnitGroundHeight` 單幀掉下高差，未轉入 `physics.z`）。
> 2. 近戰攻擊（射程 1～2、無投射物）以及貼身（`stepsTaken === 0`）施放的 `DASH` 技能，攻擊者本體完全站在原地不動，缺乏近戰前衝打擊感。
> 3. 順手收尾 3 個暫緩的奧義 C1 時序違規（`tr_u3`、`wb_u5`、`wr_u3` 的 `cast` 調為 `0.3`），讓 `tests/ult-spec.baseline.json` 的 C1～C8 全部歸零。
> 本輪只做上述三件事，不動 `RenderSpec.ts` 的層序與排序公式、不動 `MapSystem`（Facade）、不重錄保真基準。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：
  1. `AGENTS.md`（全部）
  2. `engine/renderers/RenderSpec.ts`（§2 排序鍵、§3 單位繪製座標、§4 錨點、§10 突進殘影）
  3. `engine/systems/movement/MotionCommands.ts`（含方框檔頭）
  4. `engine/systems/combat/SkillExecutor.ts`（第 1～120 行）
  5. `engine/physics/PhysicsEngine.ts`（第 1～165 行）
  6. `engine/systems/PhysicsSystem.ts`
  7. `engine/math/VisualMath.ts`（第 86～115 行 `getUnitGroundHeight`）
  8. `engine/core/AgentOwnership.ts`（第 27～43 行 `physics` 所有權與 `accumulators` 規則）
  9. `constants/combat.ts`、`tests/ConstantsBarrel.test.ts`、`tests/MotionCommands.test.ts`、`tests/UnitGroundHeight.test.ts`
- 若尚未在 `feat/dash-motion` 分支，從 `main` 開分支 `feat/dash-motion`；`git status` 必須乾淨。
- 先跑基準檢查並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs`。
- **長指令（可能超過約 5 秒）一律分段跑**：
  `node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）。
  逾時秒數：`lint` 120、`test` 300、`build` 180、`perf:guard` 900、`runtime-smoke` 180。
- **受保護檔案（不得修改）**：
  `CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、除 `tests/ult-spec.baseline.json`（只准縮減至空陣列）外的所有 `tests/*.baseline.json`、以及 Facade 檔（`engine/game.ts`、`engine/renderer.ts`、`engine/systems/grid.ts`、`engine/systems/map.ts`）與 `engine/renderers/frame/Afterimage.ts`。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

---

### 1. 已查證的事實（DOM）

1. **奧義 C1 違規現況（`tests/ult-spec.baseline.json`）**：
   - `tests/UltSpec.test.ts` 的規則 C1 要求奧義 `skill.cast >= hitAt`（預設 `ULT_SEQUENCE.HIT_LEAD = 0.3`）。
   - 目前僅剩 3 招因 `cast < 0.3` 列在 `tests/ult-spec.baseline.json` 的 `"C1"`：
     - `data/skills/red_ult.ts:27`：`tr_u3`（不朽屍王）目前 `cast: 0.2`
     - `data/skills/red_ult.ts:73`：`wr_u3`（惡魔降臨）目前 `cast: 0.1`
     - `data/skills/blue_ult.ts:91`：`wb_u5`（光速斬擊）目前 `cast: 0.2`
2. **`Agent.physics` 欄位所有權契約（`engine/core/AgentOwnership.ts:28-42`）**：
   - `owners`：`['engine/physics/PhysicsEngine.ts', 'engine/systems/movement/MotionEngine.ts']`（可直接 `=` 賦值）。
   - `accumulators`：含 `'engine/systems/movement/MotionCommands.ts'` 與 `'engine/systems/combat/SkillExecutor.ts'`（**只准對 `physics` 子欄位用 `+=` 或 `-=`**，用 `=` 會使 `tests/AgentOwnership.test.ts` 失敗）。
   - `trailHistory` 唯一寫入者：`engine/systems/PhysicsSystem.ts`（`AgentOwnership.ts:90-96`）。
3. **衝刺水平速度曲線與彈簧參數（`constants/combat.ts:8-20`、`PhysicsEngine.ts:83-98`）**：
   - `PhysicsEngine.stepPhysics` 中存活單位的水平彈簧為 `stiffness = PHYSICS.STIFFNESS_ALIVE * 1.2 = 180`、`damping = PHYSICS.DAMPING_ALIVE * 1.1 = 27.5`（過阻尼，特徵根約 $-10.9\text{ s}^{-1}$ 與 $-16.6\text{ s}^{-1}$）。
   - 現況 `teleportTo` 只設 `agent.physics.x += fromX - to.x; agent.physics.y += fromY - to.y;`，初速 `vx = 0, vy = 0`：第 0 幀速度為 0（不傾斜、無殘影），前 3 幀才加速到峰值，約 `0.192 s` 才走完 80% 位移。
   - 若在衝刺起點加上順向爆發初速 `vx += (to.x - fromX) * PHYSICS.DASH_BURST_FACTOR`（取 `DASH_BURST_FACTOR = 12`）：第 0 幀速度即達峰值（單格衝刺約 `700+ px/s`，遠高於傾斜門檻 `VFX_PARAM.SPEED_TILT_THRESHOLD = 50` 與軌跡紀錄門檻 `AFTERIMAGE.RECORD_SPEED_SQ = 10000`），隨後單調遞減（ease-out）滑入目標格，約 `0.128 s` 走完 80% 位移，且超調 `< 0.2 px`。
4. **衝刺跨高低差垂直連續性（`MapSystem.ts:45-49`、`VisualMath.ts:91-115`、`PhysicsEngine.ts:100-165`）**：
   - **上坡 bug（`newH > oldH`）**：`MapSystem.updateAgentPosition` 算出 `deltaH = oldH - newH < 0` 並呼叫 `PhysicsEngine.absorbGroundShift(agent, deltaH)` 使 `physics.z < 0`（讓 `groundH + physics.z === oldH`）。但 `PhysicsEngine.stepPhysics` 第 118 行只在 `isAirborne || a.physics.z > 0.1` 時扣重力，且第 138 行 `else if (isGroundValid && a.physics.z < 0)` 在第一個 sub-step 就強制把 `a.physics.z = 0`、`a.physics.vz = 0`，導致角色第 1 幀瞬間跳上高台頂且跳躍初速被吃掉。
   - **下坡 bug（`oldH > newH`）**：換格當下 `px + physics.x` 仍在舊格 `(q0, r0)`，`VisualMath.getUnitGroundHeight` 第 112 行取 `Math.max(heightAt(q, r), heightAt(hv.q, hv.r))` 回傳 `oldH`，故 `updateAgentPosition` 的 `deltaH = 0`。當 `PhysicsEngine.stepPhysics` 推進 `a.physics.x/y` 使 `hv` 跨出高台格進入低處格時，`getUnitGroundHeight` 在單一 sub-step 從 `oldH` 掉到 `newH`，但 `physics.z` 沒有吸收這段差值，造成畫面高度單幀瞬降。
5. **殘影首幀起點遺漏（`engine/systems/PhysicsSystem.ts:20-34`）**：
   - `GameEngine.tick` 順序為 `physics.update` → `combat.update`。當 `combat.update` 觸發 `dashTo` 設定高速 `vx/vy` 後，下一個 tick 的 `PhysicsSystem.update` 先執行 `this.engine.update(a, dt, engine)`（把位置推離起點約 17%），之後才 `a.trailHistory.push(...)`，導致衝刺起點 `(fromX, fromY)` 從未被記進 `trailHistory`。
6. **常數快照守門（`tests/ConstantsBarrel.test.ts`）**：
   - 修改 `constants/combat.ts` 中 `PHYSICS` 的欄位後，`tests/ConstantsBarrel.test.ts` 會比對 `tests/constants-snapshot.json` 的 `"PHYSICS"` 結構快照，必須同步更新該 JSON 的 `"PHYSICS"` 區段。

---

### 2. 目標與規則（DOM）

- **DM1 目標**：`tr_u3`、`wb_u5`、`wr_u3` 的 `cast` 皆改為 `0.3`；`tests/ult-spec.baseline.json` 中 `C1`～`C8` 全部為 `[]`（0 違規）。
- **DM2 目標**：
  1. `constants/combat.ts` 的 `PHYSICS` 新增：
     - `DASH_BURST_FACTOR: 12`（衝刺初速倍率，乘上位移向量 `to - from`）
     - `DASH_ARC_HEIGHT: 18`（衝刺跳躍拋物線高出較高端地面的弧頂高度 px）
     - `LUNGE_SPEED_BASIC: 420`（近戰普攻前衝初速 px/s，峰值位移約 8.8 px）
     - `LUNGE_SPEED_ACTIVE: 540`（近戰主動／奧義／貼身突進前衝初速 px/s，峰值位移約 11.2 px）
     並同步更新 `tests/constants-snapshot.json` 的 `"PHYSICS"`。
  2. `engine/systems/movement/MotionCommands.ts` 新增 `dashTo(agent: Agent, q: number, r: number, engine: GameEngine): void`（保留 `teleportTo` 給擊退／拉扯使用）：
     - 先記錄 `fromX = agent.px`、`fromY = agent.py`，呼叫 `teleportTo(agent, q, r, engine)`；若 `agent.isMoving` 為真則呼叫 `stopMovement(agent)`。
     - 計算 `dx = agent.px - fromX`、`dy = agent.py - fromY`；若 `Math.abs(dx) > 1.5`，更新 `agent.facing = dx > 0 ? 1 : -1`。
     - 以 `+=` 注入順向爆發速度：`agent.physics.vx += dx * PHYSICS.DASH_BURST_FACTOR; agent.physics.vy += dy * PHYSICS.DASH_BURST_FACTOR;`。
     - 計算清除上坡高差（`uphill = Math.max(0, -agent.physics.z)`）所需的起跳速度 `targetVz = Math.max(PHYSICS.VISUAL_JUMP_DASH, Math.sqrt(2 * PHYSICS.GRAVITY * (uphill + PHYSICS.DASH_ARC_HEIGHT)))`，若 `targetVz > agent.physics.vz` 則 `agent.physics.vz += targetVz - agent.physics.vz`（注意：全程只用 `+=` 寫 `agent.physics.*`）。
     - 同步更新 `MotionCommands.ts` 頂部的方框檔頭註解，說明 `dashTo` 與 `lungeToward` 的職責。
  3. `engine/physics/PhysicsEngine.ts` 的 `stepPhysics` 修補跨高度連續性：
     - 第 118 行重力條件改為 `else if (isAirborne || a.physics.z > 0.1 || a.physics.vz > 0)`，讓上坡起跳（`z < 0` 但 `vz > 0`）期間也受重力拋物線減速。
     - 在水平位置推進 `a.physics.x += a.physics.vx * dt; a.physics.y += a.physics.vy * dt;` 前後，若 `!isDead && isGroundValid && engine.mapConfig && (a.physics.x !== 0 || a.physics.y !== 0 || a.physics.vx !== 0 || a.physics.vy !== 0)`，用 `VisualMath.getUnitGroundHeight(a, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig)` 量測推進前後的 `gBefore` 與 `gAfter`；若 `gAfter < gBefore`（視覺腳點跨出高台格進入較低格），則 `a.physics.z += gBefore - gAfter`，讓世界高度 `groundH + physics.z` 在格界 0 跳變並自然轉入空中落下。
     - 第 138 行落地夾平條件：當 `isGroundValid && a.physics.z < 0` 時，**只有當 `a.physics.vz <= 0`** 才執行落地夾平（若 `a.physics.vz < 0` 為自空中落回地面，照原邏輯設 `a.physics.z = 0` 與判定墜落傷害；若 `a.physics.vz === 0`，代表無跳躍的純上坡位移補償，以 `a.physics.z *= dampFactor; if (a.physics.z > -0.5) a.physics.z = 0;` 平滑收斂回 0，不在第 1 幀硬跳）。當 `a.physics.vz > 0`（正在往上跳躍爬坡）時不夾平 `a.physics.z`。
  4. `engine/systems/PhysicsSystem.ts`：在呼叫 `this.engine.update(a, dt, engine)` **之前**，若 `a.trailHistory.length === 0` 且 `a.physics.vx * a.physics.vx + a.physics.vy * a.physics.vy > AFTERIMAGE.RECORD_SPEED_SQ`，先將起點 `{ x: a.px + a.physics.x, y: a.py + a.physics.y, z: a.physics.z, h: engine.map.getTerrainHeight(a.q, a.r) }` 推入 `a.trailHistory`，確保衝刺起點格被記錄為第一個殘影點。
- **DM3 目標**：
  1. `engine/systems/movement/MotionCommands.ts` 新增 `lungeToward(agent: Agent, targetPos: { x: number; y: number }, speed: number): void`：
     - 計算 `dx = targetPos.x - agent.px`、`dy = targetPos.y - agent.py`、`dist = Math.hypot(dx, dy)`；若 `dist <= 1.5` 直接返回。
     - 若 `Math.abs(dx) > 1.5`，更新 `agent.facing = dx > 0 ? 1 : -1`。
     - 單位方向 `dirX = dx / dist`、`dirY = dy / dist`；目前順向速度分量 `projV = agent.physics.vx * dirX + agent.physics.vy * dirY`；計算補差 `boost = Math.max(0, speed - projV)`，以 `+=` 寫入：`agent.physics.vx += dirX * boost; agent.physics.vy += dirY * boost;`（避免連續觸發時速度無限疊加超過格界）。
  2. `engine/systems/combat/SkillExecutor.ts` 的 `executeInstantSkill`：
     - `DASH` 分支（第 40～62 行）：若 `bestH` 存在，將 `teleportTo(source, bestH.q, bestH.r, engine); source.physics.vz += PHYSICS.VISUAL_JUMP_DASH;` 改為呼叫 `dashTo(source, bestH.q, bestH.r, engine)`；若 `bestH` 為 `null`（例如已貼身 `stepsTaken === 0` 或第一步被擋），則呼叫 `lungeToward(source, origin, PHYSICS.LUNGE_SPEED_ACTIVE)`，讓貼身放突進技也有前衝動作。
     - 非 `DASH` 分支（`else if`）：當 `skill.range >= 1 && skill.range <= 2 && (skill.projectileSpeed ?? 0) === 0 && skill.power > 0 && (targetHex.q !== source.q || targetHex.r !== source.r)` 時，呼叫 `lungeToward(source, origin, skill.tag === 'BASIC' ? PHYSICS.LUNGE_SPEED_BASIC : PHYSICS.LUNGE_SPEED_ACTIVE)`。

---

### 3. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **DM0** | 確認在分支 `feat/dash-motion` 且 `git status` 乾淨；跑基準檢查並記錄結果（不產生 commit，若基準不綠停下回報）。 | `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs` |
| **DM1** | 將 `data/skills/red_ult.ts` 的 `tr_u3`（`cast: 0.2 -> 0.3`）、`wr_u3`（`cast: 0.1 -> 0.3`）與 `data/skills/blue_ult.ts` 的 `wb_u5`（`cast: 0.2 -> 0.3`）調到 `0.3`；更新 `tests/ult-spec.baseline.json` 使 `"C1": []`（C1～C8 全部為空陣列）。 | `npx vitest run tests/UltSpec.test.ts tests/SkillDataIntegrity.test.ts`、`npm run lint` |
| **DM2** | 在 `constants/combat.ts` 的 `PHYSICS` 加入 `DASH_BURST_FACTOR`、`DASH_ARC_HEIGHT`、`LUNGE_SPEED_BASIC`、`LUNGE_SPEED_ACTIVE` 並更新 `tests/constants-snapshot.json`；在 `MotionCommands.ts` 實作 `dashTo`（更新檔頭）；在 `PhysicsEngine.ts` 修補上坡拋物線與下坡跨格界高度吸收；在 `PhysicsSystem.ts` 補高速起步起點紀錄；在 `SkillExecutor.ts` 接上 `dashTo`；新增 `tests/DashMotion.test.ts` 測試平地／上坡／下坡衝刺的速度曲線、無超調、世界高度連續（相鄰 tick 的 `groundH + physics.z` 變化量無單幀高差跳變）、殘影生成與朝向。 | `npx vitest run tests/DashMotion.test.ts tests/MotionCommands.test.ts tests/UnitGroundHeight.test.ts tests/AfterimageGhosts.test.ts tests/ConstantsBarrel.test.ts tests/AgentOwnership.test.ts tests/CoordinateProtocol.test.ts`、`npm run lint` |
| **DM3** | 在 `MotionCommands.ts` 實作 `lungeToward`；在 `SkillExecutor.ts` 將貼身 `DASH`（`bestH === null`）與非 `DASH` 的近戰攻擊（`range` 1～2、`projectileSpeed === 0`、`power > 0`）接上 `lungeToward`；在 `tests/DashMotion.test.ts` 新增近戰普攻／主動技／貼身突進的前衝測試（驗證前衝峰值位移落在 6～15 px、自動回彈歸位、全程 `HexUtils.fromPx(px + physics.x, py + physics.y)` 不跨出自身格、連續施放不疊爆、遠程與自身範圍技 `range === 0` 不前衝）。 | `npm run lint`、`npm test`、`npm run build` |
| **DM4** | 跑完整終局驗證（`lint`、`test`、`build`、`perf:guard`、`runtime-smoke`），撰寫 `docs/DASH_MOTION_REPORT.md`：改前／改後數字表（UltSpec 違規數、衝刺 80% 位移耗時、第 0 幀初速、上下坡最大單幀世界高度跳變、近戰前衝峰值位移 px）、每個改動的理由、保真與效能結果（若 `battle_frozen` 因 2.0 s 時單位正在前衝而超過 0.50%，請如實記錄數值、**不要重錄基準**，交由主代理審查處理）、回退指南（每個任務的 commit hash）。 | `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs`、`npx vitest run tests/DocDrift.test.ts` |

- DM1～DM4 每個任務一個獨立 commit。

---

### 4. 守則與停下條件（INV）
- `MotionCommands.ts` 與 `SkillExecutor.ts` 寫 `agent.physics.*` **只能用 `+=` 或 `-=`**（`AgentOwnership.test.ts` 守門）。
- 不得修改 `MapSystem`（`engine/systems/map.ts` 為 Facade）或 `Afterimage.ts`。
- 若 `UnitGroundHeight.test.ts`、`AfterimageGhosts.test.ts`、`ForcedMove.test.ts`、`AgentOwnership.test.ts`、`CoordinateProtocol.test.ts`、`LayerBoundary.test.ts` 任一既有測試失敗，必須找出原因修正，不得刪改既有測試斷言。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「位移技能軌跡跑完了」，主代理會審查 `git diff main...feat/dash-motion` 再問你要不要合併。
2. 實機看：
   - 突進技能（盾牌衝鋒 `tb_a1`、聖光突刺 `wb_a1`、野蠻衝撞 `tr_a1`、血腥突襲 `wr_a3` 等）是否從起點瞬間爆發衝出、帶殘影與前傾、在終點平滑煞停，且跨高低差時是躍起／躍下拋物線而非瞬移跳格。
   - 坦克與戰士的近戰普攻／主動技出手時，角色是否有向目標前衝再彈回的打擊動作。
