# 渲染效能第四輪基準與追蹤記錄 (PERF_BASELINE_4.md)

> **專案分支**: `perf/render-opt-4` (由 `main` 開出，未 push，未合併)  
> **測試機主環境**: AMD Ryzen 7 7800X3D (8C/16T, 63.2GB RAM), **NVIDIA GeForce RTX 4070 (ANGLE D3D11)**, Windows 11  
> **主螢幕規格**: 2560×1440 @ 239 Hz（Windows 縮放 100%）  
> **量測視窗解析度**: 2560×1440, DPR 1 (`?quality=0&mute`)  
> **旗標預設狀態**: `RENDER_QUALITY.GLOW_SPRITES = true`  

---

## 1. 任務進度清單 (Task Checklist)

| 任務 | 內容 | 狀態 | Commit | 說明 |
| :--- | :--- | :---: | :---: | :--- |
| **P0a** | 幀時間分佈量測工具 (`tools/ui-e2e/perf-frames.mjs`, `perf:frames`) | ☑ | `78d40e8` | 2560×1440 headed, 20s × 3 輪交錯, CDP Tracing (GC/Timeline) |
| **P0b** | 修正 `?perf` HUD 的 FPS 算法、新增 1% low / max1s / total / JS 欄位並建立真實基準 | ☑ | (current) | 修正為 rAF 間隔滑動平均，HUD 與腳本誤差 0.13% (<5%) |
| **P1** | 特效盤點＋壓力情境產生器 (`docs/VFX_INVENTORY.md`, `lib/vfx-storm.mjs`) | ☐ | 待處理 | 盤點所有 VFX 類別、標註死碼與重複項 |
| **P2** | 逐項成本歸因（A/B 開關、每幀分配取樣、Canvas 操作排行榜、長幀成因） | ☐ | 待處理 | 依 CDP 與 CtxOpCounter 建立成本排行榜 |
| **P3a** | 依 P2 排行榜執行優化決策清單 (前項，≤4 項，預期 ≥8%) | ☐ | 待處理 | 烘焙/池化/無效渲染消除，嚴格保真驗證 |
| **P3b** | 執行優化決策清單剩餘項目 | ☐ | 待處理 | 每完成一項更新基準並驗證收益 |
| **P4** | 特效預算與自動降級（LOD / `VFX_BUDGET` / `RenderQuality` 整合）[E2E] | ☐ | 待處理 | 超出預算自動降級，e2e:ui 連跑兩次全綠 |
| **P5** | 治理器對照 239 Hz 真實體感（60秒停留無誤降階、健康門檻調適） | ☐ | 待處理 | 驗證抗抖動與降階後 p99 改善 |
| **REPORT** | 撰寫結案報告 `docs/PERF_REPORT_4.md`、補寫 `DECOUPLING_HANDOFF.md` §13 | ☐ | 待處理 | 完整對比、回退指南、美術建議 |
| **FINAL** | 全量驗證 (lint/test/build/e2e/perf:guard)，打本機 checkpoint tag | ☐ | 待處理 | 零 dirty，零 push |

---

## 2. 測試機環境與規格 (Test Rig Specifications)

```json
{
  "gpu": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)",
  "dpr": 1,
  "viewport": [2560, 1440],
  "screen": [2560, 1440],
  "refreshRate": 120,
  "windowSizeRequirementMet": true,
  "primaryGpu": "NVIDIA GeForce RTX 4070"
}
```

---

## 3. P0b: HUD FPS 算法修正與矛盾剖析

### 3.1 舊算法為何會出現「FPS 390」與體感矛盾
1. **舊算法原理**：
   - 位於 `hooks/useGameLoop.ts`：
     ```ts
     frameCount++;
     if (t - lastFpsTime >= 1000) {
         fpsRef.current = frameCount;
         frameCount = 0;
         lastFpsTime = t;
     }
     ```
   - 此算法僅為每 1000 毫秒區間內遞增之迴圈計數器，**完全忽視幀間實際時間間隔（rAF delta time）**。
2. **矛盾成因**：
   - 當使用者以取消幀率限制模式（或外接無 vsync 驅動環境）啟動時，若瀏覽器在一秒內呼叫 390 次 rAF，計數器即顯示 390。
   - 更嚴重的問題在於：即使在 vsync 模式下，若一秒前段爆發、後段遭遇 200ms 的嚴重掉幀卡頓，該算法僅顯示過去整秒的次數，無法即時反映幀延遲（frame pacing）與瞬時掉幀。
   - 且 HUD 原先未提供 **1% low FPS**、**近 1 秒最長幀 (max1s)**、**Frame Total 毫秒** 與 **JS 合計**，使開發者無從得知卡頓成因為渲染還是 JS。

### 3.2 新算法設計與改進
- **rAF 間隔滑動平均**：`RenderStats` 於每幀 `begin('background')` 自動採樣 `performance.now() - lastFrameStart`。
- **Sliding Average**：以最近 `RENDER_PERF.HISTORY_FRAMES`（60 幀）之移動平均計算當前真實 FPS（`1000 / avgDt`），平滑反映最新平穩幀率。
- **1% Low FPS**：採最近幀視窗中表現最差的 1% 幀耗時平均換算為 FPS，如實反映卡頓深度。
- **近 1 秒最長幀 (`max1sMs`)**：滾動掃描過去 1000ms 內出現之最大單幀耗時（ms），抓出瞬時尖峰。
- **Frame Total 與 JS 合計**：清楚拆解單幀總耗時與我方 JavaScript/Canvas 四大階段（background + world + post + overlay+hud）總耗時，立即判定瓶頸在 GPU 還是 JS。
- **無 `?perf` 畫面逐像素等價**：非診斷模式維持原有單行 `FPS: ${fps}` 格式，零像素外觀變更。

### 3.3 驗證：HUD vs 腳本獨立量測誤差
以 `scratch_verify_hud.mjs` 實測 5 秒持續交戰：
- 腳本獨立 rAF 滑動平均：**75.0 FPS** (avgDt = 13.33 ms)
- HUD `RenderStats.getHudStats()`：**74.9 FPS** (frameTotal = 13.36 ms)
- 誤差：**0.13%**（遠低於 <5% 驗證門檻，**PASS**）

---

## 4. 真實基準數據 (True Baselines: 2560×1440, DPR 1, RTX 4070)

> 採樣規格：每場景 20 秒 × 3 輪交錯取中位數（資料來源：`tools/ui-e2e/out/perf_frames.json`）。

| 情境 (20s × 3 輪) | Median (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Max (ms) | 1% Low FPS | FPS (avg) | >8.4ms 幀數 | >16.7ms 幀數 | GC 次數 / 耗時 (20s 均值) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`battle_calm`** | **8.4** | 12.6 | 16.7 | 20.9 | 54.2 | **34.5** | 100.8 | 2990 | 457 | 81.3 次 / 195.82ms |
| **`battle_vfx_storm`** | **8.4** | 12.6 | 16.7 | 20.8 | **62.5** | **39.3** | 97.6 | 2879 | 255 | 70.7 次 / 214.51ms |
| **`showcase`** | **8.3** | 12.5 | 12.5 | 16.7 | 33.4 | **54.8** | 132.6 | 1934 | 54 | 70.0 次 / 206.10ms |

### 基準現象觀察：
1. **2560×1440 壓力顯著**：相較於第三輪 1440×900，在 2560×1440 解析度下，戰鬥中位數幀時間約 8.4ms（約 120 FPS），但在特效齊發與一般交戰激烈時，1% Low 均跌破 40 FPS（34.5~39.3 FPS），最大長幀高達 **62.5 ms**（相當於 16 FPS 瞬間驟停）。
2. **長幀成因歸因**：CDP Trace 顯示所有 >16.7ms 之長幀其 GC/Layout/Paint 耗時皆為 0ms，瓶頸 100% 來自 **Canvas 繪製主線程腳本（Submit/Sort/Dispatch/Post/HUD）**，完全符合使用者回報的「全場各種特效齊發時掉幀」。
