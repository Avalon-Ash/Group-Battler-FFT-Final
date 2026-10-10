# 夜間執行指令（貼給 IDE 代理）

> 用法：在 IDE 的代理對話中輸入 `/goal`（若有），然後把下面「指令本文」整段貼上。
> 範圍刻意限定在**不需要人類目視確認**的低風險任務；遇到需要使用者決定的點會自動停下。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。請嚴格依照以下文件工作，不得偏離：

1. 先完整閱讀：`AGENTS.md`、`docs/UI_WINDOW_PLAN.md`（特別是 §0 決策、§2 執行守則、§3 架構、§8 停下來問的條件）、`types.ts`、`constants.ts`。
2. **先建立分支**：`git checkout -b feat/ui-window`。**所有工作都在此分支，絕對不要 push、不要動 `main`**（`main` 推送會觸發 GitHub Pages 自動部署，會影響線上版本）。
3. 本次只執行下列任務，**依序**，每個任務完成才做下一個：

   `U0a` → `U1` → `U1b` → `U1c` → `U2` → `E1` → `E2` → `E2b` → `E3` → `E3b` → `E9`

4. 每個任務的流程：
   1. 照 `docs/UI_WINDOW_PLAN.md` §4 該任務列的檔案範圍實作（**≤3 檔**，不得多改）。
   2. 執行 `npm run lint`（0 errors）、`npm test`（全綠）、`npm run build`（成功）。任一失敗 → 修到通過；同一問題嘗試 3 次仍失敗 → 停下，寫進回報。
   3. 在 `docs/UI_WINDOW_PLAN.md` §4.1 進度表把該任務標 ☑，備註寫日期與重點。
   4. `git add -A && git commit -m "<任務代號>: <一句話>"`（一任務一 commit，只在本地分支）。
5. **U0a 特別規則**：CDN 的 `<script src="https://cdn.tailwindcss.com">` 與 `index.html` **完全不要動**（那是 U0b，需要使用者目視比對）。只安裝 `tailwindcss@^3.4`、`postcss`、`autoprefixer` 並建立 `tailwind.config.js`、`postcss.config.js`，並確認 `npm run build` 後 `dist/assets/*.css` 不再包含 `@apply` / `@tailwind`。若這導致建置後視覺與現況不同，仍照做，但在回報裡明確寫出（因為 `index.css` 的 `liquid-*` 會第一次生效）。同時 grep 動態類名（`` `bg-${…}` `` 一類）並處理 safelist，結果寫進回報。
6. **E 系列特別規則**：
   - 允許新增 `engine/systems/ui/**`；`engine/game.ts` 只准加「註冊 UICommandSystem」一行；`engine/renderer.ts` 只准加訂閱 camera 命令。其他引擎檔不得修改。
   - `UICommandSystem` 不得直接呼叫其他 System 的方法；需要時改發事件。
   - 完成 E2 時，在 `AGENTS.md` §1.5 末尾補一句：UI 對引擎的唯一寫入閘門為 `UICommandSystem`（透過 `UI_COMMAND` 事件）。
   - 事件配置使用 `GameEventPool`（注意：新增事件欄位要同步事件池的欄位重設，上一輪曾因此漏掉 `absorbed` 欄位）。
7. 全程遵守：不得 `as any`、不得 `console.log`、顏色/尺寸/時間常數一律進 `constants.ts` 或 `data/ui/**`、檔案換行風格保持與原檔一致（多數為 CRLF，別整檔改成 LF）、保留既有註解。
8. **以下情況立即停止並回報，不要自行決定**：
   - 任務需要超過 3 個檔案，或需要 §2.4 核准清單以外的依賴。
   - 需要修改本次授權範圍以外的引擎檔。
   - 測試/建置反覆失敗。
   - 與 `AGENTS.md` 或計畫文件衝突。
9. **本次不要做**：`U0b`（移除 CDN）、`U3`、`U4` 及之後所有任務、`U6`、`E8`。完成 `E9` 後即停止。
10. 結束時寫一份 `docs/UI_NIGHT_REPORT.md`：逐任務結果（commit hash、驗證輸出摘要）、遇到的問題與決定、尚未完成項、建議使用者起床後先看什麼。**不要 push。**

---

## 起床後使用者要做的事（給人看）

1. `git log feat/ui-window --oneline` 看 commit；讀 `docs/UI_NIGHT_REPORT.md`。
2. 確認 `npm run dev` 畫面沒壞（此階段 CDN 還在，外觀應與現在相同）。
3. 把 `feat/ui-window` 合進 `main` 前先別 push；之後再讓代理做 `U0b`（需要你目視比對）與 `U3`（需要你桌機+手機實測）。
