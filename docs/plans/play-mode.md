# PLAY 模式開案書（2026-11-23，Opus 5.5 代 Fable 開案，Fable 終審後修訂）

> **2026-11-23 結案**：P0～P7 全部完成（WORKLOG §2 CU、CW、CY）；剩下的實機手感回饋在 HANDOFF §3。本檔不刪：ADR 0025、DECISIONS 與受保護的 `tests/contracts/PLAY.contract.test.ts` 引用它。
> **2026-11-24 註記**：P5 的選目標規則（下面「機動技點地面或單位」「射程 0＝SELF，範圍技與機動技＝UNIT_OR_GROUND」）已改：射程 0 的機動技＝SELF；機動技照出手時實際位移分三種（突進／瞬移＝可點地面、後撤＝SELF、不動自己的照一般規則）。以程式 `engine/systems/ui/castTargeting.ts` 與 DECISIONS 2026-11-24 為準（WORKLOG §2 CZ、DA）。本文其餘不改。
> 範圍：HANDOFF L2（手動模式改成主動式遊戲 UI）＋開案書 `docs/plans/optimization-2026-11.md` 的 G3 第二片。G5 行為編輯器不在本檔。
> Fable 本週額度用完，由 Opus 開案；Fable 經 API 終審一次（2026-11-23，報告在 commit 訊息），本檔已照它修訂。執行者照本檔拆包做，覺得不合理就回報，不自己改方向。做完一包：`docs/WORKLOG.md` 加一節、本檔該包標「完成」；全部做完把剩下的併回 HANDOFF 再刪本檔。
> 每個數字附產生它的指令；沒附的是讀程式碼的推論，標「推論」。

## 1. 使用者定的前提（2026-11-23）

| 題目 | 決定 |
| :-- | :-- |
| 操控範圍 | 一隻主角，其他隊友照 AI 打 |
| 平台 | 桌機優先（滑鼠＋快捷鍵）；手機保證能玩，不為手機另做一套 |
| 時間 | 即時；點了技能、在選目標時自動放慢，放出去或取消就恢復；手動暫停保留 |
| 進入 | 獨立的 PLAY 模式：選主角 → 自動佈陣 → 開打 → 結算（再來一場／回主畫面）。工作平台式的手動模式留給編輯，不改 |
| 施放 | 技能按鈕＋點目標；自身技能按一下就放；機動技點地面（往那裡位移）或點單位 |
| 主角陣亡 | 觀戰到這一場結束（鏡頭交回導播、可以加速）；隊友贏了一樣算贏 |
| 沒有指令時 | 自動反擊：不自己亂跑，被打時去打攻擊自己的人，打完回到堅守 |

## 2. 現況（讀碼）

- 引擎端已備好：`Agent.controller`、`PLAYER_MODE_GRAPH`、`ORDER_MOVE`／`ORDER_ATTACK`／`ORDER_CAST`／`ORDER_STOP`（`types.ts`，`ORDER_CAST` 帶槽位與單位或格子）、指令進紀錄可回放（WORKLOG §2 CC）；導播跟著玩家單位、場上標示（§2 CD）。
- 對局流程在 `engine/systems/match/MatchFlowSystem.ts`（展示回合與手動的隨機戰場），組裝層（`hooks/useGameApp.ts`）直接呼叫它的方法；佈陣是 `engine/systems/match/Deployment.ts` 的純函式。
- 點擊：`engine/systems/ui/tapIntent.ts` 決定意圖（模擬層，不得 import 表現層），`hooks/useGameInput.ts` 算出點到的格子與單位再交給它；點選以格子判定（`queryAgentAt`），沒有點擊容差。
- 時間倍率：`state.time.targetTimeScale` 有三個寫入處：`UICommandSystem` 的 `SET_TIME_SCALE`、`VictorySystem`（結算慢動作與還原）、`engine/game.ts` 兩個重設。**既有耦合，照憲法回報**：本案不再加寫入者。表現層也用引擎的倍率拆時間（`hooks/useGameLoop.ts` 的 `renderer.update`）。
- bundle：進入點 gzip 254.2／257.5 kB（2026-11-23 `npm run build`），PLAY 的 UI 必須放延遲載入的 chunk。

## 3. 架構

```
主畫面 ──PLAY──▶ 選主角（React 畫面；職業＋四個技能槽，預設組可直接開打）
                      │ 組裝層呼叫 engine.matchFlow.startPlay(hero)
                      ▼
            MatchFlowSystem（PLAY 分支；isPlay 從 startPlay 起成立）
              Deployment 排陣容：主角在陣營 0、SET_CONTROLLER＝PLAYER、SET_AGENT_SKILL 照選的，其餘 AI
              → START_GAME（種子來自 nextSeed；開戰快照記下主角是玩家控制）
                      ▼
            戰鬥 HUD（React，延遲載入）
              技能列 ── 點鈕／按 1～4 ──▶ SET_AIM {agentId, slot}（畫面指令）→ engine.state.aim
                 │                         │ 遊戲迴圈：effectiveTimeScale 放慢；疊層：讀 aim 畫可選目標
                 │                         ▼
                 │                   點目標 ── resolveTap ── ORDER_CAST ──▶ 指令佇列（已有）
              點地面／敵人 ─────────────────── ORDER_MOVE／ORDER_ATTACK（已有）
              停止鈕（S）──────────────────── ORDER_STOP（已有）
              Esc／右鍵 ───────────────────── SET_AIM null
                      ▼
            結算（停在 RESULT_HOLD，不自己轉場）：勝負、主角數據
              再來一場 → nextPlayMatch()；回主畫面 → exitPlay()（回展示模式）
```

- **模式**：`SessionView.isPlay`、`playHeroId` 由對局流程擁有；`appModeOf` 回 `PLAY`。視窗用 `WindowDef.modes` 決定 PLAY 時顯示什麼：預設只有戰鬥 HUD 與系統選單。
- **佈陣不另寫**：PLAY 是 `Deployment` 的一種陣容規則。可以擴充 `RosterSlot`（例如標出主角那一格）或讓 `deployRoster` 回傳生成的單位 id；每隊人數放 `constants/`（`PLAY_PARAM`）。HANDOFF L 第 4 項（工具各有一份佈陣）不在本案，但本案不得再多一份。
- **瞄準狀態放引擎**（Fable 終審）：`engine.state.aim: { agentId, slot } | null`，唯一寫入者 `UICommandSystem`：`SET_AIM`（畫面指令、不進紀錄；只收玩家單位、有技能的槽，其他當取消），開新的一場與 `RESET_GAME` 時取消。這樣 Canvas 疊層與 React HUD 讀同一份，放慢也不會帶進下一場或展示模式。
- **放慢**：`effectiveTimeScale(state)`＝瞄準中 `timeScale × PLAY_PARAM.AIM_SLOWMO_FACTOR`，否則 `timeScale`。遊戲迴圈的 `planFixedSteps` 與 `renderer.update` 拆時間都改用它（不然放慢時特效照原速）。不做緩動（單一寫入者下做不出來，要做得放在遊戲迴圈用真實時間，先不做，試玩後再看）。暫停時 0 × 倍率＝0，不用特別處理。
- **「這招能點誰」只判斷一次**：`engine/systems/ui/castTargeting.ts` 的 `isCastTarget`；`queryCastTargeting`（HUD、疊層）、`resolveTap`（點擊）、`UICommandSystem` 的 `ORDER_CAST` 驗證都用它。射程 0＝SELF，範圍技與機動技＝UNIT_OR_GROUND，其他＝UNIT。
- **點擊規則**（`resolveTap`）：瞄準中點可選單位＝`ORDER_CAST`、範圍技或機動技點空地＝對那一格、其他不動作；PLAY 不瞄準時點隊友不改選取。
- **點擊容差**：在算「點到哪個單位」的地方（表現層，`useGameInput` 或它呼叫的查詢）用 `UnitFrame` 的身體框，找不到才退回格子；`tapIntent` 不碰表現層（`tests/LayerBoundary.test.ts`）。容差參數放 `constants/ui.ts`，滑鼠、觸控各一個值。
- **快捷鍵**（桌機優先）：1～4 技能槽、S 停止、Esc 或右鍵取消瞄準、空白鍵暫停。手機：同一排按鈕放大，點目標同一套流程。
- **主角陣亡**：這一場照打完；導播在主角死後回到自己選主角（現在「玩家單位優先」只對活著的單位，推論，P1 要驗）。HUD 顯示觀戰狀態與加速。
- **自動反擊**：只給 PLAY 的主角。玩家圖的堅守模式加「被打就鎖定攻擊者、打到它死或離開視野再回堅守」。G3 契約「沒有指令時原地堅守」（手動模式的玩家單位）不變，所以做成主角的姿態（一個資料欄位或另一張模式圖，P7 開工前定），不改手動模式的行為。
- **undo**：PLAY 模式不放，留在手動與回放。

## 4. 拆包表

規模：S＝半個工作階段，M＝一個工作階段，L＝兩三個工作階段。Gemini 池偏低（11-22 週剩 37.6%），可拆的包派 Sonnet 子代理；Codex 使用者 11-23 留給其他專案，本案不用。

| 包 | 內容 | 依賴 | 規模 | 執行者 |
| :-- | :-- | :-- | :-- | :-- |
| P0 | 契約（完成 2026-11-23，Fable 終審後修訂）：`MatchFlowSystem.startPlay`／`nextPlayMatch`／`exitPlay`／`playHeroId`、`SessionView.isPlay`／`playHeroId`、`SET_AIM` 與 `engine.state.aim`、`effectiveTimeScale`、`queryCastTargeting`／`isCastTarget`、`resolveTap` 的瞄準與 PLAY 規則；紅色驗收 `tests/contracts/PLAY.contract.test.ts`（P1 五則、P2 四則、P5 六則＋一則前提自檢）；ADR 0025 | — | S | Opus |
| P1 | 引擎（完成 2026-11-23，WORKLOG §2 CW；Sonnet 子代理回報不實，Opus 接手）：PLAY 流程分支（佈陣、開戰、結算停住、再來一場、回主畫面）；主角陣亡後照打完 | P0 | M | Opus |
| P2 | 時間（完成 2026-11-23，WORKLOG §2 CU）：`SET_AIM`、開新局取消、`effectiveTimeScale` 接進 `planFixedSteps` 與 `renderer.update` | P0 | S | Opus |
| P3 | 點擊容差（完成 2026-11-23，WORKLOG §2 CW）：表現層用單位身體框找點到的單位、裝置別容差 | — | S | Sonnet 子代理 |
| P5a | 選目標規則（完成 2026-11-23，WORKLOG §2 CW）：`queryCastTargeting`、`isCastTarget`、`resolveTap` 的新規則，`ORDER_CAST` 驗證改用 `isCastTarget`。技能列的 selector（冷卻、魔力、能不能放）移到 P5 開工時先定型別與驗收。注意：20 招機動技有 6 招射程 0，點地面時引擎怎麼瞄格子（G2 終審記的 `castAim`）P5 要驗 | P0、P1 | S | Opus |
| P7 | 主角自動反擊的姿態（完成 2026-11-23）：`Agent.stance`（`SET_STANCE`、開戰快照帶得走）、玩家圖堅守模式先試 `CounterAttack`；PLAY 主角設 COUNTER，手動模式維持 HOLD | P1 | S | Opus |
| P4 | UI（完成 2026-11-23）：主畫面 PLAY 入口、選主角畫面（職業＋四槽，預設「隨機」，使用者說長鏈做完、不先看原型）、結算畫面（延遲載入） | P1 | M | Opus |
| P5 | UI（完成 2026-11-23）：戰鬥 HUD（技能列、瞄準高亮、停止、快捷鍵、觀戰狀態）；施放指令成立時 UICommandSystem 取消瞄準 | P2、P3、P5a | M | Opus |
| P6 | 收尾（完成 2026-11-23，WORKLOG §2 CY）：e2e 走一遍 PLAY（桌機＋手機尺寸）、`audit:ui`、bundle 預算、HANDOFF 回寫 | 全部 | S | Opus |

順序：P0 → （P1、P2、P3 並行；P3 只動輸入與表現層） → P5a、P7 → P4 → P5 → P6。P5 動到戰場疊層（瞄準高亮），屬渲染線，同時只開這一條。

## 4.1 契約怎麼用（同 `optimization-2026-11.md`「契約」節）

- 空殼丟 `ContractPending`；`tests/contracts/status.ts` 的 P1、P2、P5 現在是 `pending`（契約 P5 對應本表的 P5a）。**開始做一包，第一步把該包改成 `done`**，驗收變紅，再補實作到全綠；做完不得再有地方丟 `ContractPending`。
- 受保護：`tests/contracts/PLAY.contract.test.ts`（雜湊在 `MANIFEST.json`）。覺得驗收寫錯就回報，不自己改。
- 空殼位置：P1 在 `engine/systems/match/MatchFlowSystem.ts`（`isPlay` 已可用，`playHeroId` 在 PLAY 中才丟）；P2 在 `engine/core/FixedStep.ts` 的 `effectiveTimeScale` 與 `UICommandSystem` 的 `SET_AIM`；P5 在 `engine/systems/ui/castTargeting.ts`（要用 `SkillQueries` 的 `skillTeams`，實作時改成匯出）與 `tapIntent.ts` 開頭那一行。

## 5. 驗收

每包合併前（同 `optimization-2026-11.md` §5）：

```bash
npm run lint
npm test
npm run build
npm run knip
npm run balance:fingerprint
```

另外：
- P1、P2、P5a：契約驗收全綠；沒有 PLAY 時 `balance:fingerprint` 180/180 相同。P1 另驗主角陣亡後這一場照打完。
- P2：放慢時每秒 tick 數約為正常的放慢倍率（±10%，量 `useGameLoop` 實跑）。
- P3：`tests/TapIntent.test.ts` 之外另加表現層的測試：點在單位頭上（後一格）選到該單位、兩個單位重疊時選前面的。
- P7：主角被遠程打會去打攻擊者，打完回堅守；手動模式的玩家單位照舊（G3 契約不變）。
- P4／P5：`npm run e2e:ui` 加 PLAY 流程（選角、開打、點技能、點目標、指令進紀錄、結算、再來一場），1280×800 與 390×844 各跑一次；`npm run audit:ui -- all` 0 違規；`node tools/ui-e2e/runtime-smoke.mjs`；`npm run perf:guard`（保真 6 張 0 差異：沒有 PLAY 時畫面不變）；bundle 預算檢查通過（PLAY 的 UI 不進進入點）。
- 實機：使用者在桌機玩三場，回饋手感（放慢倍率、按鈕大小、點不點得到）。

## 6. 什麼時候停下來問

- 合併進 `main`、`git push`：每包分開問。
- 保真基準或 UI 樣式基準出現非預期差異。
- 需要改 `targetTimeScale` 既有的三個寫入者、或想把瞄準放進模擬狀態（會影響回放）。
- PLAY 的佈陣需要複製 `Deployment` 的流程才做得出來。
- 進入點 bundle 超過預算。
- 選主角畫面要不要開放自選全部 170 招、還是先給每職業幾組預設：P4 開工前拿原型給使用者看。
- 放慢倍率、按鈕排列的手感：P5 先交一版給使用者試玩再調。
