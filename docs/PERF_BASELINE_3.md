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
| **R1** | 歸因：VOID/ICE/MAGMA 差異與戰鬥 vs 閒置真實差距（CDP Tracing, 快取命中率） | ⏳ |  | 深入歸因分析，輸出成本歸因表 |
| **R2** | 依 R1 決策優化目標（收益 ≥10%，最多 2 項，保真） | ⏳ |  | 寫入「R2 決策」，數據佐證 |
| **R3a** | 無風險小贏：移除無效 shadowBlur（UnitAmbientPainter 等） | ⏳ |  | `CtxOpCounter` 計數下降 + 嚴格逐像素 0 差異驗證 |
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

## 6. 初步觀察與 R1 歸因線索

1. **閒置場景吞吐驚人**：在 RTX 4070 上，VOID、FOREST、DESERT 的真實每幀耗時僅 0.89 ~ 1.35 ms（740 ~ 1120 FPS），Vsync 下被釘死在 4.17 ms（240 FPS）。
2. **MAGMA 與 ICE 耗時突顯**：MAGMA（3.01 ms）耗時是 VOID（0.89 ms）的 3.4 倍！從 RenderStats 看，MAGMA 的 `post` 階段高達 1.486 ms（佔比近半），遠高於 VOID 的 0.235 ms。
3. **戰鬥模式（manual_battle）主要開銷在 Post (3.33ms) 與 World (1.85ms)**：實戰 6.61 ms（151 FPS）相較閒置有顯著增加，需深入分析光暈、技能遮罩、血條以及單位繪製的具體分項。
