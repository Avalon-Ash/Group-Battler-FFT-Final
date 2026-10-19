# 執行指令：狀態效果資料化（ECS-lite S1）

> 用法：在 IDE 代理對話輸入 `/goal docs/STATUS_EFFECTS_AGENT_PROMPT.md`。
> 背景：`docs/ECS_LITE_ASSESSMENT.md` §2 S1。13 種控制／持續效果目前是 `Agent` 上21 個平行欄位（`stunTimer`／`stunMax`、`silenceTimer`／`silenceMax`…），新增一種效果要改 6 處，`reset()` 漏清、遞減寫法不一致這類 bug 反覆出現。本輪把它們收成一個元件 `agent.effects`，效果的規則放 `data/`。
> **本輪是純重構：遊戲行為必須完全不變。** 保真基準 0 差異、`br-soak` 10/10 是硬條件；任何基準都不得重錄、門檻不得放寬。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前
- 先讀：`AGENTS.md`（全部）、`docs/ECS_LITE_ASSESSMENT.md`、`docs/STATE_OWNERSHIP_DESIGN.md` §3、`engine/core/Agent.ts`、`engine/core/AgentOwnership.ts`、`engine/systems/combat/CCManager.ts`、`engine/systems/status/ControlSystem.ts`、`engine/systems/status/EffectSystem.ts`。
- 從 `main` 開分支 `feat/status-effects`；`git status` 必須乾淨。先跑一次 `npm run lint`、`npx vitest run --dir tests`、`npm run build`、`npm run perf:fidelity`、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`，把結果記進報告（這是「改前」基準；任何一項不綠就停下回報）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`engine/renderers/RenderSpec.ts`、`tools/ui-e2e/baseline/**`、`tests/*.baseline.json` 的放寬方向。Facade（`engine/game.ts`、`engine/renderer.ts`）只准做本輪的機械性改名，不得加邏輯。
- 不准 `push`、不准動 `main`、不准合併。一個任務一個 commit，訊息寫清楚改了哪些欄位。

### 1. 目標設計（照做，不要自行改設計；有矛盾就停下回報）

**型別（`types.ts` 或 `engine/types/`，依現有慣例）**
```ts
export type EffectKind =
  | 'STUN' | 'SILENCE' | 'ROOT' | 'FEAR' | 'TAUNT' | 'BLIND'
  | 'BANISH' | 'STASIS' | 'POLYMORPH' | 'INVINCIBLE' | 'VULNERABLE'
  | 'DOT' | 'HOT';

export interface EffectSlot {
  remaining: number;     // 原 xxxTimer
  max: number;           // 原 xxxMax（沒有 Max 欄位的效果也記，給 UI 用）
  value: number;         // DOT＝原 dotDmg、HOT＝原 hotVal，其餘 0
  tag: string | null;    // DOT＝原 dotType，其餘 null
  sourceId: string | null; // TAUNT＝原 tauntTargetId，其餘 null
}
export type EffectSlots = Record<EffectKind, EffectSlot>;
```
- **固定 13 個槽位、預先配置**，不是動態陣列：讀寫是 `agent.effects.STUN.remaining`，每幀零配置。
- `engine/core/Effects.ts`（純函式，無狀態）：`EFFECT_KINDS`（陣列）、`createEffectSlots()`、`resetEffectSlots(slots)`、`isEffectActive(agent, kind)`（`remaining > 0`）、`effectRemaining(agent, kind)`。`Agent` 仍是純資料：只新增 `public effects: EffectSlots = createEffectSlots();`，**不加方法、不加 getter**。

**規則資料（`data/status/effect_defs.ts`）**
```ts
export interface EffectDef {
  polarity: 'BUFF' | 'DEBUFF';     // 取代 CCManager 內 isBuff／isDebuff 陣列
  hardCC: boolean;                 // 取代 isHardCC 陣列（DR 只套用在這些）
  clearsOnApply: readonly EffectKind[]; // BANISH 清 ROOT、FEAR
}
export const EFFECT_DEFS: Readonly<Record<EffectKind, EffectDef>>;
```
- 只搬「原本就寫死在程式裡的判斷」，值必須和現在一模一樣（逐一對照 `CCManager.applyCC` 開頭的陣列）。`SHIELD`、`KNOCKBACK`、`PULL` 不是持續效果，維持原樣不進表。
- 狀態文字、顏色仍讀 `STATUS_VISUALS`，不要複製到 defs。
- DR 記帳（`drStacks`／`drTimers`）本輪**不動**。`fearMoveTimer`（恐懼亂跑的步伐計時）屬於移動，**不動**。`banished` 布林維持由 `banishTimer` 推導的現行寫法（改成讀 `effects.BANISH.remaining`）。

**寫入者（唯一）**
- 套用：`CCManager.applyCC`（之後透過 `engine/core/Effects.ts` 的 `applyEffect(slots, kind, duration, opts)` 或直接寫槽位，二選一，全檔一致）。
- 遞減與到期：`ControlSystem`（控制類）、`EffectSystem`（DOT／HOT）；到期時的副作用（STASIS、POLYMORPH、INVINCIBLE、TAUNT 清目標…）原樣保留。
- `PhysicsEngine` 失去地面時的 `stunTimer = max(stunTimer, 0.1)` 是既有的第二寫入者：改名照搬，在 `AgentOwnership.ts` 的 `note` 記下，不要改行為。
- 重設：`Agent.reset()` 呼叫 `resetEffectSlots(this.effects)`。
- `AgentOwnership.ts`：舊欄位的列刪除，新增一列 `effects`（group `status`、kind `domain`、owners＝上面三個系統＋CCManager，PhysicsEngine 寫在 accumulators 或 note，依現有棘輪測試能表達的方式）。棘輪基準只能變少。

### 2. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **SE0** | 新增 `tests/EffectFieldsRatchet.test.ts`：掃 `engine/`、`components/`、`data/`、`hooks/` 的 `.ts/.tsx`，計算 21 個舊欄位名（`stunTimer`、`stunMax`、`silenceTimer`、`silenceMax`、`banishTimer`、`banishMax`、`stasisTimer`、`stasisMax`、`rootTimer`、`fearTimer`、`tauntTimer`、`tauntTargetId`、`blindTimer`、`polymorphTimer`、`invincibleTimer`、`vulnerableTimer`、`dotTimer`、`dotDmg`、`dotType`、`hotTimer`、`hotVal`）以 `\.欄位名\b` 出現的次數，基準寫在測試內（＝當下實測），**只准減少**。 | lint／test |
| **SE1** | 型別、`engine/core/Effects.ts`、`data/status/effect_defs.ts`、`Agent.effects` 欄位與 `reset()` 呼叫；新增 `tests/Effects.test.ts`（每個 kind 都有 def 與槽位；reset 後全部歸零；defs 的 polarity／hardCC 與 CCManager 現行陣列一致）。**此任務不刪任何舊欄位、不改任何讀寫點。** | lint／test／build／fidelity 0 差異 |
| **SE2** | 遷移 `STUN`、`SILENCE`、`ROOT`、`FEAR`、`BLIND`：所有讀寫點改成 `effects.X.remaining`／`.max`，刪除 `Agent` 上對應欄位（編譯器會列出所有讀者）。CCManager 開頭的 isBuff／isDebuff／isHardCC 陣列改讀 `EFFECT_DEFS`（`SHIELD`／`KNOCKBACK`／`PULL` 照原樣特判）。 | lint／test／build／**fidelity 0 差異**／**br-soak 10/10**；SE0 棘輪下調 |
| **SE3** | 遷移 `TAUNT`（`tauntTargetId` → `effects.TAUNT.sourceId`）、`BANISH`（`clearsOnApply` 取代手寫清 ROOT／FEAR）、`STASIS`、`POLYMORPH`、`INVINCIBLE`、`VULNERABLE`。 | 同 SE2 |
| **SE4** | 遷移 `DOT`（`dotTimer`／`dotDmg`／`dotType` → `remaining`／`value`／`tag`）、`HOT`（`hotTimer`／`hotVal` → `remaining`／`value`）。 | 同 SE2；SE0 棘輪必須歸零，改成「0 且不得再出現」 |
| **SE5** | `ControlSystem` 的 13 行各自遞減改成一個 `for (const k of EFFECT_KINDS)` 迴圈（DOT／HOT 仍由 EffectSystem 處理，迴圈跳過或分工要明確）；到期副作用以 `switch` 保留在原處，順序與現在相同（**遞減順序會影響同一幀的判斷，必須逐行對照**）。`AgentOwnership.ts` 收斂成 `effects` 一列。新增一個測試：在測試內對 `EFFECT_DEFS` 以外的地方不需要改任何東西就能讀到每個 kind（遍歷 `EFFECT_KINDS` 對每個 kind 套用、遞減、到期歸零）。 | 同 SE2 |
| **REPORT** | `docs/STATUS_EFFECTS_REPORT.md`：每個任務的檔案數、棘輪前後數字、fidelity 與 br-soak 結果、遇到的行為疑點（**有任何你覺得「原本好像是 bug」的地方，只記錄，不要順手修**）、回退指南（每個任務的 commit）。 | — |

### 3. 守則與停下條件
- 本輪的 SE2～SE4 是**編譯器導引的機械性改名**，允許一次超過 3 個檔案；除了改名之外不得改任何邏輯、常數、判斷順序。
- 渲染端（`engine/renderers/**`、`components/**`）只改讀取的欄位名，不改畫法、位置、排序。
- `npm run perf:fidelity` 只要有任何非 0 差異：還原該任務、找出行為差在哪裡，修好再重做。**不得重錄基準**。
- `br-soak` 失敗：同上。
- 同一個任務失敗 3 次、或發現本文件的設計與程式碼現況矛盾（例如某效果的遞減其實在第三個系統裡）：停下，把發現寫進報告，`git status` 保持乾淨（最後一個 commit 全綠）。
- 不新增依賴、不加「安全網」掩蓋症狀、tick 與渲染迴圈不放 `console.log`、不用 `as any`。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「S1 跑完了」，主代理會審查 `git diff main...feat/status-effects`、本機實跑、再問你要不要合併。
2. 實機開一場有控制技能的戰鬥（暈眩、沉默、放逐、變羊、冰凍、嘲諷），看起來應該和以前完全一樣。
