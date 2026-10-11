# 渲染效能第二輪基準與進度追蹤 (PERF_BASELINE_2.md)

> **專案分支**: `perf/render-opt` (HEAD: `60ac4e0` 後續)  
> **測試機硬體**: AMD Ryzen 7 7800X3D (8C/16T, 63.2GB RAM), AMD Radeon(TM) Graphics / NVIDIA RTX 4070 (ANGLE D3D11), Windows 11  
> **執行期間**: 2026-10-11 ~  
> **核心目標**: 戰鬥／Showcase 殘餘成本突破、Canvas 原生操作診斷（`shadowBlur`, `save/restore`, `globalCompositeOperation`）、矩陣雨分階減載、光暈預烘焙（預設關閉）、烘焙渲染架構藍圖。

---

## 1. 任務進度 (Task Progress)

| 任務 ID | 說明 | 狀態 | Commit | 備註 |
| :--- | :--- | :---: | :--- | :--- |
| **Q0** | 建立 `PERF_BASELINE_2.md` + 改前基準 (profile/ab/showcase/階段耗時拆解) | ☑ | `1359a4b` | 基準確立，battle 與 showcase 瓶頸定位於 native 合成與 Canvas 呼叫 |
| **Q1** | Canvas 操作計數器 (`CtxOpCounter.ts` 零成本診斷) | ☑ |  | 依 ?perfops 計數主畫布操作：每幀 66 次 shadowBlur (units 56%, hud 36%) |
| **Q2** | 單位／VFX 保真護欄覆蓋 (`battle_frozen` / 靜態測試場景) | ⏳ |  | 決定性 0 差異驗證 + perf:guard 整合 |
| **Q3a** | 矩陣雨減載 (`useMatrixRain.ts` tier≥1 0.5x/30Hz, tier≥2 停繪) | ⏳ |  | 階層 0 完全等價，Showcase 耗時實測下降 |
| **Q3b** | 單元測試 + [E2E] 兩次驗證 | ⏳ |  | getMatrixRainBudget 單元測試 + e2e 兩次綠 |
| **Q4a** | 光暈烘焙器 (`GlowSpriteCache.ts` 旗標預設關) | ⏳ |  | 離屏預烘焙 shadowBlur，單元測試覆蓋 |
| **Q4b** | 套用排名前 ≤3 shadowBlur 呼叫點 (≥15% 門檻) | ⏳ |  | 旗標關時 0 差異，旗標開 A/B 數據驗證與並排截圖 |
| **Q4c** | 冒煙測試 (?glow=1) + [E2E] 兩次驗證 | ⏳ |  | 冒煙驗證 + e2e 兩次綠 |
| **Q5** | 「烘焙渲染」藍圖 (`docs/BAKED_RENDERING_DESIGN.md`) | ⏳ |  | 純設計文件：Token/VFX/地形分層/圖集規格 |
| **Q6** | 真機量測腳本 (`npm run perf:headed`, 輸出 json/markdown) | ⏳ |  | 單鍵真機量測整合 |
| **Q7** | 改後重量測與進度更新 | ⏳ |  | 對照表與殘餘熱點排名 |
| **REPORT** | 完成報告 (`docs/PERF_REPORT_2.md` + DECOUPLING_HANDOFF §10.5) | ⏳ |  | 完整報告落檔 |
| **FINAL** | 全量驗證 (lint/test/build/e2e*2/guard) + 本地 tags | ⏳ |  | 打上 checkpoint tags |

---

## 2. 執行環境資訊 (Machine Info)

- **CPU**: `AMD Ryzen 7 7800X3D 8-Core Processor` (16 logical threads)
- **RAM**: `63.2 GB`
- **GPU (WebGL/Direct3D11)**: `ANGLE (AMD, AMD Radeon(TM) Graphics (0x0000164E) Direct3D11 vs_5_0 ps_5_0, D3D11)` (本輪 headless 採樣預設由 ANGLE D3D11 驅動)
- **OS**: Windows 11 (`win32 10.0.26300`)
- **Node.js**: v22.14.0
- **測試解析度**: 1440×900, DPR 1 (`?quality=0`)

---

## 3. 改前基準：CPU Profile 採樣分析 (PERF_SECONDS=6, headless)

> 數據來源：`node tools/ui-e2e/perf-profile.mjs`

### 3.1 三大場景摘要對照

| 場景 | rAF 幀率 | 幀平均耗時 (avg) | p95 幀耗時 | max 幀耗時 | Top 1 檔案占比 | Top 1 JS 函式 (Self) |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`manual_idle`** (地圖純閒置) | 59.7 FPS | **16.76 ms** | 16.8 ms | 50.0 ms | `(native)` 98.3% | `drawImage @ native` 2.4% (148.6ms) |
| **`manual_battle`** (實戰 6 單位對決) | 34.0 FPS | **29.43 ms** | 66.7 ms | 116.7 ms | `(native)` 92.2% | `drawImage @ native` 4.4% (266.1ms) |
| **`showcase`** (循環展示+矩陣雨) | 26.1 FPS | **38.29 ms** | 83.2 ms | 83.4 ms | `(native)` 94.3% | `drawImage @ native` 2.5% (154.4ms) |

### 3.2 `manual_battle` Top 15 函式 Self-Time
| 排名 | 函式與位置 | Self Time (ms) | 占總 CPU % | 說明 |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `(idle) @ (native):0` | 4620.8 ms | 76.2% | VSync / 幀間等待 |
| 2 | `(program) @ (native):0` | 474.7 ms | 7.8% | 瀏覽器內部合成、光柵化與排版 |
| 3 | `drawImage @ (native):0` | 266.1 ms | 4.4% | 主畫布 Sprite 繪製 |
| 4 | `getHexAtWorldPoint @ GridSpatial.ts:9` | 90.3 ms | 1.5% | 空間索引查詢 |
| 5 | `fill @ (native):0` | 44.1 ms | 0.7% | Canvas 填充 |
| 6 | `save @ (native):0` | 41.7 ms | 0.7% | Canvas 狀態保存 |
| 7 | `(garbage collector) @ (native):0` | 35.0 ms | 0.6% | GC 回收 (維持極低) |
| 8 | `restore @ (native):0` | 19.7 ms | 0.3% | Canvas 狀態恢復 |
| 9 | `getVertices @ HexGeometry.ts:3` | 19.3 ms | 0.3% | 六角網格頂點快取取用 |
| 10 | `getHexAtWorldPoint @ grid.ts:19` | 15.9 ms | 0.3% | 網格空間查詢 |
| 11 | `exports.jsxDEV @ react_jsx-dev-runtime.js` | 15.4 ms | 0.3% | React 開發態開銷 |
| 12 | `draw @ BillboardPainter.ts:4` | 14.5 ms | 0.2% | VFX 告示牌渲染 |
| 13 | `getGrassSprite @ VFXFactory.ts:181` | 14.4 ms | 0.2% | 草地精靈快取 |
| 14 | `stroke @ (native):0` | 13.1 ms | 0.2% | Canvas 描邊 |
| 15 | `dispatch @ RenderDispatcher.ts:11` | 10.5 ms | 0.2% | 渲染命令派發 |

> **核心發現**：
> 1. JS 純程式碼在整個幀中僅占不到 8% 總時間，**所有單一 JS 函式 self-time 均 ≤1.5%**。
> 2. 瓶頸高度集中於 **瀏覽器 Native 渲染操作**（`drawImage`, `save`, `restore`, `fill`, `stroke` 以及瀏覽器 compositor/rasterizer）。

---

## 4. 改前基準：5 大地形場景 A/B 測量 (`perf:ab`, PERF_SECONDS=6, 交錯兩輪)

> 數據來源：`node tools/ui-e2e/perf-ab.mjs` (DPR 1, 1440×900, ?quality=0)

| 場景 | baseline | no_tone_grade | no_terrain_grain | no_grade_no_grain | no_backdrop_filter |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **VOID** | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms |
| **FOREST** | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms |
| **ICE** | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms |
| **MAGMA** | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms |
| **DESERT** | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms | 16.7 ms |

> **說明**：
> 第一輪優化（P1a 地形 Sprite 快取）已將地形閒置純渲染開銷全數壓制至 60 FPS 封頂線（16.7ms / 59.7 FPS），在閒置模式下 5 大場景均已達到螢幕滿幀基準。

---

## 5. 改前基準：Showcase 模式 A/B 測量 (`PERF_MODE=showcase perf:ab`, ROUNDS=3)

> 數據來源：`$env:PERF_MODE="showcase"; node tools/ui-e2e/perf-ab.mjs`

| 實驗變體 | 平均耗時 (avgMs) | 等效幀率 (FPS) | 相對 Baseline 節省 |
| :--- | :---: | :---: | :---: |
| **baseline** | **28.36 ms** | 35.3 FPS | 基準 (0.0%) |
| **no_backdrop_filter** | **22.08 ms** | 45.3 FPS | **-6.28 ms (-22.1%)** |
| **no_matrix_rain** | **18.53 ms** | 54.0 FPS | **-9.83 ms (-34.7%)** |
| **no_both (全關)** | **17.71 ms** | 56.5 FPS | **-10.65 ms (-37.6%)** |

> **核心發現**：
> 1. Showcase 的最大效能殺手正是**全螢幕矩陣雨**（獨立 Canvas，`mix-blend-screen` 混合模式），單項即貢獻了 **~9.8 ms**（占整幀開銷 35%）！
> 2. `backdrop-filter` 次之，占 **~6.3 ms**（22%）。
> 3. 兩者若在低階/降階模式適度節流或減載，可立即將 Showcase 幀率從 35 FPS 拔升至 54~56 FPS。

---

## 6. 改前基準：渲染管線各階段耗時拆解 (`tools/ui-e2e/perf-stages.mjs`, `?perf`)

> 藉由 RenderStats 與 `drawWorld` 內部計時測量（EMA 平滑，5 秒採樣）：

| 場景 | Background | World (整體) | ↳ Submit | ↳ Sort | ↳ Dispatch/Draw | Post (色調+動態模糊) | Overlay + HUD |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`manual_idle`** | 0.050 ms | 0.034 ms | 0.035 ms | 0.011 ms | ~0.000 ms | 0.080 ms | 0.009 ms |
| **`manual_battle`** | 0.032 ms | 0.209 ms | 0.161 ms | 0.062 ms | ~0.000 ms | 0.102 ms | **0.522 ms** |
| **`showcase`** | 0.021 ms | 0.314 ms | 0.222 ms | 0.095 ms | ~0.000 ms | 0.111 ms | **0.283 ms** |

> **深入洞察（回答 Q0 目標）**：
> 1. **JS 呼叫耗時極低**：`RenderPipeline.draw()` 的純 JavaScript CPU 計時總和在 `manual_battle` 僅約 **0.86 ms**。
> 2. **World 階段內部拆解**：`submit` 佔 ~0.16 ms，`sort` 佔 ~0.06 ms。
> 3. **Overlay + HUD 是 JS 端耗時最大宗**：占 0.522 ms（超過 world + post + background 的總和）。
> 4. **戰鬥中 29 ms 總幀時間的剩餘 ~28 ms 到底在哪裡？**
>    - 邏輯端：AI 行為樹、物理、碰撞檢測、Damage 計算在 `engine.tick()` 執行。
>    - 繪圖端：**Canvas 指令在由瀏覽器 GPU/軟體光柵處理時的 Native 開銷**（例如每幀數十處 `shadowBlur` 產生的羽化光柵計算、頻繁的 `save/restore` 狀態切換、以及在獨立圖層上的 full-viewport compositing）。
>    - 這充分印證了 Q1 與 Q4 的方向：必須針對 **Canvas Native 操作呼叫次數與成本**（特別是 `shadowBlur`、`save/restore`、`drawImage`）進行量化與快取替換！

---

## 7. Q1 診斷結果：Canvas 操作計數與 Painter 分組統計 (`?perf&perfops`)

> 數據來源：`tools/ui-e2e/perf-ops-breakdown.mjs` 在 `manual_battle` 實戰 6 單位對決下採樣（EMA 平滑）：

### 7.1 每幀 Native Canvas 操作次數總覽

| 操作類別 | 每幀平均次數 (EMA) | 說明與潛在瓶頸分析 |
| :--- | :---: | :--- |
| **`save / restore`** | **968.1 次** | 地形 (345) + VFX (241) + 單位 (170) 頻繁狀態隔離；Context 堆疊切換頻繁 |
| **`drawImage`** | **506.8 次** | 地形塊 (269) + 粒子/VFX (110) + 危害 (57) + 單位組件 (43) + 障礙物 (13) |
| **`fill`** | **322.1 次** | 單位渲染 (152) + 背景 (50) + HUD 槽位/血條 (52) + 覆蓋層 (42) |
| **`globalCompositeOperation`** | **224.4 次** | VFX 加算混合 (`lighter`) (116) + 覆蓋層 (42) + 單位 (38) + 危害 (19) |
| **`stroke`** | **159.9 次** | 單位邊框 (59) + 覆蓋層 (42) + 狀態光環 (26) + HUD (19) + 地形 (14) |
| **`shadowBlur (>0)`** | **66.4 次** | **關鍵發現**：**92.4% 集中於 `units` (37 次) 與 `hud` (24 次)**！|
| **`createGradientOrPattern`** | **53.0 次** | 單位組件即時漸層 (23 次) + HUD 即時漸層 (19 次) + 狀態 (6 次) |

---

### 7.2 各 Painter / 渲染作用域詳細操作分組矩陣

| 渲染作用域 (Scope) | `shadowBlur` | `save/restore` | `drawImage` | `fill` | `stroke` | `gco` 變更 | `grad` 建立 | 作用域耗時 (EMA) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`units`** (單位本體/光環) | **37** (56.1%) | 170 | 43 | 152 | 59 | 38 | 23 | *(包含於 world)* |
| **`hud`** (血條/數值/文字) | **24** (36.4%) | 58 | 4 | 52 | 19 | 0 | 19 | **0.260 ms** |
| **`silhouette`** (剪影) | 3 (4.5%) | 10 | 0 | 3 | 3 | 0 | 0 | 0.016 ms |
| **`status`** (狀態效果環) | 1 (1.5%) | 7 | 0 | 13 | 26 | 4 | 6 | 0.060 ms |
| **`terrain`** (地形塊) | 0 (0.0%) | **345** | **269** | 1 | 14 | 0 | 0 | *(包含於 world)* |
| **`vfx`** (粒子/特效) | 0 (0.0%) | **241** | 110 | 2 | 0 | **116** | 0 | *(包含於 world)* |
| **`hazard`** (地面危害) | 0 (0.0%) | 76 | 57 | 0 | 0 | 19 | 0 | *(包含於 world)* |
| **`overlay`** (六角網格疊層) | 0 (0.0%) | 42 | 0 | 42 | 42 | 42 | 0 | *(包含於 world)* |
| **`background`** (星空背景) | 0 (0.0%) | 1 | 5 | 50 | 0 | 1 | 1 | 0.035 ms |
| **`post`** (後處理/色調) | 0 (0.0%) | 1 | 1 | 0 | 0 | 0 | 0 | **0.608 ms** |
| **`submit` (管線收集)** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0.190 ms** |
| **`sort` (深度排序)** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **0.130 ms** |
| **每幀總計** | **~66 次** | **~968 次** | **~507 次** | **~322 次** | **~160 次** | **~224 次** | **~53 次** | — |

---

### 7.3 Q1 關鍵發現與對 Q4 的指導意義

1. **`shadowBlur` 集中度極高**：
   - 全幀 66 次非零 `shadowBlur` 中，**單位渲染組裝 (`units`) 佔 37 次 (56%)**，**HUD (`hud`) 佔 24 次 (36%)**。
   - 兩者合計佔全畫面的 **92.4%**！
   - 這直接為 **Q4b** 指明了最精準的靶心：**`BarPainter`（HUD 血條/護盾光暈）** 與 **`units`（單位光環/高光光暈）**，只要處理這兩個點，就能消除整幀超過 90% 的即時 `shadowBlur` 軟體光柵負擔！
2. **`save/restore` 數量龐大**：
   - 每幀近 1000 次 `save/restore`，地形（345 次）與 VFX（241 次）佔據前兩名。這是日後「烘焙渲染圖集（Q5）」的一大消除空間。
3. **`drawImage` 成為主要繪圖途徑**：
   - 地形（269 次）與 VFX（110 次）均走 Sprite 快取，證實了第一輪 P1 的快取策略方向正確。

