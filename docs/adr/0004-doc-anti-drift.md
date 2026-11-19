# 0004 文件防過時：刪除不歸檔與測試把關

狀態：採用
日期：2026-10-20

## 背景

工作樹曾累積 45 份歸檔文件與 22 份已完成輪次的提示詞及報告，代理以關鍵字搜尋時會讀到過時歸檔並當成現況；此外 71 個方框檔頭手寫的上下游清單、呼叫端清單與 tick 順序在重構後頻繁過時。

## 決定

- 過時文件直接刪除、不設歸檔目錄（歷史內容由 git 保存）；刪除前若程式註解曾引用該文件說明設計理由，必須先將理由寫回程式註解或改指對應 commit。
- 程式碼方框檔頭僅保留「職責＋`[ARCH]` 不變式」，不記載可由 import 或搜尋推得的上下游與檔案路徑清單。
- 可檢查的文件規則改寫為測試：由 `tests/DocDrift.test.ts` 掃描文件與註解內的 repo 路徑、Markdown 相對連結與檔頭標題名稱是否皆存在，並配合 `tests/legacyEffectFields.ts` 與 `tests/EffectFieldsRatchet.test.ts` 禁止已移除狀態欄位名出現在文件、註解或程式碼中（`docs/WORKLOG.md` 歷史紀錄不檢查路徑與舊欄位）。

## 放棄的做法

- 將過時文件移入 `docs/archive/` 保存。
- 依賴人工定期巡檢文件與手工維護方框檔頭上下游清單。

## 後果

- 任何檔案搬移、刪除或殘留舊欄位名皆會使 `npm test` 失敗，迫使文件、註解與程式碼同步。
- 已完成輪次的提示詞與一次性報告不再留在工作樹中，查閱須使用 git 歷史；撰寫新文件時必須確保文中引用的路徑皆實際存在。

## 證據

- `docs/DECISIONS.md` §4
- `tests/DocDrift.test.ts`、`tests/legacyEffectFields.ts`、`tests/EffectFieldsRatchet.test.ts`
- `docs/WORKLOG.md` §2 Q（commit `b63f1da`）
