# 場景背景管線現代化（BG）執行報告

> 基準分支：`feat/bg-pipeline` (from `main` at 2026-10-21)  
> 執行合約：遵循 `AGENTS.md` 與 `docs/BACKGROUND_AGENT_PROMPT.md`。

---

## 1. 數據總表（改前 BG0 vs 改後）

### 1.1 渲染保真度（perf:fidelity，meanAbsDiff ≤ 0.8，badPixelPct ≤ 0.5%）

| 場景 | BG0 (改前) meanAbsDiff | BG0 badPixelPct | BG2 meanAbsDiff | BG3 meanAbsDiff | BG4 meanAbsDiff | 最終 meanAbsDiff | 狀態 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VOID | 0.194 | 0.01% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |
| FOREST | 0.635 | 0.16% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |
| ICE | 0.234 | 0.21% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |
| MAGMA | 0.237 | 0.03% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |
| DESERT | 0.513 | 0.22% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |
| battle_frozen | 0.000 | 0.00% | 待測 | 待測 | 待測 | 待測 | 基準記錄 |

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
| VOID | 待測 | 待測 | 待測 | 待測 |
| FOREST | 待測 | 待測 | 待測 | 待測 |
| ICE | 待測 | 待測 | 待測 | 待測 |
| MAGMA | 待測 | 待測 | 待測 | 待測 |
| DESERT | 待測 | 待測 | 待測 | 待測 |

---

## 2. 改動紀錄與架構說明

*待任務推進填寫*

---

## 3. 未完成項目與日誌路徑

- 目前無未完成項目。
- 基準測試日誌：`tools/ui-e2e/out/agent-logs/guard.log`、`smoke.log`、`bgprobe.log`。

---

## 4. 回退指南

| 階段 Commit | 描述 | 回退指令 |
| :--- | :--- | :--- |
| BG0 | 建立基準與報告骨架 | `git revert HEAD` |
