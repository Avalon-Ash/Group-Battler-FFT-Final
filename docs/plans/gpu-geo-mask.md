# 精靈改由顯示卡畫：第一片幾何遮罩（2026-11-28）

> 主席 Opus 5.5（原工作階段 Fable 開的線，派工見 `docs/plans/lighting-cost.md` §5 C5）。分支 `feat/gpu-geo-mask`，WORKLOG §2 DV，ADR 0032。
> 使用者 11-28：「現代化」「光是真的光、精靈由顯示卡畫」；「新製程需求和舊 ADR 衝突時主代理直接決定」；「舊的管線真的沒用了可以拔掉，不需要併行」。

## 1. 目標

打光開啟時，告訴著色器「這個像素是直立物、離腳底多高、是不是單位、橫向在哪」的幾何遮罩，不再用 Canvas 2D 把單位與障礙物再畫一次進暫存畫布、整張上傳，改由 WebGL 用 instanced quad 直接畫進一張貼圖。
這是 C5（精靈由顯示卡成批畫）的第一片，也是之後烘焙法線圖（單位有真的受光面）的地基：法線圖接進來時，只是同一個 instance 多取樣一張圖。

不在這一片：特效遮罩與玩法標示遮罩（含直立物在上面挖洞）、世界本體、法線圖。這一片不改任何座標、高度、排序鍵。

## 2. 改之前的路徑（讀碼確認過的接點）

- `RenderPipeline.drawWorld` 每分發完一個 op 呼叫 `LightingPass.tag(op, …)`（`engine/renderers/RenderPipeline.ts`，dispatch 的下一行）。
- `tag` 的 UNIT 分支：章的世界矩形＝腳底 `UnitFrame.footX／floorY`、半寬＝（`floorY − hudAnchorY`）× `GEO.UNIT_HALF_WIDTH`、上緣 `floorY − GEO.MAX_HEIGHT`、高 `MAX_HEIGHT ×（1 + FOOT_PAD）`。`beginItem` 在暫存畫布上配一格、裁切到格子與章的矩形；`UnitRenderSystem.drawSilhouette`（`engine/presentation/unit/UnitSystem.ts`）以 `GEO.UNIT_COVERAGE` 畫剪影；`endItem` 用 `source-atop` 蓋漸層章（`makeStamp`，64×64）。
- OBSTACLE 分支：章的矩形＝`op.tx ± max(anchorX, width − anchorX)`（`SpriteManager.getObstacleSprite`），上緣 `op.ty − MAX_HEIGHT`；`RenderDispatcher.dispatch` 照原樣畫整個障礙物 op（本體＋`lighter` 疊層）。
- `present` 先 `flushItems`（暫存畫布每一格照繪製順序貼進幾何遮罩），再把幾何遮罩畫布整張 `texImage2D` 上傳，著色器（`shaders.ts` 的 `surfaceChunk`）讀 `tGeo`：`rgb ÷ a` 得高度、單位、橫向，`a ≥ 0.5` 算直立物。
- 剪影的切片與變換只存在 painter 裡：`SpriteUnitRenderer.draw`（`resolveFrame` 選影格與 mip、`computeSpriteDrawRect` 算目的矩形）與 `PolymorphPainter.draw`；外面那一串變換在 `UnitRenderSystem.drawAssembly`（平移到腳底、墜落淡出）與 `UnitBodyPainter.draw`（身體中心、墜落翻滾縮小、奧義脈動、出生下落與淡入、`UNIT_SCALE`、傾斜、浮動、暈眩擺動）。

## 3. 架構

### 3.1 資料從 painter 到 GL：`SpriteCapture`（單一出處的查詢介面）

`engine/renderers/SpriteCapture.ts`（進入點，不碰 WebGL）。painter 貼精靈時呼叫 `SpriteCapture.blit`／`blitWhole` 取代 `ctx.drawImage`：
- 平常照常 `drawImage`。
- 畫在擷取畫布（`SpriteCapture.begin(相機變換)` 回傳的 1×1 畫布）上時，不畫、記下來：來源圖、來源矩形、局部目的矩形、當下畫布變換（a～f，裝置像素）、`globalAlpha`、是不是 `lighter`。
- 呼叫點只有三處：`SpriteUnitRenderer.draw` 與 `PolymorphPainter.draw` 的剪影分支、`RenderDispatcher` 的 OBSTACLE（本體與加法疊層）。

所以「單位剪影貼哪一塊、貼在哪、轉多少、多透明」的查詢＝`units.drawSilhouette(SpriteCapture.begin(cam), frame, t, layout)` 跑一次 painter 自己的程式，打光目錄裡不重算任何一個數字。擷取畫布從不點陣化（1×1、不畫），只累積變換；不是 `blit` 的繪製（圖集沒載入時的備援圓形）畫在它上面等於沒畫。

### 3.2 每幀的 instance

`engine/renderers/lighting/GeoMaskGpu.ts`。每張擷取到的貼圖一個 instance，五個 vec4：

| 欄 | 內容 |
| :-- | :-- |
| `iM0`、`iM1.xy` | drawImage 當下的畫布變換 a,b,c,d,e,f（裝置像素，含 DPR、鏡頭、旋轉與縮放） |
| `iM1.z`、`iM1.w` | 覆蓋率（擷取到的不透明度 × 單位 `UNIT_COVERAGE`／障礙物 1）、是不是單位 |
| `iDst` | 局部目的矩形 dx, dy, dw, dh |
| `iUv` | 來源矩形換成貼圖座標（貼圖上傳時上下翻轉，v 跟著翻） |
| `iStamp` | 章的世界矩形 x0, y0, 寬（腳底＝y0 + MAX_HEIGHT），由 `tag` 照舊路徑同一套規則給 |

頂點著色器（`shaders.ts` `GEO_VERT`）把局部矩形四角乘上變換、再乘 `MASK_SCALE` 換成遮罩像素；片段著色器（`GEO_FRAG`）把像素換回世界座標，章矩形外 `discard`（舊路徑的裁切），算 r＝`max(0, 1 − (y − y0) / MAX_HEIGHT)`、g＝是不是單位、b＝`(x − x0) / 寬`（漸層章的解析式，舊路徑是 64 格拉伸），輸出預乘 alpha。

疊合：一律預乘的 source-over（`ONE, ONE_MINUS_SRC_ALPHA`），順序＝繪製順序；障礙物的加法疊層（glint／glow）也是 source-over（見 §5）。同一張來源圖的連續 instance 合成一次 `drawArraysInstanced`（WebGL2 沒有 baseInstance，每段重設屬性指標）。不依貼圖重排（單位疊在障礙物前面時 g 要照順序混）。

### 3.3 圖集怎麼變成貼圖、記憶體

- 第一次用到某張來源圖（`HTMLCanvasElement`、`HTMLImageElement`、`ImageBitmap`、`OffscreenCanvas`）時 `texImage2D` 上傳一次，之後不再上傳；只存 alpha（`gl.ALPHA`，一像素一位元組），幾何遮罩只用形狀。
- 尺寸變了重傳；`GEO.TEX_IDLE_FRAMES`（600）幀沒用到就刪（`SpriteAtlasStore` 釋放圖集時把畫布寬高設 0，下一次就對不上、不會再用）。context 還原時整個 `GeoMaskGpu` 重建。
- 量到的（geo-compare 探針，量測場景 10 單位、18 障礙物）：22 張來源圖、alpha 貼圖合計 13,498,780 位元組（約 12.9 MiB；RGBA 是 53,995,120）。遮罩貼圖本身 RGBA8、遮罩解析度（2560×1440 時 1280×720，3.5 MiB），取代原本同尺寸的 Canvas 2D 幾何遮罩畫布與它的上傳貼圖。
- 上限：一幀 `MAX_CASTERS × GEO.GPU_BLITS_PER_ITEM` 張，超過的丟掉並記在 `stats.dropped`。

### 3.4 舊路徑

比對通過之後已刪除（commit `77f31973`；使用者：「舊的管線真的沒用了可以拔掉，不需要併行」）：`beginItem`／`endItem`／`flushItems`、漸層章、暫存畫布與它的常數（`GEO.STAMP_SIZE`）、幾何遮罩畫布與上傳、比對旗標（`?geogpu=1`）、`perf:lit-cost` 只對舊路徑有意義的做法。遮罩貼圖建不起來時整個通道停用（和 render target 建不起來同一條路）。打光關閉（`?lit=0`、WebGL2 拿不到、context 遺失期間）走 Canvas 2D 直接路徑不變，那不是這條舊路徑。

## 4. 分階段

| 階段 | 內容 | 驗收指令 | 退路 |
| :-- | :-- | :-- | :-- |
| G1（這一片） | 幾何遮罩由 GL 畫 | geo-compare 探針（新舊同一幀逐像素）；`npm run perf:lit -- --walk 60` 和 main 比；`node tools/ui-e2e/lit-cost.mjs --repeat 2`；`perf:guard` 保真六張不變 | revert 這一片的 commit |
| G2 | 法線圖：Blender 多烘一張法線圖集（矩形和原圖集逐一相同），同一個 instance 多取樣一張，輸出到第二個附件；`surfaceChunk` 的輪廓法線改讀它 | 盲評；`perf:lit` 對照板；`perf:lit-cost` | 法線貼圖拿不到時退回輪廓法線 |
| G3 | 特效遮罩與玩法標示遮罩：特效零件（`drawPart`）與柔光格也經 `SpriteCapture` 成批畫；直立物挖洞改在著色器（讀幾何遮罩）或照順序畫進同一個附件 | 同 G1，加 `perf:vfx-strip --lit` | 各遮罩各自可退回 Canvas 2D |
| G4 | 世界本體：地塊、單位、零件由 GL 畫，Canvas 2D 只剩 HUD 與程序化疊層 | 要另一組保真基準（打光開啟）；推翻 0029「世界仍用 Canvas 2D 畫」要新 ADR | — |

G3、G4 之前要先決定：鋪設（`GroundDrape`）的三色六角遮罩在 GL 上怎麼做（survey §3.3）、`overlay`／`soft-light` 混合要讀目的像素。

## 5. 已知風險

- **第一次用到圖集的那一幀**會上傳整張圖集（量測場景 22 張、alpha 共 12.9 MiB）；畫面上第一次出現某職業、某障礙物時可能卡一下，沒有量。手機上更明顯（推論）。
- **顯示卡記憶體多一份**：圖集在 Canvas 2D 那邊本來就有一份，GL 這邊多一份 alpha（量測場景 12.9 MiB）。手機（`perf:mem`）沒量。
- 圖集畫布若在原地重畫而尺寸不變，GL 那份會是舊的（目前讀碼沒看到這種寫法；`SpriteAtlasStore` 釋放時設寬高 0、換陣營色是另一張畫布）。
- 圖集沒載入時單位畫備援圓形，GL 路徑不擷取它（那一刻幾何遮罩沒有這個單位）；舊路徑會把圓形畫進遮罩。只在載入前那幾幀。
- 障礙物的加法疊層：舊路徑是「疊層先以 lighter 加進自己那一格（alpha 相加封頂）、整格再 source-over」。GL 先用 `ONE, ONE` 照做，比對在 ICE（7 個疊層）、MAGMA（16 個）量到障礙物內部 r／b 差到 113：章的顏色加到超過覆蓋率。改成一律 source-over 之後內部 r／b ≤2；剩下的差是疊層光暈和本體都半透明的那一圈（alpha 是 1 −（1 − a₁）（1 − a₂），舊路徑是 min(1, a₁ + a₂)）。
- 單位剪影的位置沿用舊路徑：腳底 `footX／floorY` 不含轉場位移、不經 `snap`，和世界畫布的單位（`snap(op.ty)`）差次像素，轉場中差一個轉場位移。這是既有的，這一片不改。
- 只量了桌機 RTX 4070；WebKit／iOS 上 `gl.ALPHA` 從畫布上傳、instanced 繪製都沒有實測。

## 6. 比對與量測（G1）

全部在這台機器（RTX 4070，`UNMASKED_RENDERER_WEBGL` ＝ `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`）、開發伺服器。探針不進版控（`tools/ui-e2e/out/`）。

| 量什麼 | 數字 | 指令 |
| :-- | :-- | :-- |
| 同一幀新舊幾何遮罩（`readPixels` 讀著色器實際取樣的兩張貼圖，預乘位元組；5 幀、間隔 20 幀，2560×1440） | 內部（3×3 鄰域 alpha 相同）alpha、g 差 0，r／b 最多 2；alpha 差 >2 的 561～635 px（直立物像素約 11.7 萬），最大 46，全在直立物邊緣；每幀 28 個 instance（10 單位、18 障礙物）、26 次繪製，其中 0～2 個單位帶旋轉 | `node tools/ui-e2e/out/geo-compare.mjs`（`geo-compare/diff_*.png`、`sheet_0.png`） |
| 同上，`perf:lit` 那一幀（1280×720） | 內部 0／0／2；alpha 差 >2 的 290 px（直立物 2.9 萬） | `node tools/ui-e2e/out/geo-compare.mjs --shots --frames 1` |
| 旗標關（舊路徑）和 main 的最終畫面 | 打光 6 張 0 px；`lit=0` 6 張 0～2 px（max 1）；連續格 10 px（max 1） | main 與分支各跑 `node tools/ui-e2e/lit-shots.mjs --walk 60`，`tools/ui-e2e/out/geo-pixdiff.py` 逐像素比 |
| 旗標開（GL）和旗標關的最終畫面 | 打光 6 張 1.1～4.0% 像素有差，差 >8 的 69～635 px（最大 95～125）；連續格 2.8%（>8 的 254 px）。差 >8 的在單位與障礙物邊緣（兩個單位重疊的邊也算；看過 battle_frozen、ICE、MAGMA 三張差異圖）。差 1 的約 3.4 萬 px 散在直立物周圍，推論是泛光與特效餘光把邊緣差異抹開（沒有拆開驗） | 同上加 `--query '&geogpu=1'`（`geo-on-diff/battle_sheet.png`） |
| 打光的額外成本 | 同一次執行：full 9.915、geo_gpu 9.665（−0.25，雜訊 0.656）、direct 6.544、full_again 9.965 ms：在雜訊內 | `node tools/ui-e2e/lit-cost.mjs --repeat 2 --only direct,geo_gpu,full_again` |

比對通過後刪掉舊路徑（§3.4）。刪除之後的數字見 §7。

## 7. 刪掉舊路徑之後

| 量什麼 | 數字 | 指令 |
| :-- | :-- | :-- |
| 刪舊路徑後的打光畫面和刪之前的 GL 路徑（`geo-on`） | 打光 6 張 0～1 px、連續格 0 px | `node tools/ui-e2e/lit-shots.mjs --walk 60 --out geo-final`，`geo-pixdiff.py geo-on geo-final` |
| 刪舊路徑後的 `lit=0` 和 main | 6 張 0～2 px（max 2，ICE） | 同上，和 `geo-main` 比 |
| 疊層改 source-over（commit `20536300`）之後的打光畫面和舊路徑 | 6 張 0.86～3.99% 像素有差，差 >8 的 69～635 px；VOID、ICE 比改前少（9,904 → 7,932、11,746 → 11,368 px），MAGMA 差 >8 的 102 → 137 px；看過 MAGMA、VOID 差異圖，在單位與障礙物邊緣 | `node tools/ui-e2e/lit-shots.mjs --walk 60 --out geo-final2`，和 `geo-off` 比 |
| 保真（`lit=0`，Canvas 2D 路徑） | 分支 VOID 0.207、FOREST 0.695、ICE 0.359、MAGMA 0.668、DESERT 0.529、battle_frozen 0.000；**同一天 main 跑出完全相同的六個數字**，`fe44cf45` 也相同；battle_frozen 的擷取圖 main 與分支 0 px 差。以前記的 0.296／0.659／0.302／0.614／0.500／0.177 今天在 main 上重現不出來（瀏覽器與 GPU 字串和以前的紀錄相同），是環境漂移，不是這個分支 | `npm run perf:fidelity`（main、`fe44cf45`、HEAD 兩次；`npm run perf:guard` 兩次） |
| e2e | 第一次 3 項紅（PLAY 桌機 K3「左鍵拖曳只送一個指令、不拖鏡頭」、iPhone 橫向 K4「技能鈕拖到敵人放開」、iPhone 橫向「瞄準時點敵人」）；重跑一次全過 | `npm run e2e:ui` |
| 打光的額外成本（單獨一次，不和 §6 那次比） | full 9.853、direct 6.550、full_again 9.786 ms；full − direct 3.30 ms | `node tools/ui-e2e/lit-cost.mjs --repeat 2 --only direct,full_again` |

成本：新舊路徑只在 §6 那一次執行裡同時量過（−0.25 ms，雜訊 0.66），在雜訊內。這一片沒有讓打光變便宜；省時間要等特效遮罩（鋪設 0.9 ms、特效 0.6 ms，`lighting-cost.md` §4.2）也搬過來（G3）。
