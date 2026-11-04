# 執行指令：導播取鏡第一包，純計算模組（DIRECTOR-SHOT P1）

> 派工：主代理用 agy 派。
> 背景：鏡頭沒有焦點，實跑量到 90% 的「太遠」是取景群組造成的。本輪把導播改成「框眼前這場架＋三種景別＋鏡頭視窗」。本包只做不碰引擎的純計算模組；接進導播是下一包。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_director_shot`（分支 `feat/director-shot`，主代理已建好）。**只准改工作資料夾內的檔案。**

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`tests/DirectorShot.test.ts`（這是你的驗收）、`constants/render.ts` 的 `DIRECTOR_PARAM`、`types.ts` 的 `ShotSize`／`ShotMember`／`ShotExtent`。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。
- **只能跑這些指令**，每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接：
  - `git status`
  - `git diff --stat`
  - `git rev-parse HEAD`
  - `npx vitest run tests/DirectorShot.test.ts`
  - `npm run lint`
  清單外的指令會被拒，而且整個執行會結束：需要別的指令就寫進報告，不要嘗試。
- 本包**不跑** `npm test`：`tests/DirectorFight.test.ts` 和 `tests/CameraZoom.test.ts` 的 dead zone 那一項要到下一包才會綠，這是預期的。
- 不要 commit、不准 `push`、不准動 `main`、不准合併。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/**`、`tests/**`、`constants/**`、`types.ts`。常數和型別主代理都加好了，**不要新增或修改常數**；缺東西就停下回報。

### 1. 已查證的事實（DOM）
- 常數都在 `DIRECTOR_PARAM`（`constants/render.ts`）；縮放範圍是 `UI_SETTINGS.CAMERA_ZOOM.directorMin`／`directorMax`（`constants/ui.ts`）。兩者都從 `../../constants` 匯入。
- `engine/math/VisualMath.ts:139` 有 `private static smoothstep(edge0, edge1, x)`。把它改成 `public static` 後直接用，不要自己再寫一份。它的方框檔頭不用動。
- 新檔用 LF；`VisualMath.ts` 是 CRLF，保持原行尾。

### 2. 規格（DOM）
新增 `engine/presentation/DirectorShot.ts`，檔頭照 `engine/presentation/DirectorRoster.ts` 的方框格式寫（職責、[ARCH]），匯出下面這些。不依賴引擎，不放 `console.log`。

**`measureMembers(members: readonly ShotMember[]): ShotExtent | null`**
- 空陣列回 `null`。
- `cx`、`cy` 是權重加權平均。
- `halfW`＝所有成員 `|x - cx|` 的最大值＋`UNIT_MARGIN_PX`；`halfH` 同理用 y。

**`fitZoom(ext, W, H): number`**
- 未夾的值（下面叫 raw）＝`min((W / 2) / (ext.halfW * FRAME_PADDING), (H / 2) / (ext.halfH * FRAME_PADDING))`。
- 回傳把 raw 夾到 `directorMin`～`directorMax`。raw 也要能給控制器用（模組內部函式即可，不用匯出）。

**`shotZoom(shot: ShotSize, W, H): number`**
- `(min(W, H) / 2) / SHOT_RADIUS_PX[shot]`，夾到 `directorMin`～`directorMax`。

**`class ShotZoomController`**：公開 `shot: ShotSize`（初值 `'WIDE'`）、`zoom: number`（初值 `EMPTY_ZOOM`）、`reset()`、`update(ext, W, H, dt): number`（回傳並更新 `zoom`）。
1. 所有比較都用 **raw**，不是夾過的值；否則桌機上 raw 會被上限蓋住，永遠拉不近。
2. 景別的目標縮放：`CLOSE`、`MID` 是 `shotZoom`；`WIDE` 是 `min(shotZoom('WIDE'), raw)` 再夾到範圍內。
3. 「放得下」：`raw >= shotZoom(s)`。`WIDE` 永遠放得下。「最緊的放得下的景別」依 `CLOSE`→`MID`→`WIDE` 找第一個。
4. **第一次 update（或 reset 後）**：直接落在最緊的放得下的景別，`zoom` 等於它的目標縮放，沒有緩動。
5. **拉遠**：目前景別放不下時累加 `outTimer`，一放得下就歸零。`outTimer >= SHOT_OUT_HOLD_S` 時換到最緊的放得下的景別，開始一次長度 `SHOT_OUT_BLEND_S` 的緩動。
6. **拉近**：找比目前緊的景別中最緊的、而且 `raw >= shotZoom(s) * SHOT_IN_MARGIN` 的。有就累加 `inTimer`，沒有就歸零；`inTimer >= SHOT_IN_HOLD_S` 時換過去，開始一次長度 `SHOT_IN_BLEND_S` 的緩動。
7. 換景別時兩個計時器都歸零。
8. **緩動**：記 `from`＝換景別當下的 `zoom`、`elapsed`＝0。每次 update 先 `elapsed += dt`，令 `s = VisualMath.smoothstep(0, 1, elapsed / blend)`，`zoom = exp(lerp(ln(from), ln(目標), s))`。目標每次重算（`WIDE` 的目標會變）。`elapsed >= blend` 就結束緩動，`zoom` 等於目標。緩動中又換景別，就從當下的 `zoom` 重新開始。
9. **沒有緩動時**：`CLOSE`、`MID` 的 `zoom` 就等於目標。`WIDE` 時朝目標移動，每次 update 的對數變化不超過 `WIDE_ZOOM_RATE_PER_S * dt`。
10. `zoom` 永遠在 `directorMin`～`directorMax` 之內。

**`class CameraWindow`**：`reset()`、`update(fx, fy, zoom, W, H): { x, y }`。
- 第一次 update（或 reset 後）：位置等於 `(fx, fy)`。
- 視窗半寬（世界座標）＝`WINDOW_X * min(W, H) / zoom`，半高＝`WINDOW_Y * min(W, H) / zoom`。
- `fx` 超出 `x ± 半寬` 時，把 `x` 推到焦點剛好在邊上；在框內 `x` 不動。`y` 同理。
- 回傳新物件。

**`class FocusBlend`**：`reset()`、`begin(fromX, fromY)`、`apply(x, y, dt): { x, y }`。
- 沒有進行中的過渡：原樣回傳 `(x, y)`。
- `begin` 記下起點、`elapsed` 歸零。`apply` 先 `elapsed += dt`，`s = VisualMath.smoothstep(0, 1, elapsed / SWITCH_BLEND_S)`，回傳起點和 `(x, y)` 之間比例 `s` 的點。`elapsed >= SWITCH_BLEND_S` 就結束過渡，回傳 `(x, y)` 本身。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| P1-1 | `VisualMath.smoothstep` 改 public；寫 `measureMembers`、`fitZoom`、`shotZoom`、`CameraWindow`、`FocusBlend` | `npx vitest run tests/DirectorShot.test.ts`（這幾組綠） |
| P1-2 | 寫 `ShotZoomController` | `npx vitest run tests/DirectorShot.test.ts` 全綠；`npm run lint` 退出碼 0 |
| REPORT | `docs/DIRECTOR_SHOT_P1_REPORT.md`：每個任務改了哪些檔、每個檢查的「指令＋退出碼」、沒做到的事。只寫數字和指令輸出，不寫效果形容詞。每個完成項附檔案:行號 | — |

### 4. 守則與停下條件（INV）
- 不新增依賴、不用 `as any`、不加安全網。魔術數字一律用常數（`0`、`1`、`2` 這類公式本身的數字除外）。
- **驗證不准動**：`tests/**` 一律不改。不准 mock、stub，不准用空的 `catch`。
- 同一個驗收失敗兩次、或覺得規格和測試互相矛盾，就停下，把失敗輸出與你的判斷寫進報告後結束，不要想辦法讓它過。
- 中途不要詢問。做不到的寫「未完成」，不寫「CLOSED」。
