---
name: codex-dispatch
description: 派工給 Codex（GPT）的呼叫方式、額度、檔位查核與 Codex 端 hook。要呼叫 codex-companion task／review／adversarial-review、codex exec、codex:rescue，或改了 .claude/skills、.claude/agents 要同步 Codex 副本時使用。
---

# Codex 派工

HANDOFF §1 註明 Codex 額度不足時不派，改走 CLAUDE.md 派工表的備援列。

## 檔位（從 CLAUDE.md 派工表移來）
| 工作 | 呼叫 | 模型／強度 |
| :-- | :-- | :-- |
| 定位、範圍明確的摘要 | Codex `task`（只讀） | `gpt-6-luna`／low |
| 大量讀檔、逐檔清冊、機械性轉換 | Codex `task` | `gpt-6-luna`／medium；要跨系統判斷語意才升 Sol |
| 主代理自己發起的長線實作（規格明確） | Codex `task --write`，在獨立工作樹 | `gpt-6.1-sol`／medium |
| 跨模型第二意見（渲染／座標等高風險 diff） | Codex `adversarial-review` | `gpt-6.1-sol`（強度跟 config，見下） |
| 高風險根因（座標、生命週期）或 Sol 卡關 | Codex `task`（只讀） | `gpt-6.1-sol`／high 或 `gpt-6-astra`／low～medium，寫理由＋`[codex-cost-ok]` |

升級看問題難度和手上證據；Codex 額度不足時，長線實作改走 CLAUDE.md 派工表的 Sonnet 備援列。

## 額度
- 用使用者的 ChatGPT Plus 額度，不吃 Claude 額度，但很緊：每 5 小時估計 Astra 5～45 則、Sol 15～160、Luna 350～3,000；生圖約 3～5 倍。
- 生圖只做少量概念稿，不做整套圖集。

## 呼叫
- 背景 Bash 執行 `node "<plugin>/scripts/codex-companion.mjs" task --model … --effort … [--write] --cwd <工作樹> --prompt-file <檔>`。
- **不加 `--background`**：讓 harness 在結束時通知，不輪詢 `status`。
- Codex 會自己讀 `AGENTS.md`；可寫任務的提示詞照 `agent-prompt` skill 的 Codex 版。
- `review` 不收 `--effort`，強度跟 Codex 實際載入的 config：專案 `.codex/config.toml` 的信任只涵蓋主資料夾，外部工作樹可能讀到全域的 high，成本照 high 估。
- 派工後要宣稱用了哪個檔位，先查 `~/.codex/sessions` 的紀錄（模型自報的名稱不可信）。

## hook（`tools/hooks/agent-guardrails.mjs`）
- Claude 端入口檢查：擋下沒寫 `--model`（task 還要 `--effort`）的呼叫，以及沒加 `[codex-cost-ok]` 的 Astra、xhigh、非 Luna 的 high；串接指令裡每個呼叫各自檢查。
- Codex 執行時另由 `.codex/hooks.json` 呼叫同一支腳本的 `--codex` 模式（Bash／spawn_agent／apply_patch；Codex 不支援 `ask`，一律改成 `deny`）。2026-10-25 已實測會擋下工作樹內的 npm 安裝。
- hook 內容改過以後，使用者要在 Codex 用 `/hooks` 重新信任才會生效。

## 合約副本
`.agents/skills`、`.codex/agents` 是 Codex 版的副本：改了 `.claude/skills` 或 `.claude/agents` 之後執行 `node tools/agent/sync-codex-contracts.mjs`；沒同步的話 `tests/HarnessContract.test.ts` 會失敗。
