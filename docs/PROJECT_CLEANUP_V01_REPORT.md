# V01 驗收收尾與查證總報告

> 分支：`feat/project-cleanup`｜基底 SHA：`1924e2bc53f3d886a0e898717068b6eae85eb2d8`｜嚴格遵循 11 檔白名單。

## 1. 核心任務驗收摘要

### Section A：測試與探針補正
- **SequenceTargetBinding.test.ts**：移除 3 處 `as any`（現為 0 處）；完成三軸（x, y, z）錨點鎖定斷言；測試相同施法者連續兩次 run 隔離至不同目標空間座標；驗證即時動作與到期動作動態一致性；實測 5 條排除路由（AOE、正速度投射物、ground-ID、無詠唱、HEAVEN_FALL）確實調用 `run()` 且未傳 options。16 項測試全數 PASS。
- **探針補正**：`v01-f02` 實施嚴格 BEAM 比對與 AOE 空間派遣取樣（`simulationGroundLocked` 與 `visualGroundLocked` 雙取樣，drift3D=0px）；`v01-f03` 補正 before 分支校驗與非零退出碼守護；注入錯誤之負向控制（`v01-negative`）確認 EXIT=1。
- **檔頭對齊**：`VisualSystem.ts` 檔頭對齊為「目標仍在集合」；`DocDrift.test.ts` 檔頭載明工具能力邊界。

### Section B：授權單張保真基準更新與完整 Guard
- **單張基準更新**：僅更新 `tools/ui-e2e/baseline/fidelity/battle_frozen.png`，獨立提交為 `b9622b3`。
- **證據比對**：差異三圖存於 `tools/ui-e2e/out/v01/`，差異邊界框 `[664, 236, 803, 398]`（dx=139, dy=162, 8360 px），嚴格局限於中央單體目標光束特效區域。
- **五地形基準**：DESERT、FOREST、ICE、MAGMA、VOID 五張基準檔 SHA256 雜湊 100% 完全不變。
- **完整 Guard**：執行 `npm run perf:guard` 全程通過，保真比對全綠且五地形 perf-ab 均 <= 1.15。

### Section C：COORD01／T01／K01／K02 與清冊缺口查證
- **COORD01（保持開啟）**：`coord-guard.mjs --assert` 實跑 EXIT=1。確認目前殘留 Sink=1（FOREST/1001 RED-0002 懸崖下切 1.89px）、Void=1（FOREST/1002 BLU-0007 擊退越界未剔除）、靜態景深震盪 13 個 episode（106 次翻轉）。（更正註記：V01 初版 capture-cases.mjs 存在查詢未實例化 renderer.lastRenderList 導致 corpseOp=null 及時間採樣錯位，初版修復建議屬初探假說；真確因果鏈與修復設計留待 AUDIT01 補強取證）。
- **T01（結案）**：DocDrift 測試 3 項通過，檔頭明確能力邊界（僅路徑／名稱語法檢查，無法判定語意與時序）。
- **K01（結案）**：Knip 報告 144 處未解析 import，去重後 46 個路徑全數存在於磁碟（瀏覽器 Vite dynamic import 限制，非產品缺失）。
- **K02（結案）**：本機未安裝 sharp，`fx-shot` 正常降級為逐幀輸出（輸出 5 張 220x200 有效 PNG）。
- **A0 清冊缺口（保持開啟）**：歷史 A0 CSV 649 列中 9 條已確認事實、640 條列舉待查；V01 報告所列 43 檔為初選之手列名單，非全檔驗收數；全庫帳本由 AUDIT01 重建。

---

## 2. 命令執行總表

| 任務名稱 | 超時 (s) | 執行命令 | 退出碼 | 狀態／輸出紀錄 |
| :--- | :---: | :--- | :---: | :--- |
| `v01-f02` | 180 | `node tools/ui-e2e/cleanup-f02-check.mjs --phase=after` | 0 | PASS（drift3D=0px, maxVisualDrift=0px） |
| `v01-f03` | 180 | `node tools/ui-e2e/cleanup-f03-check.mjs --phase=after` | 0 | PASS（smoke & state restored） |
| `v01-negative` | 180 | 注入 console.error 錯誤之 probe 負向控制 | 1 | PASS（預期非零，捕捉到錯誤） |
| `v01-record` | 600 | `npm run perf:fidelity:record` | 0 | PASS（僅更新 battle_frozen.png） |
| `v01-guard` | 900 | `npm run perf:guard` | 0 | PASS（ALL FIDELITY PASSED, perf-ab 均過） |
| `v01-coords` | 600 | `node tools/ui-e2e/coord-guard.mjs --assert` | 1 | PASS（預期非零，記錄 Sink=1, Void=1, Osc=106） |
| `v01-coord-case`| 180 | `node tools/ui-e2e/out/v01/capture-cases.mjs` | 0 | PASS（取得 3 案例圖像與 RenderOp 資料） |
| `v01-knip` | 180 | `npm run knip` | 1 | PASS（分析 46 條唯一路徑，全部在磁碟存在） |
| `v01-sharp` | 900 | `node tools/vfx/fx-shot.mjs --keys=FX_HEAL_BURST` | 0 | PASS（逐幀 fallback 驗證成功，5 張有效 PNG） |
| `v01-lint` | 120 | `npm run lint` | 0 | PASS（tsc --noEmit 0 errors） |
| `v01-test` | 300 | `npm test` | 0 | PASS（91 檔案，780 測試全數通過） |
| `v01-build` | 180 | `npm run build` | 0 | PASS（304 模組打包成功） |
| `v01-doc-final`| 120 | `npx vitest run tests/DocDrift.test.ts` | 0 | PASS（3 個 DocDrift 測試全數通過） |

---

## 3. 項目結案與後續排程狀態

| 項目編號 | 項目說明 | 本輪判定 | 依據與後續排程 |
| :--- | :--- | :---: | :--- |
| **F02** | 單體技能移動目標動態鎖定 | **結案** | 16 項測試無 any、探針 PASS、單張 baseline 合格、perf:guard 全綠 |
| **F03** | 技能編輯器數值緩衝與測試隔離 | **結案** | 探針 PASS、負向控制確認 EXIT=1、UI 與模擬狀態隔離完備 |
| **T01** | DocDrift 檔頭規範與能力邊界 | **結案** | 檔頭明確標註語法檢查邊界，測試通過 |
| **K01** | Knip 根路徑解析查證 | **結案** | 46 條路徑 100% 存在於磁碟，證明為 Vite 瀏覽器端動態 import 限制 |
| **K02** | 無 sharp 環境預覽健全度 | **結案** | 確認無 sharp 環境下 fx-shot 正常降級逐幀 PNG 輸出，無報錯 |
| **COORD01**| 景深座標與地形邊界殘差 | **保持開啟** | 殘留 Sink=1、Void=1、Osc=106 翻轉；V01 取證存在限制，真確 RenderOp 因果待 AUDIT01 補強 |
| **A0 清冊** | 全庫清理歷史清冊缺口 | **保持開啟** | 歷史 CSV 649 列僅 9 條確認事實、640 條待查，V01 之 43 檔非全檔驗收，由 AUDIT01 重建真確帳本 |
| **奧義重構**| 50 個奧義差異化與 >= 1.5s 詠唱 | **待後續批次** | 核心體積感與密度重構，保留於 HANDOFF |
| **全庫平衡**| 5v5 數值平衡模擬 | **待後續批次** | 全部清理與奧義完成後最後執行 |
