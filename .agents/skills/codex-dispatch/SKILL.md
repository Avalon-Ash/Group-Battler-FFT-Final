---
name: codex-dispatch
description: 本專案派工給 Codex（GPT）的專屬規則：額度暫停、hook 檢查、Codex 端 hook 與合約副本同步。要呼叫 codex-companion task／review／adversarial-review、codex exec、codex:rescue，或改了 .claude/skills、.claude/agents 要同步 Codex 副本時使用。
---

# Codex 派工（本專案專屬）

通用的檔位表、額度、呼叫方式在全域 `codex-call` skill（`~/.claude/skills/codex-call`，只在本機；雲端工作階段沒有 Codex）。本檔只放這個 repo 加上的規則，兩份都照做，本檔優先。

## 派不派
- HANDOFF §1 註明 Codex 額度不足時不派：長線實作改走 Gemini 4（主代理用 agy 直接派，`agent-prompt` skill），不行再用 CLAUDE.md 派工表的 Sonnet 備援列。
- 可寫任務的提示詞照 `agent-prompt` skill 的 Codex 版（獨立 clone、`safe.directory`、受保護檔案）。

## hook（`tools/hooks/agent-guardrails.mjs`）
- Claude 端入口檢查：擋下沒寫 `--model`（task 還要 `--effort`）的呼叫，以及沒加 `[codex-cost-ok]` 的 Astra、xhigh、非 Luna 的 high；串接指令裡每個呼叫各自檢查。
- Codex 執行時另由 `.codex/hooks.json` 呼叫同一支腳本的 `--codex` 模式（Bash／spawn_agent／apply_patch；Codex 不支援 `ask`，一律改成 `deny`）。2026-10-25 已實測會擋下工作樹內的 npm 安裝。
- hook 內容改過以後，使用者要在 Codex 用 `/hooks` 重新信任才會生效。

## 合約副本
`.agents/skills`、`.codex/agents` 是 Codex 版的副本：改了 `.claude/skills` 或 `.claude/agents` 之後執行 `node tools/agent/sync-codex-contracts.mjs`；沒同步的話 `tests/HarnessContract.test.ts` 會失敗。子代理的 Codex 檔位寫在該腳本的 `TIERS`。
