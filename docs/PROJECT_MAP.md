# 專案地圖（要找系統位置時才讀）

> 從 `docs/METHODOLOGY.md` §5、§6 移出（2026-10-31）：每輪常駐的文字每一輪都重新計費，只在需要定位時讀本檔。找不到就用 `explorer` 子代理 grep。

## 1. 各系統在哪
- **音訊**：`engine/audio/AudioEngine.ts`（共享單例＋擁有者計數＋BGM 請求序號；`?mute` 不建立 AudioContext）、`engine/systems/audio/AudioSystem.ts`（事件→Cue、BGM 切換）、`data/audio/{cues,music}.ts`、素材 `public/assets/audio/`（CC0／CC-BY，見 `docs/ASSET_LEDGER.md`、`CREDITS.md`）。展示模式只播 `SHOWCASE_AMBIENT`；手動：開戰 `BATTLE_NORMAL`→存活≤4 `BATTLE_TENSE`→勝敗曲（紅藍分開）→回氛圍。預覽頁 `tools/audio/preview.html`。
- **特效**：登記管線 `data/vfx/VFXRegistry.ts`＋`engine/presentation/vfx`；直接繪製管線在 `engine/renderers/*`；品質階層 `engine/renderers/RenderQuality.ts`＋`constants/render.ts` 的 `RENDER_QUALITY`、`constants/vfx.ts` 的 `VFX_BUDGET`／`DEATH_VFX`。
- **單位**：精靈 `engine/renderers/units/factions/SpriteUnitRenderer.ts`（圖集 `SpriteAtlasStore`；座標：在 `ctx.scale(UNIT_SCALE)` 之後繪製，需 `/UNIT_SCALE` 補償，腳底錨點 `UNIT_SPRITE.footOffsetLocal`）；地面底座／職業圖示仍由 Token 工廠產生。
- **UI**：視窗系統 `components/ui/window/*`、展示頁 `components/ui/showcase/ShowcaseOverlay.tsx`（標題卡除按鈕外穿透）。樣式基準 `tools/ui-e2e/style-baseline.json`（改 UI 樣式需 `E2E_UPDATE_STYLE=1 npm run e2e:ui` 並確認只有預期元素變動）。
- **量測工具**：`perf:fidelity`（保真，battle_frozen＋5 地形）、`perf:guard`、`perf:frames`（2560×1440，**用主螢幕**）、`perf:attribution`、`?perf` HUD（rAF 真實幀間隔＋尖峰記錄）。保真鐵律：基準不得任意重錄、門檻不得放寬。**測試用 hook `__resetSeed`／`__stepFrames` 不在 app 內**，由 `tools/` 腳本以 `addInitScript` 注入（見 `tools/assets/create-battle-comparison.mjs`、`tools/ui-e2e/render-fidelity.mjs`）。
- **dev server**：`npm run dev`（port 3000，`0.0.0.0`）。

## 2. 暫存區 `C:\Git\_asset_staging\`（repo 之外）
- `docs\`：舊手冊備份（**以 repo 為準**）；`art\terrain_grid.jpg`、`art\ref_*`（使用者風格參考，**不得進 repo**）；`sprites\`（10 張精靈＋manifest）；`assets3d\kaykit_adventurers\`；`tools\blender\...\blender.exe`（可攜）與 `tools\blender_scripts\`（`render_unit.py`、`pack_sprites.py`）；`audio_tmp\`。
- 美術風格：相機正交仰角 30°（=`ISO_SCALE_Y 0.5`）、四向原生渲染；BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱。
- 使用者機器細節：主螢幕 2560×1440 @ 239 Hz（量測用）；副螢幕 59 Hz（AMD 內顯，會污染量測要避開）；Python 3.10、Node 24、`msedge` 供 Playwright；Blender、PIL、ffmpeg 已在本機。
