# 外出執行指令 #9：音效／音樂系統與素材導入（貼給 IDE 代理）

> 用法：`/goal docs/AUDIO_AGENT_PROMPT.md`
> **前置條件**：
> 1. 效能第三輪已合併進 `main`（**音訊輪先於美術輪執行**，不再依賴美術輪）。本輪在**新分支 `feat/audio`**（由 `main` 開出）上進行；**不得在 `main`、`perf/*`、`feat/art-*` 上工作、不得 push、不得合併**。開工時分支不存在 → 停下回報。同一時間只能有一個代理在此工作樹執行。**注意：主代理可能在同一台機器上以低優先權跑 Blender 離線算圖（不碰 repo 工作樹）；若 e2e 偶發逾時，重跑一次再判定。**
> 2. 風格依 `docs/ART_STYLE_BIBLE.md` 的音訊章節（若無則以本檔為準）：**奇幻、管弦（orchestral）、史詩但不過度喧鬧**；SFX 寫實偏輕、金屬／木／魔法質感清楚，不用科幻電子音。
>
> **授權政策**：**CC0 優先、CC-BY 可（必須致謝）、拒絕 NC/ND/GPL/來源不明**；作品會公開到 GitHub Pages，維護 `docs/ASSET_LEDGER.md` 與 `CREDITS.md`（美術輪已建立；若不存在就建立）。**無法確認授權 → 不使用**，不得偽造。可用來源：Kenney（RPG Audio／Impact Sounds／Interface Sounds，CC0）、OpenGameArt 的 CC0／CC-BY 管弦曲集、其他明確標示 CC0 的庫。網路不可用 → 該項只做程序化（WebAudio 合成）版本並在報告註明。
>
> **整串一次跑完（無待核定事項）。** **不做**：push／動 `main`／合併、改 `engine/systems/**` 的遊戲邏輯、改 `Agent`、新增 npm 依賴、引入第三方音訊函式庫（只用原生 Web Audio）、改 CSS/Tailwind 的既有外觀（新視窗用既有 ToolWindow 樣式）。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程與守則**沿用 `docs/PERF_AGENT_PROMPT.md` 的「指令本文」與「本輪額外規則」**（≤3 檔、lint/test/build、一任務一 commit、不 push、同題失敗 3 次就停、不 `as any`、常數進 `constants.ts`、渲染／tick 迴圈無 `console.log`、保留既有註解），差異：① 進度寫在新檔 `docs/AUDIO_PROGRESS.md`；② 結束後在 `docs/archive/DECOUPLING_HANDOFF.md` 新增 §12「音訊導入結果」；③ `e2e:ui` 只在 **[E2E]** 任務與 FINAL 跑（各連跑兩次）；④ 所有 e2e／fidelity／perf 腳本網址一律加 `?mute`。

**先閱讀**：`AGENTS.md`、`types.ts`（尤其 `GameEventType`、`EventMap`、`WindowDef`）、`constants.ts`、`engine/events/**`（EventBus、GameEventPool）、`engine/game.ts`（生命週期、場景切換、模式切換）、`engine/systems/**` 中發出事件的位置（只讀，了解事件 payload）、`data/ui/windows.ts`、`components/ui/windowRegistry.tsx`、`components/ui/**` 既有視窗（以 `showcaseSettings` 為範本）、`engine/ui/**`（若有 UICommand 與 windowActions）、`tools/ui-e2e/render-fidelity.mjs`、`tools/ui-e2e/windows.e2e.mjs`。

**開工檢查**：分支必須是 `feat/audio`；`git status` 乾淨；`npm run lint`、`npm test`、`npm run build`、`npm run e2e:ui`、`npm run perf:guard` 全綠。若 `docs/AUDIO_PROGRESS.md` 已存在，從第一個未完成任務接續。

### 鐵律

- **不得使用 `Math.random`**：fidelity 腳本會把 `Math.random` 種子化，音訊若消耗它會破壞決定性。音訊用自己的小型 PRNG（例如 mulberry32，種子常數放 `constants.ts`），僅供音高／音量微幅變化。
- **音訊絕不影響模擬**：只訂閱 `engine.bus`、只讀事件；不得寫入 `Agent` 或任何系統；不得在 `tick()` 內分配新物件（事件處理器內也要避免閉包與陣列分配；使用預先配置的 voice pool）。
- **自動播放政策**：`AudioContext` 在第一次使用者手勢（pointerdown／keydown）才 `resume()`；之前所有 cue 靜默丟棄（不排隊）。
- **`?mute`**：URL 帶 `?mute` 時**完全不建立 `AudioContext`、不載入任何音訊檔**（測試與 perf 的預設）。
- **分頁隱藏**：`visibilitychange` hidden → `suspend()`，visible → `resume()`（使用者未靜音時）。
- **效能預算**：音訊對 `perf:guard`／fidelity 零影響（`?mute` 下 0 差異）；有聲模式下 cue 處理單次 < 0.05 ms；同時發聲數上限（`AUDIO.MAX_VOICES`，預設 24）；同一 cue 節流（`AUDIO.CUE_THROTTLE_MS`，預設 50 ms）；超限時丟棄最舊／最低優先。
- 素材載入失敗（404／解碼錯誤）→ 退回該 cue 的**程序化合成版本**，`console.warn` 僅一次（非 tick 內）。
- 音訊素材總大小（`public/assets/audio/**`）上限 **25 MB**；SFX 用 `.ogg`（Opus／Vorbis）或 `.mp3`；若 repo 內沒有編碼器，可保留來源的原格式（Kenney 多為 `.ogg`／`.wav`——`.wav` 單檔 > 200 KB 的要換成 ogg 或捨棄）。**不得新增 npm 依賴；不得要求使用者安裝 ffmpeg**（沒有就挑選原本即為 ogg／mp3 的素材）。
- Vite `base: './'`：素材 URL 一律以 `import.meta.env.BASE_URL` 組成。

### 任務（依序）

`U0` **[E2E]** → `S0a` → `S0b` → `S0c` **[E2E]** → `S1a` → `S1b` → `S2a` → `S2b` → `REPORT` → `FINAL`

| 任務 | 內容 | 檔案（≤3；測試/docs/tools/素材不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **U0** **[E2E]** | **UI Bug：「展示矩陣設定」只准在展示頁使用**（使用者列為 BUG：進入遊戲後不該能呼叫；且會影響回到展示頁的定義）。**完整規格見 `docs/ART_AGENT_PROMPT.md` 任務表的 U0 列（逐字執行，含 5 檔例外與 e2e 斷言）**；摘要：`WindowDef` 新增 `visibleInManual?: boolean`（預設 true）；`showcaseSettings` 設 `visibleInManual: false`；視窗清單依模式過濾（展示頁 / 手動模式皆需正確）；`enterManualMode` 時自動關閉 `showcaseSettings`；`windows.e2e.mjs` 新增斷言（手動模式下 `menu-item-showcaseSettings` 不存在、展示頁存在、手動模式下 `menu-item-logs` 仍存在、從展示頁開著設定進入手動模式後視窗已關閉）。**完成後 S0c 的 `visibleInManual: true` 才有機制可用。** | ≤5（例外） | lint/test/build/e2e×2 |
| **S0a** | **音訊核心骨架**：`constants.ts` 新增 `AUDIO`（`MAX_VOICES`、`CUE_THROTTLE_MS`、預設音量 master/music/sfx/ui、`PAN_RANGE`、`PITCH_JITTER`、`VOLUME_JITTER`、`PRNG_SEED`、BGM 交叉淡化秒數、`STORAGE_KEY`、`QUERY_MUTE_KEY`）。新增 `engine/audio/AudioEngine.ts`（Web Audio：master → music／sfx／ui 三個 GainNode 匯流排；voice pool；`unlock()`；`suspend/resume`；`setVolume(bus, v)`；`playCue(cueId, opts{ x?: number, intensity?: number })`、`playMusic(trackId)`、`stopMusic(fade)`；buffer 快取與載入；缺 buffer 時走合成後備）與 `engine/audio/Synth.ts`（程序化合成：命中、揮砍、弓、火球、冰、治療、死亡、UI 點擊、勝利／敗北短旋律等「後備音」，純函式產生 `AudioBuffer` 或即時節點，**使用 `AUDIO.PRNG_SEED` 的 PRNG**）。新增 `data/audio/cues.ts`（SSOT：`CUE_TABLE: Record<CueId, { files: string[]; bus; gain; throttleMs?; priority; pitchJitter?; synth: SynthId }>` 與 `EVENT_TO_CUE` 對照）與 `data/audio/music.ts`（`MUSIC_TABLE`：場景／模式 → 曲目清單、循環點、音量）。 | `AudioEngine.ts`、`Synth.ts`、`constants.ts`（`cues.ts`／`music.ts` 為 data 不計） | lint/test/build |
| **S0b** | **AudioSystem（事件 → cue 橋接）**：`engine/systems/audio/AudioSystem.ts`（遵守 Facade 規則與 AGENTS §1.3：只訂閱 `engine.bus`；不呼叫其他系統方法）。依 `EVENT_TO_CUE` 對映 `GameEventType`／`EventMap`：DAMAGE（依傷害量與是否暴擊選輕／重擊）、HEAL、CC_APPLIED、CAST_START／CAST_FINISH、PROJECTILE_SPAWN／HIT、DEATH／AGENT_DIED、SPAWN、KILL、KILL_STREAK、IMPACT_AOE、HAZARD_SPAWN、GROUND_IMPACT、TILE_COLLAPSED、ZONE_SHRUNK、LAST_STAND_TRIGGERED、CAMERA_SHAKE（低頻 rumble，強度映射）、GAME_OVER（勝／敗判定由 payload）。**依事件座標做左右聲像**（把世界座標經現有投影轉成螢幕 x 比例；若取得不易，用 `agent.q/r` 近似；寫在 `constants`／data，不得硬寫）。BGM：訂閱場景切換與模式切換（showcase／manual／game over），依 `MUSIC_TABLE` 交叉淡化；戰鬥中依存活人數／殘血比例切換「緊張」層（若只有單一曲目則略過，由 data 決定）。在 `engine/game.ts` 的註冊處**最小**加入 AudioSystem 掛載（這是 Facade 生命週期編排，屬授權的最小改動，commit 說明），`?mute` 時**不建立 AudioSystem 實例**。 | `AudioSystem.ts`（新）、`engine/game.ts`（最小）、（必要時 `types.ts` 新增 cue 型別） | lint/test/build；單元測試（假 `AudioContext`：事件→cue 對映、節流、voice 上限、`?mute` 不建立、unlock 前丟棄） |
| **S0c** **[E2E]** | **音訊設定視窗**：新增 `audioSettings` 視窗（依 U0 之後的機制：`visibleInShowcase: true`、`visibleInManual: true`，兩模式皆可開；入口放系統選單）。內容：master／music／sfx／ui 四個滑桿 + 靜音開關；設定存 `localStorage`（`AUDIO.STORAGE_KEY`），啟動時還原；透過既有 UICommand 通道（**UI 不得直接寫引擎**——新增一個 `UI_COMMAND` 類型如 `SET_AUDIO_VOLUME`，由 `UICommandSystem` 轉交 `AudioEngine`；若會超過 3 檔，這一任務允許 5 檔例外，commit 說明）。測試：純函式（音量夾制、持久化序列化）；`windows.e2e.mjs` 新增斷言（兩模式皆可開／關、滑桿改值後 localStorage 更新、`?mute` 下視窗仍可開但標示「已靜音（URL）」且不建立 context）。 | ≤5（例外） | lint/test/build/e2e×2 |
| **S1a** | **SFX 素材採集（真素材）**：依 `CUE_TABLE` 缺口，從 Kenney（RPG Audio、Impact Sounds、Interface Sounds）與其他 CC0 來源挑選：劍擊／盾擊（金屬、皮革、木）、揮空、弓弦／箭矢飛行／命中、魔法施放／火／冰／雷／治療、腳步（輕）、UI 點擊／確認／取消、勝利／敗北短 sting、崩塌／重物落地。每個 cue 配 2–4 個變體（降低重複感，配合 PRNG 選擇＋音高微調）。放進 `public/assets/audio/sfx/<cue>_<n>.ogg`；`public/assets/audio/manifest.json`（cueId → files）；**每個檔案都登記 ledger**（來源網址、授權、作者、日期、是否需致謝）。更新 `CREDITS.md`。**不得下載授權不明或需要登入的素材**。 | 素材、docs、`data/audio/cues.ts` | 載入全部檔案的單元測試（manifest 完整、檔案存在、大小總和 ≤ 預算） |
| **S1b** | **SFX 實裝與校音**：把 `CUE_TABLE` 的檔案列表接上、後備合成保留；做**響度正規化**（用 OfflineAudioContext 在測試／工具腳本內量 RMS 並在 data 中記 `gain` 修正，不改檔案）；寫 `tools/audio/preview.html`（列出每個 cue 可點播放，供使用者試聽）與 `tools/audio/README.md`。無頭瀏覽器內以 `playwright-core` 開啟載入頁，驗證所有 buffer 皆能 `decodeAudioData` 成功（失敗列清單）。 | data、tools | lint/test/build；decode 全過 |
| **S2a** | **BGM 素材**：挑選管弦／奇幻 CC0 或 CC-BY 曲目，**至少 5 首**：主選單／展示頁氛圍（1）、戰鬥（2–3，含一首較緊張）、勝利（短）、敗北（短）。優先選擇本來就可循環或有明確循環點的曲子；單檔 ≤ 5 MB，總計 ≤ 15 MB（含 SFX 合計不超過 25 MB）。放進 `public/assets/audio/music/`，登記 ledger／CREDITS（CC-BY 必須標明曲名、作者、連結、授權）；`data/audio/music.ts` 填入循環點與音量。若找不到足夠合格曲目，**用 Synth 產出簡單的和弦鋪底（pad）作為後備**，並在報告註明缺口，不得用授權不明的音樂湊數。 | 素材、docs、data | 單元測試（manifest 完整、大小預算） |
| **S2b** | **BGM 整合與體驗**：場景／模式切換的交叉淡化（秒數取 `AUDIO`）；戰鬥開始切戰鬥曲、結束切勝／敗 sting 後回到氛圍曲；同曲不重播；視窗失焦淡出；音量以 dB 感知曲線（線性滑桿 → 平方或對數映射，常數入 `AUDIO`）；**BGM 預載策略**：首屏只載氛圍曲，其餘在閒置時預取，避免卡頓。有聲模式下以 `perf:ab`（**不帶 `?mute`**，手動戰鬥場景）量測，**戰鬥 ms 不得比 `?mute` 高 > 3%**；超標找原因（解碼在主執行緒？voice 過多？）並修。 | data、`AudioEngine.ts`／`AudioSystem.ts` | lint/test/build；效能達標 |
| **REPORT** | `docs/AUDIO_REPORT.md`：①各任務 commit 與結果②cue 清單與對映表③素材清單與授權摘要（含 CC-BY 的致謝）④效能（有聲 vs `?mute`，附 GPU 字串）⑤回退方式（`?mute`、`AUDIO` 常數、tag）⑥**使用者試聽檢查清單**（各 cue 是否過吵／過小、重複感、BGM 切換是否突兀、左右聲像、音量滑桿手感、分頁切換行為、手機／藍牙延遲）⑦缺口與建議（環境音、腳步、角色語音、動態分層音樂）。補寫 `DECOUPLING_HANDOFF.md` §12。 | docs | — |
| **FINAL** | 全量驗證：lint/test/build/`e2e:ui`（兩次）/`perf:guard`（`?mute` 下 0 差異）；工作樹乾淨、未 push；本地 tag：`audio-ckpt-S0`、`audio-ckpt-S1`、`audio-ckpt-S2`、`audio-ckpt-final`（完成當下就打）。 | docs | — |

### 本輪額外規則

- **取捨順序**（額度吃緊時）：`S0a → S0b → S0c → S1a/S1b → S2a/S2b`，其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。**
- **fidelity／perf 基準線不得重錄、門檻不得放寬**（音訊與畫面無關；`?mute` 下必須 0 差異）。若 `perf:guard`／fidelity 腳本沒有自動加 `?mute`，請**只在腳本中加入該參數**，不改門檻。
- **不得弱化**既有 e2e 斷言。
- 停工原則：只有遇到會導致產品功能壞掉、且本文件未涵蓋的情況才停下；其餘自行選擇最低風險、可回退的做法並記錄在報告。

---

## 回來後使用者要做的事（給人看）

1. 讀 `docs/AUDIO_REPORT.md`；開 `tools/audio/preview.html` 逐個試聽 SFX。
2. 在主螢幕開網頁：展示頁聽氛圍曲、手動戰鬥聽戰鬥曲與各種打擊聲；用系統選單開「音訊設定」調音量；切分頁確認會靜音。
3. 覺得哪些 cue 太吵／太小／重複，列出 cue 名稱，由主代理調 `data/audio/cues.ts`。
4. 不想要聲音：網址加 `?mute`，或在設定視窗靜音。
5. 不要 push；合併進 `main` 前先等主代理審查。
