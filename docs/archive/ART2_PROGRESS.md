# ART2_PROGRESS.md — 美術修正輪（座標／BGM／熔岩效能／切除舊管線）進度追蹤

> **環境說明**：當前於 AI Studio 容器環境執行（工作目錄無 `.git` 遠端倉庫與本機 Edge/Playwright/239Hz 螢幕）。所有 `git tag` / `git commit` / `git push` 與需本機瀏覽器之 E2E / Fidelity / Perf 量測將詳實記錄於「未驗證項」，待主代理於本機驗收執行；每個任務均嚴格執行 `npm run lint`、`npm test`、`npm run build` 全綠驗證。

| 任務 | 狀態 | Commit / 階段標識 | 驗證結果 (`lint` / `test` / `build`) | 未驗證項（待主代理本機驗證） |
| :--- | :--- | :--- | :--- | :--- |
| **Pre (開工檢查)** | DONE | `pre-art-fix2` (基準點) | `lint`: PASS (0 errors)<br>`test`: PASS (29 files, 276 tests)<br>`build`: PASS | 本機 `git tag pre-art-fix2 && git push origin pre-art-fix2`；本機 `npm run perf:guard` |
| **T1 (單位大小與貼地座標修正)** | DONE | `fix(art2): T1 unit scale compensation, foot ground anchor and shield bounds` | `lint`: PASS (0 errors)<br>`test`: PASS (34 tests in SpriteAtlas & SpriteUnitRenderer)<br>`build`: PASS | 本機 `npm run perf:fidelity:record` 重錄 `battle_frozen` 並產出 `tools/ui-e2e/out/art_before_after_t1.png`；驗證 5 地形 baseline 0 差異 |
| **T2 (BGM 疊音根治與空 catch 清除)** | DONE | `fix(art2): T2 BGM singleton ref-count, active source mutex and audio catch cleanup` | `lint`: PASS (0 errors)<br>`test`: PASS (23 tests in AudioEngine & AudioSystem)<br>`build`: PASS | 本機 `git commit` + `git push origin main`；本機瀏覽器開啟 `?perf` 連續操作 BGM 切換確認無疊音 |
| **T3 (熔岩場景快取計數與液面抖動優化)** | DONE | `perf(art2): T3 terrain cache hit/miss/eviction stats, capacity expansion and multi-slot liquid cache` | `lint`: PASS (0 errors)<br>`test`: PASS (15 tests in TerrainBlockCache & RenderStats)<br>`build`: PASS | 本機 `git commit` + `git push origin main`；本機 `npm run perf:fidelity` 確認 MAGMA/VOID 0 差異；本機 `?perf` 量測 MAGMA p99/1% low |
| **T4 (切除舊程序化視覺管線與統一載入閘門)** | DONE | `refactor(art2): T4 remove legacy procedural faction/terrain/particle fallbacks and unify asset gate` | `lint`: PASS (0 errors)<br>`test`: PASS (29 files, 287 tests)<br>`build`: PASS | 本機 `git commit` + `git push origin main`；本機 `npm run perf:guard` 驗證載入與畫面正常 |
| **T5 (尖峰幀極輕量環狀緩衝診斷)** | DONE | `perf(art2): T5 lightweight spike ring buffer, __PERF_SPIKES__ and ?perf summary line` | `lint`: PASS (0 errors)<br>`test`: PASS (29 files, 288 tests)<br>`build`: PASS | 本機 `git commit` + `git push origin main`；本機 `?perf` 檢查 `window.__PERF_SPIKES__` 與面板尖峰摘要行 |
| **T6 (最終驗收與文件回填)** | DONE | `docs(art2): T6 update AGENTS.md SSOT references and finalize ART2_PROGRESS.md` | `lint`: PASS (0 errors)<br>`test`: PASS (29 files, 288 tests)<br>`build`: PASS | 本機執行最終完整驗收清單（詳見下方）並 `git push origin main` |

---

## 待主代理於本機執行之最終驗收步驟（Local Verification Checklist）

由於 AI Studio 容器環境無 `.git` 遠端倉庫與本機硬體加速瀏覽器（239Hz 螢幕 / Playwright Chromium），請於本機拉取或套用變更後依序執行以下指令完成最終簽核：

1. **Git 分支與防護標籤**
   ```bash
   git checkout main
   git tag pre-art-fix2 && git push origin pre-art-fix2
   ```
2. **T1 凍結戰鬥基準重錄與前後對比圖**
   ```bash
   # 先備份舊 battle_frozen.png，重錄後拼接產出 tools/ui-e2e/out/art_before_after_t1.png
   npm run perf:fidelity:record
   npm run perf:fidelity
   ```
   - 確認 5 個地形基準（`VOID`、`FOREST`、`ICE`、`MAGMA`、`DESERT`）維持 **0 像素差異**。
   - 目視確認 `tools/ui-e2e/out/art_before_after_t1.png`：10 種單位（`BLUE`/`RED` × `TANK`/`WARRIOR`/`RANGER`/`MAGE`/`SUPPORT`）高度約為舊版 ~1.5x、腳底精確踩在格心 `surfaceY`、血條緊貼頭頂、護盾球完整包覆身體。
3. **全套自動化品質護欄**
   ```bash
   npm run lint
   npm test
   npm run build
   npm run perf:guard
   npm run test:ui
   ```
4. **本機實機 `?perf` 音訊與熔岩場景驗證**
   - 開啟 `?perf` 連續進行「開戰 → 換圖 → 編輯模式 → 再開戰 → 調整音量」5 次以上，確認 `AudioEngine.getActiveBgmCount() <= 1` 且無任何疊音。
   - 切換至 `MAGMA` 熔岩場景開戰觀察 30 秒，確認 `1% low >= 95 FPS`（目標 `>= 120 FPS`）、`max1s <= 18ms`，並可透過控制台 `window.__PERF_SPIKES__` 檢視尖峰幀快照。
5. **推送至遠端 `main`**
   ```bash
   git push origin main
   ```
