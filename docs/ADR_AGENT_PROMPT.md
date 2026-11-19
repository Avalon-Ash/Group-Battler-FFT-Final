# 執行指令：拆出架構決策紀錄（ADR）

> 派工：主代理用 agy 派 Orchestrator（Neon 規劃、Hydrogen 執行），強度 high。使用者 2026-11-19 同意這輪改 `docs/DECISIONS.md`。
> 背景：`docs/DECISIONS.md` 已經是決策紀錄，但沒有編號（全 repo 約 141 處用「DECISIONS §4」「DECISIONS「UI」」引用）、被推翻時直接改原文（看不出現行版與推翻鏈）、架構決策和口味決定混在同一層。主代理已寫好紅色驗收 `tests/AdrIndex.test.ts`（commit 73dbccd9）。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_adr`（分支 `docs/adr`，主代理已建好）。

### 目標與成品
把 `docs/DECISIONS.md` 裡**架構級**的決策拆成一決策一檔的 ADR，`DECISIONS.md` 改成索引，讓 `npx vitest run tests/AdrIndex.test.ts` 全綠。成品：
1. `docs/adr/README.md`：ADR 是什麼、什麼時候要寫（寫進開案書「契約」的決策、推翻既有決策時一定寫；口味與小取捨照舊在 `DECISIONS.md` 寫一行）、編號規則、推翻時不改原檔而是新開一份並互相標註、範本（照下面「格式」）。
2. `docs/adr/0001-<英文小寫連字號>.md` 起，至少 10 份，編號連續。
3. 改寫後的 `docs/DECISIONS.md`。
4. 報告 `docs/ADR_REPORT.md`。

### 格式（`tests/AdrIndex.test.ts` 會檢查）
```markdown
# 0007 回放以開戰快照＋種子＋指令為單位

狀態：採用
日期：2026-11-17
取代：0003        ← 只有取代別份時才寫這行

## 背景
## 決定
## 放棄的做法
## 後果
## 證據
```
- 狀態只有三種寫法：`狀態：採用`、`狀態：提議`、`狀態：已取代（由 NNNN）`。被取代的那份要寫 `已取代（由 新編號）`，新的那份要寫 `取代：舊編號`，兩邊要一致。
- 「證據」列出處：`WORKLOG §2 BW`、`tests/CommandQueue.test.ts`、`docs/plans/optimization-2026-11.md` 的某節、commit SHA。只寫 repo 裡真的存在的路徑（`tests/DocDrift.test.ts` 會檢查文件裡的路徑都存在）。
- 每份 20～50 行，繁體中文，只寫事實與理由，不寫效果形容詞。

### 挑哪些拆成 ADR
從 `docs/DECISIONS.md` 挑會限制之後程式怎麼寫的決策。候選（自己判斷取捨、合併或拆開，理由寫進報告）：狀態欄位唯一寫入者；座標協議與渲染工作一次一條；禁 Three／Pixi／WebGL 與特效預烘焙零件；文件防過時；合約分層（skill／hook／測試）；專案衛生改由自動化閘門；「畫面沒變」用同環境 A/B；AI 狀態拓樸＋每狀態一棵小樹；技能是動作清單加狀態機、`Agent` 不拆元件；UI 純投影與依賴邊界；遊戲指令在 tick 開頭套用；固定步長與倍率；回放以快照＋種子＋指令為單位；undo 用重跑；畫面插值只在 `UnitFrameStore.build`；對局流程在引擎端；玩家操控＝換模式圖與指令三個落點；架構契約先行；用現成元件庫。
- 原文裡寫著「曾改成 X，後來改回 Y」的（例如背水一戰），如果拆成 ADR，就拆成先後兩份並用取代鏈連起來，不要擠在同一份。只在原文有寫的範圍內這樣做。
- 內容只能來自 `docs/DECISIONS.md`、`docs/plans/optimization-2026-11.md`、`docs/WORKLOG.md` 與既有設計文件；查不到的欄位（例如放棄的做法）寫「原紀錄沒有寫」，不要自己編。

### `docs/DECISIONS.md` 改成索引
- 保留現有章節標題與順序：`## 1.`、`## 2.`、`## 3.`、`## 4.`、`## 5.`、`## AI 與大逃殺`、`## UI`（其他檔案用「DECISIONS §4」「DECISIONS.md「UI」」引用它們；「機動技落點」這幾個字也要留在檔內）。
- 拆走的條目原位置改成一行：一句話摘要＋連結 `adr/NNNN-xxx.md`。沒拆走的條目（產品範圍、素材授權、口味決定）原文保留。
- 檔頭補一句：架構級決策在 `docs/adr/`，本檔是索引與小決定。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`、`docs/DECISIONS.md`（全部）、`tests/AdrIndex.test.ts`、`tests/DocDrift.test.ts` 的前 40 行。要查證據時才讀 `docs/WORKLOG.md` 的對應節（用搜尋，不整份讀）與 `docs/plans/optimization-2026-11.md`。
- **讀檔一律用內建檔案工具，不用終端機指令。**
- **只能跑這些指令**，每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接；清單外的指令會被拒，而且會讓整個執行結束：
  `git status`、`git diff --stat`、`git rev-parse HEAD`、`npx vitest run tests/AdrIndex.test.ts`、`npx vitest run tests/DocDrift.test.ts`、`npm run lint`、`npm test`
- 開工先跑一次 `npx vitest run tests/AdrIndex.test.ts`，記下失敗項目。
- 不要 commit、不准 push、不建或切分支。中途不要詢問，遇到停下條件就寫報告後結束。
- 派工單固定三條：只結束自己啟動的行程；不為了過檢查改造形或改驗收；不新增耦合（同一個決定只寫在一份 ADR，`DECISIONS.md` 只放摘要與連結，不複製全文）。

### 守則與停下條件（INV）
- **只能改或新增**：`docs/adr/**`、`docs/DECISIONS.md`、`docs/ADR_REPORT.md`。其他全部受保護，特別是 `tests/**`、`AGENTS.md`、`CLAUDE.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/WORKLOG.md`、`docs/plans/**`、`.claude/**`、`tools/**`。不要去改其他檔案裡的「DECISIONS §4」這類引用。
- 驗證不准動；同一個驗收失敗兩次（各帶新的假設）就停下回報。
- 結束前必須 `npx vitest run tests/AdrIndex.test.ts`、`npx vitest run tests/DocDrift.test.ts`、`npm test` 都通過；`npm run lint` 照跑記錄。

### 報告 `docs/ADR_REPORT.md`
ADR 清單（編號、標題、狀態、來源是 DECISIONS 的哪一條）；沒拆的條目與理由；查不到而寫「原紀錄沒有寫」的欄位清單；每個指令的「指令＋退出碼」；回退方式。每個驗收項目標驗證級別（實跑／靜態）。不寫效果形容詞。
