# C02/C03 整批退役報告：退役舊光暈快取與無效地形設定

- 開工 HEAD: `a89157d5e9244693cf8d69de38cb3eb11e64d0cb`
- 變更提交: `2b15fad` (`chore: retire unused glow cache and terrain tint setting`)
- 分支: `feat/project-cleanup`

## 1. 任務結果與依賴查證
- **C02 (GlowSpriteCache & RENDER_GLOW)**: **DONE**
  - 查證依賴：全庫 git grep 確認產品代碼（engine/components/data）無任何 import 或呼叫。僅舊測試與 2 個診斷工具維持讀取。
  - 保留邊界：`BarPainter` 仍使用 `isGlowSpritesEnabled` 控制血條光暈；保留 `RENDER_QUALITY.GLOW_SPRITES`、`resolveGlowFlag`、`isGlowSpritesEnabled` 及測試覆寫。
  - 執行動作：刪除 `engine/renderers/GlowSpriteCache.ts`、`constants/render.ts` 的 `RENDER_GLOW`；移除 `lifecycle-probe.mjs` 與 `perf-r1-attribution.mjs` 的舊快取讀取；更新 `glow-compare.mjs` 標籤為 HUD glow flag off/on；更新 `RenderQuality.ts` 註解說明仍控制血條光暈。
- **C03 (TERRAIN_SKIN.tintStrength)**: **DONE**
  - 查證依賴：`tintStrength` 標記 deprecated，渲染器已全走 topDetail/sideDetail overlay，完全不讀取此欄位；無 UI 命令、localStorage、外顯 JSON 格式或工具依賴整份設定。
  - 執行動作：刪除 `constants/terrain.ts` 中 `TerrainSkinConfig.tintStrength` 與 `TERRAIN_SKIN.tintStrength` 初值。

## 2. 測試與快照契約變更
- 測試遷移：原 `tests/GlowSpriteCache.test.ts` 10 個案例中，前 6 個隨模組刪除；後 4 個 GLOW_SPRITES Quality Flag 遷移至 `tests/RenderGlowFlag.test.ts`（前後置重設 tier 與 override）。
- 測試斷言：`tests/TerrainSkin.test.ts` 改為斷言 `'tintStrength' in TERRAIN_SKIN` 為 false；`tests/ConstantsBarrel.test.ts` 移除 `RENDER_GLOW` 且標題不寫死數量。
- 測試總數：714 -> 708 passed（移除 6 項舊快取測試，保留 4 項旗標測試）。
- 常數快照精確核對：`tests/constants-snapshot.json` 頂層 88 -> 87 鍵（只少 `RENDER_GLOW`），`TERRAIN_SKIN` 只少 `tintStrength`；經 `assert.deepStrictEqual` 比對 git show a89157d 嚴格相等。

## 3. 驗證命令結果
| 命令 | 逾時 | 結束碼 | 用時 | 結果摘要 |
| --- | --- | --- | --- | --- |
| c02c03-lint | 120s | EXIT=0 | 6s | tsc 通過無報錯 |
| c02c03-test | 300s | EXIT=0 | 11s | 90 files / 708 passed |
| c02c03-build | 180s | EXIT=0 | 3s | 303 modules built |
| c02c03-smoke | 180s | EXIT=0 | 11s | PASS: 0 page errors, engine advancing |
| c02c03-glow0 | 180s | EXIT=0 | 11s | PASS: glow=0 runtime smoke passed |
| c02c03-glow1 | 180s | EXIT=0 | 11s | PASS: glow=1 runtime smoke passed |
| c02c03-guard | 900s | EXIT=0 | 109s | 保真全部通過，5 群系效能門檻全部通過 |
| c02c03-lifecycle | 180s | EXIT=0 | 41s | samples=6, terrainSprites 存在, GlowSpriteCache 為 undefined, errors 2 筆 (favicon 404) |
| c02c03-attribution | 600s | EXIT=0 | 249s | 7 場景皆有 valid baseline 與 _cacheStats.terrain，_cacheStats.glow 為 undefined |

## 4. 未完成事項
- 無。
