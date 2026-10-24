# A3-F01：施法中死亡取消待播序列（Gemini 3.8H）

用法：選擇 Gemini 3.8H，輸入 `/goal docs/PROJECT_CLEANUP_F01_AGENT_PROMPT.md`。

你是執行代理。主代理已定修法，本輪只實作 F01，不做全庫盤點、不設計下一輪。工作目錄 `C:\Git\Group-Battler-FFT-Final`。

## 0. 工作規則（INV）

- 延續現有 `feat/project-cleanup`，不得切 main、另開分支、合併、rebase、push。使用者的推送授權由主代理執行，不下放本輪。
- 開工記錄 `git rev-parse HEAD`、`git status --short`、`git diff --name-only 8967054 HEAD`。`8967054` 必須是 HEAD 祖先；其後本輪開始前只能有主代理新增的兩份計畫文件。否則停止回報。
- 工作區已有未追蹤 `.agents/`、`.codex/`、舊 A0/奧義提示詞及計畫，保留原樣；不要 `git add .`、清除或納入它們。已追蹤產品檔若有別人的未提交修改，停止回報。
- 先讀 AGENTS.md、types.ts 的 Skill/GameEvent/NodeState、constants/combat.ts、下列白名單現有檔、engine/core/Agent.ts、engine/events/EventPos.ts、engine/systems/combat/CombatSystem.ts、engine/presentation/VisualSystem.ts、engine/presentation/visuals/SequenceSystem.ts、engine/presentation/visuals/handlers/UnitVFXHandler.ts、engine/renderers/RenderSpec.ts、engine/math/VisualMath.ts、tests/EventPos.test.ts、docs/PROJECT_CLEANUP_A0_REPORT.md。
- 所有新增寫入前用 `git grep` 核對既有寫入者。本輪不新增 Agent 欄位，不改座標協議、tick 順序或公開介面。
- 保持既有 UTF-8／換行格式。測試可使用局部 fixture 數值，產品不得新增調參常數、硬編碼顏色、as any 或每幀 log。

### 唯一可提交檔案（已授權五檔）

1. `engine/systems/combat/CastingEngine.ts`：只改死亡中斷分支、必要 import 及其責任註解。
2. `engine/events/GameEventPool.ts`：只補 `hexes` hydrate／release 及相關註解。
3. `tests/CastingDeathInterruption.test.ts`：新增本輪回歸測試。
4. `tests/Core.test.ts`：只在 GameEventPool 測試區新增 hexes 回歸，不改既有斷言。
5. `docs/PROJECT_CLEANUP_F01_REPORT.md`：新增事實報告。

其餘檔案一律唯讀，尤其既有探針／生成器、此提示詞、A0 CSV/JSON、AGENTS.md、HANDOFF、WORKLOG、DECISIONS、所有 baseline／閾值、技能／VFX 資料、facade、SequenceSystem。臨時原始輸出只放忽略目錄 `tools/ui-e2e/out/f01/`，不得偽造或改寫量測 JSON。

## 1. 已查證事實與指定修法（DOM）

基底 `8967054`：

- CastingEngine.ts:46–49 在 `hp <= 0` 時 reset 然後 return，未送 CAST_BREAK。
- CombatSystem.ts:81 僅 `skill.cast > 0 && skill.tag !== 'BASIC'` 送 CAST_START；`initiateCast` 回傳 NodeState enum，FAILURE 也是非空字串，不能用 truthy 判成功。
- VisualSystem.ts:69 收到 CAST_BREAK/sourceId 後呼叫既有 sequences.cancel。無需更動表現層。
- GameEventPool.get 現在未把 opts.hexes 寫入 event；release 亦未清掉它。types.ts 的 GameEvent 已有 `hexes?: readonly Hex[]`，不需要新增型別。
- A0 探針四個 C1/C2 死亡案例：queueAtDeath=5、actionsDispatchedAfterDeath=5、hadCastBreak=false、damageDealt=0。C2 是 applyDirectDamage 受控致死，不可寫成自主 AI 戰鬥證據。

### 實作順序與精確邊界

1. 先新增第 2 節測試並跑一次，保留未修產品時的失敗日誌。至少死亡事件缺失、pool hexes 遺失兩項應失敗；若只因 fixture／匯入錯誤失敗，先修測試。
2. 在 GameEventPool.get 加 `event.hexes = opts.hexes`；release 加 `event.hexes = undefined`。這是 readonly payload 參照，不要深拷貝／改形狀／順手補其他欄位。
3. CastingEngine 的死亡分支內，reset 前取當前技能。只有有效技能、tag 非 BASIC、cast > 0 才發中斷，與現有 CAST_START 條件一致。
4. 新事件透過 `EventPool.get('CAST_BREAK', unitEventPos(a, engine), opts)` 分配，再加入 engine.events。opts 帶 sourceId、team、skill、color、value=`1 - a.castTimer / currentSkill.cast`；AOE 帶當前 currentTelegraph（null 轉 undefined），SINGLE 的 hexes 為 undefined。先存事件，最後 reset。正 cast 條件確保不除以零。
5. 死亡事件不受 `_interruptCooldown` 限制；死亡分支不得新增 log、CD 懲罰或改 lockout。沿用 resetCaster 的現有清理，下一次調用 castingSkillIdx 已為 -1，不應再次送事件。
6. 存活中斷、完成施法、投射物、AI 重建及重置邏輯全部保持。不能以來源死亡就全局清空序列、粒子或傷害。不要重構共用 helper 或改動存活分支的事件分配。
7. 為兩個產品檔補簡短且符合實作的責任／上下游說明即可，不能順便整理其他檔頭。

## 2. 必要回歸測試（不可刪減門檻）

新測試使用真正的 `new Agent(...)`；context 用 `satisfies BreakCastContext`，以 `vi.fn()` 提供 log，events 是 GameEvent[]，mapConfig 可參考 Core.test.ts 的 MAP。不用 any 或雙重斷言偽造整個 GameEngine。直接測公開 handleInterruption；瀏覽器探針另驗證完整路徑。

- 非 BASIC 有效詠唱死亡：一次 CAST_BREAK，來源／隊伍／技能／顏色正確，value 為預期進度且有限；pos 等於 unitEventPos；AOE hexes 在 reset 後仍保留。
- `_interruptCooldown > 0` 死亡仍發一次；再呼叫一次不增加事件。原 CD、lockout 不變且 log 未被呼叫。
- reset 結果：castingSkillIdx=-1、castTimer=0、castingAnimationTimer=0、currentTelegraph=null。
- 死亡但 castingSkillIdx=-1、BASIC、cast=0 各自不發事件；SINGLE 有效施法中斷的 hexes 為 undefined。
- 存活中斷對照：仍送事件、設定既有中斷 lockout／CD 下限；冷卻節流仍抑制事件。
- Core 的 pool 測試：get 保留 hexes；release 後清掉參照；再次 get 無 hexes 不殘留；使用 try/finally 釋回取得的事件。

## 3. 執行與驗證（INV）

所有長命令用下表格式啟動，接著立即反覆 `node tools/agent/run.mjs --wait <name>`，直到 DONE。RUNNING 就同一回合繼續 wait，不得交回合等通知。TIMEOUT 重試一次；LOST 用 wrapper 前景跑一次。相同步驟失敗／逾時兩次後列未完成，不無限重試。正常測試失敗先判斷是否本輪造成；任務外錯誤停止擴修，交回證據。不可有仍執行中的自己命令就結束。

依序執行，瀏覽器／效能指令不可並行：

```text
node tools/agent/run.mjs --detach f01-before 180 -- node tools/ui-e2e/cleanup-a0-repro.mjs --out-dir tools/ui-e2e/out/f01/before
node tools/agent/run.mjs --wait f01-before
```

先確認 before 四個死亡案例實際數字符合第 1 節；不符就停止產品修改，回報原始資料。

新增測試後、修產品前：

```text
node tools/agent/run.mjs --detach f01-red 120 -- npx vitest run tests/CastingDeathInterruption.test.ts tests/Core.test.ts
node tools/agent/run.mjs --wait f01-red
```

red 預期 EXIT 非零是明確的回歸證明，不必重跑兩次。產品修改完成後依序跑：

| name | timeout 秒 | `--` 後的命令 |
| --- | --- | --- |
| f01-lint | 120 | npm run lint |
| f01-test | 300 | npm test |
| f01-build | 180 | npm run build |
| f01-after | 180 | node tools/ui-e2e/cleanup-a0-repro.mjs --out-dir tools/ui-e2e/out/f01/after |
| f01-smoke | 180 | node tools/ui-e2e/runtime-smoke.mjs --shot |
| f01-guard | 900 | npm run perf:guard |

每列都使用 `node tools/agent/run.mjs --detach <name> <timeout> -- <命令>`，並持續 --wait 到 DONE，保留 `tools/ui-e2e/out/agent-logs/<name>.log`。重試用 -retry 後綴，before/after 重跑用獨立 out-dir，不覆蓋原始失敗證據。

smoke 要記錄 battleTime 起訖、頁面錯誤數、畫布是否改變。guard 若失敗，保留各場景差異與圖片；**不得重錄 baseline、放寬閾值或宣稱預期差異就是通過**。本輪不改座標，既有 COORD01 不納入擴修；不跑平衡。

### 固定結果檢查（在 PowerShell 原樣執行，不得放寬）

probe EXIT=0 只表示觀測完成。修復後 C1/C2 應是 NOT_REPRODUCED；不能把所有 OBSERVED 當 PASS。以下命令才檢查本輪關鍵數據。缺資料必須報錯。

```powershell
@'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const r = JSON.parse(readFileSync('tools/ui-e2e/out/f01/after/repro_results.json', 'utf8'));
const sha = '64dd64cc2e502407bcbb5bd3ae45fdb29ed2d40286f3e032692648bc21fd0e01';
assert.equal(createHash('sha256').update(readFileSync('tools/ui-e2e/cleanup-a0-repro.mjs')).digest('hex'), sha);
assert.equal(r.metadata.sourceSha256, sha);
for (const k of ['errors', 'pageErrors', 'consoleErrors']) assert.deepEqual(r[k], []);
assert.equal(r.summary.toolExecutionStatus, 'SUCCESS');
assert.equal(r.summary.completedScenarios, 13);
assert.equal(Object.keys(r.scenarios).length, 13);
for (const s of Object.values(r.scenarios)) {
  assert.ok(['OBSERVED', 'NOT_REPRODUCED'].includes(s.status));
  assert.ok(s.data && typeof s.data === 'object');
}
for (const kind of ['C1_state_injected_death', 'C2_controlled_lethal_damage']) {
  for (const run of [1, 2]) {
    const k = `F01_${kind}_run${run}`;
    const s = r.scenarios[k], d = s.data;
    assert.equal(s.status, 'NOT_REPRODUCED', k);
    assert.equal(d.casterDead, true, k);
    assert.equal(d.hadCastBreak, true, k);
    assert.equal(d.queueAtDeath, 0, k);
    assert.equal(d.actionsDispatchedAfterDeath, 0, k);
    assert.equal(d.damageDealt, 0, k);
    assert.equal(d.defectObserved, false, k);
    console.log(k, JSON.stringify(d));
  }
}
const d = k => r.scenarios[k].data;
assert.equal(d('F01_A_normal_completion').completedSuccessfully, true);
assert.equal(d('F01_A_normal_completion').damageDealt, 548);
assert.equal(d('F01_B_stun_interruption').queueCleanedByBreak, true);
assert.equal(d('F01_B_stun_interruption').damageDealt, 0);
assert.equal(d('F01_E1_ai_rebuild_during_cast').queueRemained, true);
assert.equal(d('F01_E2_game_reset_during_cast').queueCleared, true);
assert.equal(d('F01_D_projectile_in_flight').projectileHitOccurred, true);
assert.equal(d('F01_D_projectile_in_flight').damageDealt, 102);
for (const k of ['F02_AOE_ground_locked', 'F02_SINGLE_target_locked', 'F03_API_boundary_inputs', 'F03_UI_inspector_interaction']) {
  assert.equal(r.scenarios[k].status, 'OBSERVED', k);
}
console.log('F01_FIXED_AND_CONTROLS_PRESERVED');
'@ | node --input-type=module -
if ($LASTEXITCODE -ne 0) { throw 'F01 acceptance failed; keep raw evidence' }
```

如果重試使用不同 out-dir，只准替換上面輸入 JSON 的路徑，不能修改斷言。F02/F03 的 OBSERVED 是保留既有觀測，**不是宣布它們修好了**。AI 重建保留序列是對照行為，不能當成完整重開失敗。

## 4. 交付

- 完成前核對從開工 SHA 起的已提交／未提交差異，加上新增未追蹤檔，必須符合五檔白名單。既有未追蹤工作檔保留；若意外修改白名單外內容，停止回報，不擅自還原他人檔案。
- 報告最多約 60 行：開工 SHA、實際改動；四案 before/after 原始欄位表；正常／暈眩／重開／AI 重建／投射物對照；各命令 EXIT 及日誌；固定檢查輸出；未完成／失敗及回退方式。不可手填總體 PASS 或「全專案完成」。
- 全部必要驗證完成且通過才明列五檔 git add，提交 `fix(combat): cancel pending cast sequence on death`。不要在報告預填未知 commit SHA；提交後於最終回覆提供。
- 若驗證仍失敗，留下可審差異與報告，說明阻擋原因，不提交一個宣稱完成的修復，也不 push。
- 最終回覆只列：提交 SHA（或未提交）、五檔變更、已驗證數據、失敗／未跑項目、報告路徑。不要自行接下一輪。

使用者交回主代理的訊息：`F01 跑完了，請依 PROJECT_CLEANUP_F01_AGENT_PROMPT.md 審查實際差異與原始證據。`
