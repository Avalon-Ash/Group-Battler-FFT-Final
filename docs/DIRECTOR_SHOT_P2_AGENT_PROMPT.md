# 執行指令：導播取鏡第二包，接進導播（DIRECTOR-SHOT P2）

> 派工：主代理用 agy 派。
> 背景：第一包的 `engine/presentation/DirectorShot.ts` 已通過主代理審查。本包把導播從「全圖取景群組」換成「框眼前這場架」。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_director_shot`（分支 `feat/director-shot`，主代理已建好）。**只准改工作資料夾內的檔案。**

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`tests/DirectorFight.test.ts`（你的驗收）、`tests/DirectorFraming.test.ts`、`tests/DirectorRoster.test.ts`、`engine/presentation/DirectorSystem.ts`、`engine/presentation/DirectorShot.ts`、`engine/presentation/CameraSystem.ts`、`engine/presentation/DirectorRoster.ts`。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。
- **只能跑這些指令**，每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接：
  - `git status`
  - `git diff --stat`
  - `git rev-parse HEAD`
  - `npx vitest run tests/DirectorFight.test.ts`
  - `npx vitest run tests/DirectorShot.test.ts`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run knip`
  - `node tools/ui-e2e/runtime-smoke.mjs`
  清單外的指令會被拒，而且整個執行會結束：需要別的指令就寫進報告，不要嘗試。
- 不要 commit、不准 `push`、不准動 `main`、不准合併。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/**`、`tests/**`、`constants/**`、`types.ts`、`engine/presentation/DirectorShot.ts`。**不要新增或修改常數**；舊常數和 `engine/presentation/CameraTargetGroup.ts` 由主代理收尾時刪除，你不要動。
- **保真基準一律不得重錄**。

### 1. 已查證的事實（DOM）
- `DirectorSystem.ts` 目前：`buildFrame`（第 145 行）用 `CameraTargetGroup` 把主角、目標、全圖奧義施法者、範圍中心、榜上前兩名都放進群組；`limitZoom`（第 192 行）限速。這兩段都要換掉。
- `decideTarget`（第 115 行）決定主角；`ds.focusTimer` 從 `MIN_HOLD_S` 往下數。
- `CameraSystem.setDirectorTarget`（第 98 行）有 `ZOOM_DEAD_ZONE` 判斷（第 107 行）；景別本身就穩定，所以要拿掉，測試 `tests/CameraZoom.test.ts` 最後一項驗這件事。手動縮放的判斷 `!this.manualZoom` 要保留。
- 單位位置沿用現有寫法：`x = a.px + a.physics.x`，`y = VisualMath.getVisualBodyCenterY(a.py + a.physics.y, a.physics.z)`（現在的 `agentVisualY`）。
- `a.target` 是 `Agent | null`；`a.view.hitFlashTimer > 0` 是受擊中；`a.castingSkillIdx !== -1` 是施法中。
- 本包不動渲染，`RenderSpec` 沒有鏡頭規則，不用更新。
- 新檔 LF；既有檔案是 CRLF，保持原行尾。

### 2. 規格（DOM）
**新增 `engine/presentation/DirectorFight.ts`**（檔頭照 `DirectorRoster.ts` 的方框格式）：`class DirectorFight`，`reset()` 和 `collect(anchor, agents, isEligible, dt): ShotMember[]`。
- 成員資格，都要 `isEligible` 且和主角距離（`px`、`py` 的直線距離，不含 physics）不超過 `FIGHT_RADIUS_PX`：
  - 主角本人，權重 `ANCHOR_WEIGHT`；永遠是成員。
  - `anchor.target`，權重 `RELATED_WEIGHT`。
  - `a.target === anchor` 或 `a.target === anchor.target` 的人，權重 `ATTACKER_WEIGHT`。
- 本 tick 符合的人，`linger` 設成 `MEMBER_LINGER_S`。本 tick 不符合但還留著的人，`linger -= dt`，`<= 0` 就移除；留著期間沿用上次的權重，位置照實更新。
- 不是 `isEligible`（死了、墜落）或超出 `FIGHT_RADIUS_PX` 的人**立刻移除**，不留。
- 不看誰在放奧義、不看榜單、不看範圍中心。

**改 `DirectorSystem.ts`**
- 拿掉 `CameraTargetGroup`、`targetGroup`、`wantAgent`、`frameZoom`、`limitZoom`。
- 新增欄位：`fight = new DirectorFight()`、`shot = new ShotZoomController()`、`window = new CameraWindow()`、`blend = new FocusBlend()`、`engaged = false`、`framedAnchorId: string | null = null`、`lastFocus: { x, y } | null = null`。`reset()` 全部歸位。
- `buildFrame` 依序：
  1. **第一次接戰**：`engaged` 還是 false 時，只要有任何 `isEligible` 的單位 `castingSkillIdx !== -1` 或 `view.hitFlashTimer > 0`，就設成 true；若 `lastFocus` 有值，`blend.begin(lastFocus.x, lastFocus.y)`。只會從 false 變 true，這局不會變回去。
  2. **換主角**：主角 id 和 `framedAnchorId` 不同時，`fight.reset()`；如果 `framedAnchorId` 不是 null、且 `lastFocus` 有值，`blend.begin(lastFocus.x, lastFocus.y)`。然後更新 `framedAnchorId`。
  3. **成員**：`engaged` 為 false 時＝所有 `isEligible` 的單位，主角權重 `ANCHOR_WEIGHT`、其他 `RELATED_WEIGHT`。`engaged` 為 true 且有主角時＝`fight.collect(...)`。沒有主角時＝空陣列。
  4. `ext = measureMembers(members)`。
  5. `ext` 是 `null`：焦點是地圖中央（沿用現在的算法），縮放用 `shot.zoom`。否則焦點是 `(ext.cx, ext.cy)`，縮放用 `shot.update(ext, engine.screenW, engine.screenH, dt)`。
  6. `focus = blend.apply(焦點x, 焦點y, dt)`；`lastFocus = focus`；`p = window.update(focus.x, focus.y, zoom, engine.screenW, engine.screenH)`；回傳 `{ x: p.x, y: p.y, zoom }`。
- `decideTarget`：原本 `if (ds.focusTimer > 0 || !top || top.agent === current) return;` 改成：`top` 不存在或就是主角就 return；`ds.focusTimer > 0` 時，只有在「`top.agent` 正在放 `tag === 'ULT'` 的技能」而且「`DIRECTOR_PARAM.MIN_HOLD_S - ds.focusTimer >= DIRECTOR_PARAM.ULT_CUT_HOLD_S`」時才往下走，否則 return。黏著分的判斷不變。
- 方框檔頭同步更新：取景在 `DirectorFight`／`DirectorShot`，不再提 `CameraTargetGroup`。

**改 `CameraSystem.ts`**：`setDirectorTarget` 拿掉 `ZOOM_DEAD_ZONE`，手動縮放以外一律 `this.targetZoom = this.directorZoom`。檔頭若提到群組就改掉。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| P2-1 | 寫 `DirectorFight.ts` | `npm run lint` |
| P2-2 | 改 `DirectorSystem.ts` 與 `CameraSystem.ts` | `npx vitest run tests/DirectorFight.test.ts` 全綠 |
| P2-3 | 整體驗證 | `npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`。**knip 預期只報一項：`engine/presentation/CameraTargetGroup.ts` 沒人用**（主代理會刪），其他項目都算失敗 |
| REPORT | `docs/DIRECTOR_SHOT_P2_REPORT.md`：每個任務改了哪些檔、每個檢查的「指令＋退出碼」、沒做到的事。只寫數字和指令輸出，不寫效果形容詞。每個完成項附檔案:行號 | — |

### 4. 守則與停下條件（INV）
- 不新增依賴、不用 `as any`、tick 迴圈不放 `console.log`、不加安全網。系統之間只透過 `engine.bus`。
- 單次改動超過 3 檔的說明：本包改 `DirectorFight.ts`（新）、`DirectorSystem.ts`、`CameraSystem.ts`，正好 3 檔，超過就停下回報。
- **驗證不准動**：`tests/**` 一律不改。不准 mock、stub，不准用空的 `catch`。
- 同一個驗收失敗兩次、或覺得規格和測試互相矛盾，就停下，把失敗輸出與你的判斷寫進報告後結束，不要想辦法讓它過。
- 中途不要詢問。做不到的寫「未完成」，不寫「CLOSED」。
