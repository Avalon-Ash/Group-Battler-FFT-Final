# 交接：還沒做的事（TBD）

> 更新：2026-10-25。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態

- 清理第一階段已合併進 `main`，並已 push。完成紀錄見 WORKLOG §2 S；後續計畫見 `docs/PROJECT_CLEANUP_NEXT_PLAN.md`。
- **兩條並行線**：
  - Codex 在自己的工作樹（`C:\Users\xino_\.codex\worktrees\lionheart-warrior-skins\`，分支 `codex/lionheart-warrior-skins`）做獅心戰士男女 skin：離線製作與試烘焙。交接文件是該分支 docs 底下的 `LIONHEART_WARRIOR_SKIN_TRIAL_OPUS_HANDOFF.md`（main 上還沒有這個檔）。
  - 奧義 ULT-T01、ULT-V01 都已合併進 `main`（2026-10-26，WORKLOG §2 T）。
  - skin 正式接進圖集、做效能量測時，由主代理排時段；Blender 烘焙不和 `perf:*` 同時跑（CLAUDE.md 鐵律）。
- 清冊 `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` 共 659 列：520 列未讀、31 列只核對部分事實、108 列不適用。逐檔語義審計**沒有完成**，之後只能逐檔累積可追溯的證據，不可整批標成完成。
- 未結案的 findings（`docs/PROJECT_CLEANUP_AUDIT01_FINDINGS.csv`）：
  - **COORD-SINK-01**（P2）：受擊位移讓單位滯留原格，下坡插值時下陷 1.89px。原因已定位，修法還沒批准。
  - **COORD-VOID-01**（P3）：探針把高速自由落體誤判成虛空滯留，屬於量測工具的問題。
  - 已否決的修法：永久鎖定屍體排序格、`vz<-50` 過濾、高度 clamp。

## 2. 下一步

1. **`perf:frames` 在主螢幕重跑**：粒子預算放寬（630／1000）後那次量測，視窗開在 59 Hz 副螢幕被 vsync 鎖住，無效。舊值對照：把 `constants/vfx.ts` 的軟／硬上限、`MAX_POOL_SIZE`、`HAZARD_SPAWN_BURSTS_PER_FIELD` 暫時改回 240／380／350／不限（報告 `docs/ULT_VISUAL_CLAUDE_REPORT.md` §4）。
2. **雷射改投射物**（分支 `feat/no-laser`，還沒合併）：12 招普攻／主動技改成真投射物、tr_a5 改近身爆發，`battle_frozen` 已依取證流程重錄。待使用者實機看外觀後合併。
3. 奧義、時序和阻斷問題都完成後，鎖定一個 commit，統一重跑平衡（含天降必中、雷射改投射物兩項玩法改動）。報告 §5 的玩法差異缺口（STORM 落點只是裝飾、BANISH／全隊護盾重複）在這一步一起判斷。
4. Codex 週額度偏低（2026-10-26 剩 20%）：獅心戰士 skin 等額度恢復再接，交接文件在該工作樹 docs 底下。
5. 有空時：繼續讀清冊未讀的檔案；SINK／VOID 要有新證據才重開。

## 3. 待使用者實機確認
0. **ULT-V01 50 招奧義實機看**（報告 §6）：構造體會不會太卡通；偏淡的 tr_u3、sb_u2、wb_u4；偏亮的 mb_u2、sb_u4；懸空主體（奇點、蝕月、雷核）會不會壓到血條。
1. **位移技能軌跡與近戰前衝實機看**（`docs/DASH_MOTION_REPORT.md`）：開一場戰鬥觀察衝刺技能（如 `wb_a2` 光速突進、`wr_a3` 狂暴衝鋒、`rb_a4` 戰術翻滾）起手爆發推進、跨高低差斜坡／跳落曲線與殘影起點，以及近戰普攻／主動技出手時的微幅前衝體感。
2. **行為樹優化與技能強度重調實機看**（`docs/BT_OPT_REPORT.md`）：觀察輔助與坦克施放對友軍治療／增益後是否立即切換回敵方目標並正常接普攻（不再對著空氣發呆或誤衝敵陣）、自身中心範圍技（PBAOE）是否只在範圍內有敵人時施放、治療技是否不再對滿血隊友空放。

## 4. 以後再說（暫緩項目）
- **戰場視覺／資訊混亂度收斂**（使用者 2026-10-22 回饋「戰場有點混亂，不過暫時先這樣」）：技能特效、反傷／狀態浮字與場地疊層同時出現時的資訊密度收斂，暫緩。
- **重新部署方式**：Cloud Run 相關檔案已刪，全部搞定後再重新評估。
- **正式版素材**：Quaternius 女性模型風格與 KayKit 差距過大已否決；其他新體型／神職模型標為待評估（不擴大為全部模型均被否決），外觀軸 `Team×Role×BodyType` 支援直接擴充。GPT 提議的男女重設計：建議只做少量概念稿，成品走「改材質＋配件後重新烘焙」，不逐格重畫 2D。
- **地形烘焙實作**（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況順暢，暫緩。
- **移動中排序翻轉**：COORD-R1 後振盪事件 83→93，主要是屍體滑行時的 CORPSE×VFX，沒有 static 振盪；證據在 `PROJECT_CLEANUP_COORD_R1_REVIEW.md`。
- **Codex hook 信任**（使用者要做一次）：`.codex/hooks.json` 已改寫成 Codex 格式。下次在 Codex 開這個專案時用 `/hooks` 檢視並信任；舊的信任 hash 已經失效。PostToolUse 的提醒（改到渲染檔、重錄基準）只有單元測試，還沒在 Codex 裡實測。
