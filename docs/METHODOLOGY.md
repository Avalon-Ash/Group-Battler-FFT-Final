# 工作方法論（主代理每次都讀）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。怎麼工作、怎麼審查、怎麼量測、環境陷阱。決策與理由在 `docs/DECISIONS.md`，完成紀錄在 `docs/WORKLOG.md`，待辦只在 `docs/HANDOFF.md`。

## 1. 省點數守則（使用者額度有限，最重要）
- 使用者之前在 Antigravity 花了很多點數（含一次在 AI Studio 燒掉 400 元卻交出壞掉的畫面）。**Claude Code 的主代理請把工作壓到最小**。
- **分工**：長時間、機械性、無人值守的實作交給低階代理（Gemini 3.8 Flash：主代理用 agy 直接派，見 `agent-prompt` skill；不順利才改 IDE `/goal`）；主代理只做 ① 設計／寫提示詞 ② 審查 diff ③ 小修 ④ 本機驗證 ⑤ 合併。
- **審查要便宜**：先 `git diff main...<branch> --stat`，只讀**程式碼**變更（`engine/`、`components/`、`data/`、`constants/`）；**不要整份讀 `docs/*REPORT*`**（代理報告常誇大，只看數字表與回退指南）；用 `grep`／`Select-String` 抓關鍵字；每次只讀一小段。
- **不要重複量測**；少截圖；回覆精簡；一次對話做完一輪就收。
- Claude Code 內用 `/compact` 壓縮上下文；`HANDOFF.md`（待辦）＋本檔＋`AGENTS.md` 足以在新對話重建上下文，需要歷史時才搜 `WORKLOG.md`、`DECISIONS.md`。
- **常駐文字與快取**：`CLAUDE.md`＋本檔＋`HANDOFF.md` 每一輪都重新計費（多半是快取重讀），只放每次都適用的規則；有觸發情境的寫成 skill，偶爾才查的放 `docs/PROJECT_MAP.md`。快取比對請求開頭（工具→系統提示→對話），所以合約、`.claude/settings*.json`、deny 清單在工作階段中途改，**下一個工作階段才生效**；改完別緊接 `--continue` 舊對話（會整段重寫快取），留到收尾再改。

## 2. 專案與紀律
- **專案**：TACTICAL.OS（Vite + React 19 + TS + HTML5 Canvas 2.5D 等距六角戰棋）。遠端 `https://github.com/Avalon-Ash/Group-Battler-FFT-Final.git`（目前只有 `main`）。
- **治理規則全在 `AGENTS.md`**：`Agent` 純資料（不加方法）、SSOT 在 `types.ts`／`constants/*.ts`／`data/**`、禁 `as any`、禁魔術數字／硬編碼顏色、tick／渲染迴圈禁 `console.log`、單次改動 ≤3 檔（超過先說明策略）、改完 `npm run lint`／`npm test`／`npm run build`，渲染變更再加 `npm run perf:guard`、禁 Three/Pixi/WebGL、素材 URL 用 `import.meta.env.BASE_URL`、子系統只透過 `engine.bus`、UI 只經 `UICommand` 寫入引擎。
- **鐵律**：**未經使用者明確指示不得合併進 `main`、不得 push**（合併與 push 要分開問）。低階代理在某個工作樹跑的時候，不碰那個工作樹、不跑 e2e／perf／Blender 等重工作。
- **使用者**：繁體中文；要簡潔、GitHub markdown；能自己做的（量測、安裝）就自己做；不確定就問。
- **使用者機器**：Windows、RTX 4070、Ryzen 7800X3D；量測細節見 `docs/PROJECT_MAP.md` §2。
- **環境陷阱**：見 §6 環境事實。

## 3. 一輪工作的流程
- 程序放在按需載入的 skill（`.claude/skills/`），不放常駐文字：開新一輪與寫提示詞 → `agent-prompt`；審查、收尾、合約效果紀錄 → `review-round`；渲染實跑 → `render-verify`；重錄基準 → `rebaseline-fidelity`。
- 本地 tag（`perf*-ckpt-*`、`ui-ckpt-*`、`audio-ckpt-*`、`art-ckpt-*`、`br-fix-final`、`docs-cleanup-final`）未推，可忽略。

## 4. 審查教訓
  1. **AI Studio 容器看不到實際畫面、跑不了 Playwright**——它宣稱「全綠」不代表畫面正常。凡改渲染／生命週期，**必須本機實跑驗證**（最小：`createServer`＋`playwright-core`＋`msedge` 開頁、讀 `window.__TACTICAL_ENGINE__`、必要時截一張圖）。
  2. React StrictMode 下，元件清理**不可立即 `destroy()` 仍會被重用的物件**。
  3. 一個狀態欄位**只能有一個寫入者**（`deathTimer` 的教訓）。
  4. 刪除「舊管線」前先 `git grep` 證明零引用；新管線常仍依賴舊檔案的一部分。
  5. 排序（depth sort）鍵必須包含繪製時才套用的位移。
  6. 代理在缺乏證據時會加「安全網」掩蓋症狀（大逃殺的發呆看門狗）。B0 證據為 0 的修正一律拿掉，只保留對應到根因的改動。
  7. 代理會改到舊版的交接文件而造成衝突；任務合約要列出「受保護檔案」，`HANDOFF.md`／`METHODOLOGY.md`／`DECISIONS.md`／`WORKLOG.md`／合約檔由主代理親自維護。
  8. 只寫在提示詞文字裡的停下條件（「數值變差就停」）→ 代理照樣做完並回報「無遺留」；要它停，就把條件做成會讓指令失敗的檢查（測試、腳本退出碼），審查時自己重量關鍵數字。依據：背景輪 BG3／BG4 保真變差、bg-probe 變 2～4 倍都沒停（WORKLOG §R）。

## 5. 專案地圖
移到 `docs/PROJECT_MAP.md`（各系統位置、量測工具、暫存區、美術風格），要定位時才讀。

## 6. 環境事實（指令在這台機器上怎麼寫才會成功）
借自 TokenEconomizer 的 micro-skills：重複發現同一個環境事實是固定浪費，記一次、每輪常駐；但要有門檻，免得清單變成雜訊。
- **收錄**：同一個環境錯誤（指令寫法、編碼、路徑、工具行為）出現 2 次以上，或一次就造成損失。寫成「在這裡可行的做法」，一行，結尾附 `（確認 YYYY-MM-DD）`。
- **上限 12 條**：滿了就刪最久沒再碰到的。hook 能強制的寫進 hook，這裡只留一句說明。
- **退場**：被推翻（工具升級後不再發生、做法失效）就刪，不留「舊說法」。
- **只收事實，不收結論**：不得寫「可略過／不必跑某檢查」「某事已完成」這類話，那會變成跳過驗證的藉口。`tests/HarnessContract.test.ts` 會檢查條數、日期與禁用詞。
- 收尾時（`review-round`）看這一輪有沒有重複踩到的環境錯誤，有就補一條。
- **歸屬**：跟這台 Windows 機器有關、與專案無關的事實（PowerShell 寫法、編碼、`git push` 輸出、CLI 路徑）寫在全域憲法 `~/.claude/CLAUDE.md` 的環境事實，這裡只收本專案的。雲端工作階段是 Linux，用不到機器事實。

<!-- env-facts:start -->
- 多數既有原始檔是 CRLF，編輯時保持原行尾；新檔寫 LF。（確認 2026-10-19）
- 工作樹的 `node_modules` 是指向主資料夾的 junction：工作樹內不跑 npm 安裝；移除工作樹先 `cmd /c rmdir <工作樹>\node_modules` 再不加 `--force` 移除（hook 會擋）。（確認 2026-10-29）
- `AgentRunner` 時序測試是 Windows 專用，高負載下會偶發失敗；CI 在 Linux 上排除它。（確認 2026-10-29）
<!-- env-facts:end -->

## 7. 在 Claude Code 使用的注意
- Claude Code 會自動讀根目錄 `CLAUDE.md`（主代理專用的精簡版，會載入 `HANDOFF.md` 與本檔；`AGENTS.md` 為審查時才讀的檢查清單）。子代理定義在 `.claude/agents/`（explorer／worker／reviewer，模型與強度寫在 frontmatter）。內建子代理不會讀 `CLAUDE.md`。
- 使用者把這些指令檔統稱「合約」：主代理合約 `CLAUDE.md`、實作代理合約 `AGENTS.md` 與 `docs/*_AGENT_PROMPT.md`、子代理合約 `.claude/agents/*.md`、程序 `.claude/skills/*/SKILL.md`、強制規則 `tools/hooks/agent-guardrails.mjs`。
- 推理強度上限 high；工作階段不能自己切換強度，需要時停下請使用者在 App 切。
- 本機指令用 PowerShell 或 Git Bash；長時間指令以背景方式執行並等待完成，**不要輪詢**。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
