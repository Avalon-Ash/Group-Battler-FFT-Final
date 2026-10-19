# 交接：還沒做的事（TBD）

> 更新：2026-10-19。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。

## 2. 排定（使用者 2026-10-19 核可）
1. **ECS-lite S2＋S3 表現層分離**：提示詞 `docs/PRESENTATION_LAYER_AGENT_PROMPT.md`，使用者在 IDE 執行 `/goal docs/PRESENTATION_LAYER_AGENT_PROMPT.md`（分支 `feat/presentation-layer`）。**這是渲染工作，跑的期間主代理只做診斷、不修渲染**（導播抖動、變羊閃爍等修正等它合併後再做）。之後 S4（常數拆檔）。
2. **技能全面修正**：使用者 10/19 同意開始規劃（設計由主代理寫，實作交 Gemini）；個別奧義美術翻新併在這裡。
3. **BGM**：主代理從 `docs/BGM_CANDIDATES.md` 挑曲放進 `data/audio/music.ts`（下載前列檔名／來源給使用者同意）。

## 3. 待使用者實機確認
- 展示模式戰鬥結束時導播狂抖、FPS 驟降（使用者回報，未量測；疑單一焦點時縮放解到 2.0 觸發地形重烘焙，或震動量隨縮放平方放大）。
- 單一格閃爍（使用者回家路上看到，疑似變羊等 CC 時），未重現。

## 4. 以後再說
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：每張地圖的戰鬥曲目前是占位（換曲只改 `data/audio/music.ts` 的 `files`，候選 `docs/BGM_CANDIDATES.md`）；新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
