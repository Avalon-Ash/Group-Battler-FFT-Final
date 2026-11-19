# 優化開案書（2026-11-17，Fable 開案，Opus 5.5 執行）

> 範圍：專案架構盤點＋ `docs/HANDOFF.md` 全部待辦，排成可執行的包。
> 執行者照本檔拆包做，不重新設計；覺得某包不合理就回報，不自己改方向。做完一包：`docs/WORKLOG.md` 加一節、`docs/HANDOFF.md` 刪對應項、本檔該包標「完成」。全部做完刪本檔。
> 每個數字後面附產生它的指令；沒附的是讀程式碼的推論，會標「推論」。

## 契約（2026-11-17 已定義，分支 `arch/contracts`）

九包的型別、函式簽章與紅色驗收已經寫好，實作者補實作、不改契約。

| 包 | 型別與空殼 | 紅色驗收 |
| :-- | :-- | :-- |
| S2 | `types/Match.ts`、`engine/core/MatchSnapshot.ts`、`START_GAME.seed` | `tests/contracts/S2.contract.test.ts`（13 則） |
| S3 | `engine/core/Replay.ts` | `tests/contracts/S3.contract.test.ts`（7 則） |
| G2 | `Agent.castTarget` | `tests/contracts/G2.contract.test.ts`（4 則） |
| G3 | `types/Orders.ts`、`Agent.controller`／`order`、`SET_CONTROLLER` 與 `ORDER_*` 指令 | `tests/contracts/G3.contract.test.ts`（9 則） |
| G4 | `AIModeGraph`、`engine/ai/ModeGraphValidation.ts` | `tests/contracts/G4.contract.test.ts`（6 則） |
| R1 | `FrameInterpolation`（`UnitFrameStore.build` 的最後一個參數） | `tests/contracts/R.contract.test.ts`（4 則） |
| R2 | `MatchPhase`、`SessionView`、`engine/systems/match/MatchFlowSystem.ts`、`engine/systems/ui/views/session.ts` | 同上（6 則） |
| R3 | `SET_VIEW_INSETS`、`engine/presentation/ViewInsets.ts`、`DirectorSystem.viewInsets` | 同上（3 則） |
| U1 | `AppMode`、`WindowDef.modes` | 同上（2 則） |

怎麼用：
- 空殼丟 `ContractPending`（`engine/core/ContractPending.ts`）。`tests/contracts/status.ts` 標 `pending` 的包，驗收停在空殼算待辦；其他錯誤照樣失敗。
- **開始做一包，第一步把 `status.ts` 該包改成 `done`**，驗收變紅，再補實作到全綠。做完該包不得再有任何地方丟 `ContractPending`。
- 受保護的檔：`tests/contracts/` 下的 `*.contract.test.ts`、`contractTest.ts`、`simState.ts`，雜湊記在 `MANIFEST.json`。覺得驗收本身寫錯（不是實作不合）就回報，不自己改。驗收在空殼之後的段落還沒真的跑過，寫錯的可能存在。
- S1、G1、U2～U5 沒有契約測試，驗收照第 4 節。

定義契約時改掉的三處（以這裡為準，第 4 節已同步）：
- **`RESET_GAME` 改成還原開戰快照。** 現況是重新生成地形：`engine.restart()` 呼叫 `MapGenerator.rebuild`，它會抽亂數。探針 5 顆種子，重開後高度與障礙物 5／5 都不同，4／5 有一個單位站在障礙物上。種子只放在 `START_GAME`，`RESET_GAME` 不帶。
- **玩家單位沒有指令時原地堅守**（不追、不逃，射程內普攻）。要改成完全待命，只改玩家模式圖的資料。
- **G3 的操控模型定為即時＋可暫停下令**（使用者 11-17 未反對預設）。

## 0. 現況量測（2026-11-17，main `c2dbd8d0`）

| 項目 | 數字 | 指令 |
| :-- | :-- | :-- |
| 型別、測試、死碼 | 148 檔 1472 則全過，13.5 秒；knip 0 項 | `npm test`、`npm run knip` |
| 正式 bundle | 單一 chunk 1,343 kB（gzip 415 kB），Vite 警告超過 500 kB | `npm run build` |
| 程式規模 | engine 196 檔 3.2 萬行、tests 150 檔 2.6 萬行、tools 54 檔 1.5 萬行、data 77 檔 1.1 萬行、components 51 檔 0.5 萬行 | `git ls-files` 加 `wc -l` |
| 無畫面模擬速度 | 約 1.9 萬 tick／秒（10 人、含工具的量測包裝） | `balance:sim --battles=400 --dt=1/60`：458,400 tick 用 23.9 秒 |
| 5v5 一場多長 | 平均 19.1～19.6 秒 | 同上 `avgTime` |
| 步長對勝率的影響 | 1/30：55.5%／換邊 61.5%；1/60：55.2%／換邊 57.8%（各 400 場，±4.9%） | `balance:sim --battles=400 --seed=21 [--swapSides] [--dt=0.0166667]` |

bundle 組成（sourcemap 歸戶，minified 位元組）：

| 來源 | kB | 佔比 |
| :-- | --: | --: |
| `engine/renderers` | 214 | 16.4% |
| react-dom | 211 | 16.1% |
| `data/vfx` | 164 | 12.5% |
| `engine/systems` | 93 | 7.1% |
| `data/skills` | 58 | 4.5% |
| `engine/presentation` | 56 | 4.3% |
| UI 套件（TanStack Virtual 33、lucide 21、Radix＋Floating UI 約 75） | 約 130 | 約 10% |
| `components` 全部 | 約 80 | 約 6% |

## 1. 盤點結論

架構本身是健康的：分層有測試擋（`tests/LayerBoundary.test.ts`）、狀態欄位有唯一寫入者、座標協議有只減不增的基準、指令佇列與固定步長已經到位。下面是這次讀碼找到、`HANDOFF` 還沒列或列得不夠準的事：

1. **平衡工具和遊戲跑不同的步長。** `tools/balance/` 四支工具都用 1/30 秒，遊戲在 L3 之後固定 1/60 秒（`GAME_LOOP_PARAM.SIM_HZ`）。400 場的勝率差在信賴區間內（上表），所以不是警報，但 J 輪要調的是「玩家實際玩到的模擬」，工具應該跑同一個步長。成本是批次時間多約 26%（18.9 → 23.9 秒）。
2. **開局亂數有一半在 React 裡抽。** `hooks/useGameApp.ts` 用模擬流的 `random()` 抽地圖大小、佈局、出生格洗牌，夾在指令之間。照 `HANDOFF` L1「開局種子化＋逐指令重播」的做法，回放端不會重跑這些抽號，模擬流會整串位移，地圖就不一樣（推論，依 `engine/math/rng.ts` 單一序列的設計）。本檔改用「開戰快照」解掉（S2）。
3. **固定步長後畫面沒有插值。** tick 固定 60 Hz，但使用者主螢幕 239 Hz、iPhone 14 Pro 120 Hz；鏡頭與粒子每幀更新，單位每 tick 才動一次。手機掉到 30～50 FPS 時每幀跑 1 或 2 個 tick 交替，單位每幀位移不均勻。L3 之前 dt 跟著幀走，沒有這個問題（推論，依 `hooks/useGameLoop.ts` 與 `engine/renderer.ts` 的 `update`；還沒實機看過，R1 第一步先量）。
4. **對局流程寫在 React hook 的巢狀 `setTimeout` 裡。** `useGameApp` 439 行：展示模式的結算→退場→換圖→進場→等圖集→生成全在 hook；`session.isPlaying` 和 `engine.isRunning` 是兩份狀態；`unitCount` 用計時器輪詢。這違反 DECISIONS「UI 是純投影」，無畫面跑不了、回放接不上，也是 L2 玩家操控的阻礙（R2）。
5. **回放用重跑就夠，不需要中途快照。** 1.9 萬 tick／秒代表平均一場（約 1150 tick）重跑約 60 毫秒，兩分鐘的長局約 0.4 秒。undo 做成「從開戰快照重跑到前一個指令」，不做逐幀狀態快照（S3）。
6. **`new GameEngine({ mute: true })` 的參數沒人收。** 建構子沒有參數，工具傳的選項被丟掉，Node 裡照樣建立 `AudioSystem`。無害但會誤導（併入 S2）。
7. **AI 圖的節點鍵是沒檢查的字串。** `engine/systems/ai.ts` 找不到鍵時只 `console.warn` 再塞一個永遠失敗的節點，編輯器上線後這會變成靜默壞掉（G4）。
8. **熱路徑的字串鍵。** `GameEngine.getTerrainHeight` 與 `engine/renderer.ts` 的粒子落地查詢每次呼叫都組 `` `${q},${r}` `` 字串去查 `collapsingTiles`，而這張表絕大多數時間是空的。手機 JS 只佔每幀 2～5 ms（WORKLOG §2 BV），平均值不會有感，可能改善低 5%（U5，先量再做）。
9. **bundle 沒切。** 展示模式用不到的工具視窗、TanStack Virtual、Radix Select、白皮書原文都在進入點；react-dom 每次部署跟著重新下載（U2）。

刻意不做（附理由，別重提）：
- vitest `isolate: false`（省約 2 秒）：模擬亂數是模組層單一狀態，跨檔共用 worker 會互相污染。
- 特效登記表、奧義零件延遲載入：第一次施放時載入會卡幀，省的 60 kB 不值得。
- undo 用的中途狀態快照、`Agent` 序列化：重跑夠快（第 5 點）。
- 標準 ECS、地塊整片烘焙、WebGL：DECISIONS 已否決或暫緩，沒有新證據。
- 20 人岩漿掉幀：WORKLOG §2 BV 結論不變。S3 的回放檔會提供它缺的「固定奧義序列與站位」，有了再決定要不要重量。

## 2. 目標

依使用者的長期方向（從模擬工具走向可玩可編輯），關鍵路徑是：

```
S1 步長對齊 ─→ G1 平衡
S2 開戰快照＋種子 ─→ S3 回放與 undo ─→ G3 玩家操控 ─→ G5 行為編輯器
                         └→ 回放檔當效能基準場景（手機 A/B 降雜訊）
R1 畫面插值（獨立，渲染線第一條）
```

完成的定義：一場戰鬥可以存檔、重播、倒退；玩家可以接手一個單位下指令，指令進同一份紀錄；平衡數字量的是實際步長；高更新率螢幕與掉幀時單位移動平順；進入點 JS 變小且有預算擋住。

## 3. 拆包表

三條線可並行，**渲染線同時只開一條**（R 開頭，含生命週期）。規模：S＝半個工作階段內，M＝一個工作階段，L＝要拆成兩三個工作階段。

| 包 | 內容 | 線 | 依賴 | 規模 | 建議執行者 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| S1 | 平衡工具步長對齊（完成） | 地基 | — | S | Sonnet 子代理（機械） |
| S2 | 開戰快照＋種子＋引擎選項（完成） | 地基 | — | M | Opus 自己做 |
| S3 | 回放播放器、seek／undo、回放檔當基準場景（完成） | 地基 | S2 | M～L | Opus 自己做 |
| R1 | 畫面插值（先量再做；完成） | 渲染 | — | M | Opus 自己做（看圖定調） |
| R2 | 對局流程移出 React（MatchFlow） | 渲染（生命週期） | S2 | L | Opus 設計＋紅色驗收，Sonnet 子代理補實作 |
| R3 | 導播避讓手機底部 UI（HANDOFF E） | 渲染 | — | S | Opus 自己做 |
| R4 | 嘲諷、加速零件的方向輸入；刪 `BarPainter` 舊控制條（HANDOFF A） | 渲染 | — | S | Sonnet 子代理，Opus 看圖 |
| G1 | 技能平衡（HANDOFF J，併 A 的 AOE、G 的藍方勝率） | 邏輯 | S1 | L | Opus 自己做（判斷），批次模擬背景跑 |
| G2 | 施法目標與戰鬥目標分開，拆 `_savedCombatTarget`（完成） | 邏輯 | — | M | Opus 自己做 |
| G3 | 玩家操控（HANDOFF L2 Controller） | 邏輯＋UI | G2、S3、U1 | L | Opus 自己做；UI 小包可派 Sonnet |
| G4 | AI 圖鍵型別化、驗證、每職業 profile（完成） | 邏輯 | — | S～M | Sonnet 子代理 |
| G5 | 行為編輯器（HANDOFF L4） | UI | G3、G4、U1 | L | 開工前由 Opus 另寫一頁設計給使用者看 |
| U1 | `WindowDef` 布林改 `modes` | UI | — | S | agy Hydrogen 或 Sonnet |
| U2 | bundle 切分、視窗延遲載入、體積預算 | UI | — | M | Sonnet 子代理 |
| U3 | UI 小修：`testId`、`dbSignature`、平板縮放把手（完成） | UI | — | S | agy Hydrogen（三個小包） |
| U4 | 技能下拉加搜尋（完成 2026-11-19，WORKLOG §2 CH） | UI | U2 | S | Sonnet 子代理（實際：agy Neon high） |
| U5 | 熱路徑配置（先量再做） | 引擎 | — | S | Sonnet 子代理 |
| C1 | 合約校正（repo 合約與全域憲法不一致） | 文件 | 使用者同意 | S | Opus 提案，使用者核可 |
| 美術 | `BLOOD`／`PHYSICAL` DoT 畫面、羊模型、聖印衝擊圖示 | 美術 | Codex 11/21 刷新 | — | 走 `art-round`，不在本檔展開 |

建議順序：第一個工作階段 S1＋S2；第二個 S3；之後渲染線 R1 → R2 → R3 → R4，邏輯線 G1 → G2 → G3，UI 線 U1 → U2 → U3 隨時插空檔。

**執行者補充（2026-11-17，對齊同日修訂的全域憲法；上表的欄位不變，這裡補外派的選法）**
- 派工單固定三條：只結束自己啟動的行程（記 PID）；不為了過檢查改造形或改驗收；不新增耦合（`AGENTS.md` §1 第 6 點）。
- 表中寫「Sonnet 子代理」的包，Codex 刷新後（約 11/21）也可以整包派 **GPT-6.1 Sol xhigh**；GPT-6 Astra 只給看圖為主的工作（R4 的看圖、美術）或 Sol 兩次不及格的包。
- 表中寫「agy Hydrogen」的包用 high；xhigh 只給難的單包，本檔沒有需要 xhigh 的包。
- 顧問：執行的工作階段可以用 `/advisor` 掛一個等級不低於自己的模型當顧問（實驗功能，`/advisor off` 關閉，中途更改要 `/clear` 或 `/compact` 後才生效）。顧問只看得到呼叫它的那個工作階段，判斷依據是本檔與 `tests/contracts/`。Fable 當顧問會算進 Fable 的上限；Fable 用到上限就改掛 Opus 或關掉，不買點數。
- 終審（Fable）：每條線做完一段（建議 S2＋S3 之後）審一次 diff；執行者回報「驗收本身寫錯」時也由 Fable 改受保護檔並更新 `MANIFEST.json`。Fable 用不了時由 Opus 5.5 high 代審，受保護檔的更動要使用者明說同意。

## 3.1 交接：下一個工作階段從這裡開始（2026-11-19，Fable 寫）

**現況**：`main` 已含 S1～S3、C2、R1、R2、G2、G3 第一片與鏡頭標示、G4、U1～U4。契約只剩 R3 是 `pending`。還沒做的：R3、R4（渲染線）、U5、G1、G3 第二片、G5、C1、美術。

**開工先做兩件事**
1. 查額度（`quota` skill）。11-19 的快照：週全部 60%、Fable 計量 79%、時間進度約 57%（約 11/22 重設）；Codex 11/21 00:40 重設。照這組數字 Fable 超前，只開案與終審，實作交 Sonnet／Opus；數字變了就照全域憲法「Fable 預算」重判。
2. 問使用者 HANDOFF §3 的實機回饋到了沒有。G3 第二片的範圍、G1 動不動節奏都等它。

**派工順序**（執行者欄依 11-19 的 Fable 預算重排，和 §3 拆包表不同的地方以這張為準；額度變了再重判）

| 順位 | 包 | 執行者 | 並行 |
| :-- | :-- | :-- | :-- |
| 1 | R3 導播避讓（11-20 做完，分支 `feat/r3-view-insets`，agy Neon high＋Opus 審查） | Sonnet（紅色驗收已有 3 則；一次不及格就收回 Opus，prompt 要寫理由與 `[opus-ok]`） | 渲染線，獨占 |
| 2 | R4 零件方向、刪舊控制條 | Sonnet，終審者看截圖 | 渲染線，R3 合併後才開（11-20 刻意沒開：R3 未合併，R4 可能要重錄保真） |
| 隨時 | U5 熱路徑配置 | Sonnet，先交量測表再決定動不動 | 量測可並行；真的要改 `engine/renderer.ts` 的粒子查詢時算渲染線，排在 R4 後面 |
| 等回饋 | G1 技能平衡 | Opus 或 Fable（要判斷） | 第 1、2 步（錄基準、列離群）可先跑；改數值等使用者說節奏要不要放慢 |
| 等 Fable 恢復 | G3 第二片 | 使用者和 Fable 一起設計 | 使用者 11-20：手機不好點，手動模式要重做流程、改成主動式的遊戲 UI；第二片併進那次設計 |
| 等 Fable 恢復 | G5 行為編輯器 | 使用者和 Fable 討論設計 | — |
| 完成 | C1 合約校正 | 使用者 11-20 同意，Opus 改 | 分支 `docs/night-2026-11-20` |

**R3 派工單要補的事（開案書寫完之後才出現的）**
- 契約：`tests/contracts/R.contract.test.ts` 的 R3 三則；空殼在 `engine/presentation/ViewInsets.ts`；`UICommandSystem` 的 `SET_VIEW_INSETS` 現在是 `pending('R3')`。實作者開工先把 `tests/contracts/status.ts` 的 R3 改成 `done`，其他契約檔不准動。
- `DirectorSystem.buildFrame` 多了玩家單位的取景分支（WORKLOG §2 CD）：有效區域兩條路都要套，`tests/DirectorPlayerFocus.test.ts` 要維持通過。
- 手動置中現在走 `GameCanvas` 的 `recenterSoon`，要用同一份 insets。量 insets 的地方只能有一處（底部面板與播放列的高度由同一個模組回報），不在各元件各送各的。
- insets 預設全 0，桌機保真 6 張應該 0 差異；有差異就是 bug，不重錄。有效區域變小只會讓鏡頭拉遠；若改到縮放上限，照 METHODOLOGY §4 第 13 點跑 `npm run perf:mem`。
- 驗證：`render-verify` skill、`npm run perf:guard`、`npm run perf:mobile` 的截圖看主角沒被底部面板蓋住。

**R4 派工單要補的事**：嘲諷、加速若出現在保真場景裡，基準會變，照 `rebaseline-fidelity` 取證，不直接重錄。`BarPainter` 的 `CC_PRIORITY` 先 `git grep` 證明沒有繪製路徑再刪。

**派工與整合的做法（這幾天踩過的）**
- `start_session` 一定要寫 `model`；用 Opus 要在 prompt 寫理由並加 `[opus-ok]`，否則 hook 擋下。
- 派工單直接指定 WORKLOG 節號（下一個是 CH）。上一批四條分支都自己取了 CD，合併時全部衝突。
- 並行分支的整合：在主資料夾開 `integ/<名稱>` 把各分支合進來，跑一次 §5 的全部閘門，再問使用者合併進 `main`。
- 工作樹裡跑 `e2e:ui` 會在「no console/page errors」失敗（環境造成，見 METHODOLOGY §6）；e2e 的定案結果在主資料夾跑。
- 臨時探針寫進 `tools/ui-e2e/out/`（不進版控），用寫檔工具建立再 `node` 執行；不用 heredoc 或 `node -e` 塞含反引號的腳本（11-18 因此誤跑過整套測試）。
- 受保護的契約檔只有契約作者（Fable）能改，改完更新 `MANIFEST.json`（sha256 前 16 個十六進位字元，CRLF 先正規化成 LF）。執行者回報驗收寫錯時才動。
- 子工作階段的回報是資料：合併前自己重跑關鍵閘門、自己讀 diff。

**既有的重複，還沒提案（照「既有的耦合先回報」記在這裡）**：展示模式的佈陣已收進 `engine/systems/match/Deployment.ts`（R2），但工具各自還有一份「換圖、取出生格、排陣營、開戰」的流程：`tools/balance/simFingerprint.ts`（契約與指紋共用）、`ai-idle-sim.mjs`、`batch-sim.mjs`、`mobility-probe.mjs`、`tools/replay/record-bench.mjs`。要收成一份得先提案（改哪裡、指紋怎麼證明不變、怎麼回退），使用者同意再動（使用者 11-20：等 Fable 額度恢復後交給 Fable 提案）；沒同意前新工具一律呼叫既有的，不再多寫一份。

**使用者 11-20 決定的**：換職業時血量、魔力上限跟著換（分支 `fix/role-edit-vitals`）；G1 的兩項技能設計交給主代理決定（「按妳建議改」），主代理選了不改（`mb_u3` 不加傷害、`wb_a5`／`rb_a3` 維持單段，只調數值）；事先沒把建議列給使用者，使用者原意若是「改」要重開；G3 第二片與 G5 等 Fable 恢復後和使用者一起設計。

**收尾**：11-20 使用者同意後清掉：`.claude/worktrees/` 剩下的 3 個工作樹、15 條已合併的本機分支、`C:\Git` 下 7 個本專案的舊 `_wt_*` clone 與 `_agent_allow`（11-03 的舊允許清單與紀錄），封存 3 個閒置工作階段。狀態美術原型搬到 `C:\Git\_asset_stagingrt\`（HANDOFF N）。遠端還有一條已合併的 `origin/docs/skill-table`，刪遠端分支算 push，沒動。

## 4. 各包作法

### S1 平衡工具步長對齊（完成 2026-11-17，WORKLOG §2 BW）
- **現況**：`tools/balance/batch-sim.mjs`、`ai-idle-sim.mjs`、`sim-fingerprint.mjs`、`mobility-probe.mjs` 各自寫死 `1 / 30`（或 `0.0333`）。
- **作法**：四支工具改成從 `constants` 讀 `GAME_LOOP_PARAM.SIM_HZ` 當預設步長（它們本來就用 `ssrLoadModule`），`--dt` 留著做 A/B。`ai-idle-sim` 裡用「幾個 tick」表達的取樣間隔改成用秒換算，免得步長一改取樣頻率跟著變。`tools/balance/fingerprint.baseline.json` 因步長改變必須重錄：獨立 commit，訊息寫明「步長 1/30 → 1/60，玩法未改」。
- **加一個棘輪**：`tests/` 加一則掃 `tools/balance/*.mjs`，不得出現寫死的 `1 / 30`、`0.0333`。
- **驗收**：`npm run balance:fingerprint` 重錄後連跑兩次都 0 差異；`npm run balance:sim -- --battles=400 --seed=21` 的 `dt` 欄印出 0.0167。
- **停下來問**：重錄前後 `balance:idle` 的發呆、繞圈比例差超過 1 個百分點（代表 AI 行為對步長敏感，那是另一個 bug，先回報）。

### S2 開戰快照＋種子＋引擎選項（完成 2026-11-17，WORKLOG §2 BW）
- 執行時補的設計：`START_GAME` 在 tick > 0 是暫停後繼續（`togglePlay`），只有 tick 0 才擷取快照與播種；`matchSalt` 改成每顆引擎一份。
- **為什麼不照 HANDOFF 的「開局種子化＋逐指令重播佈陣」**：佈陣階段混著 UI 端抽號、手動拖曳、編輯器改圖，逐指令重播要求兩邊抽號順序永遠一致，任何人在 hook 多抽一次就整串壞掉。把佈陣的**結果**當資料存下來，回放只需要重播開戰之後的指令。附帶得到「存檔／分享一個佈陣」。
- **作法**：
  1. `types.ts` 加 `MatchSnapshot`（純資料、可 JSON）：`mapConfig`、場景 id、地塊與高度（`MapSystem` 的 `mapKeys`、`heightMap`）、障礙物、`zoneConfig`、`battleSetup`、技能庫中被編輯過的技能、每個單位的 `id／team／side／role／q／r／maxHp／skillIds／bodyType／look`、`_entityCounter`。
  2. `engine/core/` 加一個純函式模組：`captureMatch(engine)` 與 `restoreMatch(engine, snapshot)`。`restoreMatch` 走既有的清盤與生成路徑（`clear`、`AgentManager`），不另寫一套初始化。
  3. `START_GAME` 帶 `seed`：UI 沒給就由 `UICommandSystem` 產生（這是唯一允許用 `crypto.getRandomValues`／`Math.random` 取種子的地方），寫回指令再記錄；套用時先 `captureMatch` 存進 `engine.commands`（新欄位 `matchStart`），再 `seedSimulation(seed)`，然後 `play()`。`RESET_GAME` 改成 `restoreMatch` 回開戰快照（不帶種子，下一個 `START_GAME` 才播種）；`AgentManager.matchSalt = Date.now()` 兩處都刪掉，改由種子導出。
  4. `hooks/useGameApp.ts` 不再 import 模擬流的 `random`：在 `engine/math/rng.ts` 旁加一條佈陣用的獨立序列（同一顆 mulberry32，另一個狀態），hook 的洗牌、地圖大小與佈局、傳給 `rollShowcaseSetup` 的亂數來源都改用它。`place()` 裡那個為了對齊舊序列而空抽的 `random()` 一併刪除。`tests/RngSplit.test.ts` 加一條：`hooks/`、`components/` 不得 import 模擬流。
  5. `GameEngine` 建構子收 `{ audio?: boolean }`（Facade 的刻意變更）；工具與測試改傳 `{ audio: false }`，`?mute` 判斷留在組裝層。
- **驗收（先寫成紅色測試，再補實作）**：`tests/` 新增一則：引擎 A 隨機佈陣→開戰→跑 600 tick（中途送 `EDIT_AGENT`、`SET_OBSTACLE`）；取 A 的 `matchStart`＋種子＋戰中指令，丟進全新的引擎 B 重播；兩邊每 30 tick 的單位狀態字串（沿用 `sim-fingerprint` 的 `unitState` 欄位）完全相同。TEAMS、ROYALE、SQUADS 三種各一則。另一則：同一份快照換種子，結果不同（防空測）。`npm run balance:fingerprint` 0 差異（工具自己佈陣，不受影響）。
- **停下來問**：快照測試不過、而且差異來自快照以外的隱藏狀態（模組層變數、靜態欄位），列出是哪些欄位再決定收進快照還是改成引擎擁有；不要為了讓測試過而在 `restoreMatch` 裡補特例。

### S3 回放播放器、seek／undo（完成 2026-11-17，WORKLOG §2 BX；UI 使用者定案：回放與存檔放結算畫面）
- 執行時補的設計：暫停、繼續、倍率、展示旗標歸為「不影響模擬的指令」（`isSimNeutral`），回放檔不收、回放中照常放行；為此修掉 `play()` 繼續時重跑開局重設的既有 bug。回放打完或紀錄播完自動結束。
- **前提**：模擬流是模組層級的單一狀態，同一行程的兩顆引擎共用；回放、seek、undo 用第二顆引擎時不能交錯步進。
- **作法**：
  1. `ReplayFile`：`{ v, build, matchStart, seed, commands, endTick }`。`build` 用 Vite `define` 注入 git 短雜湊；版本不同時載入要警告（模擬可能已改）。
  2. 單一的步進入口：`engine/core/` 加 `stepSimulation(engine, replay?)`：若有回放，先把 `tick === engine.state.time.tick` 的紀錄用 `UI_COMMAND` 送進去（和 `tests/CommandQueue.test.ts` 的 `sendDue` 同一個做法，不用改 `engine/game.ts` 的 tick 順序），再 `engine.tick(固定步長)`。`hooks/useGameLoop.ts`、平衡工具、測試都改叫它，「誰決定步長」從此只有一處。
  3. 回放進行中 `UICommandSystem` 擋下 `GameCommand`（畫面指令、倍率、停止照常），並提供「接手」：停止回放、保留目前狀態繼續即時模擬，之後的指令接在紀錄後面。
  4. `seekTo(tick)`：`restoreMatch` → 開戰 → 快轉到目標 tick。快轉模式下跳過 `flushVisualEvents` 的 renderer 處理、音訊 cue、`director.update`；快轉結束呼叫一次 renderer 的重新同步（清掉暫態特效、浮字、序列）。undo＝ seek 到最後一個玩家指令的前一個 tick 並把它從紀錄移除。
  5. UI 最小化：`SystemMenu` 加存回放、載回放（JSON 下載／選檔，比照戰鬥紀錄的下載）；`PlaybackHUD` 加「回到開頭」（純圖示、不換行，`checkControlBars` 要照過）。拖曳時間軸留給之後。
  6. 效能基準場景：網址 `?replay=<檔>` 開機直接載入 `public/` 下的回放檔。挑一場 20 人岩漿存成基準檔，`perf:frames` 與之後的手機 A/B 都用它，解掉 WORKLOG §2 BV 的雜訊來源。
- **驗收**：測試：跑到 tick 900 → `seekTo(300)` → 再跑到 900，狀態字串和直接跑到 900 相同；undo 一個 `EDIT_AGENT` 後和「從沒送過」相同。`node tools/ui-e2e/runtime-smoke.mjs` 通過。實跑：存檔→重新整理→載入→播放到底，勝方一致。seek 後的畫面要看移動中的連續畫面（`render-verify`），確認沒有殘留的特效、屍體、危害區外觀。
- **停下來問**：有表現層狀態只能從事件重建、seek 後對不上（例如貼地殘痕、持續型特效）。先列清單，再決定是補「從模擬狀態重建」還是 seek 一律從頭播放，不要逐個補事件重放。回放 UI 的位置與外觀請使用者看過再定案。

### R1 畫面插值（渲染線）（完成 2026-11-18，WORKLOG §2 BY）
- **先量**：在 `tools/ui-e2e/out/` 寫一次性探針（參考 `tools/ui-e2e/unit-jitter-probe.mjs`），用主螢幕 headed 模式量一個直線移動單位每幀的 `footX` 位移，印出變異係數與「位移為 0 的幀佔比」，分別在 60／120／239 Hz 與節流到 40 FPS 下跑。把數字寫進 WORKLOG。位移為 0 的幀佔比 < 5% 且 40 FPS 下變異係數 < 0.15 就不做，本包結案。
- **作法**（量測確認有問題才做）：
  1. 遊戲迴圈把 `alpha = 累加餘量 / 步長` 交給 renderer；沒給時預設 1（＝畫最新狀態，和現在完全相同），所以 `__stepFrames` 這類工具與保真基準不受影響。
  2. 只在 `engine/renderers/frame/UnitFrame.ts` 的 `UnitFrameStore.build` 做：store 記每個單位上一個 tick 的腳點與腳下高度（用 `engine.state.time.tick` 判斷 tick 有沒有前進），腳點與高度在算排序鍵**之前**插值，所以排序鍵自然包含這個位移。繪製端都讀 frames，不用各自改。
  3. 瞬移不插值：前後腳點距離超過一格、剛生成、拖曳預覽中，直接取最新值。投射物同樣處理（它們的位置也是每 tick 更新）。
  4. 加網址旗標 `?interp=0` 關閉，給使用者實機 A/B；確認後旗標可留作診斷。
  5. 同一個 commit 更新 `engine/renderers/RenderSpec.ts` 與 `UnitFrame.ts` 檔頭。
- **代價**：畫面比模擬晚最多一個 tick（16.7 ms），這是固定步長的標準做法。跟著單位的粒子直接讀模擬位置，會比單位早最多一個 tick 的位移（2～3 px，推論），看得出來再處理。
- **驗收**：`npm run perf:guard` 通過且保真 0 差異（alpha 預設 1）；`npm test`（`tests/CoordinateProtocol.test.ts` 基準不得增加）；探針數字前後對照；`render-verify` 看移動中的連續畫面；請使用者在 239 Hz 主螢幕與 iPhone 比 `?interp=0`／預設。
- **停下來問**：保真基準出現非 0 差異；或需要改 `UnitFrame` 以外的繪製端才能對齊。

### R2 對局流程移出 React（MatchFlow）（完成 2026-11-18，WORKLOG §2 CA）
- **作法**：
  1. 引擎端新增對局流程系統（放 `engine/systems/` 下自己的子目錄）：一台狀態機 `LOBBY → PLAYING → RESULT_HOLD → TRANSITION_OUT → TRANSITION_IN → SPAWN_WAIT → PLAYING`，用真實時間推進（遊戲迴圈每幀呼叫一次，不在模擬 tick 裡），時間參數沿用 `GAME_APP_PARAM`。展示模式的抽圖大小、佈局、陣營設定、佈陣全部搬進來，用 S2 的佈陣序列。
  2. 等圖集這件事屬於表現層：流程系統發 `engine.bus` 事件公布下一批陣容，組裝層（`GameCanvas`）注入一個「準備好了嗎」的回呼；流程系統不 import `SpriteAtlasStore`（守住 `tests/LayerBoundary.test.ts`）。
  3. UI 改讀 selector：`engine/systems/ui/views/` 加 `selectSessionView`（階段、是否進行中、勝方、單位數），`useGameApp` 的 `session` state、`unitCount` 輪詢、所有 `setTimeout` 鏈刪掉；hook 只剩「發指令＋編輯器的 UI 狀態」。
  4. 轉場階段由流程系統持有，renderer 從引擎讀，不再經 React props 傳 `transitionPhase`。
- **紅色驗收先寫**：無畫面測試：展示模式連跑 3 局（用假時鐘推進），每局都有開戰、分出勝負、換圖、下一局人數與陣營設定有變。這則測試現在寫不出來，就是要搬的理由。
- **驗收**：上面的測試；`node tools/ui-e2e/runtime-smoke.mjs`；`npm run e2e:ui`；StrictMode 下重新掛載不凍結（METHODOLOGY §4 第 2 點）；多局探針留在展示模式跑 5 局不停（別按 START SIMULATION）；`npm run perf:guard`。
- **停下來問**：轉場的時間點或畫面和現在不同（使用者 11-01 已實機確認轉場 OK，不能改到觀感）；Sonnet 子代理同一包兩次不及格就收回 Opus。

### R3 導播避讓手機底部 UI
- **作法**：新增畫面指令 `SET_VIEW_INSETS`（上、右、下、左，CSS px；加進 `VIEW_COMMAND_TYPES`，不進紀錄）。UI 層在底部面板開合、播放列高度改變時送出。`engine/presentation/DirectorSystem.ts` 把 `screenW／screenH` 換成扣掉 insets 的有效區域交給 `DirectorShot` 與鏡頭視窗，焦點往上偏移 `(下 − 上) / 2`。手動模式的置中（`centerCamera`）用同一份 insets。
- **驗收**：`tests/` 的導播測試加一則：有 200 px 底部 inset 時，主角的螢幕 Y 落在有效區域的中央帶內。`perf:mobile` 模擬下截圖看主角沒被面板蓋住。HANDOFF E 的另一項（別處的奧義拍不到）不在本包。

### R4 嘲諷、加速零件方向；刪舊控制條
- **作法**：`EffectSlot.sourceId` 已記嘲諷者，`engine/renderers/status/` 的零件畫法加一個方向輸入：嘲諷＝從單位指向嘲諷者（讀兩者的 `UnitFrame`，不自己算高度），加速＝移動方向（靜止時用 `facing`）。方向在 `StatusOrchestrator` 算好傳給 painter。`engine/renderers/hud/BarPainter.ts` 的 `CC_PRIORITY` 與相關型別讀的是已不存在的欄位，先 `git grep` 證明沒有繪製路徑用到再刪。
- **驗收**：`node tools/vfx/fx-shot.mjs` 或 VFX Library 截圖：嘲諷箭頭指向嘲諷者、速度線順著移動方向；`npm run perf:guard`；`npm run knip` 無新增。

### G1 技能平衡
- **前提**：S1 已合併。Codex 見底（約 11/21 刷新），照憲法由 Opus 自己做，不等。兩項設計題使用者 11-20 交給主代理決定，主代理選了不改（不加 `mb_u3` 傷害、`wb_a5`／`rb_a3` 不做多段）。第一輪數值 11-20 做完（分支 `balance/g1-skills`，WORKLOG §2 CM）：兩個種子合併藍方勝率 51.2%；單技能 ±5% 沒達標，剩下的是設計題（`rr_u1`）與只調數字推不動的紅方強招。
- **作法**：
  1. 基準：`balance:sim` 1500 場 seed 21，正常與 `--swapSides` 各一次；大逃殺用 `npm run balance:idle -- --scenario=ROYALE` 的 `skillTable`。存成基準 JSON（放 `tools/ui-e2e/out/`）。
  2. 用 `npm run balance:report` 列出離群：每場施放 < 0.5 次的機動技（`mr_m2`、`sr_m1`、`mb_m2`）、勝率貢獻 ±5% 以上的技能（HANDOFF A 列的 `mb_u4`、`rr_u3`、`rr_u5`、`mr_u5`）、新近打得中近敵的 `mb_m1`、`mr_m1`、`sb_m2`、`sr_m2`。
  3. 只改 `data/skills/`，一次一組、每組改完重跑 600 場看方向，方向對了再跑 1500 場定案。不要只讀數值表判斷（常常方向相反）。
  4. 定案後重錄 `fingerprint.baseline.json`，commit 訊息列出改了哪些技能。
- **目標**：兩種站位平均藍方勝率 50% ± 1.5%；沒有單一技能勝率貢獻超過 ±5%；機動技每場施放 ≥ 0.6 次或明確決定它就是情境技。
- **停下來問**：`mb_u3` 要不要加傷害（要連特效一起改，違反奧義視覺規則 C7）、`wb_a5`／`rb_a3` 多段（要先做主動技多段視覺）這兩項是設計決定，列選項給使用者，不自己定。

### G2 施法目標與戰鬥目標分開（完成 2026-11-18，WORKLOG §2 BZ）
- **現況**：`a.target` 同時當戰鬥目標與施法目標，對友軍施法時把敵人暫存在 `_savedCombatTarget`（`engine/ai/BTRegistry.ts` 8 行、`engine/core/AgentLifecycle.ts` 1 行）。設計在 `docs/AI_ROYALE_DESIGN.md` §10 M2。
- **作法**：`Agent` 加 `castTarget`（唯一寫入者：施法開始寫、施法結束或中斷清，登記進 `engine/core/AgentOwnership.ts`）；戰鬥管線讀施法目標的地方改讀它；`a.target` 只表示戰鬥目標；刪 `_savedCombatTarget` 與 `restoreCombatTarget`。
- **驗收**：`tests/BTOptimization.test.ts` 相關兩則改寫成新語意後通過；`npm run balance:fingerprint`——預期**會變**（目標不再被施法打斷重選），所以改看 `balance:sim` 600 場勝率與 `balance:idle` 發呆、繞圈比例都在改動前 ±1.5 個百分點內，再重錄指紋。
- **停下來問**：勝率或發呆比例超出範圍。

### G3 玩家操控（Controller）（第一片完成 2026-11-18，WORKLOG §2 CC；第二片等使用者試玩後再開）
- **設計**：
  - 外部仍只看到 `a.bt.tick(a)`，`engine/game.ts` 不用改。控制者＝這個單位用哪一張模式圖：AI 用 `AI_MODE_GRAPH`；玩家用一張新的小圖（資料放 `data/ai_profiles.ts` 旁）：`受控中斷 → 執行指令 → 沒指令時待命或自動普攻`。硬控、定身、詠唱中斷沿用同一批條件節點。
  - `Agent` 加兩個純資料欄位：`controller: 'AI' | 'PLAYER'` 與 `order`（移動到格、攻擊目標、施放第幾招對誰／哪格、停止）。唯一寫入者是新的指令處理（`ORDER_MOVE`／`ORDER_ATTACK`／`ORDER_CAST`／`ORDER_STOP`／`SET_CONTROLLER` 這幾個 `GameCommand`），所以自動進佇列、進紀錄、可回放、可 undo。
  - 執行用三個新的動作節點（執行移動、執行攻擊、執行施放），內部呼叫既有的 `engine.moveAgentToHex`、`engine.initiateCast`、施放條件查詢；不複製 AI 的決策碼。
  - 輸入：手動模式選取單位後，點地面＝移動、點敵人＝攻擊、技能列點招再點目標＝施放。`hooks/useGameInput.ts` 只負責把點擊翻成指令。手機用點選，不做拖曳框選。
- **第一個可玩切片**（先交這個給使用者試）：手動模式、一個單位切成玩家控制、移動與普攻；其他單位照常 AI。技能施放與多單位是第二片。
- **驗收**：測試：一串固定的 order 指令重播兩次結果相同；沒有任何玩家單位時 `npm run balance:fingerprint` 0 差異（AI 路徑沒被動到）；`npm run e2e:ui`、`npm run audit:ui -- all`。
- **已定**（契約 G3）：即時＋可暫停下令；沒指令時原地堅守。現在 5v5 一場平均 19 秒，第一個切片交給使用者試玩後，節奏太快再談放慢（會動到平衡）。
- **第二片（還沒做，等使用者試玩第一片後定範圍）**：
  - 技能施放的 UI（技能列點招再點目標）。引擎已經收 `ORDER_CAST`（單位、地面格、或不指定目標），只缺輸入與技能列。
  - undo 的 UI（`undoLastCommand` 已可用，指令都在紀錄裡）、停止指令的按鈕（`ORDER_STOP`）。
  - 多單位、`AppMode` 的 `PLAY`。（場上標示與鏡頭跟隨 11-19 已做，WORKLOG §2 CD；導播已支援多個玩家單位時跟點選的那一個。）
  - 堅守時被遠程打不會還手（射程內沒有敵人就不動）：試玩後看要不要加「被打就反擊」之類的姿態。
- **承接 G2（Fable 終審 2026-11-18）**：
  - 玩家指令節點直接呼叫 `initiateCast` 之前，要先用 `aimCastAt` 設好或清掉施法目標（唯一寫入者是 `SkillStateMachine`）。
  - 地面施法的瞄準還沒收進 `castAim`：`CastPushPull` 對地面起手時仍靠清掉 `a.target` 讓管線改瞄格子，施法後由 `HasTarget` 重新選敵（G2 先接受，只發生在背水一戰的推拉）。G3 的 `ORDER_CAST` 帶 `q`、`r` 時會碰到同一件事：到時把「這次施法瞄單位還是瞄格子」收進 `castAim` 一處判斷，`CastPushPull` 就不必再清戰鬥目標。

### G4 AI 圖鍵型別化與 profile（完成 2026-11-19，WORKLOG §2 CE；鍵型別改用 Record 標註，原因見該節）
- **作法**：`BTDef.key` 的型別改成 `keyof typeof BTConditions | keyof typeof BTActions`（把兩張表從 `Record<string, …>` 改成 `satisfies`），找不到鍵變成編譯錯誤；加一個純函式 `validateModeGraph(graph)`（每條邊的兩端存在、每個模式有樹、`onFailure` 指向存在的模式），引擎建樹前呼叫，失敗就丟錯而不是塞假節點。`AISystem.buildAI` 目前忽略單位、全體共用一張圖：改成依職業查 profile（預設全部指向現在這張，行為不變）。
- **驗收**：`npm run lint`；新測試餵壞掉的圖要報錯；`npm run balance:fingerprint` 0 差異。

### G5 行為編輯器
- 依賴 G3、G4、U1，而且是 UI 與資料格式的設計題。開工前由 Opus 寫一頁設計（編輯範圍先做參數與門檻、再做結構；存哪裡；怎麼和回放檔的 `build` 版本共存）給使用者看，本檔不展開。

### U1 `WindowDef` 布林改 `modes`（完成 2026-11-18，WORKLOG §2 CB）
- **作法**：`types.ts` 的 `visibleInShowcase／visibleInManual／visibleOnGameOver` 換成 `modes: readonly AppMode[]`（先有 `SHOWCASE`、`MANUAL`、`GAME_OVER`，之後 G3、S3、G5 會加 `PLAY`、`REPLAY`、`EDIT`）；`data/ui/windows.ts` 改寫；`components/ui/window/windowRegistry.tsx` 的過濾函式改成查表；目前模式由 selector 給。型別由 Opus 先加好，代理只改使用處。
- **驗收**：`tests/WindowStore.test.ts`、`npm run e2e:ui`、樣式基準 0 變動。

### U2 bundle 切分與體積預算（完成 2026-11-19，WORKLOG §2 CF）
- **作法**：
  1. `vite.config.ts` 加 `manualChunks`：react／react-dom 一包、UI 套件（radix、floating-ui、tanstack、lucide）一包，部署後舊訪客不用重抓。
  2. `windowRegistry.tsx` 的 `render` 改 `React.lazy`＋`Suspense`（fallback 用 `EmptyState`）：`logs`、`db`、`vfxmap`、`inspector`、`behaviorTree`、`monitor`、各設定視窗都是展示模式看不到的。確認 TanStack Virtual、Radix Select 跟著離開進入點。
  3. 白皮書原文（`?raw`，8.5 kB）改成按下載時才動態 import。
  4. 預算：新增一支檢查腳本（掛進 `package.json` 的 `build` 之後，CI 會跑到），進入點 gzip 超過預算就退出碼 1。預算訂在改完的實測值 ＋3%。
- **預期**（推論）：進入點 gzip 415 → 約 280～300 kB（vendor 另一包約 105 kB 可快取）；首次造訪總下載量差不多，重複造訪與每次部署後省最多。
- **驗收**：`npm run build` 無 500 kB 警告或警告只剩引擎主包；`npm run e2e:ui` 每個視窗都開得起來；`node tools/ui-e2e/runtime-smoke.mjs`。
- **不做**：特效登記表與零件烘焙器的延遲載入。

### U3 UI 小修（三個獨立小包；完成 2026-11-19，WORKLOG §2 CG：`dbSignature` 量測後結案不做，平板把手驗收改用 1180×820，820 寬以下是底部面板）
- `Tabs`、`Segmented` 加 `testId` 欄位，移除塞在 label 裡的 span；e2e 選擇器跟著改。
- `engine/systems/ui/views/l3.ts` 的 `dbSignature` 每 100 ms 串一次整個技能庫：改成技能庫版本號（唯一寫入者 `UICommandSystem` 的 `UPDATE_SKILL` 與技能庫替換處各加一）。
- 平板觸控下視窗左右縮放把手（`UI_WINDOW.HANDLE_PX_COARSE` 44 px）蓋住內容邊緣：把手改成跨在邊框上、大部分在視窗外側，內側只留 12 px；貼齊螢幕邊時才往內縮。先查 `web-guidance`（觸控目標大小）。驗收：`npm run e2e:ui` 加一則平板寬度下點得到視窗內最靠邊的控制項。

### U4 技能下拉搜尋（完成 2026-11-19，WORKLOG §2 CH：146 行，沒用 Virtual、沒加 `cmdk`）
- Radix Select 沒有搜尋。用 Radix Popover＋輸入框＋既有的 TanStack Virtual 列表組一個 Combobox primitive（放 `components/ui/primitives/`，進 Gallery）；不加新依賴。若實作超過約 150 行或無障礙做不齊，改用 `cmdk` 並先問使用者（新增依賴）。

### U5 熱路徑配置（先量再做）
- **先量**：`npm run perf:profile` 加配置取樣（CDP `HeapProfiler.startSampling`），20 人戰鬥 60 秒，列出配置量前 10 名的函式。
- **候選**（都要量測支持才動）：`GameEngine.getTerrainHeight` 與 `engine/renderer.ts` 粒子落地查詢在 `collapsingTiles.size === 0` 時直接跳過組字串；`tick` 開頭的 `agents.filter` 改成有單位 `fullyDead` 才重建；`getSpatialHazardsAt` 的 `filter＋some`。
- **驗收**：配置量前後對照寫進 WORKLOG；`npm run balance:fingerprint` 0 差異；`npm run perf:guard`。前 10 名裡沒有這些候選就結案不做。

### C1 合約校正（要使用者同意）
repo 合約寫於 Pro 方案時期，和全域憲法（11-14、11-16 修訂）有出入。憲法位階較高且 repo 只能更嚴，下列是「過時」不是「更嚴」，建議改：
- `CLAUDE.md`、`docs/METHODOLOGY.md`、`docs/HANDOFF.md` 的「Claude（Pro）」「Gemini 3.8 Flash 為主力」→ Max 5x、agy 主力 Gemini 4 Hydrogen。
- `CLAUDE.md` 派工表「Codex 不派寫程式實作與架構」→ 憲法已改為可派整包設計＋實作；repo 要維持更嚴就明寫理由，否則刪。
- `HANDOFF` §2 排程裡的「Codex 11/11 刷新後」等過期日期。
- 把憲法的「動手原則」（定調類主代理自己做）在 repo 合約補一句，雲端工作階段才讀得到。
改完跑 `tests/HarnessContract.test.ts`，並照 `codex-dispatch` 同步副本。

### C2 模擬狀態字串與佈陣的重複定義（完成 2026-11-17：使用者同意後由 Opus high 實作、Fable 終審；共用模組在 `tools/balance/simFingerprint.ts`，以下留作紀錄）
- **現況（Fable 自己造成的重複，照憲法「既有的耦合先回報」列出）**：「單位狀態字串」（比對兩場戰鬥是否相同用的欄位與格式）和「隨機佈陣開戰的流程」各有兩份：`tools/balance/sim-fingerprint.mjs` 與 `tests/contracts/simState.ts`。其中一邊改了欄位，另一邊不會跟著變，契約驗收和指紋量的就不是同一件事。
- **提案**：抽成一個共用的 TS 模組（建議 `engine/core/SimFingerprint.ts`：`unitState(agent)`、`stateOf(engine)`、`deployBattle(engine, scenario)`），工具用 `ssrLoadModule` 讀它，`simState.ts` 改成轉呼叫。
- **什麼時候做**：S1、S2 合併之後的獨立小包。S1 正在改 `sim-fingerprint.mjs`，不併進去；S1、S2 期間兩邊都不改欄位與格式。
- **誰做**：`simState.ts` 是受保護檔，由 Fable 終審時改並更新 `MANIFEST.json`；使用者明說授權的話也可以由 Opus 做，diff 只允許「定義換成 import」。
- **證明行為不變**：`npm run balance:fingerprint` 0 差異（不重錄）、`tests/contracts/SimState.test.ts` 通過、`tests/contracts/Manifest.test.ts` 在更新雜湊後通過。
- **回退**：單一 commit，`git revert` 即可。

## 5. 共用驗收指令

每包合併前都要過：

```bash
npm run lint
npm test
npm run build
npm run knip
npm run balance:fingerprint
```

動到渲染或生命週期（R 開頭、S3、U2）再加：

```bash
node tools/ui-e2e/runtime-smoke.mjs
npm run perf:guard
```

動到 UI 再加 `npm run e2e:ui` 與 `npm run audit:ui -- all`。

`balance:fingerprint` 預期會變的只有 S1（步長）、G1（平衡）、G2（目標語意）；其他包出現差異就是 bug。

## 6. 什麼時候停下來問

- 合併進 `main`、`git push`：每包分開問。
- 保真基準或 UI 樣式基準出現非預期差異；任何想重錄基準的時候（S1、G1、G2 的指紋重錄已在本檔授權，其餘沒有）。
- 各包「停下來問」列的條件。
- 同一包兩次不及格：先查是不是本檔的設計或規則造成的，是就回報改開案書；不是才換執行者，並寫出新假設。
- 需要使用者決定的設計題：G3 操控節奏、G1 的兩項技能設計、S3 回放 UI、U4 是否加 `cmdk`、C1 合約內容。
- 發現本檔的前提不成立（例如 R1 量測顯示沒有抖動、U5 候選不在配置前 10 名）：照該包寫的結案條件收掉，不硬做。
