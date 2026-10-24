# 全專案整理第一輪：清冊、檔頭盤點與異常重現報告（A0）

> **基準分支**：`feat/project-cleanup`  
> **起始提交 SHA**：`a86c1668aae6ddd23b243d54c1a8dbebe7d149c8`  
> **執行日期**：2026-10-24  
> **執行代理**：TACTICAL.OS 盤點與驗證代理（A0）  
> **交付物清單**：
> 1. `docs/PROJECT_CLEANUP_A0_REPORT.md`（本報告）
> 2. `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`（全庫 631 個追蹤檔案 + 9 個頂層未追蹤／工具項目清冊）
> 3. `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`（16 項核心問題、檔頭落後、廢碼與測試邊界台帳）
> 4. `tools/ui-e2e/out/cleanup-a0/`（本輪探針腳本與 live 驗證數據，經由 .gitignore 排除）

---

## 1. 環境與工作樹狀態（Git Baseline & Workspace Status）

在展開盤點與驗證前，已對工作樹與 Git 狀態進行嚴格查核：
- **目前分支**：`feat/project-cleanup`（符合指定唯一提交分支）。
- **當前 HEAD**：`a86c1668aae6ddd23b243d54c1a8dbebe7d149c8`（與任務提示詞指定之起始基底完全一致）。
- **產品代碼變更**：`0`（零 modified、零 deleted、零 staged 產品程式碼）。
- **未追蹤項目**：`.agents/`、`.codex/` 及其他提示詞文件為已知使用者工作內容，本輪嚴格遵守合約，不刪除、不收進 commit；所有探針輸出均置於 `tools/ui-e2e/out/cleanup-a0/`。

---

## 2. 執行摘要（Executive Summary）

本輪（A0）依據 `docs/PROJECT_CLEANUP_PLAN.md` 與任務提示詞，完成了對全代碼庫的深度盤點、靜態檔頭查核、廢碼引用溯源，以及關鍵功能疑點的 Live 瀏覽器環境重現：

1. **全庫檔案盤點**：
   - 納入 `git ls-files` 追蹤之全部 **631** 個檔案，分類為 14 個工程區域，逐一標註用途類別、入口／消費者、檔頭合規性、建議動作與查證依據。
   - 另補列 9 個頂層未追蹤／離線素材項目，總計產出 **640** 筆清冊記錄（收錄於 `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`）。
2. **檔頭與規範矛盾核對**：
   - 發現 5 項顯著的文件與檔頭陳舊問題（H01～H05），包含 `engine/core/Effects.ts` 檔頭宣稱 13 種狀態但實際已有 16 種；`engine/systems/agentManager.ts` 第 165 行遺留過期的死亡物理 TODO；以及 `docs/DECISIONS.md` 紀錄之平滑品質與目前 `constants/render.ts` 的 239Hz 低延遲 `low` 設定矛盾。
3. **廢碼與無效匯出排查**：
   - 確認 `FACTION_BEAM_RAMP`（C01, P3/D1）完全無引用，為真實多餘常數。
   - 確認 `engine/renderers/GlowSpriteCache.ts`（C02, P3/D2）生產代碼已無引用，僅有單一測試與探針使用，可規劃安全退役。
   - 確認 `TerrainSkinConfig.tintStrength`（C03, P3/D2）雖已標記 `@deprecated`，但受保護的快照與測試仍在保護，不宜貿然刪除。
   - 確認 `ragdoll` 仍由 `agentManager.ts` 建立並由 `UnitDeathPainter.ts` 繪製，**必須完整保留**。
   - 確認 `tools/vfx/fx-shot.mjs` 之 `sharp` 為可選依賴，腳本已具備動態 import 降級容錯，不需安裝套件。
4. **功能疑點 Live 重現**：
   - **F01 [P1/D3, 已重現]**：**證實施法者在施法期間死亡時，演出隊列（Visual Sequence）未被取消，產生「人死技發」的幽靈特效**。施法者死亡後，數值傷害為 0，但 5 個排程特效依然在地面炸開；對照硬控中斷則能正確取消。此為本專案目前發現之最高風險演出缺陷。
   - **F02 [P2/D2, 已重現]**：地面鎖定 AOE 技能符合 FFT 原作設計（鎖定地面 Hex，傷害受體以結算時踩在該 Hex 之單位為準）；但單體鎖定技能在演出端（`SequenceSystem`）快照了起始座標，目標移動後演出仍打在舊位置，造成視效與數值不一致。
   - **F03 [P2/D2, 已重現]**：`UICommandSystem` 對 `UPDATE_SKILL` 僅做白名單與 `isFinite` 檢查，負數範圍與冷卻可被注入；且在 UI 清空數值時會因 `parseFloat("") === NaN` 被靜默捨棄，導致使用者無法在介面上清空數值。

---

## 3. 驗證與日誌查證總覽（Verification Log Index）

本輪查核充分運用既有驗證基底，並補足缺失之即時檢驗：

| 項目 | 狀態 | 執行指令／引用來源 | 觀測結果摘要 |
| :--- | :--- | :--- | :--- |
| **Lint** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-lint-1024.log` | `npm run lint`，0 errors，0 warnings。 |
| **Tests** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-test-native-1024.log` | 89 檔測試、707 個測試項目全數通過（含 EffectFieldsRatchet, LayerBoundary, DocDrift）。 |
| **Build** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-build-1024.log` | `npm run build`，Vite 生產打包成功，產物完整。 |
| **Perf Guard** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-guard-native-1024.log` | 6 大渲染場景保真度比對 0 diff，FPS 守門全數達標。 |
| **Knip 審查** | 沿用分析 | `tools/ui-e2e/out/agent-logs/audit-knip-1024.log` | 18 個未用變數／17 個未用型別；138 處 unresolved imports 為 Playwright 瀏覽器根路徑特性。 |
| **Smoke** | **本輪實跑** | `node tools/ui-e2e/runtime-smoke.mjs --shot` (`a0-smoke`) | Exit 0，0 page errors，引擎與 Canvas 正常推進，截圖存檔。 |
| **Verify Coords** | **本輪實跑** | `npm run verify:coords` (`a0-coords`) | Exit 0，浮點數座標合約通過，oscEvents 在基準範圍內，產出 `coord_guard.json`。 |
| **UI E2E** | **本輪實跑** | `npm run e2e:ui` (`a0-ui`) | Exit 0，34 個視窗／檢查器／主題端對端測試全部通過，0 樣式漂移。 |
| **異常探針 F01~F03** | **本輪實跑** | `node tools/ui-e2e/out/cleanup-a0/repro_probe.mjs` (`a0-repro`) | Exit 0，即時 Headless Chromium 探針捕獲全域數據，輸出 `repro_results.json`。 |
| **DocDrift** | **本輪實跑** | `npx vitest run tests/DocDrift.test.ts` | 3/3 測試通過，確認現有文件與路徑無任何失效連結。 |

---

## 4. 三大核心疑點深度重現與依賴分析（F01, F02, F03）

所有探針皆在獨立的 Chromium 瀏覽器環境下直接驅動 `TacticalGameApp`，呼叫實際系統管線，完全無 mock、無假造事件。

### 4.1 F01：施法中施法者死亡 vs 硬控中斷 vs 投射物空中狀態 [P1 / D3, 已重現]

#### (1) 機理根因剖析
- **代碼位置**：`engine/systems/combat/CastingEngine.ts:46-49`
  ```typescript
  if (a.hp <= 0) {
      this.resetCaster(a);
      return;
  }
  ```
  當施法者 HP 歸零時，`CastingEngine` 僅呼叫 `resetCaster` 重置施法狀態（清空 `casterId`、`castTimer`、`castingSkillId`），**完全沒有向事件匯流排（EventBus）發送 `CAST_BREAK` 事件**！
- **表現層斷層**：`engine/presentation/VisualSystem.ts:69-72`
  ```typescript
  this.bus.on('CAST_BREAK', (event) => {
      const e = event as { casterId: string };
      this.renderer.cancelSkillSequences(e.casterId);
  });
  ```
  表現層僅依賴 `CAST_BREAK` 來取消對應施法者的特效排程（`SequenceSystem.actionQueue`）。因為施法者死亡時沒有發送 `CAST_BREAK`，導致排程在隊列中的所有後續動作（地面法陣脈衝、畫面震動、衝擊波特效）仍然會按照時間軸在場上炸裂！

#### (2) 探針實跑數據對照（Live Chromium Probe）
- **情境 A（正常施法完畢）**：
  - 技能：`mb_u1`（隕石爆裂，詠唱 1.0 秒）。
  - 詠唱至 1.0 秒完成，觸發 `CAST_COMPLETE`，施放傷害 68 點，目標 HP 由 200 降至 132。
- **情境 B（詠唱 40% 時遭遇 Stun 硬控中斷）**：
  - 在 t=0.4 秒對施法者施加暈眩效果。
  - `StatusSystem` 觸發中斷，`CastingEngine` 發出 `CAST_BREAK`。
  - 表現層 `VisualSystem` 收到事件，呼叫 `cancelSkillSequences`。
  - 探針數據：`sequenceQueueLengthAfterBreak: 0`。隊列中原本排程的 5 個動作立即被全數清空，施法者存活且場上無任何後續幽靈特效。
- **情境 C（詠唱 40% 時施法者死亡）——【異常確定】**：
  - 在 t=0.4 秒使施法者 HP 降為 0。
  - `CastingEngine` 重置了 caster，但未發出 `CAST_BREAK`。
  - 探針數據：
    - 死亡瞬間隊列殘留動作數：`sequenceQueueLengthAtDeath: 5`（包含 `PARTICLE`, `GRID_PULSE`, `SHAKE`, `PARTICLE`, `ULT_IMPACT`）。
    - 推進時間至原定命中時刻之後（t=0.7s 與 t=1.0s）：`actionsDispatchedAfterDeath: 5`！全部 5 個特效動作依然在目標地面上依次播放。
    - 數值端：傷害結算未發生（目標 HP 保持 200，無跳字）。
    - **結論**：施法者已死，屍體躺在地上，但毀滅性的大絕法陣與地震演出依然在敵陣炸開，造成嚴重的視效邏輯混亂！
- **情境 D（投射物在空中時施法者死亡）——【合法物理餘波】**：
  - 施法者完成射擊，投射物（`Projectile`）已在空中飛行，此時殺死施法者。
  - 探針數據：`projectileHitOccurred: true`，投射物依慣性正常飛抵目標並命中，目標扣血 68 點。
  - **結論**：投射物為獨立物理實體，施法者死亡不應影響飛行中的子彈，此為正確設計，修復 F01 時必須小心保護，不可將 Projectile 連帶清空。

#### (3) 建議最小修復方案與依賴鏈（D3 依賴風險）
- **修改位置**：`engine/systems/combat/CastingEngine.ts` 與 `engine/presentation/VisualSystem.ts`。
- **方案**：
  1. 在 `CastingEngine.tick` 的 `a.hp <= 0` 分支，補發 `this.bus.emit('CAST_BREAK', ...)` 或專門的 `CASTER_DEATH_BREAK` 事件。
  2. 確保 `SequenceSystem.cancelSkillSequences` 只清理該 `casterId` 的序列動作，不得誤傷已生成的 `Projectile` 實體。
  3. 注意不可在 `agentManager` 死亡流程中直接跨層操作 `renderer`，必須嚴守 EventBus 邊界。

---

### 4.2 F02：詠唱期間目標移動（鎖點 vs 鎖人演算法）[P2 / D2, 已重現]

#### (1) 機理根因剖析
- 技能資料庫中將技能分為地面範圍（AOE）與單體鎖定。
- **地面 AOE 技能（如 `mb_a1`, `mb_a4`）**：
  - 詠唱鎖定的是目標 Hex 座標（`targetHex`）。
  - 命中結算時，系統重新掃描該 Hex 及周圍範圍內的實體進行傷害計算。若目標在詠唱期間移動離開該範圍，目標即不會受到傷害。這完全符合 FFT（Final Fantasy Tactics）傳統戰術戰棋之核心設計。
- **單體鎖定技能**：
  - 數值端（`CastingEngine`）：鎖定的是目標 `Agent` 參考，結算時必定命中目標現在的位置。
  - 表現層（`SequenceSystem`）：在 `CAST_START` 觸發時，以事件傳入的 `targetX`, `targetY` 作為 Action 的靜態座標。若目標在詠唱期間移動，演出仍播放於目標原本站立的 Hex。

#### (2) 探針實跑數據
- 探針在目標移動 2 格後觸發命中：數值端傷害如實扣除；但表現層衝擊波與打擊火花留在目標移動前的起點 Hex。
- **結論**：屬於表現層取樣座標未隨目標實體動態追蹤的不一致。建議在後續輪次中，將需要鎖人的 Sequence Action 增加 `targetAgentId` 動態座標解析支援。

---

### 4.3 F03：技能資料庫 UPDATE_SKILL 邊界輸入防禦 [P2 / D2, 已重現]

#### (1) 機理根因剖析
- 檢視 `engine/systems/ui/UICommandSystem.ts:109-128` 之 `UPDATE_SKILL` 命令處理：
  ```typescript
  case 'UPDATE_SKILL': {
      const { skillId, updates } = command.payload;
      const skill = this.engine.skillDB.find(s => s.id === skillId);
      if (!skill || !updates) break;
      for (const [k, v] of Object.entries(updates)) {
          if (!ALLOWED_FIELDS.has(k)) continue;
          if (typeof v === 'number' && !Number.isFinite(v)) continue;
          (skill as Record<string, unknown>)[k] = v;
      }
      break;
  }
  ```
  系統僅做了 `ALLOWED_FIELDS` 白名單與 `Number.isFinite` 檢查。

#### (2) 探針實跑數據
1. **負值注入**：注入 `range: -5`, `cast: -2`, `cd: -1`，全數成功寫入 `skillDB`，無任何防禦報錯。
2. **UI 清空行為**：在 `components/inspector/tabs/SkillDbTab.tsx` 中，數值欄位使用 `<input type="number">`，當使用者試圖反白退格清空輸入框時，React 收到 `""`，`parseFloat("")` 結果為 `NaN`，被 `Number.isFinite` 靜默過濾，導致使用者在 UI 上無法將數值重設為預設或清空。
3. **治療技能相容性**：`power` 欄位在專案設計中允許負數（代表治療，如白魔法），因此不可粗暴地對所有數值欄位設定 `>= 0` 的限制。

#### (3) 建議最小修復方案
- 在後續輪次中，為 `UPDATE_SKILL` 建立欄位層級的防禦 Schema：
  - `range`、`cast`、`cd`、`cost`：必須為 `>= 0` 的有限數值。
  - `power`：允許負數（治療），但須限制合理區間（例如 `[-9999, 9999]`）。
  - 對空字串提供退化預設值（例如 `0`），避免 UI 無法編輯。

---

## 5. 全庫目錄清冊與統計分析（Inventory & Header Audit）

完整檔案逐一盤點記錄於 `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`。母表為 `git ls-files` 輸出的 631 個追蹤檔案，涵蓋 14 個主要區域：

| 區域目錄 | 檔案數 | 核心職責 | 檔頭合規現況 | 主要問題與建議處置 |
| :--- | :---: | :--- | :--- | :--- |
| **`根目錄設定`** | 12 | 專案建置、套件管理、排版與型別設定 | 不適用方框檔頭 | 全部正常保留；knip 警告分類為工具特性。 |
| **`engine/core/`** | 7 | Agent 資料實體、狀態槽、擁有權與檢視指令 | 全部具備標準方框檔頭 | `Effects.ts` 檔頭描述落後（寫 13 種，實有 16 種，H01）。 |
| **`engine/systems/`** | 22 | 核心模擬管線（戰鬥、移動、AI、區域、音訊） | 全部具備標準方框檔頭 | `agentManager.ts` 第 165 行遺留過期死亡物理 TODO（H02）。 |
| **`engine/presentation/`** | 15 | 視覺呈現、特效排程、鏡頭導演、HUD 投影 | 全部具備標準方框檔頭 | 全部合規；注意 F01 之序列清理邏輯。 |
| **`engine/renderers/`** | 33 | Canvas 2D 渲染層、圖層管線、地塊與單位繪製 | 全部具備標準方框檔頭 | `GlowSpriteCache.ts` 無生產引用，可評估退役（C02）。 |
| **`engine/graphics/`** | 16 | 程序化材質、NoiseLib、粒子外觀 | 全部具備標準方框檔頭 | 全部合規，嚴守純 2D 零 WebGL 規範。 |
| **`engine/math/`** | 7 | 座標轉換、VisualMath、指標射線投影 | 全部具備標準方框檔頭 | 全部合規，與 `RenderSpec.ts` 座標合約一致。 |
| **`engine/ai/`** | 10 | 行為樹節點、目標選擇、A* 尋路 | 全部具備標準方框檔頭 | 全部合規，嚴格純函式決策。 |
| **`components/`** | 38 | React HUD、檢查器、地圖編輯器、技能編輯器 | 具備檔頭或 UI 說明註解 | 全部合規，嚴守透過 UICommandSystem 與引擎通訊。 |
| **`constants/`** | 12 | 領域常數 SSOT，單一來源規範 | 具備常數檔頭 | `terrain.ts` 中 `tintStrength` 已廢棄但受保護（C03）。 |
| **`data/`** | 35 | 技能庫、單位外觀、音效、AI 配置資料檔 | 具備資料檔頭 | `beam_styles.ts` 之 `FACTION_BEAM_RAMP` 無用（C01）。 |
| **`tests/`** | 89 | 單元測試、守門測試、效能回歸比對 | 具備測試職責檔頭 | `DocDrift.test.ts` 具邊界限制（T01）。 |
| **`tools/`** | 89 | 預覽工具、E2E 測試、效能守門、腳本 | 具備工具說明 | knip unresolved imports 為工具環境特性（K01, K02）。 |
| **`docs/`** | 25 | 架構手冊、決策紀錄、規範文件 | Markdown 標題規範 | 存在多處決策與現況落後（H03, H04, H05）。 |
| **`public/assets/`** | 221 | Sprite Atlas、地塊材質、音效、粒子圖片 | 二進位資產（無檔頭） | 經由程式與 manifest 動態載入，全數保留。 |

---

## 6. 廢碼與刪除候選台帳（Findings & Candidates Ledger）

詳細台帳已收錄於 `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`，此處列出關鍵問題與處置結論：

### 6.1 確定可刪除／可收縮項目（Safe Deletion & Scope Candidates）
- **C01 [P3 / D1] `FACTION_BEAM_RAMP`**：
  - 位置：`data/vfx/beam_styles.ts:42`
  - 證據：全庫僅見宣告，生產端均改用 `FACTION_BEAM_RAMP_ID`。
  - 建議處置：於後續 A2 輪次安全移除。
- **C04 [P3 / D1] 僅內部使用卻被 `export` 的常數與函式**：
  - 位置：`engine/core/Effects.ts` (`createEffectSlot`), `engine/math/ClimbRule.ts` (`getJumpLimit`), `engine/renderers/grid/TerrainLoopAtlas.ts` (`FactionTextureStore`) 等。
  - 證據：無外部模組引用其 export。
  - 建議處置：於後續 A2 輪次移除 export 關鍵字，退回模組內部私有，收縮公用 API 表面積。

### 6.2 建議保留／不可貿然刪除項目（Must Retain & Protected）
- **`ragdoll`（布娃娃物理實體）**：
  - 雖然 knip 可能提示部分屬性未完全讀取，但靜態與動態檢驗證實：`Agent` 實體持有 `ragdoll`，`agentManager.ts` 在單位死亡時初始化其速度與旋轉，`UnitDeathPainter.ts:22` 於每幀讀取並繪製死亡拋飛動畫。**絕對必須保留**。
- **C02 [P3 / D2] `engine/renderers/GlowSpriteCache.ts`**：
  - 生產端繪製管線已全面升級為程序化材質（MaterialPainter），生產代碼已無任何直接匯入；但 `tests/GlowSpriteCache.test.ts` 與工具腳本仍在使用。不宜直接刪除，應於 A2 評估將測試退役或轉換。
- **C03 [P3 / D2] `TerrainSkinConfig.tintStrength`**：
  - 雖然在 `constants/terrain.ts` 中標記為 `@deprecated`，但受保護的快照檔案 `tests/constants-snapshot.json` 與 `tests/TerrainSkin.test.ts` 均包含該欄位斷言。在未獲得主代理授權更新常數快照前，**禁止直接刪除**。
- **K02 [P3 / D0] `tools/vfx/fx-shot.mjs:151` 中的 `sharp`**：
  - 程式碼已採用 `import('sharp').catch(() => ({ default: null }))` 優雅降級；在缺少 sharp 時工具依然能正常生成單幀未裁切截圖。此為可選開發輔助工具，**禁止執行 `npm install sharp`**。

---

## 7. 後續整理輪次建議與精確檔案範圍（Next Steps Plan）

本輪（A0）已完成所有調查、清冊編制與異常重現，未改動任何一行產品代碼。建議主代理將後續整理工作切分為三個精確輪次展開：

### 建議輪次 A1：文件、規範與檔頭同步（Zero Product Risk, D0）
- **目標**：修復所有文字、註解、檔頭與決策紀錄的不一致，使全庫文件重回 100% 正確狀態。
- **建議修改範圍**：
  1. `engine/core/Effects.ts`（更新檔頭：13 種 -> 16 種狀態）。
  2. `engine/systems/agentManager.ts`（移除過期的死亡物理 TODO 註解）。
  3. `docs/DECISIONS.md`（修正平滑品質歷史記錄，註記已於 commit `c08bcd3` 統一為 `low` 以確保 239Hz）。
  4. `tests/DocDrift.test.ts`（在檔頭明確記錄測試邊界與驗證能力限制）。
- **驗證方式**：`npm run lint && npm test && npx vitest run tests/DocDrift.test.ts`。

### 建議輪次 A2：低風險多餘匯出與廢碼收縮（Low Risk, D1）
- **目標**：清理確定無引用的常數與過度暴露的 export 關鍵字。
- **建議修改範圍**：
  1. `data/vfx/beam_styles.ts`（刪除無用的 `FACTION_BEAM_RAMP`）。
  2. `engine/core/Effects.ts`、`engine/math/ClimbRule.ts`、`engine/renderers/grid/TerrainLoopAtlas.ts`（移除未使用的 export 關鍵字）。
- **驗證方式**：`npm run lint && npm test && npm run build`。

### 建議輪次 A3：核心異常修復與邊界防禦（Functional Fixes, D2～D3）
- **目標**：修復經本輪實跑證實的 F01、F02、F03 異常。
- **建議修改範圍**：
  1. `engine/systems/combat/CastingEngine.ts` & `engine/presentation/VisualSystem.ts`（修復施法者死亡時幽靈特效問題，確保發送取消事件，同時保護飛行的投射物）。
  2. `engine/systems/ui/UICommandSystem.ts`（為 `UPDATE_SKILL` 加入邊界檢查，保護數值下限並支援 UI 清空操作）。
  3. `engine/presentation/visuals/SequenceSystem.ts`（評估鎖人技能之動態座標追蹤）。
- **驗證方式**：執行 `runtime-smoke`、`e2e:ui`、`verify:coords` 以及本輪建立之 `repro_probe.mjs`，確認幽靈特效完全消除且投射物飛行正常。

---

## 8. 結論與交回主代理（Handback）

本輪（A0）工作已完全達成：
- 全庫 631 個追蹤檔案清冊完整交付於 `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`。
- 16 項問題台帳與依賴鏈收錄於 `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`。
- 3 大功能疑點皆在真實瀏覽器管線中完成 live 觀測與數據取證，明確定位了 **F01（施法者死亡幽靈特效, P1/D3）** 為專案當前最高風險表現缺陷。
- 全程保持零產品代碼異動。工作正式交回主代理審查。
