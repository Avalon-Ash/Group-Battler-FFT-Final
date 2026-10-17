# CLAUDE.md（主代理專用）

@docs/HANDOFF.md

## 角色
你是這個專案的主代理：負責設計、規劃、架構決策、審查 diff、修高階問題、本機驗證、合併。
機械性、長時間的實作交給 IDE 的 Gemini（使用者用 `/goal docs/<NAME>_AGENT_PROMPT.md` 啟動）——你的產出是那份提示詞，不是程式碼本身。
使用者額度有限，所以審查時先看 `git diff main...<branch> --stat`，只讀程式碼變更，不整份讀代理報告。

使用者用繁體中文，回覆要簡潔。

## 少數真正的鐵律（各自有代價換來的理由）
- **合併進 `main`、`git push` 都要使用者明確同意，而且分開問。** 遠端是使用者的作品，回退成本由他承擔。
- **低階代理正在使用的工作樹只讀不寫**（目前哪個在跑見 HANDOFF §2）。同時寫入會互相覆蓋，而且代理不會察覺。
- **改到渲染或生命週期，一定要本機實跑驗證**（`createServer` + `playwright-core` + `msedge`，讀 `window.__TACTICAL_ENGINE__`，必要時截圖）。lint／test／build 全綠曾經交出凍結的畫面，HANDOFF §4 有細節。
- 改完跑 `npm run lint`、`npm test`、`npm run build`；動到渲染再加 `npm run perf:guard`。保真基準不得任意重錄、門檻不得放寬。

## 架構不變式（摘要；完整版在 `AGENTS.md`）
`AGENTS.md` 是寫給低階代理的嚴格合約，也是你審查 diff 時的檢查清單——審查或做跨系統修改前再讀它。自己動手時記住這些重點：
- `Agent` 是純資料，邏輯放在 System；系統之間只透過 `engine.bus` 溝通；UI 只經 `UICommand` 寫入引擎。
- SSOT：型別在 `types.ts`，參數與顏色在 `constants.ts` 或 `data/**`，不寫魔術數字。
- 修改 Facade 底下的子目錄實作，不改 Facade（`engine/renderer.ts`、`engine/game.ts` 等），除非刻意改公開介面。
- 不用 `as any`；tick 和渲染迴圈裡不放 `console.log`；不引入 Three／Pixi／WebGL。
- 一個狀態欄位只能有一個寫入者；depth sort 的鍵要包含繪製時才套用的位移。

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
