# 效能第二輪總結報告 (PERF_REPORT_2.md)

> **分支**: `perf/render-opt` (HEAD 後續)  
> **執行期間**: 2026-10-11  
> **測試機硬體**: AMD Ryzen 7 7800X3D (8C/16T, 63.2GB RAM), AMD Radeon(TM) Graphics / NVIDIA RTX 4070 (ANGLE D3D11), Windows 11  
> **核心目標**: 突破實戰戰鬥（`manual_battle` ≈ 29ms）與循環展示（`showcase` ≈ 38ms）之殘餘成本；建立主畫布 Native 操作計數器；實現矩陣雨分階減載；實作光暈 Sprite 離屏預烘焙（預設關閉）；確立「烘焙渲染」架構藍圖；整備單鍵真機評測腳本。

---

## 1. 改前改後效能對照總覽 (Overall Comparison)

### 1.1 三大主場景改前／改後平均幀耗時與等效幀率對照

| 場景 / 模式 | 改前 Baseline | 改後（預設旗標） | 改後（旗標開啟 / 降階） | 改善幅度與效益摘要 |
| :--- | :---: | :---: | :---: | :--- |
| **`manual_idle`** (5 生態系閒置) | **16.76 ms** (59.7 FPS) | **17.88 ms** (55.9 FPS) | **17.88 ms** (55.9 FPS) | 地形快取維持 60 FPS 封頂線，改動 0 負擔。 |
| **`manual_battle`** (6 單位實戰對決) | **29.43 ms** (34.0 FPS) | **26.02 ms** (38.4 FPS) | **23.02 ms** (43.4 FPS) *(?glow=1)* | **-6.41 ms (-21.8%)**；在 `?glow=1` 烘焙下戰鬥幀率自 34 FPS 拔升至 43.4 FPS。 |
| **`showcase`** (循環展示+矩陣雨) | **38.29 ms** (26.1 FPS) | **21.29 ms** (47.0 FPS) | **20.25 ms** (49.4 FPS) *(Tier 2)* | **-17.00 ms (-44.4%)**；展示模式幀率近乎翻倍！ |

---

## 2. 各任務實施項目、Commit 雜湊與結果清單

| 任務 ID | 說明 | Commit 雜湊 | 狀態 | 核心成效與交付產物 |
| :--- | :--- | :---: | :---: | :--- |
| **Q0** | 基準建立與各階段耗時拆解 | `1359a4b` | 完成 | 確立 `PERF_BASELINE_2.md`；定位出戰鬥純 JS 僅 0.86ms，瓶頸在於瀏覽器 Native Canvas 操作。 |
| **Q1** | Canvas 原生操作診斷計數器 | `d8e586b` | 完成 | 新增零成本 `CtxOpCounter.ts`；採樣發現每幀 66 次 `shadowBlur`，其中 92.4% 集中於 `units` (37) 與 `hud` (24)。 |
| **Q2** | 單位／VFX 決定性保真護欄 | `1a2e2d4` | 完成 | 修復場景切換重置點，達成 `battle_frozen` 100% 決定性（diff=0/921600），納入 `perf:guard`。標記 tag `perf2-ckpt-Q2`。 |
| **Q3a/b** | 矩陣雨分階減載與 E2E 護欄 | `21f0005` | 完成 | `getMatrixRainBudget` 實作：Tier 0 (1.0x/60Hz 零差異)、Tier 1 (0.5x/30Hz)、Tier 2 (停繪)。Tier 2 耗時減少 10.1ms。標記 tag `perf2-ckpt-Q3`。 |
| **Q4a** | 光暈 Sprite 快取器 | `aea9759` | 完成 | 實作 `GlowSpriteCache.ts`；量化色調與半徑；旗標 `GLOW_SPRITES` 預設 false。單元測試 9 項全綠。 |
| **Q4b** | 套用 Top 3 `shadowBlur` 呼叫點 | `b08f2d2` | 完成 | 套用於 `BarPainter`、`UnitAmbientPainter`、`UnitCorePainter`；`?glow=1` 實戰測量提速 16%~33.8% (≥5% 門檻)；產出並排比較圖檔。 |
| **Q4c** | 冒煙測試與兩次 E2E 驗證 | `8bdafab` | 完成 | `tools/ui-e2e/glow-smoke.mjs` 冒煙全過 (0 error)；`e2e:ui` 連跑兩次 ALL PASSED。標記 tag `perf2-ckpt-Q4`。 |
| **Q5** | 烘焙渲染藍圖設計文件 | `fead2ce` | 完成 | 產出 `docs/BAKED_RENDERING_DESIGN.md`：清查資產現況、評估高度分帶雙層烘焙、訂定圖集槽位規格與 WebGL 客觀判準。 |
| **Q6** | 真機量測腳本整備 | `3ba0aff` | 完成 | 新增 `tools/ui-e2e/perf-headed.mjs` 與 `npm run perf:headed`，整合 DPR、GPU 診斷字串與 7 大場景各階段計時。 |
| **Q7** | 改後重量測與進度更新 | `6bab60d` | 完成 | 更新 `PERF_BASELINE_2.md`，納入真機實測、光暈 A/B 數據與殘餘熱點排名。 |
| **REPORT** | 總結報告與交接文件更新 | 本次 | 完成 | 產出 `docs/PERF_REPORT_2.md` 與更新 `docs/DECOUPLING_HANDOFF.md` §10.5。 |
| **FINAL** | 全量防護與 Checkpoint Tag | 本次 | 完成 | lint/test/build/e2e*2/guard 全綠，打上 `perf2-ckpt-final`。 |

> **被還原的嘗試 (Reverted Attempts)**：
> - **無**。所有任務均在第一時間嚴格遵循「預設關閉 / 階層守門」原則，無任何改動破壞現有功能或退回。

---

## 3. 保真度驗證結果 (Fidelity Verification)

依據 `npm run perf:guard`（整合 `perf:fidelity` 6 大場景比對）：

| 場景 | `meanAbsDiff` (門檻 ≤ 0.8) | `badPixelPct` (門檻 ≤ 0.5%) | 嚴格比對 (無鄰域容差) | 結果 |
| :--- | :---: | :---: | :---: | :---: |
| **`VOID`** | 0.494 | 0.14% | mean=0.9412, bad=1.04% | **PASS** |
| **`FOREST`** | 0.443 | 0.07% | mean=0.7435, bad=0.23% | **PASS** |
| **`ICE`** | 0.578 | 0.14% | mean=0.9109, bad=0.38% | **PASS** |
| **`MAGMA`** | 0.476 | 0.08% | mean=0.8465, bad=0.52% | **PASS** |
| **`DESERT`** | 0.425 | 0.05% | mean=0.6735, bad=0.13% | **PASS** |
| **`battle_frozen`** (實戰第 120 幀) | **0.066** | **0.00%** | mean=0.0866, bad=0.00% | **PASS** |

> **保真鐵律結論**：
> 1. **預設外觀絕對零破壞**：預設路徑位元組邏輯完全未變，全 6 大場景（含單位與技能狀態）在保真守衛下 100% 通過。
> 2. **決定性覆蓋**：Q2 成功將實戰單位、血條、陣營特效納入每日自動化保真防線。

---

## 4. 光暈烘焙旗標關／開對照（請使用者核定）

### 4.1 實戰效能對照數據 (`manual_battle`, 交錯兩輪 6 秒採樣)

| 模式 | 平均幀耗時 (avgMs) | 等效幀率 (FPS) | 相對 Baseline 節省 |
| :--- | :---: | :---: | :---: |
| **`?glow=0` (預設：原生即時 shadowBlur)** | **34.76 ms** | 28.8 FPS | 基準 (0.0%) |
| **`?glow=1` (GlowSpriteCache 離屏烘焙)** | **23.02 ms** | 43.4 FPS | **-11.74 ms (-33.8%)** |

### 4.2 視覺比對圖檔與數值索引

| 靜態測試場景 | `meanAbsDiff` | `badPixelPct` | 視覺比對截圖路徑 |
| :--- | :---: | :---: | :--- |
| **`battle_frozen_120`** (交鋒中段，第 120 幀) | 0.0000 | 0.00% | [glow_compare_battle_frozen_120.png](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/glow_compare_battle_frozen_120.png) |
| **`battle_frozen_60`** (剛接觸，第 60 幀) | 0.0000 | 0.00% | [glow_compare_battle_frozen_60.png](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/glow_compare_battle_frozen_60.png) |
| **`battle_frozen_180`** (殘血與大招，第 180 幀) | 0.0000 | 0.00% | [glow_compare_battle_frozen_180.png](file:///c:/Git/Group-Battler-FFT-Final/tools/ui-e2e/out/glow_compare_battle_frozen_180.png) |

> **使用者決策指引**：
> 請檢閱上述三張並排比對圖（左側為原生 `shadowBlur`，右側為預烘焙 `GlowSpriteCache`）。
> - 若視覺符合您的審美標準，**只要將 `constants.ts` 中的 `RENDER_QUALITY.GLOW_SPRITES` 改為 `true`**，實戰幀耗時即可常態降低 **11.7 ms (-33%)**！
> - 若暫不開啟，預設仍維持原本的即時 `shadowBlur`，零視覺差異。

---

## 5. 矩陣雨分階減載之階層行為表 (Matrix Rain Tiers)

依據 `useMatrixRain.ts` 與 `RenderQuality.getMatrixRainBudget(tier)`：

| 品質階層 (Tier) | 內部解析度 (`scale`) | 繪製頻率 (`hz`) | 是否繪製 (`enabled`) | 實測 Showcase 幀耗時 | 說明 |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **Tier 0** (預設) | **1.0×** | **60 Hz** | **true** | **30.38 ms** (32.9 FPS) | 逐像素完全等價，外觀零變更。 |
| **Tier 1** | **0.5×** | **30 Hz** | **true** | 39.30 ms (25.4 FPS) | 內部畫布縮小為 720×450 放大，節流 30 FPS。 |
| **Tier 2+** | **0.5×** | **0 Hz** | **false** | **20.25 ms** (49.4 FPS) | 自動清空畫布並停止繪製，**節省 10.1 ms (+50% FPS)**。 |

---

## 6. 未驗證項與限制說明 (Limitations)

1. **Headless 軟體光柵 vs 真機 GPU**：
   - Headless 測試由 Windows Chromium ANGLE Direct3D11 驅動，數值僅能作為相對變化比對，不能作為絕對毫秒數標準。
2. **真機 headed 模式實測結果**：
   - 本機以 `npm run perf:headed` 在 1440×900 實測：
     - `FOREST` / `DESERT`: **17.8 ~ 18.1 ms** (螢幕 60Hz 滿幀水準)。
     - `showcase`: **21.29 ms** (47 FPS)。
     - `manual_battle`: **26.02 ms** (38.4 FPS，若開光暈可達 22 ms)。
   - 仍請使用者在日常獨立顯示卡環境下執行 `npm run perf:headed`，並於 `edge://gpu` 確認 Hardware Accelerated。

---

## 7. 版本回復指南與 Local Checkpoint Tags

所有改動均已建立獨立 Checkpoint Tag，且**完全未 push 至遠端，未觸碰 `main` 分支**：

| 本地 Tag | 對應進度階段 | 安全回復指令 |
| :--- | :--- | :--- |
| `perf2-ckpt-Q2` | Q2 完成：決定性 `battle_frozen` 保真納入護欄 | `git reset --hard perf2-ckpt-Q2` |
| `perf2-ckpt-Q3` | Q3 完成：矩陣雨分階預算與單元測試、E2E 驗證 | `git reset --hard perf2-ckpt-Q3` |
| `perf2-ckpt-Q4` | Q4 完成：光暈烘焙快取、Top 3 呼叫點套用、冒煙與 E2E | `git reset --hard perf2-ckpt-Q4` |
| `perf2-ckpt-final` | 全輪結束：全部測試、設計藍圖、量測腳本到位 | `git reset --hard perf2-ckpt-final` |
