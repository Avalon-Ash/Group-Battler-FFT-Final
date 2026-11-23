# PLAY 模式開案書（2026-11-23，Opus 5.5 代 Fable 開案）

> 範圍：HANDOFF L2（手動模式改成主動式遊戲 UI）＋開案書 `docs/plans/optimization-2026-11.md` 的 G3 第二片。G5 行為編輯器不在本檔。
> Fable 本週額度用完，由 Opus 開案（全域憲法「Fable 用不了時由 Opus 5.5 high 代為開案」）。執行者照本檔拆包做，覺得不合理就回報，不自己改方向。做完一包：`docs/WORKLOG.md` 加一節、本檔該包標「完成」；全部做完把剩下的併回 HANDOFF 再刪本檔。
> 每個數字附產生它的指令；沒附的是讀程式碼的推論，標「推論」。

## 1. 使用者定的前提（2026-11-23）

| 題目 | 決定 |
| :-- | :-- |
| 操控範圍 | 一隻主角，其他隊友照 AI 打 |
| 平台 | 桌機優先（滑鼠＋快捷鍵）；手機保證能玩，不為手機另做一套 |
| 時間 | 即時；點了技能、在選目標時自動放慢，放出去或取消就恢復；手動暫停保留 |
| 進入 | 獨立的 PLAY 模式：選主角 → 自動佈陣 → 開打 → 結算（再來一場／回主畫面）。工作平台式的手動模式留給編輯，不改 |
| 施放 | 技能按鈕＋點目標；自身技能按一下就放 |

## 2. 現況（讀碼）

- 引擎端已備好：`Agent.controller`、`PLAYER_MODE_GRAPH`、`ORDER_MOVE`／`ORDER_ATTACK`／`ORDER_CAST`／`ORDER_STOP`（`types.ts`，`ORDER_CAST` 帶槽位與單位或格子）、指令進紀錄可回放（WORKLOG §2 CC）；導播跟著玩家單位、場上標示（§2 CD）。
- `AppMode` 已經有 `'PLAY'`（`types.ts`），但 `appModeOf`（`engine/systems/ui/views/session.ts`）還不會回傳它，沒有視窗用它。
- 對局流程在 `engine/systems/match/MatchFlowSystem.ts`（展示回合與手動的隨機戰場）；佈陣是 `engine/systems/match/Deployment.ts` 的純函式。
- 點擊：`engine/systems/ui/tapIntent.ts` 決定意圖，`hooks/useGameInput.ts` 送指令；點選以格子判定（`queryAgentAt`），沒有點擊容差，單位畫得比格子高時點頭部會落在後面那一格（推論）。
- 時間倍率：`state.time.targetTimeScale` 目前有三個寫入處：`UICommandSystem` 的 `SET_TIME_SCALE`、`VictorySystem`（結算慢動作與還原）、`engine/game.ts` 兩個重設。**既有耦合，照憲法先回報**：本案不再加第四個寫入者，見 P2。
- bundle：進入點 gzip 253.9／257.5 kB（2026-11-23 `npm run build`），PLAY 的 UI 必須放延遲載入的 chunk。

## 3. 架構

```
主畫面 ──PLAY──▶ 選主角（職業＋四個技能槽，預設組可直接開打）
                      │ START_PLAY { role, skillIds, seed? }
                      ▼
            MatchFlowSystem（PLAY 分支）
              Deployment 排陣容：主角在藍方、controller＝PLAYER，其餘 AI
              → START_GAME（照舊：開戰快照＋種子，回放與指紋不受影響）
                      ▼
            戰鬥 HUD（React，延遲載入）
              技能列 ── 點鈕／按 1～4 ──▶ 瞄準狀態（UI 狀態，不進引擎）
                 │                         │ SET_AIM_SLOWMO { active }（畫面指令）
                 │                         ▼
                 │                   點目標 ── ORDER_CAST ──▶ 指令佇列（已有）
              點地面／敵人 ─────────────────── ORDER_MOVE／ORDER_ATTACK（已有）
              停止鈕（S）──────────────────── ORDER_STOP（已有）
                      ▼
            結算：勝負、主角數據、再來一場（同設定新種子）／回主畫面
```

- **模式**：`appModeOf` 依 `SessionView` 回傳 `PLAY`（新欄位 `isPlay`，由對局流程擁有，和 `isShowcase` 同一種做法）。視窗用 `WindowDef.modes` 決定 PLAY 時顯示什麼：預設只有戰鬥 HUD 與系統選單，工具視窗不出現。
- **佈陣不另寫**：PLAY 只是 `Deployment` 的一種陣容規則（主角一格＋隊友與敵人照展示模式抽），流程在 `MatchFlowSystem` 加一個分支。HANDOFF L 第 4 項（工具各有一份佈陣）不在本案，但本案不得再多一份。
- **瞄準放慢**：新增一個倍率因子 `state.time.aimFactor`（唯一寫入者：`UICommandSystem` 的 `SET_AIM_SLOWMO`，畫面指令、不進紀錄），固定步長每幀的 tick 數用 `timeScale × aimFactor` 算。`targetTimeScale` 的三個既有寫入者不動。因為模擬一律固定步長（ADR 0016），放慢只改每幀跑幾個 tick，回放與指紋不變。參數放 `constants/`：放慢倍率（建議 0.3）、進出的緩動時間。
- **瞄準狀態屬於 UI**：「哪個槽位正在選目標」只存在 React 端（一個小 store），引擎只收到最後的 `ORDER_CAST`。可選目標的高亮由一個純函式查詢（技能射程、目標種類：敵、友、地面、自身），放在 `engine/systems/ui/`，HUD 與戰場疊層共用，判斷只寫一處。
- **點擊容差**：`tapIntent` 的「點到哪個單位」改成先用螢幕座標找單位的可點範圍（`UnitFrame` 的身體框，讀 RenderSpec 的錨點），找不到才退回格子。容差參數放 `constants/ui.ts`，依輸入裝置（滑鼠／觸控）各一個值。
- **快捷鍵**（桌機優先）：1～4 技能槽、S 停止、Esc 或右鍵取消瞄準、空白鍵暫停。手機：同一排按鈕放大，點目標同一套流程。
- **undo**：PLAY 模式不放（遊戲中倒退不合理），留在手動與回放。

## 4. 拆包表

規模：S＝半個工作階段，M＝一個工作階段，L＝兩三個工作階段。Gemini 池偏低（11-22 週剩 37.6%），可拆的包派 Sonnet 子代理；Codex 使用者 11-23 留給其他專案，本案不用。

| 包 | 內容 | 依賴 | 規模 | 執行者 |
| :-- | :-- | :-- | :-- | :-- |
| P0 | 契約：`START_PLAY`、`SET_AIM_SLOWMO`、`SessionView.isPlay`、`state.time.aimFactor`、瞄準目標查詢的簽章；紅色驗收；ADR 0025（PLAY 模式與瞄準放慢的倍率擁有者） | — | S | Opus |
| P1 | 引擎：PLAY 流程分支（選角 → 佈陣 → 開戰 → 結算 → 再來一場），`appModeOf` 回 `PLAY` | P0 | M | Sonnet 子代理（紅色驗收先寫好） |
| P2 | 時間：`aimFactor` 接進固定步長；放慢的緩動 | P0 | S | Opus |
| P3 | 點擊容差：單位身體框命中、裝置別容差 | — | S | Sonnet 子代理 |
| P4 | UI：主畫面 PLAY 入口、選主角畫面、結算畫面（延遲載入） | P1 | M | Sonnet 子代理實作，Opus 看截圖定調 |
| P5 | UI：戰鬥 HUD（技能列、冷卻與魔力、瞄準高亮、停止、快捷鍵） | P0、P2 | M | Opus 自己做（看圖反覆調） |
| P6 | 收尾：e2e 走一遍 PLAY（桌機＋手機尺寸）、`audit:ui`、bundle 預算、HANDOFF 回寫 | 全部 | S | Opus |

順序：P0 → （P1、P2、P3 可並行；P3 不碰渲染以外的檔） → P4 → P5 → P6。P5 動到戰場疊層（瞄準高亮），屬渲染線，同時只開這一條。

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
- P0／P1：無畫面測試走完一場 PLAY：`START_PLAY` → 主角是 `PLAYER`、其餘 `AI` → 打完 → 再來一場換種子；沒有 PLAY 時 `balance:fingerprint` 180/180 相同。
- P2：放慢中與正常速度跑同一串指令，狀態字串相同（模擬不讀倍率）；放慢時每秒 tick 數約為正常的放慢倍率（±10%）。
- P3：`tests/TapIntent.test.ts` 加「點在單位頭上（後一格）選到該單位」「兩個單位重疊時選前面的」。
- P4／P5：`npm run e2e:ui` 加 PLAY 流程（選角、開打、點技能、點目標、指令進紀錄、結算、再來一場），1280×800 與 390×844 各跑一次；`npm run audit:ui -- all` 0 違規；`node tools/ui-e2e/runtime-smoke.mjs`；`npm run perf:guard`（保真 6 張 0 差異：沒有 PLAY 時畫面不變）；bundle 預算檢查通過（PLAY 的 UI 不進進入點）。
- 實機：使用者在桌機玩三場，回饋手感（放慢倍率、按鈕大小、點不點得到）。

## 6. 什麼時候停下來問

- 合併進 `main`、`git push`：每包分開問。
- 保真基準或 UI 樣式基準出現非預期差異。
- 需要改 `targetTimeScale` 既有的三個寫入者、或想把放慢做成模擬裡的狀態（會影響回放）。
- PLAY 的佈陣需要複製 `Deployment` 的流程才做得出來。
- 進入點 bundle 超過預算。
- 選主角畫面要不要開放自選全部 170 招、還是先給每職業幾組預設：P4 開工前拿原型給使用者看。
- 放慢倍率、按鈕排列的手感：P5 先交一版給使用者試玩再調。
