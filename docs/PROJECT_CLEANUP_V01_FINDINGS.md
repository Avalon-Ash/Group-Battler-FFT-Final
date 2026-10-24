# PROJECT CLEANUP V01 查證台帳 (FINDINGS)

> 本文件為 V01 批次之 COORD01、T01、K01、K02 及 A0 清冊缺口之查證證據台帳。格式嚴格遵守「問題／證據／觀察／結論／P/D／下一步／最小檔案範圍」架構。

---

## 1. 查證與收尾項目台帳總表

| 項目代號 | 項目名稱 | 分級 (P/D) | 狀態 | 核心依據 |
| --- | --- | --- | --- | --- |
| **F02** | 單體序列動態目標綁定與鎖定時點 | P2/D2 | **可關閉** | 36 招受影響技能動態跟隨目標至結算幀，AOE 雙重鎖定（sim/visual 0px），測試 16 項全過，保真單張更新後全綠。 |
| **F03** | 技能編輯器數值緩衝與驗證守門 | P2/D2 | **可關閉** | 20 項 API 邊界驗證全過、UI 草稿生命週期全過、短戰鬥煙霧正常，before 探針補正非零退出碼守門。 |
| **T01** | DocDrift 檔頭防過時能力邊界 | P3/D1 | **可關閉** | 檔頭明確註記工具能力邊界（路徑與名稱守門，不保語義時序）；本批文件名稱數量已人工核對。 |
| **K01** | Knip 匯入解析限制與缺檔查證 | P3/D1 | **可關閉** | 144 處未解析均為瀏覽器端 Vite root import 之工具解析限制（對應 46 條不重複路徑，100% 存在於磁碟）；真正缺檔為 0。 |
| **K02** | Sharp 套件環境相容與逐幀退避 | P3/D1 | **可關閉** | 本機無 sharp 時自動走 `frames.forEach` 退避，實測 `FX_HEAL_BURST` 輸出 5 張 220x200 逐幀有效 PNG，無報錯。 |
| **COORD01** | 渲染座標協議違規診斷與分級 | 暫定 P2/D3 | **保留（未完成）** | `--assert` 實跑 EXIT=1，sink=1 (1.89px)、over-void=1 (擊飛出界)、oscillation=106 flips (13 static episodes)。V01 抽樣有 corpseOp=null 及採樣時間錯位限制，根因為假說，代表案例取證待 AUDIT01 補強，不提前關閉。 |
| **A0-GAP** | A0 歷史清冊缺口量化盤點 | P3/D0 | **保留（未完成）** | 歷史 CSV 649 列中 9 條已確認事實、640 條列舉待查；V01 43 檔手列名單不能充當全檔驗收數；已分 4 組量化，待 AUDIT01 重建全庫真確帳本，不偽稱完成。 |

---

## 2. 逐項查證細部報告

### 項目 F02：單體序列動態目標綁定與時點協議
- **問題**: 單體有詠唱非投射物技能在目標移動時，特效留在施法起點造成視覺脫節；且需保證 AOE 技能維持地面鎖定不跟隨。
- **證據**:
  - `tools/ui-e2e/out/v01-f02-after.json` (status: PASS, EXIT=0)
  - `tools/ui-e2e/out/agent-logs/v01-f02.log`
  - `tests/SequenceTargetBinding.test.ts` (16 tests passed, 0 failures, 0 `as any`)
  - `tools/ui-e2e/baseline/fidelity/battle_frozen.png` (單張授權更新，diff=0.00%)
- **觀察**:
  - `mb_a2`（冰封禁錮）: 嚴格捕捉 BEAM 動作（移除 fallback），`drift3D = 0.00px`，傷害 110。
  - `mb_u1`（奧術漩渦）: 實際取樣序列空間派發座標，`maxVisualDrift = 0.00px`，`followedMovedTarget = false`；獨立斷言 `simulationGroundLocked = true`（逃脫目標傷害 0、進圈目標傷害 430）與 `visualGroundLocked = true`（空間動作鎖定原序列點）。
  - 受影響非 BASIC 技能經真實資料庫與序列庫導出共 36 項（見 `review-f02-eligible.json`），無杜撰之假 ID。
  - 負向控制：注入 `console.error` 實跑證實退出碼為 1 (`EXIT=1`, status `FAIL`)。
- **結論**: 單體目標動態綁定機制完整落實，邊界與排除路由均經強化斷言驗證，保真基準更新後 guard 全綠。
- **P/D**: P2/D2（原計畫暫列 P2/D2；實作與驗收修復完成，結案）
- **下一步**: 關閉 F02；隨 V01 批次由主代理合併。
- **最小檔案範圍**: `engine/presentation/visuals/SequenceSystem.ts`, `engine/presentation/VisualSystem.ts`, `engine/renderers/RenderSpec.ts`, `tests/SequenceTargetBinding.test.ts`, `tools/ui-e2e/cleanup-f02-check.mjs`.

---

### 項目 F03：技能編輯器數值緩衝與驗證守門
- **問題**: 技能編輯器數值未緩衝導致輸入過程異常更新，且缺乏 API 邊界驗證；測試缺乏跨 engine 隔離。
- **證據**:
  - `tools/ui-e2e/out/v01-f03-after.json` (status: PASS, EXIT=0)
  - `tools/ui-e2e/out/agent-logs/v01-f03.log`
  - `tests/SkillEditor.test.ts` (59 tests passed, 0 failures, 0 `as any`)
- **觀察**:
  - 20 項邊界案例全數通過：負詠唱、非法 tag、偽布林字串、未定義 CC 均被拒絕且保持原值不變；合法負值（power 治療）與選填清除正常運作。
  - UI 草稿生命週期：SkillNumberInput 緩衝有效，Enter/blur 單次派發，Escape 取消草稿，切換技能不串連。
  - 探針守門：`cleanup-f03-check.mjs` before 分支若遇錯誤、還原失敗或 smoke 失敗均嚴格回傳 `BEFORE_ANOMALY` 與 `EXIT=1`。
- **結論**: 技能編輯器驗證與緩衝合約全數落實，測試與探針補正完畢。
- **P/D**: P2/D2（原計畫暫列 P2/D2；實作與驗收修復完成，結案）
- **下一步**: 關閉 F03；隨 V01 批次由主代理合併。
- **最小檔案範圍**: `data/ui/skillEditor.ts`, `components/inspector/parts/SkillNumberInput.tsx`, `components/inspector/tabs/SkillDbTab.tsx`, `engine/systems/ui/UICommandSystem.ts`, `tests/SkillEditor.test.ts`, `tools/ui-e2e/cleanup-f03-check.mjs`.

---

### 項目 T01：DocDrift 檔頭防過時能力邊界
- **問題**: 評估 `tests/DocDrift.test.ts` 自動防過時測試的能力邊界，確認是否能判定語義與時序正確性。
- **證據**:
  - `tests/DocDrift.test.ts` 方框檔頭與測試原始碼
  - `npx vitest run tests/DocDrift.test.ts` (3 tests passed)
- **觀察**:
  - `DocDrift.test.ts` 僅檢查三件事：① 註解／文件內提到的檔案路徑是否存在；② 方框檔頭第一行類別名是否出現在該檔；③ 已廢棄的狀態欄位（`LEGACY_EFFECT_FIELDS`）不得出現在註解。
  - 無法判定：中文語義是否正確、責任劃分是否真實、參數數量與時間點是否精確、時序與規範是否如實對齊。
  - 人工核對：本批涉及之報告與檔頭（VisualSystem 集合狀態、RenderSpec §4.1、各報告名稱與時序）均經人工逐字核對。
- **結論**: 已在 `tests/DocDrift.test.ts` 檔頭明確補充能力邊界警語；確立「DocDrift 為語彙防懸空守門，非自動語義驗收工具」之架構認知。
- **P/D**: P3/D1（原計畫 P3/D1；能力邊界已固化至檔頭，結案）
- **下一步**: 關閉 T01。後續批次維持「靜態工具守路徑 + 代理人工審查語義」之雙重紀律。
- **最小檔案範圍**: `tests/DocDrift.test.ts`.

---

### 項目 K01：Knip 匯入解析限制與缺檔查證
- **問題**: 釐清 `npm run knip` 報出之 144 處 Unresolved imports 是否為專案真實缺檔。
- **證據**:
  - `tools/ui-e2e/out/v01/knip.log` (EXIT=1)
  - `tools/ui-e2e/out/v01/knip_analysis.json`
- **觀察**:
  - 144 處未解析匯入共涉及 46 條不重複路徑（如 `/types.ts`、`/constants.ts`、`/engine/utils.ts` 等）。
  - 磁碟比對：46 條路徑去除前導斜線後，100% 在專案磁碟中真實存在，真正缺檔數量為 **0**。
  - 根因：全部來自 `tools/` 測試腳本在 Playwright 瀏覽器 `page.evaluate()` 內部以 Vite 根路徑（如 `import('/types.ts')`）進行動態載入。Knip 以 Node 檔案系統根目錄解析，導致誤報。
  - Unused exports 僅 2 項（`SKILL_TEAM_OPTIONS`、`SKILL_FIELD_RULES`），Unused types 僅 2 項（`SkillFieldRule`、`SequenceTargetBinding`），均為公開模組合理導出型別。
- **結論**: 已證實 144 處未解析為「工具解析限制，非產品故障」，且無任何代碼缺檔。依合約不修改 knip 設定以求虛假全綠。
- **P/D**: P3/D1（原計畫暫列 P3/D1；診斷結案，無程式缺檔）
- **下一步**: 關閉 K01；保留既有配置。
- **最小檔案範圍**: 無產品代碼修改。

---

### 項目 K02：Sharp 套件相容與無 sharp 逐幀退避
- **問題**: 查證當前執行環境是否具備 `sharp` 套件，並驗證 `fx-shot` 在無 sharp 環境下的退避表現。
- **證據**:
  - `node -e "import('sharp')"` 報 `Cannot find package 'sharp'`
  - 實跑命令: `node tools/vfx/fx-shot.mjs --keys=FX_HEAL_BURST --out=tools/ui-e2e/out/v01/fx-no-sharp` (EXIT=0)
  - 產出檔案: `tools/ui-e2e/out/v01/fx-no-sharp/FX_HEAL_BURST_0..4.png`
- **觀察**:
  - 本機環境未安裝 sharp 套件。
  - `tools/vfx/fx-shot.mjs` 原生具備退避設計：當 `import('sharp')` 失敗時，走 `frames.forEach((f, i) => writeFileSync(...))` 逐幀輸出。
  - 產出的 5 張 PNG 經標頭與維度驗證：全部為標準 PNG 格式，尺寸均為 220x200，大小 46KB~51KB，非空白畫面，像素渲染正常。
- **結論**: `fx-shot` 在無 sharp 環境下具備完整的確定性逐幀輸出能力，差異僅為未拼合成單張橫幅總表，不影響工具查證與美術預覽功能。
- **P/D**: P3/D1（原計畫暫列 P3/D1；診斷與實跑驗證完成，結案）
- **下一步**: 關閉 K02。
- **最小檔案範圍**: 無產品代碼修改。

---

### 項目 COORD01：渲染座標協議違規診斷與分級
- **問題**: `node tools/ui-e2e/coord-guard.mjs --assert` 實跑 EXIT=1，存在座標協議違規，需進行只讀診斷、代表案例取證與分級，不得硬修產品或放寬門檻。
- **證據**:
  - `tools/ui-e2e/out/v01/coord_guard_new.json` (EXIT=1)
  - `tools/ui-e2e/out/v01/v01-coords.log`
  - `tools/ui-e2e/out/v01/coord_cases.json`
  - 截圖證據:
    - SINK: `tools/ui-e2e/out/v01/coord_case_sink_f337.png`
    - VOID: `tools/ui-e2e/out/v01/coord_case_void_f510.png`
    - OSCILLATION: `tools/ui-e2e/out/v01/coord_case_osc_f507.png`, `f508.png`, `f509.png`
- **三類代表案例分析**:
  1. **下沉違規 (Sink Violation, worst: 1)**:
     - 案例: `FOREST` seed 1001, frame 337, 單位 `RED-0002` (RANGER)，`isMoving = true`, `moveProgress = 0.459~0.524`。
     - 數值: 單位腳點 `unitTy = -94.11`，地塊頂面 `tileTopY = -96.00`，下沉 `delta = 1.89px`（門檻 1.00px）。
     - 分析: 單位在高度差為 96px 的地塊間移動步進過渡（`UNIT_STEP_BLEND`），插值算法在特定進度時未完全覆蓋目標高差，造成 1 幀微幅次像素下沉；非停格穿透。畫面肉眼不可辨。
     - A0 歷史: A0 已存在。
     - 建議最小修復範圍: `engine/math/VisualMath.ts` 中 `getUnitGroundHeight` 移動過渡下限約束（`Math.max` 確保不低於起點與終點較低者）。
  2. **虛空違規 (Over-Void Violation, worst: 1)**:
     - 案例: `FOREST` seed 1002, frame 510, 單位 `BLU-0007` (MAGE)，`hex = [-6, 5]`, `hp = 1360`, `physics.z = 0.42px`。
     - 數值: 單位受擊產生強烈水平衝量（`vx: -461`, `vy: 386`），被擊飛越出地圖外圍網格（`isValidTile = false`）。
     - 分析: 擊飛拋物線在垂直高度降至地面（`physicsZ < 1`）時，單位尚未來得及觸發邊界墜入虛空死亡（banish），在邊界外採樣無地塊。畫面為單位正被擊飛出場外。
     - A0 歷史: A0 已存在。
     - 建議最小修復範圍: `engine/systems/ZoneSystem.ts` 或物理衝量邊界檢測，單位越出有效邊界時立即標記墜入虛空狀態。
  3. **靜態排序震盪 (Static Oscillation, 13 episodes)**:
     - 案例: `VOID` seed 1002, frames 507-509, 屍體 `C:RED-0010` vs 相鄰危害 `H:1,2` / `H:2,2`。
     - 數值: 屍體位移極小（0.02px），但 `sortBias` 在 `-2.0`（原格記憶）與 `13.2`（切換至鄰格中心 Y）來回跳動，導致排序鍵與 HAZARD 在 507（gap 1448）、508（gap -68）、509（gap 1448）交替翻轉。
     - 分析: 屍體受擊微弱位移停留在格界臨界線上，`UnitFrameStore` 的格界滯後閾值（`HEX_HYSTERESIS_PX`）與死區（`SORT_DEADBAND_PX`）在相鄰格格心高度差較大時產生鋸齒切換。
     - A0 歷史: A0 已存在。
     - 建議最小修復範圍: `engine/renderers/frame/UnitFrame.ts` 中屍體進入完全靜止狀態時鎖定排序格，禁止格界反覆切換。
- **結論**: 三大問題已由 coord-guard 重現診斷。按合約本輪只讀診斷、不擴大修改產品。（審查更正：V01 初版之 capture-cases.mjs 存在查詢未實例化之 renderer.lastRenderList 導致 corpseOp=null 及 hazardCount=0、以及 voidCase 抽樣時間與診斷時點錯位之限制；原報告所述 clamp、立即 banish 或屍體排序凍結僅為初探假說，非已證實根因與已定解法；保留原觀測，真確因果鏈留待 AUDIT01 補強取證）。
- **P/D**: 暫列 P2/D3（原診斷保留，取證待 AUDIT01 補強，未修復）
- **下一步**: 保留於 HANDOFF，留待 AUDIT01 補強取證並由主代理審查修復設計。**不得提前關閉**。
- **最小檔案範圍**: 無產品代碼修改。

---

### 項目 A0-GAP：A0 清冊缺口量化盤點
- **問題**: A0 歷史清冊（649 檔）中絕大多數未進行實質逐檔查核，需量化未核實缺口並分組規劃。
- **證據**:
  - `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`
  - `tools/ui-e2e/out/v01/a0_gap_summary.json`
  - `git diff --name-status e92b635..HEAD`
- **四組缺口量化統計**:
  | 領域分組 | 涵蓋目錄範圍 | 總檔數 | 具實質人工證據檔數 | 仍待核實檔數 | 核實率 |
  | --- | --- | ---: | ---: | ---: | ---: |
  | **Simulation (模擬)** | `engine/systems`, `engine/ai`, `engine/physics`, `engine/core`, `engine/events`, `engine/math`, `engine/types` | 58 | 9 | 49 | 15.5% |
  | **Presentation (表現)** | `engine/presentation`, `engine/renderers`, `engine/graphics`, `engine/renderer.ts`, `engine/game.ts` | 99 | 10 | 89 | 10.1% |
  | **UI & Data (UI與資料)** | `components/**`, `data/**`, `constants/**`, `types.ts`, `skillDatabase.ts` | 104 | 11 | 93 | 10.6% |
  | **Tools & Config (工具與設定)** | `tools/**`, `tests/**`, `docs/**`, 根目錄設定檔, `.claude`, `.github` | 388 | 13 | 375 | 3.4% |
  | **全庫總計** | **全專案追蹤檔案** | **649** | **43** | **606** | **6.6%** |
- **A0 以來追蹤檔案變更**:
  - Tracked 刪除 (2 檔，commit `2b15fad`): 裸檔名 `GlowSpriteCache.ts`, `GlowSpriteCache.test.ts`
  - Tracked 新增 (17 檔): `components/inspector/parts/SkillNumberInput.tsx`, 6 個單元/E2E 測試 (`SequenceTargetBinding`, `SkillEditor`, `RenderGlowFlag`, `CastingDeathInterruption`, `cleanup-f02-check`, `cleanup-f03-check`), 10 份進度報告
- **結論**: 歷史 A0 CSV 共有 649 列，其中僅 9 列為「已確認該事實」，其餘 640 列為「僅列舉／待查」；V01 報告所列 43 檔為初選之手列名單，非全檔語義驗收數，絕大多數（93.4%）仍處於未實質核實狀態。不得宣稱「全庫已查清」。缺口已依 4 大領域清晰切分。
- **P/D**: P3/D0（缺口量化盤點完成，待 AUDIT01 逐檔查證重建全庫帳本）
- **下一步**: 依 4 大領域由 AUDIT01 執行當前全庫真確帳本重建；**不得提前關閉**。
- **最小檔案範圍**: 無產品代碼修改。
