# 執行指令：網格效果優先序（R4）

> 給 Codex（主代理以 codex-companion task 派出）。背景：使用者 2026-10-22／26 回饋「戰場資訊太雜，最大問題是網格效果疊加，設個優先序應該能解掉大部分」。主代理 2026-10-27 盤點：同一格最多疊上 6 種地面資訊（狀態底色、縮圈內側染色、縮圈預警、詠唱預警、AOE 地面指示、危害場），目前除了危害粒子每格最多 2 個（`VFX_PARAM.HAZARD_FIELD_MAX_PER_CELL`），沒有任何優先序。
> 本輪只改**逐格的地面資訊層**怎麼疊，不改技能特效、不改玩法、不改地塊本體。
> **派工條件**：skin 整合（`feat/faction-skins`）合併進 main 之後才派（渲染工作同一時間只開一條）。

---

## 指令本文

你是本專案的執行代理，工作樹已經建好（主代理派工時填）：
- **工作樹**：`C:\Git\_wt_r1`（獨立 clone，`node_modules` 是複製的真目錄；不准跑任何 npm 安裝）
- **分支**：`fix/grid-priority`（已建好、已切換）
- **base**：`main` ＜派工時的 SHA＞

### 0. 開工前（INV）
- 只確認 `git rev-parse HEAD`（應等於上面的 base）與 `git status`（應乾淨），不建分支、不切分支。
- **不要 commit**（沙盒的 `.git` 唯讀）。改動留在工作樹，報告列出每個任務改了哪些檔，主代理審查後代為 commit。
- **中途不要詢問**；遇到停下條件就照 §5 寫報告後結束。
- 先讀：`AGENTS.md`（全部）、`engine/renderers/RenderSpec.ts`（檔頭、§1、§2、§9）、`engine/renderers/grid/GridRenderStrategy.ts`（檔頭、單位掃描段約 45～65 行、逐格提交段約 105～135 行）、`engine/renderers/grid/GridOverlays.ts`（全部）、`engine/renderers/grid/painters/HazardPainter.ts`（檔頭、液面那段約 55～72 行）、`engine/renderers/grid/ZoneRenderer.ts`、`engine/renderers/units/painters/UnitIndicatorPainter.ts`（`drawAoeIndicator`）、`engine/presentation/unit/UnitSystem.ts` 約 90～100 行（AOE 指示提交）、`constants/terrain.ts` 的 `GRID_OVERLAY`、`data/units/factionSkin.ts`（陣營色欄位）。其他檔案只用 grep 定位、讀片段。
- 先跑並記進報告（不綠就停下回報）：`npm run lint`、`npx vitest run --exclude "**/AgentRunner.test.ts"`（`AgentRunner` 的 2 項在沙盒內必失敗，主代理會在沙盒外跑完整 `npm test`）、`npm run build`。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；指令還在跑時不得結束回合。只有 `STATE=DONE EXIT=0` 算通過；`TIMEOUT` 重跑一次，同一步失敗兩次就記進報告並停下。逾時參考：測試 300 秒、build 300 秒、`npm run perf:guard` 900 秒、探針 300 秒。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`tests/*.baseline.json`、`engine/systems/**`、`data/skills/**`、`data/vfx/**`、`constants/vfx.ts`、`engine/renderers/GroundDrape.ts`、`engine/renderers/frame/**`、`engine/renderers/units/**`（AOE 指示圖案不改）。**保真基準不得重錄、門檻不得放寬。**
- 不准 `push`、不准動 `main`、不准合併、不准建其他分支或工作樹。
- 探索上限：同一個假設最多試 2 次。預計改動檔案：`constants/terrain.ts`、新檔 `engine/renderers/grid/GroundPriority.ts`、`GridRenderStrategy.ts`、`GridOverlays.ts`、`HazardPainter.ts`、`ZoneRenderer.ts`（只在需要時）、`RenderSpec.ts`、新測試、`tests/constants-snapshot.json`、新探針。超出這張清單先停下說明。

### 1. 已查證的事實（DOM，main 2026-10-27）
- **逐格提交**：`GridRenderStrategy` 每格提交一個 TERRAIN op（`oStatus`＝該格單位的狀態、`oDanger`＝`engine.zones.getZoneAt(q,r)`、地塊光），再視需要提交**一個** OVERLAY op（`isHoverRange`、`isCastAOE`、`isHover`、`isWarning`、`isLastStand` 合在一起），畫的順序固定，沒有優先序。
- **詠唱預警**：單位掃描段對每個 `castingSkillIdx !== -1 && currentTelegraph` 的單位，把 telegraph 的格子加進 `_castingAOE`，**顏色只取第一個施法者的 `skill.color`**（`if (!this._castingColor)`），所以紅藍同時詠唱時所有預警格同色。
- **AOE 地面指示**：`UnitSystem.ts:98` 對詠唱中 `aoeR > 0` 的技能，以**施法者腳底**為中心 `drape.addPainted(paintAoeIndicator, …, aoeR × (1 + GROUND_DRAPE.AOE_INDICATOR_PAD))`；圖案是 `UnitIndicatorPainter.drawAoeIndicator` 的 glow＋magicCircle 零件（`AOE_INDICATOR.ALPHA` 約 0.5 ± 脈動），**不是逐格填色**。指定目標的 AOE，telegraph 格子在目標周圍，與這個指示**不在同一處**。
- **透明度位置**：
  - `GridOverlays.ts`：背水一戰（`L.FILL_ALPHA + pulse × L.FILL_PULSE`）、狀態底色（`def.floorOpacity || G.STATUS_FLOOR_ALPHA`）、地塊光（`min(G.LIGHT.MAX_ALPHA, intensity × G.LIGHT.GAIN)`）、預警／射程／懸停柔光格（預警 `W.ALPHA_MIN + pulse × W.ALPHA_PULSE`）。
  - `GRID_OVERLAY.WARNING`（`constants/terrain.ts`）：`FILL '#ff2a1f'`、`FILL_ALPHA 0.75`、`ALPHA_MIN 0.65`、`ALPHA_PULSE 0.35`、`FREQ 5`。`RANGE.FILL_ALPHA 0.1`。
  - `HazardPainter.ts` 約 58～63 行：液面底 `ctx.globalAlpha = prev × fade` 後 `SurfacePainter.drawLiquid`；其上的煙、霧等零件層另畫。
  - `ZoneRenderer`：縮圈內側染色 `ZONE_RENDER.INSIDE_ALPHA 0.12`、`ENEMY_ALPHA 0.2`。

### 2. 目標與規則（DOM）
**優先序表（使用者 2026-10-27 核准）**：同一格只有最高優先的那一層保留完整填色，其他層照下表降低。

| 優先 | 類別（逐格層） | 同格有更高優先時 |
| :-- | :-- | :-- |
| 1 | 縮圈預警（`warningTiles`）、最終格、背水一戰 | —（預警整格填色上限從 0.75 降到約 0.4，邊線照常律動） |
| 2 | 詠唱預警（telegraph 格） | 透明度 × 約 0.35 |
| 3 | 危害場液面底 | 液面透明度 × 約 0.5；煙、霧等零件層不動 |
| 4 | 單位狀態底色 | 只留邊線（或填色 × 0.25，挑一種，報告寫理由） |
| 5 | 縮圈內側染色、地塊光 | 不畫 |
| 不受限 | 玩家懸停、射程（只有邊線）；AOE 地面指示圖案；技能特效貼地圖案 | 照舊 |

- **單一寫入者**：新增 `engine/renderers/grid/GroundPriority.ts`（方框檔頭寫職責、上游、[ARCH]）：純函式 `resolveGroundLayers(flags) → 各層透明度倍率`，以及每幀由 `GridRenderStrategy` 填一次的逐格優先表（每格一個整數，零配置：用已有的格索引陣列或重用的 typed array）。`GridOverlays`、`HazardPainter`、`ZoneRenderer` 只讀它算出的倍率，不自己判斷別層。
- **倍率與門檻是 SSOT**：放進 `constants/terrain.ts`（例如 `GRID_OVERLAY.PRIORITY`：各優先的降低倍率、預警新上限）。不寫魔術數字。
- **去重**：施法者的 telegraph 中心格＝施法者腳下格、且 `aoeRadius > 0`（AOE 指示已經畫在同一處）時，這些 telegraph 格**不再畫預警染色**；指定目標的 AOE（telegraph 在別處）照畫。判斷方式寫進 RenderSpec。
- **紅藍分色**：`_castingColor` 單一顏色改成逐格顏色（同格多個施法者取第一個，決定性即可），顏色取**施法者陣營色**（`data/units/factionSkin.ts` 已有的欄位，不新增顏色字面值）。
- **RenderSpec**：§1 OVERLAY／TERRAIN 描述與新增「逐格地面資訊優先序」一節（優先表、去重規則、單一寫入者），**和程式同一個任務改**；所改檔案的方框檔頭同步。
- **驗收**：
  1. 單元測試：`resolveGroundLayers` 對每種組合（例如預警＋危害＋狀態＋詠唱）回傳的倍率符合上表；「完整填色」的層（倍率 1 且該層有填色）每格最多 1 層。去重規則與逐格陣營色各一個測試。
  2. 新探針 `tools/ui-e2e/grid-priority-shot.mjs`（固定種子＋`__stepFrames`，照 `tools/ui-e2e/faction-shot.mjs` 的 init script 寫法）：在同一畫面擺出「縮圈預警＋危害場＋紅藍各一個詠唱中的 AOE＋一個被定身的單位」，改前／改後各截一張，放 `tools/ui-e2e/out/grid-priority/{before,after}.png`。報告寫：同一畫面中「完整填色 ≥ 2 層的格子數」改前／改後（從優先表與 flags 算，探針印出）。改後必須是 0。
  3. `npm run lint`、測試（排除 AgentRunner）、`npm run build`、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run perf:guard`、`npm run verify:coords` 全部通過。5 張地形保真必須通過；`battle_frozen` 若失敗，**不得重錄**，把 meanAbsDiff 與 `tools/ui-e2e/out/fidelity/` 差異圖路徑寫進報告。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| R4-0 | 寫探針，截改前圖、印改前「完整填色 ≥ 2 層」的格子數。不改渲染程式。 | 探針跑完；數字寫進報告草稿 |
| R4-1 | `GroundPriority.ts`＋常數＋單元測試＋快照。 | lint／測試／build |
| R4-2 | 接上 `GridRenderStrategy`／`GridOverlays`／`HazardPainter`／`ZoneRenderer`；去重；逐格陣營色；RenderSpec 與檔頭。 | 驗收 1、2 |
| R4-3 | 全套驗證。 | 驗收 3 |
| REPORT | `docs/R4_GRID_PRIORITY_REPORT.md`：改前／改後數字、截圖路徑、選定倍率的理由、沒達標的項目、每個任務改了哪些檔。 | — |

### 4. 守則與停下條件（INV）
- 要改 `GroundDrape`、AOE 指示圖案、技能特效或玩法才能達標：停下回報。
- 某層的透明度不是在本輪清單內的檔案決定：只記錄位置，不跨檔追改。
- 每幀不得新增物件配置（逐格表用重用陣列）；`perf:guard` 的效能護欄變差就停下回報。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。

### 5. 回報格式
最後的回覆只要：完成／未完成的任務 ID；每個任務改了哪些檔；每個檢查的「指令＋退出碼＋log 路徑」；改前／改後數字；截圖路徑；報告路徑。不要貼整段 log 或全文。
