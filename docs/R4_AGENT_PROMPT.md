# 執行指令：嘲諷、加速零件方向；刪舊控制條（R4）

> 派工：主代理用 agy 派（gemini-4-neon-high）。
> 背景：狀態零件沒有方向輸入，所以嘲諷的倒三角永遠朝下、不指向嘲諷者；加速的速度線永遠往上飄，和移動方向無關（HANDOFF A）。`BarPainter` 的舊控制條讀的是不存在的欄位，從來沒畫出來。本輪只做這三件事，不改其他狀態的外觀。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_r4_status_dir`（分支 `feat/r4-status-direction`，base 是 `git log` 最上面那個 commit「docs(R4): 提示詞寫上 base」，主代理已建好）。

### 0. 開工前（INV）
- **讀檔一律用內建檔案工具，不用終端機指令。**
- 先讀：`AGENTS.md`（全部）、`engine/renderers/RenderSpec.ts`（§3、§4）、本檔 §1 列的每個檔案的方框檔頭。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告：`npm run lint`、`npm test`、`npm run build`、`npm run knip`。`npm test` 預期只有 `tests/StatusDirection.test.ts` 的 7 則失敗（紅色驗收）；`knip` 預期只回報 `StatusDirection.ts` 的未使用匯出。有其他失敗就停下回報。
- **只能跑這些指令**（每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接；清單外的指令會被拒，而且會讓整個執行結束，需要別的指令就寫進報告，不要嘗試）：
  - `git status`
  - `git diff`
  - `git diff --stat`
  - `git rev-parse HEAD`
  - `git log --oneline -10`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run knip`
  - `npm run perf:guard`
  - `node tools/ui-e2e/runtime-smoke.mjs`
  - `npx vitest run tests/StatusDirection.test.ts`
  - `npx vitest run tests/StatusParts.test.ts`
  - `npx vitest run tests/VFXParts.test.ts`
  - `node tools/vfx/fx-shot.mjs --keys=STATUS:TAUNT,STATUS:HASTE --out=tools/ui-e2e/out/r4`
- 一次性的探針與截圖寫在 `tools/ui-e2e/out/`（不進版控）。亂數只用 `engine/math/rng.ts`。
- 必要的驗證沒完成，該任務就標「未完成」。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/adr/**`、`.claude/**`、`.codex/**`、`.agents/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json`、`tests/contracts/**`、**`tests/StatusDirection.test.ts`（紅色驗收）**。`StatusDirection.ts` 的匯出型別與 `statusAngle` 的簽名、`data/vfx/status_parts.ts` 的 `StatusOrient`／`StatusPartOrient`／`orient` 型別不得更改（只補實作與資料）。**保真基準一律不得重錄。**
- 不要 commit、不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，目前）
- **空殼**：`engine/renderers/status/StatusDirection.ts` 的 `statusAngle(orient, frame, ctx)` 現在回 `null`。規格寫在它的 JSDoc，驗收在 `tests/StatusDirection.test.ts`。
- **型別**：`data/vfx/status_parts.ts` 的 `StatusPartLayer.orient?: { toward: 'TOWARD_SOURCE' | 'MOVE'; nativeAngle: number }`。`nativeAngle`＝零件在 rotation 0 時指向的螢幕角度。
- **嘲諷資料**：`data/vfx/status_parts.ts` 的 `TAUNT` 有一個 HEAD 層 `sigil`（`emblem: 'invTriangle'`，倒三角，rotation 0 時尖端朝下，所以 nativeAngle 應是 π/2；用截圖確認）與一個 `rays` 裝飾層（放射光，不需要方向）。
- **加速資料**：`HASTE` 有一個 BODY 層 `spark`（`rotation: -Math.PI / 2`、`rise: { height: 36, period: 0.7 }`、`count: 3`）。spark 在 rotation 0 時沿 +x 方向（推測，用截圖確認）。
- **嘲諷者**：`agent.effects.TAUNT.sourceId`（`engine/core/Effects.ts`，施加時寫入）。
- **移動**：`agent.isMoving`、`agent.path`（`Hex[]`，`path[0]` 是下一格）、`agent.px／py`（世界座標，`HexUtils.toPx` 同座標系）、`agent.facing`（1 或 −1）。`UnitFrame.footX = agent.px + physics.x`，`floorY = footY − groundH`（`engine/renderers/frame/UnitFrame.ts` 約 383～461 行）。
- **繪製路徑**：`engine/renderers/RenderPipeline.ts:354` 呼叫 `StatusOrchestrator.draw(ctx, this.frames, t, engine.mapConfig.layout, …)`；`StatusOrchestrator`（`engine/renderers/status/StatusOrchestrator.ts`）逐個 frame 呼叫 `StatusPartPainter.draw`；painter 用 `drawPartLayer`（`engine/renderers/vfxparts/PartLayerPainter.ts:45`）畫每一層，rotation 在第 54～56 行由 `layer.rotation`＋`spin`＋`align` 組成，rise 位移在第 69～73 行固定往上（`oy = -p * height`）。`drawPartLayer` 也被奧義零件共用。
- **舊控制條**：`engine/renderers/hud/BarPainter.ts` 第 66～86 行 `CCTimerKey`／`CCMaxKey`／`CCPriorityItem`／`CC_PRIORITY`，第 196～201 行 `getHighestPriorityCC`，以及 `drawUnitBars` 裡「控制條（優先序最高的一個）」那段（約 176～193 行）。它讀 `agent.banishTimer` 這類欄位。
- **截圖工具**：`tools/vfx/fx-shot.mjs` 目前沒有狀態模式；它的 `SHIELD:<TEAM>` 模式（地圖中央一對藍紅單位、鏡頭對準）最接近。

### 2. 目標與規則（DOM）
- **方向在 `StatusOrchestrator` 算好**（用 `statusAngle`；`hexToPx` 用 `HexUtils.toPx` 與 `engine.mapConfig`，需要時從 `RenderPipeline` 多傳一個參數進 `draw`），再傳給 `StatusPartPainter`。painter 和 `StatusDirection` 都不取地形高度；每幀不配置物件（不建陣列、閉包、物件字面值；需要的 context 物件建一次重用）。
- 有 `orient` 的層：rotation＝`statusAngle − nativeAngle`（取代 `layer.rotation`；`spin`、`align` 規則不變）；`statusAngle` 為 null 時照舊用 `layer.rotation`。有 `rise` 的有方向層，飄移方向改成方向的反方向（速度線往身後流），沒方向時照舊往上。
- 嘲諷：HEAD 的倒三角尖端指向嘲諷者；`rays` 不變。加速：速度線平行於移動方向、往身後流；靜止時依 facing 左右。
- **沒有 `orient` 的層，`drawPartLayer` 的輸出必須和現在逐位元相同**（奧義零件與其他狀態共用它）。
- 刪除 `BarPainter` 的 `CCPriorityItem`、`CC_PRIORITY`、`getHighestPriorityCC` 與畫控制條的程式；刪之前用內建搜尋工具確認整個 repo（含 `components/`、`tools/`、`tests/`）沒有其他引用，連帶不再使用的常數（例如 `HUD_BAR.CC`、`HUD_COLORS.CC_BAR`）若無引用也刪。有引用就停下回報，不刪。
- `fx-shot.mjs` 加 `STATUS:TAUNT` 與 `STATUS:HASTE` 兩種鍵：沿用 `SHIELD` 的一對單位；TAUNT 讓一方被另一方嘲諷（寫 `effects.TAUNT` 的 remaining 與 sourceId）；HASTE 讓一方掛加速並在移動中（給它一條往側邊的路徑）。輸出照現有格式（一列 5 格）。同一個 commit 更新檔頭說明。
- 改到的每個檔案，方框檔頭（職責／上游／[ARCH]）要同步更新；RenderSpec 的錨點規則沒有改，不必動 RenderSpec，除非你改了錨點（不該改）。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| R4-1 | 實作 `statusAngle`；`status_parts.ts` 的 TAUNT 倒三角與 HASTE 速度線加 `orient` | `npx vitest run tests/StatusDirection.test.ts` 的方向與資料 6 則通過（實跑） |
| R4-2 | `StatusOrchestrator`／`StatusPartPainter`／`drawPartLayer` 接上方向 | `npx vitest run tests/StatusParts.test.ts`、`npx vitest run tests/VFXParts.test.ts` 通過；`npm run perf:guard` 通過（實跑） |
| R4-3 | `fx-shot.mjs` 加 STATUS 模式並截圖 | `node tools/vfx/fx-shot.mjs --keys=STATUS:TAUNT,STATUS:HASTE --out=tools/ui-e2e/out/r4` 退出碼 0；報告寫兩張 png 的路徑，並寫你在圖上看到的：倒三角尖端朝哪個方向、嘲諷者在哪一側；速度線的走向、單位往哪裡移動（實跑，代理看） |
| R4-4 | 刪 `BarPainter` 舊控制條 | 驗收最後 1 則通過；`npm run knip` 沒有新增項目（實跑） |
| R4-5 | 全部閘門 | `npm run lint`、`npm test`（全綠）、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run perf:guard`（實跑） |
| REPORT | `docs/R4_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的「指令＋退出碼」、截圖路徑與觀測、沒做到的項目與原因、回退指南。只寫數字、指令輸出與沒做到的事，不寫效果形容詞；每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證） | — |

### 4. 守則與停下條件（INV）
- **`npm run perf:guard` 的保真有任何一張失敗就停下回報**（列出哪一張、數字），不要改零件或門檻去讓它通過，也不要重錄基準。
- 為了通過驗收而需要改 `tests/StatusDirection.test.ts`、型別簽名或受保護檔案 → 停下回報，寫明你認為驗收哪裡錯。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網（例如 try/catch 包住繪製）。
- **驗證不准動**：現有測試、驗收腳本、斷言強度一律不改；被驗證的對象不准 mock、stub；不准用空的 `catch` 吞錯誤。同一個驗收失敗兩次就停下回報。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、看截圖、代為 commit，再問要不要合併。
2. 實機看：被嘲諷的單位頭上倒三角是否指向嘲諷者；加速的速度線是否順著走路方向。
