# F03 技能編輯器驗證與輸入修復＋文件殘留補正報告

- 開工 HEAD: `3d00df2e0ea93751a1cb6609f929053498d1c4ce`
- 分支: `feat/project-cleanup`
- 狀態: F03 (DONE) / D組文件補正 (DONE)
- 實作 Commit: `dd85241` (`feat(inspector): validate UPDATE_SKILL mutations and buffer numeric drafts in skill editor`)
- 回退基準: `3d00df2e0ea93751a1cb6609f929053498d1c4ce`

## 1. 改前／改後矩陣與實跑日誌

| 驗證維度 | 測試案例 | 改前 (f03-before) | 改後 (f03-after) | 規則依據 |
| --- | --- | --- | --- | --- |
| API 邊界 | `cast = -2` (負詠唱) | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 非負有限數值 |
| API 邊界 | `cast = "two"` (字串) | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 嚴格數值型別 |
| API 邊界 | `tag = "INVALID_TAG"` | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 精確 union 白名單 |
| API 邊界 | `ccType = "GRAVITY"` | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 排除未定義 CC 型別 |
| API 邊界 | `specialVisualStatus = "DANGER"` | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 排除未定義特殊視覺 |
| API 邊界 | `ccSelf = "false"` (字串) | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 拒絕偽布林字串 |
| API 邊界 | `range = undefined` (必填清除) | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 必填欄位不可清除 |
| API 邊界 | `visualHitEffect = "toString"` | 寫入成功 (缺陷) | 拒絕寫入，維持原值 | 拒絕原型鏈繼承屬性 |
| API 邊界 | `power = -100` (合法負值治療) | 寫入成功 (正常) | 寫入成功 (保留) | 負值為合法治療 |
| API 邊界 | `aoeRadius = undefined` (選填清除)| 寫入成功 (正常) | 寫入成功 (保留) | 選填清除語義保留 |
| UI 互動 | 清空必填欄位 (如 range) | 立刻彈回原值 (阻礙重輸) | 草稿清空，失焦才還原 | SkillNumberInput 草稿緩衝 |
| UI 互動 | 輸入新數值並按 Enter | 無緩衝即時 parseFloat | 草稿緩衝，Enter/blur 寫入 | 嚴格數值解析與去重 |
| UI 互動 | 按 Escape 鍵取消編輯 | 無取消機制 | 放棄草稿，還原原值並失焦 | isCancellingRef 防 blur 重複送 |
| UI 互動 | 切換編輯技能 | 無防護 | 獨立 key 解構，草稿不串連 | key=`${skill.id}_${field.key}` |
| UI 表單 | CC 與特殊視覺下拉選單 | 含 GRAVITY、含 DANGER | 移除 GRAVITY/DANGER，補 INVINCIBLE | 選項與 types.ts 完全對齊 |

- 改前 JSON: `f03-before.json` / `tools/ui-e2e/out/f03-before.json`（日誌 `tools/ui-e2e/out/agent-logs/f03-before.log`，截圖 `tools/ui-e2e/out/f03-before-ui.png`）
- 改後 JSON: `f03-after.json` / `tools/ui-e2e/out/f03-after.json`（日誌 `tools/ui-e2e/out/agent-logs/f03-after.log`，截圖 `tools/ui-e2e/out/f03-after-ui.png`）

## 2. 規則設計與現有資料庫相容性

- **驗證單一來源 (`data/ui/skillEditor.ts`)**：覆蓋全部 31 個編輯欄位，`satisfies Record<SkillEditableField, SkillFieldRule>` 強型別防漏。
- **負向數值保留**：`power` 允許負值（合法治療，如 `red_basic` -90、`red_ult` -1100/-700）；`ccForce`、`effectVal` 允許負值。
- **非負數值限制**：`range`、`cast`、`cd`、`cost`、`gain`、`aoeRadius`、`projectileSpeed`、`ccDur` 強制 `>= 0`。本輪 cast 下限設為 0，不搶先強制奧義 >= 1.5 秒。
- **現存技能庫驗證**：`tests/SkillEditor.test.ts` 遍歷 `DEFAULT_SKILL_DB` 全 45+ 技能的所有編輯欄位，與新規則 100% 相容，無衝突項。

## 3. D 組文件殘留補正摘要

- `docs/BAKED_RENDERING_DESIGN.md`：
  - §1.1 現況管線重寫：單位主體走 `UnitBodyPainter` → `SpriteUnitRenderer` → `SpriteAtlasStore`，非 `ImperialRenderer` / `CovenantRenderer` 即時向量繪製。
  - 地形快取上限更新為 `constants/render.ts` 的 `RENDER_CACHE.MAX_TERRAIN_SPRITES = 2048`（非 512）；移除無日期來源的每幀次數。
  - §1.2 標記 Q1 診斷為 2026-Q1 早期量測，不作現值。
  - §2.1 移除自造公式，直接引用 `engine/renderers/RenderSpec.ts` SSOT。
  - §3.3 標明現況已走圖集，`AtlasManager` 與高度分帶為未採用暫緩提案。
  - §4.2 刪除 WebGL 例外許可條款，重申 `AGENTS.md` §1.4 純 Canvas 2D 鐵律。
- `docs/ART_SPEC.md`：
  - 收斂四向規格：單位預渲染原生四向；障礙物按 manifest 定義不強制四向，保留自製冰晶／黑曜柱等例外。
  - UI/HUD 渲染說明：改為穩態使用快取、未命中時由 `BarPainter` 等 bake 函式烘焙，穩態迴圈避免每幀 `shadowBlur` 重複呼叫。
- `docs/HANDOFF.md` 與 `docs/PROJECT_CLEANUP_H03H05_REPORT.md`：
  - 區分前批工具驗收已完成與本批文件補正；H04/H05 修正為 PARTIAL 並記明由 F03 補正完成。

## 4. 驗證與未完成事項

- 驗證命令矩陣：
  - `f03-lint`: EXIT=0 (5s, `tsc --noEmit` 通過無報錯)
  - `f03-test`: EXIT=0 (11s, 90 files / 761 tests 全部通過，含 `tests/SkillEditor.test.ts` 56 tests)
  - `f03-build`: EXIT=0 (3s, 304 modules transformed, production bundle 成功)
  - `f03-smoke`: EXIT=0 (11s, 0 page errors, 10 單位 battleTime 0.52 -> 4.57s 畫面正常推進)
  - `f03-doc-final`: EXIT=0 (1s, `DocDrift.test.ts` 3 tests 通過，路徑與標頭無漂移)
- 實跑探針：`cleanup-f03-check.mjs` API 20 項全過、UI 互動全過、戰鬥 smoke 正常、0 pageerror。
- 未完成事項：A0 歷史清冊大量未人工核實；F02 移動目標追蹤、COORD01 景深殘差、T01/K01/K02 待後續查核；奧義 50 招重新設計與全庫平衡順序不變。
