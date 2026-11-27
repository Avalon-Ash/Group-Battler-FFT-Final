# 0029 在 Canvas 2D 畫面之上加 WebGL 打光與後製

狀態：提議
日期：2026-11-28

## 背景

使用者 2026-11-27 指出戰場畫面「亂而平」，並以 Cinderwatch（前向渲染、冷色月光加暖色點光、陰影、泛光、調色）為對照。
`npm run perf:layers` 量到 FOREST、ICE、DESERT 的地形與障礙物比單位亮；在 Canvas 2D 內壓暗環境、加六角光池（`docs/plans/visual-experiment.md` §9～§12）之後，
光仍然只是蓋在圖上的一層顏色：不依距離衰減、不被物體擋住、不照出物體的受光面。這三件事需要逐像素運算，Canvas 2D 沒有著色器。
使用者 2026-11-28 表示 0001 可以推翻（原話：「動 0001 沒差，不好看硬鑽沒意義」）。

## 決定

- 這份是提議，尚未採用；採用時取代 0001 的第一條（禁用任何 WebGL），0001 的第二、三條（特效走預烘焙零件、渲染路徑 0 個每幀 `shadowBlur`）不變。
- 方向：世界畫面仍由現有 Canvas 2D 管線畫出，另加一個 WebGL2 全螢幕通道做打光與後製（環境光、方向光、點光、地面投影、泛光、色調映射），HUD 不打光。
- 不引入 Three.js、Pixi.js 或其他渲染函式庫，只用瀏覽器的 WebGL2 API。
- 光源、顏色、強度集中在一張表（原型是 `tools/ui-e2e/lit-proto.mjs` 的 `LOOK`）；進引擎時放 `constants/`。
- 採用前要補齊：打光通道需要的每像素資料（類別、腳底位置、高度、法線）由引擎提供的做法；單位與障礙物的烘焙法線圖；iPhone 實機幀時間；WebGL 不可用時的退路。

## 放棄的做法

- 只在 Canvas 2D 內做（壓暗環境、地格光層、離屏光照圖）：做得到明暗與冷暖，做不到依距離衰減的受光面與投影。
- 整個渲染器改寫成 Three.js 或 Pixi.js：150 招特效零件、座標協議（`engine/renderers/RenderSpec.ts`）與保真基準都要重做，原型沒有證明需要。

## 後果

- 原型只是離線重打一張凍結幀：法線由精靈輪廓估計、位置由分層遮罩反推，這兩項進引擎時都要換成真實資料。
- 桌機 RTX 4070、1280×720 量到打光加後製每幀 0.22～0.41 ms；手機沒有量，手機 GPU 已是瓶頸（HANDOFF §2 I）。
- 採用後 `AGENTS.md` §1 第 4 點、`tests/VFXBackend.test.ts` 的相關限制與保真基準都要跟著改。

## 證據

- `docs/plans/visual-experiment.md` §7～§12
- `tools/ui-e2e/lit-proto.mjs`
- `tools/ui-e2e/layer-luma-probe.mjs`
- `docs/adr/0001-canvas2d-and-prebaked-vfx.md`
