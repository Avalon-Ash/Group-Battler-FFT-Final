# 交接：還沒做的事（TBD）

> 更新：2026-10-25。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 2026-10-25：COORD-R1 兩工作包實作完成

- f08bb75 已成功推送 origin/feat/project-cleanup，未合併main。
- **COORD-TOOL-01 已修復（Package A，commit `96b5ea5`）**：`tools/ui-e2e/lib/depth-oracle.mjs` 支援 `ObstacleSprite` 取樣、真實尺寸裁切、非預設錨點與 WeakMap 影像快取；專用探針 `coord-oracle-sprite-check.mjs` 驗證全綠（含負向控制）。
- **COORD-OSC-01（Package B 8f7ef65 ＋ 主審 cc056b0）**：距離尺度改為未壓扁平面，再加上非對稱滯後：進入前格立即切換，原始格穩定不變才放開。8f7ef65 單獨套用時，格界上的屍體會被腳下地塊蓋住，穩定錯序 19→25；加上 cc056b0 後是 19→7，static 7→1，sink/void 不變。原報告 §2.3 的組別數字有誤，以 `PROJECT_CLEANUP_COORD_R1_REVIEW.md` 為準。
- **待使用者實機確認**：屍體擊飛滑停在格界時，腳不再被腳下地塊蓋住；行走時沒有新的排序閃爍。
- **仍待做／未結案事項**：
  - COORD-SINK-01（1.89px 插值下陷）與 COORD-VOID-01（高速穿越採樣）作為已知診斷揭露，未擴大修改產品。
  - 全庫清冊 659 列逐檔語義審計未完成。
  - 奧義資料／時序／視覺尚未開始實作。本次不放寬驗收，也不修改死亡運動。

## CLOSE02 主審更新

- 已保留新增取證與索引，修正探針自己的 cOld.y 誤用、resolve/render 幀號偏移與 anchor reset 判定；產品 UnitFrame 沒有該 typo，不得照原報告修改。
- 撤回「全庫語義審查完成」「完整墜落回收已驗證」；清冊維持證據限度，COORD01 核心修法仍未批准。詳見 PROJECT_CLEANUP_CLOSE02_REVIEW.md 及更正後報告。
- 使用者本輪授權推送 feat/project-cleanup，不合併 main；奧義工作明天再處理。

## 1. 目前狀態與主審更正

- 分支 feat/project-cleanup，未合併 main／未推送。AUDIT01 原交付 c856081，主審修復與計畫見 PROJECT_CLEANUP_AUDIT01_REVIEW.md、PROJECT_CLEANUP_NEXT_PLAN.md。
- F01/F02/F03、T01、K01/K02 與前批 C01–C05 清理沿用已審查結果；AUDIT01 四 export 收斂、測試障礙物隔離與 effect_defs 檔頭更正保留。
- 全庫枚舉與語義審計不可混稱完成。AUDIT01 CSV 實為 659 列；原 31 已讀宣稱僅作部分事實，逐檔 runtime 覆蓋未證實，文件／JSON／設定仍需讀。詳見更正後帳本與報告。
- COORD01 僅診斷重現：sink 1.89px、void 高速下墜取樣、static 與 moved 排序翻轉。未批准永久鎖屍體 sortHex、vz<-50 過濾或高度 clamp。原報告修復設計不得直接執行。

## 2. 下一步

1. 收斂 COORD01 因果及繼續未讀清冊；已有問題有獨立追蹤，不以全庫缺少逐檔 runtime 驗證當作全部功能故障。
2. ULT-T01：全 50 奧義有效詠唱至少 1.5 秒，資料／編輯／施法事件／讀條一致；不改平衡其他欄位。
3. Claude ULT-V01：全 50 招視覺差異化，先四代表作自驗再按職業成套完成；與 T01 同一工作目錄須串行，詳見新提示詞。舊 BESPOKE／VOLUME／R1 提示詞不作本輪執行授權。
4. 完整奧義、時序與阻斷問題完成後，鎖定 commit 統一重跑平衡。

## 3. 待使用者實機確認
1. **位移技能軌跡與近戰前衝實機看**（`docs/DASH_MOTION_REPORT.md`）：開一場戰鬥觀察衝刺技能（如 `wb_a2` 光速突進、`wr_a3` 狂暴衝鋒、`rb_a4` 戰術翻滾）起手爆發推進、跨高低差斜坡／跳落曲線與殘影起點，以及近戰普攻／主動技出手時的微幅前衝體感。
2. **行為樹優化與技能強度重調實機看**（`docs/BT_OPT_REPORT.md`）：觀察輔助與坦克施放對友軍治療／增益後是否立即切換回敵方目標並正常接普攻（不再對著空氣發呆或誤衝敵陣）、自身中心範圍技（PBAOE）是否只在範圍內有敵人時施放、治療技是否不再對滿血隊友空放。

## 4. 以後再說（暫緩項目）
- **戰場視覺／資訊混亂度收斂**（使用者 2026-10-22 回饋「戰場有點混亂，不過暫時先這樣」）：技能特效、反傷／狀態浮字與場地疊層同時出現時的資訊密度收斂，暫緩。
- **重新部署方式**：Cloud Run 相關檔案已刪，全部搞定後再重新評估。
- **正式版素材**：Quaternius 女性模型風格與 KayKit 差距過大已否決；其他新體型／神職模型標為待評估（不擴大為全部模型均被否決），外觀軸 `Team×Role×BodyType` 支援直接擴充。
- **地形烘焙實作**（`docs/BAKED_RENDERING_DESIGN.md`）：熔岩圖現況順暢，暫緩。
- **座標殘差（COORD01）**：待後續查核時以新證據量測評估。
