# 0005 代理合約分層（常駐、Skill、Hook、測試）

狀態：採用
日期：2026-10-20

## 背景

將所有工作流程與檢查細節全部寫進常駐合約，會使每個工作階段載入過多上下文，且實證顯示僅寫在提示詞或文件裡的停下條件與實跑驗證要求容易被實作代理略過。

## 決定

參考 Harness² 的元件成本排序，依觸發頻率與強制力將合約拆為四層：

- **常駐合約**（`CLAUDE.md`、`AGENTS.md`）：只留每次都適用的全域不變式與技能觸發句。
- **程序 Skill**（`.claude/skills/`）：有明確觸發情境的程序移出常駐層（如 `render-verify`、`rebaseline-fidelity`、`agent-prompt`、`review-round`）。
- **執行期 Hook**（`tools/hooks/agent-guardrails.mjs`）：反覆被略過的鐵律改由 hook 攔截或提醒，但不可卡住無人值守長鏈（只對不可逆破壞性 push 跳確認；一般 push／merge 由主代理先在對話詢問；重錄基準改為 PostToolUse 事後提醒取證清單）。
- **靜態合約測試**（`tests/HarnessContract.test.ts`）：以測試檢查 skill 結構、觸發句、子代理模型與 hook 判定邏輯。

## 放棄的做法

- 直接安裝採用 Harness² 框架本身（須綁定 Vertex 與 OpenCode／Codex，同任務多次 rollout 的額度成本高，且評分方式不適用畫面正確性）。
- 平行跑多個 Gemini 候選版本挑最好的一份（違反 `docs/adr/0003-coordinate-protocol-and-serial-render.md`）。
- 在 hook 中對所有一般 push、merge 與重錄基準動作彈出確認而阻斷自動長鏈。

## 後果

- AS 輪瘦身後常駐文件總量由 24.3 KB 降至 21.3 KB（−12%），且無人值守長鏈不被例行工具呼叫打斷。
- 修改 `.claude/skills/`、`.claude/agents/` 或 hook 規則時，須同步維護 `tests/HarnessContract.test.ts` 與 Codex 端副本一致。

## 證據

- `docs/DECISIONS.md` §4
- `AGENTS.md`、`CLAUDE.md`、`tools/hooks/agent-guardrails.mjs`、`tests/HarnessContract.test.ts`
- `docs/WORKLOG.md` §2 R、§2 AS、§2 AT
