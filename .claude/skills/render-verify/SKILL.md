---
name: render-verify
description: 改到渲染或引擎生命週期之後的本機實跑驗證（runtime-smoke、perf:guard、截圖、coord 檢查）。改了 engine/renderers、engine/graphics、engine/presentation、data/vfx、VisualMath、useGameApp 或 renderer/game facade，要宣告完成或審查這類 diff 之前使用。
---

# 渲染／生命週期實跑驗證

lint／test／build 全綠曾經交出凍結的畫面（METHODOLOGY §4 第 1 條）。宣告完成前依序跑完，任何一步失敗就停下找根因，不加安全網。

## 1. 靜態檢查
```bash
npm run lint && npm test && npm run build
```

## 2. 實跑（必做）
```bash
node tools/ui-e2e/runtime-smoke.mjs --shot            # 預設跑 4 秒真實 rAF
node tools/ui-e2e/runtime-smoke.mjs --query=glow=1    # 有開關的功能，帶上對應的 query
```
- 檢查：0 個頁面錯誤、有單位、`battleTime` 前進、相隔數秒的兩張畫布不同（抓凍結）。
- `--shot` 存到 `tools/ui-e2e/out/runtime-smoke.png`；需要人眼判斷時才讀這張圖（少截圖，省額度）。
- 使用者機器用 `msedge`；雲端容器設 `E2E_BROWSER_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`。雲端畫面只能證明「有在動、沒報錯」，美術判斷留給使用者實機。

## 3. 保真與效能
```bash
npm run perf:guard      # 保真 6 張 + perf A/B；失敗時差異圖在 tools/ui-e2e/out/fidelity/
```
- 保真失敗而變動是預期的：**不准直接重錄**，改走 `rebaseline-fidelity` skill。
- 要證明「畫面沒變」（重構、搬常數），不能拿兩次執行的 meanAbsDiff 比：同一台機器、不同次執行就會漂移（2026-10-29 O5a：程式碼沒變，`battle_frozen` 0.001→0.164）。做法是同環境 A/B：同一次執行裡切換改前（HEAD）與改後程式碼，各截同一組場景，逐像素比較，要 0 差異；刻意的畫面變更則用遮罩證明差異只在預期範圍內。
- 幀時間量測（`perf:frames`）只在使用者主螢幕跑，雲端與副螢幕的數字不可信。

## 4. 動到位置／高度／排序／發射點時再加
- `npm run verify:coords`（`--flicker` 查振盪）；`tests/CoordinateProtocol.test.ts` 的基準只減不增。
- 確認同一個 commit 已同步更新 `engine/renderers/RenderSpec.ts` 與所改檔案的方框檔頭。

## 5. 專題探針
現存可沿用的截圖腳本：`tools/ui-e2e/faction-shot.mjs`（固定種子＋`__stepFrames` 的範本）、`render-fidelity.mjs`、`runtime-smoke.mjs`。新的一次性探針寫在 `tools/ui-e2e/out/`（不進版控，AGENTS §3）；要長期保留就掛 npm script。

## 回報格式
一行一項：`lint/test/build`、`runtime-smoke`（battleTime 起訖）、`perf:guard`（各場景 meanAbsDiff）、`verify:coords`（有跑才寫）。沒跑的寫「未跑＋原因」。
