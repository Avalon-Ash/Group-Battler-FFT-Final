# 執行指令：技能下拉加搜尋（U4）

> 派工：主代理用 agy 派 `gemini-4-neon-high`（試跑：評估 Neon 能否接手原本給 Sonnet 子代理的實作包）。
> 背景：開案書 `docs/plans/optimization-2026-11.md` §4 U4。Radix Select 沒有搜尋；技能槽的下拉有幾十個技能，要能輸入過濾。主代理已把驗收寫進 `tools/ui-e2e/ui-gallery.e2e.mjs`（commit 61269c21），目前是紅燈。

---

## 指令本文

你是本專案的執行代理，工作資料夾是 `C:\Git\_wt_u4_combobox`（分支 `feat/u4-combobox`，base `61269c21`，主代理已建好）。

### 目標與成品
做一個可搜尋的下拉 `Combobox`（共用元件），放進樣張頁讓驗收通過，再換掉 Inspector 技能槽那個下拉。成品是：
1. `components/ui/primitives/Combobox.tsx`（新檔），從 `components/ui/primitives/index.ts` 匯出。
2. `components/ui/primitives/Gallery.tsx` 加一個 `data-testid="gallery-combobox"` 的樣張，資料用檔內現有的 `SELECT_GROUPS`，初始值 `'guard'`。
3. `components/inspector/tabs/UnitStatusTab.tsx` 的技能槽 `Select`（約第 34 行）換成 `Combobox`，行為不變（同樣的 `options`＋`groups`、空字串代表未指派）。
4. 報告 `docs/U4_COMBOBOX_REPORT.md`。

### 0. 開工前（INV）
- 先讀：`AGENTS.md`（全部）、`components/ui/primitives/Select.tsx`、`components/ui/primitives/Gallery.tsx`、`components/inspector/tabs/UnitStatusTab.tsx`、`tools/ui-e2e/ui-gallery.e2e.mjs`（只讀，看它檢查什麼）。
- **讀檔一律用內建檔案工具，不用終端機指令。**
- **只能跑這些指令**，每個指令單獨一次呼叫，字串照抄，不加 `cd`、不用 `&&` 或 `;` 串接；清單外的指令會被拒，而且會讓整個執行結束：
  `git status`、`git diff`、`git diff --stat`、`git rev-parse HEAD`、`npm run lint`、`npm test`、`npm run build`、`npm run knip`、`node tools/ui-e2e/ui-gallery.e2e.mjs`、`npm run e2e:ui`、`npm run balance:fingerprint`
- 開工先跑一次 `node tools/ui-e2e/ui-gallery.e2e.mjs`，記下哪些 FAIL（預期只有 combobox 相關的）。
- 不要 commit、不准 push、不建或切分支。中途不要詢問，遇到停下條件就寫報告後結束。
- 派工單固定三條：只結束自己啟動的行程；不為了過檢查改造形或改驗收；不新增耦合（同一個判斷不在多處重複）。

### 1. 已查證的事實（DOM）
- `radix-ui` 套件已安裝，`import { Popover } from 'radix-ui'` 可用（`node_modules/radix-ui/dist/index.d.ts:38`）；`Select.tsx` 用同一個套件的 `Select`。
- `SelectOption`／`SelectGroup` 型別在 `Select.tsx`；Combobox 要沿用這兩個型別，不另定一份（不耦合）。空字串值的處理也照 `Select.tsx` 的對外約定（`''` 代表未選）。
- 浮層層級常數 `UI_Z.POPOVER`＝210（`constants/ui.ts:60`）；`Select.tsx` 的浮層樣式 class：`shell shell-popover mat-blur ui-select-content rounded-ui-card`，選項 `ui-option`，觸發鈕 `ctl`。沿用，不寫新的顏色或數字字面值（`AGENTS.md` 禁魔術數字與硬編碼顏色）。
- `@tanstack/react-virtual` 已安裝（`SkillDbTab.tsx` 有用法）；選項少於約 100 個時不必虛擬化，自己判斷，理由寫進報告。

### 2. 驗收（DOM）
- `node tools/ui-e2e/ui-gallery.e2e.mjs` 全部 PASS（含新加的 combobox 那一段：Enter 開啟、輸入框 `role="combobox"` 取得焦點且 `aria-expanded="true"`、`aria-controls` 指向 `role="listbox"`、層級 ≥210、未過濾時有 ≥2 個 `role="group"`、輸入「醫護 1」剩 4 個選項、方向鍵＋Enter 選取後關閉且焦點回到觸發鈕、無結果時 0 個選項、Escape 不改值、開啟時 axe 無嚴重違規）。
- `npm run lint`、`npm test`、`npm run build`、`npm run knip` 全綠；`npm run e2e:ui` 全綠；`npm run balance:fingerprint` 不變（這包不碰引擎）。
- Combobox.tsx 超過約 150 行，或無障礙做不齊：停下，在報告寫明卡在哪，提出改用 `cmdk` 的理由（新增依賴要使用者同意，不要自己裝）。

### 3. 守則與停下條件（INV）
- **受保護檔案（不得修改）**：`tools/ui-e2e/**`（含 `ui-gallery.e2e.mjs`）、`tests/**`、`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`docs/plans/**`、`.claude/**`、`.codex/**`、`tools/hooks/**`、`tools/agent/**`、所有基準檔。
- 驗證不准動：現有測試與驗收腳本不改；不 mock、不 stub、不用空 `catch` 吞錯。同一個驗收失敗兩次（各帶新的假設）就停下回報。
- 不新增依賴、不用 `as any`、不改 `Select.tsx` 的對外行為（其他地方還在用它）。

### 4. 報告 `docs/U4_COMBOBOX_REPORT.md`
只寫事實：每個檔改了什麼（附檔案:行號）、每個檢查的「指令＋退出碼＋FAIL 數」、開工時與結束時的 e2e 結果、Combobox.tsx 行數、沒做到的事與原因、回退方式。每個驗收項目標驗證級別（實跑／靜態／備妥未跑／未驗證）。不寫效果形容詞。
