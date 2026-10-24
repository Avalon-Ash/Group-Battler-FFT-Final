# CLOSE02 結案報告：全庫清冊審查與 COORD 因果收斂

- **基底 (Base)**：`bf79fa2`（主審 AUDIT01 修復完成點）
- **分支 (Branch)**：`feat/project-cleanup`
- **交付包 (Package)**：CLOSE02
- **執行時間**：2026-10-24

---

## 1. 執行總結與關鍵成果

本輪嚴格遵循 `AGENTS.md` 實作代理合約與 `PROJECT_CLEANUP_CLOSE02_AGENT_PROMPT.md`，完成全庫清冊審查、死碼分析與 COORD01 渲染座標協議違規因果收斂：

1. **COORD01 因果確證**：
   - **SINK 1.89px**：確證為 `physics.x = +2.04px` 衝量將單位足跡滯留於原高格 `(3,0)`，因 `hv.q === agent.q` 使 `VisualMath.ts:112` 之 `Math.max` 守衛未觸發，而在 `moveProgress > 0.5` 下降步階過渡中提早插值下陷。
   - **VOID 滯空誤報**：確證為離散 60Hz 自由落體加速穿越 $z=0$ 時（f512: $z=0.42\text{px}, v_z=-614.3\text{px/s}$），探針僅以 $pz \in [-1, 1]$ 判定滯地導致之診斷偽陽性；f511~f540 完整軌跡證實持續等加速下墜至 $z < -1000$ 觸發出界回收，產品引擎行為完全正確。
   - **STATIC 震盪 (C:RED-0010 vs H:1,2)**：確證為四重因果鏈——(1) `deathMotion.ts` 指數衰減滑行漸近尾端微抖動；(2) 靜止達 12 幀觸發 `release_after_still` 跳入 `(1,2)`；(3) `UnitFrame.ts:198` 將 `dNew` 誤用 `cOld.y` 導致滯後判定失真提前翻回 `(2,1)`；(4) `sortBias` 在兩格格心間出現 $15.16\text{px}$ 突變，越過危害鍵引發 A-B-A 錯序。
   - **新發現缺陷 `TYPO-UNITFRAME-01`**：`UnitFrame.ts:198` 之 `const dNew = Math.hypot(footX - cNew.x, footY - cOld.y)` 混淆新舊格坐標。

2. **全庫清冊審查完成**：
   - 審查全專案 664 個 Git 追蹤檔案，對照 659 列清冊與 5 個本輪新增追蹤文件差集。
   - 逐檔確認用途、上游調用者、下游依賴、檔頭狀態、導出符號與證據位置，不再留有「未讀（待查）」狀態。
   - 標註 64 個孤立導出符號候選（95% 為內部 Props/Def 型別介面），提出精確死碼處置計畫。

---

## 2. 改動範圍與 Stage 清單

依合約規定，未經主代理核准不擅改產品核心執行邏輯：

| 檔案 | 類別 | 改動說明 |
| :--- | :--- | :--- |
| `tools/ui-e2e/cleanup-coord01-check.mjs` | 取證工具 | 安裝 `resolveSortHex` 攔截點、前中後幀三聯截圖、VOID 完整 511~540 自由落體生命週期追蹤 |
| `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` | 清冊更新 | 659 檔全面對照職責、上游下游、檔頭分類、語義審查與測試狀態 |
| `docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv` | 瑕疵清單 | 更新 COORD 三項因果與最小改動範圍，新增 `TYPO-UNITFRAME-01` |
| `docs/PROJECT_CLEANUP_CLOSE02_REPORT.md` | 新增報告 | 本結案交付報告 |

---

## 3. Package B：COORD01 因果證據與分析

### 3.1 CASE 1：SINK 違規 (FOREST seed 1001 f337 RED-0002)

- **取證數據**：
  - 起點格：`(3, 0)`（高台 $h_A = 96\text{px}$，地塊頂面 $Y = -96.00\text{px}$）
  - 目標格：`(2, 0)`（低台 $h_B = 24\text{px}$）
  - f336：$px=206.74, \text{physics}.x=+2.34, tx=209.08, \text{moveProgress}=0.513, groundH=95.41, unitTy=-95.41, \Delta=0.59\text{px}$
  - f337：$px=205.84, \text{physics}.x=+2.04, tx=207.88, \text{moveProgress}=0.524, groundH=94.11, unitTy=-94.11, \Delta=1.89\text{px}$（違例觸發）
  - f338：$px=204.94, \text{physics}.x=+1.75, tx=206.68, \text{moveProgress}=0.535, groundH=92.16, unitTy=-92.16, \Delta=3.84\text{px}$
- **因果分析**：
  1. `UNIT_STEP_BLEND.FALL_START` 定義為 0.5。當 `moveProgress > 0.5` 時，`VisualMath.getUnitGroundHeight` 判定進入下坡過渡，以 `smoothstep(0.5, 0.75, t)` 向下插值。
  2. 但因單位受擊帶有 `physics.x = +2.04px` 衝量，足跡 $tx = 207.88\text{px}$ 仍在格界以右（尚未越入目標格 `(2, 0)`，格界約為 $x = 207.85\text{px}$），`HexUtils.fromPx` 仍判定為 `(3, 0)`。
  3. `VisualMath.ts:112` 之保護條件為：
     ```ts
     const hv = HexUtils.fromPx(agent.px + agent.physics.x, agent.py + agent.physics.y, mapConfig);
     if (hv.q !== agent.q || hv.r !== agent.r) h = Math.max(h, heightAt(hv.q, hv.r));
     ```
     因 `agent.q === 3` 且 `hv.q === 3`，`hv.q !== agent.q` 為 **false**！
  4. 插值高度 $h = 94.11\text{px}$ 直接作為腳底高度，使單位在未真正踏出 `(3, 0)` 高台時，腳底繪製位置 $Y = -94.11\text{px}$ 比地塊頂面 $Y = -96.00\text{px}$ 低了 $1.89\text{px}$。
- **代表性截圖**：`tools/ui-e2e/out/close02-run1/case1_sink_f336.png`, `f337.png`, `f338.png`。

---

### 3.2 CASE 2：OVER-VOID 違規 (FOREST seed 1002 f512 BLU-0007)

- **取證數據與生命週期軌跡**：
  - f511：$z=10.62\text{px}, v_z=-555.9\text{px/s}, hp=1360, \text{isGroundValid}=\text{false}$
  - f512：$z=0.42\text{px}, v_z=-614.3\text{px/s}, hp=1360, \text{isGroundValid}=\text{false}$（探針誤報）
  - f513：$z=-10.75\text{px}, v_z=-672.6\text{px/s}, hp=1360, \text{isGroundValid}=\text{false}$
  - f514~f530：$z$ 由 $-22.9\text{px}$ 快速墜落至 $-349.4\text{px}$，$v_z$ 加速至 $-1664.3\text{px/s}$
  - f540：$z=-679.9\text{px}, v_z=-2247.6\text{px/s}$
  - $z < -1000\text{px}$ 時：`PhysicsEngine.ts:150` 觸發 `outOfBounds = true`，派發 `applyLethal` 與 `handleDeadState('墜落', 'RING_OUT')`。
- **因果分析**：
  - 單位以物理重力加速度（$3500\text{px/s}^2$）向下墜入虛空，離散 60Hz 步進單幀下落約 $10\sim 20\text{px}$。
  - 在 f512，單位下墜過程恰巧穿越 $z=0$ 平面（$z = 0.42\text{px}$）。
  - `tools/ui-e2e/lib/coord-probes.mjs:274-276`：
    ```ts
    const pz = a.physics.z;
    if (pz < -1) { S.sink.fallingSamples++; continue; }
    if (pz >= 1) continue;
    S.sink.groundedSamples++;
    ```
    探針粗糙地將所有 $pz \in [-1, 1]$ 判定為「落地著地樣本 (`groundedSamples`)」，因腳下無地塊而誤報為「單位停留在虛空」。
  - 實體生命週期追蹤證實：單位並未落地滯留，而是在持續等加速下墜，直至出界回收。

---

### 3.3 CASE 3：STATIC OSCILLATION (VOID seed 1002 f507/508/510 C:RED-0010 vs H:1,2)

- **取證數據 (`resolveSortHexTrace`)**：
  - f507：$\text{footX}=203.821, \text{footY}=58.838, \text{raw}=(1,2), \text{memBefore}=(2,1), \text{still}=11, \text{releaseCond}=\text{true} \to$ 分支 `release_after_still`，強制切換至 `(1,2)`，`released` 設為 true。`sortBias` 躍升至 $+13.16\text{px}$，`corpseOp.index` (176) < `hazard1.index` (195)。
  - f508：$\text{footX}=203.830, \text{footY}=58.841, \text{raw}=(1,2), \text{mem}=(1,2)$，維持 `(1,2)`。`sortBias` 為 $+13.16\text{px}$，`corpseOp.index` (194) > `hazard1.index` (189)（**錯序翻轉**）。
  - f509：$\text{footX}=203.848, \text{footY}=58.846, \text{raw}=(2,1)$。`releaseCond=false`。計算滯後切換：
    - `UnitFrame.ts:198` 計算 $dNew = \text{hypot}(203.85 - 207.85, 58.85 - 72.0) = 13.75\text{px}$（因誤用 $cOld.y=72$，真實距離應為 $23.19\text{px}$）。
    - $dOld = 39.81\text{px}$。
    - 因 $13.75 + 4 < 39.81$，觸發 `hysteresis_switch`，翻轉回 `(2,1)`！
  - f510：$\text{footX}=203.856, \text{footY}=58.848, \text{raw}=(1,2), \text{mem}=(2,1)$。計算滯後判定 $dNew(43.98) + 4 < dOld(23.19)$ 不成立，分支 `hysteresis_held`，維持 `(2,1)`。`sortBias` 降回 $-2.00\text{px}$，`corpseOp.index` (172) < `hazard1.index` (190)（**再次翻回**）。
- **因果分析**：
  1. **衰減尾端微位移**：`deathMotion.ts` 的 $1 - e^{-kt}$ 在 $t=1.56\text{s}$ 仍有次像素微位移，因屍體正好停在 `(2,1)` 與 `(1,2)` 幾何格界，使 `fromPx` 計算出的 `raw` 在兩格間跳動。
  2. **靜止釋放條件**：`mem.still` 累積達 12 幀，觸發 `release_after_still`，迫使記憶格跳到 `raw (1,2)`。
  3. **計算缺陷**：`UnitFrame.ts:198` 之代碼 Bug（`cOld.y`）大幅低估了到新格的距離，使滯後保護失效，提早切回 `(2,1)`。
  4. **鍵值突變**：`sortBias = Math.max(footY, hexCenterY) - footY`，格心由 36 變為 72 時產生 $15.16\text{px}$ 突變，跨越 Hazard 造成畫面前後穿透閃爍。

---

### 3.4 CASE 4：CONTEXT 2 對照 (VOID seed 1001 f563/564/565 C:RED-0002 vs H:4,0)

- 該樣本在 f563~565 期間移動了 $46.99\text{px}$，屬高速擊飛滑行中狀態，非靜止屍體。
- 證實 probe 檢測到的靜態翻轉與移動翻轉具有完全不同的物理前提，不可混為一談。

---

## 4. D3 修復設計提案（供主代理直接核准）

### 提案 1：修復 `UnitFrame.ts:198` 滯後距離計算缺陷 (`TYPO-UNITFRAME-01`)
- **P/D**：P3 / D1
- **唯一寫入者**：`UnitFrameStore.resolveSortHex`
- **檔案與行號**：[UnitFrame.ts:198](file:///c:/Git/Group-Battler-FFT-Final/engine/renderers/frame/UnitFrame.ts#L198)
- **改動前**：
  ```ts
  const dNew = Math.hypot(footX - cNew.x, footY - cOld.y);
  ```
- **改動後**：
  ```ts
  const dNew = Math.hypot(footX - cNew.x, footY - cNew.y);
  ```
- **行為驗證**：修復混合坐標造成的距離計算失真，確保到新格格心的歐氏距離正確無誤。

---

### 提案 2：`deathMotion.ts` 擊飛滑行增加衰減截斷 (`COORD-OSC-01`)
- **P/D**：P2 / D3
- **唯一寫入者**：`computeDeathOffset`
- **檔案與行號**：[deathMotion.ts:18-32](file:///c:/Git/Group-Battler-FFT-Final/data/units/appearance/deathMotion.ts#L18-L32)
- **設計概念**：
  - 指數衰減 $1 - e^{-kt}$ 在 $t > 1.2\text{s}$ 時每幀位移已小於 $0.01\text{px}$，肉眼完全不可見，卻會造成邊界格 `fromPx` 翻轉。
  - 當瞬時滑行速率或經過時間超過門檻（如 $t \ge 1.2\text{s}$ 或剩餘位移變化率低於閾值），固定該位移輸出為精確常數。
  - **保留反例響應**：屍體後續若受其他外力衝量或地形塌陷，位移與高度計算依然依循物理/重力公式自然反應，不對 `sortHex` 進行永久鎖死。

---

### 提案 3：`VisualMath.ts` 下坡過渡地面高度保證 (`COORD-SINK-01`)
- **P/D**：P2 / D3
- **唯一寫入者**：`VisualMath.getUnitGroundHeight`
- **檔案與行號**：[VisualMath.ts:108-114](file:///c:/Git/Group-Battler-FFT-Final/engine/math/VisualMath.ts#L108-L114)
- **改動前**：
  ```ts
  const hv = HexUtils.fromPx(agent.px + agent.physics.x, agent.py + agent.physics.y, mapConfig);
  if (hv.q !== agent.q || hv.r !== agent.r) h = Math.max(h, heightAt(hv.q, hv.r));
  ```
- **改動後**：
  ```ts
  const hv = HexUtils.fromPx(agent.px + agent.physics.x, agent.py + agent.physics.y, mapConfig);
  // 精靈足跡所在格的地表高度為硬下限：未真正跨出當前格前，不得因下一格較低而提前陷落地面以下
  h = Math.max(h, heightAt(hv.q, hv.r));
  ```
- **行為驗證**：若單位足跡仍在原較高格，高度絕不低於該格頂面；當足跡真正越過格界踏入較低格時，立即順暢過渡至較低格地面，既不破壞下坡步階語義，又消除了 1.89px 地表穿透下陷。

---

### 提案 4：`coord-probes.mjs` 虛空檢測排除自由落體穿越點 (`COORD-VOID-01`)
- **P/D**：P3 / D1
- **唯一寫入者**：`coord-probes.mjs` 探針分析器
- **檔案與行號**：[coord-probes.mjs:274-276](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/lib/coord-probes.mjs#L274-L276)
- **設計概念**：
  - 檢測虛空滯留的真正瑕疵是有單位「停留在虛空中未受重力下墜」。
  - 檢測條件修正為：`if (pz in [-1, 1] && !t && (Math.abs(vz) < 10 || consecutiveStay > 1))`，排除等加速自由落體瞬時穿過零面的偽陽性樣本。

---

## 5. Package A：全庫清冊審查結果與統計

### 5.1 逐檔統計彙總 (659 檔)

| 領域 | 檔案總數 | 檔頭狀態佈局 | 語義審查狀態 | 執行狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **Simulation** | 60 | 方框: 21, 一般: 6, 無檔頭: 33 | 已讀且已對照: 60 | 實跑: 16, 單元測試: 28, 批次驗證: 16 |
| **Presentation** | 99 | 方框: 34, 一般: 26, 無檔頭: 39 | 已讀且已對照: 99 | 實跑: 11, 單元測試: 35, 批次驗證: 53 |
| **Data & UI** | 97 | 方框: 24, 一般: 31, 無檔頭: 42 | 已讀且已對照: 97 | 實跑: 3, 單元測試: 32, 批次驗證: 62 |
| **Tools & Tests** | 202 | 方框: 18, 一般: 53, 無檔頭: 125, 不適用: 6 | 已讀且已對照: 196, 不適用: 6 | 實跑: 0, 單元測試: 15, 批次驗證: 181, 未驗證: 6 |
| **Config & Docs** | 98 | 方框: 3, 一般: 4, 無檔頭: 7, 不適用: 84 | 已讀且已對照: 93, 不適用: 5 | 批次驗證: 50, 未驗證: 48 |
| **Assets** | 103 | 不適用: 103 | 已讀且已對照: 4 (Manifests), 不適用: 99 | 未驗證: 103 |
| **總計** | **659** | **方框: 100, 已修復: 1, 一般: 120, 無檔頭: 246, 不適用: 192** | **已讀且已對照: 560, 不適用: 99** | **實跑: 30, 單元測試: 110, 批次驗證: 362, 未驗證: 157** |

### 5.2 Git 追蹤檔案差集（5 檔）
當前 Git 追蹤檔案為 664 個，比原清冊多了 5 個新加入的 Markdown 規範/報告文件，全數保留並記於此：
1. `docs/PROJECT_CLEANUP_AUDIT01_REPORT.md`
2. `docs/PROJECT_CLEANUP_AUDIT01_REVIEW.md`
3. `docs/PROJECT_CLEANUP_CLOSE02_AGENT_PROMPT.md`
4. `docs/ULT_TIMING_AGENT_PROMPT.md`
5. `docs/ULT_VISUAL_CLAUDE_AGENT_PROMPT.md`

---

## 6. 驗證記錄

```text
[驗證指令執行記錄]
1. 取證探針正向驗證 1：
   node tools/agent/run.mjs --detach close02-run1 900 -- node tools/ui-e2e/cleanup-coord01-check.mjs --out=close02-run1
   → STATE=DONE EXIT=0 (用時 32s)
   → SINK verified (delta=1.89px, worst delta=1.89)
   → VOID verified (pz=0.42, vz=-614.3)
   → OSC static verified (507/508/510, moved=0.03/0)
   → OSC moved verified (563/564/565, moved=46.99/0)

2. 取證探針正向驗證 2（獨立環境二次確認）：
   node tools/agent/run.mjs --detach close02-run2 900 -- node tools/ui-e2e/cleanup-coord01-check.mjs --out=close02-run2
   → STATE=DONE EXIT=0 (用時 31s，各項數據與 run1 完全確定性吻合)

3. 取證探針負向控制驗證：
   node tools/agent/run.mjs --detach close02-neg 900 -- node tools/ui-e2e/cleanup-coord01-check.mjs --out=close02-neg --negative-control
   → STATE=DONE EXIT=1 (用時 32s)
   → 成功捕捉缺失樣本異常：REPRO_MISMATCH detected: OSC static: missing corpse/hazard/sample

4. 程式碼規範與語法檢查：
   node tools/agent/run.mjs --detach lint 120 -- npm run lint
   → STATE=DONE EXIT=0 (tsc --noEmit，0 錯誤)

5. 全套單元測試：
   node tools/agent/run.mjs --detach test2 300 -- npm test
   → STATE=DONE EXIT=0 (Test Files: 91 passed (91), Tests: 780 passed (780))

6. 生產環境構建：
   node tools/agent/run.mjs --detach build 180 -- npm run build
   → STATE=DONE EXIT=0 (vite v6.4.3 built in 5.63s)

7. 文檔與座標協議回歸防護：
   npx vitest run tests/DocDrift.test.ts (3 passed)
   npx vitest run tests/CoordinateProtocol.test.ts (32 passed)
   git diff --check (0 換行或空白違例)
```

---

## 7. 交付提交與回退指令

- **Package 1 (取證工具強化與因果追蹤)**：
  - Commit：`7bcfa12` (`test(coord): instrument COORD01 probe with resolveSortHex spy and lifecycle trajectories`)
  - Stage：`tools/ui-e2e/cleanup-coord01-check.mjs`
- **Package 2 (全庫清冊完成與因果報告)**：
  - 待提交：`docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv`, `docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv`, `docs/PROJECT_CLEANUP_CLOSE02_REPORT.md`

### 乾淨回退方式 (Clean Revert)
若需放棄本輪交付，依合約禁止 `git reset --hard`，請以逐 commit revert 方式回退：
```bash
git revert 7bcfa12 --no-edit
```
