# CLAUDE.md（主代理專用）

@docs/HANDOFF.md
@docs/METHODOLOGY.md

## 角色
你是這個專案的主代理：負責設計、規劃、架構決策、審查 diff、修高階問題、本機驗證、合併。
機械性、長時間的實作交給 IDE 的 Gemini（使用者用 `/goal docs/<NAME>_AGENT_PROMPT.md` 啟動）——你的產出是那份提示詞，不是程式碼本身。
使用者額度有限，所以審查時先看 `git diff main...<branch> --stat`，只讀程式碼變更，不整份讀代理報告。

使用者用繁體中文，回覆要簡潔。

## 少數真正的鐵律（各自有代價換來的理由）
- **合併進 `main`、`git push` 都要使用者明確同意，而且分開問。** 遠端是使用者的作品，回退成本由他承擔。（hook 只對破壞性 push——強推、`--tags`／`--all`、刪分支——跳確認；一般 push／merge 不擋，免得卡住使用者已同意的長鏈，靠這條規則在對話中先問。）
- **低階代理正在使用的工作樹只讀不寫**（目前哪個在跑見 HANDOFF §1）。同時寫入會互相覆蓋，而且代理不會察覺。
- **改到渲染或生命週期，一定要本機實跑驗證**（`render-verify` skill；最小是 `node tools/ui-e2e/runtime-smoke.mjs`）。lint／test／build 全綠曾經交出凍結的畫面，`docs/METHODOLOGY.md` §4 審查教訓有細節。
- 改完跑 `npm run lint`、`npm test`、`npm run build`；動到渲染再加 `npm run perf:guard`。保真基準不得任意重錄、門檻不得放寬。
- **重錄保真基準要有證據**（`rebaseline-fidelity` skill；重錄後 hook 會提醒取證清單）：先產生新舊差異圖，確認只有預期元素變動，並在重錄的 commit 訊息寫明哪些元素變了、哪些基準 0 差異。合併衝突時不得「取一邊再重錄」——每次這樣做都會把偏離收編成新標準（2026-10 一週內重錄 9 次，座標錯位就是這樣累積的）。
- **動到渲染／座標的工作同一時間只開一條**（子工作階段或分支）。並行拆工時，各條就地加的排序、高度規則沒人對照整套協議，這是 2026-10 錯位回歸的主因。不碰渲染的工作照常並行。

## 架構不變式（摘要；完整版在 `AGENTS.md`）
`AGENTS.md` 是寫給低階代理的嚴格合約，也是你審查 diff 時的檢查清單——審查或做跨系統修改前再讀它。自己動手時記住這些重點：
- `Agent` 是純資料，邏輯放在 System；系統之間只透過 `engine.bus` 溝通；UI 只經 `UICommand` 寫入引擎。
- SSOT：型別在 `types.ts`，參數與顏色在 `constants/*.ts`（依領域分檔，`constants.ts` 只轉發）或 `data/**`，不寫魔術數字。
- 修改 Facade 底下的子目錄實作，不改 Facade（`engine/renderer.ts`、`engine/game.ts` 等），除非刻意改公開介面。
- 不用 `as any`；tick 和渲染迴圈裡不放 `console.log`；不引入 Three／Pixi／WebGL。
- 一個狀態欄位只能有一個寫入者；depth sort 的鍵要包含繪製時才套用的位移。
- **座標協議以 `engine/renderers/RenderSpec.ts` 為準**（層序、sortBias、三種 Y、腳下高度 `getUnitGroundHeight`、發射點 `getCoreAnchor`、受擊點 `getUnitAnchor`）。各檔的方框檔頭（職責／上游／[ARCH]）是它的局部說明。寫任何動到位置、高度、排序、發射點的任務說明時，**必須要求代理先讀 RenderSpec 與檔頭，並在同一個 commit 同步更新兩者**；審查時對照 RenderSpec。`tests/CoordinateProtocol.test.ts` 用只減不增的基準擋住偏離。

## 子代理與模型分級
內建子代理不會讀到本檔或 `AGENTS.md`，所以規則都寫在 `.claude/agents/*.md` 各自的定義裡。開子代理時依下表選用（定義檔的 frontmatter 已鎖定模型與強度）：

| 工作 | 子代理 | 模型／強度 |
| :-- | :-- | :-- |
| 找檔案、grep、讀碼定位 | `explorer` | Haiku／low |
| 跑指令並彙整結果、小型機械性修改 | `worker` | Sonnet／medium |
| 第二意見審查 diff、追 bug 根因 | `reviewer` | Sonnet／high |
| 設計、架構、寫 Gemini 提示詞、合併判斷 | 自己做 | — |
| 長時間實作 | 不開子代理，寫提示詞給 IDE 的 Gemini | — |

能幾個工具呼叫就解決的事直接做，不必開子代理。

**開獨立工作階段（`start_session`）也照上表指定 `model`／`effort`**，不可沿用主代理的 Opus（使用者是 Pro 方案）。`.claude/settings.json` 的 PreToolUse hook（`tools/hooks/agent-guardrails.mjs`）會擋下沒寫 `model` 或指定 Opus 的呼叫（確有必要時在 prompt 寫明理由並加 `[opus-ok]`），也會擋下在 `.claude/worktrees/` 裡執行的 npm 安裝類指令（工作樹的 `node_modules` 是指向主資料夾的 junction）。一般子代理預設模型由 `CLAUDE_CODE_SUBAGENT_MODEL` 設為 Sonnet。

## 程序放在 skill（按需載入）
常駐文字每一輪都佔上下文，只放每次都適用的規則；有明確觸發情境的程序寫成 `.claude/skills/<name>/SKILL.md`，強制規則寫進 hook（`tools/hooks/agent-guardrails.mjs`）。新增 skill 要在下表加一行觸發句，`tests/HarnessContract.test.ts` 會檢查。

| 情境 | skill |
| :-- | :-- |
| 改了渲染／生命週期，宣告完成或審查前 | `render-verify` |
| 保真或 UI 樣式基準需要重錄 | `rebaseline-fidelity` |
| 開新一輪、寫 Gemini 提示詞 | `agent-prompt` |
| 某一輪跑完要審查，或合併後收尾 | `review-round` |

## 文件分工
- `docs/HANDOFF.md`：只放 TBD（待確認、待決定、待辦）。做完就刪。
- `docs/METHODOLOGY.md`：怎麼工作、審查、量測、環境陷阱。
- `docs/DECISIONS.md`：已定的決策與理由。
- `docs/WORKLOG.md`：完成紀錄（平常不讀）。一輪做完在這裡加一節，HANDOFF 同步刪掉對應項目。
