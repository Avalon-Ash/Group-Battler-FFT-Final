# 執行指令：PLAY 觸控（K4，ADR 0026）

> 派工：主代理用 agy 派（agent-prompt skill）；備援是使用者在 IDE 輸入 `/goal <本檔路徑>`。
> 背景：PLAY 操控對齊 MOBA／RTS（ADR 0026，`docs/plans/control-feel.md` §6）。K1～K3 已合併（K3＝桌機滑鼠＋Quick Cast）。本包只做**觸控**：單指放開下令（滑動不再拖鏡頭）、兩指拖曳平移鏡頭、第二根手指落下取消還沒送出的單指指令、技能鈕拖到目標放開施放（和點鈕再點目標並存）。觸控筆、桌機滑鼠、手動／編輯模式的觸控都不改。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_k3_input`（分支 `feat/k4-touch`，主代理已建好並提交了紅色驗收）。

### 0. 開工前（INV）
- **讀檔一律用內建檔案工具，不用終端機指令。**
- 先讀：`AGENTS.md`（全部，特別是 UI 章節）、`docs/adr/0026-player-order-interrupt-and-ult-mana-drain.md`、`tests/PointerGesture.test.ts`（你的單元驗收）、`tools/ui-e2e/windows.e2e.mjs` 裡從 `K4_SLIDE_PX` 到 `runPlayTouchChecks` 結束那一段（你的 e2e 驗收），以及 §1 列的每個檔案。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告：
  - `npm run lint`（預期綠；`tapIntent.ts` 的 `multiPointerGesture`、`resolveSkillDrop` 目前是主代理放的空殼，呼叫就丟錯）
  - `npm test`（**預期只有 `tests/PointerGesture.test.ts` 的 8 項失敗**；其他全綠，不是這樣就停下回報）
  - `npm run build`（記下進入點 kB）、`npm run knip`
  - `npm run e2e:play`（**預期失敗的只有**兩個 iPhone 版面各 4 項，共 8 項：「K4: sliding one finger…」「K4: dragging two fingers pans…」「K4: dragging a skill button aims…」「K4: releasing a dragged skill button on an enemy…」（主代理 11-25 在本分支實跑確認）；另外 iPhone 版面的「tapping an enemy while aiming…」「an enemy is on screen to aim at」是已知偶發，見 §4；其他失敗就停下回報）
- **只能跑這些指令**：`git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`git log --oneline -10`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npx vitest run tests/PointerGesture.test.ts`、`npx vitest run tests/TapIntent.test.ts`、`npm run e2e:play`、`npm run audit:ui -- P`。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 一次性的探針與截圖一律寫在 `tools/ui-e2e/out/`（不進版控）。
- 必要的驗證沒完成，該任務就標「未完成」。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/adr/**`、`docs/plans/**`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/check-bundle-budget.mjs`、`tools/ui-e2e/**`（含 `windows.e2e.mjs`、基準、`style-baseline.json`）、`tools/balance/**`、所有 `tests/*.baseline.json`、`tests/**`（全部測試檔，含你的驗收）、`hooks/useCameraControl.ts`、`engine/**`（`engine/systems/ui/tapIntent.ts` 除外）、`constants/**`（不新增、不改現值）。**保真與樣式基準一律不得重錄。**
- 不要 commit、不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，主代理 11-25 讀碼，「目前」的狀態）
- 輸入規則的唯一位置：`engine/systems/ui/tapIntent.ts`（純函式，方框檔頭：「規則只寫在這裡，輸入層不自己判斷」）。
  - `pointerGesture`：非滑鼠一律回 `TAP_ON_UP`；PLAY 滑鼠左鍵 `ORDER_ON_DOWN`、中鍵 `CAMERA`、右鍵 `CAMERA_OR_CANCEL`。
  - 主代理已加好型別：`PointerGesture` 多了 `'ORDER_ON_UP'`；新型別 `MultiPointerGesture`（`'CAMERA_TWO_FINGER' | 'CANCEL'`）、`SkillDropIntent`（`ORDER`／`AIM`／`CANCEL`）；新函式 `multiPointerGesture`、`resolveSkillDrop` 目前是丟錯的空殼。
  - `resolveQuickCast` 與瞄準中的 `resolveTap` 共用內部的 `resolveAimCast`；`canTakeOrders` 判斷能不能接指令。
- `hooks/useGameInput.ts`（382 行）：
  - 77 行 `lastHoverPointerRef`：最後一個**滑鼠**位置（觸控是 null）；107 行 `resolveHover`（游標格 `hoveredHexRef` 的唯一寫入處，規則在 `hoverHexOf`）；111 行 `trackHover`。
  - 132 行 `handlePointerDown`：**134 行第二根指標落下就回 `IDLE` 並 return**（所以「第二指取消」目前已成立，K4 要保持）；之後依 `pointerGesture` 分派。
  - 176 行 `handlePointerMove`：179 行多指時直接 return（**沒有兩指平移**）；`DOWN` 漂移超過 `GAME_INPUT_PARAM.DRAG_DRIFT_TOUCH_PX`（`constants/ui.ts` 250 行，18）時，執行中的戰鬥轉 `PAN`（215 行送 `CAMERA_PAN`）——這就是「PLAY 觸控單指滑動變拖鏡頭」的來源。
  - 253 行 `handlePointerUp`：`DOWN` 放開時用 `resolveTap(…, 放開位置的格子, pressedAgentRef＝按下位置的單位)`。
  - 350 行 `quickCastRef.current = (slot) => …`：用 `lastHoverPointerRef` 算 Quick Cast。
- 捏合縮放**已經存在**：`hooks/useCameraControl.ts` 34～53 行用 touch 事件，兩指時算距離比送 `onZoom` → `CAMERA_ZOOM`；76 行雙擊（與 59～66 行雙點）重設縮放。**K4 不再做一份捏合**（受保護檔案）。
- 鏡頭平移：`UICommand` `CAMERA_PAN { dx, dy }`，單位是螢幕 px（`engine/presentation/CameraSystem.ts` 76 行 `applyPanOffset` 自己除以 zoom）。
- `components/ui/play/PlayHUD.tsx`（234 行）：80 行 `pressSlot(slot, fromKeyboard)`（拒收就提示、`SELF` 直接送 `ORDER_CAST`、Quick Cast、其他送 `SET_AIM` 切換）；182 行技能鈕 `onClick={() => pressSlot(s, false)}`；按鈕 `data-testid="play-skill-<槽>"`。
- `ORDER_CAST` 成立時 `UICommandSystem` 561 行會把該單位的 `state.aim` 清掉（不必另送 `SET_AIM null`）。
- 接線：`App.tsx` 31 行 `quickCastRef`（型別 `((slot) => UICommand | null) | null`）傳給 81 行 `PlayHUD` 與 145 行 `GameCanvas`（47、77 行 → `useGameInput`）。
- `touch-action`：畫布已是 `none`（`components/GameCanvas.tsx` 200 行）；**技能鈕沒設**（`index.css` 774 行 `.play-slot`），從按鈕拖出去瀏覽器會接手捲動並送 `pointercancel`。
- 觸控的 pointer 會隱性捕捉在按下的元素上：從技能鈕拖出去，畫布收不到 `pointermove`，所以拖曳中的游標格要由 `PlayHUD` 透過輸入層提供的函式更新。
- 進入點預算：`npm run build` 的 `bundle-budget: entry`，目前 256.1 kB，上限 257.5 kB（受保護）。`useGameInput`、`tapIntent`、`GameCanvas`、`App` 在進入點裡；`PlayHUD` 不在。

### 2. 目標與規則（DOM）
- 驗收：`tests/PointerGesture.test.ts` 全綠；`npm run e2e:play` 的 `K4` 項目全綠、`K3` 與其他既有項目維持綠；lint、`npm test`、build、knip、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run audit:ui -- P` 綠；進入點 ≤ 257.0 kB。
- **規則寫在 `tapIntent.ts`**（照單元驗收）：
  1. `pointerGesture`：PLAY 觸控回 `ORDER_ON_UP`；觸控筆與非 PLAY 照舊。
  2. `multiPointerGesture(isPlay, pointerType, activeCount)`：只有 PLAY 觸控剛好兩指是 `CAMERA_TWO_FINGER`，其他 `CANCEL`。
  3. `resolveSkillDrop(engine, selected, slot, hex, tapped, onBoard)`：`onBoard` 為假或不能接指令＝`CANCEL`；否則呼叫 `resolveQuickCast`，`ORDER` 原樣回傳，其他回 `AIM`。**不得複製瞄準規則**。
  - 同步改 `pointerGesture` 的 JSDoc（目前寫「觸控在 K4 才改」）與方框檔頭。
- **`useGameInput` 照結果分派**：
  - `ORDER_ON_UP`：按下時記位置、不找單位、不設 `pressedAgent`；移動時不轉 `PAN`／`DRAG_*`，游標格跟著手指（`trackHover`，瞄準中範圍預覽跟著手指）；放開時用**放開位置**的格子與單位（`getAgentFromEvent`）算 `resolveTap` 並送出；放開後照舊清掉觸控的游標格。
  - 第二根指標落下：呼叫 `multiPointerGesture(isPlay, e.pointerType, 目前按著的數量)`。`CANCEL`＝照現在的做法（不下令、不拖，直到全部放開）；`CAMERA_TWO_FINGER`＝之後的 `pointermove` 用兩指中點的位移送 `CAMERA_PAN`（每根指標記自己的最後位置；指數不是 2 時停止平移），第一根手指還沒送出的指令一樣取消。有一根放開後剩一根時，那根**不**恢復成單指下令（放開時不送指令）。
  - 非 PLAY 的 `TAP_ON_UP`（手動、編輯模式的拖單位、拖障礙物、塗刷、單指拖鏡頭）與 PLAY 滑鼠（K3）完全照舊。
- **技能鈕拖曳（`PlayHUD`）**：
  - 介面：把 `quickCastRef` 改成一個埠（例如 `PlayPointerPort { quickCast(slot); hoverAt(p | null); dropSkill(slot, p): SkillDropIntent }`，`p` 是 `{ clientX, clientY, pointerType }`），由 `useGameInput` 指派、`App` 持有、`PlayHUD` 讀。`quickCast` 行為照舊（K3 驗收要維持綠）；`hoverAt` 用 `resolveHover` 更新游標格（null 清掉）；`dropSkill` 判斷 `onBoard`（放開點 `document.elementFromPoint` 是不是畫布）後呼叫 `resolveSkillDrop`。不用全域變數。
  - 按下技能鈕：拒收（`refusal !== null`）與 `SELF` 照舊走 `pressSlot`，不能拖。其他槽：記下按下位置，`setPointerCapture`；指標離按下點超過拖曳門檻（觸控 `DRAG_DRIFT_TOUCH_PX`、滑鼠 `DRAG_DRIFT_MOUSE_PX`，讀既有常數）就進入拖曳：送 `SET_AIM { agentId: 主角, slot }`（範圍預覽與瞄準放慢照舊生效），之後每次移動呼叫 `hoverAt`。
  - 放開：沒進入拖曳＝原地點按，照舊 `pressSlot(s, false)`（切換瞄準）。有拖曳＝`dropSkill`：`ORDER` 送指令；`AIM` 留在瞄準；`CANCEL` 送 `SET_AIM null`；最後 `hoverAt(null)`。拖曳後瀏覽器補發的 `click` 不能再切換一次瞄準（鍵盤 Enter／Space 觸發的 `click` 要照舊能用）。`pointercancel`＝取消（`SET_AIM null`、`hoverAt(null)`）。
  - 技能鈕加 `touch-action: none`（寫在 `index.css` 的 `.play-slot`）。
- 改 `tapIntent.ts`、`useGameInput.ts`、`PlayHUD.tsx` 的方框檔頭與註解，讓它說的和新規則一致。
- 不可以改：`hooks/useCameraControl.ts`、`engine/**`（`tapIntent.ts` 除外）、HUD 版面與尺寸、文字表、任何常數的現值；不新增常數（需要時停下回報）。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| K4-0 | 開工前檢查（§0） | 指令＋退出碼 |
| K4-1 | `tapIntent.ts`：`pointerGesture` 觸控、`multiPointerGesture`、`resolveSkillDrop` | `npx vitest run tests/PointerGesture.test.ts`、`npx vitest run tests/TapIntent.test.ts` 綠 |
| K4-2 | `useGameInput`：`ORDER_ON_UP`、兩指平移、第二指取消 | `npm run e2e:play` 的 K4 單指、兩指、捏合項目綠；K3 項目維持綠 |
| K4-3 | 技能鈕拖曳：埠介面、`App`／`GameCanvas`／`useGameInput`／`PlayHUD` 接線、`touch-action` | `npm run e2e:play` 的 K4 技能鈕項目綠；K3 Quick Cast 維持綠 |
| K4-4 | 全部閘門：`npm run lint`、`npm test`、`npm run build`（進入點 kB）、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run audit:ui -- P`、`npm run e2e:play` | 指令＋退出碼 |
| REPORT | `docs/K4_TOUCH_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的指令＋退出碼、進入點改前改後、e2e 每個 K4 項目的結果、沒做到的事與原因、回退指南。只寫數字與指令輸出，不寫效果形容詞；每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證） | — |

### 4. 守則與停下條件（INV）
- **已知偶發（記錄，不修）**：`e2e:play` 在 iPhone 版面的「tapping an enemy while aiming issues a cast order and ends aiming」「an enemy is on screen to aim at」（敵人移動中點偏，HANDOFF D）。只有這兩項失敗時再跑一次 `npm run e2e:play`，兩次結果都寫進報告；其他項目失敗照一般規則。
- 進入點超過 257.0 kB → 停下回報各檔增加多少，不要自己搬別的元件。
- 發現某則驗收在你看來和 ADR 0026 或 §2 矛盾 → 停下回報，不改驗收。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。
- **驗證不准動**：現有測試、驗收、斷言強度一律不改；不准 mock 被驗證的對象；不准用空的 `catch`。同一個驗收失敗兩次就停下回報。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。
- 報告另列：你碰到但沒處理的問題（例如 PLAY 連點兩下觸發 `useCameraControl` 的雙點重設縮放）。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、在主資料夾 `integ/` 分支跑完整閘門，代為 commit，再問你要不要合併。
2. iPhone 實機要看：單指點地面、滑一下再放開，主角是不是往放開的地方走、鏡頭不動；兩指拖鏡頭、捏合縮放；按著一指再放第二指，第一指放開不下令；技能鈕拖到敵人放開直接放、拖回按鈕取消、點一下照舊瞄準。
