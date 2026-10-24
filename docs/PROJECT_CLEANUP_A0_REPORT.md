# 全專案整理第一輪：清冊、檔頭盤點與異常重現報告（A0-R2 證據工具與清冊修訂版）

> **基準分支**：`feat/project-cleanup`  
> **起始提交 SHA**：`a86c1668aae6ddd23b243d54c1a8dbebe7d149c8`  
> **A0-R1 提交 HEAD**：`e92b635248fae2c6f42cd53946fe3aa59372d73a`  
> **母表基準 Commit**：`e92b635248fae2c6f42cd53946fe3aa59372d73a`（637 個追蹤檔案）  
> **執行日期**：2026-10-24  
> **執行代理**：TACTICAL.OS 盤點與驗證代理（A0-R2）  
> **交付物清單（嚴格限定修改六檔）**：
> 1. `tools/ui-e2e/cleanup-a0-repro.mjs`（活體驗證探針工具：修復非零退出、錯誤可見性、還原與精準觀測）
> 2. `tools/audit/cleanup-a0-inventory.mjs`（清冊與證據生成工具：移除白名單假查證、輸入防禦、覆寫保護、重算統計）
> 3. `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`（649 列誠實清冊：19 檔已確認具體事實，630 檔僅列舉／待查）
> 4. `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`（12 項核心問題、檔頭落後、廢碼、座標診斷台帳，移除 coords 殘留通過誤述）
> 5. `docs/PROJECT_CLEANUP_A0_EVIDENCE.json`（機器可讀證據檔：依賴本輪實跑探針，解耦硬編碼 PASS 與固定數值）
> 6. `docs/PROJECT_CLEANUP_A0_REPORT.md`（本報告：收錄 T1～T3 修正、故障注入與實跑量測證據）

---

## 1. 環境與工作樹狀態（Git Baseline & Workspace Status）

- **目前分支**：`feat/project-cleanup`。
- **本輪起始 HEAD**：`e92b635248fae2c6f42cd53946fe3aa59372d73a`。
- **母表追蹤來源**：`git ls-tree -r --name-only e92b635248fae2c6f42cd53946fe3aa59372d73a`（共 637 個檔案）。
- **未追蹤項目**：由 `git status --porcelain` 動態讀取（共 12 項，含 `.agents/`、`.codex/` 及 Markdown 提示詞／計畫文件），保持未追蹤，未混入母表或 git commit。
- **產品代碼變更**：`0`（零 modified、零 deleted、零 staged 產品程式碼，零 package/lockfile 異動，零測試或基準檔改動）。

---

## 2. 執行摘要與 R1 審查修正聲明（Executive Summary）

依據複審意見（`docs/PROJECT_CLEANUP_A0R1_REVIEW.md`，R1-01～R1-03）與任務提示詞（`docs/PROJECT_CLEANUP_A0R2_AGENT_PROMPT.md`），本輪聚焦於**修正證據工具與清冊誠實化**，不擴大審查範圍，不改動產品代碼：

1. **任務 T1：探針失敗訊號可見化與控制流程修正（R1-01）**：
   - 移除執行前預設之 CONFIRMED 摘要；所有 13 個情境初始一律標為 `NOT_RUN`，執行後依實際量測計算狀態（`OBSERVED`／`NOT_REPRODUCED`／`ERROR`／`NOT_RUN`）。
   - 頂層 `catch` 記錄 `currentScenario`、`error.message` 與 `stack`，並設定非零 `process.exitCode = 1`。
   - 瀏覽器、Vite 伺服器與全部 Event/Method 監聽 hook 均於 `finally` 區塊可靠清理還原。
   - 支援 `--inject-setup-error` 測試旗標：實測在啟動前注入受控錯誤，探針以 **EXIT=1** 退出，13 案全數保持 `NOT_RUN`，不印出任何 verified success 文字。
   - 支援 `--out-dir` 參數，預設寫入本輪專屬目錄 `tools/ui-e2e/out/cleanup-a0-r2/`，保留歷史 R1 產物。
   - `gitHead` 改由 `git rev-parse HEAD` 動態讀取，記錄 seed (1337) 與執行命令。

2. **任務 T2：精準觀測與正式入口還原（R1-03）**：
   - **F01**：
     - 正式命名：`applyDirectDamage` 致死情境定名為「正式傷害入口的受控致死」，與 C1「狀態注入致死」分開記錄（兩者重複 2 次 Run 均觀測到死後 5 個序列動作殘留派發）。
     - 更名區分：既有 `REBUILD_AGENT_AI` 情境更名為「AI 重建」（`F01_E1_ai_rebuild_during_cast`），記錄收到 `AGENT_RESET` 但佇列維持 5 個動作，不預判為 bug。
     - 新增真實重置：額外實作 `RESET_GAME` 情境（`F01_E2_game_reset_during_cast`），發送 UI 命令，記錄收到 `GAME_RESET`，隊列被引擎清空（5 -> 0）。
     - 投射物空中保護：`rb_a1`（霜寒法球）在發射後殺死施法者，投射物繼續飛行並造成 102 點傷害（`projectileHitOccurred: true`）。
   - **F02 SINGLE**：
     - 改以 `teleportTo(target, 4, 0, e)` 作為受控位移入口，確保空間雜湊同步。
     - 在 `renderer.sequences.dispatch` 真正觸發時攔截該 caster（`sourceId === caster.id`），記錄 `actionId`、`actionType`（`BEAM`）、`simTime`（0.517s）、`passedTarget`（x: 144, y: 41.57, z: 53.5）、`currentTargetAnchor`（Point3D: x: 277.75, y: 80.18, z: 62.91）、target px/py（288, 83.14），測得視覺偏移 `diffX: 133.75px`。
     - 攔截 `vfx.playEffect` 記錄 7 次視效呼叫均落在初始座標 (144, 41.57)。
     - 數值層正常扣血（`damageDealt: 110`），證實「數值傷害命中新位移實體，視效展示停留在 CAST_START 快照錨點」。
     - 保留地面 AOE（`mb_u1`）對照：移出者傷害 0，移入者傷害 365。
   - **F03 UI**：
     - 分別精確定位 `tagSelect`（label「技能類型」）與 `typeSelect`（label「目標模式」），提取其 `<option>` 選項與值集合；若控制項缺失則非零退出。
     - 定位「極限射程」數字輸入框，快照原值（8 / "8"）。
     - 鍵入 `-5`，DOM 與 DB 均為 `-5`（`uiNegativeAccepted: true`）。
     - 清空輸入框為 `""`，`parseFloat("")` 為 `NaN`，被 `Number.isFinite` 擋下，DB 維持 `-5`，元件重繪後 DOM 失焦前／失焦後均維持 `"-5"`（`snappedBack: true`）。
     - 測試還原：於 UI 輸入原值 `8`，驗證 DOM 與 DB 均恢復為 `8`（`uiRestoreWorks: true`）；並在 `finally` 透過 `UI_COMMAND` `UPDATE_SKILL` 確保資料庫絕對純淨。

3. **任務 T3：移除清冊假查證與硬編碼 PASS（R1-02）**：
   - 徹底移除 `deepVerifyFiles` 白名單導出機制與通用 fallback 模板文字。
   - 僅保留具體問題／引用事實之 19 檔標記為 `已確認該事實`（載明證據來源、具體問題與建議處置）；其餘 630 列（618 檔追蹤檔 + 12 項未追蹤工作檔）全數標記為 `僅列舉／待查`，原因註明「未納入本次有界深入查證範圍，待後續分區任務查證」。
   - `dynamicEntry`、`consumers`、`staticRefs` 未查證者一律標 `待查`，不預設為「無」或偽造 AST 描述。
   - 移除代碼中三個不存在的舊路徑（`Pathfinding.ts`、`UnitDeathPainter.ts`、`HexUtils.ts`）。
   - 支援 `--out-dir` 與 `--probe-json`：實測缺輸入與輸入含 error 時，生成器以 **EXIT=1** 退出，且測試目錄既有產物與 hash **完全未被覆寫**；驗證通過後才一次性寫出。
   - `FINDINGS.csv` 移除 K01 中殘留的「coords 全數通過」文字；`EVIDENCE.json` 移除未定義的 UI E2E 34 計數，改以日誌 `ALL PASSED` 與 `style diff 0` 為憑。

---

## 3. 驗證日誌與檢查結果總覽（Verification Index）

| 檢查項目 | 預期結果 | 本輪實測結果 | 耗時／日誌路徑 | 狀態 |
| :--- | :--- | :--- | :--- | :--- |
| **探針故障注入 (`--inject-setup-error`)** | EXIT≠0，案例全 NOT_RUN，無成功文字 | **EXIT=1**，13 案全 NOT_RUN，`toolExecutionStatus: FAILED` | 0s (`agent-logs/probe-err.log`) | **通過** |
| **正常探針實跑 (`cleanup-a0-repro.mjs`)** | EXIT=0，13 案全完成，觀測與工具成功分開 | **EXIT=0**，13/13 案 `OBSERVED`，觀測到 3 項產品缺陷 | 10s (`tools/ui-e2e/out/cleanup-a0-r2/repro_results.json`) | **通過** |
| **生成器缺輸入防禦** | EXIT≠0，既有檔案內容／hash 不變 | **EXIT=1**，Hash Unchanged: true | 即時退出 | **通過** |
| **生成器錯誤輸入防禦** | EXIT≠0，既有檔案內容／hash 不變 | **EXIT=1**，Hash Unchanged: true | 即時退出 | **通過** |
| **生成器正常產出至測試目錄** | EXIT=0，各維度計數重算一致 | **EXIT=0**，總列數 649，已確認事實 19，待查 630 | 1s | **通過** |
| **DocDrift 單元測試** | 3/3 通過 | **PASS** (3 passed) | `npx vitest run tests/DocDrift.test.ts` | **通過** |
| **TypeScript 型別檢查** | 0 errors | **PASS** (0 errors) | `npm run lint` | **通過** |
| **單元測試套件** | 89 檔／707 項通過 | **PASS** (沿用 review-a0r1-test 實跑) | `agent-logs/review-a0r1-test.log` | **通過** |
| **生產建置 (Build)** | 打包成功 | **PASS** (沿用 review-a0r1-build 實跑) | `agent-logs/review-a0r1-build.log` | **通過** |

---

## 4. 探針精準重現數據（T1 & T2 Detailed Measurements）

探針產物完整記錄於 `tools/ui-e2e/out/cleanup-a0-r2/repro_results.json`，摘要如下：

### 4.1 F01：施法生命週期與死後序列派發（P1 / D3，已確認缺陷）
- **F01-A (正常施法)**：`mb_u1`（奧術漩渦）引導 1.0s，事件 `CAST_START` -> `CAST_FINISH` -> 傷害 548 點（HP 2000 -> 1452）。
- **F01-B (硬控暈眩)**：40% 詠唱時施加 STUN，發送 `CAST_BREAK`，隊列即時清空（`queueSizeAfterStun: 0`），傷害 0。
- **F01-C1 (狀態注入致死，兩輪)**：40% 時 `caster.hp = 0`。兩輪均無 `CAST_BREAK`，死後派發動作數為 5，傷害 0。
- **F01-C2 (受控正式戰鬥傷害致死，兩輪)**：40% 時調用 `applyDirectDamage` 扣除 2000 HP。兩輪均無 `CAST_BREAK`，死後派發動作數為 5，傷害 0。
- **F01-E1 (AI 重建)**：40% 時發送 `REBUILD_AGENT_AI`，收到 `AGENT_RESET`，隊列保持 5 個動作未清除（`queueRemained: true`）。
- **F01-E2 (遊戲重置)**：40% 時發送 `RESET_GAME`，收到 `GAME_RESET`，引擎重建隊列清空（`queueCleared: true`）。
- **F01-D (空中投射物保護)**：`rb_a1` 施法完畢子彈升空後殺死施法者，子彈持續飛行並命中目標，造成 102 點傷害（`projectileHitOccurred: true`）。

### 4.2 F02：單體目標位移 vs 地面 AOE 視效落點差異（P2 / D2，已確認規格差異）
- **F02-AOE (`mb_u1`)**：目標 1 移出至 (6,0)，目標 2 移入至 (2,0)。移出者傷害 0（`target1Escaped: true`），移入者傷害 365（`target2Hit: true`）。地面 AOE 嚴格鎖地。
- **F02-SINGLE (`mb_a2`)**：
  - 目標由 (2, 0) 以 `teleportTo` 位移至 (4, 0)。
  - 數值結算：`damageDealt: 110`（`simDamagedTargetAtNewPosition: true`）。
  - 視覺派發：`SequenceSystem` 派發 `BEAM` 動作，傳入目標點 `{ x: 144, y: 41.57, z: 53.5 }`；而當前目標錨點為 `{ x: 277.75, y: 80.18, z: 62.91 }`，偏移 `diffX: 133.75px`。7 次 `vfx.playEffect` 均落在初始點。

### 4.3 F03：UPDATE_SKILL 邊界與 UI 編輯器（P2 / D2，已確認 API 缺陷與 UI 觀測）
- **API 邊界**：
  - 負數數值（range: -5, cast: -2, cd: -1, cost: -50）全數被 API 接受並寫入 `skillDB`。
  - 特殊值 `NaN` 與 `Infinity` 被 `Number.isFinite` 攔截。
  - 非法 enum 字串（`INVALID_TAG`, `INVALID_TYPE`）被 API 接受。
  - `finally` 透過 `UPDATE_SKILL` 成功復原全部欄位（`restoredCorrectly: true`）。
- **UI Inspector DOM**：
  - `tag`（技能類型）與 `type`（目標模式）由 `<select>` 渲染，選項受限。
  - 射程輸入 `-5` 成功寫入 DOM 與 DB。
  - 清空為 `""` 產生 `NaN`，被 `isFinite` 擋下，DOM snapback 回 `-5`。
  - UI 重新輸入 `8` 成功恢復原值（`uiRestoreWorks: true`）。

---

## 5. 全庫清冊統計分析（Inventory Coverage Metrics）

清冊母表採用 `git ls-tree -r --name-only e92b635`，所有統計皆由輸出 rows 直接重算，維度完全獨立：

| 維度 | 分組類別 | 筆數 (Rows) | 備註說明 |
| :--- | :--- | :---: | :--- |
| **母表來源** | Tracked Files（追蹤檔案） | 637 | 來自 commit `e92b635` |
| | Untracked Items（工作區未追蹤項目） | 12 | 來自 `git status --porcelain` |
| | **總列數 (Total Rows)** | **649** | 清冊 CSV 實際資料列（不含標頭） |
| **查證狀態** | 已確認該事實 | 19 | 僅包含具體問題／引用事實之檔案，不擴大為全檔合規 |
| | 僅列舉／待查 | 630 | 包含 618 檔追蹤檔與 12 項未追蹤檔，標記待查原因 |
| | **查證總和** | **649** | 19 + 630 = 649，分組總和完全一致 |
| **檔頭狀態** | 合規 (含 BARREL 與測試檔) | 114 | TS/TSX 原始碼方框檔頭與測試檔 |
| | 待補／過時 | 1 | `engine/core/Effects.ts`（13 vs 16 種效果） |
| | 不適用 | 161 | public/assets 資產、docs、json、html、py、untracked |
| | 待查 | 373 | 尚未逐檔審閱檔頭之程式檔案 |
| | **檔頭總和** | **649** | 114 + 1 + 161 + 373 = 649 |
| **工程區域** | engine | 163 | 核心模擬、表現、材質、數學 |
| | components | 28 | React HUD 與檢查器 UI |
| | data | 63 | 技能、單位、音效與視效資料 |
| | constants | 10 | 領域常數 SSOT |
| | types | 2 | 全域型別合約 |
| | tests | 97 | 單元測試與守門基準 |
| | tools | 98 | 預覽工具、E2E 探針與腳本 |
| | docs | 31 | 架構手冊、報告與決策紀錄 |
| | publicAssets | 102 | 二進位 Atlas、貼圖與音訊 |
| | rootConfig | 43 | 根目錄建置配置與 CSS 樣式 |
| | untracked | 12 | 工作區未追蹤工作檔 |
| | **區域總和** | **649** | 各區域總和等於總列數 |

---

## 6. 審查問題修復對照總表（Review Reconciliation Table）

回應 `docs/PROJECT_CLEANUP_A0R1_REVIEW.md`（R1-01～R1-03）之修訂對照：

| 複審編號 (Review ID) | 原始指責問題 | 本輪 A0-R2 具體修訂 (Correction) | 具體證據來源 (Evidence) | 剩餘待辦／邊界界定 |
| :--- | :--- | :--- | :--- | :--- |
| **R1-01** [P1] 探針異常仍成功退出，預設 CONFIRMED | 第 811 行 catch 吞例外 EXIT=0；第 36 行預設 CONFIRMED；注入 setup error 依然退出 0。 | 1. 案例初始全為 NOT_RUN。<br>2. 每案依量測計算狀態。<br>3. 頂層 catch 設定非零退出碼。<br>4. 增加 `--inject-setup-error` 測試旗標。<br>5. 輸出目錄支援 `--out-dir`，不覆寫 R1。 | `probe-err.log`（EXIT=1）；`cleanup-a0-r2-err/repro_results.json`（NOT_RUN: 13）；`cleanup-a0-r2/repro_results.json`（EXIT=0，completed: 13）。 | 探針已具備可靠失敗與成功區分能力，交付驗收通過。 |
| **R1-02** [P1] 清冊以白名單＋模板產生深度查證，統計不同步 | 泛用 fallback 導出 50 列假查證；統計數字與 CSV 不同步；含不存在之路徑；生成器硬編碼 PASS。 | 1. 廢除 deepVerifyFiles 白名單與 fallback，50 列降為待查，僅 19 列保留「已確認該事實」。<br>2. 移除假 AST 描述與不存在之路徑。<br>3. 統計改從最終 rows 計算，分組相加等於 649。<br>4. 生成器增加輸入驗證與覆寫保護，缺輸入或 error 輸入立即 EXIT=1。 | `test-inventory-guard` 驗收日誌（Hash Unchanged: true，EXIT=1）；`PROJECT_CLEANUP_A0_INVENTORY.csv`（649 列）；`PROJECT_CLEANUP_A0_EVIDENCE.json`。 | 其餘 630 列之逐檔深度查證交由後續有界任務分批進行。 |
| **R1-03** [P2] 部分情境／還原描述超出實作 | F02 SINGLE 直接改座標，缺 dispatch 觀測；RESET 僅測 AI 重建；UI snappedBack 只看 DB 數字；UI 還原硬編碼。 | 1. F02 改以 `teleportTo` 受控位移，記錄真正 dispatch 座標（diffX: 133.75px）與 VFX 呼叫。<br>2. F01-E1 更名為 AI 重建；新增 F01-E2 真實 `RESET_GAME` 測試。<br>3. UI snappedBack 比對清空前後之 DOM inputValue 與 DB。<br>4. 精確定位 tag/type select 選項；UI 透過輸入還原，finally 走 UI_COMMAND 還原快照值。 | `cleanup-a0-repro.mjs`；`tools/ui-e2e/out/cleanup-a0-r2/repro_results.json`。 | 產品端空值草稿與數值防禦 Schema 設計留待後續 A3 處理。 |

---

## 7. 結論與交付

本輪（A0-R2）已達成任務目標：
1. **探針可靠性確立**：探針能正確反映 setup error（EXIT=1）與未完成案例，正常執行時 13 案全數通過並精準記錄 3 項既有產品缺陷（EXIT=0）。
2. **清冊證據誠實化**：撤回所有模板產生的「已深度查證」；母表固定於 commit `e92b635`，總列數 649 列各維度總和一致；生成器具備嚴格輸入校驗與覆寫保護。
3. **零產品程式碼異動**：全過程僅修改指定的 6 個工具、文檔與證據檔案。

本輪修改已準備就緒，交回主代理審查。
