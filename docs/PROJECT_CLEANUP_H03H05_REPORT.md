# H03–H05 整批文件對齊＋C02/C03 驗收補正報告

- 開工 HEAD: `269b53f898d687e4da5505f93e8091ce4a516e21`
- 分支: `feat/project-cleanup`
- R 組 Commit: `71ec4e6` (`fix(tool/docs): lifecycle error location, favicon fixture, and c02c03 report re-verification`)
- D 組 Commit: （待填入）
- 狀態: R (DONE) / D (DONE) / H03 (DONE) / H04 (DONE) / H05 (DONE)

## 1. 逐檔修改摘要（Kept / Revised / Dropped）

| 檔案 | 狀態 | 來源與依據 | 修改摘要 |
| --- | --- | --- | --- |
| `tools/ui-e2e/perf-lifecycle-soak.mjs` | revised | R 組合約 / `cleanup-a0-repro.mjs` | 補 console location URL、HTTP 400+ 記錄、退出碼 `process.exitCode=1`、GET /favicon.ico 204 fixture |
| `docs/PROJECT_CLEANUP_C02C03_REPORT.md` | revised | DocDrift 失敗 / 審查意見 | 修正已刪除路徑為裸檔名＋commit `2b15fad`、補 terrain-contrast 相容性說明與補驗結果 |
| `docs/DECISIONS.md` | revised | `constants/render.ts` / `RenderSpec.ts` | H03 smoothing 由 high 改為 low（歷史上 high 曾致幀耗加倍；離線烘焙維持 high） |
| `docs/HANDOFF.md` | revised | 主代理合約 / 全庫現況 | H04 修正分支現況為 `feat/project-cleanup`、更新工作順序、明確奧義為待做需求、更新 Quaternius 否決 |
| `docs/VFX_PIPELINE_MAP.md` | revised | `VisualSystem` / `ParticleRenderer` | H03/H04 改為現行單一拓樸與操作入口，移除遷移前舊矩陣與舊待辦，smoothing 記明 low |
| `docs/VISUAL_ROADMAP.md` | revised | 落地歷史 / `HANDOFF.md` | H04 O0 標明已選 CC0 預渲染，整併完成階段證據，保留奧義重構等有效未完成項 |
| `docs/BAKED_RENDERING_DESIGN.md` | revised | commit `2b15fad` / 現行架構 | H04 明確 GlowSpriteCache 已退役，分清現行快取（Block/VFX/Loop/Obstacle）與未採用提案 |
| `docs/PERF_LIFECYCLE_FINDINGS.md` | revised | 審查意見 / 歷史邊界 | 僅追加歷史量測範圍說明與 GlowSpriteCache 退役註記，歷史數據未改 |
| `docs/ART_SPEC.md` | revised | DECISIONS §1 / ART_STYLE_BIBLE §11 | H05 移除像素世界與 1px 限色盤強制規格，§12 標為歷史原型，確立 HD 預渲染主線 |
| `docs/ART_STYLE_BIBLE.md` | revised | DECISIONS §5 / HANDOFF §4 | H05 AI 旋轉圖標為歷史流程，Quaternius 女性素材標為已否決，新模型標待評估 |
| `docs/PROJECT_CLEANUP_H03H05_REPORT.md` | added | 本提示詞 §5 交付需求 | 新增本精簡報告（<= 90 行） |

## 2. R 組 Lifecycle 實跑證據摘要

| 執行項目 | 命令 | 退出碼 | 樣本 / 錯誤 | 結論 |
| --- | --- | --- | --- | --- |
| 負向控制 (`h03h05-life-negative`) | `node tools/agent/run.mjs --detach h03h05-life-negative 180 -- node tools/ui-e2e/perf-lifecycle-soak.mjs --minutes=0.5 --showcase=0.1 --sample=5 --out=h03h05-lifecycle-negative.json` | EXIT=1 | samples=6, errors=2, httpErrors=1 | 成功重現 favicon 404 (location URL 完整) 且真實阻擋驗收 |
| 正常補驗 (`h03h05-life-clean`) | `node tools/agent/run.mjs --detach h03h05-life-clean 180 -- node tools/ui-e2e/perf-lifecycle-soak.mjs --minutes=0.5 --showcase=0.1 --sample=5 --out=h03h05-lifecycle-clean.json` | EXIT=0 | samples=6, errors=0, httpErrors=0 | 均有 caches.terrainSprites、均無 caches.GlowSpriteCache，驗收通過 |

- 負向日誌: `tools/ui-e2e/out/agent-logs/h03h05-life-negative.log`
- 正常日誌: `tools/ui-e2e/out/agent-logs/h03h05-life-clean.log`
- 說明: 0.5 分鐘短跑僅驗證工具錯誤捕捉與快取欄位，不作長時間記憶體洩漏之判定。

## 3. 最終驗證結果

| 命令名稱 | 逾時 | 結束碼 | 耗時 | 結果摘要 |
| --- | --- | --- | --- | --- |
| `h03h05-lint` | 120s | EXIT=0 | 6s | tsc --noEmit 通過無報錯 |
| `h03h05-test` | 300s | EXIT=0 | 11s | 90 files / 708 tests 全部通過 |
| `h03h05-build` | 180s | EXIT=0 | 3s | 303 modules transformed, production build 成功 |
| `h03h05-doc-final` | 120s | EXIT=0 | 2s | DocDrift 3 passed（repo 路徑、方框檔頭、已移除欄位） |

## 4. 未完成事項與邊界說明
- A0 歷史清冊仍有大量項目未人工核實，保留既有計畫之定義、「待確認」與 P/D 暫定狀態。
- F02 移動目標採樣／結算、F03 UPDATE_SKILL 驗證、COORD01 景深殘差與 T01/K01/K02 待後續處理。
- 奧義重新設計（50 個奧義有差異化結果、詠唱不得少於 1.5 秒）為後續待做需求，完成後才跑平衡。
- 程式碼若有回退需求：回退點為開工 commit `269b53f898d687e4da5505f93e8091ce4a516e21`。
