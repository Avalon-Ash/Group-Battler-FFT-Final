# 交接：還沒做的事（TBD）

> 更新：2026-10-21。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。下一輪：Gemini 近戰攻擊與受擊特效（`feat/melee-fx`，提示詞 `docs/MELEE_FX_AGENT_PROMPT.md`）；**跑的期間主代理對原生資料夾只讀不寫、不跑 e2e／perf**。push 狀態以 `git status -sb` 為準。

## 2. 排定（使用者 2026-10-21 核可，依序；1、2 都是渲染工作，一次一條）
1. **近戰特效（MF）**：8 招近戰普攻沒有揮擊、其餘是攻擊者到目標的直線光束；7 招近戰主動技沿用普攻命中包。只改特效資料，硬性驗收是新的 MeleeFxSpec 規格測試 0 違規。使用者執行 `/goal docs/MELEE_FX_AGENT_PROMPT.md`。
2. **位移技能軌跡**：衝刺現在是 `teleportTo`（`SkillExecutor.ts` DASH 區段）＋物理偏移彈回，看起來像瞬移、有時像 bug；要有軌跡與速度曲線，攻擊者近戰前衝也在這輪。動到位置，須對照 RenderSpec。
3. **行為樹優化**：先錄戰鬥分析不自然的行為，再改；改完要重跑平衡模擬（`npm run balance:sim`），勝率維持 45～55%。

## 3. 待使用者確認
- **奧義有感實機看**（`docs/ULT_FEEL_REPORT.md`，VFX_PIPELINE_MAP §4.21）：命中光爆是否刺眼（詠唱暗場已依使用者回饋移除）；`mb_u1` 黑洞、`rr_u2` 核彈依舊版構圖做回（紫黑旋轉吸積盤＋黑核；火球＋大衝擊環＋蘑菇煙＋高飛碎石，預覽 `node tools/vfx/ult-sheet.mjs --feel --ids=mb_u1,rr_u2 --times=0.05,0.35,0.7,1.1`）；`sr_u4` 血月、`sr_u5` 鬼火、`wb_u5` 斬痕新造型；`rr_u3` 加速、`rb_u5` 三連節奏。另：火屬性奧義生成的火焰危害區範圍＝`aoeRadius`，`rr_u3`（8 圈）命中後整片火海，是玩法不是特效，要調得改技能資料。看完刪 `docs/ULT_FEEL_REPORT.md`。
- **勝利音樂實機聽**（`9b22842`）：紅方贏只有紅方勝利曲（不再先響藍方號角）；結算曲播放中換場會淡回氛圍曲、不混音。
- **背景實機看**：5 張地圖背景應與以前相同（星星大小、亮度略不同）；高 DPI 螢幕上背景應更清晰。
- **平衡輪實機看**（`docs/BALANCE_REPORT.md`）：模擬勝率 50.0%，實機節奏與手感（紅方普攻射程加長、`rr_u4` 血腥獵殺詠唱 0.3 s／威力 1800）是否 OK。
- **技能新效果實機看**：稜鏡反射／尖刺防禦的「反傷」浮字、疾風祝禱與嗜血狂熱的加速、猩紅血月與惡魔降臨的吸血、神聖干涉的無敵（WORKLOG §Q）。
- **導播狂抖＋掉幀**：掉幀已修（`f5e33f0`，WORKLOG §Q）。導播目標每幀跳動被鏡頭跟隨剛性（預設 0.25，約 4 秒時間常數）濾掉，不是肉眼的抖動來源；戰鬥結束附近剩下的是擊退／墜落的 `CAMERA_SHAKE`（0.55，約 70 ms 衰減）。**待使用者實機確認**是否還覺得抖。
- **單一格閃爍：重現不出來**（10/19 查）。暫停戰鬥＋全員強制變羊，攔 `RenderList.sort` 約 900 幀：單位 sortKey 與鄰格地塊前後關係 0 變化（不變羊對照也是 0）；連拍像素只有鏡頭平移與光束動畫。`verify:coords --flicker` 的振盪全是移動中（屍體擊飛滑行跨格），靜止 0 件。探針 `tools/ui-e2e/out/_scratch_poly_flicker.mjs`。**請使用者下次看到時錄影或截圖，記下地圖與當時發生的事**（同一格整塊一閃、還是單位一閃）。


## 4. 以後再說
- 3 個 C1 違規（`tr_u3`／`wb_u5`／`wr_u3` 詠唱 0.2 s 小於奧義命中前置 0.3 s，特效晚約 0.1 s）：下次平衡輪把 cast 調到 0.3 即可清（`tests/ult-spec.baseline.json`）。
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
