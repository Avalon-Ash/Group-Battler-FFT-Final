# 全專案整理第一輪：清冊、檔頭盤點與異常重現報告（A0-R1 證據補正版）

> **基準分支**：`feat/project-cleanup`  
> **起始提交 SHA**：`a86c1668aae6ddd23b243d54c1a8dbebe7d149c8`  
> **A0-R1 起始 HEAD**：`5d99130e5e1698e956c69ae3c2138798376d8ded`  
> **執行日期**：2026-10-24  
> **執行代理**：TACTICAL.OS 盤點與驗證代理（A0-R1）  
> **交付物清單**：
> 1. `docs/PROJECT_CLEANUP_A0_REPORT.md`（本報告，修正 R01～R05 審查意見）
> 2. `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`（全庫母表追蹤檔案 + 頂層未追蹤／工具項目清冊）
> 3. `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`（17 項核心問題、檔頭落後、廢碼、座標診斷與測試邊界台帳）
> 4. `docs/PROJECT_CLEANUP_A0_EVIDENCE.json`（精簡、機器可讀的原始觀測、判定、基底與覆蓋摘要）
> 5. `tools/ui-e2e/cleanup-a0-repro.mjs`（已持久化之獨立可重現活體探針工具）
> 6. `tools/audit/cleanup-a0-inventory.mjs`（清冊生成與覆蓋分析工具）
> 7. `tools/ui-e2e/out/cleanup-a0-r1/`（本機臨時輸出、座標帶 assert 日誌與原始探針數據）

---

## 1. 環境與工作樹狀態（Git Baseline & Workspace Status）

本輪（A0-R1）為依據主代理審查意見（`docs/PROJECT_CLEANUP_A0_REVIEW.md`）展開之證據補正輪次，開工時已查核工作樹狀態：
- **目前分支**：`feat/project-cleanup`（符合指定唯一提交分支）。
- **起始 HEAD**：`5d99130e5e1698e956c69ae3c2138798376d8ded`（A0 提交節點）。
- **產品代碼變更**：`0`（零 modified、零 deleted、零 staged 產品程式碼，零 package/lockfile 異動）。
- **未追蹤項目**：`.agents/`、`.codex/` 及其他提示詞文件均保持原樣，不納入提交。

---

## 2. 執行摘要與審查退回修正聲明（Executive Summary）

A0 原始提交經主代理審查退回（見 `docs/PROJECT_CLEANUP_A0_REVIEW.md`，R01～R05），本輪進行了徹底的證據糾正與實證補完：

1. **撤回「全庫深度查證完成」宣告**：
   - 承認 A0 原始清冊將全部檔案預設標為「已查證」屬於過度宣告。本輪明確將查證狀態拆分為「已深度查證」（64 個核心模擬、表現、UI 與候選檔案）與「僅列舉／待查」（430 個其餘程式碼檔案及 149 個二進位／文件項目），詳細標明未查原因。**A0 整體狀態保持未完成，交由後續有界批次展開**。
2. **座標守門測試重新定性（R01）**：
   - 糾正原先「座標檢查通過無異常」的誤報。查證確認 `npm run verify:coords` 因未帶 `--assert` 旗標，exit 0 僅代表工具執行完畢；實際日誌中存在 1 次下陷、1 次 over-void、102 次排序震盪（含 13 次微幅位移 <= 2px）。
   - 本輪以 `node tools/ui-e2e/coord-guard.mjs --assert` 實跑，確認**以 EXIT=1 退出**。新增專屬台帳 `COORD01`（P2/D3 待確認），定性為取樣診斷異常，與畫面 bug 分開記錄。
3. **F02 技能選取與數據糾正（R02）**：
   - 撤回舊結論。查明 `wb_a1`（旋光劍舞）實為自身中心 AOE，`mb_a3`（易位術）實為單體突進，兩者不能支撐原比較。
   - 本輪重新選用真實技能：地面 AOE 採用 `mb_u1`（奧術漩渦，AOE 半徑 3），單體技能採用 `mb_a2`（冰封禁錮，SINGLE）。使用 `teleportTo` 確保空間索引一致後，實測證實：地面 AOE 移出者受傷 0、移入者受傷 365（數值嚴格鎖地）；單體技能數值命中新座標（受傷 165），但視覺序列目標點留在原座標（x=144, y=41.56）未追隨。
4. **F03 分離 API 漏洞與真實 UI 操作（R03）**：
   - 撤回「UI 清空失敗已重現」之過度推論。
   - 分開呈現：API 層確有負數與非法 enum 直通之防禦缺口；UI Inspector DOM 實測確認 enum 由 `<select>` 元件保護，但數字輸入框在清空為 `""` 時解析為 `NaN`，被 `Number.isFinite` 擋下導致即時 snapback。
5. **代碼引述核對與數據真確化（R05）**：
   - 刪除所有不存在之偽原碼，替換為 `VisualSystem.flush` 與 `sequences.cancel(event.sourceId, vfx)` 等實際代碼。
   - 修正數據：`mb_u1` 為「奧術漩渦」，正常施法完成目標 HP 2000 -> 1452，傷害 548 點，事件包含 `CAST_START` 與 `CAST_FINISH`。
   - 澄清 perf guard 保真度：6 場景 meanAbsDiff 介於 0.154～0.651，是在允許門檻內通過，非 0 diff。
   - 探針代碼正式持久化於 `tools/ui-e2e/cleanup-a0-repro.mjs`，乾淨 checkout 可完整復現。

---

## 3. 驗證與日誌查證總覽（Verification Log Index）

| 項目 | 狀態 | 執行指令／引用來源 | 觀測結果摘要 |
| :--- | :--- | :--- | :--- |
| **Lint** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-lint-1024.log` | `npm run lint`，0 errors，0 warnings。 |
| **Unit Tests** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-test-native-1024.log` | 89 檔測試、707 個測試項目全數通過。 |
| **Build** | 沿用通過 | `tools/ui-e2e/out/agent-logs/status-build-1024.log` | Vite 生產打包成功，產物完整。 |
| **Perf Guard** | 沿用通過 (門檻內) | `tools/ui-e2e/out/agent-logs/status-guard-native-1024.log` | 6 場景 meanAbsDiff 0.154～0.651，門檻內通過（非 0 diff）。 |
| **Knip 審查** | 沿用分析 | `tools/ui-e2e/out/agent-logs/audit-knip-1024.log` | 138 處 unresolved imports 為 Playwright 瀏覽器根路徑特性。 |
| **Smoke** | 沿用通過 | `tools/ui-e2e/out/agent-logs/a0-smoke.log` | 0 page errors，引擎推進正常。 |
| **UI E2E** | 沿用通過 | `tools/ui-e2e/out/agent-logs/a0-ui.log` | 34 個視窗／檢查器端對端測試通過，0 樣式漂移。 |
| **Coords Guard (--assert)** | **本輪實跑 (失敗)** | `node tools/ui-e2e/coord-guard.mjs --assert` (`a0r1-coords`) | **EXIT=1**，sink 1 次、void 1 次、flicker 102 次，記錄於 `coord_guard_assert.log`。 |
| **異常探針 F01~F03** | **本輪實跑通過** | `node tools/ui-e2e/cleanup-a0-repro.mjs` (`a0r1-probe5`) | **EXIT=0**，全情境數據保存於 `repro_results.json` 與 `PROJECT_CLEANUP_A0_EVIDENCE.json`。 |
| **DocDrift** | **本輪實跑通過** | `npx vitest run tests/DocDrift.test.ts` | 3/3 測試通過，無任何失效檔案路徑。 |

---

## 4. 三大核心疑點與座標異常深度重現與依賴分析

所有探針皆在獨立的 Chromium 瀏覽器環境下直接驅動 `TacticalGameApp`，呼叫實際系統管線，腳本持久化於 `tools/ui-e2e/cleanup-a0-repro.mjs`。

### 4.1 F01：施法中施法者死亡 vs 硬控中斷 vs 投射物空中狀態 [P1 / D3, 已重現]

#### (1) 真實代碼根因剖析（核對無訛）
- **代碼位置**：`engine/systems/combat/CastingEngine.ts:46-49`
  ```typescript
  public handleInterruption(a: Agent, engine: BreakCastContext) {
      if (a.hp <= 0) {
          this.resetCaster(a);
          return;
      }
      // ...
      engine.events.push({ 
          type: 'CAST_BREAK', 
          pos: unitEventPos(a, engine), 
          value: progressPct,
          // ...
      });
  }
  ```
  當 `a.hp <= 0` 時，系統呼叫 `this.resetCaster(a)` 即直接 return，**完全沒有將 `CAST_BREAK` 推入 `engine.events`**。
- **表現層斷層**：`engine/presentation/VisualSystem.ts:69-72`
  ```typescript
  if (event.type === 'CAST_BREAK' && event.sourceId) {
      sequences.cancel(event.sourceId, vfx);
  }
  ```
  表現層僅在收到 `CAST_BREAK` 時呼叫 `sequences.cancel(event.sourceId, vfx)`。因無此事件，`SequenceSystem.actionQueue` 中的排程動作未被清理。

#### (2) 探針實跑數據對照（Live Chromium Probe 實測結果）
- **情境 A（正常施法完畢）**：
  - 技能：`mb_u1`（奧術漩渦，詠唱 1.0 秒，AOE，power: 430）。
  - 正常引導至 1.0 秒，事件記錄 `CAST_START` 與 `CAST_FINISH`。目標 HP 2000 -> 1452，傷害 548 點。
- **情境 B（硬控中斷，暈眩 Stun）**：
  - 詠唱至 40% 時施加 STUN，隊列原為 5 個動作。
  - 下一幀 `handleInterruption` 觸發，發出 `CAST_BREAK`。
  - 探針數據：`queueSizeAfterStun: 0`，隊列被立即清空，場上無殘留動作派發，傷害為 0，施法者存活。
- **情境 C1（狀態注入 hp=0 致死，重複 2 次 Run）**：
  - 詠唱至 40% 時直接將 `caster.hp` 設為 0。
  - 探針數據：兩次 Run 均得出 `hadCastBreak: false`、`queueAtDeath: 5`、`actionsDispatchedAfterDeath: 5`、`damageDealt: 0`。
- **情境 C2（經自然戰鬥傷害 applyDirectDamage 致死，重複 2 次 Run）**：
  - 詠唱至 40% 時透過 `applyDirectDamage(caster, 2000, true, target.id)` 造成致命傷害，HP 經戰鬥系統扣至 0。
  - 下一幀 `CastingEngine.updateCasting` 偵測到 `isHardCC` 呼叫中斷。
  - 探針數據：兩次 Run 均得出 `hadCastBreak: false`、`queueAtDeath: 5`、`actionsDispatchedAfterDeath: 5`、`damageDealt: 0`。
  - **結論**：證實無論是直接修改狀態或透過正常戰鬥傷害致死，均 100% 觸發「人死技發、幽靈特效在死後地面炸開」之演出缺陷。
- **情境 E（詠唱中重置 AGENT_RESET）**：
  - 詠唱至 40% 時觸發 `REBUILD_AGENT_AI`（發出 `AGENT_RESET`）。
  - 探針數據：`queueBeforeReset: 5`，`queueAfterReset: 5`（`clearedByAgentReset: false`）。證實 `AGENT_RESET` 同樣未被 SequenceSystem 監聽清理。
- **情境 D（投射物在空中時施法者死亡）——【合法物理餘波】**：
  - 使用 `rb_a1`（霜寒法球，詠唱 0.6 秒，彈道速度 900）。
  - 施法完成產生真實 `Projectile`（`projectilesSpawned: 1`），在彈道飛行途中使施法者死亡。
  - 探針數據：`projectileHitOccurred: true`，投射物繼續飛行並命中目標，造成 102 點傷害（目標 HP 2000 -> 1898）。
  - **結論**：已發射之投射物屬於獨立物理實體，施法者死亡不應影響飛行中的子彈，修復 F01 時必須小心保護。

---

### 4.2 F02：詠唱期間目標移動（鎖點 vs 鎖人演算法）[P2 / D2, 已重現]

#### (1) 機理根因剖析
- **地面 AOE 技能（如 `mb_u1`）**：
  - `SkillExecutor.ts:77` 透過 `impactCells.forEach(cell => { const u = engine.getAgentAt(cell.q, cell.r); })` 掃描地塊上的單位。
  - 數值端完全以命中瞬間誰踩在該 Hex 範圍內結算傷害。
- **單體鎖定技能（如 `mb_a2`）**：
  - 數值端：`SkillExecutor.ts:92` 讀取 `source.target`，命中時依 target 實體結算，單位移走依然受傷。
  - 表現層：`VisualSystem.ts:51` 在收到 `CAST_START` 時透過 `VisualMath.resolveTargetPoint` 計算靜態 `Point3D`，並以該靜態點傳給 `sequences.run(...)`。在 `SequenceSystem.ts:120` 中該點存入 `item.target`，更新時不隨目標單位移動而重算。

#### (2) 探針實跑數據（經 teleportTo 同步空間索引）
1. **地面 AOE 測試（`mb_u1`，半徑 3）**：
   - 起始狀態：Target 1 在中心 (2, 0)，Target 2 在範圍外 (6, 0)。
   - 詠唱至 50% 時以 `teleportTo` 對調位置：Target 1 移至 (6, 0)，Target 2 移至 (2, 0)。
   - 命中結算：
     - Target 1（移出者）：`target1Damage: 0`（`target1Escaped: true`）。
     - Target 2（移入者）：`target2Damage: 365`（`target2Hit: true`）。
     - **結論**：地面 AOE 數值設計嚴格鎖定地面，完全符合預期。
2. **單體技能測試（`mb_a2`，SINGLE）**：
   - 起始狀態：Target 1 在 (2, 0)，像素座標 (144, 41.56)。
   - 序列採樣：`sequenceTargetPointAtStart` 為 `{ x: 144, y: 41.56, z: 29.5 }`。
   - 詠唱至 50% 時 Target 1 移動至 (4, 0)，像素座標 (288, 83.13)。
   - 命中結算：
     - 數值端：`damageDealt: 165`，Target 1 在新位置如期受到傷害。
     - 表現層：`sequenceTargetPointBeforeDispatch` 仍為 `{ x: 144, y: 41.56, z: 29.5 }`（`visualTracksMovement: false`）。
     - **結論**：數值層鎖人，展示層鎖起始快照點，存在座標未隨目標動態追隨之差異。

---

### 4.3 F03：技能資料庫 UPDATE_SKILL 邊界輸入防禦 [P2 / D2, 已重現]

#### (1) 機理根因剖析
- 檢視 `engine/systems/ui/UICommandSystem.ts:112-119`：
  ```typescript
  case 'UPDATE_SKILL': {
      const skill = this.engine.skillDB.find((s) => s.id === cmd.skillId);
      if (!skill || !isSkillEditableField(cmd.field)) break;
      if (typeof cmd.value === 'number' && !Number.isFinite(cmd.value)) break;
      Object.assign(skill, { [cmd.field]: cmd.value });
      break;
  }
  ```

#### (2) 探針實跑數據（API 邊界 vs UI Inspector 實測）
1. **API 邊界測試**：
   - 負數數值：`range: -5`, `cast: -2`, `cd: -1`, `cost: -50` 經 `isFinite` 判斷均為 true，全數成功寫入 `skillDB`。
   - 特殊數值：`NaN` 與 `Infinity` 被 `!Number.isFinite` 攔截，寫入失敗（符合預期）。
   - 非法字串：`tag: 'INVALID_TAG'`, `type: 'INVALID_TYPE'` 因屬字串型別，不受 `isFinite` 限制，全數成功寫入 `skillDB`。
   - `finally` 還原：全部測試欄位均成功恢復原始值（`restoredCorrectly: true`）。
2. **UI Inspector DOM 實測（操作 `[data-window-id="db"]`）**：
   - 枚舉保護：`tag` 與 `type` 欄位在 DOM 中均渲染為 `<select>` 下拉選單（`enumProtectedBySelect: true`），一般 UI 使用者無法自由輸入未定義字串。
   - 負數輸入：在「極限射程」輸入框鍵入 `-5`，DOM 與 `engine.skillDB` 均同步變更為 `-5`（`uiNegativeAccepted: true`）。
   - 清空行為：將輸入框反白清空為空字串 `""`，`parseFloat("")` 結果為 `NaN`，被 `Number.isFinite` 拒絕，`skillDB` 未更新，輸入框在失焦或重繪後立刻 snapback 回 `-5`（`snappedBack: true`）。證實使用者無法在 UI 上將數值清空。

---

### 4.4 COORD01：渲染座標與排序診斷異常 [P2 / D3, 已重現 (診斷異常待畫面確認)]

#### (1) 機理與實跑數據
- 依 R01 要求，執行 `node tools/ui-e2e/coord-guard.mjs --assert`，測試以 **EXIT=1** 失敗中斷。
- 完整違規取樣數據（保存於 `tools/ui-e2e/out/cleanup-a0-r1/coords/coord_guard_assert.log`）：
  - **FLOAT**：VOID 與 MAGMA 浮動檢驗全數 PASS。
  - **SINK 下陷違規**：1 次（`FOREST/1001 agent=RED-0002 f=337`，腳底低於地塊頂部 delta=1.89px，moving=true，進度 0.524）。
  - **OVER-VOID 懸空**：1 次（`FOREST/1002 agent=BLU-0007 f=510 hex=-6,5`，地面無地形卻標記為落地）。
  - **FLICKER 排序震盪**：共 102 次震盪事件，涵蓋 93 個 episode。其中 **13 次發生在雙方移動不超過 2px 的近靜止情境**。
- **近靜止震盪實例剖析**：
  - 場景：`VOID seed 1002, frames 507/508/509, CORPSE RED-0010 vs VFX X:80.3`（位移僅 0.02px）：
    - `f507`: A[y=58.8, sb=-2.0, key=1005782] B[y=43.0, sb=24.0, key=1006854] -> gap=1072 (A 在 B 下)
    - `f508`: A[y=58.8, sb=13.2, key=1007298] B[y=43.0, sb=24.0, key=1006854] -> gap=-444 (A 翻到 B 上)
    - `f509`: A[y=58.8, sb=-2.0, key=1005782] B[y=43.0, sb=24.0, key=1006854] -> gap=1072 (A 翻回 B 下)
  - 震盪主因：屍體的 `sortBias` 在單幀內因動畫狀態在 -2.0 與 13.2 之間劇烈跳變，造成排序鍵頻繁前後翻轉。
- **結論**：目前在正常煙霧與 E2E 視覺中未見顯著穿模或閃爍，此項定性為**取樣診斷異常**，保留日誌作為後續繪圖防抖之參考，禁止為消除警告而私自修改門檻。

---

## 5. 全庫目錄清冊與統計分析（Inventory & Header Audit）

全庫母表經 `git ls-files` 計算，總計 634 個追蹤檔案，涵蓋 14 個工程區域。清冊完整收錄於 `docs/PROJECT_CLEANUP_A0_INVENTORY.csv`：

| 區域目錄 | 檔案數 | 核心職責 | 查證現況說明 |
| :--- | :---: | :--- | :--- |
| **`根目錄設定`** | 18 | 專案建置、套件管理、排版與型別設定 | 依母表列舉，保留必要建置檔。 |
| **`engine/`** | 163 | 核心模擬管線、呈現層、材質、數學與音訊 | 35 個核心檔案完成深度語義查證；其餘 128 檔標為「僅列舉／待查」。 |
| **`components/`** | 28 | React HUD、檢查器、地圖編輯器、視窗管理 | 5 個核心視窗與編輯器深度查證；其餘 23 檔標為「僅列舉／待查」。 |
| **`constants/`** | 10 | 領域常數 SSOT，單一來源規範 | 全部完成深度查證，標記 `tintStrength` 依賴。 |
| **`data/`** | 63 | 技能庫、單位外觀、音效、AI 配置資料檔 | 10 個核心技能與視效檔深度查證；其餘 53 檔標為「僅列舉／待查」。 |
| **`tests/`** | 97 | 單元測試、守門測試、效能回歸比對 | 核心守門測試完成查證；其餘 94 檔標為「僅列舉／待查」。 |
| **`tools/`** | 98 | 預覽工具、E2E 測試、效能守門、腳本 | 核心探針與守門工具深度查證；其餘標為「僅列舉／待查」。 |
| **`docs/`** | 31 | 架構手冊、決策紀錄、規範文件與本輪報告 | 逐項核對矛盾（H03～H05），不適用方框檔頭。 |
| **`public/assets/`** | 102 | Sprite Atlas、地塊材質、音效、粒子圖片 | 二進位資產，確認存在於目錄，標為「不適用」。 |
| **`hooks/`** | 11 | React 引擎綁定與自訂 Hook | 標為「僅列舉／待查」。 |
| **`types/`** | 2 | 全域型別合約 SSOT | 深度查證完成。 |
| **`styles/` & 其餘** | 11 | CSS 樣式、.claude、.github、art-source | 標為「僅列舉／待查」。 |

**查證統計**：
- **深度查證（Deep Verified）**：**64** 檔（涵蓋全部核心戰鬥、位移、呈現事件、UI 命令、守門測試與刪除候選）。
- **僅列舉／待查（Enumerated / Pending）**：**430** 檔代碼（非本輪核心修復範圍，留待後續有界批次）。
- **不適用（Binary / Docs / Assets）**：**149** 項（二進位資產與文件）。

---

## 6. 廢碼與刪除候選台帳（Findings & Candidates Ledger）

詳細台帳收錄於 `docs/PROJECT_CLEANUP_A0_FINDINGS.csv`，關鍵項目依審查意見補正如下：

1. **C01 [P3 / D1] `FACTION_BEAM_RAMP`**：
   - 位置：`data/vfx/beam_styles.ts:42`
   - 證據：全庫僅見宣告，生產端全走 `FACTION_BEAM_RAMP_ID` 查表。於 A2 安全移除。
2. **C02 [P3 / D2] `engine/renderers/GlowSpriteCache.ts`**：
   - 位置：`engine/renderers/GlowSpriteCache.ts`
   - 審查修正：生產端繪製管線無任何 direct import；但確認有 **2 個離線工具消費者**（`tools/ui-e2e/perf-r1-attribution.mjs`、`tools/ui-e2e/lib/lifecycle-probe.mjs`）與 1 個測試消費者（`tests/GlowSpriteCache.test.ts`）。
   - 處置：不可單獨刪除，須由主代理評估在 A2 將測試與工具動態載入一併退役。
3. **C03 [P3 / D2] `TerrainSkinConfig.tintStrength`**：
   - 位置：`constants/terrain.ts:401,427`
   - 證據：已標記 `@deprecated`，但受保護的快照檔案 `tests/constants-snapshot.json` 與 `tests/TerrainSkin.test.ts` 持續斷言。禁止未經授權刪除。
4. **C04 / C05 [P3 / D1] 多餘 export 關鍵字**：
   - 修正路徑：`FactionTextureStore` 真實路徑為 `engine/renderers/units/FactionTextureStore.ts`。
   - 包含 `createEffectSlot`（`Effects.ts`）、`getJumpLimit`（`ClimbRule.ts`）、`factionSkin.ts` 7 個子型別等，均僅在檔內使用，建議於 A2 移除 export 關鍵字收縮 API 表面積。
5. **ragdoll 必須保留**：
   - `Agent` 實體持有 `ragdoll`，`agentManager.ts` 在單位死亡時初始化其速度與旋轉，`UnitDeathPainter.ts:22` 於每幀讀取並繪製死亡拋飛動畫，**絕對保留**。
6. **sharp 可選依賴**：
   - `tools/vfx/fx-shot.mjs:151` 已實作 `import('sharp').catch(() => ({ default: null }))` 優雅降級，禁止執行 `npm install sharp`。

---

## 7. 審查項目修正對照表（Review Reconciliation Table）

依據任務指示詞第 1 節，逐項回應主代理審查意見（`docs/PROJECT_CLEANUP_A0_REVIEW.md` R01～R05）：

| 審查項目 (Review ID) | 原始審查問題 | 本輪修正內容 (Correction) | 具體證據來源 (Evidence) | 仍未完成項目 (Pending) |
| :--- | :--- | :--- | :--- | :--- |
| **R01 — 座標診斷被錯報通過** | `verify:coords` 未帶 assert exit 0 不代表無異常；日誌有 1 下陷、1 over-void、102 震盪被省略。 | 建立 `COORD01` 台帳；以 `--assert` 實跑記錄 `EXIT=1`；定位到具體下陷與近靜止震盪幀；定性為取樣診斷異常。 | `coord_guard_assert.log`；`coord_guard.json`；定位幀 `FOREST/1001 f337` 與 `VOID/1002 f507-509`。 | 待主代理評估是否需畫面級防抖修復。 |
| **R02 — F02 技能選錯且結論相反** | 把自身中心 AOE 當單體、把單體突進當 AOE；原 JSON 離開者受傷、走入者無傷卻在總結寫反；缺視效落點量測。 | 撤回 F02 舊結論；重選真實技能（AOE: `mb_u1`, SINGLE: `mb_a2`）；使用 `teleportTo` 同步空間索引；實測證實 AOE 走開受傷0/走入受傷365；SINGLE 數值命中/視覺留原點。 | `cleanup-a0-repro.mjs` F02 段；`repro_results.json` 之 AOE 與 SINGLE 量測數據。 | 表現層動態追隨演算法留待後續評估。 |
| **R03 — F03 API 測試冒充 UI 重現** | 探針未操作 UI 輸入框；修改 type 沒還原；NaN 序列化為 null；推論無限施法未經觀測。 | 分離 API 與 UI 實測；API 測試加入 `valueKind` 並於 finally 完整還原；Playwright 實操技能編輯器輸入負數、清空（確認 snapback）、失焦與恢復。 | `cleanup-a0-repro.mjs` F03 段；`repro_results.json` API 與 UI 實測數據。 | 空值草稿與預設值語義設計留待 A3 定奪。 |
| **R04 — 清冊非語義全查且目錄數不符** | 640 列全標已查證不實（多數僅母表檢視）；目錄計數手工填寫錯誤（components 38 vs 28 等）；宣稱各區全合規不實。 | 目錄數改由 `git ls-files` 自動計算；拆分出「已深度查證」（64檔）與「僅列舉／待查」（430檔）；標記未查原因；整體保持未完成。 | `cleanup-a0-inventory.mjs`；`PROJECT_CLEANUP_A0_INVENTORY.csv`；`PROJECT_CLEANUP_A0_EVIDENCE.json`。 | 其餘 430 個程式檔案之語義審查留待後續有界批次。 |
| **R05 — 偽原碼、錯誤數據與未持久化探針** | 引述不存在的 `this.bus.on` 與 payload；mb_u1 數據寫錯；perf guard 誤寫 0 diff；探針放在 ignored 目錄無法復現。 | 核對並引述真實原碼（`VisualSystem.flush`、`cmd.field/value`）；修正 `mb_u1` 數據（548 傷害）；說明 perf guard 門檻內通過；探針持久化至追蹤工具路徑。 | `tools/ui-e2e/cleanup-a0-repro.mjs`；`tools/audit/cleanup-a0-inventory.mjs`；`status-guard-native-1024.log`。 | 無。 |

---

## 8. 結論與交回主代理（Handback）

本輪（A0-R1）已徹底糾正 A0 報告中的數據與結論偏差：
- 探針源碼完整保存於 [cleanup-a0-repro.mjs](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/cleanup-a0-repro.mjs)，探針執行 exit 0，原始數據真實無欺。
- 座標守門測試以 `--assert` 重新檢驗並誠實報告 exit 1 與具體違規片段，建立 [PROJECT_CLEANUP_A0_FINDINGS.csv](file:///c:/Git/Group-Battler-FFT-Final/docs/PROJECT_CLEANUP_A0_FINDINGS.csv) 追蹤。
- 全庫清冊在 [PROJECT_CLEANUP_A0_INVENTORY.csv](file:///c:/Git/Group-Battler-FFT-Final/docs/PROJECT_CLEANUP_A0_INVENTORY.csv) 中誠實標明 64 檔深度查證與 430 檔待查，未完成項目邊界分明。
- 機器可讀精簡證據完整收錄於 [PROJECT_CLEANUP_A0_EVIDENCE.json](file:///c:/Git/Group-Battler-FFT-Final/docs/PROJECT_CLEANUP_A0_EVIDENCE.json)。
- **全過程保持零產品程式碼異動**。工作正式交回主代理複審。
