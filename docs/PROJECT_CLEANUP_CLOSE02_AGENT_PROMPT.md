# CLOSE02：完成清冊與 COORD 因果收斂

在現有實作代理輸入 `/goal docs/PROJECT_CLEANUP_CLOSE02_AGENT_PROMPT.md`。

## INV：範圍與流程

沿用 feat/project-cleanup，在主審 AUDIT01 修復已提交後執行。先記錄 HEAD／status；若主審修復仍為未提交變更，不替主代理提交或覆寫，先回報起點不符。保留所有既有 untracked 文件。讀 AGENTS.md、types.ts、相關 constants、AUDIT01_REVIEW、NEXT_PLAN、RenderSpec、VisualMath、UnitFrame、coord-probes 與 cleanup-coord01-check。

本輪只改一般程式檔頭／註解、專用取證工具與清冊／報告。先在報告列精確改檔清單再批次編輯。產品執行邏輯、facade、型別契約、guard、baseline／閾值、AGENTS/CLAUDE/.agents/.codex/.claude/hooks、METHODOLOGY/DECISIONS/WORKLOG 均不得改。受保護檔仍需讀，錯誤列提案。

不 push、merge、rebase；不跑平衡。每工作包一 commit，明列 stage，不 git add .。維持編碼與換行。長命令一律 runner --detach／--wait 到 DONE；同一步失敗兩次記未完成後繼續獨立部分，不交回仍有命令執行的回合。

## A：把尚未讀的工作真正做完

- 以更正後 AUDIT01_INVENTORY 為起點，當前 git tracked 差集另記；原 520 待讀／31 部分事實不能靠檔案清單或自動化搜尋標成完成。按 simulation、presentation、data/UI、tools/tests、config/docs 連續執行，不每個資料夾交回一次。
- 實讀內容與相關呼叫者／動態入口後，逐檔記職責、主要上游下游、檔頭是否符合、具體證據（符號與位置）、處置。文件／JSON／設定的語義需對照現用命令與來源。資產核對來源／載入入口，程式語義不適用不代表可以刪。
- 複用已確認證據要記範圍；不要把全套測試通過當逐檔全面覆蓋。不要造不存在的 StatusSystem.ts、validateSkillDraft。保留「未實跑」與「未讀」的區別。
- 真的過期檔頭一次修好；刪除候選先 git grep 靜態／動態／事件／CLI／資產入口，證據不足保留。可執行死碼刪除本輪出精確計畫，避免擴大至未審的依賴。C01/C03/C04/C05 前批已完成，不用重開。
- 更新 AUDIT01_INVENTORY 與 FINDINGS；新增 CLOSE02_REPORT。若遇實際環境限制，報精確剩餘 path，不偽稱全庫完成。

## B：COORD01，從已可靠的事件到因果

先跑修復後探針，兩個獨立 output：`node tools/ui-e2e/cleanup-coord01-check.mjs --out=close02-run1`／run2；runner 900 秒。`--negative-control` 應 EXIT=1，因缺失 hazard 樣本被擋。成功表示診斷 A-B-A 重現，不表示產品缺陷已證實。

已核實的例：FOREST1001 RED-0002 f337 sink 1.89px；FOREST1002 BLU-0007 f512 z≈0.42、vz≈-614.3；VOID1002 C:RED-0010/H:1,2 f507/508/510 moved .03；VOID1001 C:RED-0002/H:4,0 f563/564/565 moved 46.99。後者不能當靜止案例。

1. 使用同一 render hook 的 UnitFrame、footHex、sortFootY、hexCenterY 快照；必要時測試專用攔截 resolveSortHex 記錄 raw、prev、still、released 與分支前後值，禁止修改產品程式或私自算另一套排序。確認 static 翻轉到底由哪一個條件造成，而不是只看 sortBias 變動。
2. sink 對照起點／終點高度、實際腳下格、過渡進度與畫出的位置，截前後幀確認觀測。現有 Math.max 只處理實際格不同的條件，是否違反既定下降步階語義需明確說明。不要硬套舊 clamp 假設。
3. void 追完整離場到回收流程，對照正常落地、慢墜、真正長期停留虛空。提出具狀態／時間證據的診斷改法，不能以 vz<-50 把問題濾掉。
4. 每個根因提案列 P/D、唯一寫入者、精確檔案／函式、前後行為與反例測試。永久鎖死屍體 sortHex 不獲授權，需保留後續移動／擊飛／地形改變的正確反應。未知就寫未知，不把候選方案交給下一代理當已批准設計。

## 驗證與交付

有程式修改的工作包完成後跑 lint120／test300／build180；只改文件不重跑全部。取證工具要有有效正向與預期非零負向控制；原座標 guard 與所有門檻保持不變。最終 diff --check、DocDrift 通過。

報告提供逐檔完成／剩餘計數、每項新問題及證據、每包 commit／回退、驗證日誌、能讓主代理直接批准的 D3 修復設計。整批交付一次，不把已完成枚舉重複交付成「全庫已讀」。
