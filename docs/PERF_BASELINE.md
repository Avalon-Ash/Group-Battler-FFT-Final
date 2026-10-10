# 渲染效能優化基準與進度追蹤 (PERF_BASELINE.md)

## 1. 執行環境資訊 (Machine Info)

- **CPU**: `AMD Ryzen 7 7800X3D 8-Core Processor` (16 logical threads)
- **RAM**: `63.2 GB`
- **GPU (WebGL/Direct3D11)**: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **OS**: Windows 11 (`win32 10.0.26300`)
- **Node.js**: v22.x
- **測試解析度**: 1440×900, DPR 1

---

## 2. 任務進度 (Task Progress)

| 任務 ID | 說明 | 狀態 | Commit | 備註 |
| :--- | :--- | :---: | :--- | :--- |
| **P0a** | 基準量測與腳本整合 (`perf:ab`, `perf:profile`, `PERF_BASELINE.md`) | ☑ | `1684a60` | 基準確立，地形顆粒占 36–45% 耗時 |
| **P0b1** | Perf overlay 基礎 (`RenderStats.ts`, `RENDER_PERF` 常數, 單元測試) | ☑ | `6841853` | enabled=false 零成本 early return |
| **P0b2** | `RenderPipeline` / `tactical.ts` 階段計時與 debug HUD 輸出 | ☑ | `b1981d4` | 無 ?perf 像素 0 差異 |
| **P0c** | 畫面保真護欄 (`render-fidelity.mjs`, baseline PNG, `perf:fidelity`) | ☑ | `13ad34c` | 決定性截圖比對 guardrail (tag: perf-ckpt-P0) |
| **P1a** | 地形 Sprite 快取 (`TerrainBlockCache.ts`, `TerrainRenderer.ts`) | ☑ | `9d7df40` | 核心優化：perf:fidelity 全過，耗時降 ~40% (差距 0%) |
| **P1b** | 地形快取單元測試 (`TerrainBlockCache.test.ts`) + [E2E] | ☑ |  | 快取邊界/命中率/LRU + e2e:ui 連兩次全過 (tag: perf-ckpt-P1) |
| **P2** | 重新 Profile (P1 之後殘餘熱點排名) | ☐ |  | docs only |
| **P3a** | 有上限的殘餘熱點修正 (1) | ☐ |  | 占比 ≥3% 且純等價 |
| **P3b** | 有上限的殘餘熱點修正 (2) | ☐ |  | 占比 ≥3% 且純等價 |
| **P4a** | 解析度 SSOT (`RenderQuality.ts`, `RENDER_QUALITY.MAX_DPR`) | ☐ |  | 4 檔授權，上限保護 |
| **P4b** | 畫布 DPR 實際接入 + `{ alpha: false }` + [E2E] | ☐ |  | e2e 全過，保真比對通過 |
| **P5a** | 自適應品質調度器 (`createQualityGovernor`) | ☐ |  | 降階/升階/釘死單元測試 |
| **P5b** | 調度器接線 (useGameLoop, PostProcessor, debug) + [E2E] | ☐ |  | quality=0/2/3 驗證 |
| **P6** | 每幀配置清理 (`RenderPipeline` occluded Set 等) | ☐ |  | GC 占比對照 |
| **P7** | UI `backdrop-filter` 與矩陣雨純量測 (`PERF_MODE=showcase`) | ☐ |  | 不改 CSS/TSX |
| **P8** | 效能棘輪 (`PERF_ASSERT=1`, `npm run perf:guard`, AGENTS.md) | ☐ |  | 自動防回歸守門 |
| **REPORT** | 完成報告 (`docs/PERF_REPORT.md` + `DECOUPLING_HANDOFF.md` §10.4) | ☐ |  | 完整驗證數據與建議 |
| **FINAL** | 全量驗證 (lint/test/build/e2e/guard) + 本地 tags | ☐ |  | clean repo |

---

## 3. 改前基準：A/B 特效開關測量 (PERF_SECONDS=3, 交錯兩輪平均 ms)

> 數據來源：`node tools/ui-e2e/perf-ab.mjs` (RTX 4070 D3D11, DPR 1, 1440×900)

| 場景 | baseline | no_tone_grade | **no_terrain_grain** | no_grade_no_grain | no_backdrop_filter | 地形顆粒節省比例 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **VOID** | 6.63 ms | 6.57 ms | **4.17 ms** | 4.17 ms | 6.28 ms | **37.1%** |
| **FOREST** | 7.68 ms | 7.71 ms | **4.61 ms** | 4.42 ms | 7.66 ms | **40.0%** |
| **ICE** | 8.24 ms | 7.91 ms | **4.53 ms** | 4.44 ms | 7.38 ms | **45.0%** |
| **MAGMA** | 8.48 ms | 8.34 ms | **5.38 ms** | 5.48 ms | 8.28 ms | **36.6%** |
| **DESERT** | 7.56 ms | 7.15 ms | **4.19 ms** | 4.19 ms | 7.12 ms | **44.6%** |

### 結論與發現
1. **地形顆粒 (clip + overlay) 依然是頭號瓶頸**：在 RTX 4070 真實 GPU 下，關閉地形顆粒可使每幀耗時直接縮減 **36.6% ~ 45.0%**，與 `docs/PERF_FINDINGS.md` 的排查完全吻合。
2. **色調分級 (tone grade)** 在 DPR 1 下平均僅耗 0.1~0.3 ms，但在高 DPR 下預計放大。
3. **UI backdrop-filter** 在閒置模式下影響約 0.2~0.4 ms。

---

## 4. 改前基準：CPU Profile 採樣分析 (PERF_SECONDS=6)

### 4.1 `manual_idle` (地圖純渲染 baseline, rAF 110.0 FPS, avg 9.09 ms, p95 12.5 ms)

#### Top 20 函式 Self-Time
| 排名 | 函式與位置 | Self Time (ms) | 占總 CPU % |
| :---: | :--- | :---: | :---: |
| 1 | `(idle) @ (native):0` | 3213.2 ms | 52.8% |
| 2 | `drawImage @ (native):0` | 806.7 ms | 13.3% |
| 3 | `(program) @ (native):0` | 427.6 ms | 7.0% |
| 4 | `fill @ (native):0` | 291.1 ms | 4.8% |
| 5 | `save @ (native):0` | 165.1 ms | 2.7% |
| 6 | `getVertices @ engine/graphics/utils/HexGeometry.ts:3` | 147.2 ms | 2.4% |
| 7 | `clip @ (native):0` | 117.3 ms | 1.9% |
| 8 | `(garbage collector) @ (native):0` | 100.0 ms | 1.6% |
| 9 | `paintSideGrain @ engine/graphics/materials/MaterialPainter.ts:56` | 87.1 ms | 1.4% |
| 10 | `restore @ (native):0` | 84.3 ms | 1.4% |
| 11 | `addColorStop @ (native):0` | 81.8 ms | 1.3% |
| 12 | `getGrainTile @ engine/graphics/materials/NoiseLib.ts:93` | 81.5 ms | 1.3% |
| 13 | `createLinearGradient @ (native):0` | 71.4 ms | 1.2% |
| 14 | `drawFace @ engine/renderers/grid/TerrainRenderer.ts:24` | 68.6 ms | 1.1% |
| 15 | `drawBlock @ engine/renderers/grid/TerrainRenderer.ts:11` | 54.6 ms | 0.9% |
| 16 | `paintTerrainGrain @ engine/graphics/materials/MaterialPainter.ts:39` | 47.1 ms | 0.8% |
| 17 | `translate @ (native):0` | 22.8 ms | 0.4% |
| 18 | `lineTo @ (native):0` | 19.9 ms | 0.3% |
| 19 | `drawTerrainDetail @ engine/renderers/grid/TerrainRenderer.ts:84` | 19.1 ms | 0.3% |
| 20 | `closePath @ (native):0` | 17.6 ms | 0.3% |

#### Top 10 檔案占比
| 排名 | 檔案 | 占總 CPU % |
| :---: | :--- | :---: |
| 1 | `(native)` | 89.6% |
| 2 | `engine/graphics/utils/HexGeometry.ts` | 2.5% |
| 3 | `engine/graphics/materials/MaterialPainter.ts` | 2.2% |
| 4 | `engine/renderers/grid/TerrainRenderer.ts` | 2.2% |
| 5 | `engine/graphics/materials/NoiseLib.ts` | 1.4% |
| 6 | `engine/renderers/RenderList.ts` | 0.3% |
| 7 | `engine/renderers/RenderDispatcher.ts` | 0.3% |
| 8 | `engine/renderers/grid/GridRenderStrategy.ts` | 0.2% |
| 9 | `engine/game.ts` | 0.2% |
| 10 | `engine/renderers/RenderPipeline.ts` | 0.1% |

---

### 4.2 `manual_battle` (6 單位對戰, rAF 50.9 FPS, avg 19.64 ms, p95 25.1 ms)

#### Top 20 函式 Self-Time
| 排名 | 函式與位置 | Self Time (ms) | 占總 CPU % |
| :---: | :--- | :---: | :---: |
| 1 | `(idle) @ (native):0` | 2934.9 ms | 48.2% |
| 2 | `(program) @ (native):0` | 884.0 ms | 14.5% |
| 3 | `drawImage @ (native):0` | 568.1 ms | 9.3% |
| 4 | `fill @ (native):0` | 196.8 ms | 3.2% |
| 5 | `save @ (native):0` | 144.1 ms | 2.4% |
| 6 | `getVertices @ engine/graphics/utils/HexGeometry.ts:3` | 105.0 ms | 1.7% |
| 7 | `(garbage collector) @ (native):0` | 93.0 ms | 1.5% |
| 8 | `stroke @ (native):0` | 70.7 ms | 1.2% |
| 9 | `restore @ (native):0` | 66.5 ms | 1.1% |
| 10 | `clip @ (native):0` | 57.5 ms | 0.9% |
| 11 | `getGrainTile @ engine/graphics/materials/NoiseLib.ts:93` | 48.9 ms | 0.8% |
| 12 | `addColorStop @ (native):0` | 45.9 ms | 0.8% |
| 13 | `getHexAtWorldPoint @ engine/systems/grid/GridSpatial.ts:9` | 41.6 ms | 0.7% |
| 14 | `drawFace @ engine/renderers/grid/TerrainRenderer.ts:24` | 41.0 ms | 0.7% |
| 15 | `createLinearGradient @ (native):0` | 40.7 ms | 0.7% |
| 16 | `paintSideGrain @ engine/graphics/materials/MaterialPainter.ts:56` | 35.9 ms | 0.6% |
| 17 | `translate @ (native):0` | 33.3 ms | 0.5% |
| 18 | `drawSandRipples @ engine/graphics/painters/SurfacePainter.ts:77` | 31.2 ms | 0.5% |
| 19 | `drawBlock @ engine/renderers/grid/TerrainRenderer.ts:11` | 30.5 ms | 0.5% |
| 20 | `paintTerrainGrain @ engine/graphics/materials/MaterialPainter.ts:39` | 27.9 ms | 0.5% |

#### Top 10 檔案占比
| 排名 | 檔案 | 占總 CPU % |
| :---: | :--- | :---: |
| 1 | `(native)` | 86.3% |
| 2 | `engine/graphics/utils/HexGeometry.ts` | 1.8% |
| 3 | `engine/renderers/grid/TerrainRenderer.ts` | 1.1% |
| 4 | `engine/graphics/materials/MaterialPainter.ts` | 1.0% |
| 5 | `engine/graphics/materials/NoiseLib.ts` | 1.0% |
| 6 | `engine/systems/grid/GridSpatial.ts` | 0.8% |
| 7 | `engine/graphics/painters/SurfacePainter.ts` | 0.5% |
| 8 | `engine/renderers/RenderList.ts` | 0.5% |
| 9 | `engine/game.ts` | 0.5% |
| 10 | `engine/systems/grid.ts` | 0.4% |

---

### 4.3 `showcase` (Showcase 模式, 7 單位 + 矩陣雨, rAF 44.3 FPS, avg 22.58 ms, p95 29.2 ms)

#### Top 10 函式 Self-Time
| 排名 | 函式與位置 | Self Time (ms) | 占總 CPU % |
| :---: | :--- | :---: | :---: |
| 1 | `(idle) @ (native):0` | 3127.0 ms | 51.5% |
| 2 | `(program) @ (native):0` | 842.3 ms | 13.9% |
| 3 | `drawImage @ (native):0` | 505.1 ms | 8.3% |
| 4 | `fill @ (native):0` | 233.5 ms | 3.8% |
| 5 | `save @ (native):0` | 133.5 ms | 2.2% |
| 6 | `getVertices @ engine/graphics/utils/HexGeometry.ts:3` | 118.4 ms | 2.0% |
| 7 | `(garbage collector) @ (native):0` | 76.6 ms | 1.3% |
| 8 | `clip @ (native):0` | 75.5 ms | 1.2% |
| 9 | `restore @ (native):0` | 68.9 ms | 1.1% |
| 10 | `drawLiquid @ engine/graphics/painters/SurfacePainter.ts:5` | 38.7 ms | 0.6% |
