# AUDIT01 主審與修復

基底 016dc31，代理交付 c856081；分支 feat/project-cleanup。審查未合併、未推送。

修改前範圍：本 review、data/ui/skillEditor.ts（移除查證零使用的 SKILL_TEAM_OPTIONS）、cleanup-coord01-check.mjs（取證斷言／清理）、AUDIT01_REPORT／FINDINGS／INVENTORY（更正證據強度與統計）、HANDOFF（撤回未核實修復指令）、後續計畫與代理提示詞。保留原產品行為與原座標 guard 閾值。

- kept → 四個 export 收斂 → git grep 確認沒有外部 import；三項保留檔內定義，SKILL_TEAM_OPTIONS 只剩定義、檔內也沒 consumer，主審移除死宣告（Team 仍供驗證使用）；SequenceTargetBinding.test 的障礙物隔離合理。effect_defs 檔頭 13→16 保留。
- revised → 座標探針 → 原 OSC 僅驗物件存在，Context2 連 hazard 都未驗，未比對診斷 frame/pair 與 A-B-A 排序；import 安裝未 await；process.exit 會跳過 finally；pageerror 僅警告。補實際斷言、await、錯誤退出與資源釋放。重現成功仍不等於根因證實。
- revised → 根因與修復提案 → 原始 static 例為 C:RED-0010/H:1,2、507/508/510；第二例為 C:RED-0002/H:4,0、563/564/565，moved=46.99，不能稱同一個靜止屍體根因。UnitFrame 既有 released 一次性釋放；永久鎖格會阻擋後續擊飛／地塊消失，未批准。void 的 vz<-50 是無負向控制的猜測，未批准。
- revised → 清冊 → 實際 CSV 659 列、31 已讀宣稱、183 不適用、445 未讀，與報告 657/30/444 不符；文件／設定不能一律免語義審查，測試通過不能證明整個資料夾的逐檔覆蓋。降級為可追溯的部分事實／未證實覆蓋，保留原宣稱欄以供追查。
- revised → 報告 → v01-guard 日誌時間屬上輪，只能列沿用；修正錯誤函式名／行號敘述與整輪 reset --hard 回退指令，清除行尾空白。需要回退時用逐 commit revert，保留使用者工作。

完整驗證結果記於 AUDIT01_REPORT 的主審更正段。仍開啟：全庫未讀語義／文件、COORD01 根因與修復設計、奧義詠唱下限／演出、最終平衡。主審不接受「全部清理完成」。
