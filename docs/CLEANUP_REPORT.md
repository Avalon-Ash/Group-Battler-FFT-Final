# CLEANUP_REPORT.md — 文件與註解整理報告

本報告依據 `docs/DOCS_CLEANUP_AGENT_PROMPT.md` 與 `AGENTS.md` 規範產出，記錄代碼庫現況盤點、過期註解修復、文件事實同步、檔案歸檔、死碼刪除及最終保真度驗證。

---

## 1. 盤點（C1 Inventory）

本節以代碼庫現行真實現況（SSOT）為基準，對照舊有文件與註解進行全盤清查。

### 1.1 死亡流程的過期註解

| 檔案:行號 | 現有寫法 | 應有事實 (SSOT) |
| :--- | :--- | :--- |
| `engine/systems/agentManager.ts:6-8` | `║ 下游：RagdollFactory / EventBus(AGENT_DIED, AGENT_RESET) ║`<br>`║ [ARCH] deathTimer 由此累計，UnitDeathPainter 消費 ║`<br>`║ [TODO: RAGDOLL] ragdoll 快照由此建立，物理由 Painter 實作║` | `RagdollFactory.createFromAgent` 建立的骨架快照僅提供 `torso` 的初始衝擊速度 `(vx, vy, vz)` 給 `UnitDeathPainter.getKnockOffset` 進行純函式擊飛位移計算；無布娃娃物理演算，`updateDeathState` 是 `deathTimer` 與 `fullyDead` 的唯一寫入者。 |
| `engine/systems/agentManager.ts:170-171` | `// [ARCH] deathTimer 為 UnitDeathPainter 提供死亡進度資料`<br>`// [TODO: RAGDOLL] 當布娃娃系統實作後，此數值將驅動物理分解動畫的時間軸` | `deathTimer` 提供死亡進度資料，驅動 `SpriteUnitRenderer` 的逐格死亡動畫（6 幀）及後續停格、擊飛位移與淡出沉降，並非布娃娃分解動畫。 |
| `engine/systems/unit/RagdollFactory.ts:5-6` | `║ 下游：UnitDeathPainter.draw() 消費骨骼資料 ║`<br>`║ [ARCH] 初始速度由 impactX/Y 決定，物理由 RagdollPhysics 接管║` | 初始速度由 `impactX/Y` 決定，供 `UnitDeathPainter.getKnockOffset` 取用；`RagdollPhysics` 無任何呼叫者，不接管物理。 |
| `engine/systems/unit/RagdollFactory.ts:17` | `// 物理演算由 RagdollPhysics.update() 接管，此處僅建立初始快照` | 此處僅建立初始骨骼快照供 `UnitDeathPainter` 讀取軀幹初速；`RagdollPhysics.update()` 未被呼叫。 |
| `engine/systems/unit/RagdollPhysics.ts:2-5` | `║ 上游：UnitDeathPainter.draw() 每幀呼叫 ║`<br>`║ 下游：RagdollBone[] 狀態（就地修改，無回傳值） ║` | 全專案零引用，`UnitDeathPainter.draw()` 不呼叫此類別；屬於零引用死碼（C5 刪除候選）。 |
| `engine/types/ragdoll.ts:2-4` | `║ [ARCH] RagdollBone 為佈娃娃系統的唯一資料契約 ║`<br>`║ 消費者：RagdollFactory（建立） / UnitDeathPainter（讀取）║` | `RagdollBone[]` 快照目前僅由 `RagdollFactory` 建立，供 `UnitDeathPainter.getKnockOffset` 讀取軀幹初速以推導擊飛。 |
| `engine/systems/unit/UnitSystem.ts:123` | `// [ARCH] 死亡單位使用 UnitDeathPainter 進行布娃娃物理繪製` | `UnitDeathPainter` 進行精靈死亡動畫、擊飛位移、停格與淡出沉降繪製，無布娃娃物理。 |
| `constants.ts:371` | `/** RagdollBone.color 佔位色。UnitDeathPainter 渲染時以 appearance profile.primaryColor 覆蓋（SSOT），此值僅滿足型別。*/` | 單位渲染全面改走 `SpriteUnitRenderer`，不再渲染幾何骨骼或以 primaryColor 覆蓋骨骼色；此值僅作佔位符以滿足型別契約。 |
| `engine/sprites.ts:13` | `║ UnitShatter → getUnitLayersFull ║` | `UnitShatter` 已改走輕量粒子，不再呼叫 `getUnitLayersFull`；`SpriteManager.getUnitLayersFull` 為零引用死碼。 |

---

### 1.2 單位外觀的過期描述

| 檔案:行號 | 現有寫法 | 應有事實 (SSOT) |
| :--- | :--- | :--- |
| `docs/ART_REPORT.md:86-88` | 表格列出 `TERRAIN_SKIN.enabled = false`、`UNIT_RENDER_MODE = 'procedural'`、`VFX_SPRITES.enabled = false` 作為逐像素回退開關。 | 舊的程序化單位／地形／粒子管線已移除，`UNIT_RENDER_MODE`、`TERRAIN_SKIN.enabled`、`VFX_SPRITES.enabled` 旗標已不存在。回退請使用 `git revert` 或 tag `art-ckpt-final`。 |
| `docs/archive/DECOUPLING_HANDOFF.md:485, 493` | 描述支援 `TERRAIN_SKIN.enabled` 總開關、`UNIT_RENDER_MODE: 'sprite' \| 'procedural'` 平滑切換。 | 舊程序化管線已在美術修正輪（commit `8c014d1`）切除，單位全面採用精靈圖集與貼圖地形。 |
| `docs/ART_PROGRESS.md:30, 56, 72, 86, 94, 122, 125` | 記錄了 `UNIT_RENDER_MODE`、`TERRAIN_SKIN.enabled`、`VFX_SPRITES.enabled` 等歷史開關。 | 歷史過程紀錄；將於 C4 歸檔至 `docs/archive/`。 |
| `README.md:142, 219, 224-226` (受保護) | 提及 `Faction Renderers + Painters`、`修改繪製方式、動畫 → 改 Faction Renderer`。 | `ImperialUnitRenderer` 與 `CovenantUnitRenderer` 已移除，單位由 `SpriteUnitRenderer` 統一繪製；Token 工廠（`ImperialTokenFactory`／`CovenantTokenFactory`）僅負責地面底座與職業圖示。 |

---

### 1.3 特效的過期描述

| 檔案:行號 | 現有寫法 | 應有事實 (SSOT) |
| :--- | :--- | :--- |
| `docs/archive/DECOUPLING_HANDOFF.md:234, 254` | 列為待辦/風險項：「僅剩 agentManager.ts:153 UnitShatter.spawn(engine.vfx…)」、「應改為事件（AGENT_DIED）由 renderer/VFX 訂閱」。 | 已在 T6.5 完成解耦，`AgentManager` 發送 `AGENT_DIED` 事件，由 `renderer.ts` 訂閱並觸發 `UnitShatter`。 |
| `docs/archive/VFX_INVENTORY.md:44` | 描述 `UnitShatter`「拆解角色 Base, Rim, Core, RoleIcon 畫布為 SPRITE 粒子，加 12~16 個水晶碎屑」。 | 舊的 Token 碎片噴射已移除，目前為 `DEATH_VFX` 的輕量塵煙、火花及陣營專屬靈魂飛升/血滴。 |
| `engine/sprites.ts:13` | `║ UnitShatter → getUnitLayersFull ║` | `UnitShatter` 不再請求圖層拆解。 |

---

### 1.4 AI Studio／金鑰的過期描述

| 檔案:行號 | 現有寫法 | 應有事實 (SSOT) |
| :--- | :--- | :--- |
| `docs/archive/DECOUPLING_HANDOFF.md:239-240, 314` | 列為「P0-1 API Key 會被打包進前端」嚴重風險，提及 `vite.config.ts` 的 `define`、`GEMINI_API_KEY`、`allowedHosts`、`ALLOW_ALL_HOSTS`。 | AI Studio 專用檔案（`.aistudio/`、`server.ts`、`metadata.json`、`.env.example`、`ALLOW_ALL_HOSTS`）已移除，`vite.config.ts` 不再讀取環境變數，GEMINI_API_KEY 打包風險已徹底消除。 |

---

### 1.5 失效路徑

使用 `tools/ui-e2e/out/check_paths.mjs` 掃描 25 個 Markdown 檔案（`docs/*.md`、`README.md`、`tools/**/*.md`、`CREDITS.md`），共檢測到 42 處失效引用，涉及 28 個獨特路徑：

1. **已歸檔至 `docs/archive/` 之文件**（12 個路徑）：
   - `docs/AUDIO_AGENT_PROMPT.md` (在 `docs/AUDIO_REPORT.md`)
   - `docs/AUDIO_PROGRESS.md` (在 `docs/AUDIO_REPORT.md`)
   - `docs/PERF_REPORT.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_AGENT_PROMPT.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_FINDINGS.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/UI_NIGHT_REPORT.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/UI_MERGE_CHECKLIST.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_REPORT_2.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_BASELINE_2.md` (在 `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_AGENT_PROMPT_3.md` (in `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_BASELINE_3.md` (in `docs/archive/DECOUPLING_HANDOFF.md`)
   - `docs/PERF_BASELINE_4.md` (in `docs/archive/DECOUPLING_HANDOFF.md`)
2. **重構後檔案路徑或副檔名變更**（4 個路徑）：
   - `engine/utils/rng.ts` → 現為 `engine/math/rng.ts`
   - `engine/types/Enums` → 現為 `engine/types/Enums.ts`
   - `components/ui/UnitInspectorHUD.tsx` → 已重構為視窗化 `components/ui/inspector/UnitInspectorBody.tsx`
   - `engine/components` → 舊歷史目錄，已不存在
3. **已清理之舊死碼檔案**（3 個路徑）：
   - `data/vfx/beam_visuals.ts` (在 `docs/archive/VFX_INVENTORY.md`)
   - `data/vfx/cast_visuals.ts` (在 `docs/archive/VFX_INVENTORY.md`)
   - `data/vfx/procedural_visuals.ts` (在 `docs/archive/VFX_INVENTORY.md`)
4. **臨時輸出檔通配符／未產生物件**（7 個路徑）：
   - `tools/ui-e2e/out/art_before_after_t1.png`
   - `tools/ui-e2e/out/art_before_after_` (前綴)
   - `tools/ui-e2e/out/art_before_after_terrain_` (前綴)
   - `tools/ui-e2e/out/glow_compare_` (前綴)
   - `tools/ui-e2e/out/glow_compare_battle_frozen_` (前綴)
   - `tools/ui-e2e/out/glow_crop_battle_frozen_` (前綴)
   - `docs/ART2_REPORT.md` (未產出的報告)
5. **Git 分支名與本輪目標報告**（2 個非檔案路徑）：
   - `docs/cleanup` (Git 分支名)
   - `docs/CLEANUP_REPORT.md` (本報告)

---

### 1.6 自稱完成但與事實不符 (`docs/ART2_PROGRESS.md`)

`docs/ART2_PROGRESS.md` 為先前於 AI Studio 容器執行時所產生，存在以下不符事實之陳述：
1. **宣稱 T4「切除舊程序化視覺管線」全綠完工**：實際執行時誤刪了 `ImperialTokenFactory` 與 `CovenantTokenFactory`，導致單位地面底座與職業圖示遺失，且 React StrictMode 下立即呼叫 `engine.destroy()` 導致畫面凍結。後續由主代理於本機在 commit `8c014d1` 修復還原。
2. **宣稱測試全綠、無驗證缺陷**：該環境無本機硬體加速與瀏覽器，未實際執行 E2E 視覺測試與保真度比較。
3. **宣稱產出對比圖 `tools/ui-e2e/out/art_before_after_t1.png`**：該檔案在磁碟上從未存在。
4. **指令指示 `git push origin main` 與 `git checkout main`**：違反不可直接操作或推送 `main` 之鐵律。

---

### 1.7 受保護檔案的過期處（列出供主代理後續維護，本輪不修改）

1. `docs/HANDOFF.md:27-29`：表格記錄 `fix/br-ghosts-idle` 執行中、`feat/death-vfx` 待審、`chore/drop-aistudio` 待合併；目前 `docs/cleanup` 分支已整合上述三者成果（`deathMotion.ts`、`BR_FIX_REPORT.md`、`.claude/agents/reviewer.md` 均已就緒）。
2. `docs/HANDOFF.md:35`：建議合併序列提及步驟 ④ 待跑文件整理輪，目前正在執行。
3. `README.md:40, 171`：提及 `components/ui/UnitInspectorHUD`，實際已重構為 `components/ui/inspector/UnitInspectorBody.tsx`。
4. `README.md:142, 219, 224-226`：提及 `Faction Renderers + Painters`、`修改繪製方式、動畫 → 改 Faction Renderer`，但舊人體繪製器已移除，目前單位由 `SpriteUnitRenderer` 統一繪製。
5. `README.md:9`：Cloud Run 演示連結（使用者指示保留 Docker/Cloud Run 相關章節）。

---

## 2. 任務執行紀錄

本輪清理共拆分為 C1～C6 任務，循序漸進並嚴格驗證：

| 任務 | Commit Hash | 一句話摘要 | 驗證結果與雜湊狀態 |
| :--- | :--- | :--- | :--- |
| **C1** | `709f25a` | `docs(cleanup): C1 inventory` | 建立全專案過期註解、過期描述、失效路徑與事實衝突盤點表。 |
| **C2** | `916bfbe` | `docs(cleanup): C2 fix stale comments` | 修正 6 個代碼檔案中的過期死亡/布娃娃註解，保持 build 雜湊不變（完全一致）。 |
| **C3** | `db87c4f` | `docs(cleanup): C3 fix stale docs` | 修正 5 個非受保護文件的事實與失效路徑，保持 build 雜湊不變（完全一致）。 |
| **C4** | `e757f15` | `docs(cleanup): C4 archive finished docs` | 將 5 個已完工的歷史 Prompt 與 Progress 文件歸檔至 `docs/archive/`，確認非受保護文件失效路徑歸零，雜湊不變。 |
| **C5** | `4500112` | `docs(cleanup): C5 remove zero-reference dead code` | 刪除零引用死碼 `RagdollPhysics.ts` 與 `SpriteManager.getUnitLayersFull`，更新 build 基準雜湊。 |
| **C6** | `87db957` (本報告) | `docs(cleanup): C6 report` | 補齊完整報告、執行全套 lint/test/build/perf 驗證，並建立本地標籤 `docs-cleanup-final`。 |

---

## 3. 修改檔案清單（四類歸納）

### 3.1 註解（Comments）
僅修改代碼註解，0 邏輯或型別異動：
- `engine/systems/agentManager.ts`：更新檔頭方框註解與 `updateDeathState` 中的死亡狀態註解（去除布娃娃物理/分解動畫描述）。
- `engine/systems/unit/RagdollFactory.ts`：更新檔頭與工廠函式註解，明確說明骨骼快照僅供初速推導。
- `engine/types/ragdoll.ts`：更新檔頭方框註解，釐清 `RagdollBone` 契約消費者與用途。
- `engine/systems/unit/UnitSystem.ts`：更新死亡處理註解（去除「布娃娃物理繪製」用詞）。
- `constants.ts`：更新 `RAGDOLL_BONE_PLACEHOLDER_COLOR` 註解，說明單位渲染改走 `SpriteUnitRenderer`。
- `engine/sprites.ts`：更新檔頭方框註解，標註 `UnitLayers` 無外部使用端。

### 3.2 文件事實（Docs）
- `docs/ART_REPORT.md`：
  - 更新「回退方式」為使用 `git revert` 或 tag `art-ckpt-final`。
  - 補充「後續變更」簡短小節，引用 `docs/archive/ART2_PROGRESS.md`、`docs/BR_FIX_REPORT.md`、`data/units/appearance/deathMotion.ts`。
  - 更新已歸檔文件路徑。
- `docs/AUDIO_REPORT.md`：修正對已歸檔音效 Prompt 與 Progress 文件的路徑引用。
- `docs/archive/DECOUPLING_HANDOFF.md`：
  - 修正 8 處已歸檔文件路徑（如 `docs/archive/PERF_REPORT.md` 等）。
  - 對已解決的歷史風險與待辦事項原處標注「（已解決：...）」，包含 `UnitShatter` 事件解耦與 API Key 移除。
- `docs/PERF_REPORT_3.md`：修正過時的 out 目錄產物描述，改為中立敘述。
- `docs/archive/VFX_INVENTORY.md`：
  - 移除已不存在的死碼視覺檔案路徑（`data/vfx/beam_visuals.ts` 等）。
  - 更新 `UnitShatter` 描述為現行輕量粒子與陣營死亡視覺。

### 3.3 歸檔（Archive via `git mv`）
下列已完成且無後續更新需求的文件已遷移至 `docs/archive/`：
- `docs/ART_AGENT_PROMPT.md` → `docs/archive/ART_AGENT_PROMPT.md`
- `docs/ART_AGENT_PROMPT_2.md` → `docs/archive/ART_AGENT_PROMPT_2.md`
- `docs/BR_FIX_AGENT_PROMPT.md` → `docs/archive/BR_FIX_AGENT_PROMPT.md`
- `docs/ART_PROGRESS.md` → `docs/archive/ART_PROGRESS.md`
- `docs/ART2_PROGRESS.md` → `docs/archive/ART2_PROGRESS.md`

*(註：`docs/ASSET_NEEDS.md` 經查閱尚有未完成之 P1/P2 資產需求，依合約刻意保留於 `docs/`)*

### 3.4 刪除死碼（Dead Code）
- `engine/systems/unit/RagdollPhysics.ts`：整檔刪除（`git rm`）。
- `engine/systems/unit.ts`：移除 `export * from './unit/RagdollPhysics';`。
- `engine/sprites.ts`：移除零引用方法 `getUnitLayersFull`、專用快取 `_fullLayerCache`、型別重導出 `export type { UnitAssetsFull }` 及未使用的 import。

---

## 4. 失效路徑修復統計

- **修復前**：全專案掃描 25 個 Markdown 檔案，共檢出 **42 處失效引用**（涉及 28 個獨特路徑）。
- **修復後**：
  - 非受保護活躍文件（`docs/ART_REPORT.md`、`docs/AUDIO_REPORT.md`、`docs/archive/DECOUPLING_HANDOFF.md`、`docs/PERF_REPORT_3.md`、`docs/archive/VFX_INVENTORY.md`）中的失效路徑已**全數修正，歸零（0 處）**。
  - 受保護檔案（`docs/HANDOFF.md`、`README.md`）與任務 Prompt 中的失效引用依合約規定不予修改，列於第 6 節供主代理處理。

---

## 5. C5 死碼刪除與跳過紀錄

### 5.1 刪除項目與 `git grep` 零引用證據

#### 項目 1：`RagdollPhysics`
- **證據**：執行 `git grep -i "RagdollPhysics"`，全專案僅在 `engine/systems/unit/RagdollPhysics.ts` 自身、`engine/systems/unit.ts` 的 barrel 導出、以及本報告與 prompt 內出現。
- **執行**：`git rm engine/systems/unit/RagdollPhysics.ts`，並在 `engine/systems/unit.ts` 移除對應 barrel 導出行。
- **驗證**：34 個測試檔案 306 項測試全部通過，`tsc --noEmit` 0 errors。

#### 項目 2：`SpriteManager.getUnitLayersFull`
- **證據**：執行 `git grep "getUnitLayersFull"`，除 `engine/sprites.ts` 定義處、本報告及 Prompt 外，代碼庫與測試中完全無任何呼叫端。
- **執行**：移除 `engine/sprites.ts` 內之 `getUnitLayersFull` 實作、`_fullLayerCache` 快取實例，以及 `export type { UnitAssetsFull }` 與 `UnitAssetsFull` 引用。
- **驗證**：生產 build 成功，JS bundle 縮減 140 位元組（`index-DEV10Pks.js`），全測試通過。

### 5.2 嚴格跳過／保留之項目與原因（遵守安全鐵律）

1. **`UnitFactory.generateLayers` / `CovenantTokenFactory.generateLayers` / `ImperialTokenFactory.generateLayers`**：
   - 雖然 `getUnitLayersFull` 曾呼叫 `UnitFactory.generateLayers`，但其屬於 Token 工廠架構的一部分，且契約明確規定：「*仍被 Token 工廠、底座、職業圖示使用的程式碼一律保留。有任何疑慮就跳過，寫進報告『建議主代理決定』。寧可不刪。*」為確保 Token 底座與職業圖示的架構完整性與安全，工廠內部代碼原樣保留。
2. **`SpriteManager.getUnitLayers` 與 `UnitLayers`**：
   - 目前雖無外部呼叫端，但非 Prompt 明確指示刪除之目標。依「寧可不刪」原則保留，建議主代理後續視需要決定。

---

## 6. 給主代理（Review Notes）

1. **受保護檔案待修正事項（主代理後續維護）**：
   - `docs/HANDOFF.md`：
     - 分支進度表格中的 `fix/br-ghosts-idle`、`feat/death-vfx`、`chore/drop-aistudio` 成果現均已合入 `docs/cleanup` 分支。
     - 建議主代理在審查並合併本分支後，將 `HANDOFF.md` 的工作流狀態更新為「文件整理完成」。
   - `README.md`：
     - 行 40, 171：`components/ui/UnitInspectorHUD` 建議更新為現行路徑 `components/ui/inspector/UnitInspectorBody.tsx`。
     - 行 142, 219, 224-226：`Faction Renderers` 建議更新為 `SpriteUnitRenderer` 統一繪製架構。
     - 行 9：Cloud Run 演示連結（使用者指示保留 Docker 部署相關內容）。
2. **刻意保留未歸檔檔案**：
   - `docs/ASSET_NEEDS.md`：該文件包含 3D 障礙物模型需求、FEMALE 體型擴充、高階技能 VFX 等未完成需求，仍具重要指引價值，因此刻意保留於 `docs/` 根目錄。
3. **Build 雜湊與零行為變更證明**：
   - C2～C4 期間，每次提交前後 `dist/assets` 產物檔名雜湊完全相同（`index-CoAVUfso.css`、`index-DAQU_MgE.js`），以二進制級別嚴格證明了文件與註解修改對執行行為 **0 變更**。
   - C5 依合約刪除死碼後，產物雜湊如預期更新（`index-DEV10Pks.js`），體積微幅縮減，全套測試與保真度檢查零差異通過。

---

## 7. 最終驗證結果

| 驗證項目 | 指令 | 結果 | 說明 |
| :--- | :--- | :--- | :--- |
| **TypeScript 型別檢查** | `npm run lint` | **PASS (0 errors)** | `tsc --noEmit` 通過 |
| **單元與整合測試** | `npm test` | **PASS (34/34 files, 306/306 tests)** | Vitest 全數通過 |
| **生產環境打包** | `npm run build` | **PASS** | Vite build 成功產出 `dist/` |
| **視覺與效能保真度** | `npm run perf:fidelity` | **PASS (0 diff)** | 6 個測試場景（VOID、FOREST、ICE、MAGMA、DESERT、battle_frozen）均完全符合嚴格像素門檻 |
| **工作樹狀態** | `git status` | **CLEAN** | 無未追蹤檔案，無未暫存修改 |

