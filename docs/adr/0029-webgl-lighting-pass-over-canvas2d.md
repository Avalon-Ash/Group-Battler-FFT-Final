# 0029 在 Canvas 2D 畫面之上加 WebGL 打光與後製

狀態：採用
日期：2026-11-28
取代：0001

## 背景

使用者 2026-11-27 指出戰場畫面「亂而平」，並以 Cinderwatch（前向渲染、冷色月光加暖色點光、陰影、泛光、調色）為對照。
`npm run perf:layers` 量到 FOREST、ICE、DESERT 的地形與障礙物比單位亮；在 Canvas 2D 內壓暗環境、加六角光池（`docs/plans/visual-experiment.md` §9～§12）之後，
光仍然只是蓋在圖上的一層顏色：不依距離衰減、不被物體擋住、不照出物體的受光面。這三件事需要逐像素運算，Canvas 2D 沒有著色器。
使用者 2026-11-28 同意推翻 0001 並接進引擎（原話：「0001 改！畫面證明自己鎖死自己沒意義。抓眼睛最重要」「接進去跑看看」）。

## 決定

- 取代 0001 的第一條（禁用任何 WebGL）。0001 的另外兩條由本份接手，內容不變：特效一律走預烘焙零件；執行期渲染路徑維持 0 個每幀 `shadowBlur`。
- 世界畫面仍由現有 Canvas 2D 管線畫出；另加一個 WebGL2 全螢幕通道做打光與後製（環境光、方向光、點光、地面投影、泛光、色調映射），HUD 不打光。
- 不引入 Three.js、Pixi.js 或其他渲染函式庫，只用瀏覽器的 WebGL2 API；WebGL 程式碼只放在 `engine/renderers/lighting/`。
- 光源、顏色、強度集中在 `constants/lighting.ts` 一張表；著色器只讀它。
- 打光通道關閉（`?lit=0`）、WebGL2 或 `EXT_color_buffer_float` 拿不到、只有軟體算圖、context 遺失時，走原本的 Canvas 2D 路徑，畫面與沒有這個通道時相同。
- 預設桌機開、觸控裝置關；自適應品質降到解析度階層（跑不動）時自動關掉，這個頁面不再打開。網址 `?lit=1` 可以強制開。
- 光源與投影物的位置由引擎每幀提供（`UnitFrame` 與 render list），不從畫面反推。

## 放棄的做法

- 只在 Canvas 2D 內做（壓暗環境、地格光層、離屏光照圖）：做得到明暗與冷暖，做不到依距離衰減的受光面與投影。
- 整個渲染器改寫成 Three.js 或 Pixi.js：150 招特效零件、座標協議（`engine/renderers/RenderSpec.ts`）與保真基準都要重做，原型沒有證明需要。

## 後果

- 採用時還沒有的：單位與障礙物的烘焙法線圖（輪廓法線先由直立物遮罩估計）、iPhone 實機幀時間。手機要不要預設開，實機量測後由使用者決定。
- 原型在桌機 RTX 4070、1280×720 量到打光加後製每幀 0.22～0.41 ms；內顯（無頭 Edge、AMD Radeon 內顯、1280×720）量到引擎版讓 33 FPS 掉到 17；手機 GPU 已是瓶頸（HANDOFF §2 I）。
- 多出全畫面的離屏畫布與 HDR 貼圖，手機記憶體要量（`docs/METHODOLOGY.md` §4 第 13 條）。
- 保真基準只對應 Canvas 2D 路徑；打光開啟時的畫面沒有基準，方向定案後才重錄。
- 分階段做法與每階段的退路在 `docs/plans/lighting-pass.md`。

## 證據

- `docs/plans/visual-experiment.md` §7～§13
- `docs/plans/lighting-pass.md`
- 離線原型：commit `819386b8`（離線重打凍結幀的探針，引擎版完成後已刪）
- `engine/renderers/lighting/LightingPass.ts`
- `constants/lighting.ts`
- `tools/ui-e2e/lit-shots.mjs`
- `tools/ui-e2e/layer-luma-probe.mjs`
- `docs/adr/0001-canvas2d-and-prebaked-vfx.md`
