# 執行指令：表現層分離（ECS-lite S2＋S3）

> 用法：在 IDE 代理對話輸入 `/goal docs/archive/PRESENTATION_LAYER_AGENT_PROMPT.md`。
> 背景：`docs/ECS_LITE_ASSESSMENT.md` §2 S2、S3。渲染相關的「系統」（特效、單位提交、HUD、鏡頭、動畫推導）放在 `engine/systems/` 底下，模擬端有 14 個檔 import 渲染層、渲染層有 9 個檔反過來 import 系統層。查問題時看不出「誰會改模擬狀態」。本輪把表現端搬到 `engine/presentation/`，讓模擬端不再 import 表現端；純視覺欄位收進 `agent.view`。
> **本輪是純搬移／改名：遊戲行為與畫面必須完全不變。** 任何基準不得重錄、門檻不得放寬。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前
- 先讀：`AGENTS.md`（全部）、`docs/ECS_LITE_ASSESSMENT.md`、`engine/renderers/RenderSpec.ts`（座標協議，全部）、`engine/core/AgentOwnership.ts`、`tests/AgentOwnership.test.ts`、`engine/systems/AnimationSystem.ts`、`engine/game.ts`、`engine/renderer.ts`，以及下面「搬移清單」每個檔的方框檔頭（職責／上游／[ARCH]）。
- 從 `main` 開分支 `feat/presentation-layer`；`git status` 必須乾淨。先跑一次並把結果記進報告（「改前」基準，任何一項不綠就停下回報）：`npm run lint`、`npx vitest run --dir tests`、`npm run build`、`npm run perf:fidelity`（記下每個場景的 meanAbsDiff）、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`、`npm run verify:coords`（記下振盪／錯序數字）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`tools/ui-e2e/baseline/**`、所有 `tests/*.baseline.json` 的放寬方向。`engine/renderers/RenderSpec.ts` **只准更新檔案路徑與欄位名稱**（搬檔、改名後同一個 commit 同步），不得改任何規則文字。
- Facade（`engine/game.ts`、`engine/renderer.ts`、`engine/systems/grid.ts`）只准做本輪的 import 路徑更新與下面明列的拆分，不得加邏輯。
- 不准 `push`、不准動 `main`、不准合併。一個任務一個 commit。

### 1. 目標設計（照做，不要自行改設計；有矛盾就停下回報）

**分層**
- 模擬端：`engine/systems/**`、`engine/ai/**`、`engine/physics/**`、`engine/core/**`、`engine/events/**`、`engine/math/**`、`engine/types/**`、`engine/behaviorTree.ts`、`engine/utils.ts`。
- 表現端：`engine/presentation/**`（新）、`engine/renderers/**`、`engine/graphics/**`、`engine/renderer.ts`。
- `engine/game.ts` 是組裝根，兩邊都可以 import；`engine/audio/**`、`engine/systems/audio/**` 本輪不動、不計入。
- 規則：**模擬端不得 import 表現端**（含 `import type`）。表現端可以讀模擬端（型別、查詢函式），但不得寫模擬狀態。

**搬移清單（`git mv`，保留歷史）**

| 現在 | 搬到 |
| :-- | :-- |
| `engine/systems/vfx/**`、barrel `engine/systems/vfx.ts` | `engine/presentation/vfx/**`、`engine/presentation/vfx.ts` |
| `engine/systems/visuals/**` | `engine/presentation/visuals/**` |
| `engine/systems/unit/UnitSystem.ts`、barrel `engine/systems/unit.ts` | `engine/presentation/unit/UnitSystem.ts`、`engine/presentation/unit.ts`（`RagdollFactory.ts`：若只有表現端 import 就一起搬，否則留在原處並在報告說明） |
| `engine/systems/hud.ts` | `engine/presentation/hud.ts` |
| `engine/systems/VisualSystem.ts`、`AnimationSystem.ts`、`CameraSystem.ts`、`CameraTargetGroup.ts`、`DirectorSystem.ts`、`DesignExporter.ts` | `engine/presentation/` 同名 |
| `engine/systems/grid/GridCache.ts`（地形烘焙的鄰格遮罩快取） | `engine/renderers/grid/GridCache.ts` |
| `engine/systems/ZoneSystem.ts` 的 `ActiveZone` 型別 | `types.ts`（`ZoneSystem` 改 import 它；`ZoneSystem` 本身留在模擬端） |

- `engine/systems/grid.ts`（`GridSystem` facade）目前持有 `GridRenderStrategy` 並提交 RenderOp：把「提交 RenderOp」那段移到表現端（呼叫端 `engine/renderers/tactical.ts` 直接持有 `GridRenderStrategy`），`GridSystem` 只留網格查詢與地形高度。這是本輪唯一允許的 facade 公開介面變更。
- 清單以外的檔案**不要搬**。清單內某檔若被模擬端拿來做非視覺邏輯（例如 AI 讀它的計算結果），停下回報，不要自己拆。

**視覺指令（取代模擬端對 AnimationSystem 的呼叫）**
- 新增 `engine/core/ViewCommands.ts`：把 `triggerHitFlash`、`triggerHitShake`（現在在 `AnimationSystem.ts`）原封不動搬過去，模擬端（`PhysicsEngine`、戰鬥系統等）改 import 這裡。函式內容、呼叫時機不變。

**外觀欄位分組（S3：`agent.view`）**
```ts
// types.ts 或 engine/types/（依現有慣例）
export interface AgentView {
  visualStatus: ...;   // 原 agent.visualStatus（型別照搬）
  hitFlashTimer: number;
  visualOffset: ...;   // 原 agent.visualOffset（型別照搬）
}
```
- `Agent` 新增 `public view: AgentView = createAgentView();`（建構時配置一次，`reset()` 呼叫 `resetAgentView(this.view)`），刪除三個舊欄位。**不加方法、不加 getter。**`createAgentView`／`resetAgentView` 放 `engine/core/ViewCommands.ts`。
- `animState`、`trailHistory`：先 grep 全部寫入點。**只有在所有寫入者都是表現端、`ViewCommands.ts` 或生命週期（`Agent.reset`、`agentManager`）時**才一起收進 `view`；否則留原處，在報告列出寫入者。`ccVisual` 是 CCManager／ControlSystem 寫的模擬狀態，**不動**。
- `AgentOwnership.ts`：三個舊欄位的列刪除，新增 `view` 一列（group `visual`，owners＝`AnimationSystem` 新路徑＋`engine/core/ViewCommands.ts`）。搬檔造成的 owners 路徑更新照實改；棘輪基準只能變少。

### 2. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **PL0** | 新增 `tests/LayerBoundary.test.ts`：掃模擬端（§1 清單）每個 `.ts` 的 `import`／`export … from`（含 `import type`、動態 `import()`），解析相對路徑，計算落到表現端的 import 數；基準寫在測試內（＝當下實測，預期約 30 條，以檔案:目標列出），**只准減少**。另計表現端 → `engine/systems/**` 的 import 數，只記錄不設限。 | lint／test |
| **PL1** | `engine/core/ViewCommands.ts`（搬 `triggerHitFlash`／`triggerHitShake`），更新所有呼叫端。`ActiveZone` 型別搬 `types.ts`。 | lint／test／build；PL0 棘輪下調 |
| **PL2** | 搬 `vfx/**`、`visuals/**`（含 barrel），更新所有 import 與檔頭的「上游／下游」路徑，同 commit 更新 `RenderSpec.ts` 內的路徑。 | lint／test／build／**fidelity**／**br-soak 10/10**；棘輪下調 |
| **PL3** | 搬清單其餘檔案、`GridCache`、`GridSystem` 拆分。PL0 棘輪必須**歸零**，改成「0 且不得再出現」。 | 同 PL2；另跑 `npm run verify:coords` |
| **PL4** | `agent.view`（S3）。新增測試：`view` 的三個欄位在模擬端（§1 清單）只出現在 `ViewCommands.ts`；`reset()` 後歸零。 | 同 PL2；另跑 `npm run perf:guard` |
| **REPORT** | `docs/PRESENTATION_LAYER_REPORT.md`：每個任務的檔案數、PL0 棘輪前後數字（兩個方向）、fidelity 每場景 meanAbsDiff 改前／改後、br-soak、verify:coords 改前／改後、`animState`／`trailHistory` 的判斷與寫入者清單、留在原處的檔案與理由、回退指南（每個任務的 commit）。發現「原本好像是 bug」的地方只記錄，不要順手修。 | — |

### 3. 守則與停下條件
- 本輪是**編譯器導引的機械性搬移**，允許一次超過 3 個檔案；除了路徑、欄位名稱之外不得改任何邏輯、常數、繪製順序、排序鍵、呼叫順序（`game.ts` 的 tick 內各系統呼叫順序一行都不能動）。
- 用 `git mv` 搬檔；不要留「轉發用」的舊路徑空殼（舊 barrel 一併搬走，所有 import 改到新路徑）。
- `npm run perf:fidelity`：必須 PASS，且每個場景 meanAbsDiff 不得比改前實測高 0.1 以上；做不到就還原該任務、找出差在哪裡，修好再重做。**不得重錄基準**。
- `br-soak` 失敗、`verify:coords` 振盪或錯序比改前高 1.5 倍以上：同上。
- 同一個任務失敗 3 次、或發現本文件與程式碼現況矛盾：停下，把發現寫進報告，`git status` 保持乾淨（最後一個 commit 全綠）。
- 不新增依賴、不加「安全網」、tick 與渲染迴圈不放 `console.log`、不用 `as any`。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「S2 跑完了」，主代理會審查 `git diff main...feat/presentation-layer`、本機實跑、再問你要不要合併。
2. 實機開一場戰鬥＋展示模式看一下，畫面和操作應該完全一樣。
