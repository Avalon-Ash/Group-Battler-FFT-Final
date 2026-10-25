---
name: agent-prompt
description: 撰寫給 IDE Gemini（使用者用 /goal 啟動）或 Codex（主代理以 codex-companion task 派出）執行的任務提示詞 docs/<NAME>_AGENT_PROMPT.md，以及開新一輪工作的分支流程。要把長時間、機械性的實作交出去、或規劃新一輪工作時使用。
---

# 寫 Gemini 任務提示詞

主代理的產出是這份提示詞，不是程式碼。Gemini 會讀 `AGENTS.md`（合約）＋這份提示詞，其他東西它看不到。

## 開一輪的流程
1. 寫 `docs/<NAME>_AGENT_PROMPT.md`（本 skill 的範本）。
2. 從 `main` 開分支 `feat/<topic>`，在原生資料夾切過去。真的要並行才開工作樹 `C:\Git\Group-Battler-<topic>`（`node_modules` junction 指回原生資料夾；移除時先 `cmd /c rmdir <path>\node_modules` 再 `git worktree remove`）。
3. 使用者在 IDE 執行 `/goal docs/<NAME>_AGENT_PROMPT.md`。代理跑的期間主代理對該資料夾只讀不寫，也不跑 e2e／perf／Blender。
4. 跑完 → `review-round` skill。

## 改派給 Codex 時（主代理自己發起）
- **先選檔位**（CLAUDE.md 派工表）：讀檔／摘要／轉換用 `gpt-6-luna`／medium，長線實作用 `gpt-6.1-sol`／medium。Astra、xhigh，或非 Luna 的 high，都要在指令裡寫理由並加 `[codex-cost-ok]`，否則 hook 會擋下。使用者是 Plus 方案，額度很緊。
- **範圍要窄**：一份提示詞一個工作包。Codex 每一則訊息都計次，把讀檔範圍、驗收指令、停下條件寫死，比讓它自己探索便宜。
- **工作樹**：可寫任務在 repo 外開工作樹（`git worktree add -b <branch> C:\Git\_wt_<topic> <base>`，用 `cmd /c mklink /J node_modules <主資料夾>\node_modules` 接 junction，不跑 npm 安裝）。不可放在主資料夾或 `.claude/worktrees` 底下，否則可能被代理 `git add` 進去。Gemini 在跑的資料夾不派 Codex 寫入；渲染工作同一時間只開一條，Gemini 和 Codex 共用這個限制。
- **啟動**：背景 Bash 執行 `node "<plugin>/scripts/codex-companion.mjs" task --write --model <m> --effort <e> --cwd <工作樹> --prompt-file docs/<NAME>_AGENT_PROMPT.md`，不加 `--background`，結束時 harness 會通知；不輪詢。只讀任務拿掉 `--write`。
- **範本差異**：Codex 會自己讀 `AGENTS.md`，範本照用，但改掉「用法：/goal」那行。長指令照樣用 `tools/agent/run.mjs`。Codex 能在本機開瀏覽器截圖，渲染任務要求把截圖路徑寫進報告當證據。
- 跑完照樣走 `review-round`；Codex 的報告也不整份讀。

## 寫法原則（取自 Harness² 的提案者規則）
- **寫查證過的事實，不要只寫「去找出 X」**：檔案:行號、常數名與現值、欄位的唯一寫入者、量測基準數字。讓代理少走摸索的路，也少一個改錯地方的機會。事實要標明「目前」，猜的不要寫。
- **INV／DOM 分開寫**：INV＝代理怎麼工作（讀什麼、指令、驗證順序、commit 切法、停下條件）；DOM＝這個領域的知識與驗收（RenderSpec 座標協議、平衡目標、美術規格）。混在一起時代理會用領域敘述跳過流程。
- **能檢查的規則，不寫背景**：「結束前確認 X 涵蓋 A、B、C」勝過一段說明。
- **寫明怎麼觀測與重試**：每個長指令給名稱與逾時（`AGENTS.md` §7 的表），一律寫成「`--detach` 啟動、`--wait` 分段等、同一步兩次失敗就跳過」，並明寫「指令還在跑時不得結束回合、不得只回報『等待中』」。代理的 IDE 會把超過幾秒的工具呼叫轉背景並交出回合，通知沒來就停住（2026-10 停過 70 分鐘、2 小時、6.5 小時）。
- **允許「不改」**：證據不支持改動時要求它停下回報，而不是硬做（防安全網，METHODOLOGY §4 第 6 條）。
- 動到渲染／座標：必須寫「先讀 `engine/renderers/RenderSpec.ts` 與所改檔案的方框檔頭，改規則時同一個 commit 同步更新兩者」。渲染工作同一時間只開一條。

## 範本
```markdown
# 執行指令：<主題>（<代號>）

> 用法：在 IDE 代理對話輸入 `/goal docs/<NAME>_AGENT_PROMPT.md`。
> 背景：<為什麼做；主代理已量到的基準數字；本輪只做什麼、不做什麼>

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、<檔案清單，含 RenderSpec 若相關>。
- 從 `main` 開分支 `feat/<topic>`；`git status` 必須乾淨。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、<基準量測>。
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向<、本輪不該動的檔>。**保真基準一律不得重錄**。
- 不准 `push`、不准動 `main`、不准合併。

### 1. 已查證的事實（DOM）
- <檔案:行號 — 現況與數值>
- <唯一寫入者、座標規則、量測基準>

### 2. 目標與規則（DOM）
- 驗收目標：<可量測的門檻>
- 可以改：<欄位／檔案>；不可以改：<...>；幅度上限：<...>

### 3. 任務（依序）
| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| X0 | ... | lint／test／build；<實跑或量測> |
| REPORT | `docs/<NAME>_REPORT.md`：改前／改後數字表、每個改動的理由、沒達標的項目與原因、回退指南（每個任務的 commit） | — |

- 每個任務一個 commit。

### 4. 守則與停下條件（INV）
- <超過幅度上限／試了 N 批仍不達標／發現看似 bug 的現象 → 只記錄、停下回報>
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「<主題>跑完了」，主代理會審查 `git diff main...feat/<topic>` 再問你要不要合併。
2. <實機要看的點>
```
