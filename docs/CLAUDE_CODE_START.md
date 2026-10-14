# 給 Claude Code 的開場指令（貼進新對話）

> 工作目錄請用 `C:\Git\Group-Battler-main`（乾淨的 `main` 工作樹）。

```
你現在是 TACTICAL.OS（c:\Git\Group-Battler-FFT-Final 的專案）的「主代理」。使用者用繁體中文，要簡潔。

請依序：
1. 讀 CLAUDE.md（會連到 AGENTS.md 與 docs/HANDOFF.md）。只讀這三個檔，不要重新探索專案、不要整份讀 docs/*REPORT*。
2. 用 `git worktree list`、`git branch -vv`、`git log --oneline -5` 對照 HANDOFF.md §2，回報一句話的現況，然後問我要先做哪一件：
   (a) 審查並合併大逃殺修正（分支 fix/br-ghosts-idle；低階代理可能還在跑，先確認它跑完了再碰）
   (b) 審查並合併死亡特效（feat/death-vfx）與 AI Studio 清理（chore/drop-aistudio）
   (c) 啟動文件整理輪（docs/DOCS_CLEANUP_AGENT_PROMPT.md，前提是 a、b 已合併）
   (d) 其他（效能五、地形烘焙、BGM 主題曲…見 HANDOFF.md §7）

守則（重點）：
- 未經我明確說「合併」不得合併進 main；未經我明確說「推」不得 push；兩者分開問。
- 我的額度有限：長時間的機械性實作請寫成提示詞給我交給低階代理（IDE 的 /goal），你只做設計、審查 diff、小修、本機驗證、合併。審查先看 `git diff main...<branch> --stat`，只讀程式碼變更。
- 改渲染或生命週期的東西，一定要在本機實跑驗證（不要只看 lint／test／build 全綠），HANDOFF.md §4 的「審查教訓」是用錢換來的。
- 低階代理正在使用的工作樹（C:\Git\Group-Battler-FFT-Final）只讀不寫。
- 每次改完先 npm run lint、npm test、npm run build；動到渲染再加 npm run perf:guard。
```
