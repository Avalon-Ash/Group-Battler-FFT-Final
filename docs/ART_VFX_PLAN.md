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
| P0b | 3D 轉像素測試：用 Blender 管線把 1 個 KayKit 角色（任一陣營戰士）以 P0a 選定的像素密度渲染 4 方向待機＋攻擊幾格，限色盤＋1px 外框，輸出精靈表與放大檢視圖；只做測試素材，不接進遊戲 | 待做 | |
| V1 | 特效零件庫：程序化、預烘焙、可參數化的零件（光暈、衝擊環、斬擊弧、火焰舌、煙團、符文圈、光柱、火花拖尾、獅紋日輪、角骷髏符印），含品質分級與單元測試；做一個預覽頁輸出零件總表截圖。**另做錄影工具 `tools/vfx/record-skill.mjs`**：沿用保真工具的確定性 harness（`addInitScript` 注入 `__resetSeed`／`__stepFrames`），指定技能 → 固定亂數 → 逐幀推進截圖 → 本機 ffmpeg 編成短 MP4（另出一張 GIF 方便手機看）；之後 V2 每個技能都用它產出前後對照影片 | 完成（04:40）：錄影工具＋零件庫 12 種（`engine/renderers/vfxparts/`、參數 `data/vfx/parts/partConfig.ts`、色階 `data/vfx/parts/vfxPalette.ts`）、18 個單元測試、預覽頁 `tools/vfx/parts-preview.html`、總表＋裁切檢查 `node tools/vfx/parts-sheet.mjs [--tier=N]` | `tools/ui-e2e/out/vfx/parts_sheet_t0.png`／`_t0_gray`／`_t3`／`_t3_gray` | |
| V2a | 奧義技能逐一重做（`data/vfx/ult_visuals.ts`、`SkillSequences.ts`），每個技能存 4 格時間序截圖，並用 `record-skill.mjs` 錄改前／改後影片 | 待做 | |
| V2b | 主動技能重做（`active_visuals.ts`） | 待做 | |
| V2c | 普攻、投射物、命中特效（`basic_visuals.ts`、`projectiles/*`） | 待做 | |
| V3 | 移除科幻殘留：掃描線、Glitch 喊招、六角稜柱護盾改為陣營護盾；`*_TECH_*` 鍵名改名；用 `perf:attribution` 或 VFX 風暴場景確認 p99 不比現在差 | 待做 | |
| M1 | 地形改像素化程序烘焙（取代 AI 貼圖，依 P0 結果與 `ART_SPEC` §12） | 待做 | |

## 4. 下一步
P0b（3D 轉像素測試，Blender 管線）→ V2a（奧義重做：用 `vfxPartStore.get()` 取零件、呼叫端持有 sprite，不要每幀每粒子 get；用 `partFrameAt(sprite, t)` 取影格；每個技能 `record-skill.mjs` 錄改前／改後）。V2 開工前先讀 `data/vfx/ult_visuals.ts`、`SkillSequences.ts` 與 `engine/systems/vfx` 的繪製入口，決定零件在哪一層接入（建議新增一種 VFX 粒子 type 直接畫 PartSprite）。P0 的密度選擇寫進 §5 等使用者早上確認，不必等確認就可以繼續 V 系列。

## 5. 待使用者確認（早上看）
（自動工作階段在這裡累積需要使用者決定或審美確認的項目，附截圖路徑。）
- **技能名稱的科幻殘留**（`ART_SPEC` §9 最後一列）：「系統超載」「軌道轟炸」「戰術核彈」「電擊警棍」「雷射標記」「量子護盾」「戰術加速」等。特效會照奇幻語彙重做，但名稱屬遊戲設計，要不要改名、改成什麼，由使用者決定。
- **地形與陣營色盤**（`ART_SPEC` §3）是主代理選的預設，M1／V 系列會照它做；若想換色調，改這張表即可。
- **像素密度**（1/2 或 1/3）：預設暫選 **1/3**（`ART_SPEC` §12 原定值，像素感最接近 FFT；1/2 偏「高解析像素」、細節較多）。開 `http://localhost:3000/?pixel=3` 或 `?pixel=2` 實機看。截圖（1920×1080）：`tools/ui-e2e/out/pixel/<VOID|FOREST|ICE|MAGMA|DESERT>_k<1|2|3>.png`、`battle_k<1|2|3>.png`；中央裁切三欄對照（左 k1、中 k2、右 k3）`cmp_FOREST.png`、`cmp_MAGMA.png`、`cmp_battle.png`。注意：現在的地形貼圖與精靈是高解析素材直接縮小，所以看起來是「模糊方塊」而不是像素美術；真正的像素感要等 M1（像素地形）與 P0b（3D 轉像素）。每次重建地圖亂數不同，三欄不是同一張地圖。
- **`perf:guard` 的效能段落連兩次落在 AMD 內顯（副螢幕）而判無效**（保真段 6/6 PASS，證明預設路徑畫面不變）。依規則停止重試，未設 `PERF_ALLOW_ANY_GPU`。`pixel-proto.mjs` 的成本數字很可能也是內顯量的。請把 Edge 視窗固定在主螢幕或在 Windows 圖形設定指定高效能後重跑 `npm run perf:guard`。
- **特效零件總表**（V1）：`tools/ui-e2e/out/vfx/parts_sheet_t0.png`（灰階 `_gray`）。主代理選的預設：獅心＝乾淨圓環、日輪 12 道長短交錯、騎士盾＋十字＋三尖冠；灰燼＝鋸齒斷裂環、角骷髏、倒三角符文。血、瘴氣、深淵三種色階用一般混合（不發光）。已知：深淵（ASH_VOID）在灰階下偏暗，靠形狀辨識；火焰是平塗三層，偏卡通，若想更寫實可改成柔邊。
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
