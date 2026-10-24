# PROJECT CLEANUP F02 驗證與修復報告

## 1. 任務概要與 Commit
- **分支**: `feat/project-cleanup`（未推送到遠端）
- **R 組 Commit** (`053aa4d`): `fix(inspector): remediate F03 test isolation, probe assertions, and docs`
- **F 組 Commit** (`fbe56ca`): `feat(vfx): bind and lock single-target cast sequences to dynamic target anchor`
- **Docs Commit**: 待提交本報告與 `docs/HANDOFF.md`。

## 2. R 組補正狀態（F03 審查缺失修復）
- **R1 (`tests/SkillEditor.test.ts`)**:
  - 原位快照與還原 `DEFAULT_SKILL_DB`，清除測試動態新增屬性，移除 4 處 `as any`，斷言跨 engine 物件身分與隔離。
  - 全量覆蓋 150 招技能所有 31 欄位之驗證器（必填無遺漏）；全量測試 UI 表單 select 之 sentinel/boolean/team 轉換。
- **R2 (`tools/ui-e2e/cleanup-f03-check.mjs`)**:
  - REJECT 嚴格斷言 `Object.is(after, before)` 且無其他欄位污染；ACCEPT 斷言同一引用。
  - 補強 UI 測試：未提交草稿切換至技能 B 時不污染 B，失焦確認 A 提交；Enter 後 blur 單次派發；煙霧 `t1 > t0` 嚴格大於。
  - 負向探針注入 `console.error` 實跑獲 `EXIT=1`；正規重跑獲 `EXIT=0`（API 20 項全過、UI 全過）。
- **R3 (`docs/BAKED_RENDERING_DESIGN.md` & `docs/PROJECT_CLEANUP_F03_REPORT.md`)**:
  - 清理虛構版本時程與不存在之符號引用，引據 `RenderSpec §1` 與 `RenderList`；精確記錄 150 招技能與 59 項測試。

## 3. F 組實作與管線狀態（F02 目標動態追蹤與鎖定）
- **受影響技能與資格判定**:
  - 僅限 `skill.type === 'SINGLE' && (skill.cast || 0) > 0 && (!skill.projectileSpeed || skill.projectileSpeed <= 0) && sequence.actions.every(a => a.type !== 'HEAVEN_FALL')` 且目標仍在 `engine.agents` 集合中之技能。
  - 受影響非 BASIC 技能共 36 項（真實資料庫導出，參見 `review-f02-eligible.json`，含 `mb_a2` 冰封禁錮、`tb_a2` 制裁震擊、`wb_a2` 疾光突襲、`sb_a1` 神聖癒合、`tr_a4` 鮮血護盾等，無杜撰之 `ps_a1/ab_a1/dr_a1/dr_a2`）。
  - 排除範圍：地面 AOE（`mb_u1`）、彈道投射物（`projectileSpeed > 0` 如 `mb_b1`）、無詠唱瞬發技能（`cast <= 0`）、天降型動作（序列 actions 含 `HEAVEN_FALL` 如 `tr_u1` 處決斷頭台）。
- **架構實作**:
  - `engine/presentation/visuals/SequenceSystem.ts`: 引入 `SequenceRunOptions` 與 `SequenceTargetBinding`，於 `update()` 在 `lockAt` 前每幀採樣 `VisualMath.getUnitAnchor(target, engine)`；首次 `battleTime >= lockAt` 永久鎖定；若目標在 `engine.agents` 集合中（即使 `hp <= 0`）仍可採樣；目標離場移出集合時沿用最後有效快照 `lastAnchor`。
  - `engine/presentation/VisualSystem.ts`: 於 `CAST_START` 查驗 `sequence.actions` 判定資格，`lockAt` 算自當下 `engine.battleTime + (skill.cast || 0)`（資料與事件無 `animation` 或 `event.lockAt` 欄位），注入 options。檔頭箱頭已校正為「目標仍在集合」。
  - `engine/renderers/RenderSpec.ts` & `docs/VFX_PIPELINE_MAP.md`: 新增 §4.1 目標錨點採樣與時點協議，同步管線拓撲。

## 4. 探針與自動化驗證數據（含 V01 補驗）
- **F02 專用探針 (`cleanup-f02-check.mjs`)**:
  - Before 歷史記錄 (`tools/ui-e2e/out/f02-before.json`):
    - `mb_a2`（冰封禁錮）: 初始 (144, 41.57, 53.5) -> 目標移動至 (4, 0) 後錨點 (277.75, 80.18, 149.5)，殘留漂移 `drift3D = 169.10px`（靜態鎖死發動點）。
    - `mb_u1`: 原報告僅以傷害 hex 對照判定，未實際取樣視覺空間派發座標。
  - V01 After 補驗 (`tools/ui-e2e/out/v01-f02-after.json`):
    - `mb_a2`: 嚴格捕捉 BEAM 動作（移除 fallback），`drift3D = 0.00px`（完全貼合動態目標錨點，傷害 110）。
    - `mb_u1`: 實測序列空間派發座標，`maxVisualDrift = 0.00px`，`followedMovedTarget = false`；獨立斷言 `simulationGroundLocked = true`（逃脫目標傷害 0、進圈目標傷害 430）與 `visualGroundLocked = true`（空間動作鎖定原序列點）。
    - 探針退出碼校正：`before` 異狀（`BEFORE_ANOMALY`）與 console/page 錯誤均設 `process.exitCode = 1`。負向控制經注入 `console.error` 實跑證實退出碼為 1。
- **座標與守門回歸事實**:
  - 原 `verify:coords` EXIT=0 是因未帶 `--assert`。帶 `--assert` 實跑為 EXIT=1：實測存在 sink=1（`FOREST` seed 1001 `RED-0002` f337，delta 1.89px，移動步進過渡）、over-void=1（`FOREST` seed 1002 `BLU-0007` f510，擊飛出界掉落）、oscillation=106 flips / 13 static episodes。不能在無基底對照下聲稱「無新增異常」。
  - 原 `perf:guard` 在 fidelity 失敗後短路，`perf-ab` 當時未執行。
  - V01 補驗：經 B 節限定授權單張更新 `battle_frozen.png` 後，`npm run perf:guard` 完整跑完且全綠（EXIT=0）：6 場景保真度全過（battle_frozen 0% 差異，五群系在閾值內）、`perf-ab` 5 群系效能斷言全數通過（基準比率 <= 1.15，絕對幀時間 <= 門檻）。

## 5. 未完成事項、風險與回退方案
- **保真更新與效能狀態**:
  - V01 批次已獲得明確授權更新單張 `battle_frozen.png`（變更集中於中心目標光束特效 [664, 236, 803, 398]，五地形 baseline hash 完全未變）；完整 `perf:guard` 執行通過。
- **HANDOFF 與未完成事項**:
  - F02 單體目標動態綁定核心與所有測試／探針驗證完成，待主代理合併後結案。
  - COORD01 景深殘差與 A0 全庫清冊缺口已建立證據台帳（`docs/PROJECT_CLEANUP_V01_FINDINGS.md`），不提前宣告關閉。
  - 奧義 50 招重新設計與全庫平衡順序不變。
- **回退方案**:
  - F 組回退: `git revert fbe56ca`。
  - R 組回退: `git revert 053aa4d`。
