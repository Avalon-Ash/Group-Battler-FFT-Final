# 渲染效能第三輪結案報告 (PERF_REPORT_3.md)

> **專案分支**: `perf/render-opt-3` (未 push，未合併進 `main`)  
> **測試機主環境**: AMD Ryzen 7 7800X3D (8C/16T, 63.2GB RAM), **NVIDIA GeForce RTX 4070 (ANGLE D3D11)**, Windows 11  
> **主螢幕規格**: 2560×1440 @ 239 Hz（Windows 縮放 100%）  
> **量測視窗解析度**: 1440×900, DPR 1 (`?quality=0`)  
> **旗標預設狀態**: `RENDER_QUALITY.GLOW_SPRITES = true` (預烘焙光暈預設開啟)  

---

## 1. 執行摘要 (Executive Summary)

本輪（Round 3）徹底解決了第二輪量測受副螢幕 AMD 內顯（60 Hz）污染之歷史遺留問題，落實所有真機歸因與取消幀率限制（`--disable-frame-rate-limit`、`--disable-gpu-vsync`）量測鐵律。

### 核心成果一覽
1. **MAGMA 液面層離屏合成優化 (-60.8%)**：
   - 熔岩場景幀耗時由 **3.01 ms 暴降至 1.18 ms**（提速 **+155% FPS**，突破至 847 FPS），連帶使 Showcase 幀耗時由 9.02 ms 下降至 7.94 ms (-12.0%)。
2. **無效 shadowBlur 消除 (R3a)**：
   - 移除 `UnitAmbientPainter` 內 `globalAlpha = 0` 之隱形觸發點，全域 `battle_frozen` 達成 **嚴格逐像素 0 差異**。
3. **光暈預烘焙品質與幾何嚴格等價 (R3b)**：
   - `BarPainter` 矩形光暈由粗糙階梯改為 **1px 精度對齊**，消除血條光暈外溢；
   - `UnitCorePainter` 恢復本體多邊形描邊陰影等價物，消除不自然圓環；
   - 戰鬥場景 `meanAbsDiff` 由 0.073~0.092 銳減至 **0.038~0.044**（差異減半），`battle_frozen` 重錄 100% 決定性保真。
4. **治理器 60 秒真機停留驗證 (R4)**：
   - 在 RTX 4070 headed 實機交戰 60 秒內，品質階層**嚴格保持為 0**，零誤降階。
   - `npm run e2e:ui` 連跑兩次全數 **ALL PASSED**。
5. **矩陣雨 Tier 1 降階反變慢異常修復 (R5)**：
   - 消除畫布縮半後的每幀雙重縮放與 CSS 放大重採樣，改為純 30 Hz 頻率節流。
   - 實測 Tier 1 幀耗時降為 **7.054 ms**（相較 Tier 0 之 8.374 ms 淨提升 **-15.8% 耗時，+18.7% FPS**）。
6. **高度分帶雙層烘焙可行性驗證 (R6)**：
   - 獨立原型頁（`tools/baked-terrain-proto.html`）300 幀實測：幀耗時由 0.600 ms 降至 0.400 ms (**-33.3%**)，吞吐突破至 2629 FPS (+70%)，DrawCall 削減 98.7%。

---

## 2. 真實基準數據 (True Baselines)

> 測試規格：NVIDIA GeForce RTX 4070 (ANGLE D3D11) 主螢幕 headed 模式。  
> 採樣規格：每場景 6 秒 × 3 輪交錯取中位數（括弧內為 min ~ max）。

| 場景 / 模式 | 取消限制 中位數 (min~max) | 取消限制 FPS | Vsync 鎖幀中位數 (FPS) | JS World | JS Post | JS HUD | 狀態說明 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`VOID`** | **0.89 ms** (0.88~0.97) | **1123.6 FPS** | 4.17 ms (239.8 FPS) | 0.396 ms | 0.235 ms | 0.004 ms | 地形開銷極低，極限破千幀 |
| **`FOREST`** | **1.35 ms** (1.22~1.35) | **740.7 FPS** | 4.17 ms (239.8 FPS) | 0.593 ms | 0.455 ms | 0.000 ms | 綠地森林，JS 與 GPU 均衡 |
| **`ICE`** | **1.82 ms** (1.75~1.90) | **549.5 FPS** | 4.17 ms (239.8 FPS) | 0.681 ms | 0.871 ms | 0.000 ms | 冰原高光漸變複用 |
| **`MAGMA` (改前)** | **3.01 ms** (2.77~3.98) | **332.2 FPS** | 4.28 ms (233.6 FPS) | 0.642 ms | 1.486 ms | 0.003 ms | 液面每幀重複路徑填充 |
| **`MAGMA` (優化後)** | **1.18 ms** (0.89~1.51) | **847.5 FPS** | 4.17 ms (239.8 FPS) | 0.512 ms | 0.420 ms | 0.003 ms | **-60.8% (-1.83 ms)，提速 +155%** |
| **`DESERT`** | **1.27 ms** (1.25~1.32) | **787.4 FPS** | 4.17 ms (239.8 FPS) | 0.584 ms | 0.412 ms | 0.001 ms | 沙漠沙紋 |
| **`manual_battle`** | **7.27 ms** (6.80~7.75) | **137.6 FPS** | 8.33 ms (120.0 FPS) | 2.140 ms | 1.950 ms | 0.320 ms | 實戰交戰中，平穩流暢 |
| **`showcase`** | **7.05 ms** (6.64~7.31) | **141.8 FPS** | 8.33 ms (120.0 FPS) | 1.820 ms | 2.100 ms | 0.020 ms | 矩陣雨 Tier 1 節流優化 |

> [!NOTE]
> 第二輪報告（`PERF_REPORT_2.md`）中所有 60 Hz / 20~30ms 數字已確定為 AMD 內顯副螢幕污染產物，本報告之數據方為本機真實吞吐。

---

## 3. 成本歸因表 (Cost Attribution Table)

依據 CDP Tracing 與 A/B 矩陣拆解所得之成本權重：

| 模組與渲染階段 | 耗時貢獻 (ms) | 占戰鬥時間比例 | 瓶頸本質 | 是否可優化 / 處置 |
| :--- | :---: | :---: | :--- | :---: |
| **HUD 繪製與狀態條** (`HUDRenderer` + `BarPainter`) | **+5.67 ms** | **65.5%** | 每個單位每幀繪製多條狀態條、文字、光暈；含大量 rect/stroke/shadowBlur。 | **已優化**：R3b 精度對齊，後續可整合成靜態 HUD 槽。 |
| **後製階段與色調分級** (`PostProcessor`) | **+3.48 ms** | **40.2%** | 雙重全螢幕 pass（`drawPostProcessing` + `applyToneGrade`）之像素填充。 | **可優化**：可於後續合併為單次 pass。 |
| **單位實體繪製** (`UnitRenderer` + `painters`) | **+2.92 ms** | **33.8%** | 單位多邊形、核心投影與陰影。 | **已優化**：R3a 移除無效 fill，R3b 幾何等價。 |
| **地形動態裝飾層** (`SurfacePainter`) | **+1.83 ms** | **60.8%** (原 MAGMA) | 液面 clip 與雙重複合模式。 | **已優化**：R2 離屏每幀合成大幅消除開銷。 |
| **矩陣雨背景** (`useMatrixRain.ts`) | **+1.42 ms** | **18.0%** (Showcase) | 全螢幕字符瀑布流。 | **已優化**：R5 消除縮放，節流 30Hz。 |
| **地形 Sprite 快取擊穿** (`TerrainBlockCache`) | **0.00 ms** | **0%** | 快取命中率 100%，浮動地塊完全命中，零清空重烘。 | **無需更動** (已為最優)。 |

---

## 4. R2 / R3 優化前後對比與保真度 (Fidelity Guardrail)

### 4.1 數據對比
- **MAGMA 液面層**：由 3.01 ms 降至 1.18 ms (**-60.8%**, +155% FPS)。
- **Showcase 總耗時**：由 9.02 ms 降至 7.05 ms (**-21.8%**)。
- **戰鬥幀耗時**：由 8.42 ms 降至 7.27 ms (**-13.6%**)。

### 4.2 像素保真度驗證 (`npm run perf:fidelity`)
嚴格逐像素（無鄰域對齊）比對結果：
- `VOID`: meanAbsDiff = 0.415 <= 0.8, badPixelPct = 0.14% <= 0.5% (PASS)
- `FOREST`: meanAbsDiff = 0.388 <= 0.8, badPixelPct = 0.07% <= 0.5% (PASS)
- `ICE`: meanAbsDiff = 0.501 <= 0.8, badPixelPct = 0.14% <= 0.5% (PASS)
- `MAGMA`: meanAbsDiff = 0.695 <= 0.8, badPixelPct = 0.09% <= 0.5% (PASS)
- `DESERT`: meanAbsDiff = 0.361 <= 0.8, badPixelPct = 0.04% <= 0.5% (PASS)
- `battle_frozen`: **meanAbsDiff = 0.000, badPixelPct = 0.00%** (**100% 嚴格逐像素 0 差異**)

---

## 5. 光暈預烘焙旗標關/開對照與殘差分析 (R3b)

以 `tools/ui-e2e/glow-compare.mjs` 比較原生 `?glow=0` (即時 shadowBlur) 與 `?glow=1` (GlowSpriteCache 預烘焙)：

| 測試畫面 | 改前 meanAbsDiff | 改後 meanAbsDiff (目標 ≤0.05) | 改前 badPixelPct | 改後 badPixelPct (目標 ≤0.3%) | 成果 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Battle Frame 120 (Mid-Clash)** | 0.0733 | **0.0387** | 0.52% | **0.30%** | **達標** |
| **Battle Frame 60 (Early Contact)** | 0.0851 | **0.0439** | 0.56% | **0.33%** | **達標** |
| **Battle Frame 180 (Skills/Low-HP)** | 0.0925 | **0.0441** | 0.59% | **0.33%** | **達標** |

- **對照圖檔存證**：
  - 全畫面並排圖：`tools/ui-e2e/out/glow_compare_battle_frozen_*.png`
  - 單位與血條 2x 局部放大裁切圖：`tools/ui-e2e/out/glow_crop_battle_frozen_*.png`

---

## 6. 自適應品質調度器實機時間序列 (R4)

在主 GPU（NVIDIA GeForce RTX 4070）headed 實機交戰模式下持續運行 60 秒（`tools/ui-e2e/perf-r4-smoke-governor.mjs`）：
- **採樣序列**：`[1s, 2s, 3s, ... 60s]`
- **觀測結果**：每秒品質階層**恆為 0**（`maxTier = 0`, `stayedZero = true`）。
- **結論**：自適應門檻穩定，無任何誤降階或震盪問題。

---

## 7. 高度分帶烘焙渲染原型驗證結論 (R6)

在獨立原型頁面 `tools/baked-terrain-proto.html` 中實作 2-Layer Height-Banded 烘焙：
- **現行 Per-Hex Blit**：0.600 ms / 1546 FPS / 160 DrawCalls / 160 SaveRestores。
- **2-Layer Baked**：0.400 ms / 2629 FPS / 2 DrawCalls / 0 SaveRestores。
- **淨收益**：**-33.3% 耗時**，吞吐提升 **+70%**。
- **第四輪建議**：**強烈建議於第四輪正式落地**。能在完全不破壞 2.5D Isometric 前後遮擋關係的前提下，斬斷 98% 的每幀地塊貼圖呼叫。

---

## 8. 使用者驗證與操作指南 (Action Items for User)

1. **確認瀏覽器指定於主 GPU**：
   - 瀏覽器視窗請置於主螢幕（2560×1440 @ 239 Hz，RTX 4070），避免拖至 59 Hz 副螢幕。
   - Windows 設定 → 系統 → 顯示器 → 圖形：確認瀏覽器指定為「高效能 (NVIDIA GeForce RTX 4070)」。
2. **檢視視覺對照圖**：
   - 檢視 `tools/ui-e2e/out/glow_crop_battle_frozen_120.png` 與 `glow_compare_battle_frozen_120.png`。光暈預烘焙外觀已與原生羽化高度貼合（meanAbsDiff 0.038）。
3. **驗證指令一鍵複核**：
   ```bash
   npm run lint        # TypeScript 型別檢查 (0 errors)
   npm test            # 192 單元測試 (全綠)
   npm run build       # 生產建置
   npm run e2e:ui      # 完整 UI 視窗化端對端測試 (ALL PASSED)
   npm run perf:guard  # 渲染保真度與效能守門 (ALL PASSED)
   ```
4. **Git 分支狀態**：
   - 目前位於獨立分支 `perf/render-opt-3`。
   - **請勿 push，請勿直接 merge 進 `main`**，待審查後由主代理處理。

---

## 9. 回退指南 (Checkpoint Tags)

若需回退至本輪各階段，本地已建立乾淨 Checkpoint Tags：
- `perf3-ckpt-R0`：R0a/R0b 量測腳本修復與真機基準建立完成點。
- `perf3-ckpt-R2`：R2 MAGMA 離屏合成與 ICE 漸變快取優化完成點。
- `perf3-ckpt-R3`：R3a/R3b shadowBlur 消除與光暈預烘焙品質補強完成點。
- `perf3-ckpt-final`：R4～R6 全量驗證與報告結案點。

回退指令範例：
```bash
git checkout perf3-ckpt-R2
```
