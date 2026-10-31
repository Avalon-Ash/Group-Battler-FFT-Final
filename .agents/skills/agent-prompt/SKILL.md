---
name: agent-prompt
description: 撰寫給 agy 低階代理（Claude Sonnet 5.5 或 Gemini，主代理用 agy 直接派；備援是使用者在 IDE 用 /goal 啟動）或 Codex（主代理以 codex-companion task 派出）執行的任務提示詞 docs/<NAME>_AGENT_PROMPT.md，以及開新一輪工作的資料夾與分支流程。要把長時間、機械性的實作交出去、或規劃新一輪工作時使用。
---

# 寫任務提示詞並派出

主代理的產出是這份提示詞，不是程式碼。執行代理會讀 `AGENTS.md`（合約）＋這份提示詞，其他東西它看不到。

## 開一輪的流程（預設：主代理用 agy 派）
1. 寫 `docs/<NAME>_AGENT_PROMPT.md`（本 skill 的範本）。還沒提交就放 scratchpad，派工時用絕對路徑。
2. **工作資料夾**：在 repo 外開**獨立 clone**（`git clone --no-hardlinks <主資料夾> C:\Git\_wt_<topic>`），切好分支 `feat/<topic>`，`node_modules` 用 `robocopy` 複製真目錄，不跑 npm 安裝。不可放在主資料夾或 `.claude/worktrees` 底下。
3. **派工**（檔位與韁繩見全域 `agy-call` skill；實作小包首選 agy 的 `claude-sonnet-5-5-medium`，次選 `gemini-4-argon-medium`，依 `~/.claude/QUOTA.md` 的額度換池；一份提示詞 ≤3 個任務，長線工作拆成多份逐份派）：背景 Bash 執行
   `cd C:/Git/_wt_<topic> && "$LOCALAPPDATA/agy/bin/agy.exe" --model <模型> --mode accept-edits --settings C:/Git/Group-Battler-FFT-Final/tools/agent/gemini-allow.json --output-format json -p "讀 <提示詞絕對路徑> 並照做"`
   等 harness 通知，不輪詢。代理跑的期間主代理對該資料夾只讀不寫，也不跑 e2e／perf／Blender。
4. 跑完 → `review-round` skill。agy 的代理不能 commit（允許清單只放確切指令），主代理審查後依任務分批代為 commit（訊息加 `Co-Authored-By:` 實際用的模型）。審查先看 `tests/**` 與驗收腳本的 diff（Gemini 4 在測試一直失敗時會改驗證來過關），再 grep 報告提到的每個函式與行號確認存在。
5. **改回 IDE 的條件**：權限擋住必要的指令、反覆卡住、或品質兩次不及格 → 改請使用者在 IDE 執行 `/goal <提示詞>`（資料夾同上），並說明原因；在 INV 補上下方「IDE 備援」的長指令規則。

## 允許清單（`tools/agent/gemini-allow.json`）
- 只有字串完全相同的指令會放行；`tests/HarnessContract.test.ts` 擋下萬用字元與 commit／push／刪除。
- 提示詞的 INV 要列出「只能跑這些指令」，照抄清單，並寫明「每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接」。**被拒一次整個執行就結束**（2026-10-31 實測：沒寫這句時模型把兩個指令串成一行而被拒）。
- 某輪需要別的確切指令（例如某支量測腳本）就加進清單，跟該輪一起 commit。

## 改派給 Codex 時（主代理自己發起）
- **先選檔位**（全域 `codex-call` skill 檔位表）：定位、範圍明確的摘要用 `gpt-6-luna`／low，讀檔／轉換用 Luna／medium，長線實作用 `gpt-6.1-sol`／medium。Astra、xhigh，或非 Luna 的 high，都要在指令裡寫理由並加 `[codex-cost-ok]`，否則 hook 會擋下。使用者是 Plus 方案，額度很緊。
- **工作樹**：同上的獨立 clone。linked worktree 的 metadata 在主資料夾 `.git` 裡、junction 的 `node_modules` 沙盒寫不進去，都會讓 Codex 在開工前卡住（2026-10-26 R1 卡了三次）。agy 代理在跑的資料夾不派 Codex 寫入；渲染工作同一時間只開一條，agy 代理和 Codex 共用這個限制。
- **git 擁有者檢查**：獨立 clone 在 Codex 沙盒裡會被判定 dubious ownership，`git status` 等全部失敗，Luna 會照規定直接停下（2026-10-29 O6）。INV 要寫明「所有 git 指令一律 `git -c safe.directory=<工作樹> …`（單次參數，不改設定）」；測試裡呼叫 git 的也要帶這個參數（`MagicNumberBudget`、`ToolsReferenced`、`NoLocalHash` 已改）。
- **沙盒限制要寫進提示詞**：workspace-write 沙盒連獨立 clone 的 `.git` 都唯讀，**Codex 不能 commit**（同 agy 代理，主代理代為 commit，訊息加 `Co-Authored-By: Codex`）。測試指令寫 `npx vitest run --exclude "**/AgentRunner.test.ts"`（那 2 項在沙盒內必失敗），主代理在沙盒外補跑完整 `npm test`。寫明「中途不要詢問；遇到停下條件就寫報告後結束」，非互動執行時它問了也沒人答（要答用 `task --resume-last`）。
- **啟動**：背景 Bash 執行 `node "<plugin>/scripts/codex-companion.mjs" task --write --model <m> --effort <e> --cwd <工作樹> --prompt-file <提示詞絕對路徑>`，不加 `--background`，結束時 harness 會通知；不輪詢。只讀任務拿掉 `--write`。
- 長指令照樣用 `tools/agent/run.mjs`。Codex 能在本機開瀏覽器截圖，渲染任務要求把截圖路徑寫進報告當證據。
- 跑完照樣走 `review-round`；Codex 的報告也不整份讀。

## 共通寫法
- **範圍要窄**：一份提示詞一個工作包。成本來自上下文、工具呼叫和重試，不只是訊息數；把讀檔範圍、驗收指令、停下條件寫死，並寫明探索與重試的上限。要避免的寫法：整庫清冊、要它重貼全文、沒有新假設的重試、要它看所有截圖。
- **環境相關的驗收**：保真數字跨次執行會漂移，「畫面沒變」寫成同環境 A/B（見 `render-verify`），不要寫「和改前的數字比容差」。
- **回報格式**（寫進提示詞）：短摘要只列完成／未完成 ID、每個任務改了哪些檔、每個檢查的「指令＋退出碼」、截圖路徑＋觀測值。證據綁定改動：條件相同才能沿用，改動之後必要的檢查仍要重跑。
- **寫查證過的事實，不要只寫「去找出 X」**：檔案:行號、常數名與現值、欄位的唯一寫入者、量測基準數字。讓代理少走摸索的路，也少一個改錯地方的機會。事實要標明「目前」，猜的不要寫。（取自 Harness² 的提案者規則）
- **INV／DOM 分開寫**：INV＝代理怎麼工作（讀什麼、指令、驗證順序、停下條件）；DOM＝這個領域的知識與驗收（RenderSpec 座標協議、平衡目標、美術規格）。混在一起時代理會用領域敘述跳過流程。
- **能檢查的規則，不寫背景**：「結束前確認 X 涵蓋 A、B、C」勝過一段說明。
- **允許「不改」**：證據不支持改動時要求它停下回報，而不是硬做（防安全網，METHODOLOGY §4 第 6 條）。
- 動到渲染／座標：必須寫「先讀 `engine/renderers/RenderSpec.ts` 與所改檔案的方框檔頭，改規則時同一個 commit 同步更新兩者」。渲染工作同一時間只開一條。

## IDE 備援時（使用者用 /goal 啟動）
- 在範本的 INV 加上：長指令（可能超過約 5 秒）一律 `node tools/agent/run.mjs --detach <名稱> <逾時秒數> -- <指令>` 啟動，接著反覆 `node tools/agent/run.mjs --wait <名稱>` 直到第一行是 `STATE=DONE`；**指令還在跑時不得結束回合，不得只回覆「等待中」**。只有 `STATE=DONE EXIT=0` 算通過；`TIMEOUT` 重跑一次，`LOST` 改前景補跑一次（`AGENTS.md` §7）。IDE 會把超過幾秒的工具呼叫轉背景並交出回合，通知沒來就停住（2026-10 停過 70 分鐘、2 小時、6.5 小時）。agy 無頭模式會等背景指令跑完（上限 30 分鐘），不需要這段。
- IDE 的 Gemini 可以 commit：允許「每個任務一個 commit」，主代理照樣審查 diff。

## 範本
```markdown
# 執行指令：<主題>（<代號>）

> 派工：主代理用 agy 派（agent-prompt skill）；備援是使用者在 IDE 輸入 `/goal <本檔路徑>`。
> 背景：<為什麼做；主代理已量到的基準數字；本輪只做什麼、不做什麼>

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `<工作資料夾絕對路徑>`（分支 `feat/<topic>`，base `<SHA>`，主代理已建好）。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、<檔案清單，含 RenderSpec 若相關>。
- 只確認 `git rev-parse HEAD` 與 `git status`（必須乾淨），不建分支、不切分支。先跑並記進報告（不綠就停下回報）：`npm run lint`、`npm test`、`npm run build`、`npm run knip`、<基準量測>。
- **只能跑這些指令**：<照抄 `tools/agent/gemini-allow.json`>。每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接。清單外的指令會被拒，而且會讓整個執行結束：需要別的指令就寫進報告，不要嘗試。
- 一次性的探針、截圖、重現腳本一律寫在 `tools/ui-e2e/out/`（不進版控）；要進 `tools/` 的腳本必須掛上 npm script 或被測試引用。亂數只用 `engine/math/rng.ts`，不自己寫 PRNG／雜湊。
- 必要的驗證沒完成，該任務就標「未完成」，不得宣稱驗收通過。同一步失敗兩次就記進報告、跳下一個任務；範圍外的錯誤立即停下回報。中途不要詢問，遇到停下條件就寫報告後結束。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/gemini-allow.json`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向<、本輪不該動的檔>。**保真基準一律不得重錄**。
- 不要 commit、不准 `push`、不准動 `main`、不准合併。改動留在工作資料夾，報告列出每個任務改了哪些檔。

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
| REPORT | `docs/<NAME>_REPORT.md`：改前／改後數字表、每個改動的理由、每個任務改了哪些檔、沒達標的項目與原因、回退指南。只寫數字、指令輸出與沒做到的事，不寫效果形容詞（「大幅改善」「完全解決」）；每個結論附產生它的指令 | — |

### 4. 守則與停下條件（INV）
- <超過幅度上限／試了 N 批仍不達標／發現看似 bug 的現象 → 只記錄、停下回報>
- 不新增依賴、不用 `as any`、tick 與渲染迴圈不放 `console.log`、不加安全網。
- **驗證不准動**：現有測試、驗收腳本、斷言強度一律不改；新測試不准用 `x || 0`、`?? 預設值` 這類缺欄位也會通過的斷言；被驗證的對象不准 mock、stub 或攔截請求；不准用空的 `catch` 吞錯誤。同一個驗收失敗兩次就停下回報，不要再想辦法讓它通過。
- 報告的每個完成項附檔案:行號；做不到的寫「未完成」，不寫「CLOSED」。

---

## 回來後使用者要做的事（給人看）
1. 主代理會審查 diff、代為 commit，再問你要不要合併。
2. <實機要看的點>
```
