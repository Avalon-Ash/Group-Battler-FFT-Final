# 開案書：打光通道接進引擎（實驗分支 `exp/visual-lighting`）

日期：2026-11-28。主席：Fable 5.2。使用者授權（2026-11-28 原話）：「0001 改！」「接進去跑看看」「你全權處理。退路都是 git，每一階段計畫要寫好」。
前情與原型：`docs/plans/visual-experiment.md` §13、`tools/ui-e2e/lit-proto.mjs`、ADR 0029。

合併進 `main` 與 push 仍然各自要問使用者。每個階段一個 commit，退路是 revert 那個 commit；整條線的退路是不合併這個分支。

## 1. 目標

遊戲實際跑的畫面（會動的）用 WebGL2 打光：冷環境加月光、單位腳前的暖色點光、特效自發光與泛光、地面投影、色調映射。HUD 不打光。WebGL 不可用或關掉時，畫面和現在的 Canvas 2D 完全一樣。

## 2. 架構（已讀碼確認的接點）

`engine/renderers/RenderPipeline.ts` 的 `draw()` 現在的順序：背景 → 世界（`drawWorld`）→ 後處理（`post.apply`、`applyToneGrade`）→ 疊層與 HUD，全部畫在同一個 2D context。

- 世界改畫到一張離屏的世界畫布（透明底），不直接畫在主畫布上。背景照舊畫在主畫布。
- 新模組 `engine/renderers/lighting/LightingPass.ts`：擁有一個 WebGL2 畫布。每幀把世界畫布上傳成貼圖，打光加後製，再用 `drawImage` 貼回主畫布（蓋在背景上）。之後的後處理、疊層、HUD 照舊畫在主畫布，所以 HUD 不受影響。
- 光源與投影物清單：每幀由 `drawWorld` 的 render list 與 `UnitFrame` 收集（單位腳底螢幕座標與陣營、障礙物腳底與高度、特效位置與顏色），以 uniform 與一張小的投影物貼圖傳給著色器。位置都是引擎本來就有的資料，不從畫面反推。
- 直立物遮罩：另一張離屏畫布，`UNIT`、`CORPSE`、`OBSTACLE` 的 op 多畫一次。著色器用它分辨「站著的東西」和地面，並由遮罩的梯度估輪廓法線（烘焙法線圖是之後的事）。
- 參數集中在 `constants/lighting.ts` 一張表（由原型的 `LOOK` 搬過來），依群系可以覆寫。
- 開關：品質階層加網址旗標 `?lit=0|1`；WebGL2 或 `EXT_color_buffer_float` 拿不到時自動關閉並走原路徑。

## 3. 階段

| 階段 | 內容 | 驗收（每項附指令） | 退路 |
| :-- | :-- | :-- | :-- |
| A 合約 | ADR 0029 改「採用」並加「取代：0001」；0001 標「已取代（由 0029）」；`docs/DECISIONS.md`、`AGENTS.md` §1 第 4 點、`CLAUDE.md` 架構不變式那一行同步；跑 `node tools/agent/sync-codex-contracts.mjs` | `npm test`（`AdrIndex`、`DocDrift`、`HarnessContract`） | revert |
| B 還原壓暗 | 把 §9～§12 的 Canvas 2D 壓暗、降彩、背景、紅格、六角光池還原成 main 的值（打光通道自己負責明暗，兩者疊加會太暗）；`TERRAIN_SKIN.chroma` 與 `applyChroma` 一併拿掉 | `npm run perf:layers` 的數字回到 §7 的表；`git diff main -- constants data public/assets/obstacles engine/renderers/grid` 只剩預期的檔 | revert |
| C1 骨架 | 世界改畫離屏畫布；`LightingPass` 只做「原樣貼回」（不打光） | `npm run perf:fidelity` 和 main 的基準 0 差異；`runtime-smoke` | revert |
| C2 打光 | 環境光、月光、單位點光、特效自發光（先用亮度門檻判定）、泛光、色調映射、暗角；`?lit=0` 走原路徑 | `?lit=0` 時 `perf:fidelity` 0 差異；`?lit=1` 五群系截圖；`npm test`、`build`、進入點預算 | revert |
| D 投影與體積 | 直立物遮罩畫布、投影物貼圖、月光與點光的地面投影、接觸暗部、輪廓法線 | 五群系加戰鬥幀的前後對照；連續 60 幀看單位走路時光與影子有沒有跳 | revert |
| E 量測與收尾 | 桌機 `perf:frames`（先確認顯示卡字串）；`perf:mem` 比 iPhone 解析度的畫布總量；手機模擬 `perf:mobile`；兩位評審盲評；`RenderSpec` 與檔頭同步；`visual-experiment.md` 補結果 | 數字表附指令；盲評取低分 | — |

之後（不在這一輪）：單位與障礙物烘焙法線圖、群系各自的光色表、保真基準在使用者同意方向後重錄、iPhone 實機。

## 4. 分工

定調與整合是一條相依的鏈，主席自己做。可拆的包：

| 包 | 建議執行者 | 檔案範圍 | 紅色驗收 |
| :-- | :-- | :-- | :-- |
| E 的盲評 | `reviewer` 子代理（Sonnet）與 Codex Astra（週額度 11-28 00:46 已重設，先查餘額） | 無（只讀圖） | 每項分數附圖上位置 |
| 烘焙法線圖（之後） | agy Neon high | `tools/assets/blender/**` | 法線圖與原圖集的 manifest 矩形逐一相同 |

## 5. 停下來問使用者

合併進 `main`、push（分開問）；要重錄保真基準時；手機模擬顯示幀時間明顯變差、需要決定手機預設開或關時；外觀取捨（群系辨識度、亮度）需要看圖決定時。

## 6. 已知風險

- 多兩張全畫面離屏畫布與一組 HDR 貼圖：iPhone 解析度的記憶體要量（METHODOLOGY §4 第 13 條）。
- 世界畫在透明底上，`screen`、`lighter`、`multiply` 疊在沒有背景的地方結果會和現在不同；C1 用 0 差異驗收抓這件事，有差異就改成把背景也畫進世界畫布並另傳一張世界 alpha。
- 單位被前方高地塊擋住時，直立物遮罩會多出一塊；D 階段看圖決定要不要處理。
- 特效用亮度門檻判定自發光，單位身上的高光也會微微發亮；不夠好就在 D 階段加一張特效畫布。
- 桌機量到的 0.2～0.4 ms 不代表手機。

## 7. 進度

每階段一段：做了什麼、驗收指令與結果、沒做到的事。半夜長跑（2026-11-28，主席 Fable 5.2）。

### A 合約（完成）

- ADR 0029 改「採用」並加「取代：0001」；0001 標「已取代（由 0029）」。0001 的第二、三條（特效走預烘焙零件、0 個每幀 `shadowBlur`）寫進 0029 的決定，內容不變。
- 同步：`docs/DECISIONS.md` §1、§3 的三行、`AGENTS.md` §1 第 4 點、`CLAUDE.md` 架構不變式、`docs/METHODOLOGY.md` §2 的治理規則摘要。WebGL 程式碼限定在 `engine/renderers/lighting/`。
- `node tools/agent/sync-codex-contracts.mjs`：副本已是最新（這一階段沒動 skill 與子代理定義）。
- 驗收：`npm run lint`、`npm test`、`npm run build` 的結果寫在這個 commit 的訊息裡。

### B 還原壓暗（完成）

- 從 `main` 取回：`constants/terrain.ts`、`data/scenes.ts`、`engine/renderers/grid/GridRenderStrategy.ts`、`TerrainRenderer.ts`、`engine/renderers/RenderSpec.ts`、`public/assets/obstacles/**`、`tests/GroundPriority.test.ts`、`tests/constants-snapshot.json`、`tools/assets/blender/render_obstacle.py`（顏色常數要和取回的圖集一致）。`TERRAIN_SKIN.chroma`、`applyChroma`、`GRID_OVERLAY.WARM_POOL` 一併消失。
- 保留：`bake_common.py` 的打光預設（L0，預設 `classic` 與原本逐像素相同）、`render_unit.py`、探針與原型工具。
- `git diff main --stat -- constants data public/assets/obstacles engine tests`：沒有輸出（與 main 相同）。
- `npm run perf:layers`（桌機亮度中位數，地塊頂面／障礙物／單位）：VOID 38.1／49.9／56.3、FOREST 59.6／100.3／58.2、ICE 87.2／118.4／57.3、MAGMA 37.8／37.9／55.3、DESERT 85.7／157.5／58.1，和 `visual-experiment.md` §7 的表相同。退出碼 1 是原本就有的（FOREST 9／10 單位被樹冠擋住、明度順序 12 筆）。
- `npm run perf:fidelity`：六張全過。這個工具本來就不是逐位元 0（基準是舊 commit 錄的）：meanAbsDiff／badPixel％ 為 VOID 0.296／0.00、FOREST 0.659／0.22、ICE 0.302／0.22、MAGMA 0.614／0.13、DESERT 0.500／0.22、battle_frozen 0.177／0.00。**之後各階段的「0 差異」以這組數字為準：關閉打光時要和它逐位數相同。**
- `node tools/ui-e2e/runtime-smoke.mjs`：PASS（0 個頁面錯誤）。`npm run lint`、`npm test`（184 檔 1704 項）、`npm run build`（進入點 257.0／257.5 kB）都過。

### C1 骨架（完成）

- 新增 `engine/renderers/lighting/LightingPass.ts`（世界畫布、WebGL2 畫布、原樣貼回的著色器；延後載入的獨立 chunk，3.2 kB）與 `LightingGate.ts`（進入點只留開關與動態載入）。`RenderPipeline.draw` 在通道可用時把 `drawWorld` 畫進世界畫布，畫完 `present` 貼回主畫布。`RenderSpec` §1 尾段與兩個檔頭同步。
- 這個 commit 裡通道是**無條件啟用**的（只做原樣貼回），所以沒改過的 `perf:fidelity` 量到的就是離屏路徑；C2 才改成 `?lit=1` 才開。頁面上的狀態寫在 `window.__LIGHTING__`，用和保真工具相同的瀏覽器參數確認是 `active`（未進版控的探針 `tools/ui-e2e/out/lit-state-probe.mjs`）。
- §6 第二項風險成立，已照備案處理。量到的兩種做法（`npm run perf:fidelity`，括號內是 strict mean）：
  - 世界畫在透明底、貼回主畫布：全過，但和階段 B 不是逐位數相同（VOID 0.3900 對 0.3903、FOREST 1.7389 對 1.7388、ICE 0.5037 對 0.5033、MAGMA 0.8701 對 0.8697；DESERT bad％ 1.6706 對 1.6699；battle_frozen 相同）。差在世界邊緣疊在天空上的半透明與混合模式。
  - 先把主畫布（此時只有背景）畫進世界畫布再畫世界：六張的四個數字和階段 B **逐位數相同**（WebGL 上傳、輸出、貼回是逐位元的）。C1 採用這個做法。
- `node tools/ui-e2e/runtime-smoke.mjs`：PASS。`npm run lint`、`npm test`（184 檔 1704 項）、`npm run build`（進入點 257.2／257.5 kB）、`npm run knip`（無新增）都過。`node tools/ui-e2e/perf-ab.mjs --assert` 的結果寫在 commit 訊息。
- 給 C2 的結論：打光時需要知道哪裡是世界、哪裡是天空。備案寫「另傳一張世界 alpha」；C2 改用透明底的世界畫布（它的 alpha 就是世界覆蓋範圍，不必多畫一次）加上主畫布的背景貼圖，兩張在著色器裡合成。透明底那一點點邊緣差異只存在於打光開啟時，那時畫面本來就不同。

### C2 打光（完成）

- 開關：`?lit=1` 開、`?lit=0` 關，沒寫時看 `RENDER_QUALITY.LIT_DEFAULT_ON`（**false**）。預設關是因為保真工具的網址沒有這個旗標、基準又不能重錄；關閉時不載入打光 chunk、不建 GL context，`drawWorld` 直接畫主畫布（原路徑）。
- 每幀流程（`engine/renderers/lighting/LightingPass.ts`、`shaders.ts`；參數全在 `constants/lighting.ts`）：
  1. 世界畫在透明底的世界畫布；主畫布此時只有背景。兩張都上傳成貼圖。
  2. 點光：每個存活單位一盞暖色光（藍方偏金、紅方偏橘紅），以 instance 矩形加法畫進光照貼圖，所以成本跟光照到的面積走、不跟盞數乘全螢幕走；上限 `MAX_LIGHTS` 64，手動模式 40 人不會截掉。
  3. 著色：世界 ×（環境光＋月光＋點光）；環境降彩 `ENV_CHROMA`；背景只調色；輸出線性 HDR（RGBA16F）。
  4. 泛光（半解析度、兩次橫直模糊）、曝光、暗角、filmic 色調映射、暗部偏藍亮部偏暖，貼回主畫布。
- 長度單位改成世界像素（原型的螢幕像素 ÷ 原型擷取時的鏡頭縮放 0.857），著色器乘上本幀相機縮放，鏡頭拉近拉遠時光的大小跟著地圖走。
- **和開案書不同的地方**：
  - 「特效用亮度門檻判定自發光」做不到：FOREST 的地塊彩度 0.91～1.00、DESERT 的障礙物亮度中位數 157 都高過特效（147），門檻版把整片草地和樹當成發光（截圖看過）。改成 §6 寫的備案並提前到這一階段：RenderPipeline 每畫完一個 op 呼叫 `LightingPass.tag`，把單位（剪影）、特效／投射物／施法圈／危害、玩法標示（射程、預警、縮圈格）各另畫一張**半解析度**遮罩，障礙物從遮罩挖掉自己。地塊不重畫。
  - 玩法標示不打光、不降彩（`INFO_GAIN` 1.0）：否則外圈縮圈預警格變成淡粉色，危險看不出來。
  - 打光開啟時不跑 `applyToneGrade`（通道自己做色調映射，疊兩次會過飽和；也省掉一次全畫面濾鏡）。
- 這一階段還沒有的（D 做）：直立物的法線與投影、接觸暗部。現在樹、岩柱、單位都被當成平躺的地面打光，所以樹冠偏亮偏白。貼地的大型法陣（鋪設層，屬於地塊 op）沒有進特效遮罩，會被環境光壓暗。單位死亡時它的光是瞬間熄掉的。
- 驗收：
  - `npm run perf:fidelity`（沒有 lit 旗標＝關）：六張的四個數字和階段 B 逐位數相同。
  - `npm run perf:lit`（新工具 `tools/ui-e2e/lit-shots.mjs`）：五群系＋戰鬥幀的 `_off`／`_lit`／`_compare` 在 `tools/ui-e2e/out/lit-engine/`；`lit=1` 的狀態是 `active ANGLE (NVIDIA GeForce RTX 4070 … D3D11)`、`lit=0` 是沒載入，兩邊 0 個頁面錯誤。
  - `npm run lint`、`npm test`（184 檔 1704 項，`constants-snapshot.json` 與匯出清單加了 `LIGHTING`）、`npm run build`（進入點 257.4／257.5 kB，打光 chunk 14.1 kB）、`npm run knip` 都過；`runtime-smoke` 與 `perf-ab --assert` 的結果在 commit 訊息。
