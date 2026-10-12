# 渲染效能調查結果（主代理，2026-10-10）

> 量測工具：`tools/ui-e2e/perf-profile.mjs`（CDP 取樣 CPU profile）、`tools/ui-e2e/perf-ab.mjs`（逐項關閉特效的 A/B，同場景交錯兩輪）。
> 環境：headless Edge、1440×900、DPR 1、**軟體光柵**（沒有 GPU）。所以**絕對數值偏低、不代表使用者的電腦**；但「哪一項占比最大」的**排序**可信，且在真實 GPU 上這類操作通常更貴（clip + 混合模式會破壞批次、`ctx.filter` 要走額外的離屏 pass）。

## 1. 主要結論

### 1.1 頭號元兇：地形「顆粒」每格每幀重畫（約占渲染時間的 45–55%）

`TerrainRenderer.drawBlock()`（`engine/renderers/grid/TerrainRenderer.ts`）對**每一個六角格、每一幀**執行：

- 2–3 個側面：各 `createLinearGradient` + `fill` + `save/clip` + `MaterialPainter.paintSideGrain()`（`globalCompositeOperation='overlay'` 的 `drawImage`）+ `restore`
- 頂面：`createLinearGradient` + `fill` + `stroke` + `MaterialPainter.paintTerrainGrain()`（`traceHex` + `clip` + `overlay` 的 `drawImage`）
- `HexGeometry.getVertices()` 每次呼叫配置 6 個新物件

也就是每格約 **4 次「clip + overlay 混合」+ 5 個漸層物件**。`overlay` 混合在 GPU Canvas 上會被迫離開快速路徑，格子數一多就是主要成本。

而一個地形格的外觀是 `(theme, type, height, layout, q/r 變體, 浮動偏移)` 的**純函式**，只有 `VOID`/`MAGMA` 的「浮動」會隨時間改變，其餘生物群系完全靜態。→ **可以烘焙成 sprite 快取**。

**A/B（同場景、交錯兩輪、每格畫面平均 frame ms，閒置手動模式）**：

| 場景 | 基準 | 關閉色調分級 | **關閉地形顆粒** | 兩者皆關 | 關閉 backdrop-filter |
| :-- | --: | --: | --: | --: | --: |
| VOID | 8.1 | 7.9 | **4.3** | 4.2 | 7.9 |
| FOREST | 8.7 | 8.7 | **4.8** | 4.6 | 8.2 |
| ICE | 9.0 | 8.9 | **5.0** | 4.9 | 9.0 |
| MAGMA | 9.9 | 9.7 | **6.1** | 5.9 | 9.5 |
| DESERT | 8.6 | 8.6 | **4.5** | 4.5 | 8.5 |

（戰鬥中還要再加單位/VFX；Showcase 早期單次量測 53 FPS、frame avg 18.7 ms，max 104 ms。）

### 1.2 次要嫌疑（本機 headless 影響小，但真機可能放大）

| 項目 | 位置 | 說明 |
| :-- | :-- | :-- |
| 全螢幕色調分級 | `PostProcessor.applyToneGrade()`（`MATERIAL_CONFIG.grade.enabled = true`） | **每幀**整張畫布 `drawImage` 複製到暫存 → `clearRect` → 帶 `ctx.filter`（contrast/saturate/brightness）再畫回，全是**實體解析度**。高 DPR / 4K 螢幕成本與像素數成正比。 |
| 畫布實體解析度 | `hooks/useGameLoop.ts:41`、`RenderPipeline.ts:61/115/116`、`HUDRenderer.ts:41`、`GameCanvas.tsx:92` | `canvas.width = css寬 × devicePixelRatio`，**沒有上限、沒有自適應**。DPR 2 的 1440p 螢幕 = 約 3000×1800 像素。 |
| 主畫布 context 選項 | `useGameLoop.ts:93` `getContext('2d')` | 沒有 `alpha:false`（背景本來就是不透明填色，可省合成）。 |
| `ctx.shadowBlur` 大量使用 | 單位光環/核心/環境光、VFX、彈道、Hazard（20）、HUD 血條、浮動字 | `shadowBlur` 在 Canvas 2D 上是最貴的操作之一。戰鬥中單位多時疊加。**不在本輪盲改**（改了會變外觀），僅在 profile 顯示 top 時處理。 |
| 每幀配置 | `RenderPipeline.drawWorld` 的 `[...new Set([...occluded, ...obstacleOccluded])]`；`getVertices` 每次新陣列；GC 約占 1.3–1.6% | 小，但順手可清。 |
| UI：`backdrop-filter: blur` | `.liquid-card`、各視窗、HUD | 在持續重繪的畫布上方，每個毛玻璃元素都要每幀重新模糊其背後內容。headless 量不出差異（軟體合成），**真機可能很大**。因為會動到 CSS（與 UI 提示 4 的 S1 computed-style 基準衝突），**本輪只量測、不修改**。 |
| UI：Showcase 的矩陣雨 | `components/ui/showcase/useMatrixRain.ts` | 第二張持續動畫的畫布，疊在主畫布上。僅量測。 |

### 1.3 已確認「不是」問題的項目

- UI 的 React 輪詢已集中到 `useEngineView` 10 Hz；`useGameApp` 500 ms interval 與 UI 無關。
- 背景：`BackgroundRenderer` 已有靜態離屏快取，動態部分只有 50 個粒子級小物件。
- 模擬步進：固定 60 Hz、累積器上限 250 ms，沒有死亡螺旋。

## 2. 優化策略（對應 `docs/PERF_AGENT_PROMPT.md`）

1. 先蓋「**畫面保真護欄**」（固定種子 + 假時間的決定性截圖比對）與「**量測護欄**」（A/B 腳本、perf overlay）。
2. **地形 sprite 快取**（P1）：頭號收益，外觀必須等價。
3. **解析度 SSOT + 上限 + 自適應品質**（P4/P5）：慢機器自動降階（先關色調分級、再降 DPR 倍率），快機器零影響。
4. 依 profile 結果做**有上限的**殘餘熱點修正（P3），不盲改。
5. 只量測 UI 側的 `backdrop-filter`/矩陣雨（P7），把數據與建議寫進報告交由使用者決定。
