# 交接：還沒做的事（TBD）

> 更新：2026-10-19。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。

## 2. 排定（使用者 2026-10-19 核可）
1. **單一格閃爍**：診斷見 §3（渲染工作，單獨一條）。之後 S4（常數拆檔，可交 Gemini）。
2. **技能全面修正**：使用者 10/19 同意開始規劃（設計由主代理寫，實作交 Gemini）；個別奧義美術翻新併在這裡。
3. **BGM**：主代理從 `docs/BGM_CANDIDATES.md` 挑曲放進 `data/audio/music.ts`（下載前列檔名／來源給使用者同意）。

## 3. 已診斷、待修
- **導播狂抖＋掉幀**：掉幀已修（`f5e33f0`，WORKLOG §Q）。導播目標每幀跳動被鏡頭跟隨剛性（預設 0.25，約 4 秒時間常數）濾掉，不是肉眼的抖動來源；戰鬥結束附近剩下的是擊退／墜落的 `CAMERA_SHAKE`（0.55，約 70 ms 衰減）。**待使用者實機確認**是否還覺得抖。
- **單一格閃爍**：`npm run verify:coords --flicker`（3 種子）抓到靜止屍體的 `sortBias` 在 −2 與 13.2 間逐幀切換（CORPSE×TERRAIN、TERRAIN×UNIT 振盪），格子一下蓋住一下沒蓋住屍體／單位；與 §K 的 `HEX_RELEASE_FRAMES` 腳下格放開邏輯有關的可能性高。變羊本身未證實。振盪總數與 §9 殘差同量級。

## 4. 以後再說
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：每張地圖的戰鬥曲目前是占位（換曲只改 `data/audio/music.ts` 的 `files`，候選 `docs/BGM_CANDIDATES.md`）；新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
