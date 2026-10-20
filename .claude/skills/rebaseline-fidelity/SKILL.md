---
name: rebaseline-fidelity
description: 保真基準（perf:fidelity）或 UI 樣式基準（E2E_UPDATE_STYLE）因預期中的畫面變動而必須重錄時的取證流程。perf:fidelity／e2e:ui 失敗、考慮重錄 baseline、或審查含基準檔變更的 diff 時使用。
---

# 重錄基準的取證流程

基準不得任意重錄、門檻不得放寬（CLAUDE.md 鐵律）。2026-10 一週內重錄 9 次，座標錯位就是這樣被收編成新標準。重錄指令會被 `tools/hooks/agent-guardrails.mjs` 攔下來問使用者。

## 0. 先判斷該不該重錄
- 變動不是本輪刻意造成的 → **不重錄**，回頭找根因。
- 合併衝突時**不得**「取一邊再重錄」。
- 地形 5 張基準照理只在動到地形時變；動戰鬥數值或單位時只該有 `battle_frozen` 變。

## 1. 取證（重錄前）
1. `npm run perf:fidelity`，記下每個場景的 `meanAbsDiff`／`badPixelPct`；失敗的當前畫面在 `tools/ui-e2e/out/fidelity/<scene>_diff_curr.png`。
2. 舊基準在 `tools/ui-e2e/baseline/fidelity/<scene>.png`（也可 `git show main:<path>` 取）。產生舊／新／差異三張圖，放 `tools/ui-e2e/out/`。
3. 看差異圖：只允許本輪預期的元素變動（例如單位、浮字、特效）。出現預期外區域（地塊、邊線、其他圖層）就停下。

## 2. 重錄
- 使用者同意後才跑 `npm run perf:fidelity:record`（UI 樣式：`E2E_UPDATE_STYLE=1 npm run e2e:ui`，並確認 `tools/ui-e2e/style-baseline.json` 的 diff 只有預期的鍵）。
- 重錄**獨立一個 commit**，訊息格式：
  ```
  test(fidelity): re-record <scene> after <原因>

  Changed: <哪些元素變了>
  0-diff: <哪些基準完全沒變>
  Evidence: tools/ui-e2e/out/<差異圖檔名>
  ```
- 重錄後再跑一次 `npm run perf:fidelity`，全部通過才算完成。
