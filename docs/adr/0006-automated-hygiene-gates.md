# 0006 專案衛生改由自動化閘門把關

狀態：採用
日期：2026-10-29

## 背景

專案清理第一階段建立過全庫逐檔人工審計清冊來追蹤未命名數字、死碼、重複雜湊與無入口腳本，但全庫清冊無法在有限對話中讀完，且會隨著後續提交迅速過時。

## 決定

凍結逐檔人工審計清冊，改以自動化閘門在驗證階段強制把關：

- **死碼與未用匯出**：`npm run knip` 維持相對於 `main` 無新增項目。
- **魔法數字與顏色字面值**：`tests/MagicNumberBudget.test.ts` 搭配 `tests/magic-number-budget.json` 與 `tests/color-literal-budget.json` 實施只減不增預算。
- **確定性雜湊集中**：`tests/NoLocalHash.test.ts` 規定 PRNG／雜湊只准存在於 `engine/math/hash.ts` 與 `engine/math/`。
- **工具腳本入口檢查**：`tests/ToolsReferenced.test.ts` 要求入版控的 `tools/` 腳本須有 `package.json`、測試、skill 或文件引用入口；一次性探針寫在被 gitignore 的 `tools/ui-e2e/out/`。
- **文件與白皮書同步**：`tests/WhitepaperDrift.test.ts` 與 `tests/DocDrift.test.ts`。

## 放棄的做法

- 持續維護逐檔人工審計清冊並靠人手覆核衛生規則。

## 後果

- OPT-01 結案時全庫未命名數字由 1,231 降至 115、顏色字面值由 135 降至 49、刪除 49 支無入口腳本且 `knip` 歸零，任何新增回歸皆會在 `npm test` 或 `npm run knip` 直接失敗。
- 開發者新增常數或保留工具腳本時須同時登錄至對應預算檔或文件入口。

## 證據

- `docs/DECISIONS.md` §5
- `tests/MagicNumberBudget.test.ts`、`tests/magic-number-budget.json`、`tests/color-literal-budget.json`
- `tests/NoLocalHash.test.ts`、`engine/math/hash.ts`、`tests/ToolsReferenced.test.ts`
- `tests/WhitepaperDrift.test.ts`、`tests/DocDrift.test.ts`
- `docs/WORKLOG.md` §2 AH、§2 AI、§2 AJ、§2 AL、§2 AO
