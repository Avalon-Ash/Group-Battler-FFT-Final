# 任務：增減益／控制視覺正規化（渲染線）

> 2026-10-29 主代理撰寫，使用者已定方向。執行者：Claude Sonnet 子代理，在獨立 clone 工作。做完後由主代理刪除本檔，結論寫進 WORKLOG。

## 先讀
1. `AGENTS.md`：嚴格合約，全部遵守。
2. `engine/renderers/RenderSpec.ts`：座標協議（錨點 GROUND／BODY／HEAD、`getUnitAnchor`、層序）。
3. 你要改的每個檔案的方框檔頭。改到位置、錨點、層序時，在同一個 commit 同步更新 RenderSpec 和檔頭。
4. 現況檔案：
   - `data/vfx/status_parts.ts`：狀態零件表，是 SSOT。
   - `data/vfx/status_visuals.ts`：浮字與顏色。
   - `engine/renderers/status/StatusActivity.ts`。
   - `engine/renderers/hud/GaugePainter.ts`：目前只有一個圓形量表，寫死 5 種控制。
   - `engine/renderers/units/painters/PolymorphPainter.ts`、`FrozenPainter.ts`、`data/units/appearance/ccBody.ts`：羊與冰塊是程式畫的。
   - `data/vfx/parts/`：零件管線與 `vfxPalette.ts`。
   - `tools/assets/blender/render_obstacle.py`、`pack_obstacles.py`：障礙物的烘焙管線，相機與描邊和單位相同。

## 使用者回報的問題
- 增益和減益的視覺都各自為政。
- 羊和冰塊很粗糙。
- 遊戲縮放下看不出中了什麼。

## 使用者已定的方向
1. **配色依控制種類的 MMO／FFT 慣例，不再借陣營色。** 現在狀態借用 `LION_*`（藍方）、`ASH_*`（紅方）的色帶，例如定身用金色聖光圈。陣營色帶留給技能用；狀態另建一組狀態色帶，放在 `vfxPalette.ts`。
2. **「換身體」的狀態用 Blender 烘焙模型**：變形羊、冰凍冰塊。和單位同一套相機、描邊、四方向，不下載外部素材。
3. **疊加規則**（主代理參考 WoW 名牌與 FFXIV 決定）：
   - **場景內**：頭頂標記只畫優先序最高的一個硬控；腳下圈每個單位只畫一個（優先序最高、且有腳下層的那個）；其餘狀態只留身上的小零件。不做輪播。
   - **狀態圖示列**：血條上方一排小圖示，列出全部增減益，每個圖示有剩餘時間的扇形遮罩。減益在左、增益在右，邊框顏色區分。數量上限依品質階層。取代 `GaugePainter` 寫死的單一量表；詠唱進度如果也由它畫，要保留。

## 配色與形狀表（起點，可微調但要在報告說明）
| 狀態 | 類別 | 色系 | 場景剪影（遊戲縮放下要能一眼認出） |
| :-- | :-- | :-- | :-- |
| STUN | 硬控 | 金黃 | 繞頭的星星 |
| SILENCE | 硬控 | 藍紫 | 頭頂斜線封口符號 |
| ROOT | 硬控 | 綠棕 | 腳下藤蔓或鎖鏈纏腳（腳下層） |
| FEAR | 硬控 | 暗紫黑 | 頭頂骷髏，抖動 |
| TAUNT | 硬控 | 紅 | 頭頂倒三角，指向嘲諷者 |
| POLYMORPH | 硬控 | 粉 | 身體換成羊（烘焙） |
| BANISH | 硬控 | 蒼白青灰 | 半透明幽光柱，和恐懼的紫要分得開 |
| STASIS | 硬控 | 琥珀金 | 時間凍結框 |
| FROZEN | 硬控 | 冰青 | 冰塊（烘焙） |
| BLIND | 弱減益 | 灰 | 頭部煙霧 |
| SLOW | 弱減益 | 霜藍（比冰凍暗、飽和度低） | 腳下向後拖的殘影或下壓箭頭，不用圈 |
| VULNERABLE | 弱減益 | 橘紅 | 身上裂紋 |
| BURN／POISON | 週期 | 橘／綠 | 現有火焰、毒滴 |
| REGEN（HOT） | 增益 | 草綠 | 上升的葉片或光點 |
| HASTE | 增益 | 青白 | 向前的速度線 |
| REFLECT | 增益 | 銀白 | 環繞鏡片 |
| LIFESTEAL | 增益 | 深紅 | 吸入的血滴 |
| INVINCIBLE | 增益 | 金白 | 光輝 |
| SHIELD | 增益 | 藍 | 現有 ShieldPainter |

美術方向：魔法是能量構造體，有體積、半透明發光，不做實心物件。羊與冰塊例外：它們是實體模型。

## 步驟（分兩個 commit）

### Commit 1：羊與冰塊烘焙
- Blender 在 `C:\Git\_asset_staging\tools\blender\blender-4.5.13-windows-x64\blender.exe`。本任務**明確授權**你執行它，`tools/assets/blender/README.md` 裡「代理不得執行 Blender」那句這次不適用。
- 新增烘焙腳本：沿用 `render_obstacle.py` 的相機、燈光、描邊、錨點設定。可以把共用部分抽成函式，不要整份複製。
- 用程式建低多邊形模型，風格接近 KayKit：
  - 羊：蓬鬆毛球身體、深色臉與腳、陣營色項圈（輸出一張遮罩，執行期依 `FACTION_SKINS` 上色，不烘兩份）。
  - 冰塊：半透明六角冰柱牢籠，單位在裡面看得到。
- 四方向，輸出到 `public/assets/` 下的新資料夾，附 manifest；素材 URL 用 `import.meta.env.BASE_URL`。
- 依障礙物圖集的載入方式接進 `PolymorphPainter`／`FrozenPainter`：
  - 白色剪影變體在載入後產生一次。
  - 執行期只有 `drawImage`，零配置。
  - 程式畫的舊外形和不再用的 `ccBody` 參數刪掉，不留第二套。
- 在 `docs/ASSET_LEDGER.md` 記來源（自製、程式建模）。

### Commit 2：狀態視覺正規化
- 照上面的方向與色表改 `status_parts.ts`、`vfxPalette.ts`、`status_visuals.ts`；疊加規則實作在 `StatusActivity`。
- 補上 `SLOW` 標記。
- 做狀態圖示列：
  - 圖示可以用零件管線烘焙，或沿用 `AssetManager.getStatusIcon`。
  - 每種狀態都要有圖示。
  - 放在血條上方，位置讀 `HUD_ANCHOR`，不要寫死。
- 全部參數放 `constants/`，顏色放 palette，`MagicNumberBudget`、`color-literal-budget` 只減不增。

## 驗收（都要附數字或輸出）
1. **對照圖**（一次性腳本，放 `tools/ui-e2e/out/`，不 commit）：
   - 在瀏覽器裡讓單位分別掛上每一種狀態，各截一格，排成對照表。
   - 做兩種縮放：遊戲預設縮放、手機寬度。
   - 每種一個改前、一個改後。
   - 另做 3 組疊加：暈＋燃燒＋緩速、羊＋易傷、加速＋回復＋護盾。
   - 輸出 `tools/ui-e2e/out/cc_visual_before.png`、`cc_visual_after.png`。
   - 測試 hook 照 `tools/ui-e2e/render-fidelity.mjs` 的方式用 `addInitScript` 注入，不放進 app。
2. **羊與冰塊**：四個方向各一張，放大 2 倍的截圖。
3. **全部通過**：`npm run lint`、`npm test`、`npm run build`、`npx knip --no-progress`（不得有新輸出）、`node tools/ui-e2e/runtime-smoke.mjs`、`npm run perf:guard`、`npm run perf:fidelity`。
4. **效能**：`perf:guard` 不得變差；圖示列在品質階層 3 要能關掉或減到最少。
5. **保真基準不得重錄。** `perf:fidelity` 失敗時：產生舊／新／差異三張圖放 `tools/ui-e2e/out/`，停下回報，由主代理取證決定。
6. **不能同時跑**：Blender 烘焙和 `perf:*` 量測不得同時執行。

## 硬限制
- 不改 `docs/HANDOFF.md`、`docs/WORKLOG.md`、`docs/DECISIONS.md`、`docs/METHODOLOGY.md`、`AGENTS.md`、`CLAUDE.md`、`.claude/**`。
- 不改戰鬥規則與數值。
- 不跑 npm install／ci。
- 不用 `git worktree`。
- 不 merge、不 push。
- 沒有 `as any`；tick 和渲染迴圈裡不放 `console.log`；不引入 WebGL／Three／Pixi。

## 完成
在指定分支 commit，訊息結尾加：
```
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

回報內容：
- 改了哪些檔、對照圖路徑、每個驗收指令的退出碼、圖集大小（KB）。
- 和本說明不同的地方，各附理由。
