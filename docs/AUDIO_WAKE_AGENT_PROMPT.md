# 執行指令：音訊喚醒（AUDIO-WAKE）

> 派工：主代理用 agy 派。
> 背景：使用者在 iPhone 上有時完全沒有音樂音效，重新整理才有機會恢復。主代理已在真瀏覽器重現：被打斷後點畫面喚不回來；`blur` 之後沒有 `focus`，總音量停在 0，回到頁面或點畫面都救不回來；停住時音效持續堆積，佔滿 24 個發聲槽。本包只改喚醒流程，不動混音、曲目與預載。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_director_shot`（分支 `fix/audio-wake`，主代理已建好）。**只准改工作資料夾內的檔案。**

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`tests/AudioWake.test.ts`（你的驗收）、`engine/audio/AudioEngine.ts`。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。
- **只能跑這些指令**，每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接：
  - `git status`
  - `git diff --stat`
  - `git rev-parse HEAD`
  - `npx vitest run tests/AudioWake.test.ts`
  - `npm run lint`
  - `npm test`
  - `npm run build`
  - `npm run knip`
  - `node tools/ui-e2e/runtime-smoke.mjs`
  清單外的指令會被拒，而且整個執行會結束：需要別的指令就寫進報告，不要嘗試。
- 不要 commit、不准 `push`、不准動 `main`、不准合併。
- **只准改 `engine/audio/AudioEngine.ts`**，以及新增報告。受保護（不得修改）：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/**`、`tests/**`、`constants/**`、`types.ts`。常數主代理已加好，**不要新增或修改常數**。

### 1. 已查證的事實（DOM）
- 檔案是 CRLF，保持原行尾。
- `AudioEngine.ts:224` `unlock()`：`isUnlocked` 一設成 true 就移除手勢監聽，之後不再重試；而且設 true 時 context 不一定真的在跑。
- `AudioEngine.ts:250` `resume()`：只在 `state === 'suspended'` 時呼叫 `ctx.resume()`。iOS 被打斷時狀態是 `'interrupted'`（不在 TS 的 `AudioContextState` 型別裡），所以不會恢復。
- `AudioEngine.ts:265` `playCue`：只看 `isUnlocked`，context 停住時照樣建立 source，`onended` 不會觸發，發聲槽被佔滿。
- `AudioEngine.ts:705` `bindWindowEvents()`：手勢只聽 `pointerdown`、`keydown`，`once: true`。依 HTML 規範，觸控的 `pointerdown` 不算使用者手勢，`pointerup`、`touchend`、`click` 才算。
- `AudioEngine.ts:723`：`blur` 把總音量淡到 `SILENT_GAIN`，只有 `focus` 會恢復；手機上 `focus` 不一定會來。
- 常數 `AUDIO_ENGINE_PARAM.GESTURE_EVENTS` 已列好要聽的手勢事件。
- 舊測試 `tests/AudioEngine.test.ts` 的假 context 沒有 `addEventListener`，而且那些測試沒有 `window`：`statechange` 的監聽要綁在 `bindWindowEvents()` 裡（它在沒有 `window` 時會提早 return），不要綁在 `initContext`，也不要用可選鏈硬過。

### 2. 規格（DOM）
1. **手勢**：`bindWindowEvents()` 對 `GESTURE_EVENTS` 每個事件都掛一個監聽（`capture: true`、`passive: true`，不用 `once`），整個引擎存活期間都不移除。監聽內呼叫 `unlock()`。
2. **`unlock()`**：不再有「只做一次」的判斷。依序：
   - 如果總音量因 `blur` 被淡掉，恢復它（見第 6 點）。
   - 如果 context 不是 `running` 也不是 `closed`，呼叫 `ctx.resume()`。已經 `running` 時不呼叫。
   - `preloadMusicTracks()` 照舊呼叫（它自己有 `hasPreloaded` 保護）。
3. **`isUnlocked`**：只代表「context 真的跑起來過」。context 狀態變成 `running` 時才設 true：`initContext` 的既有判斷、`unlock()`／`resume()` 呼叫 `ctx.resume()` 之後立刻檢查一次、`ctx.resume()` 的 promise 完成時再檢查一次、`statechange` 時也檢查。設 true 之後不會變回 false。
4. **`resume()`**：條件改成「`isUnlocked`、沒有手動靜音、狀態不是 `running` 也不是 `closed`」。用 `this.ctx.state` 比較字串即可，不要用 `as any`。
5. **`playCue`**：開頭的判斷加上「context 狀態不是 `running` 就回 false」。
6. **總音量**：加一個私有旗標，`blur` 淡出時設 true；加一個私有方法 `restoreMasterGain()`：旗標是 true 才動作，動作時把旗標清掉，手動靜音時不恢復音量（旗標一樣清掉），否則用現在 `focus` 那段的算法淡回去。`focus`、回到可見（`visibilitychange` 且 `document.hidden` 為 false）、`pageshow`、`unlock()` 都呼叫它。旗標是 false 時不得碰增益排程。
7. **`statechange`**：`bindWindowEvents()` 裡對 context 掛 `statechange`。狀態變成 `running`：設 `isUnlocked`。狀態變成其他非 `closed` 的值，而且 `document.hidden` 為 false：呼叫 `resume()`（第 4 點的條件）。頁面隱藏時不動作，否則會和自己的 `suspend()` 打架。
8. **`pageshow`**：`window` 掛 `pageshow`，呼叫 `resume()` 和 `restoreMasterGain()`。
9. **`setMuted(false)`**：套完音量後呼叫 `resume()`（靜音時 context 可能一直沒被喚醒）。
10. **`destroy()`**：移除所有新增的監聽（手勢、`pageshow`、`statechange`）。沿用 `removeUnlockListeners` 這類既有寫法；用到的函式參考存成欄位，和現有的 `visibilityListenerBound` 一樣。
11. 更新 `unlock()`、`resume()` 的註解，讓它們說的是新的行為。

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| A1 | 規格第 1～5、7～11 點 | `npx vitest run tests/AudioWake.test.ts` 的 gestures、interruption 兩組綠 |
| A2 | 規格第 6 點 | `npx vitest run tests/AudioWake.test.ts` 全綠 |
| A3 | 整體驗證 | `npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/runtime-smoke.mjs` 全部退出碼 0 |
| REPORT | `docs/AUDIO_WAKE_REPORT.md`：改了哪些檔、每個檢查的「指令＋退出碼」、沒做到的事。只寫數字和指令輸出，不寫效果形容詞。每個完成項附檔案:行號 | — |

### 4. 守則與停下條件（INV）
- 不新增依賴、不用 `as any`、不加計時器重試或輪詢，不加規格沒寫的安全網。
- **驗證不准動**：`tests/**` 一律不改。不准 mock、stub，不准用空的 `catch`。
- 同一個驗收失敗兩次、或覺得規格和測試互相矛盾，就停下，把失敗輸出與你的判斷寫進報告後結束，不要想辦法讓它過。
- 中途不要詢問。做不到的寫「未完成」，不寫「CLOSED」。
