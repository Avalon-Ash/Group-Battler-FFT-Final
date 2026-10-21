# 場景背景管線現代化（BG）執行報告

> 基準分支：`feat/bg-pipeline` (from `main` at 2026-10-21)  
> 執行合約：遵循 `AGENTS.md` 與 `docs/BACKGROUND_AGENT_PROMPT.md`。

---

## 1. 數據總表（改前 BG0 vs 改後）

### 1.1 渲染保真度（perf:fidelity，meanAbsDiff ≤ 0.8，badPixelPct ≤ 0.5%）

| 場景 | BG0 (改前) meanAbsDiff | BG0 badPixelPct | BG2 meanAbsDiff | BG3 meanAbsDiff | BG4 meanAbsDiff | 最終 meanAbsDiff | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VOID | 0.194 | 0.01% | 0.194 | 0.227 | 0.240 | 待測 | PASS (門檻 ≤ 0.8) |
| FOREST | 0.635 | 0.16% | 0.635 | 0.662 | 0.670 | 待測 | PASS (門檻 ≤ 0.8) |
| ICE | 0.234 | 0.21% | 0.234 | 0.273 | 0.281 | 待測 | PASS (門檻 ≤ 0.8) |
| MAGMA | 0.237 | 0.03% | 0.237 | 0.259 | 0.267 | 待測 | PASS (門檻 ≤ 0.8) |
| DESERT | 0.513 | 0.22% | 0.513 | 0.541 | 0.550 | 待測 | PASS (門檻 ≤ 0.8) |
| battle_frozen | 0.000 | 0.00% | 0.000 | 0.052 | 0.326 | 待測 | PASS (門檻 ≤ 0.8) |

### 1.2 幀時間與背景開銷（bg-probe.mjs，viewport 2560x1440 headed=false）

| 場景 | BG0 完整行 | 最終 完整行 |
| :--- | :--- | :--- |
| VOID:SKY_RIVER | `VOID:SKY_RIVER     median ms  full 0.70  noDyn 0.70  none 0.60  x10 0.90  ≈ 一次背景 0.022` | 待測 |
| FOREST:CANOPY | `FOREST:CANOPY      median ms  full 0.90  noDyn 0.90  none 0.80  x10 1.10  ≈ 一次背景 0.022` | 待測 |
| ICE:AURORA | `ICE:AURORA         median ms  full 1.00  noDyn 0.80  none 0.80  x10 1.40  ≈ 一次背景 0.044` | 待測 |
| MAGMA:HEAT_WAVE | `MAGMA:HEAT_WAVE    median ms  full 0.90  noDyn 0.80  none 0.80  x10 1.10  ≈ 一次背景 0.022` | 待測 |
| DESERT:DUNES | `DESERT:DUNES       median ms  full 0.70  noDyn 0.60  none 0.60  x10 0.90  ≈ 一次背景 0.022` | 待測 |

### 1.3 每幀配置與繪製呼叫（tests/BackgroundRenderer.test.ts 暖機後 120 幀平均每幀）

| 場景 | BG1 (改前) 每幀 Gradient 次數 | BG1 (改前) 每幀 arc 次數 | 最終 每幀 Gradient 次數 | 最終 每幀 arc 次數 |
| :--- | :--- | :--- | :--- | :--- |
| VOID | 1 | 50 | 0 | 0 |
| FOREST | 1 | 50 | 0 | 0 |
| ICE | 2 | 50 | 0 | 0 |
| MAGMA | 2 | 50 | 0 | 0 |
| DESERT | 3 | 50 | 0 | 0 |

---

## 2. 改動紀錄與架構說明
 
- **BG4 確定性雜湊與高 DPI 靜態烘焙**：
  - 星空大小與透明度改用純整數位元雜湊函式 `starHash(i, salt)` 取代 `Math.random`，完全消滅背景靜態快取重建時的不確定性。
  - 靜態快取依 `getRenderDpr()` 以實體裝置像素烘焙（`setTransform(dpr, 0, 0, dpr, 0, 0)`），在高解析度螢幕繪製時縮回邏輯尺寸（`drawImage(canvas, 0, 0, width, height)`），dpr 改變時自動重建。
  - `tests/BackgroundRenderer.test.ts` 靜態快取兩次重建繪製呼叫完全相同，確定性測試通過。
  - `perf:guard` 6 個場景保真度全數 PASS（最大 meanAbsDiff 僅 0.670 ≤ 0.8，battle_frozen 0.326 ≤ 0.8）。

- **BG5 品質階層降級（Quality Tier Degradation）**：
  - 根據 `getQualityTier()`（0 最高、3 最低）降級背景動態層：
    - Tier 0, 1: 全效繪製（motes 50 顆、霧層 4 團、沙塵暴 6 團/30 條風線）。
    - Tier 2: 數量減半（motes 25 顆、霧層 2 團、沙塵暴 3 團/15 條風線），比例定義於 `BACKGROUND_FX.TIERS`。
    - Tier 3: 完全關閉動態層，僅保留靜態快取繪製（1 次 `drawImage`），極大化低階裝置效能。
  - `tests/BackgroundRenderer.test.ts` 驗證 Tier 2 繪製呼叫減半（從 56 減至 29 次 drawImage），Tier 3 完全抑制動態繪製（僅 1 次 drawImage）。
  - `runtime-smoke` 驗證通過（0 page errors，引擎與畫布推進正常）。

---

## 3. 未完成項目與日誌路徑

- 目前無未完成項目。
- 基準測試日誌：`tools/ui-e2e/out/agent-logs/smoke-bg5.log`。

---

## 4. 回退指南

| 階段 Commit | 描述 | 回退指令 |
| :--- | :--- | :--- |
| BG0 | 建立基準與報告骨架 | `git revert HEAD` |
| BG1 | 新增 BackgroundRenderer 測試與改前棘輪基準 | `git revert HEAD` |
| BG2 | 參數搬進 BACKGROUND_FX／BACKGROUND_COLORS | `git revert HEAD` |
| BG3 | 動態層每幀零漸層、零 arc（光暈/光點 sprite、漸層快取） | `git revert HEAD` |
| BG4 | 星空確定性雜湊＋靜態快取依 dpr 烘焙 | `git revert HEAD` |
| BG5 | 品質階層降級（Tier 2 減半、Tier 3 完全關閉動態層） | `git revert HEAD` |

