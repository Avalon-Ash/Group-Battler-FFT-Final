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
- **先選檔位**（CLAUDE.md 派工表）：定位、範圍明確的摘要用 `gpt-6-luna`／low，讀檔／轉換用 Luna／medium，長線實作用 `gpt-6.1-sol`／medium。Astra、xhigh，或非 Luna 的 high，都要在指令裡寫理由並加 `[codex-cost-ok]`，否則 hook 會擋下。使用者是 Plus 方案，額度很緊。
- **範圍要窄**：一份提示詞一個工作包。成本來自上下文、工具呼叫和重試，不只是訊息數；把讀檔範圍、驗收指令、停下條件寫死，並寫明探索與重試的上限。要避免的寫法：整庫清冊、要它重貼全文、沒有新假設的重試、要它看所有截圖。
- **工作樹**：可寫任務在 repo 外開**獨立 clone**（`git clone --no-hardlinks <主資料夾> C:\Git\_wt_<topic>`，切好分支），`node_modules` 用 `robocopy` 複製真目錄，不跑 npm 安裝。linked worktree 的 metadata 在主資料夾 `.git` 裡、junction 的 `node_modules` 沙盒寫不進去，都會讓 Codex 在開工前卡住（2026-10-26 R1 卡了三次）。不可放在主資料夾或 `.claude/worktrees` 底下。Gemini 在跑的資料夾不派 Codex 寫入；渲染工作同一時間只開一條，Gemini 和 Codex 共用這個限制。
- **沙盒限制要寫進提示詞**：workspace-write 沙盒連獨立 clone 的 `.git` 都唯讀，**Codex 不能 commit**——提示詞寫「不要 commit，改動留在工作樹，報告列出每個任務改了哪些檔」，主代理審查後分批代為 commit（訊息加 `Co-Authored-By: Codex`）。測試指令寫 `npx vitest run --exclude "**/AgentRunner.test.ts"`（那 2 項在沙盒內必失敗），主代理在沙盒外補跑完整 `npm test`。寫明「中途不要詢問；遇到停下條件就寫報告後結束」，非互動執行時它問了也沒人答（要答用 `task --resume-last`）。
- **啟動**：背景 Bash 執行 `node "<plugin>/scripts/codex-companion.mjs" task --write --model <m> --effort <e> --cwd <工作樹> --prompt-file docs/<NAME>_AGENT_PROMPT.md`，不加 `--background`，結束時 harness 會通知；不輪詢。只讀任務拿掉 `--write`。
- **範本差異**：Codex 會自己讀 `AGENTS.md`，範本其餘部分照用，但以下要改：
  - 刪掉「用法：/goal」那行。
  - INV 的「從 `main` 開分支」改成必填表頭：工作樹絕對路徑、已建好的分支、base SHA。寫明代理只確認 `git rev-parse HEAD` 和 `git status`，不建分支、不切分支。
  - `--prompt-file` 用絕對路徑，而且先確認檔案存在。提示詞如果還沒提交，就放在 scratchpad，不要指向工作樹裡不存在的 `docs/`。
  - 「每個任務一個 commit」改成「每個任務在報告列出改動的檔案」（Codex 不能 commit，見上）。
  - 長指令照樣用 `tools/agent/run.mjs`。Codex 能在本機開瀏覽器截圖，渲染任務要求把截圖路徑寫進報告當證據。
- **回報格式**（寫進提示詞）：短摘要只列完成／未完成 ID、commit、每個檢查的「指令＋退出碼＋log 路徑」、截圖路徑＋觀測值。證據綁定 commit：條件相同才能沿用，改動之後必要的檢查仍要重跑。
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
- **長指令（可能超過約 5 秒）一律分段跑**：`node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。只有 `STATE=DONE EXIT=0` 算通過；`TIMEOUT` 重跑一次，`LOST` 改前景補跑一次。同一步失敗或逾時兩次就記進報告、跳下一個任務（`AGENTS.md` §7）；範圍外的錯誤立即停下回報。必要的驗證沒完成，該任務就標「未完成」，不得宣稱驗收通過。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向<、本輪不該動的檔>。**保真基準一律不得重錄**。
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
