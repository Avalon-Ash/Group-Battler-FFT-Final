# 美術與技能特效改造：夜間自動化計畫與進度

> 主代理（Opus）專用的進度檔。每個自動接手的工作階段**先讀 `CLAUDE.md`、`docs/HANDOFF.md`、本檔**，從「下一步」接著做，做完一段就更新本檔並 commit。
> 使用者 2026-10-16 01:10 授權整晚自動進行。

## 1. 已定案的決策（不要重新討論）
- **美術方向（02:45 改定）**：**像素世界、現代特效**。角色、障礙物、地形、背景走像素美術（FFT 式），技能特效走現代全解析度發光層。規格見 `docs/ART_SPEC.md` §1、§2、§12。
- **製作路線**：
  - 物件（單位、樹、岩、柱）＝ KayKit 模型 **3D 轉像素**（低解析渲染、限色盤、1px 外框），沿用 Blender 管線（`docs/ART_STYLE_BIBLE.md` §11、`C:\Git\_asset_staging	ools\`）。
  - 世界層整體以低解析度離屏畫布繪製，再最近鄰整數倍放大；特效與 UI 以全解析度疊在上面。
  - 主代理用程式碼做地形像素材質、背景與技能特效。
- **技能特效是主軸**。現在的特效語言是舊科幻設定（`*_TECH_*`、掃描線、Glitch 喊招、六角稜柱護盾），與 `docs/ART_STYLE_BIBLE.md` §2 的奇幻陣營不符，要整套換掉：
  - 藍方「獅心騎士團」：聖光放射、金白光、乾淨的紋章幾何（劍弧、日輪、獅紋）、柔和光暈、節奏莊重。
  - 紅方「灰燼軍團」：餘燼與灰煙、鋸齒狀緋紅火焰、骨白符文、厚重衝擊、節奏兇猛。
- **品味由主代理決定**：需要選擇時主代理自己選一個合理預設，把理由與替代方案記在本檔「待使用者確認」，早上由使用者看。

## 2. 夜間規則
- 所有工作在分支 **`feat/art-vfx`**（從 `main` 開；若不存在就建立）。**不合併 `main`、不 push**，早上由使用者審查後決定。
- `fix/ice-aurora`（含 R2）已於 01:40 合併並 push，不再有例外：**一律不合併、不 push**。
- 每完成一個步驟：`npm run lint`、`npm test`、`npm run build`；動到渲染再跑 `npm run perf:guard`，並本機實跑截圖（`createServer` + `playwright-core` + `msedge`）確認畫面。
- 保真基準：VFX／材質是刻意改變畫面，**允許重錄**，但必須在獨立 commit、只含基準 PNG，並在本檔記下重錄原因與對照圖路徑。
- 遵守 `AGENTS.md` 的架構不變式（SSOT、無 `as any`、無魔術數字與硬編碼顏色、Canvas 2D only、tick／渲染迴圈無 `console.log`）。
- 機械性的大量修改可以開 Sonnet 子代理（`general-purpose` + `model: sonnet`），設計與品味自己做。
- 截圖與預覽圖放 `tools/ui-e2e/out/`（gitignored），在本檔記下檔名。
- **同一個錯誤連續兩次就停**：同樣的失敗（同一個測試、同一個建置錯誤、同一種畫面問題）修了兩次還在，就停止該步驟，把錯誤訊息與試過的做法寫進 §5，跳到下一個不依賴它的步驟。
- **不自己審自己**：每一步標記「完成」之前，開 `reviewer` 子代理審查該步驟的 diff（對照 `AGENTS.md` 與 `docs/ART_SPEC.md`），把它指出的實際問題修掉，並在工作紀錄寫一行審查結論。
- **子代理回報格式**：要求子代理回報包含「完成了什麼、信心程度（高／中／低）、試過但失敗的做法、卡住時需要誰處理」。

## 3. 步驟與狀態
| # | 步驟 | 狀態 | 產出 |
| :-- | :-- | :-- | :-- |
| A0 | ICE 極光修正收尾、合併並 push | 完成 | `main` = `f9f4ecc`（含 R2；ICE p99 19.3 → 6.5 ms） |
| M0 | 美術與特效規格 `docs/ART_SPEC.md`：素材分工表（KayKit／程式碼）、各地形與陣營色盤、光源、陣營 × 元素的特效語彙（形狀、色票、節奏、層次）、效能規則（零件預烘焙、無 `shadowBlur`、品質分級） | 完成 | `docs/ART_SPEC.md` |
| P0a | 像素原型（即時）：在引擎內加一個可切換的實驗選項（例如 `?pixel=2`／`?pixel=3`，預設關閉、行為與現在完全相同），把世界層畫到低解析度離屏畫布再最近鄰放大，特效層維持全解析度。5 個地形 × 1/2、1/3 各截一張，附一張戰鬥中的截圖；量 `terrain-cost.mjs` 看成本變化 | 完成（03:50） | `?pixel=2|3`：`engine/renderers/PixelLayer.ts`、`RenderPipeline` 兩層拆分、`PIXEL_WORLD`；工具 `tools/ui-e2e/pixel-proto.mjs`；截圖 `tools/ui-e2e/out/pixel/` |
| P0b | 3D 轉像素測試：用 Blender 管線把 1 個 KayKit 角色（任一陣營戰士）以 P0a 選定的像素密度渲染 4 方向待機＋攻擊幾格，限色盤＋1px 外框，輸出精靈表與放大檢視圖；只做測試素材，不接進遊戲 | 完成（05:10）：`tools/assets/pixelize_sprite.py`（共用取景、premultiplied 面積縮小、二值 alpha、全影格共用 14 色調色盤、1px 加深外框）；Blender 變體 `C:\Git\_asset_staging\tools\blender_scripts\render_unit_pixel.py`（無 freestyle 外框、只渲 idle＋attack 各 4 格）；原始影格 `C:\Git\_asset_staging\sprites_pixel_raw\BLUE_WARRIOR\` | `tools/ui-e2e/out/pixel_sprites/BLUE_WARRIOR_h{20,30,40}_{sheet,zoom,palette}.png`、`cmp_heights_idle.png` |
| V1 | 特效零件庫：程序化、預烘焙、可參數化的零件（光暈、衝擊環、斬擊弧、火焰舌、煙團、符文圈、光柱、火花拖尾、獅紋日輪、角骷髏符印），含品質分級與單元測試；做一個預覽頁輸出零件總表截圖。**另做錄影工具 `tools/vfx/record-skill.mjs`**：沿用保真工具的確定性 harness（`addInitScript` 注入 `__resetSeed`／`__stepFrames`），指定技能 → 固定亂數 → 逐幀推進截圖 → 本機 ffmpeg 編成短 MP4（另出一張 GIF 方便手機看）；之後 V2 每個技能都用它產出前後對照影片 | 完成（04:40）：錄影工具＋零件庫 12 種（`engine/renderers/vfxparts/`、參數 `data/vfx/parts/partConfig.ts`、色階 `data/vfx/parts/vfxPalette.ts`）、18 個單元測試、預覽頁 `tools/vfx/parts-preview.html`、總表＋裁切檢查 `node tools/vfx/parts-sheet.mjs [--tier=N]` | `tools/ui-e2e/out/vfx/parts_sheet_t0.png`／`_t0_gray`／`_t3`／`_t3_gray` | |
| V2a | 奧義技能逐一重做（`data/vfx/ult_visuals.ts`、`SkillSequences.ts`），每個技能存 4 格時間序截圖，並用 `record-skill.mjs` 錄改前／改後影片 | 進行中：零件已接進粒子系統（`PART`／`PART_GROUND`／`PART_DEBRIS`、`EmitterConfig.part`／`partAnim`／`groundAnchored`、`PartPainter`）；樣板 2/30 完成：wb_u3 誓約勝利、wr_u1 諸神黃昏（`data/vfx/registry/ult_parts.ts`） | 改前 `tools/ui-e2e/out/vfx/before/`、改後 `tools/ui-e2e/out/vfx/after/`（`<id>_<TEAM>.mp4`／`.gif`／`_sheet.png`／`_sheet_gray.png`／`_tiles.png` 前 2 秒 15 格） |
| V2b | 主動技能重做（`active_visuals.ts`） | 待做 | |
| V2c | 普攻、投射物、命中特效（`basic_visuals.ts`、`projectiles/*`） | 待做 | |
| V3 | 移除科幻殘留：掃描線、Glitch 喊招、六角稜柱護盾改為陣營護盾；`*_TECH_*` 鍵名改名；用 `perf:attribution` 或 VFX 風暴場景確認 p99 不比現在差 | 待做 | |
| M1 | 地形改像素化程序烘焙（取代 AI 貼圖，依 P0 結果與 `ART_SPEC` §12） | 待做 | |

## 4. 下一步
**2026-10-16 08:40 使用者指示（優先於下列所有計畫）**：
- **【09:20 更新】SD 暫停**：使用者實測後判定，現有素材縮小只會糊成一團，除非全部材質都重畫成像素美術才有意義。**HD 為主線**；`?pixel` 原型與 3D 轉像素工具保留在程式裡但不再投入。原紀錄：**HD／SD 兩條線都保留**：HD＝現有高解析度精靈與畫面；SD＝像素世界（`?pixel=2|3`、3D 轉像素精靈）。兩條都要能切換、並排測試，結果出來前不刪任何一條，也不把任何一條設為預設。
- **【09:30 更新】世界觀已補記於 `ART_SPEC` §0**：六角網格世界、棋座是實體、角色是投影、法術刻意六角化。零件庫與兩個樣板奧義要改成六角骨架（圓環→六角環、圓形日輪→六角日輪）後再給使用者看。原紀錄：**特效風格暫停**：風格定義要再和使用者討論。**V2a 不得批次套用到其餘奧義**；零件庫與兩個樣板保留，但不再擴大。
- 昨晚沒有回覆的項目一律標記 **TBC**（見 §5）。

可以先做、不涉及風格的工作：零件預烘焙與快取上限重估（原下一步第 1 點）、`perf:guard` 在主螢幕重量、HD／SD 切換與對照工具。

## 5. 待使用者確認（以下全部 TBC，除非另有標註）
**決議（2026-10-16 使用者回覆，取代下方對應條目）**：
- 技能名稱：主代理全權改名（奇幻＋六角語彙）。
- 色盤：先照 `ART_SPEC` §3 預設做，看成品再調。
- 特效零件六角化：**骨架六角、細節自然**（法陣、衝擊環、護盾、光柱截面用六角；火焰、煙、光點保留自然形狀）。零件總表的圓環需改六角。
- 掃描線／Glitch：只用於投影失真時刻；詠唱、AOE 預警與中斷的完整定義見 `ART_SPEC` §13。
- 像素密度、P0b 審美預設、像素原型取捨：SD 線已暫停，**作廢**。
- **基本攻擊／主動技下一輪必修（2026-10-16 knip 清理時發現）**：`SKILL_SEQUENCES` 裡有 81 個 PARTICLE 動作的 id 不在 `VFX_REGISTRY`，播放時被靜默略過（`GLOW`×43、`SMOKE_PUFF`×15、`PROJ_BLUE_SNIPER`×7、`PROJ_RED_HEAVY_BOLT`×6、`SPARK`×3、`PROJ_BLUE_FROST_BOLT`×3、`BEAM_RED_LINK`×2、`DRAIN_LINK`、`SLASH_CONNECT`）。主因是 `active_visuals`／`basic_visuals` 的 `vfxOverride` 兼放光束樣式、投射物 id 與粒子型別，又被當成命中特效 id 播放。重做時拆成 `hitFx`／`beamStyle`／`projectile` 三個欄位，並加測試：序列中每個 PARTICLE id 都要在登記表內。
- 仍待確認：V2a 兩個樣板奧義，已換六角骨架並重錄：`tools/ui-e2e/out/vfx/wb_u3_BLUE.mp4`、`wr_u1_RED.mp4`（`*_sheet.png` 為逐格總表）。確認方向後再批次套用其餘 28 個。
- 已完成（2026-10-16）：零件六角化（環、法陣外框、稜柱光柱、六角碎片）；§13 詠唱中斷與 AOE 預警崩解（截圖工具 `tools/vfx/cast-break-shot.mjs`）；地面法陣不再蓋住站在上面的單位；SD 像素原型移除（tag `pixel-proto-ckpt` 可復原）。

（自動工作階段在這裡累積需要使用者決定或審美確認的項目，附截圖路徑。）
- **技能名稱的科幻殘留**（`ART_SPEC` §9 最後一列）：「系統超載」「軌道轟炸」「戰術核彈」「電擊警棍」「雷射標記」「量子護盾」「戰術加速」等。特效會照奇幻語彙重做，但名稱屬遊戲設計，要不要改名、改成什麼，由使用者決定。
- **地形與陣營色盤**（`ART_SPEC` §3）是主代理選的預設，M1／V 系列會照它做；若想換色調，改這張表即可。
- **像素密度**（1/2 或 1/3）：預設暫選 **1/3**（`ART_SPEC` §12 原定值，像素感最接近 FFT；1/2 偏「高解析像素」、細節較多）。開 `http://localhost:3000/?pixel=3` 或 `?pixel=2` 實機看。截圖（1920×1080）：`tools/ui-e2e/out/pixel/<VOID|FOREST|ICE|MAGMA|DESERT>_k<1|2|3>.png`、`battle_k<1|2|3>.png`；中央裁切三欄對照（左 k1、中 k2、右 k3）`cmp_FOREST.png`、`cmp_MAGMA.png`、`cmp_battle.png`。注意：現在的地形貼圖與精靈是高解析素材直接縮小，所以看起來是「模糊方塊」而不是像素美術；真正的像素感要等 M1（像素地形）與 P0b（3D 轉像素）。每次重建地圖亂數不同，三欄不是同一張地圖。
- **【已解決 2026-10-16 09:10】** `tools/ui-e2e/lib/perf-common.mjs` 加 `--force_high_performance_gpu` 後，`perf:guard` 在 RTX 4070 上全數通過（保真 6/6、效能 PASS）。原紀錄：**`perf:guard` 的效能段落連兩次落在 AMD 內顯（副螢幕）而判無效**（保真段 6/6 PASS，證明預設路徑畫面不變）。依規則停止重試，未設 `PERF_ALLOW_ANY_GPU`。`pixel-proto.mjs` 的成本數字很可能也是內顯量的。請把 Edge 視窗固定在主螢幕或在 Windows 圖形設定指定高效能後重跑 `npm run perf:guard`。
- **特效零件總表**（V1）：`tools/ui-e2e/out/vfx/parts_sheet_t0.png`（灰階 `_gray`）。主代理選的預設：獅心＝乾淨圓環、日輪 12 道長短交錯、騎士盾＋十字＋三尖冠；灰燼＝鋸齒斷裂環、角骷髏、倒三角符文。血、瘴氣、深淵三種色階用一般混合（不發光）。已知：深淵（ASH_VOID）在灰階下偏暗，靠形狀辨識；火焰是平塗三層，偏卡通，若想更寫實可改成柔邊。
- **像素密度建議改為 1/2**（推翻 P0a 時暫選的 1/3）：P0b 實測單位精靈高度 = `UNIT_SPRITE.targetHeightCanvasUnits`(59) ÷ k。1/3 → 約 20 px，KayKit 角色縮到 20 px 已糊成一團（臉、斧頭、披風分不出來）；1/2 → 約 30 px 清楚可讀，接近 FFT 的角色像素量。對照：`tools/ui-e2e/out/pixel_sprites/cmp_heights_idle.png`（左到右 h=20、30、40，各兩格 idle），完整精靈表 `BLUE_WARRIOR_h30_zoom.png`。若堅持 1/3，就要把單位放大到約 90 canvas 單位或改用手繪像素角色。
- **P0b 像素化的審美預設**：14 色、飽和度 ×1.25、對比 ×1.15、外框＝最暗色 ×0.45（原本「用最暗色」實測太淺，與陰影同色會消失；這偏離 `ART_SPEC` §12-5 字面，接近黑但仍帶色相）。已知：野蠻人模型的毛帽在像素化後佔畫面太多、偏灰褐；正式做時可考慮換戰士模型或調整帽子顏色。
- **V2a 兩個樣板奧義**（請看影片判斷方向對不對，再批次套用到其餘 28 個）：`tools/ui-e2e/out/vfx/after/wb_u3_BLUE.mp4`（誓約勝利：日輪法陣 → 金色劍弧＋光柱＋日輪放射＋衝擊環 → 金色光點上飄）、`after/wr_u1_RED.mp4`（諸神黃昏：角骷髏烙印 → 火柱＋周圍火舌＋鋸齒斷裂環＋碎石 → 灰煙翻騰＋火星）。改前在 `before/` 同名檔。快速看：`after/*_tiles.png`（前 2 秒每 4 幀一格）。地面高度查詢已修，法陣現在對準目標。已知：地面法陣會蓋在目標腳上（地面特效以「前緣」排序，舊的法陣也一樣；要根治需在地形之後、單位之前另開一層貼地 pass）；火舌是平塗三層，偏卡通。
- **錄影工具修正**：`record-skill.mjs` 之前錄的奧義與主動技影片（tb_u1、tr_u2、mb_u1）**都沒有技能序列**（CAST_START 在 tick 外送出，被下一個 tick 清掉），只有詠唱光環。已修，舊影片作廢。
- **像素原型的取捨**（`ART_SPEC` §12-7）：地面 VFX 與光環留在像素層以保住遮擋順序；空中特效畫在世界之上、不再被前方物件遮住。鏡頭縮放尚未鎖整數倍級距。

## 6. 工作紀錄
- 2026-10-16 01:15 建立本檔。R1、R2 完成；R2 與極光修正在 `fix/ice-aurora` 待合併（使用者已授權合併並 push）。
- 2026-10-16 01:40 A0 完成：`fix/ice-aurora` 合併進 `main` 並 push（`f9f4ecc`），刪除已合併分支。開 `feat/art-vfx`。
- 2026-10-16 02:00 M0 完成：`docs/ART_SPEC.md`（素材分工、色盤、形狀與節奏語言、元素 × 陣營語彙、技能層級規則、零件清單、效能規則、科幻殘留清單）。
- 2026-10-16 02:10 加入三條規則（連續兩次相同錯誤就停、reviewer 子代理審查、子代理回報格式）。
- 2026-10-16 02:20 V1 加入確定性技能錄影工具（MP4＋GIF），供使用者遠端審查特效動態。
- 2026-10-16 02:45 使用者改定方向：像素世界＋現代特效。更新 `ART_SPEC` §1、§2、§12，新增 P0a／P0b，M1 改為像素地形。
- 2026-10-16 01:43 完成確定性技能錄影工具 `tools/vfx/record-skill.mjs`（已驗證 tb_u1、tr_u2、mb_u1、tb_b1）；另做 WebGL 後製原型 `tools/webgl-post-proto.html`／`.md`（RTX 4070 實測 2560x1440 上傳＋後製合計約 0.5～0.8 ms）。
- 2026-10-16 03:50 P0a 完成：像素世界原型 `?pixel=2|3`（預設路徑不變）。reviewer 審查找出兩點已修：光環／地面 VFX 原本被移到特效層會蓋過障礙物（改留像素層）；overlay／HUD 沒用對齊後的變換（改共用）。成本（1920×1080，`RenderPipeline.draw` 自身耗時中位數）：地形 0.6～1.2 ms，k=1/2/3 無明顯差異；戰鬥 2.7／3.3／2.6 ms。p99 受換地圖後烘焙干擾，不具比較性。
- 2026-10-16 04:40 V1 完成：特效零件庫 12 種零件＋LRU（條目＋64 MB 位元組預算）＋品質降階減影格（循環週期不變）。reviewer 審查找出並已修：bolt／sigil 光暈被外框裁切、血／深淵色階誤用加法混合、無作用的 seed 浪費快取、未使用的 FPS、零散魔術數字。新增 320 組參數的裁切檢查（0 裁切）。零件尚未接進遊戲，未跑 `perf:guard`（遊戲渲染路徑無變更）。
- 2026-10-16 05:10 P0b 完成：BLUE_WARRIOR 3D 轉像素測試（h=20／30／40，4 方向 × idle＋attack 各 4 格）。結論：1/3 密度下角色太小，建議改 1/2（見 §5）。只做測試素材，未接進遊戲。reviewer 審查後已修：對比基準改為全影格共用（原本逐格飄動）、放大圖改中灰底（看得見外框）、找不到影格時明確報錯、影格依數字排序。
- 2026-10-16 06:10 V2a 進行中：零件接進粒子系統，兩個樣板奧義完成並錄影對照。修正 `record-skill.mjs` 的 CAST_START 遺失（之前的技能影片都缺序列）。reviewer 審查無確認缺陷；採納其建議，光柱與火柱加 `groundAnchored` 貼地；預烘焙與高負載時主形狀被預算丟棄（既有行為）列入後續。發現既有 bug：VFX 地面高度用螢幕點選查詢，高台目標的地面特效會偏到前方低格（§4 第 1 項）。保真 6/6 PASS；`perf:guard` 效能段又落在內顯。
- 2026-10-16 06:30 修正既有 bug：VFX 地面高度改依足跡取格（`engine/renderer.ts` facade 內 closure，公開介面不變）。原本用螢幕點選 `getHexAtWorldPoint`，高台目標的地面特效落到前方低格；也讓 `collapsingTiles` 分支真正生效、每粒子少掉高度迴圈。reviewer 審查無缺陷。保真 6/6 PASS。重錄 wb_u3／wr_u1（`after/`）。
- 2026-10-16 使用者回覆 TBC（見 §5 決議）；`ART_SPEC` §13 新增詠唱／AOE 預警／中斷定義。發現 `CAST_BREAK` 播放未登記的 `FX_CAST_SHATTER`，於 `chore/dead-code` 修正。
- 2026-10-16 08:40 使用者：HD／SD 兩線都保留待測試；特效風格暫停待討論；未回覆項目記 TBC。
- 2026-10-16 09:10 perf 工具強制高效能 GPU；`perf:guard` 在 RTX 4070 通過。
- 2026-10-16 09:20 使用者：SD 效果不好，暫停；HD 為主線。
- 2026-10-16 09:30 使用者補充世界觀（六角世界、棋座＝實體、角色＝投影、法術六角化）；`ART_SPEC` §0、§1-5、§4、§7、§9 改寫。
- 2026-10-16 22:50 奧義零件化草稿批次（分支 `claude/art-vfx-ult-batch-710d46`，未經使用者確認樣板方向）：已轉 31 個奧義（30 個效果 id）——BLUE：tb_u1～u5、wb_u1、wb_u2、rb_u1、rb_u3、rb_u4、mb_u1、mb_u2（與 rb_u1 共用 GLACIAL_BURST）、mb_u3、sb_u1、sb_u2、sb_u4；RED：tr_u1～u5、wr_u3、wr_u5、rr_u2、mr_u1、mr_u3、mr_u4、sr_u1、sr_u2、sr_u4、sr_u5。新檔 `data/vfx/registry/ult_parts_{blue,red}.ts`；HEAVEN_FALL 類命中即爆發（落體＝起手），紋章改為落地烙印；`EmitterConfig.shape` 補上 VFXPlayer 已實作的 `'RING'`（六柱聖域等距排列）。未轉 17 個：STORM 12 個（wb_u4、rb_u2、rb_u5、mb_u4、sb_u3、sb_u5、wr_u2、wr_u4、rr_u3、rr_u5、mr_u5、sr_u3）——SkillSequences 會把同一效果重播 10～20 次，需另設計單次「小落點」零件並核對 VFX_BUDGET；BEAM_SNIPE 5 個（wb_u5、mb_u5、rr_u1、rr_u4、mr_u2）——光束本體走 BEAM style，需新的光束零件。錄影 `tools/ui-e2e/out/vfx/<id>_<TEAM>.mp4`／`_sheet.png`（gitignore），只看過接觸表抓明顯錯誤，未細修。lint／test／build 綠。
- 2026-10-16 奧義零件化完成（同分支；使用者已認可樣板方向）：剩下 17 個也轉完，`FX_ULT_*` 舊條目已全數移出 `imperial.ts`／`covenant.ts`。STORM 12 個（wb_u4、rb_u2、rb_u5、mb_u4、sb_u3、sb_u5、wr_u2、wr_u4、rr_u3、rr_u5、mr_u5、sr_u3）：SkillSequences 在同一點重播 N 次，所以每個效果改為 3～5 粒子的小落點，散佈靠 CIRCLE；陣營紋章經新欄位 `UltVisualDef.windupFx` 每次施放只播一次（`FX_ULT_{BLUE,RED}_STORM_SIGIL`）。BEAM_SNIPE 5 個（wb_u5、mb_u5、rr_u1、rr_u4、mr_u2）：只換命中點；光束本體仍是程序化 BEAM（`ProceduralPainter`，style 參數未使用），要換需新增光束零件，列入待辦。發現 skill 的 `visualHitEffect` 引擎從未播放（只有 Validator 檢查），奧義特效只經 SkillSequences 播；BEAM_SNIPE 原本把 vfxOverride 只當光束 style，命中特效從來沒出現過——改為以 vfxOverride 取代通用 SHOCKWAVE 命中粒子。既有時序（未改，屬 `engine/systems/VisualSystem.ts`）：奧義序列在 CAST_START 就整串播放，施法 2 秒的 rr_u4／mr_u2 命中特效比傷害早約 2 秒；被打斷的施法也照播。wr_u4 骨刃轉 90° 直立；rr_u2 火柱縮小。保真 6/6 PASS。另：`SequenceSystem` 的 PARTICLE 不帶 `scale`，`ult_visuals` 的 scale 對特效尺寸無效（註解寫的倍率是誤導）。檔案 `data/vfx/registry/ult_parts_storm.ts`。錄影同前路徑。
- 2026-10-17 普攻／主動技零件化（分支 `claude/skill-vfx-3e2b78`）：
  - **資料模型**：新增 `data/vfx/beam_styles.ts`（`BEAM_STYLES`：GENERIC_BEAM／SLASH_CONNECT／DEATH_RAY／HOLY_RAY／LIGHTNING_BEAM／BLOOD_LINK）；`ACTIVE_VISUALS.vfxOverride` 拆成 `impactFx`（登記鍵）與 `beamStyle`；`BASIC_VISUALS` 只留 `beamStyle`；投射物 id 以技能的 `visualProjectileEffect` 為唯一來源。棘輪基準 `vfx.sequenceParticle`／`sequenceFallback`／`beamStyle`／`libraryCatalog`、`projectile.skillKey`／`sprite`／`orphan` 全部歸零（原 80 條），並新增「`impactFx`／奧義 `vfxOverride` 必須已登記」硬性斷言。
  - **新發現並修正的引擎問題（小改）**：①`HIT_FX` 原本對所有技能寫死陣營預設特效，技能自己的 `visualHitEffect` 從未播放；現在普攻與投射物主動技播自己的。②普攻沒有 CAST_START，所以普攻序列（斬擊弧、光束）從未播；現在近戰／瞬發普攻發 `VISUAL_BEAM` 事件觸發序列。③光束粒子 `size` 為 0，所有光束都是 1px 細線；`playBeam` 現在依 `BEAM_STYLES.width × scale` 設寬，DEATH_RAY 類才有虛線邊（奧義光束 scale 乘 0.35 以免突然變很粗，待實機確認）。④命中特效的看板零件放在受擊者身體高度，貼地環落在格子地面。
  - **視覺決策（美術品味由我定，使用者可翻案）**：普攻＝閃光＋一道六角環＋2～4 個碎屑／火花，≤0.4 s、≤8 粒子、無震動、無格子脈衝；主動技＝紋章（日輪／獅盾／倒三角／角骷髏）＋閃光＋環／柱／火舌＋殘留，≤0.8 s；AOE 的環終半徑對齊範圍。獅心環乾淨、金白；灰燼環鋸齒、碎石／煙塵／血滴。有投射物的主動技，主特效在投射物抵達時播（以前在詠唱開始就在目標點播）。
  - **新檔**：`data/vfx/registry/basic_parts.ts`（11 個命中＋共用 helper）、`active_parts.ts`（10 個主動特效＋4 個起手預兆）。舊的粒子版已從 `imperial.ts`／`covenant.ts` 移除。
  - **改名（V3）**：`FX_HIT_BLUE_TECH`→`FX_HIT_BLUE_LIGHTNING`、`FX_ACTIVE_BLUE_TECH_SHIELD`→`…_AEGIS_WARD`、`…_TECH_BURST`→`…_RADIANT_BURST`、`PROJ_BLUE_SNIPER`→`PROJ_BLUE_LIGHT_ARROW`、`GRID_TECH_BLUE`→`GRID_HEX_BLUE`。
  - **錄影**（`tools/ui-e2e/out/vfx/hit/<id>_<TEAM>_hit.png`，gitignore；12 格時間序，`tools/vfx/record-skill.mjs --zoom=2.6 --crop=400 --keep-frames` 後以 ffmpeg tile 拼）：BLUE 普攻 tb_b1／wb_b1／rb_b2／mb_b2／sb_b1，BLUE 主動 tb_a2／wb_a1／rb_a1／mb_a1／sb_a2，RED 普攻 tr_b1／wr_b1／rr_b4／mr_b3／sr_b1，RED 主動 tr_a3／wr_a5／rr_a1／mr_a1／sr_a4。目視檢查：wb_b1（聖雷＋金環＋火花）與 rr_a1（熔岩噴發）清楚正確；tb_a2、tr_a3 的取樣窗口多半落在特效前後（錄影場景有出生光柱與紅色 AOE 預警干擾），未能判定，需用 mp4 或調整起始格再看。未見破圖或崩壞。
  - **已知**：火柱「jagged」多層疊出的條紋偏重（rr_a1 末格）；Ashen 主動技的色彩辨識度要看實機；`ACTIVE_VISUALS.count` 欄位已無作用。
- **Wave-2 美術收尾（2026-10-17，主代理定品味、FFT 為參照：清晰、俐落、有力）**：
  - **ASH_VOID 色階提亮**（`vfxPalette.ts`）：core `#dc2626`→`#f0abfc`、main `#3b0764`→`#7e22ce`、dark `#000000`→`#2e1065`。灰階圖（`parts-sheet.mjs --gray`）上光暈／星芒／陣紋／六角碎片都讀得出來，仍是紫色深淵調，與 ASH_FIRE（橘）、LION_ARCANE（藍）分得開。
  - **火焰維持平塗三層＋外層細亮邊**（`PartBakers.bakeFlame`，`VFX_PARTS.FLAME.RIM_WIDTH／RIM_ALPHA`）：以 ramp.core 描外層輪廓，只在烘焙時畫，零每幀成本。
  - **光束吃陣營色階**（`data/vfx/beam_styles.ts` 的 `FACTION_BEAM_RAMP`：獅心＝LION_HOLY 金白、灰燼＝ASH_BLOOD 緋紅）：`SequenceSystem` 依施放者陣營傳入 `playBeam`，管身取 ramp.main、最內芯取 ramp.core（`Particle.beamCore`）；仍是程序化繪製，管身漸層快取沿用（芯色另按 inner 分快取）。取捨：治療等原本綠／紫的光束現在也依陣營變金／緋紅。
  - **職業圖示改幻想向量符號**（`data/units/classGlyphs.ts`＋`UnitFactory.drawClassGlyph`）：TANK 盾、WARRIOR 劍、RANGER 弓、MAGE 法杖寶珠、SUPPORT 聖杯；獅心＝圓角乾淨（`CLEAN`），灰燼＝鋸齒破損（`JAGGED`），風格由 `FactionSkin.classIcon.glyph` 決定。`classIcon` 貼圖槽覆蓋路徑不變。
  - **驗證圖**（`tools/ui-e2e/out/`，gitignore）：`vfx/before_gray.png`／`parts_sheet_t0_gray.png`（ASH_VOID 前後）、`faction/before_pedestals.png`／`after_pedestals.png`（圖示前後）、`vfx/beam_blue_after.png`、`vfx/mr_b2_RED_sheet.png`。`battle_frozen` 差異 0.122（過門檻）；因圖示刻意改變而另開 commit 重錄。

## 狀態／控制效果零件化（2026-10-18）
- 表：`data/vfx/status_parts.ts`（`STATUS_PARTS`，每個 `STATUS_VISUALS` 鍵一筆；錨點 GROUND／BODY／HEAD、繞行／上升／脈動／抖動、優先序、品質階層截斷）。繪製：`StatusPartPainter`（只做 drawImage，sprite 依隊伍／版面／狀態快取，每幀不配置）；成立條件：`StatusActivity.isStatusActive`。
- 強控各有獨立剪影：暈眩＝頭上繞行三顆金色六角星；沉默＝灰環被紅斜線劃掉；恐懼＝顫抖的紫色骷髏；嘲諷＝彈跳的紅色倒三角＋放射光；致盲＝繞頭的黑煙；禁錮＝腳下琥珀環＋棘刺；凍結＝冰環＋繞身冰晶（模型仍是冰塊）；變羊＝粉色日輪＋上升光點（模型仍是羊）；凝滯＝金藍稜柱＋上下六角環；放逐＝紫色稜柱＋繞行晶片；無敵＝金色放射光＋日輪＋頭頂光環。弱效果（中毒、燃燒、再生、易傷）與施法提示低調。護盾維持 `ShieldPainter` 的 `computeShieldGeometry`。
- 已刪：`GroundEffectPainter`、`OverheadPainter`、`StateModelPainter`、`AgentVFXSystem.processStatusVFX` 與 `STATUS_VISUALS.particleEffect`。`FX_STATUS_ROOT_LOOP` 仍當擊飛塵土用。
- 截圖表：`node tools/vfx/status-sheet.mjs`（輸出 `tools/ui-e2e/out/status_sheet.png`）。
- 變羊的羊（原 `getSpecialModel('SHEEP')` 白雲）與凍結冰塊已重做：`PolymorphPainter`（毛球羊，站在腳底）與 `FrozenPainter`（六角冰塊），尺寸與顏色在 `data/units/appearance/ccBody.ts`。
