# 地形島嶼底座修正報告（2026-10-17）

分支：`claude/terrain-foundation-75c7db`。對應 HANDOFF §3 D 的已知問題「島嶼左下底部被切成平線」。

## 根因（有證據）
1. **基座深度與島形無關**：`TerrainRenderer.bakeBlock` 的側面深度是 `max(PEDESTAL_DEPTH=45, h+15)`，只看該格高度。`MapGenerator` 會把前景（畫面下方、左下）壓到 tier 0，所以整排前緣格都剛好延伸 45 單位 → 島底輪廓就是頂面輪廓平移 45 的一條平行線。高的格（右側）才會因 `h+15` 掛得很深，左右不對稱更凸顯左下那條「切線」。
2. **貼圖路徑的側面底端是水平矩形**：側面以多邊形 clip，但填色 `fillRect` 只填到 `y = currentPedestalDepth`，多邊形底端（頂點 y + 深度）那一條沒被填。程式繪製路徑（`fill()`）正確，貼圖路徑每欄底端都是水平切線。
3. 排除項：沒有 clip 矩形或背景層切掉；`Math.abs(offset) > 800` 只在轉場時剔除；快取鍵無關。

證據截圖：`tools/ui-e2e/out/terrain-base/before_*.png`（5 地形 × FLAT／POINTY）。

## 修法
- `GridCache` 在 `mapVersion` 變動時（與鄰格遮罩同時）算每格 `baseLevel`：只有前側有邊外露（該方向鄰格不存在）的格才 > 0；鐘形輪廓（島中央深、左右兩端淺）混入每格固定雜訊（`tileHash01`），量化成 1..15。其餘格底部必被前方格蓋住，維持舊基座（0）。
- `TerrainRenderer.bakeBlock`：外露格的側面延伸到依地形輪廓換算的深度；漂浮地形（VOID、MAGMA）每欄只有一個尖點（FLAT 在正前面底端中點、POINTY 在前頂點），其餘頂點停在 `shoulder` 比例 → 鐘乳岩；地面地形（FOREST、ICE、DESERT）平底土台。延伸段以 `sideShadeFloor` 加暗。光照漸層錨點維持舊基座深度，所以非外露格與外露格上段畫面不變。側面填色改為涵蓋整個多邊形（修正根因 2）。
- 快取：`baseLevel` 進 sprite 鍵（bit 9-12）。漂浮位移早已改為繪製時平移、鍵內固定 0，因此漂浮欄位由 9 bit 縮為 5 bit（±8 px）讓出空間。每張地圖只多約 20 組 sprite；每幀成本不變（仍是每格一次 `drawImage`，漸層只在烘焙時建立）。
- 深度排序：延伸只往下、只在外露格，且繪製仍在同一個 TERRAIN op（排序鍵不變）。延伸段下方只有虛空；站在前方格的單位排序鍵較大，一定在後畫。`battle_frozen` 與 HEAD 的差異全部位於島底（y ≥ 443），單位與障礙物沒有變化。
- 動到的檔案（超過 3 檔，因為要從格快取一路傳到烘焙）：`constants.ts`、`engine/systems/grid/GridCache.ts`、`engine/renderers/RenderList.ts`、`engine/renderers/grid/GridRenderStrategy.ts`、`engine/renderers/RenderDispatcher.ts`（多傳一個參數）、`engine/renderers/grid/TerrainRenderer.ts`、`engine/renderers/grid/TerrainBlockCache.ts`、`engine/graphics/materials/NoiseLib.ts`（匯出 `tileHash01`）。Facade 未動。

## 截圖
`tools/ui-e2e/out/terrain-base/`（gitignored，用 `node tools/ui-e2e/terrain-base-shot.mjs --tag=<名稱> [--height=1100]` 重產）：
- `before_<LAYOUT>_<BIOME>.png`、`after_<LAYOUT>_<BIOME>.png`：預設鏡頭（1280×720）。
- `after_tall_<LAYOUT>_<BIOME>.png`：1280×1100，看得到整個島底。
- `sheet_FLAT_before_vs_after.png`、`sheet_POINTY_before_vs_after.png`：前後對照。
- `fdiff_<scene>.png`：保真場景與 HEAD 的差異（洋紅色＝變動像素）。

## 調整手冊（`constants.ts` → `TERRAIN_SKIN.foundation`）
| 參數 | 作用 |
| :-- | :-- |
| `profiles.<TYPE>.minDepth`／`maxDepth` | 外露格底端最淺／最深（世界單位，自地面基準起算）。加大 `maxDepth` → 中央岩錐更深 |
| `profiles.<TYPE>.tips` | `true` 鐘乳岩尖角、`false` 平底土台 |
| `profiles.<TYPE>.shoulder` | 尖角時兩側頂點延伸比例；越小尖角越尖長 |
| `profiles.<TYPE>.bottomShade` | 延伸段底端加暗 alpha |
| `defaultProfile` | 未列出的地形（目前 FOREST、ICE、DESERT） |
| `bellPower` | 鐘形輪廓：越小越平（整排都深）、越大越集中在中央 |
| `jitter` | 每格雜訊占比；越大底緣越參差 |
| `tipScales` | 依變體輪替的尖角長短倍率 |
| `halfWidthMargin` | 讓最外側格仍保有深度的餘裕 |
| `levels` | 量化級數（快取鍵 4 bit，上限 15） |

## 驗證
- `npm run lint`、`npx vitest run --dir tests`（新增 `tests/TerrainFoundation.test.ts`）、`npm run build` 全過。
- 保真：5 個地形基準與 `battle_frozen` 預期改變（只有島底）。基準在獨立 commit 重錄；門檻未改。
- 已知：預設鏡頭下島中央岩錐多半在畫面外，只看得到前緣；墜落中的地塊（縮圈）維持舊基座。

## 追加：整體化底座（fix/terrain-foundation-tidy）
使用者回報 VOID／MAGMA 的鐘乳尖刺像烘焙錯誤、少數欄位掛得過長。改為：所有地形 `tips: false`（平底六角柱端）、`bellPower` 1、`jitter` 0.05，漂浮圖深度 60～120、地面圖 55～100。底緣是中央略深的平緩輪廓，相鄰欄位深度差小。尖角程式碼與參數保留（`tips: true` 可還原），只是不再使用。截圖：`tidy_<LAYOUT>_<BIOME>.png`、`sheet_*_before_vs_tidy.png`（before 為修正前）。
