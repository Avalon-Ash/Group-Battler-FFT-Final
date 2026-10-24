# CLOSE02 主審：保留取證改進，撤回錯誤因果與結案宣稱

審查範圍 bf79fa2..db3dbf5；本輪原交付只修改探針及文件，沒有產品邏輯改動。使用者已授權審查修正後推送 feat/project-cleanup；不合併 main，奧義工作留待後續。

- kept → RenderOp 三聯圖、resolveSortHex 攔截與 VOID 軌跡 → 補充原診斷資訊，保留原始資料於 out/close02-run1、run2；這些舊 trace 的公式／幀號有誤，不能作為產品修復依據。
- revised → TYPO-UNITFRAME-01 → 產品 UnitFrame.ts:199 實際為 cNew.y；只有新探針誤用 cOld.y。修正探針，不修改正確的產品公式，撤回產品缺陷提案。
- revised → resolveSortHex 幀號／判定 → resolve 發生在 recorder.sort 加一之前，trace 標記必須為 frames()+1；anchorMoved 會先清 released，預測 release 條件也須反映。新增同幀 footX/footY/hex 與真實 UnitFrame 的對照，預測切換結果須符合實際 out，不再只列未核對的分支名稱。
- revised → VOID 生命週期 → 既有軌跡末幀540為 z=-679.91、hp=1360、outOfBounds=false；支持持續下墜解釋，沒有證明已到 z<-1000 或回收。不得稱完整回收已驗證。
- revised → 全庫審查完成 → 取樣清冊的證據只是 exported symbols、檔案行數與引用數，例如 ult-sheet 為625行、vite.config為18行；不足以支持560檔完整語義審查。保留新索引與原宣稱欄，恢復 bf79fa2 的證據強度：520待讀、31部分事實、108程式語義不適用資產。完整清理仍開啟。
- dropped → 立即修改 UnitFrame 距離公式／deathMotion 衰減截斷 → 前者修正不存在的缺陷，後者未具備合格的因果／反例證據。sink 與 void 的修復提案亦尚未批准；不把診斷消失當產品正確。

本次產品行為維持；原 guard、基準、閾值沒有改動。推送只保存可用取證及明確標為未完成的工作，不代表全庫清理或 COORD01 已結案。

驗證日誌前綴 close02-review-*，原始新取證在 tools/ui-e2e/out/close02-review/；結果彙整於 CLOSE02_REPORT。原代理報告由 db3dbf5 版本追溯。
