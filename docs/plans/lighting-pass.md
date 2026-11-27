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
