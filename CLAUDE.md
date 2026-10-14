# CLAUDE.md

本專案的治理規則與交接資訊請先讀（Claude Code 會自動載入下列檔案）：

@AGENTS.md
@docs/HANDOFF.md

補充：
- 使用者使用繁體中文，回覆要簡潔。
- 工作樹分工與合併順序、進行中的分支都寫在 `docs/HANDOFF.md` §2；**未經使用者明確指示不得合併 `main` 或 push**（兩者分開詢問）。
- 長時間、機械性的實作交給低階 IDE 代理（提示詞在 `docs/*_AGENT_PROMPT.md`），你負責設計、審查、驗證與合併，以節省使用者額度。
