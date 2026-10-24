# PROJECT CLEANUP AUDIT01 執行與驗收報告

> **批次名稱**: AUDIT01（全庫盤點、低風險整理與座標證據收斂）  
> **分支**: `feat/project-cleanup`  
> **起始 Commit**: `016dc318f4f5e0f0941ded61e399efd4e8d20612`  
> **完成 Commit 範圍**: `016dc31..ead3ed4` (共 3 個原子 Commit)  
> **日期**: 2026-10-24  

---

## 1. 執行摘要與清單統計

本輪工作依據 `docs/PROJECT_CLEANUP_AUDIT01_AGENT_PROMPT.md` 連續執行三項工作包：
1. **工作包 B (Export 清理與文件一致性)**：完成 4 項候選之匯出收斂（`data/ui/skillEditor.ts` 與 `engine/presentation/visuals/SequenceSystem.ts`），修復 `tests/SequenceTargetBinding.test.ts` 障礙物隔離問題，清理 V01 文件行尾空白並校正 A0 完成數口徑與 P/D 分級。
2. **工作包 C (COORD01 真確取證與因果判定)**：新增專用取證探針 `tools/ui-e2e/cleanup-coord01-check.mjs`，成功擷取 4 組代表案例之底層 RenderOp、座標與診斷數據至 `tools/ui-e2e/out/audit01/`，明確區分產品缺陷與探針誤判，並提出可執行的最小修復設計。
3. **工作包 A (全庫真實清冊與檔頭整理)**：基於 `git ls-files -s` 建立 657 個 tracked 檔案之完整台帳 `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv`，深層掃描 97 個方框檔頭並完成 D0 修復（`data/status/effect_defs.ts` 13->16 種），產出缺陷與候選總帳 `docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv`。

### 清單統計指標 (全庫 657 檔案)

| 指標向度 | 分類 | 檔案數量 | 佔比說明 |
| :--- | :--- | :--- | :--- |
| **枚舉總數** | `git ls-files` 追蹤檔案 | **657** | 歷史 A0 CSV 649 筆（刪除 2 筆、新增 10 筆程式/報告/測試）之差集收斂 |
| **語義審查** | `已讀且已對照` (Semantic Read) | **30** | 本輪及已驗收批次逐行核對責任、符號、呼叫鏈並記錄具體證據 |
| | `不適用` (Not Applicable) | **183** | 靜態圖形/音訊資產 (109)、文件 (34)、JSON 資料/基準 (30)、配置設定 (10) |
| | `未讀（待查）` (Unread Pending) | **444** | 尚待後續領域輪次逐行審查之原始碼與測試碼（禁止偽稱完成） |
| **執行期狀態** | `單元測試覆蓋` (Unit Tested) | **195** | 780 項單元測試直接或間接導入驗證之模組與測試檔 |
| | `實跑` (Runtime Smoke/Guard) | **125** | 經 runtime-smoke, perf:guard, cleanup probes, fx-shot 等實跑驗證 |
| | `未驗證` (Runtime Unverified) | **337** | 靜態文件、尚未納入動態探針或單元測試之邊界程式/資產 |

---

## 2. 實際修改檔案清單與原因

本輪嚴格遵守不變量，未修改任何產品座標、物理、戰鬥邏輯，未更動基準檔，未調整閾值：

| 檔案路徑 | 所屬工作包 | 修改性質 | 具體修改與理由 |
| :--- | :--- | :--- | :--- |
| `data/ui/skillEditor.ts` | Package B | 程式 (D0) | 移除 `SKILL_TEAM_OPTIONS`、`SkillFieldRule`、`SKILL_FIELD_RULES` 的 `export` 關鍵字（僅檔內使用，無外部 consumer）。 |
| `engine/presentation/visuals/SequenceSystem.ts` | Package B | 程式 (D0) | 移除 `SequenceTargetBinding` 的 `export` 關鍵字（僅檔內序列目標綁定使用）。 |
| `tests/SequenceTargetBinding.test.ts` | Package B / A | 測試 (D0) | 在 `beforeEach` 清空 `engine.map.obstacles` 與 `engine.map.obstaclesHash`，消除隨機種子在 (3, 1) 生成障礙物導致 `PLACE_AGENT` 偶發失敗。 |
| `docs/PROJECT_CLEANUP_V01_FINDINGS.md` | Package B | 文件 | 清除 7 處行尾空白；校正 P/D 分級為標準兩軸（P0-P3 / D0-D3）；明確區分 A0 歷史清冊 9 條確認事實與 640 條列舉待查；調平 COORD 語氣。 |
| `docs/PROJECT_CLEANUP_V01_REPORT.md` | Package B | 文件 | 同步 V01_FINDINGS 之計數口徑與分級定義。 |
| `tools/ui-e2e/cleanup-coord01-check.mjs` | Package C | 工具 (新增) | COORD01 取證專用探針，捕捉真確 RenderOp、座標、速度、深度排序偏置與幀截圖。 |
| `tools/ui-e2e/out/audit01/*` (11 個檔案) | Package C | 取證數據 | 4 組代表案例圖片（sink, void, osc1, osc2）及 `coord01_evidence.json`。 |
| `data/status/effect_defs.ts` | Package A | 檔頭 (D0) | 方框檔頭第 3 行由「13 種持續效果規則資料」更正為「16 種持續效果規則資料」，對齊 `EFFECT_DEFS` 鍵值數量。 |
| `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` | Package A | 帳本 (新增) | 全庫 657 檔案之真實盤點台帳（含 SHA、用途、上游、下游、語義與執行期狀態）。 |
| `docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv` | Package A | 台帳 (新增) | 20 項缺陷、誤判與候選之完整總帳。 |
| `docs/HANDOFF.md` | Package A | 文件 | 同步 AUDIT01 真實交付狀態與後續交接計畫。 |

---

## 3. 四項 Export 去留證據 (Package B)

依據 knip 診斷與全專案靜態及動態引用檢索（`git grep -n -w`）：

1. **`data/ui/skillEditor.ts: SKILL_TEAM_OPTIONS`**:
   - **檢索結果**: 僅在 `data/ui/skillEditor.ts:63`（`team: SKILL_TEAM_OPTIONS`）作為欄位選項宣告。外部檔案（`SkillDbTab.tsx` 等）皆未使用該符號。
   - **處置**: 移除 `export` 關鍵字，保留本地定義。
2. **`data/ui/skillEditor.ts: SkillFieldRule`**:
   - **檢索結果**: 僅在 `data/ui/skillEditor.ts:22`（介面宣告）及 `:33`（型別註記）使用。
   - **處置**: 移除 `export` 關鍵字，保留本地型別定義。
3. **`data/ui/skillEditor.ts: SKILL_FIELD_RULES`**:
   - **檢索結果**: 僅在 `data/ui/skillEditor.ts:89`（`validateSkillDraft` 函式）內部走訪驗證規則。外部呼叫者直接呼叫 `validateSkillDraft()`，不直接取用此常數。
   - **處置**: 移除 `export` 關鍵字，保留本地常數。
4. **`engine/presentation/visuals/SequenceSystem.ts: SequenceTargetBinding`**:
   - **檢索結果**: 僅在 `SequenceSystem.ts:31`（介面宣告）、`:42`（`ActiveSequence.targetBinding`）、`:89` 等檔內方法使用。`VisualSystem.ts` 與外部測試只透過 `SequenceRunOptions` 傳遞參數。
   - **處置**: 移除 `export` 關鍵字，保留表現層內部介面。

**驗證結果**: `npm run lint` 0 錯誤、`npm test` 780 通過、`runtime-smoke` 通過、`perf:guard` 通過。

---

## 4. COORD01 取證結論與修復設計 (Package C)

透過 `tools/ui-e2e/cleanup-coord01-check.mjs` 擷取之真確數據（`tools/ui-e2e/out/audit01/`）：

### 案例 1: SINK 違例 (FOREST seed 1001, RED-0002, frame 337)
- **觀測數據**: `tileTop = -96.00`, `unitTy = -94.11`, `delta = 1.89px` (> 1.0px 守門門檻), `th = 96`, `nextH = 24`, `moveProgress = 0.524`。
- **RenderOp 取證**: `unitOp` (id: `U:RED-0002`, layer: `UNIT`, y: `189.89`, sortBias: `0.00`) 繪製於地表下；`tileOp` (id: `H:3,0`, layer: `TERRAIN`, y: `198.00`, sortBias: `-10.00`)。
- **因果判定**: **已證實產品缺陷 (P1/D3)**。`VisualMath.getUnitGroundHeight`（line 140-165）在懸崖下切時，使用 `smoothstep(FALL_START, FALL_END, t)`，其中 `FALL_START = 0.35`。當 `moveProgress = 0.524` 時，高度已開始向低台階插值（降至 94.11px），但單位物理足跡（`HexUtils.fromPx`）仍在起點高台（`q=3, r=0`，高度 96px），導致視覺腳點穿透高台地表 1.89px。
- **修復設計 (提供後續實作)**:
  - 檔案: `engine/math/VisualMath.ts` (`getUnitGroundHeight`)
  - 唯一寫入者: 表現層高度推導函式
  - 修復方案: 在下切台階（`hB < h`）插值時，引入足跡所在格判斷；在單位足跡未正式跨入目標格前，地表高度限制不得低於當前格高度：`if (footHex.q === agent.q && footHex.r === agent.r) return Math.max(h, interpolated);`。
  - 驗收指標: `cleanup-coord01-check.mjs` 下 delta <= 1.0px。

### 案例 2: OVER-VOID 違例 (FOREST seed 1002, BLU-0007, frame 512)
- **觀測數據**: `hp = 1360`, `physics.z = 0.42px`, `physics.vz = -614.3 px/s`, `footHex = [-6, 5]`, `isGroundValid = false`。
- **RenderOp 取證**: `unitOp` (id: `U:BLU-0007`, y: `-48.42`, sortBias: `0.00`)，無對應地形 tileOp。
- **因果判定**: **已證實探針誤判 (P3/D1)**。單位遭受擊飛衝量飛出地圖邊界，正以 `-614.3 px/s` 之垂直速度高速墜入虛空（自由落體流程，至 `z < -1000` 處死）。探針邏輯（`coord-probes.mjs:274-278`）僅以 `pz < -1` 視為下墜取樣、`pz >= 1` 視為空中跳躍，唯獨將 `pz in [-1, 1]` 嚴格判定為「在地面停留」。因離散時間步進在 frame 512 恰好採樣在 `z = 0.42px`，探針誤將高速下墜幀判為滯空違規。
- **修復設計 (提供後續探針補正)**:
  - 檔案: `tools/ui-e2e/lib/coord-probes.mjs`
  - 修復方案: 虛空出界檢測加入向下垂直速度過濾：`if (pz < -1 || (!t && a.physics.vz < -50)) { S.sink.fallingSamples++; continue; }`。
  - 驗收指標: 自由落體過程中不再產生 over-void 誤報。

### 案例 3 & 4: 靜態景深翻轉與震盪 (VOID seed 1002, RED-0010, frames 508–510 & 562–564)
- **觀測數據**: 屍體 `sortBias` 在 `-2.000` 與 `13.159` 之間來回跳變；在 frame 508 與相鄰地形 tile `H:1,2`（y=96）產生排序翻轉。
- **RenderOp 取證**: 507 幀 `corpseOp` (sortBias: `-2.000`, y: `117.84`)；508 幀 `corpseOp` (sortBias: `13.159`, y: `133.00`)；510 幀 `corpseOp` (sortBias: `-2.000`, y: `117.84`)。
- **因果判定**: **已證實產品缺陷 (P2/D3)**。`UnitFrame.ts`（lines 75-105）利用 `HEX_RELEASE_FRAMES`（30 幀）在單位靜止後解除格中心鎖定。由於陣亡單位受衝量微幅滑行，速度衰減至極小但在兩格邊界徘徊，滯後記憶解除後，浮點數微小震盪導致 `hexCenterY` 在 (1, 2) 與 (1, 1) 間切換，觸發 `sortBias` 跳變 15.16px。
- **修復設計 (提供後續實作)**:
  - 檔案: `engine/renderers/frame/UnitFrame.ts`
  - 修復方案: 對已陣亡單位（`agent.hp <= 0`），一旦滑動速度低於閾值（`|vx| + |vy| < 0.05`），永久鎖定其 `sortHex`，不再解除滯後記憶，防止靜止屍體因格界浮點數跳動。
  - 驗收指標: 陣亡單位 static episode 降為 0，oscillation flips 歸零。

---

## 5. 驗證日誌與執行結果

本輪全部指令依合約以 `tools/agent/run.mjs` 執行，未交回未完成之回合：

| 驗證項目 | 命令 | 退出碼 | 耗時 | 日誌位置 | 結果 |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **型別檢查** | `npm run lint` | `EXIT=0` | 6s | terminal stdout | 0 errors |
| **單元測試** | `npm test` | `EXIT=0` | 11s | `tools/ui-e2e/out/agent-logs/test-full.log` | 91 files, 780 tests passed |
| **生產建置** | `npm run build` | `EXIT=0` | 4s | `tools/ui-e2e/out/agent-logs/build-pkg-a.log` | 0 errors, dist bundle 產出 |
| **渲染煙霧** | `runtime-smoke.mjs` | `EXIT=0` | 15s | `tools/ui-e2e/out/agent-logs/v01-smoke.log` | 0 page errors, engine advancing |
| **效能守門** | `perf:guard` | `EXIT=0` | 38s | `tools/ui-e2e/out/agent-logs/v01-guard.log` | 所有保真檢查通過，perf guardrails <= 1.15 |
| **文件防過時** | `vitest tests/DocDrift.test.ts` | `EXIT=0` | 1s | terminal stdout | 3 passed (路徑、檔頭、欄位守門) |
| **座標取證探針** | `cleanup-coord01-check.mjs` | `EXIT=0` | 25s | `tools/ui-e2e/out/agent-logs/c-probe2.log` | 4 組案例全部捕捉，無 REPRO_MISMATCH |
| **Git 差異檢查** | `git diff --check` | `EXIT=0` | 1s | terminal stdout | 無任何行尾空白或格式錯誤 |

---

## 6. Commit 紀錄與回退指南

本輪共產生 3 個原子 Commit，每個工作包獨立提交：

```text
ead3ed4 docs(inventory): establish AUDIT01 tracked inventory, findings ledger, and header alignment (Package A)
935804c test(coord): implement COORD01 forensic probe and capture ground-truth RenderOp evidence (Package C)
3845f74 refactor(cleanup): remove redundant exports and correct V01 review findings (Package B)
```

### 回退方式 (Rollback Instructions)
- 若需回退完整 AUDIT01 批次：
  ```bash
  git reset --hard 016dc318f4f5e0f0941ded61e399efd4e8d20612
  ```
- 若僅需單獨回退 Package A（清冊與檔頭）：
  ```bash
  git revert ead3ed4
  ```
- 若僅需單獨回退 Package C（座標探針與取證檔）：
  ```bash
  git revert 935804c
  ```
- 若僅需單獨回退 Package B（export 清理）：
  ```bash
  git revert 3845f74
  ```

---

## 7. 精確未完成項目清單

本輪未偽稱完成任何未經全面查證之事項，以下事項如實列為未完成：
1. **語義審查未讀項目**: 共 **444** 個原始碼與測試檔案（詳見 `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` 中 `semanticStatus = 未讀（待查）` 列），將於後續領域清冊批次中依模組逐一審查。
2. **執行期未驗證項目**: 共 **337** 個檔案（詳見 `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` 中 `runtimeStatus = 未驗證` 列），待後續編寫專用 probe 或單元測試補齊。
3. **COORD01 產品代碼修復**: 本輪依合約嚴格保持產品代碼只讀，已交付 SINK (P1/D3) 與 OSC (P2/D3) 之修復設計，待主代理審查後於專案排程中授權實作。
4. **奧義重新設計與全庫平衡**: 依既定排程，留待清理與阻斷問題處理完畢後執行。
