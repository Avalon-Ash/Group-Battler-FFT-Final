# C02/C03 整批退役報告：退役舊光暈快取與無效地形設定

- 開工 HEAD: `a89157d5e9244693cf8d69de38cb3eb11e64d0cb`
- 變更提交: `2b15fad` (`chore: retire unused glow cache and terrain tint setting`)
- 分支: `feat/project-cleanup`

## 1. 任務結果與依賴查證
- **C02 (GlowSpriteCache & RENDER_GLOW)**: **DONE**
  - 查證依賴：全庫 git grep 確認產品代碼（engine/components/data）無任何 import 或呼叫。僅舊測試與 2 個診斷工具維持讀取。
  - 保留邊界：`BarPainter` 仍使用 `isGlowSpritesEnabled` 控制血條光暈；保留 `RENDER_QUALITY.GLOW_SPRITES`、`resolveGlowFlag`、`isGlowSpritesEnabled` 及測試覆寫。
  - 執行動作：在 commit `2b15fad` 中刪除裸檔名 `GlowSpriteCache.ts`、`constants/render.ts` 的 `RENDER_GLOW`；移除 `lifecycle-probe.mjs` 與 `perf-r1-attribution.mjs` 的舊快取讀取；更新 `glow-compare.mjs` 標籤為 HUD glow flag off/on；更新 `RenderQuality.ts` 註解說明仍控制血條光暈。
- **C03 (TERRAIN_SKIN.tintStrength)**: **DONE**
  - 查證依賴：`tintStrength` 標記 deprecated，渲染器已全走 topDetail/sideDetail overlay，完全不讀取此欄位；無 UI 命令、localStorage、外顯 JSON 格式。相容性說明：`tools/ui-e2e/terrain-contrast.mjs` 的 `--skin` 泛用合併仍存在，舊 `tintStrength` 可被附加但無渲染消費者（本輪不改該工具，不宣稱其已有欄位驗證）。
  - 執行動作：刪除 `constants/terrain.ts` 中 `TerrainSkinConfig.tintStrength` 與 `TERRAIN_SKIN.tintStrength` 初值。

## 2. 測試與快照契約變更
- 測試遷移：在 commit `2b15fad` 中，原裸檔名 `GlowSpriteCache.test.ts` 10 個案例中，前 6 個隨模組刪除；後 4 個 GLOW_SPRITES Quality Flag 遷移至 `tests/RenderGlowFlag.test.ts`（前後置重設 tier 與 override）。
- 測試斷言：`tests/TerrainSkin.test.ts` 改為斷言 `'tintStrength' in TERRAIN_SKIN` 為 false；`tests/ConstantsBarrel.test.ts` 移除 `RENDER_GLOW` 且標題不寫死數量。
- 測試總數：714 -> 708 passed（移除 6 項舊快取測試，保留 4 項旗標測試）。
- 常數快照精確核對：`tests/constants-snapshot.json` 頂層 88 -> 87 鍵（只少 `RENDER_GLOW`），`TERRAIN_SKIN` 只少 `tintStrength`；經 `assert.deepStrictEqual` 比對 git show a89157d 嚴格相等。

## 3. 驗證命令結果（原批歷史紀錄）
| 命令 | 逾時 | 結束碼 | 用時 | 結果摘要 |
| --- | --- | --- | --- | --- |
| c02c03-lint | 120s | EXIT=0 | 6s | tsc 通過無報錯 |
| c02c03-test | 300s | EXIT=0 | 11s | 90 files / 708 passed（執行在報告撰寫之前） |
| c02c03-build | 180s | EXIT=0 | 3s | 303 modules built |
| c02c03-smoke | 180s | EXIT=0 | 11s | PASS: 0 page errors, engine advancing |
| c02c03-glow0 | 180s | EXIT=0 | 11s | PASS: glow=0 runtime smoke passed |
| c02c03-glow1 | 180s | EXIT=0 | 11s | PASS: glow=1 runtime smoke passed |
| c02c03-guard | 900s | EXIT=0 | 109s | 保真全部通過，5 群系效能門檻全部通過 |
| c02c03-lifecycle | 180s | EXIT=0 | 41s | samples=6, terrainSprites 存在, GlowSpriteCache 為 undefined, errors 2 筆 (原批未擋退出碼) |
| c02c03-attribution | 600s | EXIT=0 | 249s | 7 場景皆有 valid baseline 與 _cacheStats.terrain，_cacheStats.glow 為 undefined |

## 4. 驗收結論與補驗（H03–H05 補正）
原批產品差異通過主代理審查，原驗收有缺口（原批 lifecycle 存在 2 筆 favicon 404 錯誤但工具原先 EXIT=0，且原報告含已刪除 repo 路徑導致後續 DocDrift 失敗；原整套測試通過發生在報告撰寫之前）。本批補驗結果：
1. `perf-lifecycle-soak.mjs` 補足錯誤定位（附 console location URL、HTTP 錯誤記錄），並在清理後依錯誤狀態設置 `process.exitCode=1`。
2. 負向控制測試 `h03h05-life-negative`（尚未加 fixture，`h03h05-lifecycle-negative.json`）：EXIT=1，捕捉到 2 筆帶 location 的 favicon 404 console 錯誤與 1 筆 HTTP 404，證明錯誤真實阻擋驗收。
3. 加入 `GET /favicon.ico -> 204` 裝飾請求 fixture 後執行 `h03h05-life-clean`（`h03h05-lifecycle-clean.json`）：EXIT=0，errors 空、httpErrors 空，samples=6，均有 caches.terrainSprites，均無 caches.GlowSpriteCache。

## 5. 未完成事項
- A0 歷史清冊仍大量未人工核實。
- F02 移動目標採樣／結算、F03 UPDATE_SKILL 驗證待處理。
- COORD01 景深殘差與 T01/K01/K02 仍需後續處理。
