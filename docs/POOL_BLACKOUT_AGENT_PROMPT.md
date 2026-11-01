# 執行指令：玩法面板總池制＋轉場壓黑（A＋B）

> 派工：主代理用 agy 派（Gemini 3.8 Flash high）。
> 背景：使用者實機回饋。A：陣營數×每陣營人數要受「本張地圖可出生格數 − 1」限制（另有硬上限 40）。B：換場時背景色相跳動，改成轉場壓黑。常數、型別欄位、規格測試主代理已加好（commit `11fc922`、下一個 commit）。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_ab`（分支 `feat/pool-blackout`，主代理已建好）。**只准改這個資料夾內的檔案。**

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`engine/renderers/RenderSpec.ts`、`engine/renderers/RenderPipeline.ts` 的方框檔頭。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。
- **只能跑這些指令**：`git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`git log --oneline -10`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`npm run perf:guard`、`node tools/ui-e2e/runtime-smoke.mjs`。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 開工時 `npm test` 會有 3 個失敗（`tests/UICommandSystem.test.ts` 的總池規格測試，`querySpawnableHexes` 還不存在、selector 欄位還沒加）——這是你要讓它通過的規格，其他測試必須全綠。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、`tests/**`（全部測試檔與 `tests/constants-snapshot.json`）、`constants/**`（常數主代理已加好，不准新增或修改）。**保真基準一律不得重錄。**
- 不要 commit、不准 push、不准合併、**不准用 git 還原任何檔案**（`git checkout`、`git restore`、`git stash` 都不准）。
- 同一個驗收失敗兩次就停下，寫報告後結束；不要改測試讓它過。中途不要詢問。

### 1. 已查證的事實（DOM）
- 常數（已加）：`UI_SETTINGS.BATTLE_FACTIONS {min 2, max 40}`、`UI_SETTINGS.BATTLE_UNITS_PER_FACTION {min 1, max 40}`、`UI_SETTINGS.BATTLE_MAX_UNITS = 40`（`constants/ui.ts`）；`BACKGROUND_FX.BLACKOUT_FADE_S = 0.35`、`BACKGROUND_FX.BLACKOUT_COLOR = '#000000'`（`constants/terrain.ts`）。
- 型別（已加）：`data/ui/settingsSchema.ts` 的 `SliderSettingField.maxValueId?: string`（動態上限的值 id）。
- 可出生格的判定目前寫在 `hooks/useGameApp.ts` 的 `internalSpawnTeams` 開頭：`queryMapKeys(engine)` 轉成 `{q,r}`，排除 `queryHasObstacle`，只留 `HexUtils.dist({q:0,r:0}, hex) < radius`，`radius = Math.floor(Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2) + 1`。
- `engine.battleSetup` 唯一寫入者是 `engine/systems/ui/UICommandSystem.ts` 的 `case 'SET_BATTLE_SETUP'`（目前用 `BATTLE_MAX_UNITS / factions` 壓每陣營人數）。
- `engine/systems/ui/selectors.ts` 的 `selectBattleSetupView` 目前只回傳 `{ factions, unitsPerFaction }`。
- 面板 schema：`data/ui/settingsSchema.ts` 的 `GAMEPLAY_SETTINGS_SCHEMA`（`battleFactions`、`battleUnitsPerFaction` 兩個滑桿）；值由 `components/ui/settings/SettingsWindows.tsx` 的 `useGameplaySettingsValues` 提供；滑桿畫在 `components/ui/settings/SchemaForm.tsx`。
- 轉場：`engine/renderers/RenderPipeline.ts` 的 `update(dt, engine)` 推進 `transitionT`，`transitionPhase` 是 `'IN' | 'OUT' | 'IDLE'`；換場景發生在 OUT→IN 之間。

### 2. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| A1 | ① `engine/systems/ui/editorQueries.ts` 新增 `export function querySpawnableHexes(engine: GameEngine): { q: number; r: number }[]`，判定照搬上面「可出生格」那段；`useGameApp.internalSpawnTeams` 改呼叫它（行為不變）。② `SET_BATTLE_SETUP` 改成：`pool = Math.min(querySpawnableHexes(engine).length - 1, UI_SETTINGS.BATTLE_MAX_UNITS)`；`factions` 夾在 `[BATTLE_FACTIONS.min, Math.max(BATTLE_FACTIONS.min, pool)]`；`unitsPerFaction` 夾在 `[BATTLE_UNITS_PER_FACTION.min, Math.max(BATTLE_UNITS_PER_FACTION.min, Math.floor(pool / factions))]`。③ `selectBattleSetupView` 回傳 `{ factions, unitsPerFaction, pool, maxFactions, maxUnitsPerFaction }`（`maxFactions = Math.max(min, pool)`，`maxUnitsPerFaction` 同上式），在 selectors.ts 宣告 `export interface BattleSetupView`（全部 readonly），快取比較五個欄位。 | `npm test` 的 3 個規格測試轉綠 |
| A2 | ① `SchemaForm` 滑桿：`maxValueId` 有設且 `values[maxValueId]` 是數字時，用它當 `max`。② schema：`battleFactions` 設 `maxValueId: 'battleFactionsMax'`、`battleUnitsPerFaction` 設 `maxValueId: 'battleUnitsMax'`；`useGameplaySettingsValues` 回傳這兩個值（取 view 的 `maxFactions`、`maxUnitsPerFaction`）。③ `useGameApp.internalSpawnTeams`：規劃／使用陣容之前，先 `engine.bus.emit('UI_COMMAND', { type: 'SET_BATTLE_SETUP', setup: { ...engine.battleSetup } })` 依新地圖重新夾一次；夾完的 `engine.battleSetup` 和 `plannedSetupRef.current` 不同就重新 `planShowcaseRoster()`。 | lint／test／build／knip |
| B1 | `RenderPipeline` 加私有欄位 `blackout = 0`。`update` 裡：目標＝`transitionPhase === 'OUT' ? 1 : 0`，每幀往目標移動 `dt / BACKGROUND_FX.BLACKOUT_FADE_S`（夾在 0～1）。繪製：在一幀所有內容（含後製）畫完之後、最上層，`blackout > 0` 時以 `globalAlpha = blackout`、`fillStyle = BACKGROUND_FX.BLACKOUT_COLOR` 蓋滿畫布（用 save/restore，重設 transform 到螢幕座標）。不得改其他層的順序或數值。同一個 commit 範圍內在 `RenderSpec.ts` 的層序說明與 `RenderPipeline.ts` 方框檔頭各加一行「轉場黑幕：最上層、只在轉場中」。 | lint／test／build／knip、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run perf:guard`（保真 6/6 必須通過） |
| REPORT | `docs/POOL_BLACKOUT_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的「指令＋退出碼」、沒做到的事。只寫事實與數字，不寫效果形容詞。 | — |

### 3. 守則（INV）
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不寫數字或顏色字面值（用上面的常數；需要新常數就停下回報）。
- 不加安全網（例如額外的 try/catch、看門狗）；被驗證的對象不准 mock。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、實跑確認黑幕在換場時蓋滿，再問你要不要合併。
2. 實機看：換場還閃不閃；面板滑桿上限會跟地圖大小變。
