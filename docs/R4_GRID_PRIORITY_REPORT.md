# R4 網格效果優先序

工作樹：`C:\Git\_wt_r1`。開工 HEAD：`14c5b1211e3d8bac8f60d031260382db26d7b6a3`；開工 `git status --short` 無輸出。未 commit、未安裝依賴、未修改受保護檔案或保真基準。

## 探針與數字

- 固定種子 42、synthetic time、手動 `__stepFrames`，同一份配置：縮圈預警、FIRE 危害、紅藍各一個目標在別處的 AOE 詠唱、ROOT 單位（固定 FROZEN 視覺狀態底色）、縮圈內側染色。
- 「完整填色 ≥2 層」格數：改前 **19**，改後 **0**。
- 改前依 fixture flags 計算原有各類填色；改後讀實際 `groundPriority.flagsAt` 與 `resolveGroundLayers`，且逐格核對 fixture flags，避免空表假通過。此統計按本輪逐格資訊類別計數，不計豁免的 AOE 圖案／技能特效與邊線。
- 圖：`tools/ui-e2e/out/grid-priority/before.png`、`tools/ui-e2e/out/grid-priority/after.png`。
- 數據：同目錄 `before.json`、`after.json`。
- 首次探針固定座標在地圖外而退出 1；改為從有效格選擇可容納 fixture 的區域後重跑成功。

## 實作選擇

- 詠唱遇更高層 ×0.35（含詠唱邊線）；危害液面 ×0.5，煙霧等零件層不變。
- 狀態採填色 ×0.25：保留底色識別，不增加逐格邊線密度。
- 預警 fill 上限 0.4，脈動與邊線不變。單位狀態／詠唱／液面存在時，縮圈內側與地塊光填色隱藏。
- 同級決定性選擇：背水一戰填色優先於縮圈預警（兩者邊線保留）；縮圈內側填色優先於地塊光。
- 玩家射程與懸停只留邊線；AOE 指示與技能貼地圖案保留。
- 詠唱中心使用與 CombatSystem 建立 telegraph 相同的目標來源（targetHex → target → 自身）；正 aoeRadius 且中心在施法者腳下時，整片 telegraph 不提交染色。別處的目標 AOE 保留。
- 逐格顏色使用 `getFactionSkin(team).fallbackBodyColor`，同格依 agents 順序取第一個施法者。
- `GroundPriority` 模組載入時一次預算全部 256 種 flags 組合。每幀表格重用 Uint8Array 與顏色陣列，僅容量增加時配置；GridRenderStrategy 是執行期唯一寫入者。未新增每幀倍率物件或逐格 callback。

## 任務與檔案

| 任務 | 檔案 |
|---|---|
| R4-0 | `tools/ui-e2e/grid-priority-shot.mjs` |
| R4-1 | `constants/terrain.ts`、`engine/renderers/grid/GroundPriority.ts`、`tests/GroundPriority.test.ts`、`tests/constants-snapshot.json` |
| R4-2 | `engine/renderers/grid/GridRenderStrategy.ts`、`GridOverlays.ts`、`painters/HazardPainter.ts`、`ZoneRenderer.ts`、`engine/renderers/RenderSpec.ts`；更新前述測試與探針 |
| R4-3 | 驗證輸出位於 `tools/ui-e2e/out/`（gitignored） |
| REPORT | `docs/R4_GRID_PRIORITY_REPORT.md` |

## 檢查

Log 根目錄：`tools/ui-e2e/out/agent-logs/`。所有長指令經 `tools/agent/run.mjs --detach` 與 `--wait` 跑至 DONE。

| 階段 | 指令 | 退出碼 | Log |
|---|---|---:|---|
| 基線 | `npm run lint` | 0 | `r4-pre-lint.log` |
| 基線 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r4-pre-test.log` |
| 基線 | `npm run build` | 0 | `r4-pre-build.log` |
| R4-0 首次 | `node tools/ui-e2e/grid-priority-shot.mjs --tag=before` | 1 | `r4-before.log` |
| R4-0 重跑 | 同上 | 0 | `r4-before-retry.log` |
| R4-1 | `npm run lint` | 0 | `r4-1-lint.log` |
| R4-1 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r4-1-test.log` |
| R4-1 | `npm run build` | 0 | `r4-1-build.log` |
| R4-2 中間檢查 | `npm run lint` | 0 | `r4-final-lint.log` |
| R4-2 中間檢查 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r4-final-test.log` |
| R4-2 中間檢查 | `npm run build` | 0 | `r4-final-build.log` |
| R4-2 探針 | `node tools/ui-e2e/grid-priority-shot.mjs --tag=after` | 0 | `r4-after.log` |
| 最終 | `npm run lint` | 0 | `r4-verify-lint.log` |
| 最終 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r4-verify-test.log` |
| 最終 | `npm run build` | 0 | `r4-verify-build.log` |
| 最終截圖 | `node tools/ui-e2e/grid-priority-shot.mjs --tag=after` | 0 | `r4-after-final.log` |
| 實跑 | `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0 | `r4-runtime.log` |
| 保真＋效能串聯 | `npm run perf:guard` | 1 | `r4-guard.log` |
| 座標 | `npm run verify:coords` | 0 | `r4-coords.log` |
| 獨立效能 | `node tools/ui-e2e/perf-ab.mjs --assert` | 0 | `r4-perf-ab.log` |

- 最終測試：95 檔、841 項通過；依任務排除 AgentRunner，完整 `npm test` 未跑。
- runtime-smoke：10 單位，battleTime **0.52 → 4.58 秒**，0 page errors、畫布持續變化；圖 `tools/ui-e2e/out/runtime-smoke.png`。
- 五張地形保真均通過（meanAbsDiff）：VOID **0.216**、FOREST **0.651**、ICE **0.253**、MAGMA **0.249**、DESERT **0.530**。
- `battle_frozen` 未通過：meanAbsDiff **2.106**（門檻 0.8），badPixelPct **8.54%**（門檻 0.5%）；strict mean **2.281**、bad **9.3303%**。失敗比較輸出：`tools/ui-e2e/out/fidelity/battle_frozen_diff_curr.png`（工具只輸出當前失敗幀，未產生另一張差值 heatmap）。未重錄或放寬門檻。
- `perf:guard` 的 `&&` 因保真失敗跳過 A/B，因此另行執行 `node tools/ui-e2e/perf-ab.mjs --assert`。
- verify:coords：exit 0；FLOAT VOID／MAGMA 均 PASS，over-void 0。診斷仍列出 1 次 moving sink（最深 1.89px）、84 次 oscillation events，其中 1 次 static；這些不是本次更動的座標規則，未修改。完整數據 `tools/ui-e2e/out/coord_guard.json`。

- 獨立效能 A/B：五地形全部通過既有護欄；baseline／no_grain 平均皆約 **4.17ms**、ratio **1.00**（門檻 1.15），低於各場景既有 recorded ×1.5 門檻。環境為 RTX 4070，未放寬門檻；資料 `tools/ui-e2e/out/perf_ab.json`。這是既有工具的 rAF 指標，不宣稱為本次變更帶來的加速。
- 逐格地塊光目前只有 RenderList 預設欄位、沒有執行期寫入者（`git grep oLight -- engine`）；本輪仍提供優先序預算與消費端閘門，未新增光源來源。

## 最終狀態

- **完成**：R4-0、R4-1、R4-2、REPORT。
- **未完全達標**：R4-3；已執行全部要求檢查，`perf:guard` 因 battle_frozen 保真失敗而退出 1，效能部分獨立執行通過。保留差異供主代理審查，未重錄。
- `git diff --check`：退出 0。所有改動留在工作樹；沒有仍在執行的驗證命令。
