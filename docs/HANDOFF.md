# 交接：還沒做的事（TBD）

> 更新：2026-10-22。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態
- 單一主線 `main`（`C:\Git\Group-Battler-FFT-Final`），遠端也只剩 `main`。「位移技能軌跡＋近戰前衝＋奧義 C1 歸零」（`feat/dash-motion`）已審查修正並合併入 `main`（報告 `docs/DASH_MOTION_REPORT.md`）。下一輪：排定 §2 第 1 項「行為樹優化」，提示詞 `docs/BT_OPT_AGENT_PROMPT.md` 已就緒。push 狀態以 `git status -sb` 為準。

## 2. 排定（依序；第 2 項為渲染工作，單獨一條串行）
1. **行為樹優化**（`docs/BT_OPT_AGENT_PROMPT.md`，分支 `feat/bt-opt`）：30 場無頭對戰錄製分析抓出四類不自然行為（友軍目標殘留 `13,317` ticks、PBAOE 空地空放 `32+12` 次、對滿血友軍空放治療 `66` 次、遠距空開短效自身增益 `14` 次）；修正 `TargetingSystem` 與 `BTRegistry`，改完重跑平衡模擬（`npm run balance:sim`），勝率維持 45～55%。
2. **奧義體積感強化**（使用者 2026-10-22 實機回饋）：目前零件化奧義半透明柔邊疊層過多，「視覺還是太弱，原版的體積感很強，現在都太虛化」。對照 `6927b68` 前原版構圖與實心體積階層，把奧義的厚重立體感與核心密度做回來。

## 3. 待使用者確認
1. **位移技能軌跡與近戰前衝實機看**（`docs/DASH_MOTION_REPORT.md`）：開一場戰鬥觀察衝刺技能（如 `wb_a2` 光速突進、`wr_a3` 狂暴衝鋒、`rb_a4` 戰術翻滾）起手爆發推進、跨高低差斜坡／跳落曲線與殘影起點，以及近戰普攻／主動技出手時的微幅前衝體感。

## 4. 以後再說
- **戰場視覺／資訊混亂度收斂**（使用者 2026-10-22 回饋「戰場有點混亂，不過暫時先這樣」）：技能特效、反傷／狀態浮字與場地疊層同時出現時的資訊密度收斂。
- 重新部署方式（Cloud Run 相關檔案已刪）。
- 正式版素材：新體型／女性／神職模型要找和 KayKit 同風格的素材（Quaternius 已否決），外觀軸 `Team×Role×BodyType` 已可直接擴充。
- 地形烘焙實作（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況夠順，暫不做。
- 座標殘差：景深預言穩定錯序 668 pair-frames、閃爍振盪 57（`docs/COORD_GUARD_FINDINGS.md` §9），觀察即可。
