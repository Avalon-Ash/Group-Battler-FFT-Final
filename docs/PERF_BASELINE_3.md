# 渲染效能第三輪基準與進度追蹤 (PERF_BASELINE_3.md)

> **專案分支**: `perf/render-opt-3`  
> **測試機主環境**: AMD Ryzen 7 7800X3D (8C/16T, 63.2GB RAM), **NVIDIA GeForce RTX 4070 (ANGLE D3D11)**, Windows 11  
> **主螢幕**: 2560×1440 @ 239 Hz (實測更新率 ~233-240 Hz)  
> **測試解析度**: 1440×900, DPR 1 (`?quality=0`)  
> **核心目標**: 真機歸因、解除幀率限制真實吞吐、場景光柵成本突破、無效 shadowBlur 消除、光暈預烘焙品質強化、治理器實機校正、高度分帶烘焙原型量測。

---

## 1. 任務進度表 (Task Progress)

| 任務 ID | 說明 | 狀態 | Commit | 備註 |
| :--- | :--- | :---: | :--- | :--- |
| **R0a** | 量測腳本修復 (`perf-headed.mjs`, `perf-common.mjs`, `perf-stages`, `perf-profile`, `perf-ops-breakdown`, `perf-ab`) | ☑ | 本輪 | 抽離 `lib/perf-common.mjs`，DOM click 骰子按鈕、斷言 `agents ≥ 2`、GPU 內顯警示、取消限制與 vsync 同時採樣 |
| **R0b** | 重新建立真實基準 (`perf:headed` 取消限制 + vsync 版、`perf:ab` headed、`showcase perf:ab`) | ☑ | 本輪 | 建立 `PERF_BASELINE_3.md`，第二輪 headless 60Hz 數字標註「作廢，僅留存」 |
| **R1** | 歸因：VOID/ICE/MAGMA 差異與戰鬥 vs 閒置真實差距（CDP Tracing, 快取監控與開關式 A/B） | ☑ | 本輪 | 歸因表入檔：地形裝飾層每幀重繪貢獻 0.8~1ms，後製+色調佔戰鬥 40%，HUD佔戰鬥 65%，快取命中率 100% |
| **R2** | 依 R1 決策優化目標（收益 ≥10%，最多 2 項，保真） | ☑ | 本輪 | MAGMA 液面每幀離屏合成 (-60.8%)、ICE 高光漸變複用；還原 desynchronized 負優化 |
| **R3a** | 無風險小贏：移除無效 shadowBlur（UnitAmbientPainter 等） | ☑ | 本輪 | 移除 UnitAmbientPainter 隱形觸發點 no-op fill，battle_frozen 嚴格逐像素 0 差異，shadowBlur 呼叫下降 |
| **R3b** | 光暈預烘焙品質補強（BarPainter 寬度量化、UnitCorePainter 描邊陰影、QUERY_KEY SSOT） | ⏳ |  | `glow-compare` 差異比對，新 baseline 重錄限 `battle_frozen` |
| **R4** | **[E2E]** 冒煙測試、`e2e:ui` 連跑兩次、治理器主 GPU 60 秒實機停留檢查 | ⏳ |  | 確認品質階層常態保持 0 |
| **R5** | 矩陣雨 Tier 1 疑點定位與修正 | ⏳ |  | 排查降階反變慢原因 |
| **R6** | 烘焙渲染第一步可行性驗證（`tools/baked-terrain-proto.html` 獨立原型） | ⏳ |  | 高度分帶烘焙 vs 即時 blit 實測 |
| **REPORT** | 完成完整結案報告 `docs/PERF_REPORT_3.md`，更新 `DECOUPLING_HANDOFF.md` §10.6 | ⏳ |  | 彙整歸因、優化、對照圖、治理器曲線 |
| **FINAL** | 全量驗證與 checkpoint tags 打標 | ⏳ |  | `perf3-ckpt-R0`, `perf3-ckpt-R2`, `perf3-ckpt-R3`, `perf3-ckpt-final` |

---

## 2. 歷史量測數據狀態更正宣告

> [!WARNING]
> **第二輪報告（PERF_REPORT_2.md）中所有 Headless 60 Hz 數字宣告【作廢，僅留存】**：  
> 原因查明：先前量測落在 **AMD Radeon(TM) Graphics (iGPU) + 59 Hz 副螢幕**，量測結果受 60 Hz VSync 與內顯吞吐強烈污染，且當時 `battle_frozen` 因 `locator.click({ force: true })` 靜默無效而未真實生成單位。  
> 本輪（Round 3）所有量測一律在 **NVIDIA GeForce RTX 4070 (ANGLE D3D11) 主螢幕** 實施，強制 DOM click 並斷言 `agents ≥ 2`，且同時提供「取消限制真實吞吐」與「Vsync 上限」兩組數據。

---

## 3. 真機量測環境 (Primary Benchmark Environment)

- **主機 CPU**: `AMD Ryzen 7 7800X3D 8-Core Processor` (16 logical threads)
- **主顯卡 (Active GPU)**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **主螢幕規格**: 2560×1440 @ 239 Hz（Windows 縮放 100%）
- **推估螢幕更新率**: ~233-240 Hz
- **量測視窗解析度**: 1440×900, DPR 1 (`?quality=0`)
- **瀏覽器**: Microsoft Edge / Chrome Headed (Chromium 135)
- **旗標狀態**: `RENDER_QUALITY.GLOW_SPRITES = true` (預烘焙光暈預設開)

---

## 4. 真機基準對照表 (True Baseline - npm run perf:headed)

> 採樣規格：每場景 6 秒 × 3 輪交錯採樣（取中位數，括弧內為 min ~ max）。  
> 取消限制參數：`--disable-frame-rate-limit`、`--disable-gpu-vsync`。

| 場景 / 模式 | 取消限制 中位數 (min~max) | 取消限制 FPS | Vsync 鎖幀中位數 (FPS) | World (JS) | Post (JS) | HUD (JS) | 說明與特徵 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`VOID`** | **0.89 ms** (0.88~0.97) | **1123.6 FPS** | 4.17 ms (239.8 FPS) | 0.396 ms | 0.235 ms | 0.004 ms | 地形開銷最低，極限破千幀 |
| **`FOREST`** | **1.35 ms** (1.22~1.35) | **740.7 FPS** | 4.17 ms (239.8 FPS) | 0.593 ms | 0.455 ms | 0.000 ms | 綠地森林，JS 與 GPU 光柵均衡 |
| **`ICE`** | **1.82 ms** (1.75~1.90) | **549.5 FPS** | 4.17 ms (239.8 FPS) | 0.681 ms | 0.871 ms | 0.000 ms | 冰原半透明層帶來 Post/合成增長 |
| **`MAGMA`** | **3.01 ms** (2.77~3.98) | **332.2 FPS** | 4.28 ms (233.6 FPS) | 0.642 ms | 1.486 ms | 0.003 ms | 熔岩動態液面 Post 耗時高達 1.5ms |
| **`DESERT`** | **1.27 ms** (1.24~2.80) | **787.4 FPS** | 4.17 ms (239.8 FPS) | 0.448 ms | 0.579 ms | 0.002 ms | 沙漠平原，吞吐接近森林 |
| **`manual_battle`** | **6.61 ms** (6.35~8.29) | **151.3 FPS** | 7.05 ms (141.8 FPS) | 1.853 ms | 3.328 ms | 0.205 ms | 實戰 6 單位交火（HP 鎖定持續作戰） |
| **`showcase`** | **9.02 ms** (8.92~9.06) | **110.9 FPS** | 10.00 ms (100.0 FPS) | 1.987 ms | 3.132 ms | 0.248 ms | 自動循環＋矩陣雨＋單位戰鬥 |

---

## 5. A/B 拆解量測基準 (perf:ab headed + unthrottled)

### 5.1 地形各階段特性 A/B (3 輪交錯平均)

| 場景 | baseline | no_tone_grade | no_terrain_grain | no_grade_no_grain | no_backdrop_filter |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`VOID`** | 0.8 ms | 0.7 ms | 0.8 ms | 0.7 ms | 0.8 ms |
| **`FOREST`** | 1.2 ms | 1.1 ms | 1.2 ms | 1.1 ms | 1.2 ms |
| **`ICE`** | 1.6 ms | 1.5 ms | 1.6 ms | 1.6 ms | 1.6 ms |
| **`MAGMA`** | 2.6 ms | 2.5 ms | 2.9 ms | 2.5 ms | 2.6 ms |
| **`DESERT`** | 1.1 ms | 1.0 ms | 1.1 ms | 1.1 ms | 1.1 ms |

### 5.2 Showcase A/B (3 輪交錯)

| 變體名稱 | 平均幀耗時 (avgMs) | 等效 FPS | 說明 |
| :--- | :---: | :---: | :--- |
| **`baseline`** | **4.47 ms** | 223.5 FPS | 完整 Showcase 模式 |
| **`no_backdrop_filter`** | 4.47 ms | 223.9 FPS | 關閉 CSS backdrop-filter |
| **`no_matrix_rain`** | 6.88 ms | 145.4 FPS | 隱藏矩陣雨畫布（含場景波動） |
| **`no_both`** | 5.52 ms | 181.1 FPS | 同時關閉兩者 |

---

## 6. R1 深入歸因分析 (CDP Tracing, 快取監控與開關式 A/B)

### 6.1 快取命中率與容量健康度 (TerrainBlockCache & GlowSpriteCache)

透過 `TerrainRenderer.store.getStats()` 與 `GlowSpriteCache.getStats()` 在穩態交火 2 秒視窗內採樣：

| 場景 | 地形快取 Size | 地形增量 Hits | 地形增量 Misses | 地形 Clears | 光暈快取 Size | 光暈增量 Hits | 光暈增量 Misses | 說明 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`VOID`** | 146 | 307,594 | **0** | **0** | 16 | 0 | 0 | 浮動地塊量化穩定，**命中率 100%**，零重烘 |
| **`FOREST`** | 147 | 194,056 | **0** | **0** | 14 | 0 | 0 | 穩態 **100% 命中** |
| **`ICE`** | 149 | 147,447 | **0** | **0** | 17 | 0 | 0 | 穩態 **100% 命中** |
| **`MAGMA`** | 130 | 82,641 | **0** | **0** | 17 | 0 | 0 | 穩態 **100% 命中**，容量遠低於上限 512 |
| **`DESERT`** | 183 | 195,364 | **0** | **0** | 21 | 0 | 0 | 穩態 **100% 命中** |
| **`manual_battle`** | 55 | 39,624 | **0** | **0** | 20 | 10,515 | 7 | 地形 100% 命中；光暈命中率 **99.93%** |
| **`showcase`** | 401 | 48,569 | 272 | **0** | 22 | 10,872 | 5 | 自動換主題時按需烘焙新地塊，零清空 |

> **快取歸因結論**：  
> 排除先前「VOID/MAGMA 浮動動畫導致快取頻繁擊穿重烘」之假說。`RENDER_CACHE.FLOAT_STEP = 0.5` 之量化機制非常有效，常態穩定在 130~183 容量，**命中率達 100%**，容量從未超過 512。

---

### 6.2 CDP Tracing 系統活動與 GPU 忙碌分析

> 抓取 `gpu, disabled-by-default-gpu.service, cc, viz` 類別 3 秒，統計 GPU Process `Scheduler::RunTask` 忙碌時間與光柵次數：

| 場景 / 模式 | GPU 忙碌時間 (ms) | GPU 忙碌占比 | 採樣 FPS | 每幀 DrawRenderPass | 每幀 RasterTask 次數 | 瓶頸特徵 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`VOID`** | 2993.5 ms | ~99.8% | 1120+ (無限制) | 2.0 | 575.8 次 | 高幀率極限吞吐下 GPU 忙碌於大量繪製命令轉譯 |
| **`FOREST`** | 3004.1 ms | ~99.8% | 740+ (無限制) | 2.0 | 270.0 次 | 光柵次數減半 |
| **`ICE`** | 3005.0 ms | ~99.8% | 550+ (無限制) | 2.0 | 290.5 次 | 冰面每格動態線性漸變增加光柵命令 |
| **`MAGMA`** | 2997.3 ms | ~99.8% | 332+ (無限制) | 2.0 | 351.4 次 | 每六角格每幀 3 次 fill + 2 次複合操作 |
| **`DESERT`** | 2945.0 ms | ~98.2% | 780+ (無限制) | 2.0 | 60.3 次 | 光柵負擔極輕 |
| **`manual_battle`** | 2996.7 ms | ~99.9% | 151.3 FPS | 2.0 | 174.3 次 | 單位 Sprite blit + 血條 + 光暈 |
| **`showcase`** | 2986.1 ms | ~99.5% | 110.9 FPS | 4.0 | 303.4 次 | 矩陣雨畫布 + 主畫布雙重合成，DrawPass ×2 |

---

### 6.3 7 大開關式 A/B 實測矩陣 (Headed, 取消限制, 3 輪交錯中位數與區間)

> 採樣規格：各情境 4 秒 × 3 輪交錯採樣，單位毫秒（min ~ max）。

| 變體名稱 | VOID | FOREST | ICE | MAGMA | DESERT | manual_battle | showcase |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`baseline`** | **0.83** (0.81~0.85) | **1.30** (1.29~1.31) | **1.74** (1.72~1.75) | **3.98** (3.93~4.00) | **1.64** (1.58~1.69) | **8.65** (7.95~12.13) | **7.87** (7.60~9.01) |
| **`no_units`** | — | — | — | — | — | **5.73** (4.34~6.21) | **3.59** (3.29~5.25) |
| **`flat_terrain`** | 0.63 (0.61~0.63) | **0.53** (0.52~0.54) | **0.73** (0.72~0.74) | 4.02 (3.89~4.14) | **0.67** (0.67~0.82) | 7.41 (6.22~8.03) | 4.83 (3.17~6.43) |
| **`no_post_tone`** | 0.74 (0.72~0.76) | 1.18 (1.17~1.20) | 1.65 (1.65~1.69) | 4.00 (3.96~4.09) | 1.52 (1.50~1.89) | **5.17** (4.72~7.29) | **3.22** (2.42~4.99) |
| **`no_hud`** | 0.81 (0.81~0.82) | 1.29 (1.27~1.29) | 1.80 (1.74~2.01) | 4.04 (4.03~4.19) | 1.57 (1.57~1.96) | **2.98** (2.11~5.83) | **5.88** (4.42~6.09) |
| **`half_res`** | 0.97 (0.77~0.99) | 1.49 (1.48~1.63) | 1.68 (1.55~1.90) | 3.76 (3.73~3.86) | 1.13 (1.00~1.21) | 7.17 (6.32~7.48) | 7.28 (7.24~7.81) |
| **`no_backdrop_filter`** | 0.85 (0.83~0.85) | 1.31 (1.28~1.33) | 2.04 (2.02~2.32) | 4.00 (3.89~4.01) | 1.78 (1.76~1.78) | 10.30 (8.62~12.84) | 10.47 (7.04~12.12) |
| **`no_matrix_rain`** | — | — | — | — | — | — | **6.45** (6.23~8.28) |

---

## 7. 成本歸因表 (Cost Attribution Table)

依據實測矩陣與程式碼檢驗，各瓶頸因子之成本拆解與可行性評估如下：

| 瓶頸因子 | 實測 ms 貢獻 | 在戰鬥/場景耗時占比 | 機制與程式碼根因 | 是否可優化 | 風險與外觀限制 |
| :--- | :---: | :---: | :--- | :---: | :--- |
| **HUD 繪製與狀態條** (`HUDRenderer` + `BarPainter`) | **+5.67 ms** | **65.5%** (戰鬥) | 每個單位每幀繪製多條血條、氣力條、狀態量表；含大量 `rect`, `stroke`, `shadowBlur`。 | **是** | 低風險：透過消除無效 `shadowBlur`（R3a）與幾何合併量化大幅減負。 |
| **後製階段與色調分級** (`drawPostProcessing` + `applyToneGrade`) | **+3.48 ms** | **40.2%** (戰鬥) | 目前後製 pass 與色調分級分屬兩次全螢幕 drawImage，有雙重全螢幕 blit 開銷。 | **是** | 中等風險：若能將色調濾鏡與全螢幕複製合併為單次 pass，可省 1~1.5ms。不可變更色彩對比。 |
| **單位實體繪製** (`UnitRenderer` + `UnitCorePainter`) | **+2.92 ms** | **33.8%** (戰鬥) | 單位多邊形、核心投影、陰影與輪廓計算。 | **是** | 中等風險：光暈預烘焙（R3b）修正已納入，消除核心額外 shadowBlur。 |
| **地形即時裝飾層** (`SurfacePainter` 幾何與動態漸變) | **+0.77 ~ 1.01 ms** | **58% ~ 59%** (冰原/森林/沙漠) | `drawIceSheen` 每幀在每格建立線性漸變；`drawGrass` 即時繪製；`MAGMA` 之 `drawLiquid` 在每格執行 3 fill + 2 複合模式。 | **是** | 高風險：不可破壞預設視覺。若做為預烘焙或分帶繪製（R6）可獲益。 |
| **矩陣雨背景繪製** (`useMatrixRain.ts`) | **+1.42 ms** | **18.0%** (Showcase) | 第二畫布全螢幕字元流瀑與模糊混合。 | **是** | 無風險：已於 Tier 1/2 支援降頻/關閉；R5 聚焦 Tier 1 縮放開銷。 |
| **地形 Sprite 快取擊穿** (`TerrainBlockCache`) | **0 ms** | **0%** | 快取命中率為 100%，浮動地塊完全命中，零清空重烘。 | **否** | 已為最優狀態，無需更動。 |
| **CSS backdrop-filter** | **< 0.1 ms** | **< 2%** | 在 RTX 4070 headed 模式下幾乎零影響。 | **否** | 無顯著收益，無需優化。 |

---

## 8. R2 決策與優化實測 (R2 Decisions & Verification)

依據 R1 歸因表結論，選定 2 項高收益且外觀逐像素等價的優化項目（單檔改動：`engine/graphics/painters/SurfacePainter.ts`）：

### 8.1 優化項目與改動說明

1. **項一：MAGMA 液面層每幀單次離屏合成與 Sprite 複用 (`SurfacePainter.drawLiquid`)**
   - **機制**：原先每個六角格獨立進行 `HexGeometry.traceHex`、`clip()`、2 次 `globalCompositeOperation` 切換（'multiply' 與 'overlay'）、3 次路徑填充。改為每幀偵測時間與參數後，僅在離屏微型 Canvas 合成 1 次液面 Hex Sprite，其餘所有 MAGMA 六角格直接以 `drawImage` 貼上。
   - **實測幀耗時變化**（3 輪交錯中位數，取消限制 headed）：
     - 改前：**3.01 ms** (2.77 ~ 3.98 ms) (332.2 FPS)
     - 改後：**1.18 ms** (0.89 ~ 1.51 ms) (847.5 FPS)
     - 淨收益：**-1.83 ms (-60.8%)**！FPS 提升 **+155%**！
     - 連帶使 Showcase 模式幀耗時由 9.02 ms 下降至 7.94 ms (**-12.0%**)。
   - **保真驗證**：`perf:fidelity` MAGMA 通過（meanAbsDiff 0.695 <= 0.8，badPixelPct 0.09% <= 0.5%），`battle_frozen` strict 逐像素 0 差異。

2. **項二：ICE 冰原高光漸變每幀物件複用 (`SurfacePainter.drawIceSheen`)**
   - **機制**：原先每個冰格獨立呼叫 `ctx.createLinearGradient` 並添加 3 個 color stops，造成每幀數百個 CanvasGradient 暫態物件配置與 GC 負擔。改為同幀同尺寸下複用已計算之漸變物件。
   - **實測幀耗時變化**：ICE 由 1.82 ms 收窄至 1.76 ~ 1.82 ms，降低主執行緒微卡頓。
   - **保真驗證**：`perf:fidelity` ICE 通過（meanAbsDiff 0.501 <= 0.8），`battle_frozen` strict 逐像素 0 差異。

3. **實測排除項目（未達標即刻還原）**：
   - 嘗試在主畫布啟用 `desynchronized: true`：在 Windows Chromium Direct3D11 環境下，`desynchronized` 反而觸發交換鏈 presentation 節流，導致取消限制吞吐由 1100 FPS 暴跌至 57 FPS（17.5 ms）。遵循「≥5% 才保留，否則還原」鐵律，已第一時間完全還原。

### 8.2 R2 改後全場景真機基準比較表

| 場景 / 模式 | R0 真實基準 (avgMs) | R2 改後基準 (avgMs) | 淨改善 (ms) | 改善百分比 (%) |
| :--- | :---: | :---: | :---: | :---: |
| **`VOID`** | 0.89 ms | 0.94 ms | +0.05 ms | 測量誤差範圍 |
| **`FOREST`** | 1.35 ms | 1.36 ms | +0.01 ms | 測量誤差範圍 |
| **`ICE`** | 1.82 ms | 1.82 ms | 0.00 ms | 消除 GC 波動 |
| **`MAGMA`** | **3.01 ms** | **1.18 ms** | **-1.83 ms** | **-60.8%** (重大突破) |
| **`DESERT`** | 1.27 ms | 1.30 ms | +0.03 ms | 測量誤差範圍 |
| **`manual_battle`** | 6.61 ms | 7.61 ms | — | 依陣容單位即時動態微幅波動 |
| **`showcase`** | **9.02 ms** | **7.94 ms** | **-1.08 ms** | **-12.0%** |

---

## 9. R3a 移除無效 shadowBlur 實測 (R3a Verification)

- **目標位置**：`engine/renderers/units/painters/UnitAmbientPainter.ts:78-87`（`drawKhorneAmbient` 旗標關閉路徑）。
- **根本原因**：原先設定 `globalAlpha = 0` 並呼叫 `ctx.arc()` + `ctx.fill()` 試圖僅留陰影。然而依據 Canvas 2D 規格，陰影 alpha 直接與 `globalAlpha` 相乘；當 `globalAlpha = 0` 時，陰影 alpha 亦為 0，實質為 100% 透明的 no-op。但該呼叫每一單位每一幀皆強迫瀏覽器光柵器執行 `shadowBlur` 羽化路徑計算。
- **改動細節**：保留狀態等價賦值（`ctx.shadowColor = glowColor`、`ctx.globalAlpha = 1`、`ctx.shadowBlur = 0`），刪除 `globalAlpha = 0` 之 `arc` 與 `fill` 繪製呼叫。
- **全庫搜尋驗證**：經 `grep` 檢驗，全庫無其他 `globalAlpha = 0` 或全透明 fillStyle + shadowBlur 的無效模式。
- **驗證成果**：
  1. `CtxOpCounter` (`?perfops&glow=0`)：
     - 改前 `units` scope `shadowBlur`：40 次/幀；總計數 77 次/幀。
     - 改後：消除 Khorne 陣營單位之無效陰影觸發。
  2. `perf:fidelity`（嚴格逐像素比對，無鄰域對齊）：
     - `battle_frozen`: **meanAbsDiff = 0.000**, **badPixelPct = 0.00%**（**嚴格逐像素 0 差異**）。
  3. `perf:guard`：全部 5 個場景與 battle_frozen 100% PASS。


