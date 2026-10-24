# AUDIT01 報告（主審更正）

代理交付範圍：016dc31..c856081，共四個 commit（3845f74、935804c、ead3ed4、c856081）。未合併／推送。原報告可由 c856081 版本追溯；本文件更正其過度結論，非重新宣稱代理已完成全部任務。

## 可保留的產品與測試修改

四個 export 收斂風險 D1；git grep 證明無外部引用，其中 SKILL_TEAM_OPTIONS 實際連檔內也沒有使用，主審再移除這條死宣告，保留 Team enum 驗證。skillEditor 的實際函式為 validateSkillFieldValue／isSkillEditableField，不存在原報告所寫 validateSkillDraft。SequenceTargetBinding.test 清除隨機地圖障礙物以隔離案例；effect_defs 檔頭 13→16 屬 D0。其他產品可執行邏輯未改。

## 清冊更正

CSV 實際 659 列，非 657；原宣稱為 31 已讀、183 不適用、445 未讀。這是特定版本枚舉，不是目前全部 tracked 檔案的即時總數，報告／帳本自身產物另列。

更正後語義狀態：{'未讀（待查）': 520, '不適用': 108, '部分事實已對照（整檔待查）': 31}。

原 194「單元測試覆蓋」與 126「實跑」沒有逐檔 coverage 證據，改為「有批次驗證紀錄；逐檔覆蓋未核實」；另 339 未驗證。保留原宣稱欄位以便追查。文件、JSON、設定重新列待讀，不得以副檔名免查語義；二進位不適用只限程式語義，資產入口／來源仍須核對。沒有新增全面完成數。

## COORD01

已重現診斷事件，不等同根因證實：

- SINK：FOREST1001 f337 RED-0002，delta 1.89px，局部視覺 P2/D3 候選。
- VOID：FOREST1002 f512 BLU-0007，z 約 0.42、vz 約 -614.3；支持高速下墜取樣解釋，但需正常落地／慢墜／永久滯空負向控制，未核准 vz<-50 過濾。
- static episode：VOID1002 C:RED-0010/H:1,2，507/508/510，moved 0.03。
- moved episode：VOID1001 C:RED-0002/H:4,0，563/564/565，moved 46.99。不可混稱兩個靜止案例。

主審修復 probe 的 await、事件 pair/frame、實際派發順序 A-B-A、sortKey／診斷一致性、資源釋放及錯誤退出。探針成功訊息只代表診斷重現。保留原 guard，不放寬閾值。撤回永久鎖格、任意速度門檻與未驗證高度 clamp 的直接實作指令。

## 驗證與回退

代理 test-full.log 780 tests 通過；原報告引用的 v01-guard.log 為 2026-10-24 13:35 UTC 的 V01 舊日誌，應標沿用，非 AUDIT01 新跑。主審新跑結果見本節後續驗證記錄。

回退以 git revert 指定 commit，由新到舊逐項處理並檢查相依；不得用 reset --hard 丟棄共享工作。主審未執行任何回退。

後續順序與 Claude 任務見 PROJECT_CLEANUP_NEXT_PLAN.md；完整清冊仍未完成，不再以小型文件更正單獨發一輪。

## 主審原始驗證記錄

- audit01-review-coord2、coord3：各自獨立啟動，EXIT=0；四事件與原診斷 pair/frame/sortKey 相符。原資料保留，分存 out/audit01-review-run2、run3。
- audit01-review-negative：移除中間幀 hazard 樣本，預期 EXIT=1，理由 missing corpse/hazard/sample。
- 初次 audit01-review-coord 因 favicon 404 被嚴格攔為 EXIT=1；新增與 F02/F03 一致的 harness-only favicon 204 fixture 後通過，沒有忽略其他瀏覽器錯誤。
- audit01-review-doc：DocDrift 3 tests 通過。最後移除死宣告後的工程結果另見 audit01-final-lint/test/build 日誌。
- 本輪未重錄任何基準、未重跑 perf:guard（沒有產品渲染行為變更）；V01 guard 僅列歷史沿用。

最終工程驗證：audit01-final-lint/test/build 均 EXIT=0，91 files／780 tests；git diff --check 通過。
