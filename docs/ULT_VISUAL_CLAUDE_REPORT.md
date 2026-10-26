# ULT-V01 報告：50 招奧義視覺重製

> 2026-10-26，分支 `feat/ult-visual`（起點 `main` fb67049，ULT-T01 已合併）。逐招設計見 `docs/ULT_VISUAL_MATRIX.csv`（50 列）。
> 沒有合併進 main，也沒有 push。基準沒有重錄，門檻沒有放寬。

## 1. 結論

- 50 招全部重做，依「陣營×職業」分 10 組提交，另外有四招代表作和三個跨組修正。每招的主剪影與運動都換掉了，並在構圖、節奏或收尾至少一項做出差異，最相似招式與區別寫在矩陣裡。
- 全部 50 招改成**充能式**：資產從詠唱開始播放，詠唱期間就看得出在蓄力，命中仍落在真正的傷害時刻（UltSpec C1）。
- 天降類（10 招）一律維持原本的傷害延遲（詠唱結束＋落下時間），特效命中對到真正扣血那一刻。其中 9 招改由資產自己畫落下物（`ownFallObject`），或者根本沒有落下物（冰稜、光瓣、蝕月）。
- 美術方向依使用者 2026-10-25 的指示：召喚出來的主體是半透明的魔法能量構造體。爆炸、煙柱這類自然現象依 2026-10-26 的回饋改回粒子與煙霧（rr_u2 蕈狀雲）。

## 2. 新增能力（改到的程式）

| 能力 | 檔案 | 用途 |
| :-- | :-- | :-- |
| 構造體 `construct`，共 13 種造型：greatsword、singularity、warhead、eclipse、bladeWheel、towerShield、crown、fist、guillotine、ribSpike、eye、arrow、demonWings | `engine/renderers/vfxparts/PartSpec.ts`、`PartBakers.ts`、`data/vfx/parts/partConfig.ts` | 奧義主體。預烘焙快取，執行期不建漸層 |
| 零件 `spiral`（螺旋吸積帶） | 同上 | mb_u1、mb_u2、sb_u2、sr_u2、sr_u5、wr_u2 |
| `PartAnim.rise` 高度關鍵影格 | `types/VFXSchema.ts`、`engine/presentation/vfx/partAnimEase.ts`、`VFXPhysics.ts` | 空中成形、緩降、急墜。空中特效的排序鍵本來就不含 z（RenderSpec §2） |
| `UltVisualDef.charged`／`ownFallObject`、`chargedImpactAt()`、`ultImpactDelay()` | `data/vfx/ult_visuals.ts`、`SkillSequences.ts` | 充能時間軸；戰鬥結算、特效排程、截圖工具共用同一個天降延遲 |
| 天降延遲單一來源 | `engine/systems/combat/CombatSystem.ts`、`engine/presentation/VisualSystem.ts` | 傷害時間不變，只是改成讀同一個函式 |
| 天降類維持靜態目標快照 | `VisualSystem.ts`、`RenderSpec.ts` §4.1 | ownFallObject 的序列沒有 HEAVEN_FALL 動作，改以 `ultImpactDelay > 0` 判斷（73f11de） |
| 光束樣式 `PIERCE`；改了 4 招的光束 | `data/vfx/beam_styles.ts` | wb_u5 SLASH_CONNECT、rr_u1 PIERCE、rr_u4 GENERIC_BEAM、mr_u2 BLOOD_LINK，mb_u5 保留 DEATH_RAY |
| 共用命中包：只給傷害技，另分單體版、降亮度 | `data/vfx/registry/ult_parts.ts`、`SkillSequences.ts` | 15 招治療／增益／控制不再畫打擊；單體技不再畫出 3 格大環；拿掉 96 硬芯爆閃 |
| 起手資產（windupFx）改成每招專屬 | `data/vfx/registry/ult_parts_storm.ts` | STORM 類 10 招各有自己的蓄力演出 |
| sr_u3 的 archetype 由 STORM 改成 DOMAIN | `ult_visuals.ts` | 只影響視覺（原本是同一團煙重播 8 次），玩法不變 |
| 零件預覽頁新增奧義構造體列 | `tools/vfx/parts-preview.ts` | `node tools/vfx/parts-sheet.mjs` |
| 綁定序列的已生成粒子跟著目標走 | `engine/presentation/visuals/SequenceSystem.ts`、`RenderSpec.ts` §4.1 | 充能式資產在詠唱開始就生成全部粒子，原本單體技的命中發射器留在目標的舊位置。現在鎖定前每幀隨目標平移，鎖定後留在原地 |
| 打斷時清掉該次詠唱的粒子 | `SequenceSystem.ts`、`engine/presentation/vfx/state.ts`、`VisualSystem.ts` | 原本只清隕石，充能式奧義被打斷後仍會在原本的命中時刻爆開。改成每次 run 有編號（`seqRun`），CAST_BREAK 只清被打斷那次，不動同一施法者更早的餘波 |
| 奧義實戰探針 | `tools/vfx/ult-battle-probe.mjs` | 真實引擎跑跨地圖、移動目標、同場多奧義、取消、重置，見 §4 |
| **玩法改動**：天降類詠唱結束就必中（使用者 2026-10-26 選 B） | `engine/systems/combat/CombatSystem.ts`、`SkillExecutor.ts` | 落下途中被暈、被打斷或施法者陣亡都照樣結算。落點與目標在詠唱結束那一刻記下（`DeferredCastSnapshot`），之後施法者換目標、被打退都不影響；延遲結算不再檢查射程，施法者也不再突進或前衝。天降 10 招實際上變強，平衡重跑時一起看 |
| 粒子預算放寬：軟 240→630、硬 380→1000、物件池 350→1000 | `constants/vfx.ts` | 依據 `PERF_PB_MODE=ults node tools/ui-e2e/perf-particle-budget.mjs`（新工具，見 §4） |
| 大範圍危害場的生成爆發每幀每場最多 12 格 | `engine/presentation/visuals/EventVFXMapper.ts`、`VFX_BUDGET.HAZARD_SPAWN_BURSTS_PER_FIELD` | 半徑 10 的毒沼原本一次播 143 格爆發、約上千顆粒子，上限放寬後會擠掉奧義命中包。場地本身的持續畫面不變 |

沒有改到：`data/skills` 的玩法數值、AI、physics、VisualMath、UnitFrame、facade／tick 順序。戰鬥端只改了上表的天降延遲結算，其他施法、取消、目標政策沒動。保真與 UI 基準、各項門檻也都沒動。

## 3. 規格與測試

- `tests/UltSpec.test.ts` C1～C8 的違規基準維持全空。C1 改成以「cast＋ultImpactDelay」為上限；C4 新增充能式的等價規則（命中後的長度 0.7～1.7 s，沒有放寬原本的總長範圍）。
- 新增或修改的測試：`tests/PartAnimRise.test.ts`、`tests/UltCastTiming.test.ts`（天降類特效命中＝cast＋ultImpactDelay；真實戰鬥中 CAST_FINISH→IMPACT_AOE 相隔 ultImpactDelay）、`tests/VFXParts.test.ts`（每種新造型都會跑一次烘焙）、`tests/SequenceTargetBinding.test.ts`（天降類維持靜態快照；充能序列以替身驗路由）。

## 4. 驗證

| 項目 | 結果 |
| :-- | :-- |
| `npm run lint`／`npm test`（808）／`npm run build` | 每組提交前都 PASS |
| `node tools/ui-e2e/runtime-smoke.mjs` | 每組 PASS（0 頁面錯誤、battleTime 前進、畫面有變） |
| `npm run perf:guard` | 有改烘焙程式的組（代表作、藍戰、藍坦、紅坦、藍弓、紅戰）都 PASS：保真 6 景在門檻內、perf 護欄通過 |
| 截圖自驗 | 每組都用 `ult-sheet --feel` 拍蓄力、命中前、命中、命中後；全 50 招命中瞬間做了改前／改後對照（`v01-all50-cmp-*.png`） |
| 實戰探針 `node tools/vfx/ult-battle-probe.mjs --suite=all` | 下表；輸出在 `tools/ui-e2e/out/ult-probe/`（JSON＋每張地圖的命中總表） |

**實戰探針結果**（固定種子＋`__stepFrames`，真實引擎施法，最後一次全套 2026-10-26）：

| 項目 | 做法 | 結果 |
| :-- | :-- | :-- |
| 跨地圖 | FOREST、ICE、DESERT、VOID、MAGMA 各跑 50 招；施法者與目標放在高低差最大的相鄰格（120） | 250 次全部在 `cast＋ultImpactDelay` 生效（容差 1 幀）；3 秒後序列粒子零殘留；零件快取 18→265 後不再長；0 頁面錯誤。rb_u5 比詠唱結束晚 0.10 s，是投射物飛行時間（§5 既有差異） |
| 移動目標 | 15 招單體奧義，詠唱到 0.5 s 時目標移開 2 格 | 修正前：12 招非天降單體的資產命中發射器留在舊位置，只有共用命中包到新位置。修正後 12 招都到新位置。天降 3 招與投射物 rb_u5 依 RenderSpec §4.1 維持靜態快照 |
| 同場多奧義 | DESERT 同一幀 4 招與 8 招（探針暫時關掉打斷，量全部完成時的負載） | 舊預算：4 招就在命中瞬間撞到硬上限 380，共用命中包、wb_u4 落點資產、受擊特效整個被略過；main 同條件 382，是既有問題。主因是 mr_u4 的毒沼一次播 143 格生成爆發。放寬預算並限制爆發後：4 招峰值 452、8 招 715，0 個特效被略過，生效時刻全對、零殘留 |
| 詠唱中打斷 | 50 招都在 0.8 s 打斷 | 修正前 50 招都在原本的命中時刻爆出幽靈特效（9～62 顆）。修正後 0 顆，傷害 0 |
| 天降落下途中打斷 | 9 招天降在詠唱結束後 0.1 s 打斷 | 改版前傷害被取消、特效卻照樣落地。改成 B 之後 9 招都照常結算並落地；`tests/UltCastTiming.test.ts` 驗證暈眩與陣亡兩種情況都在原落點、`cast＋ultImpactDelay` 結算 |
| 粒子預算壓測（headed 2560×1440、RTX 4070、解除 vsync，同一幀 8 招，3 輪） | 硬上限 380／600／800／1000／1500 | 略過特效 290／146／62／7／0；幀 p95 12.6／12.1／13.0／12.7／12.8 ms，p99 17.5／16.6／19.1／18.6／21.2 ms；1500 時最長幀 85 ms。選 1000。加上爆發限制後重量 1000：峰值 735、略過 0、p95 12.2／p99 19.3 ms（380 為 12.3／15.8） |
| `perf:frames` | 舊值與新值各跑一次 | **量測無效**：兩次都卡在 17.8 ms（約 56 fps），代表視窗開在 59 Hz 副螢幕，被 vsync 鎖住看不出差異。需要在主螢幕重跑 |
| 重置 | 50 招施放到命中前按 RESET_GAME | 0 殘留、0 延遲爆發 |

- `verify:coords`：沒動座標協議。§4.1 改了綁定條件，並新增「已生成粒子跟隨」與「詠唱取消」兩段。
- 平衡模擬：依提示詞不在本輪跑。

## 5. 玩法差異缺口（只列出，沒有用畫面掩蓋）

- **STORM 類 10 招**：畫面上是 8 段落點，傷害實際是在詠唱結束時一次結算，落點只是裝飾。這是既有的時序差異。
- **mr_u3 時間凝結與 sr_u3 靈魂放逐**：兩招都是 BANISH，只差在 mr_u3 有傷害和 STASIS 外觀。
- **tb_u2 王者之風、tb_u5 鋼鐵長城、sb_u3 英勇讚美**：三招都給全隊護盾，差別在嘲諷與治療量。
- **rb_u5 疾風百矢**：同時有真實投射物（projectileSpeed 2500）和 STORM 落點，兩者不同步。
- **天降類必中**（本輪改動）：落下途中打斷不再有效，天降 10 招比以前強。
- **單體天降追蹤目標**（既有）：rb_u1、rb_u3、tr_u1 的傷害打在詠唱結束時的目標身上，不論目標落下時走到哪；畫面上的落下物依 RenderSpec §4.1 是靜態快照，目標走開時兩者會分開。

## 6. 待使用者實機確認

1. 50 招整體觀感：構造體是否太「卡通」。rr_u2 的蕈狀雲已改回煙霧；彈頭、巨拳、冠冕這類構造體請一起看。
2. 部分招式在 FOREST 截圖裡偏淡：tr_u3 骨刺偏暗、sb_u2 光瓣被治療預警蓋住、wb_u4 劍輪在詠唱早期不明顯。
3. 仍偏亮的命中：mb_u2（冰原地形＋冰殼）、sb_u4（三道光柱）。
4. 懸空主體的高度：奇點、蝕月、雷核會壓到頭頂血條附近。

## 7. 回退指南

- 回退整輪：不合併 `feat/ult-visual` 即可，main 不受影響。
- 只回退某一組：revert 該組的 commit（每組獨立，只改該組的配方和 `ult_visuals.ts` 的對應列）。構造體造型是累加的，留著沒有副作用。
- 共用命中包回到舊版：revert 285f148。非傷害技跳過命中包：revert 772b006。
