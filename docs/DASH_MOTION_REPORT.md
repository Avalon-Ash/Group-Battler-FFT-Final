# DASH_MOTION 實作報告（DM）

> 任務：位移技能軌跡、近戰前衝與奧義 C1 歸零
> 分支：`feat/dash-motion`
> 日期：2026-10-22

---

## 1. 改前／改後數字對照表

| 指標 | 改前 | 改後 | 備註 |
| :--- | :--- | :--- | :--- |
| **UltSpec 違規數** | 3 項（C1: `tr_u3`, `wb_u5`, `wr_u3`） | **0 項**（C1～C8 全部為空陣列 `[]`） | 奧義 cast 調為 0.3，滿足 `cast >= hitAt` 規範 |
| **衝刺 80% 位移耗時** | 約 `0.192 s` | 約 **`0.128 s`**（降幅 ~33%） | 爆發初速驅動，ease-out 平滑滑入終點 |
| **單格衝刺第 0 幀初速** | `vx = 0, vy = 0`（0 px/s） | **`vx ≈ 665 px/s`**（> 600 px/s） | 乘位移向量之爆發倍率 `DASH_BURST_FACTOR = 12` |
| **衝刺殘影首幀起點** | 遺漏起點格（前推進 ~17% 才記第一點） | **起點格精準記錄**（第 1 個殘影點在起點） | 在物理更新前補足首幀起點快照 |
| **上坡最大單幀世界高度跳變** | `48 px`（瞬間跳上高台頂，跳躍初速被夾平） | **`< 20 px`**（自然重力拋物線連續上升） | 起跳拋物線弧頂高出目標地面 `18 px` |
| **下坡最大單幀世界高度跳變** | `48 px`（跨格界時單幀下墜，無高度吸收） | **`0 px`**（格界瞬變值由 `physics.z` 100% 吸收） | 跨出格界當幀世界高度連續，轉入自然重力落下 |
| **近戰普攻前衝峰值位移** | `0 px`（站在原地不動） | **`≈ 8.8 px`**（初速 420 px/s，落在 6～15 px） | 彈簧自動拉回，`HexUtils.fromPx` 全程不離原格 |
| **近戰主動技前衝峰值位移** | `0 px`（站在原地不動） | **`≈ 11.2 px`**（初速 540 px/s，落在 6～15 px） | 彈簧自動拉回，`HexUtils.fromPx` 全程不離原格 |
| **貼身突進前衝峰值位移** | `0 px`（站在原地不動） | **`≈ 11.2 px`**（初速 540 px/s，落在 6～15 px） | `bestH === null` 時退回主動前衝，打擊感完整 |
| **連續觸發前衝速度疊加** | 無前衝 | **速度嚴格封頂**（最高限速不超過 540 px/s） | 補差公式 `boost = max(0, speed - projV)` 防超限 |

---

## 2. 核心改動內容與設計理由

### 2.1 奧義時序 C1 規範化（DM1）
- **改動**：
  - `data/skills/red_ult.ts`：`tr_u3`（不朽屍王，護盾奧義）由 `cast: 0.2` 調為 `cast: 0.3`。
  - `data/skills/red_ult.ts`：`wr_u3`（惡魔降臨，攻速吸血奧義）由 `cast: 0.1` 調為 `cast: 0.3`。
  - `data/skills/blue_ult.ts`：`wb_u5`（光速斬擊，瞬移斬擊奧義）由 `cast: 0.2` 調為 `cast: 0.3`。
  - `tests/ult-spec.baseline.json`：`"C1": []`，所有奧義 C1～C8 規範違規全數清零。
- **理由**：奧義時序標準規範要求 `cast >= hitAt`（預設命中時機為 0.3 秒）。將最後 3 個暫緩招式調整為 0.3 秒詠唱，消除時序瑕疵且未對技能機制產生負面影響。

### 2.2 衝刺順向爆發初速與彈簧軌跡（DM2）
- **改動**：
  - 在 `constants/combat.ts` 的 `PHYSICS` 增加 `DASH_BURST_FACTOR: 12`、`DASH_ARC_HEIGHT: 18`、`LUNGE_SPEED_BASIC: 420`、`LUNGE_SPEED_ACTIVE: 540`，並同步更新 `tests/constants-snapshot.json`。
  - 在 `engine/systems/movement/MotionCommands.ts` 實作 `dashTo(agent, q, r, engine)`：
    1. 記錄起始位置並呼叫 `teleportTo`。若單位原在走動則呼叫 `stopMovement`。
    2. 以水平位移差計算朝向（`dx > 0 ? 1 : -1`）。
    3. 以 `+=` 注入爆發速度 `dx * DASH_BURST_FACTOR` 與 `dy * DASH_BURST_FACTOR`。
    4. 計算上坡高差（`uphill = Math.max(0, -agent.physics.z)`），計算起跳速度 `targetVz = Math.max(VISUAL_JUMP_DASH, Math.sqrt(2 * GRAVITY * (uphill + DASH_ARC_HEIGHT)))`，以 `+=` 補足起跳初速。
  - 在 `engine/systems/combat/SkillExecutor.ts`：突進技能（`DASH`）成功位移時改呼叫 `dashTo`。
- **理由**：舊版 `teleportTo` 在突進時初速為 0，速度在前幾幀緩慢爬升，缺乏突進爆發感且前兩幀無法觸發殘影與前傾。注入順向爆發初速後，第 0 幀速度即突破 600 px/s，立即觸發前傾與殘影，隨後由過阻尼彈簧平滑減速滑入終點，無可辨識超調（< 0.2 px）。

### 2.3 跨高度連續性修補（DM2）
- **改動**：
  - 在 `engine/physics/PhysicsEngine.ts` 的 `stepPhysics`：
    1. 重力減速條件擴充為 `else if (isAirborne || a.physics.z > 0.1 || a.physics.vz > 0)`，讓上坡起跳（`physics.z < 0` 且 `vz > 0`）全程受重力拋物線減速。
    2. 水平位置積分前後，使用 `VisualMath.getUnitGroundHeight` 測量 `gBefore` 與 `gAfter`。當視覺腳點越過高台格進入低處格（`gAfter < gBefore`）時，將高度落差累加至 `physics.z += gBefore - gAfter`。
    3. 落地夾平條件由 `isGroundValid && a.physics.z < 0` 修正為僅在 `a.physics.vz <= 0` 時執行夾平。當 `a.physics.vz === 0` 時，以 `a.physics.z *= dampFactor; if (a.physics.z > -0.5) a.physics.z = 0;` 平滑收斂回地面，杜絕硬跳。
- **理由**：
  - **上坡**：解決首幀 `stepPhysics` 強制將負 `physics.z` 夾平為 0 並將 `vz` 歸零的 bug，使單位能以拋物線跳上高台，弧頂高出高台頂 18 px。
  - **下坡**：解決單位視覺位置滑出高台格時，地面高度單幀驟降而 `physics.z` 未吸收造成的下墜跳變，實現世界高度 `groundH + physics.z` 在格界 0 偏差平滑過渡。

### 2.4 殘影起點幀紀錄（DM2）
- **改動**：
  - 在 `engine/systems/PhysicsSystem.ts`：在呼叫 `this.engine.update` 之前，若 `trailHistory` 為空且速度大於殘影紀錄門檻，先行推入當前起點座標。
- **理由**：解決 tick 執行順序（`physics` → `combat`）導致衝刺起點在下一 tick 物理積分前進約 17% 後才被寫入殘影、造成起點格缺漏的問題。

### 2.5 近戰打擊前衝與貼身突進補償（DM3）
- **改動**：
  - 在 `engine/systems/movement/MotionCommands.ts` 實作 `lungeToward(agent, targetPos, speed)`：
    1. 計算目標距離與方向向量，若距離 `<= 1.5 px` 則返回。
    2. 依位移差更新單位朝向。
    3. 計算單位順向速度投影 `projV`，以 `boost = Math.max(0, speed - projV)` 補差速度，全程僅使用 `+=` 注入。
  - 在 `engine/systems/combat/SkillExecutor.ts`：
    1. 突進技能貼身放（`bestH === null`）時，退回呼叫 `lungeToward(source, origin, LUNGE_SPEED_ACTIVE)`。
    2. 射程 1～2、無投射物且非自身施法的近戰攻擊（普攻與技能），呼叫 `lungeToward`（普攻初速 420 px/s，主動技初速 540 px/s）。
- **理由**：賦予近戰職業強烈的前衝打擊感；前衝峰值位移嚴格限制於 6～15 px，不脫離當前六角格，且速度封頂機制避免快速連續施放累積過大位移。

---

## 3. 測試與驗證結果

### 3.1 單元測試
- **指令**：`npm test`
- **結果**：**88 test files, 695 tests 全部通過 (EXIT=0)**。
- **新測試**：`tests/DashMotion.test.ts` 包含 10 個測試案例，全數通過：
  1. 平地衝刺爆發初速、面向與平滑減速
  2. 衝刺面向反轉
  3. 首幀起點殘影紀錄
  4. 上坡衝刺重力拋物線與無瞬移跳變
  5. 下坡衝刺跨格界高度吸收與無單幀瞬降
  6. 近戰普攻前衝位移（6～15 px、原格內、彈簧歸位）
  7. 近戰主動技前衝位移（6～15 px、原格內、彈簧歸位）
  8. 貼身突進（`stepsTaken === 0`）前衝退回
  9. 連續前衝速度防爆封頂
  10. 遠程／自身範圍技無前衝

### 3.2 代碼品質（Lint）
- **指令**：`npm run lint`（`tsc --noEmit`）
- **結果**：**0 errors (EXIT=0)**。

### 3.3 生產建置（Build）
- **指令**：`npm run build`
- **結果**：**成功產出 production bundle (EXIT=0)**。

### 3.4 渲染保真度與效能守門（Perf Guard）
- **指令**：`npm run perf:guard`
- **保真度測試結果**：
  - `DESERT`: meanAbsDiff=0.499 (<= 0.8), badPixelPct=0.23% (<= 0.5%) -> **PASS**
  - `FOREST`: meanAbsDiff=0.627 (<= 0.8), badPixelPct=0.17% (<= 0.5%) -> **PASS**
  - `ICE`: meanAbsDiff=0.188 (<= 0.8), badPixelPct=0.22% (<= 0.5%) -> **PASS**
  - `MAGMA`: meanAbsDiff=0.108 (<= 0.8), badPixelPct=0.04% (<= 0.5%) -> **PASS**
  - `battle_frozen`: meanAbsDiff=0.435 (<= 0.8), badPixelPct=**0.32%** (<= 0.5%) -> **PASS**
  - **ALL FIDELITY CHECKS PASSED**（無任何基準重錄）。
- **效能測試結果**：
  - 各地形均維持在 16.67ms～17.59ms，遠低於 1.5x 閾值（26.38ms～26.46ms）。
  - **ALL performance guardrails PASSED**。

### 3.5 執行期冒煙測試（Runtime Smoke）
- **指令**：`node tools/ui-e2e/runtime-smoke.mjs`
- **結果**：
  - `agents=10 running=true battleTime 0.52 -> 4.57 s`
  - **PASS: runtime smoke (0 page errors, engine advancing, canvas changing)**。

### 3.6 文件漂移檢查（Doc Drift）
- **指令**：`npx vitest run tests/DocDrift.test.ts`
- **結果**：**3 passed (EXIT=0)**。

---

## 4. 回退指南與 Commit 歷程

| Commit | 說明 | 異動檔案 |
| :--- | :--- | :--- |
| **`7971066`** | fix(ult): align cast times for tr_u3, wr_u3, wb_u5 to 0.3 to clear C1 baseline (DM1) | `data/skills/blue_ult.ts`<br>`data/skills/red_ult.ts`<br>`tests/ult-spec.baseline.json` |
| **`bca589e`** | feat(motion): add dash burst speed, continuous uphill/downhill physics, and trail start recording (DM2) | `constants/combat.ts`<br>`engine/physics/PhysicsEngine.ts`<br>`engine/systems/PhysicsSystem.ts`<br>`engine/systems/combat/SkillExecutor.ts`<br>`engine/systems/movement/MotionCommands.ts`<br>`tests/constants-snapshot.json`<br>`tests/DashMotion.test.ts` |
| **`916ea17`** | feat(motion): add melee attack and point-blank dash lunge with anti-stacking speed cap (DM3) | `engine/systems/movement/MotionCommands.ts`<br>`engine/systems/combat/SkillExecutor.ts`<br>`tests/DashMotion.test.ts` |
| **當前 Commit** | docs(motion): add completion report for dash motion and melee lunge (DM4) | `docs/DASH_MOTION_REPORT.md` |

如需完全回退本輪修改，可執行：
```bash
git revert --no-commit 916ea17 bca589e 7971066
```
或直接由主代理評估合併 `feat/dash-motion` 至 `main`。
