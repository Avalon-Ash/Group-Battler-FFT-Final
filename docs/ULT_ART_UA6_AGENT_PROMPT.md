# 執行指令：奧義範圍顯示——範圍格閃光＋風暴落點散布（UA6）

> 用法：在 IDE 代理對話輸入 `/goal docs/ULT_ART_UA6_AGENT_PROMPT.md`。可以跑一整晚，照 §4 的觀測與重試規則，不要停在等待。
> 背景：UA0～UA5 已完成（分支 `feat/ult-art`，違規 132 → 3）。主代理審查發現舊 C6「貼地零件半徑對齊 `aoeRadius`」是錯的設計：
> ① 全場型奧義（`aoeRadius` 8～10）用一個巨大貼地零件表示範圍，半徑 550～720 px 蓋滿畫面；
> ② STORM 的每一擊都落在同一個點（沒有散布），每一擊卻也照整個範圍放大。
> 使用者決定（2026-10-21）：**範圍由「範圍內每一格亮一次」精確表示（D），STORM 每一擊縮小並撒在範圍內（C）**；中央貼地零件只是主爆發，不再負責表示範圍。全場奧義有詠唱與代價，範圍大沒關係，但要準確。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理，接續分支 `feat/ult-art`（不要開新分支）。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部，**特別是 §7「Long commands」**）、`engine/renderers/RenderSpec.ts`（全部；本輪新增一種格子疊層，要在**同一個 commit** 補上它的錨點與層序說明）、下列每個要改的檔案的方框檔頭：`engine/presentation/visuals/SequenceSystem.ts`、`engine/presentation/VisualSystem.ts`、`engine/presentation/vfx/VFXSystem.ts`、`engine/renderers/grid/GridRenderStrategy.ts`、`engine/renderers/grid/GridOverlays.ts`、`engine/renderers/grid/ZoneRenderer.ts`、`engine/renderers/RenderList.ts`、`engine/renderers/RenderDispatcher.ts`、`data/vfx/SkillSequences.ts`、`types/VFXSchema.ts`；以及 `tests/UltSpec.test.ts`、`docs/ULT_ART_REPORT.md` 的違規表。
- `git status` 必須乾淨、分支是 `feat/ult-art`。
- **長指令一律用 `node tools/agent/run.mjs <名稱> <逾時秒數> -- <指令>` 前景執行**（逾時表在 `AGENTS.md` §7）；結束看 `tools/ui-e2e/out/agent-logs/<名稱>.log` 最後一行 `EXIT=`；覺得在等就 `node tools/agent/run.mjs --check <名稱>`；同一步失敗或逾時兩次就記進報告、跳下一個任務。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/VFX_PIPELINE_MAP.md`、`docs/ART_SPEC.md`、`.claude/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`data/skills/**`、Facade（`engine/renderer.ts`、`engine/game.ts`）、`engine/systems/**`（模擬端）、其他測試的基準放寬方向。**保真基準一律不得重錄**。不准 `push`、不准動 `main`、不准合併。
- 本輪**可以改**的程式：§0 列出的表現層／渲染檔、`types/VFXSchema.ts`、`constants/vfx.ts`（新增參數）、`data/vfx/**`、`tests/**`（新增測試、`UltSpec` 與它的基準）、`tools/vfx/ult-sheet.mjs`、`docs/ULT_ART_REPORT.md`。新增檔案放在 `engine/presentation/vfx/`。

### 1. 已查證的事實（DOM，2026-10-21 的 `feat/ult-art`）
- **序列動作型別**：`types/VFXSchema.ts` 13～31 行 `VFXActionType`（PARTICLE／BEAM／SHAKE／GRID_PULSE／HEAVEN_FALL／WAIT）與 `VFXAction` 欄位。
- **序列執行**：`engine/presentation/visuals/SequenceSystem.ts`：`run(sequence, target: Point3D, engine, vfx, sourceId?, startDelay)`（約 39 行）把動作排進佇列；`dispatch` 的 `case 'PARTICLE'`（約 92 行）一律 `vfx.playEffect(effectId, target.x, target.y, target.z, …, groundZ, …, action.scale)`，**沒有落點散布**；`teamOf(sourceId, engine)` 可取施法者陣營。
- **序列建構**：`data/vfx/SkillSequences.ts` 約 143 行起建奧義序列；STORM 在約 183～192 行對同一目標排 `count` 個 PARTICLE（delay＝`hitAt + k × interval`）。檔案已 import `DEFAULT_SKILL_DB`，可用 `DEFAULT_SKILL_DB.find(s => s.id === ultId)` 取得 `type`／`aoeRadius`。
- **目標座標**：`engine/presentation/VisualSystem.ts` 約 55～72 行建 `target3D`；地面目標時 `z = engine.getTerrainHeight(hex.q, hex.r) + 5`（`HexUtils.fromPx` 求格）。散布後的每個落點**必須用同樣方式重算該點所在格的高度**，不可沿用中心點的 z（RenderSpec 的地面高度規則）。
- **既有的格子區域效果**：模擬端 `engine/systems/ZoneSystem.ts` 的 `getZoneAt(q, r)` 回傳 `ActiveZone`（`types.ts` 650 行：`q, r, radius, color, progress, isEnemy`）；`GridRenderStrategy.ts` 約 112 行 `op.oDanger = engine.zones.getZoneAt(q, r)`；`RenderList.ts` 約 43 行 `oDanger` 欄位；`RenderDispatcher.ts` 約 71 行把 `op.oDanger` 傳進 `GridOverlays.drawOverlays(…, zoneInfo, …)`；`GridOverlays.ts` 約 81 行用 `ZoneRenderer.drawTileZoneEffect(ctx, x, drawY − ZONE_LIFT, size, dist, radius, color, progress, isEnemy, layout)` 畫柔光格（擴張波紋＋底色＋邊界，參數 `constants/terrain.ts` `ZONE_RENDER`）。**範圍格閃光就重用這支畫法**，不要另寫一套六角繪製。
- **表現層重設**：`engine/presentation/vfx/VFXSystem.ts` 29 行 `reset()`；`engine.vfx` 是指向它的 getter，`GridRenderStrategy` 可經 `engine.vfx` 讀到表現層狀態。
- 地格：`HEX_SIZE 48`；格距用 `HexUtils.dist`（`engine/utils.ts` 61 行）；`HexUtils.toPx`／`fromPx` 換算。
- 目前大型奧義的最大貼地半徑（px）：`aoeRadius` 10 的 `mb_u3` 609、`mr_u4` 672、`rb_u2` 614、`sb_u3` 720、`sr_u4` 672、`tb_u2` 681、`tb_u5` 681；`aoeRadius` 8 的 `rr_u3` 563、`sr_u2` 546、`tr_u4` 573。總表上 `sr_u4` 命中後整格畫面變粉紅。
- `tests/UltSpec.test.ts` 四個問題：① 85 行 `(em.part as any).radius`（禁 `as any`）；② 基準檔不存在時測試會自己寫檔；③ 共用命中包粒子數寫死 `32`（實際定義在 `data/vfx/registry/ult_parts.ts` 44～45 行，可由 `VFX_REGISTRY` 實算）；④ `ALL_ULT_IDS` 手打。

### 2. 目標與規則（DOM）
**D. 範圍格閃光（新序列動作 `AREA_FLASH`）**
- `VFXActionType` 加 `'AREA_FLASH'`，`VFXAction` 加 `rings?: number`。`SkillSequences` 對**每個 AOE 奧義**（技能 `type !== 'SINGLE'`）在 `delay = hitAt` 加一個 `{ type: 'AREA_FLASH', rings: aoeRadius, color: ultConfig.primaryColor }`。
- 新檔 `engine/presentation/vfx/AreaFlashStore.ts`：持有進行中的閃光（中心格、半徑、顏色、陣營、開始時間）。**唯一寫入者**＝`SequenceSystem` 的 `AREA_FLASH` 分支（中心格＝`HexUtils.fromPx(target)`）；`VFXSystem.reset()` 清空；時間用 `engine.battleTime`（暫停時不前進）；過期自動移除；容量上限（例如 8 筆，超過丟最舊）。查詢 `getAt(q, r, now): ActiveZone | undefined`：回傳涵蓋該格、最新的一筆，`progress` 由經過時間換算，波紋由中心往外擴（讓全場奧義看得出「從這裡炸開」）。每幀零配置（回傳預先配置好的物件）。
- 渲染：`RenderList` op 加 `oFlash`（與 `oDanger` 同型別），`GridRenderStrategy` 在 `oDanger` 旁邊填 `op.oFlash = engine.vfx.areaFlash.getAt(q, r, now)`，`RenderDispatcher` 傳給 `GridOverlays`，`GridOverlays` 在畫完 `zoneInfo` 後用 **同一支** `ZoneRenderer.drawTileZoneEffect` 畫 `oFlash`（同一錨點：`drawY − ZONE_LIFT`）。不新增 op、不改排序鍵。
- 參數放 `constants/vfx.ts` 新的 `ULT_AREA_FLASH`（持續時間約 0.6～0.8 s、波紋擴張速度、整體不透明度上限），寫註解說明理由。不得更改 `ZONE_RENDER` 既有值（會改到縮圈的外觀）。
- `RenderSpec.ts`：在格子疊層說明加一行「範圍格閃光（AREA_FLASH）：表現層狀態，與 ActiveZone 同一畫法與錨點，畫在 zoneInfo 之後；不是獨立 op」，同一個 commit。

**C. STORM 落點散布**
- `VFXAction` 加 `scatterRings?: number`、`scatterIndex?: number`、`scatterCount?: number`。`SkillSequences` 的 STORM 迴圈對每一擊填 `scatterRings = aoeRadius`（SINGLE 的 STORM 奧義填 0）、`scatterIndex = k`、`scatterCount = count`。
- `SequenceSystem` 的 PARTICLE 分支：`scatterRings > 0` 時，落點＝中心＋確定性向日葵分佈偏移：角度 `k × 2.39996`（黃金角）、距離 `√((k + 0.5) / count) × 半徑像素`，半徑像素＝`scatterRings` 圈最外層格心的距離（用 `HexUtils` 實算，依目前地圖 layout）。偏移後用該點所在格重算 z（§1）。**不得用 `Math.random`**。
- 新增 `tests/UltScatter.test.ts`：同一組參數兩次結果完全相同；所有落點在 `scatterRings` 圈內；`scatterRings = 0` 時落點就是中心。

**C6 規則改寫（`tests/UltSpec.test.ts`）**
- C6a：AOE 奧義的序列有且只有一個 `AREA_FLASH`，`rings === aoeRadius`、`|delay − hitAt| ≤ 0.02`；SINGLE 奧義沒有 `AREA_FLASH`。
- C6b：中央貼地零件（非 STORM）最大半徑 ≤ 1.3 × `min(aoeRadius, 3)` 圈的格心距離；SINGLE ≤ 1.5 × `HEX_SIZE`。**沒有下限**（範圍改由 C6a 表示）。
- C6c：STORM 每一擊配方的最大貼地半徑 ≤ 1.5 × `HEX_SIZE`；AOE 的 STORM 每一擊都有 `scatterRings === aoeRadius`。
- 同時修 §1 列的四個測試問題：型別守衛取代 `as any`；基準檔不存在時測試失敗並提示，不寫檔；共用命中包粒子數依陣營從 `VFX_REGISTRY` 實算；`ALL_ULT_IDS` 改 `Object.keys(ULT_VISUALS).sort()` 並斷言共 50 個。
- 配方縮小只准動 `size`、`partAnim.scaleFrom/scaleTo`、`shapeRadius`，以及 `ult_visuals.ts` 的 `scale`（只准調小）；不加發射器、不換零件、不改色階。縮小後 C2（主爆發對齊）、C7（擴張環）不得變成違規。

**總表（`tools/vfx/ult-sheet.mjs`）**：每列多一欄「全景」：`hitAt + 0.25` 時把鏡頭拉遠到能看見整個 `aoeRadius` 範圍（SINGLE 用 2 圈），讓範圍格閃光與風暴散布看得到。

### 3. 任務（依序，每個任務一個 commit）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| UA6a | 測試清理＋C6 改寫（此時 C6a／C6c 會大量違規，照實重算基準） | `node tools/agent/run.mjs ua6-spec 300 -- npx vitest run tests/UltSpec.test.ts tests/UltPartRecipes.test.ts tests/ReferenceIntegrity.test.ts` |
| UA6b | D：`AREA_FLASH` 型別、`AreaFlashStore`、`SkillSequences`、`SequenceSystem`、渲染接線、`ULT_AREA_FLASH`、RenderSpec。新增 `tests/AreaFlashStore.test.ts`（中心與範圍判定、過期、重設、容量上限、`progress` 隨時間遞增）。C6a 歸零 | 上列測試＋新測試；`npm run lint`；`node tools/agent/run.mjs ua6b-smoke 180 -- node tools/ui-e2e/runtime-smoke.mjs` |
| UA6c | C：散布欄位、`SkillSequences` 填值、`SequenceSystem` 散布＋重算 z、`tests/UltScatter.test.ts` | 同上 |
| UA6d | 配方縮小：C6b、C6c 歸零（藍方一個 commit、紅方一個 commit），同步下調基準 | `ua6-spec` |
| UA6e | 總表加「全景」欄；重產 `after`：`node tools/agent/run.mjs ult-sheet 900 -- node tools/vfx/ult-sheet.mjs --out=tools/ui-e2e/out/ult/after`。看「全景」欄：每個 AOE 奧義的閃光格數與範圍一致、STORM 落點分散 | 總表與 json 存在 |
| UA6f | 最後驗證：`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard`、`runtime-smoke`、`npm run verify:coords`（長的都用 run.mjs） | 全綠；5 張地形與 UA5 數值相同；`CoordinateProtocol` 基準不增 |
| REPORT | `docs/ULT_ART_REPORT.md` 新增「UA6」一節：規則變更、D／C 的實作位置、每個縮小的奧義改前／改後最大貼地半徑、白色飽和比例最大值、`perf:guard` 數字、未完成項目與 log 路徑、回退指南（每個 commit） | — |

### 4. 守則與停下條件（INV）
- **觀測與重試**：長指令用 run.mjs；`--check` 顯示已結束就讀結果繼續，絕不等已結束的指令；同一步兩次失敗或逾時 → 報告記「未完成：<名稱>（log 路徑）」，跳下一個任務。沒有自己的 node 程序在跑時，不得等待超過 10 分鐘。
- 5 張地形保真有任何變動 → 停在當前任務、報告回報（`battle_frozen` 若變動：不得重錄，記數值與差異圖路徑，繼續）。
- `perf:guard` 的效能比較失敗 → 記錄並回報，不要靠刪特效或關閃光硬過。
- 縮小後 C2／C7 一定會壞 → 該奧義該規則留在基準，報告寫原因，不加發射器、不換零件。
- 規則看起來不合理 → 不扭曲實作去過測試，記「規則待主代理決定」。
- 一個狀態欄位只能有一個寫入者；`AreaFlashStore` 只能由 `SequenceSystem` 寫、`VFXSystem.reset()` 清。表現層不得寫模擬狀態，`engine/systems/**` 不得 import 新檔（`tests/LayerBoundary.test.ts`）。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網、每幀零配置。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「UA6 跑完了」，主代理審查並本機實跑後問你要不要合併 `feat/ult-art`。
2. 看 `tools/ui-e2e/out/ult/after/` 總表的「全景」欄（範圍格閃光、風暴散布），挑第二輪要重做造型的奧義。
