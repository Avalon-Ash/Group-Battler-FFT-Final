# 任務合約：地形 R2 —— 地表氛圍效果正式化（地表細節、熔岩液面、天氣粒子）

> 用法：分支 `feat/terrain-r2`，依序跑完 T0～T6。
> 你同時受 `AGENTS.md` 約束；本檔與 `AGENTS.md` 衝突時，**停下回報，不要自己選**。
> 主代理會逐行審查。最在意三件事：**① 每幀成本明顯下降 ② 畫面不比 R1 差，動畫仍然會動 ③ 沒動到範圍外的檔案**。

---

## 0. 開工檢查（不符合就停下回報）
1. `git branch --show-current` 是 `feat/terrain-r2`，且 `git status --short` 為空。
2. `npm run lint`、`npm test`、`npm run build` 全過。記下測試數量。

## 1. 背景（主代理已查證，直接採用）
地形上每幀即時繪製的「氛圍效果」有三處，**本輪全部正式化**：

| 效果 | 入口 | 現況 |
| :-- | :-- | :-- |
| 地表細節 | `TerrainRenderer.drawTerrainDetail` → `SurfacePainter` | 每格每幀畫：FOREST 草叢（每格 3 次 `drawImage`＋風擺）、ICE 冰面反光（每格 `clip`＋漸層＋線）、DESERT 沙紋（每格畫 3 條折線，**完全靜態**，只依螢幕座標決定變化）、VOID 紋路（`seed > 0.6` 的格貼一張 detail 圖，**靜態**） |
| 熔岩液面 | `TerrainRenderer.drawBlock` 內對 MAGMA 呼叫 `SurfacePainter.drawLiquid`；`HazardPainter` 也呼叫它 | 依 `RENDER_CACHE.LIQUID_TIME_STEP` 量化時間，每 0.05 秒重畫一次快取槽再逐格 `drawImage`；動作用 `sin(t*0.5)` 等非週期函數 |
| 天氣粒子 | `engine/systems/vfx/VFXAmbience.ts` | 依 `scene.ambientType` 生成 `ATMOSPHERE` 粒子；生成率、壽命、顏色、邊界（`cfg.w * 80 + 800`）全部寫死在程式裡 |

R0 量測（2560×1440、只有地形、不鎖幀率，中位數）：地表細節佔每幀 0.4～1.3 ms（FOREST 2.1→0.8 ms、DESERT 1.7→0.8 ms，約地形成本一半）；熔岩液面 0.2～0.5 ms；天氣粒子量不到差異。ICE 的 p99 有 19 ms，三個效果都關掉仍然存在，原因不明。量測腳本在 `tools/ui-e2e/out/r0-terrain-cost.mjs`（gitignored）。

## 2. 鐵律

### 2.1 正式化的定義
- **單一設定表**：新增 `data/vfx/terrainAmbience.ts`，以地形類型（`VOID FOREST ICE MAGMA DESERT`）為鍵，集中每個地形的：地表細節種類與參數、是否烘焙、動畫週期與影格數、液面顏色與參數；以及以 `ambientType`（`SNOW ASH EMBER SPORES SAND VOID`）為鍵的天氣參數（生成間隔、壽命、速度範圍、尺寸範圍、顏色、blend、邊界留白）。型別放 `types.ts`。程式碼裡**不得再出現**這些效果的寫死數值或顏色。
- **靜態的烘焙、動態的預渲染**：
  - 靜態細節（DESERT 沙紋、VOID 紋路）**烘進 `bakeBlock` 的地形 sprite**（畫在頂面貼圖與 grain 之後、R1 的邊緣處理之前）。變化改用既有的 `variant`（`variantFor(q, r, …)`），**不得再依螢幕座標**；VOID 的「只有部分格有紋路」改成依 `variant` 決定。不得新增 sprite key 位元。
  - 動態效果改成**預渲染的循環影格**：新增一個循環影格快取（例如 `engine/renderers/grid/TerrainLoopAtlas.ts`），第一次用到時把一個完整週期畫成 N 張小 canvas（N、週期取自設定表），之後每格每幀**只做一次 `drawImage`**，影格索引 = `floor((globalTime mod 週期) / 週期 × N)`。動作函數必須改成以週期為基準的週期函數，**頭尾影格要能無縫銜接**。
    - ICE 冰面反光：預渲染 N 張已裁成六角形的反光圖。執行期不得再 `clip`、不得建立漸層。
    - FOREST 草叢：把 3 叢草預先合成同一張圖（每個 `variant` 一張），風擺做成 N 張影格（或以影格決定的整數位移）。每格每幀 1 次 `drawImage`。
    - 熔岩液面：`drawLiquid` 的**簽名保持不變**（`HazardPainter` 也在用），內部改為從循環影格取圖，不再每 0.05 秒重畫。快取依（顏色、layout、量化後的 intensity）分槽，槽數上限放 `RENDER_CACHE`。
- **天氣粒子**：`VFXAmbience` 改讀設定表。依 `RenderQuality` 階層乘上 `VFX_BUDGET.TIER_EMISSION_RATIOS`（與其他非關鍵特效一致），並加上同時存在的 `ATMOSPHERE` 粒子數上限（參數放設定表）。順便確認 `state.getParticle()` 之後又 `state.particles.push(p)` 是否造成重複加入；若是，修正並在報告寫明證據。

### 2.2 效能
- `drawTerrainDetail` 與 `drawLiquid` 每格每幀最多 1 次 `drawImage`，不准 `clip`、建立漸層、`shadowBlur`、畫路徑或配置字串、物件。
- 預渲染只在第一次需要時做，之後不得再重畫（除了 `terrainTextureStore` 改版或設定改變）。

### 2.3 範圍（只准改這些；超過就停下回報）
`data/vfx/terrainAmbience.ts`（新）、`types.ts`（只加型別）、`constants.ts`（只加 `RENDER_CACHE` 欄位）、`engine/renderers/grid/TerrainRenderer.ts`、`engine/renderers/grid/TerrainLoopAtlas.ts`（新，名稱可調）、`engine/graphics/painters/SurfacePainter.ts`（只改 `drawLiquid`、`drawGrass`、`drawIceSheen`、`drawSandRipples`、`drawDetailTexture`）、`engine/graphics/VFXFactory.ts`（只為草叢合成圖與地形 detail 圖）、`engine/systems/vfx/VFXAmbience.ts`、新測試 `tests/TerrainAmbience.test.ts`、工具 `tools/ui-e2e/terrain-cost.mjs`（新）與 `tools/ui-e2e/terrain-contrast.mjs`（只加功能）、保真基準（只在 T5）、報告 `docs/TERRAIN_R2_REPORT.md`。
> 超過 `AGENTS.md`「單次改動 ≤3 檔」，主代理已核准；每個任務一個 commit。

### 2.4 受保護（一個字都不准改）
`AGENTS.md`、`CLAUDE.md`、`.claude/**`、`docs/HANDOFF.md`、`README.md`、`package*.json`、`public/assets/**`、`art-source/**`、`engine/renderers/grid/painters/HazardPainter.ts`、`GridCache.ts`、`TerrainBlockCache.ts` 的 key 打包、R1 的光照與邊緣處理參數（`TERRAIN_SKIN`）、單位與 UI 相關檔案、`tools/ui-e2e/style-baseline.json`、`tools/ui-e2e/perf-baseline.json`。

### 2.5 其他
- 不准 `as any`、魔術數字、硬編碼顏色。保持各檔原本的行尾（多數原始檔是 CRLF）。
- 不准合併 `main`、不准 push。

---

## 3. 任務

### T0 · 量測工具
把 `tools/ui-e2e/out/r0-terrain-cost.mjs` 複製成 `tools/ui-e2e/terrain-cost.mjs` 並納入版本控制：
- 修正粒子數讀取路徑（R0 版讀到 `-1/0`，找出正確的 `ATMOSPHERE` 粒子計數方式）。
- 預設 `ROUNDS=3`，輸出 `tools/ui-e2e/out/terrain_cost.json`，表格同時列中位數與 p99。
- 跑一次當基線（main 上的 R1 狀態），把表格寫進報告草稿。
Commit：`tools(terrain): T0 terrain cost probe`。

### T1 · 設定表與天氣粒子
建立 `data/vfx/terrainAmbience.ts` 與型別；先把**現有**數值原封不動搬進去（天氣、地表細節、液面），讓 `VFXAmbience` 改讀設定表並加上品質階層係數與上限。除了品質階層與上限之外，畫面不得改變。
Commit：`feat(terrain): T1 ambience config table + weather particles`。

### T2 · 靜態細節烘焙（DESERT 沙紋、VOID 紋路）
依 §2.1 烘進 `bakeBlock`。`drawTerrainDetail` 對這兩種地形不再做事。
Commit：`feat(terrain): T2 bake static surface detail`。

### T3 · 循環影格（ICE、FOREST、熔岩液面）
依 §2.1 實作。新增 `tests/TerrainAmbience.test.ts`：① 影格索引在 `globalTime` 跨過週期時回到 0 且不越界；② 同一設定第二次取用不重畫（計數器驗證）；③ 設定表涵蓋 5 個地形與 6 種天氣，數值皆為有限正數；④ `drawLiquid` 簽名未變。
Commit：`feat(terrain): T3 pre-rendered loop frames for ice / grass / liquid`。

### T4 · 驗證（不改程式）
1. `npm run lint`、`npm test`、`npm run build` 全過。
2. `terrain-cost.mjs` 重跑。**驗收**：FOREST、DESERT、ICE、MAGMA 四個地形，「全部開啟」的中位數與 T0 基線相比，地表細節＋液面造成的成本（`baseline − no_all`）**至少下降 60%**。做不到就停下回報數字，不准放寬。
3. 畫面：
   - 用 `terrain-contrast.mjs --grid`（或同等方式）產生 R1（`main` 的保真基準）對 R2 的對照圖 `tools/ui-e2e/out/terrain_r2_grid.png`。
   - 每個有動畫的地形（ICE、FOREST、MAGMA）在同一位置截 4 張（週期的 0、¼、½、¾），拼成 `tools/ui-e2e/out/terrain_r2_anim.png`，證明動畫仍在動、且不是每格同時閃爍跳格。
4. `npm run perf:ab -- --assert` 必須通過。
5. 開 dev 頁實際進戰場（任選一張有天氣的地圖），截一張圖存在 `tools/ui-e2e/out/`，確認深度順序與天氣粒子正常。
6. **ICE p99 調查**（只調查、只報告）：在 ICE 地圖用 `?perf` 的尖峰記錄（`window.__PERF_SPIKES__`）或 CDP trace 找出 19 ms 尖峰的來源，寫進報告。若根因在本輪範圍內的檔案，可以修；在範圍外就只報告，不准修。

### T5 · 重錄保真基準（使用者已同意）
T0～T4 全部通過後：刪除 `tools/ui-e2e/baseline/fidelity/` 下 6 張 PNG，`npm run perf:fidelity:record`，再 `npm run perf:fidelity` 確認全過，`npm run perf:guard` 必須通過。**這個 commit 只能有這 6 張 PNG。** Commit：`test(fidelity): T5 re-record baselines for R2 ambience`。

### T6 · 報告
`docs/TERRAIN_R2_REPORT.md`，**不超過 120 行**：T0 與 T4 的成本表、每個效果改成什麼方式、對照圖與動畫圖檔名、粒子重複加入的調查結果、ICE p99 調查結果、回退指南（每個 commit 的 hash 與 `git revert` 順序）、調整手冊（想改哪個效果時改設定表的哪個欄位）。
Commit：`docs(terrain): T6 R2 report`。

---

## 4. 本輪不得做的事
- 不改 R1 的光照、邊緣遮罩、快取 key。
- 不改危害區（`HazardPainter`）的繪製方式；它只是自動受益於 `drawLiquid` 變快。
- 不換貼圖素材、不改單位、UI、其他 VFX。
- 不為了通過驗收去放寬門檻，或重錄 T5 以外的基準。
