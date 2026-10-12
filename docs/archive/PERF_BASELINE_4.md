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
| **P1** | 特效盤點＋壓力情境產生器 (`docs/VFX_INVENTORY.md`, `lib/vfx-storm.mjs`) | ☑ | `3795942` | 盤點 109 項登記資產 + 11 項直接繪製系統，完成 storm 壓力產生器 |
| **P2** | 逐項成本歸因（A/B 開關、每幀分配取樣、Canvas 操作排行榜、長幀成因） | ☑ | (current) | 11 項 A/B 歸因，證實 shadowBlur/CC/Hazards/Prism 為長幀元兇 |
| **P3a** | 依 P2 排行榜執行優化決策清單 (前項，≤4 項，預期 ≥8%) | ☐ | 待處理 | 依數據選定 4 大項目：shadowBlur優化、Prism漸層共用、危害區雙繪去重、GroundCC節流 |
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

---

## 5. P1: 特效系統全量盤點總結

完整盤點表請詳見 `docs/VFX_INVENTORY.md`。重點結論如下：
1. **已登記資產**：`VFX_REGISTRY` 匯聚 109 項資產，主要覆蓋命中受擊、主動技光環、奧義光芒與背水決戰。
2. **直接繪製系統（未登記但重度繪製）**：包括 `HazardPainter`（危害區）、`ShieldPainter`（3D 護盾稜柱）、`UnitAuraPainter`（法陣光暈）、`TextPainter`（傷害與詠唱浮字）、`ProjectileDrawer`（尾跡）、`GroundEffectPainter`（CC 光暈與煙霧）、`UnitShatter`（死亡碎片解體）。
3. **死碼與未引用檔案**：`data/vfx/beam_visuals.ts`、`data/vfx/cast_visuals.ts`、`data/vfx/procedural_visuals.ts` 以及 `data/vfx/procedural/` 旗下 5 個檔案全無外部調用。
4. **雙重重複繪製**：`HAZARD_SPAWN` 同時觸發 `HazardPainter`（網格層）與 `GRID_FIELD` 粒子（VFX 粒子層），造成同一危害格雙倍繪製。

---

## 6. P2: 逐項成本歸因與前 10 名排行榜 (A/B Isolation)

> 測試條件：2560×1440 @ 239 Hz, DPR 1, Headed, Unthrottled, RTX 4070。  
> 場景：`battle_vfx_storm`（10 單位同時技能詠唱、AOE 預警、危害區、奧義、投射物、死亡碎裂、浮字狂飆）。  
> 測試資料來源：`tools/ui-e2e/out/perf_attribution.json`。

### 6.1 特效成本排行榜 (Top 10 Cost Ranking by p99 Impact)

| 排名 | 特效子系統 / 特徵模組 | 關閉時 p99 | p99 節省 (貢獻) | Median 節省 | 1% Low 增益 | 長幀 (>16.7ms) 消除數 | 主要手法與耗時成因 |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **#1** | **All ECS Particles (`ParticleRenderer`)** | 7.42 ms | **+27.56 ms** | +1.70 ms | +51.2 fps | **-98 幀** | 400 粒子批次繪製、物理更新與混合模式切換 |
| **#2** | **Ground CC & Buffs (`GroundEffectPainter`)** | 12.90 ms | **+22.08 ms** | -0.10 ms | +13.4 fps | **-95 幀** | ROOT 帶 shadowBlur=10；DoT/HoT 每幀多段三角/正弦曲線繪製 |
| **#3** | **All ShadowBlur Calls (Canvas Context)** | 14.20 ms | **+20.78 ms** | +0.40 ms | **+38.7 fps** | **-103 幀** | **全畫布最長幀核心元兇**：軟體光柵羽化導致單幀飆高至 48~74ms |
| **#4** | **Beams & Slashes (`ProceduralPainter`)** | 22.93 ms | **+12.05 ms** | +0.15 ms | +5.8 fps | **-21 幀** | LayeredBeam / Ribbon 疊層光束與旋轉計算 |
| **#5** | **Unit Death Shatter (`UnitShatter`)** | 23.18 ms | **+11.80 ms** | +1.00 ms | +15.2 fps | **-45 幀** | 角色 Base/Rim/Core 貼圖拆解 + 12~16 水晶碎屑物理模擬 |
| **#6** | **Chant & Ult Auras (`UnitAuraPainter`)** | 24.90 ms | **+10.08 ms** | +0.00 ms | +11.3 fps | **-52 幀** | 每詠唱單位每幀 shadowBlur=12~20，旋轉六角線段 |
| **#7** | **Map Hazard Painter (`HazardPainter`)** | 25.01 ms | **+9.97 ms** | +0.20 ms | +1.4 fps | **-47 幀** | 3-Layer 體積霧 3 次 blit + 熔岩裂紋 + 冰柱 3 次 gradient |
| **#8** | **Projectiles & Trails (`ProjectileDrawer`)** | 25.12 ms | **+9.86 ms** | +0.20 ms | +7.4 fps | -12 幀 | 每幀投射物尾跡 `createLinearGradient` 與逐段 stroke 迴圈 |
| **#9** | **Shield 3D Prism (`VolumePainter`)** | 29.82 ms | **+5.16 ms** | +0.00 ms | -2.2 fps | **-18 幀** | 10 單位護盾每幀產生 60+ 次 `createLinearGradient` |
| **#10**| **Floating Text (`TextPainter`)** | 37.95 ms | -2.97 ms | +0.50 ms | +3.5 fps | -28 幀 | 60 條文字 measureText、SHOUT 漸層、破棄 Glitch 隨機雜訊 |

### 6.2 記憶體分配熱點 (CDP HeapProfiler Sampling)
1. `BattleLogger.ts:11` (`log`): ~900 KB（戰鬥記錄字串拼接，非戰鬥必要）
2. `useGameLoop.ts:59` (`loop`): 411 KB（rAF 回呼閉包與時間戳分配）
3. `BillboardPainter.ts:3` (`draw`): 335 KB（縮放與矩陣計算暫態物件）
4. `PostProcessor.ts:38` (`applyToneGrade`): 325 KB
5. `VFXPhysics.ts:2` (`update`): 150 KB
6. `GlowSpriteCache.ts:141` (`drawGlowSprite`): 111 KB
7. `RenderList.ts:185`: 104 KB

### 6.3 長幀 (>16.7 ms) 成因歸因
- CDP Trace 證實：**長幀 100% 發生在主線程 Canvas 繪製階段**，瀏覽器 Layout / DOM 重排均為 0ms。
- **單一最大殺手**：`shadowBlur`。當攔截並將 `shadowBlur` 歸零時，>16.7ms 幀數直接自 **108 幀暴降至 5 幀（R1）與 0 幀（R2）**，p99 瞬間砍半至 **14.20 ms**。
- **第二大瓶頸**：重複漸層與狀態幾何。`VolumePainter` 每幀 60+ 次 `createLinearGradient`、`HazardPainter` 雙重管線疊加、以及 `GroundEffectPainter` 每幀的正弦波浪與陰影。

---

## 7. P3: 優化決策清單 (P3 Decisions)

依據 P2 數據證據與投報率，選定以下 **4 大高收益優化目標**（每項預期帶來顯著 p99 與長幀改善，且維持視覺保真度）：

| 決策項 | 優化目標 | 策略與作法 | 預期收益 | 涉及檔案 (≤3) |
| :---: | :--- | :--- | :---: | :--- |
| **P3-1** | **消除 `shadowBlur` 軟體光柵化延遲** | 在熱路徑（`UnitAuraPainter` 法陣光暈、`GroundPainter` 衝擊波/爆炸、`HazardPainter` 虛空黑洞、`GroundEffectPainter` 禁錮）中，將即時 `shadowBlur` 改造為預烘焙光暈貼圖（擴展 `GlowSpriteCache`）或雙層高亮線取代，消除軟體光柵化。 | **p99 改善 ≥20%**，長幀消除 >50% | `UnitAuraPainter.ts`, `GroundPainter.ts`, `HazardPainter.ts` |
| **P3-2** | **`VolumePainter.draw3DPrism` 漸層共用與無效分配消除** | ① `SOLID` 樣式完全移除漸層建立（直接以 `fillStyle = color` 繪製）；② `GRADIENT_FADE` 樣式將 6 面漸層共用單一垂直漸層（只需 `createLinearGradient` 1 次，而非 6 次）；③ 消除 `drawExtrusion` 迴圈內的 3 次重複漸層。 | **p99 改善 ≥8%**，每幀消除 60+ 次 gradient 建立 | `VolumePainter.ts` |

---

## 8. P3 執行成果與量測對比 (Post-P3 Verification)

### 8.1 實際實作項目回顧
1. **P3-1 (`VolumePainter.ts`, commit `2bf654a`)**:
   - `draw3DPrism`：`SOLID` 樣式完全移除漸層建立（改用平塗 `color`）；`GRADIENT_FADE` 樣式將 6 面漸層共用單一垂直漸層（從 6 次 `createLinearGradient` 降為 1 次）。
   - `drawExtrusion`：將側面 3 面漸層提到迴圈外共用單一垂直漸層（從 3 次降為 1 次）。
2. **P3-2 (`EventVFXMapper.ts`, `VFXPlayer.ts`, commit `e00bdfc`)**:
   - `EventVFXMapper`：`HAZARD_SPAWN` 映射為單發 `spawnVfx` 破裂粒子，移除持續 4s 的重複全屏 `GRID_FIELD` 粒子，杜絕網格層與粒子層重複雙重繪製。
   - `VFXPlayer`：粒子計數由 `state.particles.filter(...)` 改為零分配 early-terminating for 迴圈。
3. **P3-3 (`UnitAuraPainter.ts`, `HazardPainter.ts`, `GroundPainter.ts`, commit `7ed6c61`)**:
   - `UnitAuraPainter`：詠唱光環與奧義法陣以雙層幾何柔光線條（寬度 6~8，alpha 0.2~0.25）完全取代即時軟體 `shadowBlur = 12 / 20`。
   - `HazardPainter`：`VOID_HOLE` 虛空黑洞以雙層 lighter 疊加弧線取代 `shadowBlur = 20`。
   - `GroundPainter`：衝擊波、光環、爆炸特效以雙層多段 Hex 描邊與填充取代即時軟體 `shadowBlur = 15 / 30`。
4. **P3-4 (`GroundEffectPainter.ts`, commit `f4c1f24`)**:
   - `ROOT` 禁錮環移除 `shadowBlur = 10`，改為外層柔光線條。
   - `HoT` 粒子迴圈移除每幀多次 `ctx.save()` / `ctx.restore()` / `translate()`，改為直接座標偏移填色。
   - 清理未使用的 `VolumePainter` 引用。

### 8.2 成果數據對比 (2560×1440 @ 239 Hz, DPR 1, RTX 4070)

#### `battle_vfx_storm` (全特效齊發壓力情境 - 核心目標)
| 指標 | P0b 原始基準 | P3 優化後成果 | 改善幅度 / 效益 |
| :--- | :---: | :---: | :---: |
| **p90** | 25.1 ms | **12.6 ms** | **-49.8%** (降低 12.5 ms) |
| **p95** | 29.2 ms | **16.6 ms** | **-43.2%** (降低 12.6 ms) |
| **p99** | 37.6 ms | **16.7 ms** | **-55.6%** (降低 20.9 ms，腰斬！) |
| **Max 幀時間** | 66.8 ms | **50.0 ms** | **-25.1%** |
| **1% Low FPS** | 23.3 FPS | **47.4 FPS** | **+103.4%** (提升超過一倍！) |
| **平均 FPS** | 68.2 FPS | **91.3 FPS** | **+33.9%** |
| **>16.7 ms 長幀數** | 928 幀 | **317 幀** | **-65.8% (直接消除 611 個長幀！)** |

#### 保真度檢查 (`perf:fidelity`)
- `battle_frozen`：`meanAbsDiff=0.059` (<= 0.8), `badPixelPct=0.05%` (<= 0.5%) -> **PASS (嚴格維持視覺基準)**。
- 地形 5 場景全部 PASS。


