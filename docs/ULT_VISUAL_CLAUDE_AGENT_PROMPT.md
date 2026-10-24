# ULT-V01：交給 Claude 的 50 招奧義視覺實作

給 Claude 的指令：完整閱讀本文件並依序執行；有 /goal 的環境可用 `/goal docs/ULT_VISUAL_CLAUDE_AGENT_PROMPT.md`，沒有則直接要求執行此文件。不要執行舊 ULT_BESPOKE_DESIGN、ULT_VOLUME 或 ULT_REDESIGN_R1 提示詞。

## 0. INV：入口與工作方式

- 目錄 C:\Git\Group-Battler-FFT-Final，分支 feat/project-cleanup。記錄起點 SHA／status。此 checkout 同時只能有一個寫入代理與一條渲染驗證流程，不和 Gemini 同時改檔。
- 先讀 AGENTS.md、types.ts、constants/vfx.ts、RenderSpec、materialConfig、ULT_REDESIGN_PLAN 的50招方向表、ULT_TIMING_REPORT（若存在）、NEXT_PLAN。本文件授權全50視覺，取代舊R1只做四招的範圍；不授權戰鬥機制、時序下限或基準放寬。
- 若清理／ULT-T01 尚未獲主審接受，可先完成設計矩陣與 tools/ui-e2e/out/ult-v01/ 的隔離預覽；正式配方／產品整合必須等 T01 入口成立。不要自行合併其他分支、提交其他代理工作、替別人修核心座標。
- 允許域：data/vfx/ult_visuals.ts、registry/ult_parts*.ts、SkillSequences.ts 中奧義專屬資料、data/vfx/parts/**、engine/renderers/vfxparts/{PartSpec,PartBakers,PartLayerPainter,VFXPartStore}.ts 的必要最小能力、既有奧義展示工具及新專題探針／測試。先在 ULT_VISUAL_CLAUDE_REPORT 列精確改檔清單；共用零件改動要驗證普攻／主動技未退化。
- 禁止改 data/skills 的玩法數值、AI、physics、VisualMath、UnitFrame、facade／tick order、施法／取消／目標政策。需要新位置協議須先提出設計，不能本輪偷偷重算座標；既有 RenderSpec 與 touched 檔頭同步維護。
- 保護 AGENTS/CLAUDE/.agents/.codex/.claude/hooks、METHODOLOGY/DECISIONS/WORKLOG，以及所有 baseline／閾值。不能複製舊 BESPOKE 的預算放寬。若目前造型規則阻擋創作，提出具體替代與量測，沒有授權先在既有預算內完成可行版本。
- 不 push、merge、rebase，不新增依賴／WebGL，不 as any，不在 renderer 存戰鬥狀態。顏色／數值進 data 或 constants，沿用預烘焙快取，不在每幀建立大型漸層／路徑。保留原換行。

## 1. DOM：50 招差異化驗收

建立 ULT_VISUAL_MATRIX.csv：每個實際 ULT ID、目前玩法、主剪影、運動方向、蓄力節奏、命中／受益位置、收尾、最相似招式及區別、成本、證據圖。ID集合須與 skill DB 的 ULT 完全一致，不能漏招或自行新增技能。

每招至少在「主剪影或運動」及另一項「構圖／節奏／收尾」有實質差異。換色、同圈放大、同柱換名字不算。具象核心有實心暗面與局部高光；透明光暈是襯底，不能把主體洗成白光。沿用六角切面世界與陣營色階，不用全畫面閃白、暗場、橫幅或提高鏡頭震動製造差異。

視覺必須忠於實際作用：治療不表演死者復活、範圍圈不擴成比真實打擊範圍更大、吸積帶不代表新增牽引、蕈雲不代表新增DOT、月華不新增增益。若50招在玩法結果仍有重複，單列 gameplay gap，不能靠畫面宣稱已重新設計玩法。

## 2. 第一階段：四招代表作，自驗後再擴展

| ID | 必須看得見的主體與動勢 | 不接受 |
| --- | --- | --- |
| wb_u3 誓約勝利 | 寬刃聖劍分片成形、獅翼護手、抬刃後重斬 | 光柱／粗雷射／只有通用slashArc |
| mb_u1 奧術漩渦 | 深黑多面奇點、彎曲吸積帶向內收縮、亮邊壓縮 | 黑煙加白圈／直線rays代替螺旋 |
| rr_u2 焦土衝擊 | 可辨重型彈頭落向預警，衝擊裙→粗雲幹→翻滾蕈傘 | 隨機散煙／中央光柱／全畫面閃白 |
| sr_u4 猩紅血月 | 多面蝕月上升，暗芯與紅緣、月華下灑血光上流 | HEAVEN_FALL落石／地面爆炸／六角柱代月體 |

至少拍蓄力早期、命中前、命中、命中後、收尾；看圖確認形狀，不只看生成成功。四招並排能辨識後，保留獨立 commit 與 before/after，再按 10 個「陣營×職業」五招組完成剩餘46招；不必每組向使用者請示。四招不合格先改，不能把壞模板擴展50招。

## 3. 時序與空間

T01 提供所有 ULT ≥1.5秒有效詠唱；演出依真正 CAST_START／命中時序，不另建私有計時規則。起手能辨施法者與進度，主爆發不得提前。不同cast資料、重複施放均依同一規則。

使用既有目標／地面錨點與 F02 動態鎖定契約；AOE不追隨原目標漂移。以現有 CAST_BREAK、cancelUltBySource 等取消流程承接新增零件，死亡／受控／重置後無延遲爆發與殘留快取。若需改核心取消契約，記阻斷與最小設計，繼續其他獨立造型。

濃重遮擋在主爆發後不超過2秒；長期狀態由既有狀態層承接。單位、地形高度與命中範圍必須可辨。任何全50共用命中包變更要全50對照，不可以四招漂亮掩蓋其餘變白。

## 4. 驗證與停止規則

- 工具 ult-sheet 可取 feel／指定ID與命中相對時間，先讀其實際參數；原工具 FOREST 預覽不代表亮地圖或真實施法驗證。另用真實 engine 跨 FOREST、ICE／DESERT、VOID，高低差、移動目標、同場多ULT、取消與重置。
- 每職業組並排比較，完工全50總表比較。原圖／差異／JSON 分組保存，報告列最相似對及差別。新參數需證明成本與快取不持續成長。
- runner detach/wait：lint120、test300、build180、runtime-smoke180、perf:guard900、座標診斷900、ult-sheet900；不得留下命令運行就交回。每職業組做必要局部驗證，全部完成再做一次整體驗證，無新變更不重跑。
- guard 原基準不得重錄；預期外觀差異保存 old/new/diff 並標 FAIL（預期變動待主審）。可以單跑 perf-ab --assert 驗效能，不能把 fidelity FAIL 寫 PASS。既有COORD診斷用相同seed與設定比較，不把舊問題歸因新美術，也不能忽略新增回歸。
- 跨出保護範圍、無法解釋的回歸、同一步失敗兩次：記清楚阻斷，只停止相依項，繼續獨立技能。允許部分未完成，但不得用PASS掩蓋缺圖／空畫面。

最終交付：ULT_VISUAL_MATRIX.csv、ULT_VISUAL_CLAUDE_REPORT.md、每職業組commit、50招證據與未完成ID、真實施法／中斷結果、驗證退出碼與日誌。回報一次整批結果。不跑balance:sim、不部署；玩法差異缺口與基準更新交主代理最後判定。
