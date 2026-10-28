# 執行指令：單位推擠飄移＋大逃殺格界死亡閃爍（R7）

> 給 GPT（Codex App）。怎麼拆、怎麼試由你決定；下面只寫目標、已查證的事實、硬限制和驗收。
> 背景（使用者 2026-10-28 實機）：
> 1. **推擠飄移**：單位互相推擠時位置會飄（看起來在滑、不在格子上）。
> 2. **大逃殺格界死亡閃爍**：單位死在縮圈塌落格與正常格的交界時，屍體模型閃爍。
> 這是渲染／座標工作：先讀 `engine/renderers/RenderSpec.ts`（檔頭、§1～§4、屍體與 §10 相關段）與所改檔案的方框檔頭；**改到規則時，同一個 commit 同步更新 RenderSpec 與檔頭。**

## 已查證的事實（main 2026-10-28）
- **推擠**：`engine/systems/movement/StackingResolver.ts` 把同一邏輯格的多個單位「彈」到鄰格，並給被彈者 `physics.vx/vy += 方向 × 200`（約第 60 行）；背水一戰時允許重疊直接 return。`physics.x/y` 是繪製位移＋彈簧（`engine/physics/PhysicsEngine.ts`，`a.physics.x += vx × dt`），邏輯位置是 `q/r`／`px/py`。受擊另有 `PhysicsEngine.applyImpulse`。`trailHistory` 的唯一寫入者是 `PhysicsSystem`。
- **屍體地面**：`engine/renderers/frame/UnitFrame.ts` 約 330～345 行：屍體腳點加上擊飛位移（`UnitDeathPainter.getKnockOffset`），腳下高度用 `computeDeathGround(...)`（`data/units/appearance/deathMotion.ts`），`hasGround` 來自 `RenderPipeline.ts:225`：`isValid(q, r) || zones.collapsingTiles.has(key)`。塌落中的格子在 `engine/game.ts:161-163` 回傳 `collapsing.h + collapsing.z`（掉落中會一直變低、可為負）。屍體排序鍵有排序格滯後與 2 px 死區（RenderSpec §2）。
- 已知且已決定不修：屍體滑行中與特效的短暫排序翻轉（DECISIONS §5 2026-10-27，R3）。**已否決的修法不要再提**：永久鎖定屍體排序格、`vz < -50` 過濾、高度 clamp。

## 目標
1. **先重現、量化，再修**：做一支探針（放 `tools/ui-e2e/`，固定種子，方框檔頭寫用法），分別量：
   - 推擠：擁擠情境下，靜止（沒在走、沒受擊）單位的繪製位置離所在格中心的偏移量（最大值、持續時間），以及偏移是否在數秒內回到 0。
   - 死亡閃爍：大逃殺縮圈時，死在塌落格交界的屍體逐幀的腳下高度、繪製 Y、排序格與排序鍵；找出是哪一個值在來回跳（高度在兩格之間切換？排序格切換？塌落格高度變動？）。
   把根因（檔案:行號＋逐幀數字）寫進報告。**修法必須對應到根因**，不要加安全網。
2. **修正後**：推擠後靜止單位會回到格子上（沒有持續滑動或停在格界外）；死在格界的屍體不再閃爍（腳下高度與排序鍵不再逐幀來回）。

## 硬限制
- **不得改變模擬結果**：修法只能動繪製位移、渲染與屍體繪製。用 `node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=<檔>` 在改前／改後各跑一次，**逐場結果必須完全相同**；不同就代表動到了玩法，停下回報（BAL-03 正在用這些數值調平衡）。若根因確實在邏輯層（例如 `StackingResolver` 把單位放到錯的格子），寫進報告並停下，不要改。
- 從最新 `main` 開分支 `fix/drift-corpse`，**在另一個工作樹做**（BAL-03 正在用你現在的工作樹）。不准 rebase、不准合併、不准 push、不准動 `main`。
- **受保護檔案**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`data/skills/**`、`tools/balance/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`。`tests/*.baseline.json` 只准**刪除**測試要求移除的已修好項目，新增或放寬一律停下。
- **保真基準不得重錄、門檻不得放寬**；`battle_frozen` 若失敗，產生舊／新／差異圖交給主代理。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不寫魔術數字（新參數放 `constants/`）。

## 驗收（交回前全部要有）
1. 探針改前／改後數字：推擠偏移（最大值、回正時間）、死亡閃爍（交界屍體的高度／排序鍵來回次數）。改後閃爍為 0，推擠後靜止單位會回正。
2. 300 場模擬改前改後逐場相同。
3. `npm run verify:coords -- --sink --flicker --order --seeds=2 --seedStart=1 --seconds=10 --orderSeconds=10 --biomes=FOREST,VOID,MAGMA --orderBiomes=FOREST,VOID,MAGMA`（COORD-R1 參數）：改後 sink 違規、static 振盪、穩定錯序 episodes／wrongFrames 都不得比改前多。目前基準：穩定錯序 9 段（34 pair-frames）、wrongFrames 105、振盪 65、sink 1。
4. `tests/CoordinateProtocol.test.ts` 通過；新增單元測試鎖住修正的規則。
5. `npm run lint`、`npm test`、`npm run build`、`node tools/ui-e2e/runtime-smoke.mjs --shot`、`npm run perf:guard`、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle` 全部通過。
6. 報告 `docs/R7_DRIFT_CORPSE_REPORT.md`：根因（含逐幀證據）、修法與為何對應根因、改前／改後數字表、驗收結果、沒達標的項目、回退指南（每個 commit 改了什麼）。

## 回來後（給使用者看）
把 GPT 的最後回覆貼給主代理；主代理審 `git diff main...fix/drift-corpse`、重跑關鍵量測，與 BAL-03 排好合併順序（兩條都會改 `battle_frozen`，先合一條、另一條合併後再取證重錄一次）。
