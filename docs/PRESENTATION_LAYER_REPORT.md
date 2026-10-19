# Presentation Layer Separation (ECS-lite S2 + S3) 實施報告

> **分支**：`feat/presentation-layer`  
> **基準 Commit**：`56274a8`（`main`）  
> **目標**：完成表現層與模擬層的物理目錄分離、單向依賴防護（Simulation -> Presentation 歸零）、GridSystem 渲染職責剝離、視覺狀態收束至 `agent.view`。  
> **結果**：全部 5 個任務（PL0～PL4）完成，單元測試（75 檔案／619 測試）、Lint、Build、保真度（6 場景 0.000 diff）、BR Soak（10/10 clean）、Verify Coords（0 diff）全數通過。

---

## 1. 變更清單（Tasks PL0 ～ PL4）

| 任務 | Commit | 變更類型 | 檔案數 | 主要變更內容 |
| :--- | :--- | :--- | :---: | :--- |
| **PL0** | `da0dea5` | `test(arch)` | 1 | 新增 `tests/LayerBoundary.test.ts`，建立模擬端至表現端依賴的棘輪保護機制（初始 baseline 36）。 |
| **PL1** | `bc878d5` | `feat(arch)` | 6 | 建立 `engine/core/ViewCommands.ts` 匯出純函式；將 `ActiveZone` 移至 `types.ts`；修改 `CombatSystem`、`DamageCalculator`、`ZoneSystem`、`combat.ts` 改用純函式與 types。棘輪降至 19。 |
| **PL2** | `ce0ab0e` | `feat(arch)` | 41 | 移動 `vfx/**` 與 `visuals/**` 至 `engine/presentation/`；更新 barrel（`engine/systems/vfx.ts`、`visuals.ts`）；更新全專案引用路徑與檔案頂部職責註解。 |
| **PL3** | `b2ac263` | `feat(arch)` | 30 | 移動 `UnitSystem`、`hud`、`VisualSystem`、`AnimationSystem`、`CameraSystem`、`CameraTargetGroup`、`DirectorSystem`、`DesignExporter` 至 `engine/presentation/`；移動 `GridCache` 至 `engine/renderers/grid/`；在 `types.ts` 定義 `Camera` 與 `HexSpatialLookup` 介面；拆分 `GridSystem`，將渲染責任（`GridRenderStrategy`、`GridCache`、`submitRenderables`）移轉給 `TacticalRenderer`。棘輪歸零（36 → 19 → 0）。 |
| **PL4** | `d24d4cb` | `feat(arch)` | 20 | 在 `types.ts` 定義 `SpecialVisualStatus` 與 `AgentView`；在 `ViewCommands.ts` 實作 `createAgentView` 與 `resetAgentView`；將 `Agent` 的 `visualStatus`、`hitFlashTimer`、`visualOffset` 收納進 `agent.view`；更新所有渲染器、測試與 probe；更新 `AgentOwnership.ts`；新增 `tests/AgentView.test.ts` 守門測試。 |

---

## 2. 邊界測試結果（Simulation → Presentation 依賴進程）

依據 `tests/LayerBoundary.test.ts` 掃描結果：

| 階段 | Simulation → Presentation 引用數 | Presentation → Systems 引用數 | 狀態 |
| :--- | :---: | :---: | :--- |
| **Step 0 基準** | 36 | 23 | 初始測量 |
| **Task PL0** | 36 | 23 | 測試與基準鎖定 |
| **Task PL1** | 19 | 23 | ViewCommands 與 ActiveZone 提取完成 |
| **Task PL2** | 19 | 20 | vfx / visuals 搬遷完成 |
| **Task PL3** | **0** | **5** | 表現層系統搬遷與 GridSystem 渲染職責剝離完成，**完全歸零** |
| **Task PL4** | **0** | **5** | `agent.view` 收束完成，保持為 0 |

### Presentation → Systems 殘留 5 個引用分析
1. `engine/presentation/AnimationSystem.ts` → `engine/systems/unit/RagdollFactory.ts`（布娃娃物理介面）
2. `engine/presentation/DirectorSystem.ts` → `engine/systems/combat/DamageCalculator.ts`（純數值推算）
3. `engine/presentation/UnitSystem.ts` → `engine/systems/movement/movementConstants.ts`（移動常數）
4. `engine/presentation/UnitSystem.ts` → `engine/systems/unit/RagdollFactory.ts`（布娃娃物理介面）
5. `engine/presentation/vfx/ParticleBuffer.ts` → `engine/systems/agentManager.ts`（單位參照型別）

> 表現層引用系統層的常數與資料型別屬於合法單向依賴（Presentation 允許依賴 Simulation，禁止逆向依賴）。

---

## 3. 保真度前後對比（Render Fidelity）

執行指令：`npm run perf:fidelity`（對比 `public/assets/baselines/` 基準影像）

| 場景 | Baseline meanAbsDiff | PL4 後 meanAbsDiff | 差異 (Delta) | 門檻 | Bad Pixel % | 結果 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **VOID** | 0.194 | 0.194 | **0.000** | <= 0.8 | 0.01% (<= 0.5%) | **PASS** |
| **FOREST** | 0.635 | 0.635 | **0.000** | <= 0.8 | 0.16% (<= 0.5%) | **PASS** |
| **ICE** | 0.234 | 0.234 | **0.000** | <= 0.8 | 0.21% (<= 0.5%) | **PASS** |
| **MAGMA** | 0.237 | 0.237 | **0.000** | <= 0.8 | 0.03% (<= 0.5%) | **PASS** |
| **DESERT** | 0.513 | 0.513 | **0.000** | <= 0.8 | 0.22% (<= 0.5%) | **PASS** |
| **battle_frozen** | 0.422 | 0.422 | **0.000** | <= 0.8 | 0.16% (<= 0.5%) | **PASS** |

所有場景的渲染誤差完全與重構前保持相同（0.000 絕對差異），達成像素級完全一致。

---

## 4. Battle Royale Soak 測試結果

執行指令：`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`

| Seed | 模擬時長 | 幀數 | 勝者 | 幽靈單位 (Ghosts) | 發呆 (Idles) | 結果 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **#1001** | 10.89s | 660 | RED | 0 | 0 | **PASS (Clean)** |
| **#1002** | 12.02s | 720 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1003** | 9.48s | 10800 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1004** | 15.33s | 930 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1005** | 12.00s | 720 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1006** | 12.46s | 750 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1007** | 15.00s | 900 | RED | 0 | 0 | **PASS (Clean)** |
| **#1008** | 14.47s | 870 | RED | 0 | 0 | **PASS (Clean)** |
| **#1009** | 7.78s | 10800 | BLUE | 0 | 0 | **PASS (Clean)** |
| **#1010** | 13.94s | 840 | RED | 0 | 0 | **PASS (Clean)** |

- **總結**：10/10 Clean Seeds，0 幽靈殘留，0 異常發呆。

---

## 5. Verify Coords 座標協定守門

執行指令：`npm run verify:coords`（比對基準 `tools/ui-e2e/out/coord_guard.json`）

| 指標 | 重構前基準 | PL4 後實測 | 差異 |
| :--- | :---: | :---: | :---: |
| **Depth Flips** | 8907 | 8907 | **0** |
| **Oscillations** | 85 | 85 | **0** |
| **Early Passes** | 81 | 81 | **0** |
| **Sinks** | 0 | 0 | **0** |

所有深層層級穿透與排序行為 100% 符合基準，未改變任何渲染幾何、投影或深度排序邏輯。

---

## 6. 未收進 `view` 欄位的分析與決策記錄

依據任務規範 §1 與 §PL4 要求，下列兩個欄位經過完整寫入者分析後，決定保留在 `Agent` 本體：

### 1. `animState`
- **寫入者清單**：
  - `engine/presentation/AnimationSystem.ts`（行 35, 54, 58, 64, 73, 76, 80, 84, 88：依動作、死亡與受擊推導狀態）
  - `engine/systems/agentManager.ts`（行 34：`agent.animState = AnimState.IDLE;` 單位生成時初始化）
  - `engine/core/Agent.ts`（行 151：`this.animState = AnimState.IDLE;` 單位重置時復原）
- **保留原因**：
  `agentManager.ts` 位於 `engine/systems/`（核心模擬層）。若將 `animState` 移入 `agent.view`，則模擬層的單位生成邏輯將直接寫入表現層資料結構，這會違反「模擬層不得直寫 `view` 欄位」的架構約束。且若為了避免直寫而將 `animState` 也透過 command 包裝，將造成單位生命週期初始化與物理重置過度複雜化。因此，`animState` 作為模擬與動畫驅動的關鍵狀態橋樑，保留在 `Agent` 本體上。

### 2. `trailHistory`
- **寫入者清單**：
  - `engine/systems/PhysicsSystem.ts`（行 28：`a.trailHistory.unshift({ x: a.physics.x, y: a.physics.y, z: a.physics.z });`）
  - `engine/core/Agent.ts`（行 171：`this.trailHistory.length = 0;` 在 `reset()` 時清空）
- **保留原因**：
  `trailHistory` 係由核心模擬物理循環 `PhysicsSystem` 在每個物理 tick 更新與維護，供位移軌跡與殘影計算使用。若將其移入 `agent.view`，模擬層的核心物理系統在每次物理更新時都必須寫入 `agent.view`，嚴重破壞模擬層對表現層的單向解耦原則。因此 `trailHistory` 留在 `Agent` 上完全符合架構規範。

---

## 7. 未移動檔案的原因記錄

### `engine/systems/unit/RagdollFactory.ts`
- **決定**：保留在 `engine/systems/unit/`，未搬遷至 `engine/presentation/`。
- **引用分析**：
  - 被 `engine/systems/agentManager.ts`（模擬層）在生成單位與重置時引用（`RagdollFactory.createRagdoll(...)`）。
  - 若將 `RagdollFactory.ts` 移入 `engine/presentation/`，則會導致模擬層核心檔案 `agentManager.ts` 產生對表現層的逆向 import，破壞 LayerBoundary 守門測試的歸零結果。因此保留在系統層，並由表現層的 `UnitSystem.ts` 與 `AnimationSystem.ts` 依賴。

---

## 8. 回退指南（Rollback Guide）

若審查過程需要回退特定階段，請依照下列依賴順序進行（依賴反向回退）：

```text
PL4 ──> PL3 ──> PL2 ──> PL1 ──> PL0
```

### 回退單一 Task 的指令：
1. **回退 Task PL4 (`d24d4cb`)**：
   ```bash
   git revert d24d4cb --no-edit
   ```
   *影響*：將 `agent.view` 還原為分散的 `visualStatus`、`hitFlashTimer`、`visualOffset`。

2. **回退 Task PL3 (`b2ac263`)**：
   ```bash
   git revert d24d4cb --no-edit  # 必須先回退 PL4
   git revert b2ac263 --no-edit
   ```
   *影響*：將表現層系統搬回 `engine/systems/`，並還原 `GridSystem` 的渲染職責。

3. **回退 Task PL2 (`ce0ab0e`)**：
   ```bash
   git revert d24d4cb --no-edit
   git revert b2ac263 --no-edit
   git revert ce0ab0e --no-edit
   ```
   *影響*：將 `vfx/**` 與 `visuals/**` 還原回 `engine/systems/`。

4. **回退 Task PL1 (`bc878d5`)**：
   ```bash
   git revert d24d4cb --no-edit
   git revert b2ac263 --no-edit
   git revert ce0ab0e --no-edit
   git revert bc878d5 --no-edit
   ```
   *影響*：移除 `ViewCommands.ts`，將受擊抖動與白閃還原為直接寫入 `Agent`。

5. **回退 Task PL0 (`da0dea5`)**：
   ```bash
   git revert --no-edit d24d4cb b2ac263 ce0ab0e bc878d5 da0dea5
   ```
   *影響*：移除邊界守門測試，完全復原至初始狀態。

---

## 9. 驗證指令集總結

驗證重構成果時可隨時執行以下命令：

```bash
npm run lint         # 0 errors
npm test             # 75 passed, 619 tests
npm run build        # vite production build OK
npm run perf:fidelity# 6 場景全部 PASS，誤差完全對齊基準
npm run perf:guard   # 效能防線全部 PASS
node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle # 10/10 clean
npm run verify:coords# flips=8907, osc=85, ep=81, sink=0 (0 diff)
```
