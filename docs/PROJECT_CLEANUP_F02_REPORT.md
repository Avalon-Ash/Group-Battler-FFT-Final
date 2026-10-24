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
  - 僅限 `type === 'SINGLE' && cast > 0 && projectileSpeed <= 0 && animation !== 'HEAVEN_FALL'` 且目標在場存活之技能（如 `mb_a2` 秘法射線、`ps_a1`、`ab_a1`、`dr_a1`、`dr_a2`）。
  - 排除範圍：地面 AOE（`mb_u1`）、彈道投射物（`projectileSpeed > 0`）、無詠唱瞬發技能、天降型大絕（`HEAVEN_FALL`）。
- **架構實作**:
  - `engine/presentation/visuals/SequenceSystem.ts`: 引入 `SequenceRunOptions` 與 `SequenceTargetBinding`，於 `update()` 在 `lockAt` 前每幀採樣 `VisualMath.getUnitAnchor(target, engine)`；達 `lockAt` 或目標死亡／離場時於最後已知點固化。新增架構箱頭。
  - `engine/presentation/VisualSystem.ts`: 於 `CAST_START` 判定單體資格並注入 `options: { targetId, lockAt: event.lockAt }`。新增架構箱頭。
  - `engine/renderers/RenderSpec.ts` & `docs/VFX_PIPELINE_MAP.md`: 新增 §4.1 目標錨點採樣與時點協議，同步管線拓撲。

## 4. 探針與自動化驗證數據
- **F02 專用探針 (`cleanup-f02-check.mjs`)**:
  - Before (`tools/ui-e2e/out/f02-before.json`):
    - `mb_a2`: 初始 (144, 41.57, 53.5) -> 目標移動至 (4, 0) 後錨點 (277.75, 80.18, 149.5)，殘留漂移 `drift3D = 169.10px`（靜態鎖死發動點）。
    - `mb_u1`: 地面點 (144, 41.57, 53.5) 維持原位，`drift3D = 0.00px`（地面鎖定符合預期）。
  - After (`tools/ui-e2e/out/f02-after.json`):
    - `mb_a2`: 命中派發時點動態採樣目標最新位置，`drift3D = 0.00px`（完全貼合動態目標錨點）！
- **完整驗證套件結果**:
  - `f02-lint`: `npm run lint` -> `EXIT=0`（0 錯誤）。
  - `f02-test`: `npm test` -> `EXIT=0`（91 files, 777 passed，含 `SequenceTargetBinding.test.ts` 13 項全過、`SkillEditor.test.ts` 59 項全過）。
  - `f02-build`: `npm run build` -> `EXIT=0`（304 模組打包成功）。
  - `f02-smoke`: `runtime-smoke.mjs --shot` -> `EXIT=0`（0 page errors，畫面正常推進）。
  - `f02-coords`: `npm run verify:coords` -> `EXIT=0`（無新增浮空／穿透異常）。
  - `f02-doc-final`: `vitest run tests/DocDrift.test.ts` -> `EXIT=0`（3 passed）。
  - `f02-guard`: `npm run perf:guard` -> `EXIT=1`（`battle_frozen` badPixelPct 0.59% > 0.50%）。

## 5. 未完成事項、風險與回退方案
- **perf:guard 差異風險（未重錄 baseline）**:
  - 差異集中於戰鬥畫面中單位移動時單體追蹤之視覺修正，`battle_frozen` 像素差異 0.59% 超過 0.5% 門檻。
  - 嚴格遵守「本輪完全未授權 baseline 重錄」合約，不私自覆寫 baseline，保留原始輸出並列為未完成事項交主代理審查。
- **HANDOFF 與未完成事項**:
  - 依照指示不提前關閉 F02/F03，保留在 HANDOFF 待審查。
  - A0 歷史清冊大量項目未核實、COORD01 景深殘差、T01/K01/K02 待後續查核；奧義 50 招重新設計與全庫平衡順序不變。
- **回退方案**:
  - F 組回退: `git revert fbe56ca`（保留 R 組修復）。
  - R 組回退: `git revert 053aa4d`。
