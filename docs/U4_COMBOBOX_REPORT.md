# U4 Combobox 實作報告

## 基本事實

- 分支：`feat/u4-combobox`
- Base / HEAD：`9f1cdd64a1972f501fb2ca205e2e7745109bb6bf`（未 commit、未 push）
- `components/ui/primitives/Combobox.tsx` 行數：146 行（低於約 150 行停下門檻，未引入 `cmdk` 或任何新依賴）
- 受保護檔案變更數：0（`tools/ui-e2e/**`、`tests/**`、`Select.tsx` 等均未修改）

## 改動清單（檔案:行號）

1. `components/ui/primitives/Combobox.tsx`（新增，L1–L146）
   - L6、L12–L15：沿用 `Select.tsx` 的 `SelectOption`、`SelectProps`，未重複定義選項與群組型別；對外維持 `''` 表示未選。
   - L8–L10：具名常數 `SIDE_OFFSET_PX = 4`、`DEFAULT_SEARCH_PLACEHOLDER`、`DEFAULT_EMPTY_TEXT`。
   - L17–L33：`labelText` 提取 `ReactNode` 可搜尋文字；`stepEnabled` 計算上／下／首／尾可用項目索引並跳過 `disabled`。
   - L48–L63：依 `query`（去頭尾空白、不分大小寫）過濾 `options` 與 `groups`（過濾後空群組不渲染）；以 `safeActive` 避免父層重繪覆蓋鍵盤焦點位置；組合觸發鈕 `aria-label`（`${ariaLabel}: ${triggerText}`）以符合 WCAG 2.5.3 `label-content-name-mismatch`。
   - L66–L84：開關重置 `query`；鍵盤處理 `ArrowDown`、`ArrowUp`、`Home`、`End`、`Enter`（忽略 `isComposing`）；`Escape` 與外部點擊由 Radix `Popover` 的 `DismissableLayer` 關閉並歸還焦點至觸發鈕。
   - L86–L145：以 `radix-ui` 的 `Popover` 實作浮層，套用 `shell shell-popover mat-blur ui-select-content rounded-ui-card`、`zIndex: UI_Z.POPOVER`（210）、`minWidth: var(--radix-popover-trigger-width)`、`maxHeight: var(--radix-popover-content-available-height)`；輸入框設 `role="combobox"`、`aria-expanded`、`aria-controls`、`aria-autocomplete="list"`、`aria-activedescendant`、`aria-label`；清單設 `role="listbox"`、`aria-label`，群組設 `role="group"`＋`aria-labelledby`，選項設 `role="option"`＋`.ui-option`；無符合項目時 `role="listbox"` 內有 0 個 `option`，空結果文字渲染在 listbox 外部兄弟節點（L141）。
2. `components/ui/primitives/index.ts`（修改，L9）
   - L9：新增 `export { Combobox } from './Combobox';`。
3. `components/ui/primitives/Gallery.tsx`（修改，L6、L59、L94）
   - L6：從 `./index` 匯入 `Combobox`。
   - L59：新增狀態 `comboPick`，初始值 `'guard'`。
   - L94：加入 `<Combobox data-testid="gallery-combobox" ariaLabel="職業搜尋" value={comboPick} onValueChange={setComboPick} groups={SELECT_GROUPS} className="w-48" />`。
4. `components/inspector/tabs/UnitStatusTab.tsx`（修改，L6、L34–L42）
   - L6：將匯入的 `Select` 換成 `Combobox`。
   - L34–L42：將技能槽下拉元件由 `Select` 換成 `Combobox`，維持相同 props（`ariaLabel`、`size="sm"`、`className="w-full"`、`value={slot.skillId ?? ''}`、`onValueChange`、`options={[{ value: '', label: SKILL_UNASSIGNED_LABEL }]}`、`groups={slot.groups}`）。

## 未虛擬化判斷理由

- 查詢 `data/skills/blue_*.ts` 與 `data/skills/red_*.ts` 後，每個技能槽（依 `tag` 分類，另加 1 個「未配置技能」）的選項總數：`BASIC` 51、`ACTIVE` 51、`ULT` 51、`MOBILITY` 21；樣張頁 `SELECT_GROUPS` 為 16。
- 所有實際資料集皆低於約 100 項，未引入 `@tanstack/react-virtual`，同時保留原生 `role="group"` DOM 巢狀結構且維持 `Combobox.tsx` 於 146 行內。

## 開工與結束 E2E 結果對照

| 時點 | 指令 | 退出碼 | FAIL 數 | 結果摘要 |
| :--- | :--- | :---: | :---: | :--- |
| 開工前 | `node tools/ui-e2e/ui-gallery.e2e.mjs` | 1 | 2 | `FAIL present: gallery-combobox`；`FAIL fatal: locator.textContent: Timeout 8000ms exceeded.` |
| 結束後 | `node tools/ui-e2e/ui-gallery.e2e.mjs` | 0 | 0 | `ALL PASS`（含 `gallery-combobox` 全段與開合狀態 axe 檢查） |

## 檢查結果總表

| 指令 | 退出碼 | FAIL 數 | 備註 | 驗證級別 |
| :--- | :---: | :---: | :--- | :--- |
| `npm run lint` | 0 | 0 | `tsc --noEmit` 0 error | 實跑 |
| `npm test` | 0 | 0 | 166 test files / 1580 tests passed（含 `tests/UIAudit.test.ts`） | 實跑 |
| `npm run build` | 0 | 0 | `vite build` 成功；bundle budget：entry 252.5/257.5 kB、initial 375.6/383.2 kB | 實跑 |
| `npm run knip` | 0 | 0 | 無新增未使用檔案、匯出或依賴 | 實跑 |
| `node tools/ui-e2e/ui-gallery.e2e.mjs` | 0 | 0 | `ALL PASS`（combobox 14 項與 axe 全部通過） | 實跑 |
| `npm run e2e:ui` | 0 | 0 | `ALL PASSED`（`style-snapshot: 0 diffs against baseline`，`no console/page errors`） | 實跑 |
| `npm run balance:fingerprint` | 0 | 0 | `TEAMS: 60/60`、`ROYALE: 60/60`、`SQUADS: 60/60 identical` | 實跑 |

## 驗收項目與驗證級別

1. `ui-gallery.e2e.mjs` 全部 PASS（Enter 開啟、`role="combobox"` 取得焦點、`aria-expanded="true"`、`aria-controls` 指向可見 `role="listbox"`、`z >= 210`、未過濾 `role="group" >= 2`、輸入「醫護 1」剩 4 項、方向鍵＋Enter 選取後關閉且焦點回觸發鈕、無結果 0 項、Escape 不改值、開啟時 axe 無嚴重違規）：**實跑**（退出碼 0，0 FAIL）。
2. `npm run lint`、`npm test`、`npm run build`、`npm run knip` 全綠：**實跑**（皆退出碼 0，0 FAIL）。
3. `npm run e2e:ui` 全綠：**實跑**（退出碼 0，0 FAIL）。
4. `npm run balance:fingerprint` 不變：**實跑**（退出碼 0，三模式各 60/60 identical）。
5. `Combobox.tsx` 行數 ≤ 約 150 行（146 行）、不新增依賴、無 `as any`、沿用 `SelectOption`/`SelectGroup`、未修改 `Select.tsx` 與受保護檔案：**靜態**（`read_file`、`git status`、`git diff` 確認）。
6. `UnitStatusTab.tsx` 技能槽以 `Combobox` 取代 `Select` 且保留 `options`/`groups`/空字串約定：**靜態**（`tsc --noEmit` 與程式碼比對；`e2e:ui` 涵蓋 Inspector 視窗開啟與內容渲染，未單獨對技能槽下拉執行點擊搜尋互動測試）。

## 沒做到的事與原因

- 未針對 `UnitStatusTab.tsx` 的技能槽 Combobox 新增互動 e2e 或元件測試：派工單 §3 明定 `tools/ui-e2e/**` 與 `tests/**` 為受保護檔案，不得修改。
- 未執行 `git commit` 或 `git push`：派工單 §0 明定不得 commit、push 或切分支。

## 回退方式

1. 刪除未追蹤檔案：`components/ui/primitives/Combobox.tsx`、`docs/U4_COMBOBOX_REPORT.md`。
2. 還原追蹤檔案：
   `git checkout -- components/ui/primitives/index.ts components/ui/primitives/Gallery.tsx components/inspector/tabs/UnitStatusTab.tsx`
