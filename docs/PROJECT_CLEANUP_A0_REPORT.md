# A0-R2 審查與修復結果

日期：2026-10-24。受審提交：`e05e5cb`。工作分支：`feat/project-cleanup`。

**結論：本輪工具與證據問題已直接修復，通過下列驗證。全專案整理仍未完成；本輪沒有修改遊戲產品程式、技能、基準或依賴。**

## 1. 審查發現與處置

| 問題 | 修復與證據 |
| --- | --- |
| 生成器只看摘要「13 案成功」，未驗證案例與錯誤陣列 | 加入完整案例集合、必要數據、成功／未重現狀態、還原結果、來源雜湊及統計一致性檢查。實測舊版接受只有成功摘要的空資料；修正後拒絕。 |
| 探針仍忽略 console error、清理失敗及未附頂層 error 的 ERROR 案例 | 三者納入失敗判定；錯誤寫入結果，退出非零。setup、console、pageerror 故障注入皆驗證成功。 |
| 施法入口使用 `if (!initiated)`，失敗 enum 仍是非空字串 | 改為檢查 `types.NodeState.RUNNING` 與實際施法槽；強制 FAILURE 的測試得到 ERROR 與非零退出。 |
| 清冊把所有 tests 檔頭自動判合規，部分靜態事實含錯誤消費者與不存在符號 | 移除通用合規判定，未知的引用與檔頭保持待查；刪除錯誤的 ensureAtlasCached／GameEngine.ts 等聲稱，不因測試通過推定整檔合規。 |
| 問題台帳由 17 項縮成 12 項，C02／C03 等編號被改作其他問題 | 從既有追蹤台帳恢復穩定的 17 個 ID，保留文件矛盾、tintStrength、型別匯出等未完成工作；H01/H02 與 C02/C03 不再混用。 |
| FINDINGS 的 F01～F03 結論、傷害與位置為固定文字 | 改由當次量測決定「已觀測／未重現」，具體數字引用案例資料；候選仍是候選，不直接授權刪除。 |
| 驗證日誌在生成器硬編碼 PASS | 實際讀日誌的退出碼、通過標記與摘要，保存來源 SHA-256。缺日誌標 SOURCE_UNAVAILABLE；既有 coords 失敗如實保留。 |
| 分類統計漏 hooks／部分隱藏目錄且 types.ts 重複計算 | 所有統計從輸出列集合分組，逐維度驗證總和。母表固定於 e92b635，未追蹤項目另列，忽略空目錄。 |
| SINGLE 的 VFX 記錄未限定來源，沒有保存全部觀測 | 只記該 caster dispatch 內的 VFX 呼叫，保存實際 dispatch 與 VFX 座標；比較起始點及當前錨點，不再聲稱所有特效均在同一點。 |

原先正常執行被完整 console 檢查攔下，確認唯一網路錯誤為 Chromium 自動請求 `/favicon.ico`。探針的 Vite fixture 現在只對這個瀏覽器裝飾請求回應 204；沒有放寬錯誤檢查，其他產品／資產請求仍照常處理並在錯誤時失敗。fixture 記錄於 probe metadata。

## 2. 本輪驗證

| 檢查 | 結果 | 日誌／證據 |
| --- | --- | --- |
| 正常瀏覽器探針 | 13/13 案完成，EXIT=0；errors/pageErrors/consoleErrors 均空 | `tools/ui-e2e/out/agent-logs/review-a0r2-probe-pass.log` |
| setup／console／pageerror 故障注入 | 各自 EXIT=1，13 案 NOT_RUN，沒有成功訊息 | `tools/ui-e2e/out/agent-logs/review-a0r2-faults.log` |
| 非空 FAILURE 施法狀態 | 第一案 ERROR，EXIT=1 | 同上；`tools/ui-e2e/out/review-a0r2/faults/results.json` |
| 13 種無效生成器輸入 | 全部拒絕；既有三份產物 SHA-256 完全不變 | `tools/ui-e2e/out/agent-logs/review-a0r2-guards.log` |
| 合法輸入、母表完整性與分類計數 | 通過；17 個 ID 全數保留，沒有自動檔頭合規列 | `tools/ui-e2e/out/review-a0r2/guards/results.json` |
| lint | 0 errors | `tools/ui-e2e/out/agent-logs/review-a0r2-lint.log` |
| unit tests | 89 檔／707 項通過 | `tools/ui-e2e/out/agent-logs/review-a0r2-test.log` |
| build | 303 modules 成功；既有大 chunk 提示仍在 | `tools/ui-e2e/out/agent-logs/review-a0r2-build.log` |

無效輸入涵蓋：未提供參數、檔案不存在、JSON 破損、只有成功摘要、缺必要案例、案例 ERROR、缺量測、page error、console error、頂層 error、計數矛盾、缺來源與 UI 還原失敗。

本輪未重跑全套 perf／coords／平衡。產品程式未改，歷史 smoke／UI／fidelity 日誌明確標為讀取既有證據；coords 的 EXIT=1 仍是未解決診斷。

## 3. 覆蓋範圍與剩餘問題

母表：`e92b635248fae2c6f42cd53946fe3aa59372d73a`，637 個追蹤檔案。此次產出另列 12 個未追蹤工作項目，共 649 列；未追蹤數會依使用者工作區變動。

| 維度 | 統計 |
| --- | --- |
| 查證狀態 | 9 列已確認所附具體事實；640 列僅列舉／待查。前者也不表示整檔已查完。 |
| 檔頭 | 479 列待查；169 列在檔頭維度不適用；1 列已知需修正（H01）。不適用不代表用途／依賴已查。 |
| 問題台帳 | 17 個穩定 ID：F01～F03、COORD01、H01～H05、C01～C05、T01、K01～K02。 |

F01 的受控死亡後序列繼續派發、F02 的 SINGLE 視效與當前目標錨點差異、F03 的 API/UI 邊界行為仍在當次量測中出現。這輪修復的是觀測與報告工具，沒有修復遊戲行為。

COORD01 保持 P2/D3 的診斷異常，尚未完成畫面判讀。文件／檔頭與廢碼清理仍按原計畫分區實作。C04/C05 尚缺逐符號引用證據，不得直接批次移除 export。

## 4. 可重現指令

以下命令用 AGENTS.md 的 run.mjs --detach／--wait 執行，直到 DONE；每次用獨立 out 目錄以保留舊證據。

```text
node tools/ui-e2e/cleanup-a0-repro.mjs --out-dir tools/ui-e2e/out/review-a0r2/repeat
node tools/ui-e2e/cleanup-a0-repro.mjs --inject-setup-error --out-dir tools/ui-e2e/out/review-a0r2/repeat-setup
node tools/ui-e2e/cleanup-a0-repro.mjs --inject-console-error --out-dir tools/ui-e2e/out/review-a0r2/repeat-console
node tools/ui-e2e/cleanup-a0-repro.mjs --inject-page-error --out-dir tools/ui-e2e/out/review-a0r2/repeat-page
node tools/audit/cleanup-a0-inventory.mjs --probe-json tools/ui-e2e/out/review-a0r2/repeat/repro_results.json --out-dir tools/ui-e2e/out/review-a0r2/repeat-inventory
```

故障注入預期非零；正常探針 EXIT=0 只表示觀測完整，不表示遊戲無 bug。生成器必須明確提供 --probe-json，不會默默沿用本機舊輸出。來源檔 SHA-256、Git HEAD 與工作樹修改狀態皆存入證據，能辨識提交前測試的程式版本。

最小覆寫防護驗證：先正常生成三份檔案，記錄 SHA-256；將輸入改為僅有 `summary: {toolExecutionStatus: "SUCCESS", completedScenarios: 13, notRunScenarios: 0}` 和空 errors 的 JSON，或把合法輸入刪除一個必要 scenario，再執行相同 out-dir。預期 EXIT≠0，三檔 SHA-256 不變。

## 5. 六檔處置與回退

- revised → probe：保留 R2 的 13 情境與來源限定 dispatch 觀測，修復施法判定、錯誤／還原訊號與可追溯來源。
- revised → generator：保留固定母表與輸出介面，移除不可信模板與成功常數，補輸入驗證／真實統計／覆寫保護。
- revised → INVENTORY：撤回無證據的合規描述，未知依賴保持待查。
- revised → FINDINGS：恢復 17 個穩定 ID，保留未完成工作，當次動態結果與歷史事實分開。
- revised → EVIDENCE：保存案例資料、來源雜湊、讀取的日誌摘要與實際分組數；不把歷史測試冒充本輪新跑。
- revised → REPORT：以此報告取代 R2 的過度完成宣告，說明已修與未完成範圍。

所有修復留在 feat/project-cleanup，未合併、未 push。回退可針對本輪修復 commit 做單獨 revert；前一狀態為 e05e5cb，包含本報告列出的已知工具缺陷。
