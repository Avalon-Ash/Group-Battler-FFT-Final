# 0001 純 Canvas 2D 渲染與預烘焙特效零件

狀態：採用
日期：2026-10-16

## 背景

專案為 2.5D 等距六角格戰鬥模擬，渲染管線必須兼顧桌機高更新率與手機瀏覽器效能。
早期渲染路徑包含每幀呼叫 `shadowBlur` 與即時程序特效繪製，在多單位同時施放技能時造成畫布繪製成本過高。

## 決定

- 禁用 Three.js、Pixi.js 與任何 WebGL 函式庫，全部畫面使用 HTML5 Canvas 2D 與程序化材質渲染。
- 所有技能與狀態特效一律改採預烘焙零件（參數與色階定義於 `data/vfx/parts/partConfig.ts` 與 `data/vfx/parts/vfxPalette.ts`，繪製位於 `engine/renderers/vfxparts`）。
- 模糊效果只在零件離線或快取烘焙期使用，執行期渲染路徑維持 0 個每幀 `shadowBlur`，僅執行 `drawImage`、透明度、混合模式與幾何變換。

## 放棄的做法

- 引入 Three.js、Pixi.js 或其他 WebGL 渲染框架。
- 在每幀渲染迴圈中呼叫 `shadowBlur`，或維持即時程序繪製與地面貼圖舊後端（已刪除的 `ProceduralPainter` 與 `GroundPainter`）。

## 後果

- 150／150 技能特效統一走零件管線，並由 `tests/VFXBackend.test.ts` 以棘輪限制舊後端用途；無重型 3D 圖形相依。
- 須依品質階層管控烘焙零件離屏快取上限（觸控裝置 96 MiB／320 項、桌機 224 MiB／576 項），並承擔首次冷啟動烘焙耗時。

## 證據

- `docs/DECISIONS.md` §1、§3
- `AGENTS.md` §1 第 4 點
- `data/vfx/parts/partConfig.ts`、`data/vfx/parts/vfxPalette.ts`
- `tests/VFXBackend.test.ts`
- `docs/WORKLOG.md` §2 J、§2 K、§2 V
