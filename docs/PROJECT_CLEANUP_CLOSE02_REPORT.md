# CLOSE02 報告（主審更正）

原交付 bf79fa2..db3dbf5（7bcfa12 探針、db3dbf5 文件）。本報告撤回原版的錯誤根因與完整結案宣稱，原文可從 db3dbf5 追溯。詳細決策見 PROJECT_CLEANUP_CLOSE02_REVIEW.md。

## 保留與修復

- 保留前後幀截圖、VOID 511–540 軌跡、resolveSortHex 攔截與清冊符號索引。
- 產品 UnitFrame.ts 一直使用 cNew.y；錯的是新探針用 cOld.y。主審只修探針公式，不修改產品。
- 修正 trace 幀號（resolve 發生於 recorder.sort 之前）、anchorMoved 後 released 重設的判定；新增同幀 UnitFrame 腳點／格位置對照，以及預測分支與實際輸出對照。
- 原 TYPO-UNITFRAME-01 產品缺陷撤回。舊 trace 不能作為 deathMotion 截斷、永久鎖格或其他核心修改的授權依據。

## 取證結論

sink 1.89px 的插值／足跡條件可定位，但修改高度下限需驗證跨格連續性，尚未批准。

void 軌跡支持持續下墜，末幀540為 z=-679.91、hp=1360、outOfBounds=false；不能說已觀測至 z<-1000、RING_OUT 或回收。正常落地／慢墜／長期虛空停留反例仍未補齊。

兩個 A-B-A 事件仍能重現：static (507/508/510, moved .03)，moved (563/564/565, moved 46.99)。新資料分存 out/close02-review；舊資料保留但其中分支名稱／幀號不得混用。產品修復與規則設計仍開啟。

## 清冊

保留659列快照與新增的符號／引用索引；行數、export與consumer數不足以證明整檔語義。撤回560檔完整審查宣稱，保留 CLOSE02 原宣稱欄供追查，恢復520待讀、31部分事實、108程式語義不適用資產。runtime 覆蓋沿用此前可證明的強度，不新增推測完成數。

## 驗證

主審重新執行 close02-review-lint/test/build，均 EXIT=0，91 files／780 tests 通過。close02-review-probe EXIT=0，新 trace 與同幀實際 UnitFrame 及分支輸出一致。原基準與閾值未變，本輪沒有產品渲染行為變更，未重跑完整 perf:guard。

負向控制與最終文件檢查結果見下方最終驗證紀錄；原始日誌在 tools/ui-e2e/out/agent-logs/。推送為工作分支保存，不是 main 合併或全庫清理結案。

## 回退與後續

回退使用 git revert 指定 commit；不使用 reset --hard，保留共享工作。使用者授權本輪審查修正後推送，奧義線留明天處理，本輪不啟動。

## 最終驗證紀錄

- close02-review-negative：EXIT=1（預期），缺失 hazard 樣本被擋。
- close02-review-doc：EXIT=0，DocDrift 3 tests 通過。
- git diff --check：通過。原始日誌皆位於 tools/ui-e2e/out/agent-logs/。
