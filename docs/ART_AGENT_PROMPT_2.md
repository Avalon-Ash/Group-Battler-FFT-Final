# 外出執行指令 #9：美術修正輪（座標／BGM／熔岩效能／切除舊管線）

> 用法：把本檔全文貼給執行代理（Gemini 4 / AI Studio 或 IDE 皆可）。**整份一次跑完，無待核定事項。**
> **執行環境可能沒有本機 Edge／Playwright／Blender／239 Hz 螢幕**：凡「需要本機量測或 e2e」的驗證，無法執行就**跳過並在報告 §「待主代理本機驗證」列出**，不得因此停工、也不得宣稱已通過。`npm run lint` / `npm test` / `npm run build` 必須能跑，且每個 commit 都要全綠。

## 0. 分支與 git 規則（本輪與以往不同）

- 起點分支：`feat/art-fantasy-hd`（美術管線已完成、**尚未合併 main**）。**開工第一步：`git switch feat/art-fantasy-hd`，再 `git switch -c feat/art-fix-2`**；若 `feat/art-fantasy-hd` 不存在或工作樹不乾淨 → 停下回報。
- **本輪允許 push，但只能 `git push origin feat/art-fix-2`**（每個任務 commit 後推一次，確保成果不遺失）。**絕不 push／合併／rebase `main` 與 `feat/art-fantasy-hd`**，不得 force push，不得刪分支。
- 一任務一 commit（訊息格式 `fix(art2): T<n> ...`）。同一問題連續失敗 3 次 → 在報告記錄、`git stash`／還原到上一個綠色 commit，跳到下一任務。
- 進度寫在 `docs/ART2_PROGRESS.md`（每完成一個任務更新一行：任務、commit、結果、未驗證項）。

## 1. 專案守則（摘要，全文見 `AGENTS.md`，開工前必讀）

- `types.ts`／`constants.ts`／`data/**` 是 SSOT；**不得新增魔術數字或顏色**（進 `constants.ts`）。
- `Agent` 是純資料，**不得新增方法**；系統間只透過 `engine.bus` 溝通；渲染器無狀態。
- **禁止** `as any`、Three/Pixi/WebGL、渲染／tick／粒子迴圈內的 `console.log`、新 npm 依賴。
- Facade（`engine/renderer.ts`、`engine/game.ts`、`engine/systems/*/index.ts`）除非改公開簽章，否則改子目錄實作。
- **保留既有註解與 docstring**（與你改動無關的一律不動）。
- **檔案編碼**：`constants.ts` 等多數原始檔是 CRLF，編輯時保持原行尾；新檔用 LF。**絕不在內容裡輸入 `&gt;` `&lt;` 這類 HTML 實體**（寫 `>` `<`）。寫檔後用 `git diff --stat` 確認只改到預期檔案，沒有整檔行尾變動。
- 單次變更 >3 檔：本輪下列任務**已授權**（機械式刪除與改名），其餘仍須在 commit 訊息說明。
- 開工前必讀：`AGENTS.md`、`docs/HANDOFF.md`、`docs/ART_REPORT.md`、`types.ts`、`constants.ts`。

## 2. 開工檢查

`git status` 乾淨 → `npm run lint`、`npm test`、`npm run build` 全綠（能跑的話再 `npm run perf:guard`）。記錄結果到 `docs/ART2_PROGRESS.md`。

## 3. 任務（依序）

### T1 · 單位大小與貼地（座標修正）【最優先】

**已確診的原因**（請先自行讀碼確認再改）：
1. `engine/renderers/units/painters/UnitBodyPainter.ts` 在 `ctx.scale(UNIT_SCALE=0.65, ...)` **之後**才呼叫 `SpriteUnitRenderer.draw`。而 `SpriteUnitRenderer` 的 `globalScale = UNIT_SPRITE.targetHeightCanvasUnits(52) / referenceHeightPx × heightScale` **沒補償 `UNIT_SCALE`** → 實際畫面高度只有約 52×0.65≈34 px；舊程序化單位約 `UNIT_VISUAL_HEIGHT(100)×0.65≈65 px`。
2. 繪圖原點是「身體中心」＝`VisualMath.getVisualBodyCenterY` = `surfaceY − z − UNIT_BODY_OFFSET(36) − UNIT_HOVER_OFFSET(6)`。精靈卻把**腳底錨點放在原點 (0,0)** → 腳底離地約 42 px（螢幕）。地面陰影畫在 `surfaceY`，兩者分離。

**要求**：
- 讓精靈高度以「螢幕上的 canvas unit」為語意：`UNIT_SPRITE.targetHeightCanvasUnits` 改為與舊單位等高（`UNIT_VISUAL_HEIGHT * UNIT_SCALE`，由常數運算式表達，不寫死 65），並在 `SpriteUnitRenderer` 以 `/ UNIT_SCALE` 補償（或等價做法，但**單一處、單一公式**）。
- 腳底錨點下移：在 `UNIT_SPRITE` 新增 `footOffsetLocal`，值由 `(UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET) / UNIT_SCALE` 運算式得到（約 64.6，≈ 既有 `AGENT_MODEL_CENTER_Z`），於 `SpriteUnitRenderer` 繪製時把 `dy` 加上它，使腳底落在 `surfaceY`（與地面陰影同一水平）。
- `UnitDeathPainter` 的 sprite 分支（`translate(visX, visY + sinkY)`）必須用**同一個錨點定義**（讀碼確認 `visY` 的語意，必要時補同樣的偏移與縮放，不得出現第二套公式）。
- 檢查血條／頭頂標示／選取圈／狀態圖示的偏移（`VISUAL_ANCHORS.HEAD_OFFSET`、`HUD_BAR_OFFSET`、`UnitIndicatorPainter`、`UnitAuraPainter`）在新尺寸下沒有蓋到頭或與角色重疊；需要時**只調常數**。
- **測試**（`tests/`）：純函式或可測的公式——腳底世界 y == `surfaceY`；螢幕高度 ≈ `UNIT_VISUAL_HEIGHT×UNIT_SCALE`；死亡分支與一般分支錨點一致。
- **保真基準**：本任務完成後**允許重錄 `battle_frozen` 一次**（`npm run perf:fidelity:record` 只在確認差異來源＝預期的尺寸／位置變更後做），並存前後對照圖到 `tools/ui-e2e/out/art_before_after_t1.png`。5 個地形 baseline **不得動**（必須仍 0 差異；若有差異＝你改壞了地形，找原因）。無法跑 fidelity → 跳過並列為待驗證，**不得手動改 baseline 圖**。

### T2 · BGM 流程錯誤（沒有隨行為切換、且全部曲目疊在一起放）

使用者症狀：背景音樂沒有隨不同行為切換；最嚴重的是**所有 BGM 同時疊著播**。

**已知架構**（請讀碼）：`engine/audio/AudioEngine.ts`（`playMusic`／`stopMusic`／`currentMusic`／`wantedTrackId`）、`engine/systems/audio/AudioSystem.ts`（事件→曲目對應）、`data/audio/music.ts`（曲目表）。`AudioSystem` 在 **`engine/game.ts:143` 的 `GameEngine` 建構子內 `new AudioSystem(this.bus)`**，而 `AudioSystem` 預設自建 `new AudioEngine()`（各自一個 `AudioContext`）。

**優先查的假設**（依可能性）：
1. **引擎／音訊生命週期洩漏**：React StrictMode 雙掛載、Vite HMR 重載、`GameCanvas` 重新掛載時，舊的 `GameEngine` 沒有 `destroy()`（或 `destroy` 沒呼叫 `AudioSystem.destroy()` → `AudioEngine.destroy()`），舊引擎的 `AudioContext` 繼續播它那首曲子、且不再收到事件 → 多個引擎各播各的 → 「全部疊在一起、不隨行為切換」。檢查：誰建立／銷毀 `GameEngine`（`hooks/useGameApp.ts`、`components/GameCanvas.tsx`）、卸載時是否呼叫 destroy、HMR 的 dispose；`AudioEngine.destroy()` 是否真的 `stop` 所有 source 並 `ctx.close()`。
2. **`playMusic` 競態**：連續呼叫（A→B→C 在淡化期間，或檔案仍在 `loadBuffer`）時，`source.stop()` 對尚未 start／已停止的節點拋例外被 `catch {}` 吞掉，導致舊曲沒停或新曲沒建；`isFallback` 路徑重入；`onended` 與 `stop()` 互相觸發。
3. **事件對應缺口**：`GAME_START`／`GAME_OVER`／`GAME_CLEAR`／`ENV_UPDATE`／`SET_SHOWCASE_MODE` 的順序造成誤切（例如展示模式切換後又被 `ENV_UPDATE` 切回、手動模式未發 `GAME_START`）；`BATTLE_TENSE`（存活 ≤4）是否與 `BATTLE_NORMAL` 正確互斥。
4. 目前設計意圖：展示模式＝只播 `SHOWCASE_AMBIENT`（不播戰鬥曲／結算曲）；手動模式：開戰 `BATTLE_NORMAL` → 存活 ≤4 切 `BATTLE_TENSE` → 結束依勝方播勝利曲（BLUE/RED 各一）或 `DEFEAT_STING` → 播完回 `SHOWCASE_AMBIENT`。**維持此設計，只修錯誤。**

**要求**：
- 用**假的 `AudioContext`**（測試用 stub，記錄 `createBufferSource`／`start`／`stop` 次數與狀態）寫回歸測試，不依賴真音訊：
  - 任何時刻「尚未排程停止」的 BGM source **最多 1 個**；淡化結束（推進假時間）後**只剩 1 個**。
  - A→B→C 快速連續切換：最終只有 C 在播。
  - 兩次建立／銷毀引擎後，舊引擎的 source 全為 0、`ctx` 已 `close`。
  - 事件序列測試：`SET_SHOWCASE_MODE(true)` → ambient；`false`＋`GAME_START` → battle_normal；4 次 `AGENT_DIED` → tense；`GAME_OVER` → 對應勝利曲／defeat；再回 ambient。
- 為 `AudioEngine` 新增唯讀除錯存取（如 `getActiveMusicSourceCount()`），供測試與 `?perf` HUD 使用；不得在迴圈內 log。
- 修正生命週期：確保一個頁面同一時間**只有一個** `GameEngine`／`AudioContext` 存活；卸載與 HMR dispose 必須銷毀。若 `AudioEngine` 可做成「模組單例＋`destroy` 後可重建」較簡單，擇其一並記錄理由。
- 所有 `catch {}` 吞例外處改成「只在預期的例外類型時吞、其他一次性 `console.warn`（非迴圈內）」。

### T3 · 熔岩（MAGMA）場景 FPS 明顯掉

使用者實測：**熔岩場景特別明顯**。**先量測再改**（可量測時用 `?perf` HUD 或 `node tools/ui-e2e/perf-frames.mjs`，地圖選 MAGMA；不能量測就依下列假設做靜態分析與修正，並列為待驗證）。

**已知線索**（`engine/renderers/grid/TerrainRenderer.ts`）：
- `MAGMA`（與 `VOID`）是「浮動地塊」：`floatOffset = round(sin(globalTime*1.5 + x*0.01 + y*0.01)*4 / FLOAT_STEP) * FLOAT_STEP`，且 **`floatOffset` 被放進 sprite 快取鍵**（`terrainSpriteKey(theme, layout, type, height, variant, floatOffset, renderScale)`）。每個地塊相位不同 → 快取鍵數量 ≈ 地塊高度數 × variant × 浮動步數 × 縮放層級；若超過 `TerrainBlockCache` 容量或每次新 `floatOffset` 都要重烘焙（現在烘焙含 512×512 貼圖 pattern，比舊程序化重）→ **快取抖動／重烘焙尖峰**。
- `MAGMA` 每個地塊每幀還做一次即時 `SurfacePainter.drawLiquid(...)`（第 82–86 行）；地塊數量 × 每幀路徑／漸層成本。
- 其他可疑：熔岩專屬 hazard／餘燼粒子／`FX_HIT_RED_MAGMA`、`FX_ACTIVE_RED_MAGMA_ERUPTION` 的粒子量。

**做法**：
1. 為 `TerrainBlockCache`（或其 store）加**命中／未命中／驅逐計數**（`RenderStats` 的 `?perf` 開啟時才累計，零成本關閉），確認熔岩場景是否抖動；同時量 `drawLiquid` 每幀總耗時（用既有 `CtxOpCounter`／`RenderStats` 計時掛點）。
2. 針對實際瓶頸修：
   - 若是快取抖動：浮動只是**純垂直平移**，改成「以 `floatOffset=0` 烘焙一份、繪製時平移 `floatOffset`」（鍵中移除 `floatOffset`）；基座（pedestal）深度改以最大浮動量預留。**這會改變 sprite 邊界，先確認 `perf:fidelity` 的 MAGMA／VOID baseline 仍 0 差異**；若有差異且屬可接受的亞像素變化，**不得重錄**，改採保守做法（保留鍵但擴大快取容量／限制浮動步數），並在報告說明。
   - 若是 `drawLiquid`：改為預烘焙的循環幀（N 幀 sprite，依 `globalTime` 選幀；幀數與尺寸進 `constants.ts`）或單一低成本疊層，避免每幀每塊新建漸層／路徑；視覺需與現況相近（不得變成靜態）。
3. 驗收：`MAGMA` 場景幀時間尖峰顯著下降（可量測時附前後 p99／1% low 與快取命中率）；`perf:fidelity` 5 個地形 baseline 仍 0 差異（`MAGMA` 若因動畫幀改變而差異，視為失敗，改用保守做法）。

### T4 · 切除舊視覺管線（只保留新版）

使用者決策：**舊的程序化視覺版本全部切掉，只保留新的（精靈單位、貼圖地形、貼圖粒子）。**

**策略**（先做完 `git grep` 引用盤點再刪；**沒有引用才刪，仍被 UI／編輯器／特殊模型使用的保留並在報告列出**）：
1. **載入閘門**：為了不再需要「載入中先畫舊外觀」，把「單位圖集／地形貼圖／粒子貼圖」就緒（沿用既有 `window.__ASSETS_READY__`／`__VFX_ASSETS_READY__` 或 store 的 ready promise，統一成一個）納入 `GameCanvas` 現有的載入畫面（`GameCanvas.tsx` 約第 152 行）；就緒前不開始繪製戰場。素材載入失敗（404／解碼錯誤）：`console.warn` 一次，並用**極簡退路**（單色六角格＋腳底圓影，顏色取 `constants.ts` 既有主題色）維持可玩，不得白畫面或拋例外。
2. **單位**：移除 `UNIT_RENDER_MODE` 與 `UnitBodyPainter` 的 procedural 分支，刪除 `ImperialRenderer`／`CovenantRenderer` 及只被它們使用的繪製器／TokenFactory／appearance 資料（`UnitCorePainter` 的科幻核心光暈等）。**保留**：羊化（POLYMORPH）與冰凍（FROZEN）的 `SpriteManager.getSpecialModel`、UI 縮圖或編輯器仍引用的部分、陣營顏色資料（若 VFX／UI 仍引用）。
3. **地形**：移除 `TERRAIN_SKIN.enabled` 與 `TerrainRenderer.paintBlock` 的非貼圖頂面／側面分支（保留邊緣高光／AO／高度明暗疊層與 MAGMA／VOID 動態層）；刪除只被舊分支使用的 `MaterialPainter`／`NoiseLib` 呼叫與 `data/vfx/materialConfig.ts` 中對應的死參數（**僅限無引用者**）。
4. **粒子**：移除 `VFX_SPRITES.enabled` 與 `ParticlePainter` 的漸層回退分支（`drawAtmosphere`／`drawSmoke`／`drawSpike` 保留貼圖路徑；貼圖缺失時直接略過該粒子，並一次性 warn）。**同時修 `ParticleTextureStore.getTintedTexture` 的快取鍵**：尺寸改為固定級距（例如 32／64／128／256，以 `constants.ts` 常數陣列表示）、色彩量化到有限調色盤或加上快取上限（超過時整批清空），避免每個粒子半徑／顏色各建一張 canvas 造成無上限成長與每幀建立 canvas。
5. 同步更新：所有因刪除而失效的測試（procedural 模式相關斷言刪除或改寫；**不得為了讓測試通過而刪掉仍有意義的斷言**）、`tools/ui-e2e` 中引用舊開關的腳本、`docs/ART_REPORT.md` 的「回退方式」章節（改寫為「舊管線已移除，回退請 `git revert`／使用 tag `art-ckpt-final`」）、`AGENTS.md` §1 中提及 Imperial／Covenant appearance 的字句（**只改與被刪除檔案直接相關的最小字句**，並在報告列出改了哪幾行）。
6. 驗收：`lint`／`test`／`build` 全綠；刪除後 `git grep -n "procedural'\|Imperial\|Covenant\|TERRAIN_SKIN.enabled\|VFX_SPRITES.enabled"` 應無殘留引用（報告列出刻意保留者與原因）；打包體積不增加；能跑時 `perf:fidelity` 全部 0 差異（刪除舊分支不應改任何像素；`battle_frozen` 以 T1 後的新 baseline 為準）。

### T5 · 卡頓記錄器（診斷工具，小）

使用者回報「多特效時 FPS 掉到個位數」，但在量測腳本中無法重現。新增**輕量的尖峰記錄器**，讓使用者下次實機遇到時直接取得證據：
- 在 `engine/renderers/RenderStats.ts`（子目錄實作，非 facade）內：僅在 `?perf` 啟用時，當單幀 rAF 間隔 > `RENDER_PERF.SPIKE_MS`（新常數，建議 50）時，把「時間戳、幀時間、各主要繪圖器（Ground／Particle／Projectile／Procedural／Aura／Volume／Text／Terrain／Unit）本幀耗時、粒子總數與各類型數量、存活單位數、`getActiveMusicSourceCount()`」推入**固定長度環形緩衝**（`RENDER_PERF.SPIKE_BUFFER` 筆，預先配置，**不得每幀配置物件**），並掛 `window.__PERF_SPIKES__`（唯讀 getter，回傳陣列複本）。
- `?perf` HUD 多顯示「最近一次尖峰」一行與累計尖峰數（沿用既有 HUD，不新增 DOM 框架）。
- 單元測試：環形緩衝滿後覆寫、關閉時零配置、門檻判斷。
- 在 `docs/HANDOFF.md` §4 補一行使用說明（開啟 `?perf`，重現後於 console 輸入 `JSON.stringify(window.__PERF_SPIKES__)` 貼回）。

### T6 · 報告與收尾

- `docs/ART2_REPORT.md`：每個任務的 commit、做法、風險、**未驗證項（待主代理本機驗證）**、被刻意保留的舊程式與原因、基準重錄紀錄（只應有 T1 的 `battle_frozen`）。
- 更新 `docs/HANDOFF.md`：§2 Git 狀態（分支 `feat/art-fix-2` 待審）、路線圖、perf 殘餘熱點若有變動。
- 全量驗證：`lint`／`test`／`build`（可跑則再 `perf:guard`、`e2e:ui` 兩次）。工作樹乾淨，`git push origin feat/art-fix-2`，打本地 tag `art-fix2-final`（可推 tag：`git push origin art-fix2-final`）。

## 4. 本輪不得做的事

- 動 `main`／`feat/art-fantasy-hd`（含 push、合併、rebase、force）。
- 放寬任何 fidelity／perf 門檻、重錄 T1 以外的 baseline、手動編輯 baseline 圖。
- 改 `engine/systems/**` 的遊戲規則（T2 只動音訊系統與引擎生命週期）。
- 自行執行 Blender、重新生成或修改精靈／地形圖（發現圖有問題 → 寫進報告）。
- 新增依賴、引入 WebGL、`as any`、渲染迴圈 `console.log`。
- 為了「看起來完成」而宣稱未執行的驗證已通過——**無法驗證就明說**。

## 5. 回來後使用者要做的事（給人看）

1. 在主螢幕開 `npm run dev`：看角色大小與腳底是否貼地、縮放 0.5×～3× 是否正常。
2. 聽 BGM：展示模式、手動戰鬥開戰、剩 ≤4 人、勝敗結算，各切換一次；重新整理／存檔熱重載數次後，確認同一時間只有一首。
3. 開熔岩地圖大特效戰鬥，看是否仍卡；若仍卡，開 `?perf` 重現後貼 `window.__PERF_SPIKES__`。
4. 把 `docs/ART2_REPORT.md` 的「待主代理本機驗證」交給主代理跑 e2e／perf／fidelity。
