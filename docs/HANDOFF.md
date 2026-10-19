# 交接：還沒做的事（TBD）

> 更新：2026-10-19。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。
- 視覺路線圖 `docs/VISUAL_ROADMAP.md` §0 已全部完成。

## 2. 進行中／已排定（使用者 2026-10-19 核可）
1. UI 巡檢（桌面＋手機）：找到問題就修。TAB 按鈕閃爍已修，`tools/ui-e2e/ui-remount-audit.mjs` 目前 0 問題；其他畫面待巡。
2. ECS-lite：評估已完成（`docs/ECS_LITE_ASSESSMENT.md`），**待使用者決定要不要跑**。建議只做 S1 狀態效果資料化 → S2＋S3 渲染層搬家＋外觀分組 → S4 常數拆檔；其他欄位拆子物件與完整 ECS 不做。
3. 每張地圖各一首 BGM、紅方勝利曲換暗黑曲：下載前列出來源給使用者確認。

## 3. 待使用者實機確認
- 個別奧義美術翻新：等技能全面修正時一起做。
- 新黑曜柱（岩漿裂縫）與虛空石碑（懸浮晶碑＋符文基座）的實機觀感。
- 縮圈墜落動畫（翻滾＋縮小＋淡出，血條與狀態不再跟著往下掉）。
- 畫質治理器修正後，放著不動是否還會變糊（`?perf` HUD 會顯示 `tier:`，0／1 清晰、2／3 降解析度）。
- （2026-10-19 回報：法陣、障礙物動態、熔岩、草叢、天氣、冰沙亮度、護盾、危害、擊飛、縮圈都 OK；熔岩圖目測順。）

## 4. 以後再說
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 新體型／女性／神職模型：等單位元件拆分完成後再評估；CC0（例如 Quaternius）優先，使用者已授權需要時直接下載；AI 改烘焙圖評估不划算。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
- 狀態所有權 P11／P12：併入 ECS-lite 的 S2／S3。
