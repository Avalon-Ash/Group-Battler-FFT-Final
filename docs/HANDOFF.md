# 交接：還沒做的事（TBD）

> 更新：2026-10-20。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。

## 2. 排定（使用者 2026-10-19 核可）
1. **個別奧義美術翻新**（還沒設計）：50 個奧義的序列與零件細調（`docs/VFX_PIPELINE_MAP.md` §4.16）。渲染工作，單獨一條。順帶：平衡輪縮短詠唱後，隕石類 `rr_u2`（落地約晚 0.2 s）、`tr_u1`（約晚 0.26 s，改前就晚 0.16 s）的隕石比傷害晚到，調 `data/vfx/ult_visuals.ts` 的 `height`／`timing` 讓 `hitAt ≤ cast`。

## 3. 待使用者確認
- **合約分層（`claude/funny-cori-xqw4jq`，WORKLOG §R）待審查**：`git fetch origin claude/funny-cori-xqw4jq` 後看 diff；本機 Windows 確認 hook 在 PowerShell 下正常（push／main 上 merge 會跳確認）、`node tools/ui-e2e/runtime-smoke.mjs` 用 msedge 能跑。同意再合併。
- **平衡輪實機看**（`docs/BALANCE_REPORT.md`）：模擬勝率 50.0%，實機節奏與手感（紅方普攻射程加長、`rr_u4` 血腥獵殺詠唱 0.3 s／威力 1800）是否 OK。
- **技能新效果實機看**：稜鏡反射／尖刺防禦的「反傷」浮字、疾風祝禱與嗜血狂熱的加速、猩紅血月與惡魔降臨的吸血、神聖干涉的無敵（WORKLOG §Q）。
- **導播狂抖＋掉幀**：掉幀已修（`f5e33f0`，WORKLOG §Q）。導播目標每幀跳動被鏡頭跟隨剛性（預設 0.25，約 4 秒時間常數）濾掉，不是肉眼的抖動來源；戰鬥結束附近剩下的是擊退／墜落的 `CAMERA_SHAKE`（0.55，約 70 ms 衰減）。**待使用者實機確認**是否還覺得抖。
- **單一格閃爍：重現不出來**（10/19 查）。暫停戰鬥＋全員強制變羊，攔 `RenderList.sort` 約 900 幀：單位 sortKey 與鄰格地塊前後關係 0 變化（不變羊對照也是 0）；連拍像素只有鏡頭平移與光束動畫。`verify:coords --flicker` 的振盪全是移動中（屍體擊飛滑行跨格），靜止 0 件。探針 `tools/ui-e2e/out/_scratch_poly_flicker.mjs`。**請使用者下次看到時錄影或截圖，記下地圖與當時發生的事**（同一格整塊一閃、還是單位一閃）。


## 4. 以後再說
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
