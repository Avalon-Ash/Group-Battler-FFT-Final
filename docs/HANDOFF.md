# 交接：還沒做的事（TBD）

> 更新：2026-10-19。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。沒有進行中的分支，也沒有低階代理在跑。push 狀態以 `git status -sb` 為準。

## 2. 排定（使用者 2026-10-19 核可）
1. **ECS-lite S1 狀態效果資料化**：提示詞 `docs/STATUS_EFFECTS_AGENT_PROMPT.md` 已備好，使用者回家在 IDE 執行 `/goal docs/STATUS_EFFECTS_AGENT_PROMPT.md`（分支 `feat/status-effects`），跑完主代理審查。之後 S2＋S3（渲染層搬家＋外觀分組，渲染工作單獨一條）、S4（常數拆檔），見 `docs/ECS_LITE_ASSESSMENT.md`。
2. **效能報表**：使用者回家在 239 Hz 主螢幕跑 `npm run perf:frames`（10/19 外出時螢幕降到 28 Hz，數字無效）。

## 3. 待使用者實機確認
- 個別奧義美術翻新：等技能全面修正時一起做。

## 4. 以後再說
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：每張地圖的戰鬥曲目前是占位（換曲只改 `data/audio/music.ts` 的 `files`，候選 `docs/BGM_CANDIDATES.md`）；新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
