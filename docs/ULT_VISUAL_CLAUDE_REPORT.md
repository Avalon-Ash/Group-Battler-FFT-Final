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

沒有改到：`data/skills` 的玩法數值、AI、physics、VisualMath、UnitFrame、facade／tick 順序、施法／取消／目標政策。保真與 UI 基準、各項門檻也都沒動。

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

**沒跑的項目**：
- 跨地圖真實施法（ICE／DESERT／VOID）、高低差、移動目標、同場多奧義、取消與重置的實戰驗證。截圖工具只在 FOREST 拍。
- `verify:coords`：沒動座標協議，只改了 §4.1 的綁定條件。
- 平衡模擬：依提示詞不在本輪跑。

## 5. 玩法差異缺口（只列出，沒有用畫面掩蓋）

- **STORM 類 10 招**：畫面上是 8 段落點，傷害實際是在詠唱結束時一次結算，落點只是裝飾。這是既有的時序差異。
- **mr_u3 時間凝結與 sr_u3 靈魂放逐**：兩招都是 BANISH，只差在 mr_u3 有傷害和 STASIS 外觀。
- **tb_u2 王者之風、tb_u5 鋼鐵長城、sb_u3 英勇讚美**：三招都給全隊護盾，差別在嘲諷與治療量。
- **rb_u5 疾風百矢**：同時有真實投射物（projectileSpeed 2500）和 STORM 落點，兩者不同步。

## 6. 待使用者實機確認

1. 50 招整體觀感：構造體是否太「卡通」。rr_u2 的蕈狀雲已改回煙霧；彈頭、巨拳、冠冕這類構造體請一起看。
2. 部分招式在 FOREST 截圖裡偏淡：tr_u3 骨刺偏暗、sb_u2 光瓣被治療預警蓋住、wb_u4 劍輪在詠唱早期不明顯。
3. 仍偏亮的命中：mb_u2（冰原地形＋冰殼）、sb_u4（三道光柱）。
4. 懸空主體的高度：奇點、蝕月、雷核會壓到頭頂血條附近。

## 7. 回退指南

- 回退整輪：不合併 `feat/ult-visual` 即可，main 不受影響。
- 只回退某一組：revert 該組的 commit（每組獨立，只改該組的配方和 `ult_visuals.ts` 的對應列）。構造體造型是累加的，留著沒有副作用。
- 共用命中包回到舊版：revert 285f148。非傷害技跳過命中包：revert 772b006。
