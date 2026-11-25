# 執行指令：PLAY 桌機滑鼠對應與 Quick Cast（K3，ADR 0026）

> 派工：主代理用 agy 派（agent-prompt skill）；備援是使用者在 IDE 輸入 `/goal <本檔路徑>`。
> 背景：PLAY 試玩「控制不貼手」。主代理實測（`docs/plans/control-feel.md` §2）：輸入層放開滑鼠才送指令，按住時游標漂移超過 8 px 就變成拖鏡頭、指令不見。使用者定案（ADR 0026）：桌機左鍵按下就下令，右鍵或中鍵拖鏡頭；Quick Cast 做成設定、預設關。本包只做**桌機滑鼠**；觸控（K4）與奧義扣魔（K2，另一條分支）都不做。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_k3_input`（分支 `feat/k3-mouse`，主代理已建好並提交了紅色驗收）。

### 0. 開工前（INV）
- **讀檔一律用內建檔案工具，不用終端機指令。**
- 先讀：`AGENTS.md`（全部，特別是 UI 章節）、`docs/adr/0026-player-order-interrupt-and-ult-mana-drain.md`、`tests/PointerGesture.test.ts`（你的單元驗收）、`tools/ui-e2e/windows.e2e.mjs` 裡 `K3_DRAG_PX` 到 `runPlayQuickCastCheck` 結束那一段（你的 e2e 驗收），以及 §1 列的每個檔案。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告：
  - `npm run lint`（**預期失敗**：只有 `tests/PointerGesture.test.ts` 找不到 `pointerGesture`、`resolveQuickCast` 兩個匯出；有別的錯就停下回報）
  - `npm test`（**預期只有 `tests/PointerGesture.test.ts` 失敗**；其他全綠，不是這樣就停下回報）
  - `npm run build`（記下進入點 kB）、`npm run knip`
  - `npm run e2e:play`（**預期失敗的只有名稱含 `K3` 的項目**，另外 iPhone 版面的「tapping an enemy while aiming…」「an enemy is on screen to aim at」是已知偶發，見 §4；其他失敗就停下回報）
- **只能跑這些指令**：`git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`git log --oneline -10`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npx vitest run tests/PointerGesture.test.ts`、`npx vitest run tests/TapIntent.test.ts`、`npm run e2e:play`、`npm run audit:ui -- P`。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 一次性的探針與截圖一律寫在 `tools/ui-e2e/out/`（不進版控）。
- 必要的驗證沒完成，該任務就標「未完成」。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/adr/**`、`docs/plans/**`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/check-bundle-budget.mjs`、`tools/ui-e2e/**`（含 `windows.e2e.mjs`、基準、`style-baseline.json`）、`tools/balance/**`、所有 `tests/*.baseline.json`、`tests/**`（全部測試檔，含你的驗收）、`engine/systems/combat/**`（K2 在另一條分支改）。**保真與樣式基準一律不得重錄。**
- 不要 commit、不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM，主代理 11-25 讀碼，「目前」的狀態）
- `hooks/useGameInput.ts`（322 行）：
  - 114～141 行 `handlePointerDown`：116 行多指時回 IDLE；**117 行滑鼠非左鍵直接 return**；記下按下位置與按到的單位，進 `DOWN`，`setPointerCapture`。
  - 142～213 行 `handlePointerMove`：157～175 行漂移超過 `GAME_INPUT_PARAM.DRAG_DRIFT_MOUSE_PX`（`constants/ui.ts` 252 行，8）或 `DRAG_DRIFT_TOUCH_PX`（18）時轉成 `PAN`／`DRAG_UNIT`／`DRAG_OBS`／`PAINT`；176～185 行 `PAN` 送 `CAMERA_PAN`。
  - 214～271 行 `handlePointerUp`：220～231 行 `DOWN` 放開時才用 `resolveTap` 決定選取或指令並送出。
  - 64 行 `lastHoverPointerRef`（最後一個滑鼠位置；觸控與離開畫布時是 null）；94～97 行 `resolveHover`；107～112 行 `refreshHover`。
- 輸入規則的唯一位置：`engine/systems/ui/tapIntent.ts`（純函式，方框檔頭寫明「規則只寫在這裡，輸入層不自己判斷」）。43～74 行 `resolveTap`；46～59 行是瞄準中的分支（點到可施放的單位＝`ORDER_CAST` 對它，`UNIT_OR_GROUND` 點空地＝對那一格）；23～29 行 `canTakeOrders`。PLAY 模式的判斷是 `engine.matchFlow?.isPlay`（67 行）。
- `components/ui/play/PlayHUD.tsx`：27 行 `SLOT_KEYS`（'1'～'4' 對應第 0～3 槽）；77～90 行 `pressSlot`（拒收就提示、SELF 直接送 `ORDER_CAST`、其他送 `SET_AIM`）；92～111 行鍵盤；**112～120 行在 window 上聽 `contextmenu` 取消瞄準**：右鍵拖完放開也會觸發它。35 行 `isCoarsePointer`。
- `components/GameCanvas.tsx` 72 行呼叫 `useGameInput`；200 行畫布已 `preventDefault` 右鍵選單。`App.tsx` 同時渲染 `PlayHUD`（延遲載入）與 `GameCanvas`。
- `components/ui/play/PlaySetup.tsx`：選主角畫面（延遲載入）；文字表 `data/ui/labels/play.ts`（`PLAY_TEXT`；`AIM_HINT_KEYS` 是「Esc／右鍵取消」，本包規則下仍正確，不改）。
- 本機儲存的既有寫法：`engine/audio/AudioEngine.ts` 853～880 行（先檢查 `window.localStorage` 存在、讀寫包 try）；鍵名常數在 `constants/audio.ts` 28 行、`constants/ui.ts` 101～104 行 `STORAGE_KEYS`。
- 進入點預算：`npm run build` 的 `bundle-budget: entry`，base 是 255.5 kB，上限 257.5 kB（`tools/check-bundle-budget.mjs`，受保護）。`useGameInput`、`tapIntent`、`GameCanvas`、`App` 在進入點裡；`PlayHUD`、`PlaySetup` 不在。

### 2. 目標與規則（DOM）
- 驗收：`tests/PointerGesture.test.ts` 全綠；`npm run e2e:play` 的 `K3` 項目全綠、其他既有項目維持綠；lint、`npm test`、build、knip、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run audit:ui -- P` 綠；進入點 ≤ 256.0 kB。
- **規則一律寫在 `tapIntent.ts`，`useGameInput` 只照結果分派**：
  1. 新增 `pointerGesture(isPlay: boolean, pointerType: string, button: number)`，回傳 `'ORDER_ON_DOWN' | 'TAP_ON_UP' | 'CAMERA' | 'CAMERA_OR_CANCEL' | 'IGNORE'`（型別一起匯出），對應表照 `tests/PointerGesture.test.ts`。
  2. 新增 `resolveQuickCast(engine, selected, slot, hex, tapped): TapIntent`：結果必須等於「瞄準那一槽時的 `resolveTap`」（驗收逐格比對），不能接指令的單位回 `NONE`。做法：把 `resolveTap` 46～59 行瞄準分支抽成一個內部函式，兩者共用；**不得複製一份規則**。不改 `engine.state.aim`。
- **`useGameInput` 依 `pointerGesture` 分派**（isPlay 讀 `engine.matchFlow?.isPlay`）：
  - `ORDER_ON_DOWN`：按下當下就算 `resolveTap` 並送出（`ORDER` 送指令、`SELECT` 選取），之後的移動與放開都不再送指令、不拖鏡頭。
  - `CAMERA`（中鍵）：拖曳超過 `DRAG_DRIFT_MOUSE_PX` 走既有的 `PAN`（送 `CAMERA_PAN`）；按下時 `preventDefault`，避免瀏覽器的中鍵自動捲動。
  - `CAMERA_OR_CANCEL`（右鍵）：拖曳超過門檻＝`PAN`，不取消瞄準；沒超過就放開＝瞄準中送 `SET_AIM` `null`。右鍵取消瞄準只留這一處：**移除 `PlayHUD` 的 window `contextmenu` 監聽**。
  - `TAP_ON_UP`、`IGNORE`：完全照舊（觸控、手動模式、編輯模式的拖單位、拖障礙物、塗刷、左鍵拖鏡頭都不變）。
- **Quick Cast（主代理定案，不要另外設計）**：
  - 設定的唯一擁有者：新檔 `components/ui/play/playPrefs.ts`（只被延遲載入的 PLAY 畫面引用，不進進入點），提供讀與寫 `quickCast: boolean`，預設 `false`；存在 `localStorage`，鍵名做成常數放在 `constants/ui.ts` 的 `STORAGE_KEYS`；`localStorage` 不存在或讀寫丟錯時當作預設值（照 `AudioEngine` 的寫法，`catch` 裡要有處理，不准空的 `catch`）。
  - 開關放在 `PlaySetup`：`data-testid="play-quickcast-toggle"`、`aria-pressed`、文字放 `PLAY_TEXT`（英文標題，例如「Quick Cast」）。只在非粗指標（`!isCoarsePointer()`）時顯示，因為它只作用在鍵盤；把 `PlayHUD` 的 `isCoarsePointer` 搬到兩邊共用的地方，不要複製。不能讓 e2e 的「hero setup fits the viewport」失敗。
  - 行為：Quick Cast 開著時，**鍵盤**技能鍵（不是點按鈕）、該槽不是 SELF、沒有被拒收 → 問輸入層「游標下對這一槽施放的指令」；有就直接送、不進瞄準；沒有（游標不在畫布上、游標下沒有合法目標）就照舊進入瞄準。點技能鈕、SELF 招、拒收提示完全照舊。
  - 接線：`App` 持有一個 ref（型別如 `MutableRefObject<((slot: number) => UICommand | null) | null>`），傳給 `GameCanvas` → `useGameInput`（由它指派函式：用 `lastHoverPointerRef` 取格子與單位，呼叫 `resolveQuickCast`）與 `PlayHUD`（讀它）。不用全域變數、不在 `useGameInput` 另外聽鍵盤（技能鍵只在 `PlayHUD` 處理）。
- 改 `tapIntent.ts`、`useGameInput.ts` 的方框檔頭與註解，讓它說的和新規則一致。
- 不可以改：觸控行為、`engine/**`（`tapIntent.ts` 除外）、HUD 版面、`PLAY_TEXT.AIM_HINT_KEYS`、任何常數的現值。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| K3-0 | 開工前檢查（§0） | 指令＋退出碼 |
| K3-1 | `pointerGesture`、`resolveQuickCast`（共用瞄準分支） | `npx vitest run tests/PointerGesture.test.ts`、`npx vitest run tests/TapIntent.test.ts` 綠 |
| K3-2 | `useGameInput` 依手勢分派；移除 `PlayHUD` 的 `contextmenu` 監聽 | `npm run e2e:play` 的 K3 滑鼠項目（左鍵、左鍵拖、右鍵拖、中鍵拖、瞄準中右鍵拖與右鍵點）綠 |
| K3-3 | Quick Cast：`playPrefs.ts`、`PlaySetup` 開關、`App`→`GameCanvas`／`PlayHUD` 接線 | `npm run e2e:play` 的 K3 Quick Cast 項目綠 |
| K3-4 | 全部閘門：`npm run lint`、`npm test`、`npm run build`（進入點 kB）、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run audit:ui -- P`、`npm run e2e:play` | 指令＋退出碼 |
| REPORT | `docs/K3_MOUSE_REPORT.md`：每個任務改了哪些檔（檔案:行號）、每個檢查的指令＋退出碼、進入點改前改後、e2e 每個 K3 項目的結果、沒做到的事與原因、回退指南。只寫數字與指令輸出，不寫效果形容詞；每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證） | — |

### 4. 守則與停下條件（INV）
- **已知偶發（記錄，不修）**：`e2e:play` 在 iPhone 版面的「tapping an enemy while aiming issues a cast order and ends aiming」「an enemy is on screen to aim at」（敵人移動中點偏，HANDOFF D）。只有這兩項失敗時再跑一次 `npm run e2e:play`，兩次結果都寫進報告；其他項目失敗照一般規則。
- 進入點超過 256.0 kB → 停下回報各檔增加多少，不要自己搬別的元件。
- 發現某則驗收在你看來和 ADR 0026 矛盾 → 停下回報，不改驗收。
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。
- **驗證不准動**：現有測試、驗收、斷言強度一律不改；不准 mock 被驗證的對象；不准用空的 `catch`。同一個驗收失敗兩次就停下回報。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」。

---

## 回來後使用者要做的事（給人看）
1. 主代理審查 diff、在主資料夾跑完整 `e2e:ui`，代為 commit，再問你要不要合併。
2. 桌機實機要看：左鍵按下去主角是不是馬上動；右鍵／中鍵拖鏡頭順不順；瞄準中右鍵點一下取消；選主角畫面打開 Quick Cast 後，游標停在敵人身上按技能鍵直接放。
