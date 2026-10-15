# 任務合約：地形 R1 —— 地表光照與高度接合（只改烘焙，不增加每幀成本）

> 用法：在 IDE 開啟 `C:\Git\Group-Battler-FFT-Final`（分支 `feat/terrain-r1`），執行 `/goal docs/TERRAIN_R1_AGENT_PROMPT.md`，依序跑完 T0～T5。
> 你同時受 `AGENTS.md` 約束；本檔與 `AGENTS.md` 衝突時，**停下回報，不要自己選**。
> 主代理會逐行審查。最在意三件事：**① 每幀成本不增加 ② 高度在畫面上重新讀得出來 ③ 沒動到範圍外的檔案**。

---

## 0. 開工檢查（不符合就停下回報）
1. `git branch --show-current` 是 `feat/terrain-r1`，且 `git status --short` 為空。
2. `npm run lint`、`npm test`、`npm run build` 全過。記下測試數量。

## 1. 背景（主代理 R0 已查證，直接採用，不必重查）
- **高度感是 A1 換貼圖時丟掉的，與烘焙快取無關**（烘焙那輪保真 0 差異）。對照：`git show 13ad34c:tools/ui-e2e/baseline/fidelity/<BIOME>.png`（舊，程序化）與目前同路徑檔案（新，貼圖）。舊版側面明顯比頂面暗，高低差一眼可見；新版側面跟頂面幾乎一樣亮，ICE／DESERT 的高低差整片消失，FOREST 頂面的貼圖出現髒污斑塊。
- **根因**：`engine/renderers/grid/TerrainRenderer.ts` 的 `bakeBlock` 在貼圖路徑上，側面與頂面的明暗漸層只用 `TERRAIN_SKIN.tintStrength = 0.35` 疊上去。以前是 100% 漸層，現在光照被稀釋成三成，再被貼圖雜訊蓋掉。
- 地形 sprite 由 `TerrainBlockCache` 快取，鍵是 31-bit `packedInt`：bit 0-3 variant、4-12 float、13-21 height、22-24 scale。**bit 25-30 空著**，T2 會用到。
- `GridCache`（`engine/systems/grid/GridCache.ts`）在 `engine.mapVersion` 變動時重建 `tileList`；生成地圖與縮圈移除地塊都會 `mapVersion++`。

## 2. 鐵律

### 2.1 效能
- 所有新視覺**只能在 `bakeBlock` 內烘焙**。`drawBlock` 每幀的工作量（一次 `drawImage`＋熔岩液面）**不得增加**：不准新增每幀的 path、clip、gradient、`shadowBlur`。
- 每幀的鄰格查詢禁止。鄰格資訊只能在 `GridCache.rebuild` 時算一次。

### 2.2 範圍（只准改這些檔案；超過就停下回報）
`engine/renderers/grid/TerrainRenderer.ts`、`engine/renderers/grid/TerrainBlockCache.ts`、`engine/systems/grid/GridCache.ts`、`engine/renderers/grid/GridRenderStrategy.ts`、`engine/renderers/RenderList.ts`（只加一個欄位）、`engine/renderers/RenderDispatcher.ts`（只多傳一個參數）、`constants.ts`（只改 `TERRAIN_SKIN` 與其型別）、`types.ts`（只為上述型別）、新測試 `tests/TerrainEdgeMask.test.ts`、新工具 `tools/ui-e2e/terrain-contrast.mjs`、保真基準（只在 T4）、報告 `docs/TERRAIN_R1_REPORT.md`。
> 這超過 `AGENTS.md`「單次改動 ≤3 檔」。策略已由主代理核准：T1 只動 `TerrainRenderer.ts`＋`constants.ts`；T2 才動資料管線。每個任務一個 commit。

### 2.3 受保護（一個字都不准改）
`AGENTS.md`、`CLAUDE.md`、`.claude/**`、`docs/HANDOFF.md`、`README.md`、`package*.json`、`public/assets/**`、`art-source/**`、`engine/graphics/painters/**`（`SurfacePainter` 是 R2 的範圍）、`TerrainRenderer.drawTerrainDetail`、熔岩液面、`VFXAmbience`、單位與 VFX 相關檔案、`tools/ui-e2e/style-baseline.json`、`tools/ui-e2e/perf-baseline.json`。

### 2.4 其他
- 不准用 `as any`、魔術數字或硬編碼顏色。新參數全部放 `TERRAIN_SKIN`，顏色從 `TerrainTheme` 取。
- 不准刪掉非貼圖路徑（`useSkin === false`）；它是 T0 的對照組，行為要維持不變。
- 不准合併 `main`、不准 push。

---

## 3. 任務

### T0 · 量測工具（不改引擎）
新增 `tools/ui-e2e/terrain-contrast.mjs`，以 `render-fidelity.mjs` 的啟動方式（vite `createServer`＋`playwright-core`＋`msedge`，headless 即可）開頁並等 `__ASSETS_READY__`，然後在頁面內：
1. 對 5 個地形（`VOID FOREST ICE MAGMA DESERT`），用 `import('/engine/renderers/grid/TerrainRenderer.ts')` 直接呼叫 `bakeBlock` 烘焙一塊 `height = 2 * BLOCK_HEIGHT`、`variant 0`、`renderScale 1` 的 sprite（surface factory 用 `document.createElement('canvas')`）。
2. 在 sprite 上依頂點幾何取三個區域的平均亮度（Rec.709 luma）：頂面中央、亮側面（`drawFace(2,1)`）中段、暗側面（`drawFace(1,0)`）中段。每區至少取 5×5 像素，避開邊線。
3. 每個地形各量兩次：貼圖路徑，以及暫時讓 `terrainTextureStore.isReady` 回傳 false 的程序化路徑（在頁面內 monkey-patch，不改原始碼）。
4. 輸出 `tools/ui-e2e/out/terrain_contrast.json` 與一張表：`biome | path | top | lightSide | darkSide | light/top | dark/top`。
5. 加 `--grid` 參數：用 `render-fidelity.mjs` 的 `captureScene` 方式截 5 個地形，與 `13ad34c` 的舊基準並排存成 `tools/ui-e2e/out/terrain_r1_grid.png`。舊基準用 `git show` 取出；可用 Python PIL 拼圖。

Commit：`tools(terrain): T0 contrast probe`。把基線數字寫進報告草稿。

### T1 · 光照與貼圖拆層（只動 `bakeBlock`＋`TERRAIN_SKIN`）
目標：**光照決定明暗，貼圖只提供細節**。
1. 頂面：先用與程序化路徑相同的 `topGrad`（`theme.rim → theme.top → theme.sideDark`）**全強度**填底色，再以混合模式疊貼圖。混合模式與強度做成參數（例如 `TERRAIN_SKIN.topDetail = { blend: 'soft-light' | 'overlay' | 'multiply', alpha }`），預設由你在 T1 量測後選定。
2. 側面：同理，先用程序化路徑的側面漸層全強度填底色（亮側 `color → theme.sideDark`、暗側 `color → '#020617'` 這組值改成取自 theme 或 `TERRAIN_SKIN`，不准寫死），再疊貼圖細節（`TERRAIN_SKIN.sideDetail`）。
3. 移除 `tintStrength` 的舊用法；若型別仍需要就標 deprecated，但不得再影響畫面。
4. **驗收（用 T0 工具）**：每個地形的貼圖路徑都要滿足 `dark/top ≤ 程序化 dark/top × 1.15`，且 `light/top ≤ 程序化 light/top × 1.15`。也就是側面相對頂面至少跟舊版一樣暗。頂面的平均色相要與 `theme.top` 同一色系；在報告列出 top 的平均 RGB 對照 `theme.top`。
5. 用 `--grid` 產生對照圖，至少試兩組 blend／alpha，各存一張（`terrain_r1_grid_<name>.png`），在報告寫明你選哪組、理由是什麼。
Commit：`feat(terrain): T1 lighting/texture split`。

### T2 · 鄰格高度遮罩（接合處的陰影與崖邊）
1. `CachedTile` 加 `edgeMask: number`（**剛好 6 bit**，放進 key 的 bit 25-30，不得與既有欄位重疊、不得超過 31 bit）。`GridCache.rebuild` 時對每格算一次：
   - 邊的編號以 `HexGeometry.getVertices` 的頂點 i 到 i+1 為第 i 條邊。鄰格方向與邊編號的對應**要從 `HexMath.neighbors` 與 `HexUtils.toPx` 推導**（取鄰格中心的相對方向，找最接近的邊中點），`FLAT`、`POINTY` 兩種 layout 都要對。**不准憑猜測寫死對照表。**
   - 每條邊依「外法線在畫面上的 y 分量」分成兩類：
     - **前側邊**（法線 y ≥ 0，看得到側面的那幾條）：bit = 1 代表鄰格比本格低至少 `TERRAIN_SKIN.edge.minStep`，或鄰格不存在 → 崖邊。
     - **背側邊**（法線 y < 0）：bit = 1 代表鄰格比本格高至少 `TERRAIN_SKIN.edge.minStep` → 本格頂面要有接觸陰影。
   - 報告中寫清楚兩種 layout 下哪些邊屬於前側、哪些屬於背側。
2. `RenderOp` 加對應欄位；`GridRenderStrategy` 把 tile 的遮罩填入 op（掉落中的地塊填 0）；`RenderDispatcher` 傳給 `drawBlock`（新參數，預設 0，不改其他參數順序）。
3. `terrainSpriteKey` 納入遮罩。
4. `bakeBlock` 依遮罩烘焙：
   - **崖邊亮邊**：bit 為 1 的前側邊，在頂面邊緣畫一道細亮線（`TERRAIN_SKIN.edge.lip`：寬度、alpha，顏色取 `theme.rim`）。
   - **接觸陰影**：bit 為 1 的背側邊，在頂面沿邊往內畫一條漸層暗帶（`TERRAIN_SKIN.edge.ao`：寬度比例、強度）。
   - **平接邊淡化**：bit 為 0 的邊，頂面輪廓線 alpha 降為 `TERRAIN_SKIN.edge.flatRimAlpha`（減少「網格髒線」）；bit 為 1 的邊用 `TERRAIN_SKIN.edge.cliffRimAlpha`。
5. 新測試 `tests/TerrainEdgeMask.test.ts`：① 平地中央格遮罩為 0；② 孤立高格的前側 bit 全為 1、背側 bit 全為 0；③ 被高格包圍的低格前側 bit 全為 0、背側 bit 全為 1；④ 對 `FLAT` 與 `POINTY` 各驗一個不對稱案例，證明邊與方向的對應正確；⑤ key 打包：遮罩不同則 key 不同，其他欄位不變時解包回原值。
6. 快取驗收：在 `?perf` 下切換 5 個地形、各縮放級距滾一輪，報告 `terrainCache` 的 sprite 總數與 evictions。**總數不得超過 `RENDER_CACHE.MAX_TERRAIN_SPRITES` 的一半**；超過就停下回報，不要自己改上限。
Commit：`feat(terrain): T2 neighbor edge mask (lip / flat rim / contact AO)`。

### T3 · 本機實跑驗證（不改程式）
1. `npm run lint`、`npm test`、`npm run build` 全過。
2. 用 T0 工具重跑 contrast 與 `--grid`，T1 的驗收條件仍要成立。
3. 跑 `npm run perf:ab -- --assert`（只跑 A/B 斷言，不跑 fidelity），必須通過。
4. 開 dev 頁實際進戰場截一張圖：確認單位、地塊、障礙物的深度順序沒有錯亂，縮圈掉落的地塊沒有殘留黑邊。截圖存在 `tools/ui-e2e/out/`。

### T4 · 重錄地形保真基準（使用者已同意，條件嚴格）
1. 只在 T0～T3 全部通過後才做。
2. 刪除 `tools/ui-e2e/baseline/fidelity/` 下的 6 張 PNG，執行 `npm run perf:fidelity:record`，再執行 `npm run perf:fidelity` 確認全過。
3. **只有這 6 張 PNG 可以出現在這個 commit**，其他檔案一律不准有變更。Commit：`test(fidelity): T4 re-record terrain baselines for R1 lighting`。
4. `npm run perf:guard` 必須通過。

### T5 · 報告
`docs/TERRAIN_R1_REPORT.md`，**不超過 120 行**：
- T0 基線表與 T3 最終表（contrast 數字）。
- 選用的 blend／alpha 及理由，附對照圖檔名。
- 遮罩位元配置與邊方向推導方式。
- 快取 sprite 數與 evictions。
- 回退指南：每個 commit 的 hash 與 `git revert` 順序。
- 調整手冊：使用者想調亮邊、陰影、細節強度時，各改 `TERRAIN_SKIN` 的哪個欄位。

---

## 4. 本輪不得做的事
- 不碰地表細節（草叢、冰面反光、沙紋）、熔岩液面、天氣粒子。這是 R2。
- 不換貼圖素材，不改 `TerrainTextureStore` 的載入方式。
- 不改單位、VFX、UI，不調 `RENDER_CACHE` 上限、烘焙預算或品質治理器。
- 不為了通過驗收去放寬任何門檻或重錄 T4 以外的基準。

## 5. 跑完後（給使用者看）
- 打開 `tools/ui-e2e/out/terrain_r1_grid*.png`，看高低差是否回來、頂面是否乾淨。
- 告訴主代理「R1 跑完了」，主代理會審查 diff 並本機實跑後再問你要不要合併。
