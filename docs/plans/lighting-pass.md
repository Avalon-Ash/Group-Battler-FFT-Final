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

### D 投影與體積（完成）

- 幾何遮罩（取代 C2 的單位遮罩）：每個直立物（單位、障礙物）先畫在暫存畫布、用 `source-in` 裁成一張漸層章再貼進半解析度的幾何遮罩。章的 r＝離腳底的高度（0～`GEO.MAX_HEIGHT` 180 世界像素）、g＝是不是單位、b＝橫向位置。著色器由它得到每個直立像素的腳底地面位置、高度、左右彎的輪廓法線（`GEO.BEVEL`）。單位用 `drawSilhouette`（和遮擋剪影同一個入口，不經過會登記輪廓光、毒材質的本體路徑）；腳底與高度只讀 `UnitFrame`（`footX`、`floorY`、`hudAnchorY`）與障礙物精靈的錨點。
- 投影物貼圖（半解析度 RGBA16F）：每個單位、障礙物在腳底畫一個橢圓（半徑由精靈寬推），r＝高度、g＝往外淡出的存在感，取最大值。由 GL 的 instance 矩形畫，不經過 Canvas。
- 投影：月光（著色階段，全螢幕）與每盞點光（各自的矩形內）從受光點沿地面往光源取樣 `SHADOW.STEPS` 16 次，路上有比光線高的投影物就被擋住。接觸暗部：腳邊的環境光依投影物的存在感壓暗（`SHADOW.CONTACT` 0.45）。
- 直立物：不吃正面的月光，改給朝月亮那側的冷色邊光（`MOON_RIM`）；點光用輪廓法線。障礙物維持環境降彩，單位保留原彩度。點光的矩形往上多蓋 `MAX_HEIGHT`，站在光旁邊的樹與單位全身都受光。
- 單位另外從特效遮罩挖掉自己（比它早畫的特效被它擋住，不會讓單位跟著發亮）。
- 群系覆寫：`envChroma` 移進 `LightingLook`，MAGMA 設 0.8（降到 0.5 熔岩會變粉灰）。`EMISSIVE_GAIN` 2.2 → 1.6：60 幀走路條裡大型特效過曝成白塊蓋住單位。
- 看圖（`npm run perf:lit -- --walk 60`，`tools/ui-e2e/out/lit-engine/`）：五群系的樹、岩柱、冰晶有暗面與邊光，地面有往右下的影子；`battle_frozen_walk.png` 是戰鬥中 60 幀連續畫面（跟著 BLU-0002 裁切，期間鏡頭在拉近、單位在交戰與短距離移動），幀與幀之間地面亮度與單位身上的光是連續的，沒有看到整塊跳動或閃爍。這一段主要是交戰，單純長距離走路的連續畫面沒有另外擷取；大型特效在泛光下仍然偏亮。
- 沒做、看得到的：地塊側面沒有自己的類別（和頂面一樣吃月光，原型裡側面是暗的）；被前方高地塊擋住的單位，遮罩會多出一塊（§6 第三項，凍結幀裡沒遇到明顯的例子，沒處理）；貼地的大型法陣仍被當成地面壓暗；單位死亡時光瞬間熄掉；投影物是橢圓腳印，影子沒有精靈的形狀。
- 驗收指令與結果寫在這個 commit 的訊息裡。

### E 量測與收尾（完成；盲評只有一位）

量測都在階段 D 的 commit 上跑，一次只跑一個工具。瀏覽器都加 `--force_high_performance_gpu`（`lib/perf-common.mjs`），顯示卡字串是 `ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)`（`perf:frames` 的 `env.gpu`、`perf-mobile-emu` 輸出 JSON 的 `gpu`、`perf:lit` 的 `lit-shots.json`）。

**桌機幀時間**（`PERF_SCENARIOS=battle_calm,battle_vfx_storm,replay_magma20 npm run perf:frames`，打光版加 `PERF_QUERY=lit=1`；2560×1440、DPR 1、有視窗、20 秒 × 3 輪）。工具開頭估的 `refreshRate` 是頁面自己的 rAF 頻率，不是螢幕規格：關的那次 56、開的那次 28（平常這台是 239，這次為什麼只有 56 沒有查）。也就是打光開啟時，頁面在估算那一段只跑到一半的頻率。中位數被 vsync 釘在 17.7 ms 左右，看得出差別的是掉幀：

| 情境 | 版本 | 中位 ms | p90 | p95 | p99 | 平均 FPS | 1% low FPS |
| :-- | :-- | --: | --: | --: | --: | --: | --: |
| battle_calm | 關 | 17.6 | 18.0 | 18.1 | 18.6 | 56.6 | 37.8 |
| battle_calm | 開 | 17.9 | 18.1 | 18.1 | 35.5 | 55.0 | 27.6 |
| battle_vfx_storm | 關 | 17.8 | 18.1 | 18.1 | 35.3 | 55.5 | 28.0 |
| battle_vfx_storm | 開 | 18.0 | 35.3 | 35.9 | 36.1 | 48.4 | 19.3 |
| replay_magma20 | 關 | 17.7 | 18.1 | 18.1 | 35.4 | 55.9 | 28.0 |
| replay_magma20 | 開 | 17.9 | 18.4 | 35.3 | 36.0 | 52.0 | 26.4 |

打光在 2560×1440 的特效壓力下會多掉一拍 vsync（平均少約 7 FPS）。因為被 vsync 釘住，量不到「每幀多幾毫秒」；要那個數字得在 239 Hz 下或關掉 vsync 重量。原型的 0.22～0.41 ms 只算 GPU 著色，不含這裡多出來的畫布上傳與遮罩重畫。

**手機模擬**（`node tools/ui-e2e/perf-mobile-emu.mjs --cpu=4 --seconds=45`，打光版加 `--query=lit=1`；393×852、DPR 3、CPU 降速 4 倍、自適應品質。只模擬 CPU，不模擬手機 GPU）：

| 情境 | 版本 | 平均 FPS | 1% low | p95 ms | 降到階層 3 的時間 |
| :-- | :-- | --: | --: | --: | :-- |
| showcase | 關 | 44.07 | 9.75 | 36.10 | 21.07 秒 |
| showcase | 開 | 30.70 | 7.45 | 54.90 | 5.78 秒 |
| eight-ults | 關 | 46.69 | 14.99 | 36.00 | 一開始就在 3 |
| eight-ults | 開 | 26.13 | 9.60 | 71.50 | 一開始就在 3 |

手機模擬明顯變差（平均 FPS 少三到四成）。照 §5 這是要使用者決定的事；目前預設關，手機不受影響。主要成本推測是每幀五張畫布上傳、特效與障礙物多畫一次、每像素 16 次投影取樣，沒有逐項拆開量。

**手機解析度的畫布記憶體**（`node tools/ui-e2e/mem-probe.mjs 60 "mute&quality=0"` 與 `… 60 "mute&quality=0&lit=1"`；393×852、DPR 3，品質階層釘在 0）：打光通道自己的 Canvas 畫布 7 張合計 10 MB（工具「最高時的組成」的 `LightingPass×7=10MB`：世界畫布 5.4 MB 加四張半解析度遮罩與暫存）；同時 `PostProcessor` 的 5 MB 暫存畫布不再出現（打光時不跑色調分級）。兩次跑到的局數不同（關 2 局、開 3 局），畫布總量（中位 344 對 369 MB、最高 399 對 466 MB）內容不同，**不能直接當成打光的增量**。第一次沒釘品質階層時量到的是 6 MB（階層被自動降低，畫布變小），那個數字不採用。工具量不到 GL 貼圖：照程式裡的格式估算（主畫布像素數 N，世界與背景貼圖各 4N、三張半解析度遮罩共 3N、兩張全解析度 RGBA16F 各 8N、投影物與兩張泛光半解析度 RGBA16F 共 6N，合計約 33N 位元組），階層 0、N＝786×1704 時約 44 MB。這是估算，不是量到的。`mem-probe` 不印顯示卡字串（它量的是畫布位元組數，不是時間）。

**盲評**（兩位 `reviewer` 子代理、都是 Sonnet，各自獨立；評分表是 `visual-experiment.md` §3；原文摘錄在 `docs/plans/visual-experiment/E_lit_blind_review_sonnet.md`）。取低分，六張平均：**打光關 4.3、打光開 6.0**。

| 場景 | 打光關 | 打光開（第一位／第二位，取低） |
| :-- | --: | :-- |
| VOID | 5 | 8／7 → 7 |
| FOREST | 4 | 7／6 → 6 |
| ICE | 4 | 8／7 → 7 |
| MAGMA | 4 | 5／5 → 5 |
| DESERT | 4 | 7／6 → 6 |
| battle_frozen | 5 | 7／5 → 5 |

- 第一位的派工單寫了哪邊是 `_off`、哪邊是 `_lit`，不算盲評，而且它的 E 分和自己寫的觀察不一致（分數偏高，平均 7.0）。第二位用匿名檔名、左右隨機的對照板重評，才是盲評。開案書寫的另一位是 Codex Astra；HANDOFF 記使用者 11-23 說 Codex 額度這週不給本專案，所以兩位都是 Sonnet（排程寫「可以開一個 reviewer 子代理」，第二個是為了補第一次不盲的錯）。
- 進步在畫面層次與單位分離：環境退成暗冷色。
- **體積感與材質兩項，盲評 12 格全部 1 分，打光開關沒有差別**：原尺寸下看不到輪廓亮線。階段 D 的輪廓法線與邊光在 40 px 的單位上讀不出來。
- **戰鬥幀沒有進步（5 對 5），打光開的可讀性是 0**：地面的施法範圍預警從黃綠變成淺灰白細線（它畫在地塊 op 的貼地鋪設層裡，被當成環境降彩、壓暗）；藍方法師的深藍帽融進深青地塊。
- 其他退步：沒進光池的單位偏暗（紅方被染成褐色）；ICE 藍方腳下的金色六角框在光池裡幾乎看不到；DESERT 地塊變粉紫；FOREST 有樹被點光打成黃綠色；MAGMA 的裂紋仍是全場最高對比（只進步 1 分）。

**同步**：`RenderSpec` §1 尾段補上 `LightingPass.tag`；`LightingPass.ts`、`LightingGate.ts`、`shaders.ts`、`constants/lighting.ts`、`RenderPipeline.ts` 的檔頭在各階段的 commit 已更新；`visual-experiment.md` 加 §14。`perf-frames.mjs` 加 `PERF_QUERY`、`perf-mobile-emu.mjs` 加 `--query`（只是附加網址參數）。

### 沒做到與沒驗證的事（整輪）

- iPhone 實機沒看過；手機 GPU 的成本沒有量（手機模擬只降 CPU）。WebKit 上的 WebGL2 與 `EXT_color_buffer_float` 沒測（拿不到時會退回原路徑，這條退路只在無頭測試環境 jsdom 與「旗標關閉」兩種情況跑過，沒有在真的不支援的瀏覽器上看過）。
- context 遺失與還原的路徑寫了但沒有實際觸發過。
- 桌機幀時間被 56 Hz 的 vsync 釘住，沒有每幀毫秒數的差。
- 打光開啟時沒有保真基準（照開案書，方向定案後才重錄）；`perf:fidelity` 只保證關閉時和 main 相同。
- 視覺上沒做的：地塊側面的類別（現在和頂面一樣吃月光）、被前方高地塊擋住的單位遮罩、貼地法陣與施法預警格的自發光、單位死亡時光的淡出、精靈形狀的影子、烘焙法線圖、群系各自的光色表（只有 MAGMA 的彩度覆寫）。
- 狀態層（`statusOrchestrator.draw`：護盾、狀態圈、燃燒、中毒）與遮擋剪影沒有進任何遮罩，被當成環境打光、降彩。
- 障礙物重新分發到遮罩時，它的加法發光疊層（冰晶星芒、黑曜柱、方尖碑的光）也一起畫進去，遮罩在那些位置不精確。
- 打光加 PLAY 模式沒有跑過（讀碼確認：遮罩用的剪影路徑在 `UnitOutlinePass.capture` 之前就返回，不會重複登記主角輪廓光）。
- 長距離走路的連續畫面沒有單獨擷取；`perf:lit --walk` 跟到的是交戰中的單位。
- 進入點只剩 0.1 kB（257.4／257.5 kB）：之後動 `RenderPipeline` 或任何首屏程式都可能超出預算。
