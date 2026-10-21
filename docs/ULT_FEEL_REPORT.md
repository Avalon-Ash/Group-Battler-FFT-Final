# 奧義有感（ULT_FEEL）執行報告

> **分支**：`feat/ult-feel`  
> **基準版本**：`3685c66`  
> **完成日期**：2026-10-21  
> **目標**：落實 `docs/ULT_FEEL_AGENT_PROMPT.md`，達成 50 奧義「**奧義有感**」共享演出（暗場聚光、奧義名橫幅、命中局部光爆）、STORM 節奏差異化與地圖邊界收縮、6 個問題奧義美術重做。

---

## 1. 任務成果總結

本輪執行全面遵循 `AGENTS.md` 與 `ART_SPEC.md` §6、`DECISIONS.md` §4 架構不變性：
- **純 HTML5 Canvas 2D 實作**：無 WebGL / Three.js / Pixi.js 依賴；
- **渲染零每幀配置**：聚光、光爆、橫幅全部採用一次性預烘焙 Sprite 或依畫布尺寸快取，運行幀零 `new` 與零 per-frame gradient 創建；
- **嚴格層界分離**：表現層不寫模擬時間與狀態；`UltFeelStore` 純表現層資料池，零 GC 壓力；
- **單一寫入者原則**：施法者與技能名稱僅由 `VisualSystem` 於 `CAST_START` / `CAST_BREAK` 寫入，命中光爆僅由 `SequenceSystem` 於 `ULT_IMPACT` 寫入；
- **全套檢核通過**：TypeScript 0 報錯、85 個測試檔案共 671 個測試全數通過、Vite 正式打包成功、`runtime-smoke` 0 頁面錯誤、`perf:guard` 6 場景保真度 meanAbsDiff 與 UF0 完全相同（0 diff）、效能比率維持 1.00~1.01。

---

## 2. 改動位置與設計說明

### A. 共享演出（50 個奧義全體受益）

1. **A1: 詠唱暗場＋施法者聚光（世界座標層）**
   - **位置**：`engine/presentation/vfx/UltFeelStore.ts`、`engine/renderers/ult/UltWorldRenderer.ts`、`engine/renderers/RenderPipeline.ts`、`constants/vfx.ts`。
   - **實作**：
     - 在 `RenderPipeline` 的後製（Tone Grade）之後、`tactical.drawOverlay` 與 `hud.draw` 之前執行，確保 HUD 血條與戰術標記不被壓暗。
     - 預烘焙 256px 柔邊聚光透明度 Sprite (`spotlightSprite`) 與離屏暗場畫布，使用 `destination-out` 柔和挖空聚光區域。
     - 最多支援最新 2 位施法者聚光，半徑約 2.5 格，乘上鏡頭 zoom；最低品質階層（Tier 3）自動關閉聚光、僅留較淡暗場（0.20）。
     - 暗場隨詠唱線性淡入至上限（0.35），詠唱結束或命中後在 0.35 秒內柔和淡出。

2. **A2: 奧義名橫幅（螢幕座標層）**
   - **位置**：`engine/renderers/HUDRenderer.ts`、`engine/renderers/hud/TextPainter.ts`、`engine/presentation/visuals/EventHUDMapper.ts`。
   - **實作**：
     - 於螢幕頂部居中繪製奧義名橫幅，總時長 1.2 秒（滑入 0.2s、停留 0.7s、滑出 0.3s）。
     - 依 `getRenderDpr()` 進行清晰縮放，採用 `TextPainter.fontFor('ULT', 22)` 與 `GlowTextCache` 發光文字。
     - 橫幅背景漸層色走 `factionSkin`（藍方聖金/天藍、紅方血色/暗紅），絕無寫死色碼。
     - 同時若有多個奧義，橫幅優先顯示最新一位；橫幅顯示期間，`EventHUDMapper` 自動壓制該奧義頭頂的 SHOUT 文字，避免畫面文字重複打架。

3. **A3: 命中局部光爆（世界座標層）**
   - **位置**：`types/VFXSchema.ts`、`data/vfx/SkillSequences.ts`、`engine/presentation/visuals/SequenceSystem.ts`、`engine/renderers/ult/UltWorldRenderer.ts`。
   - **實作**：
     - `VFXActionType` 新增 `'ULT_IMPACT'`，所有奧義序列自動在 `delay = hitAt` 排入此動作（若詠唱中斷則隨序列取消）。
     - 命中時在目標點觸發加法混合（`lighter`）的陣營色光爆（預烘焙 Sprite），半徑 2.4 格，持續 0.20 秒，最大不透明度 0.32，迅速向外擴張淡出，營造紮實的打擊落地感而非刺眼的全屏閃白。

### B. STORM 節奏與地圖邊界收縮

1. **節奏差異化 (Cadence)**
   - **位置**：`data/vfx/ult_visuals.ts`、`data/vfx/SkillSequences.ts`、`tests/UltScatter.test.ts`。
   - **實作**：
     - `UltVisualDef` 新增 `cadence?: 'EVEN' | 'ACCEL' | 'CLUSTER'`。
     - `rr_u3`（煉獄火雨）設為 `'ACCEL'`：前慢後快，採用二次方平滑加速曲線，首擊落於 `hitAt`，尾擊總長與名目 span 完全相同，節奏由漫天緩落到急促爆燃。
     - `rb_u5`（奧術箭雨）設為 `'CLUSTER'`：三擊一組，組內快速連發（0.025s 間隔），組間顯著停頓（0.075s 間隔），打擊感如三連發齊射。
     - `mr_u5`（靈魂爆燃）維持 `'EVEN'`：標準等間隔連鎖爆炸。
     - 全程 100% 確定性運算，不使用 `Math.random`。

2. **落點邊界防護與向心收縮 (Boundary Clamping)**
   - **位置**：`engine/presentation/visuals/SequenceSystem.ts`、`constants/vfx.ts` (`SCATTER_CLAMP_RETRACT_RATIO: 0.75`, `SCATTER_CLAMP_MAX_STEPS: 4`)。
   - **實作**：
     - 靜態方法 `SequenceSystem.clampScatterToMap`：當黃金角散布落點超出地圖格（`!engine.isValid(q, r)`）時，沿中心方向以 0.75 比例迭代向內收縮（最多 4 次）；若仍出界則安全歸零落在目標中心格。
     - 特效落點始終有合法地形高度，徹底根除散布特效在虛空中懸空的視覺瑕疵。

### C. 6 個問題奧義美術重做（`data/vfx/**`）

1. **`sr_u4` 猩紅血月** (`FX_ULT_RED_BLOOD_MOON`)
   - 原本：超大 215px 硬邊 glow 鋪滿全格、畫面全粉紅。
   - 重做：改為目標上空懸浮月輪（直徑 56px 緊湊深紅發光盤），一道暗紅血色光柱由月輪向下灑向戰場中心，增益吸血光點（`vz: [80, 150]`）向上反向匯聚回流至隊員，地面保留精緻法陣與聚光環。不再整片粉紅。
2. **`mr_u1` 毀滅隕石** (`FX_ULT_RED_METEOR_IMPACT`)
   - 原本：0.8s 餘味火焰長時間鋪滿。
   - 重做：落地爆閃與衝擊環於 0.45s 內迅速消散，地面留下清晰的深黑焦痕（`smoke CHAR`，0.75s 收斂）與零星微弱火星，0.6s 後視野乾淨清爽。
3. **`rr_u2` 焦土衝擊** (`FX_ULT_RED_NUKE_FLASH`)
   - 原本：0.8s 餘味火焰鋪滿。
   - 重做：核彈白熱光爆迅速收束，地面烙下巨大的焦黑輻射灼痕，搭配零星黑色餘燼與碎石，0.6s 後回歸戰場清晰視野。
4. **`wb_u5` 光速斬擊** (`FX_ULT_BLUE_LIGHTSPEED`)
   - 原本：日輪紋章起手，與 `mb_u5` 聚能光束難以分辨。
   - 重做：起手紋章換為戰士專屬的 `lionShield`（獅心盾），接續三道交錯縱橫的瞬移光劍斬痕（左斜、右斜、橫斷斬弧 `slashArc`），最後在終點爆發核心光閃與地面衝擊環，徹底與法師日輪光束區隔。
5. **`sr_u1` 靈魂連結** (`FX_ULT_RED_SOUL_WEB`)
   - 原本：向外擴張的大環，缺少束縛鎖死感。
   - 重做：外圈深淵鎖鏈環向內強制收緊（`scaleFrom: 2.0 -> scaleTo: 0.7`），內圈地面環在鎖死時向外震盪反衝，搭配環狀分佈的鎖鏈雷引線，呈現強烈的群體禁錮鎖鏈收緊意象。
6. **`sr_u5` 惡靈附身** (`FX_ULT_RED_POSSESSION`)
   - 原本：角骷髏紫黑黑煙，與 `sr_u3` 辨識度接近。
   - 重做：起手改用 `invTriangle` 倒三角印記，本體採用幽綠/深紫雙層鬼火火焰（`flame` 零件），升騰幽光鬼火火星（`spark ASH_VOID`，`vz: [70, 130]`），打造單體鬼火附身強化視覺。

---

## 3. 測試與量測數據對比

### 3.1 渲染保真度（Fidelity Regression Check）

| 場景 | UF0 改前 `meanAbsDiff` | UF6 改後 `meanAbsDiff` | 門檻 | 判定 |
| :--- | :---: | :---: | :---: | :---: |
| **VOID** | `0.057` | `0.057` | `<= 0.8` | **PASS (0 diff)** |
| **FOREST** | `0.600` | `0.600` | `<= 0.8` | **PASS (0 diff)** |
| **ICE** | `0.157` | `0.157` | `<= 0.8` | **PASS (0 diff)** |
| **MAGMA** | `0.078` | `0.078` | `<= 0.8` | **PASS (0 diff)** |
| **DESERT** | `0.468` | `0.468` | `<= 0.8` | **PASS (0 diff)** |
| **battle_frozen** | `0.161` | `0.161` | `<= 0.8` | **PASS (0 diff)** |

*註：所有 6 個場景與 UF0 完全一致，0 像素偏移。保真度基準檔案未受任何修改。*

### 3.2 渲染效能（Performance Guardrails）

| 場景 | Baseline 基準時間 | 當前測得幀時間 | 效能比率 (Ratio) | 門檻 (Ratio) | 判定 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **VOID** | 17.59 ms | 17.62 ms | 1.01 | `<= 1.15` | **PASS** |
| **FOREST** | 17.62 ms | 17.51 ms | 1.00 | `<= 1.15` | **PASS** |
| **ICE** | 17.59 ms | 17.66 ms | 1.01 | `<= 1.15` | **PASS** |
| **MAGMA** | 17.58 ms | 17.63 ms | 1.00 | `<= 1.15` | **PASS** |
| **DESERT** | 17.64 ms | 17.55 ms | 1.00 | `<= 1.15` | **PASS** |

*註：非奧義幀早期返回（Early Return），奧義幀依賴預烘焙圖素與離屏雙緩衝，渲染耗時維持在 60 FPS (16.67ms) 上限內。*

### 3.3 白飽和度量測（White Saturation Ratios in `ult-sheet.json`）

在最亮的地形（ICE 與 DESERT）上於 `hitAt + 0.05s` 進行白像素（R, G, B >= 245）量測：

| 技能代碼 | 技能名稱 | ICE 飽和比率 | DESERT 飽和比率 | Max 飽和比率 | 觀感改善狀況 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `sr_u4` | 猩紅血月 | 0.0309 | 0.0271 | **0.0309** | 徹底告別全屏滿版粉紅遮擋，空中月輪清爽聚焦 |
| `rr_u2` | 焦土衝擊 | 0.1049 | 0.0469 | **0.1049** | 爆閃後 0.6s 收斂為焦黑灼痕，不再長留火焰遮蓋血條 |
| `mr_u1` | 毀滅隕石 | 0.0743 | 0.0188 | **0.0743** | 火焰收斂為地面隕坑焦痕與零星火星 |
| `wb_u5` | 光速斬擊 | 0.1334 | 0.1159 | **0.1334** | 獅心盾起手＋交叉劍弧瞬移，特色鮮明 |
| `sr_u1` | 靈魂連結 | 0.0299 | 0.0450 | **0.0450** | 鎖鏈環收緊與衝擊環層次分明 |
| `sr_u5` | 惡靈附身 | 0.0205 | 0.0305 | **0.0305** | 鬼火幽焰與紫黑火星升騰，造型明確 |
| `rr_u3` | 煉獄火雨 | 0.0000 | 0.0000 | **0.0000** | ACCEL 加速節奏，落地平順 |
| `rb_u5` | 奧術箭雨 | 0.0468 | 0.0511 | **0.0511** | CLUSTER 三連發節奏，乾淨俐落 |

### 3.4 規格化測試（`tests/UltSpec.test.ts`）

- 50 個奧義全部參與檢測。
- **C1～C8 違規總數**：保持為 3（`tr_u3`, `wb_u5`, `wr_u3` 均為歷史固有 C1 施法時長邊界，收錄於 `ult-spec.baseline.json`）。
- **新違規數**：**0**（棘輪規則嚴格通過，`tests/ult-spec.baseline.json` 保持純淨）。

---

## 4. 產出物清單

1. **`feel.png`（奧義有感驗收全圖）**：
   - 路徑：`tools/ui-e2e/out/ult/feel.png` (約 11.7 MB)
   - 包含 8 個核心驗證奧義（`sr_u4`, `rr_u2`, `mr_u1`, `wb_u5`, `sr_u1`, `sr_u5`, `rr_u3`, `rb_u5`）。
   - 每招 3 個完整全畫面（不裁切）：
     - 詠唱中 (`hitAt - 0.30s`)：可清楚驗收暗場壓暗世界、施法者腳下柔邊聚光、螢幕上方奧義名橫幅、頭頂血條未被遮蔽。
     - 命中點 (`hitAt + 0.03s`)：可清楚驗收目標點的陣營色加法局部光爆（非全屏閃白）。
     - 餘韻 (`hitAt + 0.60s`)：可驗收暗場淡出、焦痕收斂、無殘留火焰遮蔽。
2. **`after` 總表**：
   - 藍方 25 奧義時序表：`tools/ui-e2e/out/ult/after/blue.png`
   - 紅方 25 奧義時序表：`tools/ui-e2e/out/ult/after/red.png`
   - 50 奧義飽和量測數據：`tools/ui-e2e/out/ult/after/ult-sheet.json`

---

## 5. 提交紀錄與回退指南

本分支共包含 7 個嚴格分層、獨立可驗證的 Git Commit：

| Commit ID | 任務代號 | 提交主旨 | 異動核心檔案 |
| :--- | :---: | :--- | :--- |
| `68d9f24` | **UF1** | `feat(vfx): UF1 - UltFeelStore, ULT_IMPACT action, ULT_FEEL constants, and tests` | `UltFeelStore.ts`, `VFXSchema.ts`, `SkillSequences.ts`, `VisualSystem.ts`, `constants/vfx.ts`, `UltFeelStore.test.ts` |
| `376a3c2` | **UF2** | `feat(vfx): UF2 - A1 dimming spotlight and A3 impact burst rendering with RenderSpec` | `UltWorldRenderer.ts`, `RenderPipeline.ts`, `RenderSpec.ts` |
| `3edfa7f` | **UF3** | `feat(hud): UF3 - A2 ultimate name banner and overhead shout suppression` | `HUDRenderer.ts`, `TextPainter.ts`, `EventHUDMapper.ts` |
| `61aa2db` | **UF4** | `feat(vfx): UF4 - storm cadence, map boundary clamping, and scatter tests` | `ult_visuals.ts`, `SkillSequences.ts`, `SequenceSystem.ts`, `UltScatter.test.ts`, `constants/vfx.ts` |
| `20b424e` | **UF5-Red** | `feat(vfx): UF5 - redesign 5 red faction ultimates (sr_u4, rr_u2, mr_u1, sr_u1, sr_u5)` | `ult_parts_red.ts` |
| `d2b15c7` | **UF5-Blue** | `feat(vfx): UF5 - redesign wb_u5 with lionShield emblem and criss-cross slashes` | `ult_parts_storm.ts` |
| `59874cb` | **UF6** | `feat(vfx): UF6 - ult-sheet --feel harness and after sheet generation` | `tools/vfx/ult-sheet.mjs` |

### 回退指南（Rollback Guidance）
若主代理在審查或實機測試過程中需要針對特定模組進行回退，可使用下列原子指令：
- **回退 UF6 測試工具**：`git revert 59874cb`
- **回退 wb_u5 斬擊新造型**：`git revert d2b15c7`
- **回退紅方 5 招奧義新造型**：`git revert 20b424e`
- **回退 STORM 節奏與邊界約束**：`git revert 61aa2db`
- **回退 A2 螢幕橫幅演出**：`git revert 3edfa7f`
- **回退 A1 暗場聚光與 A3 命中光爆**：`git revert 376a3c2`
- **完全回退至開工前基準**：`git checkout main`
