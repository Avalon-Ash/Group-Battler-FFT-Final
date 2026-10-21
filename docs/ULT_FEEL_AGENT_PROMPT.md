# 執行指令：奧義有感（UF）

> 用法：在 IDE 代理對話輸入 `/goal docs/ULT_FEEL_AGENT_PROMPT.md`。可以跑一整晚，照 §4 的觀測與重試規則，不要停在等待。
> 背景：奧義規格化（UA／UA6）已合併：50 個奧義的時序、範圍、層數都合規（`tests/UltSpec.test.ts`，違規 3）。使用者的回饋是「**奧義要有感**」。本輪做兩件事：
> ① **共用演出**（50 個奧義全部受益）：詠唱暗場＋施法者聚光、奧義名橫幅、命中點光爆；
> ② **少數重做**：STORM 節奏差異化、落點不出地圖，6 個辨識度或觀感有問題的奧義。
> 已決定**不做**：鏡頭推近（縮放會觸發地形重烘焙，曾造成卡頓）、模擬時間頓格（表現層不得寫模擬時間）、命中時的範圍格閃光（詠唱逐格預警已足）。規格見 `docs/ART_SPEC.md` §6 與 `docs/DECISIONS.md` §4（本輪已更新）。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部，**特別是 §7「Long commands」**）、`engine/renderers/RenderSpec.ts`（全部；本輪新增畫面層，要在**同一個 commit** 補上層序與錨點說明）、`docs/ART_SPEC.md` §6、以及每個要改的檔案的方框檔頭。
- 從 `main` 開分支 `feat/ult-feel`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`（記下 6 個場景 meanAbsDiff 與效能比率）、`node tools/ui-e2e/runtime-smoke.mjs`。長指令都用 run.mjs。
- **長指令一律用 `node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令>` 前景執行**（逾時表在 `AGENTS.md` §7）；結束看 `tools/ui-e2e/out/agent-logs/<名稱>.log` 最後一行 `EXIT=`；覺得在等就 `node tools/agent/run.mjs --check <名稱>`；同一步失敗或逾時兩次就記進報告、跳下一個任務。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/VFX_PIPELINE_MAP.md`、`docs/ART_SPEC.md`、`.claude/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`data/skills/**`、Facade（`engine/renderer.ts`、`engine/game.ts`）、`engine/systems/**`、`engine/presentation/CameraSystem.ts`、`engine/presentation/DirectorSystem.ts`、`constants/terrain.ts`、`constants/render.ts`、其他測試的基準放寬方向（`tests/ult-spec.baseline.json` 只准減少）。**保真基準一律不得重錄**。不准 `push`、不准動 `main`、不准合併。
- **可以改**：`engine/presentation/**`（上列兩檔除外）、`engine/renderers/RenderPipeline.ts`、`engine/renderers/HUDRenderer.ts`、`engine/renderers/hud/**`、新檔 `engine/renderers/ult/**`、`engine/renderers/RenderSpec.ts`、`constants/vfx.ts`（新增 `ULT_FEEL`）、`types/VFXSchema.ts`、`data/vfx/**`、`tests/**`、`tools/vfx/**`、新報告 `docs/ULT_FEEL_REPORT.md`。

### 1. 已查證的事實（DOM，2026-10-21 的 main）
- **繪製順序** `engine/renderers/RenderPipeline.ts` 約 150～190 行：① `camera.applyTransform` → `drawWorld` → restore；② PostProcessor（`post.apply`、`applyToneGrade`）；③ 再 `camera.applyTransform` → `tactical.drawOverlay` → `hud.draw(ctx, …, frames, …)` → restore；④ 導播框 `tactical.drawHUD`。`this.frames`（UnitFrame 快照，含 `footX`、`floorY`、`hudAnchorY`）在 `drawWorld` 開頭建立。
- **暗場與命中光的位置**：畫在 ③ 的 `applyTransform` 之後、`tactical.drawOverlay` 之前（世界座標，HUD 血條仍在上面、不被壓暗；後製之後所以不被色調分級）。聚光中心讀施法者的 `UnitFrame`（世界座標，與單位繪製同一把尺），不要自己重算高度。
- **畫面橫幅**：參考 `engine/renderers/HUDRenderer.ts` 的 `drawLastStandBanner`（約 38～100 行，螢幕座標、`getRenderDpr()`、漸層依畫布尺寸快取、參數 `LAST_STAND_BANNER`）。字型用 `engine/renderers/hud/TextPainter.ts` 的 `'ULT'` 字型種類。
- **事件**：`engine.bus` 的 `CAST_START`（`data.skill.tag === 'ULT'`、`data.sourceId`；`DirectorSystem.ts` 約 42 行已這樣用）、`CAST_BREAK`（`engine/presentation/VisualSystem.ts` 約 76 行取消序列）。奧義序列在 `VisualSystem.ts` 約 71 行以 `startDelay = max(0, cast − hitAt)` 排程，序列的 `hitAt` 就是傷害那一刻。
- **頭頂奧義名**：`engine/presentation/visuals/EventHUDMapper.ts` 約 138～165 行，ULT 的詠唱文字（SHOUT）用 `HUD_LAYOUT.CAST_BAR_Y_OFFSET_ULT`。
- **序列建構**：`data/vfx/SkillSequences.ts` 約 143 行起；STORM 在約 183～200 行，每擊 delay＝`hitAt + k × interval`，帶 `scatterRings／scatterIndex／scatterCount`。`engine/presentation/visuals/SequenceSystem.ts` 的 `computeScatterOffset`（黃金角向日葵）與 PARTICLE 分支（每個落點 `HexUtils.fromPx` 求格、`getTerrainHeight + 5`）。**落點超出地圖時 `getTerrainHeight` 回 0**（`engine/systems/map.ts` 69 行），特效會懸在空中。地圖是否有某格：`engine.map` 的高度表有沒有該格的鍵（先查證最合適的 API）。
- **奧義表** `data/vfx/ult_visuals.ts`（`UltVisualDef`、`ULT_SEQUENCE`）；配方 `data/vfx/registry/ult_parts*.ts`；零件種類與紋章清單在 `engine/renderers/vfxparts/PartSpec.ts`（`SigilEmblem` 13 行：`sun`／`lionShield`／`hornSkull`／`invTriangle`）；品質階層 `engine/renderers/RenderQuality.ts` 的 `getQualityTier()`。
- **重做名單**（技能名／描述讀 `data/skills/*_ult.ts`）：
  - `sr_u4` 猩紅血月（全隊吸血，增益）：配方 `FX_ULT_RED_BLOOD_MOON` 的 glow 半徑 140 × scaleTo 1.1 × 序列 scale 1.4 ≈ 215 px、壽命 1.4 s，總表上整格變粉紅。
  - `rr_u2` 焦土衝擊（大範圍擊退）、`mr_u1` 毀滅隕石（延遲高傷）：命中後 0.8 s 餘韻火焰鋪滿。
  - `wb_u5` 光速斬擊（瞬移斬擊）：起手紋章與 `mb_u5` 聚能光束同為日輪，容易混淆。
  - `sr_u1` 靈魂連結（群體禁錮）、`sr_u5` 惡靈附身（單體強化）：與 `sr_u3` 同為 `ASH_VOID` 紫黑＋倒三角／角骷髏，辨識度接近。
  - STORM 節奏雷同：`rb_u5` 劇毒箭雨、`rr_u3` 煉獄火雨、`mr_u5` 靈魂爆燃都是等間隔 8 擊。

### 2. 目標與規則（DOM）
**A. 共用演出（參數全部放 `constants/vfx.ts` 新的 `ULT_FEEL`，每個值寫註解）**
- **狀態**：新檔 `engine/presentation/vfx/UltFeelStore.ts`。寫入者只有兩個入口：`VisualSystem`（CAST_START 是 ULT → 記錄施法者、技能名、陣營、詠唱長度；CAST_BREAK → 移除該施法者）與 `SequenceSystem`（新序列動作 `ULT_IMPACT` 於 `hitAt` 觸發 → 記錄命中點與陣營）。`VFXSystem.reset()` 清空。時間用 `engine.battleTime`。容量固定、每幀零配置。
- **A1 暗場＋聚光**：任一奧義詠唱中，世界層蓋一層暗色（不透明度隨詠唱淡入，上限 `DIM_ALPHA ≤ 0.4`），最新的最多 2 個施法者周圍挖出柔邊聚光（半徑約 2.5 格，乘目前鏡頭縮放）。命中後在 `DIM_FADE_OUT` 內淡出。聚光用一次烘焙的徑向漸層 sprite，每幀只做 `drawImage`／`fillRect`；不得每幀建立漸層。品質階層最低一級（`RenderQuality`）時關閉聚光、只留較淡的暗場。
- **A2 奧義名橫幅**：CAST_START 時從畫面一側滑入、停留、滑出（總長約 1.0～1.3 s），顯示技能名，陣營色取 `factionSkin`（不寫死色碼）。同時多個奧義只顯示最新一個。橫幅出現時，該奧義的頭頂 SHOUT 文字不再顯示（其他技能不變）。
- **A3 命中光爆**：`ULT_IMPACT` 時在命中點畫一圈局部光爆（一次烘焙的 sprite，加法混合，不透明度 ≤ 0.35，0.15～0.25 s 擴張淡出），範圍約 2～3 格，不是全畫面閃白。
- **序列**：`types/VFXSchema.ts` 加 `'ULT_IMPACT'`；`SkillSequences` 對每個奧義在 `delay = hitAt` 加一個 `ULT_IMPACT`。CAST_BREAK 取消序列時一併不觸發（已有的佇列取消機制）。
- `RenderSpec.ts`：補「奧義暗場／聚光／命中光爆：表現層狀態，畫在後製之後、tactical overlay 與 HUD 之前（世界座標，聚光中心讀 UnitFrame）；奧義橫幅：HUD 螢幕座標層」，同一個 commit。

**B. STORM 節奏與落點**
- `UltVisualDef` 加 `cadence?: 'EVEN' | 'ACCEL' | 'CLUSTER'`（預設 EVEN）。`SkillSequences` 依 cadence 算每擊 delay：ACCEL＝前慢後快（總長不變）、CLUSTER＝三擊一組、組間停頓。設定 `rr_u3`＝ACCEL、`rb_u5`＝CLUSTER、`mr_u5` 維持 EVEN。全部確定性。
- 落點出地圖：`SequenceSystem` 散布後若該格不在地圖上，沿中心方向依固定比例縮回（最多幾次，仍不在就落在中心），確定性。補進 `tests/UltScatter.test.ts`。

**C. 6 個奧義重做（只改 `data/vfx/**`，可用既有零件種類、既有紋章、既有色階；可增刪發射器）**
- `sr_u4`：血月改成懸在目標上空的月輪（空中層、較小），血色光柱往下灑、吸血光點往上回流到隊友方向（增益＝上升聚合）；不再整片粉紅。
- `rr_u2`、`mr_u1`：餘韻改成焦痕＋零星餘燼，命中 0.6 s 後明顯收斂。
- `wb_u5`：起手紋章由 `sun` 換成 `lionShield`（`SigilEmblem` 目前只有 `sun`／`lionShield`／`hornSkull`／`invTriangle`，不新增紋章），並用 `slashArc` 零件做出交錯的瞬移斬痕，與 `mb_u5` 的日輪光束區分。
- `sr_u1`：強化鎖鏈／束縛感（環狀收緊、連結線）；`sr_u5`：改成鬼火火焰感（`flame` 零件＋`ASH_VOID` 色階），與 `sr_u3` 拉開。
- 重做後 `UltSpec` C1～C8 不得新增違規。

**驗收**
- 新增 `tests/UltFeelStore.test.ts`（CAST_START 記錄、CAST_BREAK 移除、ULT_IMPACT 記錄與過期、聚光最多 2 個、最新橫幅優先、reset 清空）與 cadence 的確定性測試。
- `tools/vfx/ult-sheet.mjs` 加 `--feel` 模式：對 `sr_u4`、`rr_u2`、`mr_u1`、`wb_u5`、`sr_u1`、`sr_u5`、`rr_u3`、`rb_u5` 各截**全畫面**（不裁切）三張：詠唱中（hitAt−0.3）、命中（hitAt＋0.03）、餘韻（hitAt＋0.6），拼成 `tools/ui-e2e/out/ult/feel.png`。用來確認暗場、聚光、橫幅、光爆真的出現且沒有蓋住血條。

### 3. 任務（依序，每個任務一個 commit）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| UF0 | 基準（§0） | 全綠 |
| UF1 | `UltFeelStore`＋`ULT_IMPACT` 動作＋`ULT_FEEL` 常數＋測試（還不畫） | 相關測試；lint |
| UF2 | A1 暗場聚光＋A3 命中光爆的繪製＋RenderSpec | lint／test／build；`runtime-smoke`；`perf:guard` |
| UF3 | A2 奧義名橫幅＋ULT 頭頂 SHOUT 隱藏 | 同上 |
| UF4 | B：cadence＋落點不出地圖＋測試 | `UltSpec`、`UltScatter`、cadence 測試 |
| UF5 | C：6 個奧義重做（紅方一個 commit、`wb_u5` 一個 commit） | `UltSpec` 不增違規 |
| UF6 | `ult-sheet --feel` 與完整 after 總表重產；最後 `npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`runtime-smoke` | 全綠；5 張地形與 UF0 相同 |
| REPORT | `docs/ULT_FEEL_REPORT.md`：改前／改後數字（保真、效能比率）、每個改動的位置與理由、`feel.png` 路徑、未完成項目與 log 路徑、回退指南（每個 commit） | — |

### 4. 守則與停下條件（INV）
- **觀測與重試**：長指令用 run.mjs；`--check` 顯示已結束就讀結果繼續，絕不等已結束的指令；同一步兩次失敗或逾時 → 報告記「未完成：<名稱>（log 路徑）」，跳下一個任務。沒有自己的 node 程序在跑時，不得等待超過 10 分鐘。
- 5 張地形保真有任何變動 → 停在當前任務回報。`battle_frozen` 若因暗場或橫幅變動：**不得重錄**，記數值與差異圖路徑，繼續。
- `perf:guard` 效能比較失敗 → 先查是不是每幀建立漸層或配置物件；仍失敗就回報，不要關掉演出硬過。
- 不得改 `camera.zoom`、不得寫 `engine.state.time`／`timeScale`（表現層不寫模擬狀態，`tests/LayerBoundary.test.ts`）。
- 一個狀態欄位只能有一個寫入者；`UltFeelStore` 只由 §2-A 列的兩個入口寫、`VFXSystem.reset()` 清。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網、渲染迴圈每幀零配置、不寫死色碼（顏色走 `factionSkin`／色階／`ULT_FEEL`）。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「奧義有感跑完了」，主代理審查並本機實跑後問你要不要合併。
2. 實機看：奧義詠唱時是否暗場聚光、名稱橫幅、命中光爆夠有感又不刺眼；`sr_u4` 血月、`sr_u5` 鬼火、`wb_u5` 斬擊的新造型；風暴的節奏差異。
