# 主代理交接手冊（工具無關：Claude Code／Antigravity 皆可讀）

> 更新：2026-10-16（合併序列與文件整理完成，回到單一主線）。新對話的主代理 **先讀本檔再開工**，不要重新探索專案；`AGENTS.md` 是審查 diff 時的檢查清單。
> 歷史細節（已完成輪次的提示詞／報告／基準）在 [`docs/archive/`](archive/) 與各 `docs/*REPORT*.md`，**平常不用讀**。

## 0. 省點數守則（使用者額度有限，最重要）
- 使用者之前在 Antigravity 花了很多點數（含一次在 AI Studio 燒掉 400 元卻交出壞掉的畫面）。**Claude Code 的主代理請把工作壓到最小**。
- **分工**：長時間、機械性、無人值守的實作交給低階代理（IDE 端 Gemini：`/goal docs/<PROMPT>.md`；額度多）；主代理只做 ① 設計／寫提示詞 ② 審查 diff ③ 小修 ④ 本機驗證 ⑤ 合併。
- **審查要便宜**：先 `git diff main...<branch> --stat`，只讀**程式碼**變更（`engine/`、`components/`、`data/`、`constants.ts`）；**不要整份讀 `docs/*REPORT*`**（代理報告常誇大，只看數字表與回退指南）；用 `grep`／`Select-String` 抓關鍵字；每次只讀一小段。
- **不要重複量測**；少截圖；回覆精簡；一次對話做完一輪就收。
- Claude Code 內用 `/compact` 壓縮上下文；本檔＋`AGENTS.md` 足以在新對話重建全部上下文。

## 1. 專案與紀律
- **專案**：TACTICAL.OS（Vite + React 19 + TS + HTML5 Canvas 2.5D 等距六角戰棋）。遠端 `https://github.com/Avalon-Ash/Group-Battler-FFT-Final.git`（目前只有 `main`）。
- **治理規則全在 `AGENTS.md`**：`Agent` 純資料（不加方法）、SSOT 在 `types.ts`／`constants.ts`／`data/**`、禁 `as any`、禁魔術數字／硬編碼顏色、tick／渲染迴圈禁 `console.log`、單次改動 ≤3 檔（超過先說明策略）、改完 `npm run lint`／`npm test`／`npm run build`，渲染變更再加 `npm run perf:guard`、禁 Three/Pixi/WebGL、素材 URL 用 `import.meta.env.BASE_URL`、子系統只透過 `engine.bus`、UI 只經 `UICommand` 寫入引擎。
- **鐵律**：**未經使用者明確指示不得合併進 `main`、不得 push**（合併與 push 要分開問）。低階代理在某個工作樹跑的時候，不碰那個工作樹、不跑 e2e／perf／Blender 等重工作。
- **使用者**：繁體中文；要簡潔、GitHub markdown；能自己做的（量測、安裝）就自己做；不確定就問。
- **使用者機器**：Windows、RTX 4070、Ryzen 7800X3D、主螢幕 2560×1440 @ 239 Hz（量測用）、副螢幕 59 Hz（AMD 內顯，會污染量測要避開）、Python 3.10、Node 24、`msedge` 供 Playwright。
- **PowerShell 陷阱**：終端機中文亂碼但檔案是 UTF-8；新檔寫 LF，多數原始檔是 CRLF（編輯保持原行尾）；巢狀引號易 ParserError，複雜字串改寫檔；字串內 `\r\n` 不會展開（用反引號）；**絕不輸出 `&gt;`／`&lt;` 之類 HTML 實體**；`git push` 的進度輸出會被當 stderr（退出碼 1 不代表失敗，看 `main -> main` 那行）。

## 2. Git 狀態（2026-10-16）
- **單一主線**：`C:\Git\Group-Battler-FFT-Final`，分支 `main`。主代理與 IDE 代理都在這個資料夾工作。若 `git worktree list` 還看得到 `Group-Battler-main`／`-death-vfx`／`-chore`，代表搬遷步驟尚未做完。
- `main` 已含：大逃殺修正、死亡特效／擊飛、AI Studio 清理、文件整理、合約改版（`CLAUDE.md`／`AGENTS.md`／`.claude/agents/`）、README 更新。push 狀態以 `git status -sb` 為準。
- **目前沒有進行中的分支或低階代理。**
- **開新一輪的流程**：主代理寫 `docs/<NAME>_AGENT_PROMPT.md` → 從 `main` 開分支（例如 `feat/<topic>`），在原生資料夾切過去 → 使用者在 IDE 執行 `/goal docs/<NAME>_AGENT_PROMPT.md` → 跑完告訴主代理 → 主代理審查、修正、本機實跑 → 使用者同意才合併，push 另外問。代理跑的期間主代理對該資料夾只讀不寫。
- **真的需要並行時才開工作樹**（命名 `C:\Git\Group-Battler-<topic>`，`node_modules` 可用 junction 指回原生資料夾）。移除時**先刪 junction**（`cmd /c rmdir <path>\node_modules`）再 `git worktree remove`，否則可能連帶刪掉原生資料夾的 `node_modules`。
- 本地 tag（`perf*-ckpt-*`、`ui-ckpt-*`、`audio-ckpt-*`、`art-ckpt-*`、`br-fix-final`、`docs-cleanup-final`）未推，可忽略。

## 3. 最近完成的工作（2026-10-15～16）

### A. 大逃殺（縮圈）兩大 bug
- **殘影根因**：`ZoneSystem` 縮圈殺人繞過 `handleDeadState`；`PhysicsEngine` 凍結死者物理；`deathTimer` 兩個寫入者。現在所有死亡都走唯一入口 `agentManager.handleDeadState`，失去地面的屍體會往下掉，`PhysicsEngine` 只設 `outOfBounds`，`fullyDead` 由 `updateDeathState` 回收。
- **發呆根因**：`ai_profiles.ts` 的 `Combat` 是 SEQUENCE，技能全部冷卻時整串失敗、追擊與 Idle 都不跑。改為 `Combat Actions` SELECTOR；被困時改為衝向目標。
- **審查時我拿掉的**：代理加的「發呆看門狗」（B0 的 IDLE 實測 0 次，屬掩蓋症狀，且改到 facade `game.ts`）。
- **重現工具**：`node tools/ui-e2e/br-soak.mjs --seeds=20 --shrinkInterval=3 --assert-ghost --assert-idle`（修正後 20/20 乾淨）。細節見 `docs/BR_FIX_REPORT.md`（開頭有審查修正說明）。

### B. 死亡特效／擊飛
- `deathTimer` 單一寫入者後，死亡動畫與屍體殘留（`DEATH_ANIM_DURATION`=5.5 秒）才真的會跑。擊飛：`data/units/appearance/deathMotion.ts`（純函式，依 `deathTimer` 與 ragdoll 軀幹初速推導），參數 `constants.ts` 的 `DEATH_KNOCKBACK`；`UnitSystem` 把滑行位移併入繪製位置與深度排序鍵。死亡粒子：塵煙＋火花（`DEATH_VFX`）。
- **待使用者實機確認**：擊飛距離／彈跳手感、是否閃爍、5.5 秒殘留是否太久。

### C. 文件整理
- 報告 `docs/CLEANUP_REPORT.md`。過期註解與文件已校正、已完成的提示詞歸檔、刪除零引用死碼（`RagdollPhysics`、`SpriteManager.getUnitLayersFull`）。C2～C4 的 build 雜湊與 `main` 相同（證明沒改行為）。`docs/ASSET_NEEDS.md` 仍有未完成需求，保留。

### D. 待使用者決定
- **Dockerfile／`server.js`／`.dockerignore`／`package.json` 的 `start`／README 的對應段落**（早期 Cloud Run 部署設定）：之後在 AI Studio 重新拉 git 發布時可能還用得到，暫時**保留**。
- `art-source/` 與 `public/assets/units/` 的圖集重複（約 5 MB）：是否移出版本控制。

## 4. 已完成輪次與審查結論（精簡）
- **效能四（2026-10-12 合併）**：`?perf` HUD、`perf:frames`／`perf:attribution`、去 `shadowBlur`、`VFX_BUDGET`。我調過品質治理器門檻（`RENDER_QUALITY.DOWN_MS` 14／`UP_MS` 9）。殘留熱點：`TextPainter`（SHOUT 漸層、`shadowBlur`、Glitch `Math.random`）、`UnitCorePainter` 受創 `shadowBlur`、`ProjectileDrawer` 每幀漸層、`ProceduralPainter` 光束、`FloatingTextDrawer`（見 `docs/PERF_REPORT_4.md` §3、§11 與 `docs/VFX_INVENTORY.md`）。
- **美術（合併）**：KayKit 預渲染精靈 10 張（`public/assets/units`，manifest 在同目錄）＋地形貼圖 10 張＋粒子貼圖 5 張；體型軸 `Team×Role×BodyType`（MALE 有素材）。
- **AI Studio 的「美術修正輪」（`8c014d1`）— 我審查後修補的重點**：
  1. **畫面凍結**：`useGameApp` 在 React StrictMode 清理時立刻 `engine.destroy()` 並重用 → 引擎永遠停止。已改為**延後一個 tick 銷毀、重新掛載則取消**。
  2. **誤刪必要檔案**：它把 `ImperialTokenFactory`／`CovenantTokenFactory`（仍負責單位腳下底座與職業圖示）當舊管線刪掉，底座變成實心圓。已從 `b4b0b20` 復原（連同 `MaterialPainter`、`imperial.ts`／`covenant.ts`／`types.ts`／`index.ts`、`materialConfig.ts`、`UnitFactory.ts`）。
  3. **地形烘焙卡頓**（熔岩地圖個位數 FPS 的主因）：快取鍵含浮動相位×縮放級距，容量滿時**整個清空**造成重烘焙風暴。已加「每時間窗烘焙預算＋借用相鄰縮放級距 sprite」與「只丟舊縮放級距」（`RENDER_CACHE.BAKE_BUDGET_MS`／`BAKE_WINDOW_MS`、`TerrainBlockCache.ts`）。**使用者仍需在熔岩圖實測**；若仍卡，開 `?perf` 重現後在 console 貼 `JSON.stringify(window.__PERF_SPIKES__)`（尖峰記錄器已內建，含各階段耗時與 `terrainCache` hits／misses／evictions）。
  4. **BGM 疊音**：AI Studio 的共享引擎＋擁有者計數＋請求序號修法**使用者已確認修好**。
  5. 其他：角色大小 `UNIT_SPRITE.targetHeightCanvasUnits=59`（護盾稜柱為上限，測試遍歷全部影格）；護盾高度現在**自動貼合角色頭頂**（`SHIELD_VISUAL.headMargin`、`computeShieldGeometry`，飛行單位跟隨 body center）；`battle_frozen` 基準因單位變大已重錄一次（5 個地形基準仍 0 差異）。
- **審查教訓（已知教訓，務必記住）**：
  1. **AI Studio 容器看不到實際畫面、跑不了 Playwright**——它宣稱「全綠」不代表畫面正常。凡改渲染／生命週期，**必須本機實跑驗證**（最小：`createServer`＋`playwright-core`＋`msedge` 開頁、讀 `window.__TACTICAL_ENGINE__`、必要時截一張圖）。
  2. React StrictMode 下，元件清理**不可立即 `destroy()` 仍會被重用的物件**。
  3. 一個狀態欄位**只能有一個寫入者**（`deathTimer` 的教訓）。
  4. 刪除「舊管線」前先 `git grep` 證明零引用；新管線常仍依賴舊檔案的一部分。
  5. 排序（depth sort）鍵必須包含繪製時才套用的位移。
  6. 代理在缺乏證據時會加「安全網」掩蓋症狀（大逃殺的發呆看門狗）。B0 證據為 0 的修正一律拿掉，只保留對應到根因的改動。
  7. 代理會改到舊版的交接文件而造成衝突；任務合約要列出「受保護檔案」，`HANDOFF.md`／合約檔由主代理親自維護。

## 5. 專案現況重點
- **音訊**：`engine/audio/AudioEngine.ts`（共享單例＋擁有者計數＋BGM 請求序號；`?mute` 不建立 AudioContext）、`engine/systems/audio/AudioSystem.ts`（事件→Cue、BGM 切換）、`data/audio/{cues,music}.ts`、素材 `public/assets/audio/`（CC0／CC-BY，見 `docs/ASSET_LEDGER.md`、`CREDITS.md`）。展示模式只播 `SHOWCASE_AMBIENT`；手動：開戰 `BATTLE_NORMAL`→存活≤4 `BATTLE_TENSE`→勝敗曲（紅藍分開）→回氛圍。預覽頁 `tools/audio/preview.html`。
- **特效**：登記管線 `data/vfx/VFXRegistry.ts`＋`engine/systems/vfx`；直接繪製管線在 `engine/renderers/*`；品質階層 `engine/renderers/RenderQuality.ts`＋`constants.ts` 的 `RENDER_QUALITY`／`VFX_BUDGET`／`DEATH_VFX`。
- **單位**：精靈 `engine/renderers/units/factions/SpriteUnitRenderer.ts`（圖集 `SpriteAtlasStore`；座標：在 `ctx.scale(UNIT_SCALE)` 之後繪製，需 `/UNIT_SCALE` 補償，腳底錨點 `UNIT_SPRITE.footOffsetLocal`）；地面底座／職業圖示仍由 Token 工廠產生。
- **UI**：視窗系統 `components/ui/window/*`、展示頁 `components/ui/showcase/ShowcaseOverlay.tsx`（標題卡除按鈕外穿透）。樣式基準 `tools/ui-e2e/style-baseline.json`（改 UI 樣式需 `E2E_UPDATE_STYLE=1 npm run e2e:ui` 並確認只有預期元素變動）。
- **量測工具**：`perf:fidelity`（保真，battle_frozen＋5 地形）、`perf:guard`、`perf:frames`（2560×1440，**用主螢幕**）、`perf:attribution`、`?perf` HUD（rAF 真實幀間隔＋尖峰記錄）。保真鐵律：基準不得任意重錄、門檻不得放寬。**測試用 hook `__resetSeed`／`__stepFrames` 不在 app 內**，由 `tools/` 腳本以 `addInitScript` 注入（見 `tools/assets/create-battle-comparison.mjs`、`tools/ui-e2e/render-fidelity.mjs`）。
- **dev server**：`npm run dev`（port 3000，`0.0.0.0`）。

## 6. 暫存區 `C:\Git\_asset_staging\`（repo 之外）
- `docs\`：舊手冊備份（**以 repo 為準**）；`art\terrain_grid.jpg`、`art\ref_*`（使用者風格參考，**不得進 repo**）；`sprites\`（10 張精靈＋manifest）；`assets3d\kaykit_adventurers\`；`tools\blender\...\blender.exe`（可攜）與 `tools\blender_scripts\`（`render_unit.py`、`pack_sprites.py`）；`audio_tmp\`。
- 美術風格：相機正交仰角 30°（=`ISO_SCALE_Y 0.5`）、四向原生渲染；BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱。

## 7. 決策與待辦池
- 題材奇幻（FFT-like）、保持六角格、固定等距視角；AI 逐張生圖做單位已放棄，改 KayKit 預渲染；AI 圖只用於地形材質與日後圖示。授權：CC0 優先、CC-BY 可（致謝）、拒絕 NC／ND／GPL／不明；維護 `docs/ASSET_LEDGER.md`、`CREDITS.md`。
- **待辦池（無順序，使用者要時再開）**：
  1. 效能五：清掉 §4 殘留熱點，以 `perf:frames` 的 p99 驗證。
  2. 地形烘焙實作（設計 `docs/BAKED_RENDERING_DESIGN.md`、原型 `tools/baked-terrain-proto.html`）；先看熔岩圖在烘焙預算修正後是否已夠順。
  3. 每個地圖主題一首 BGM；紅方勝利曲換成真正的暗黑曲。
  4. FEMALE 與其他體型、專用神職模型、加強陣營辨識度（見 `docs/ASSET_NEEDS.md`）。
  5. 手機版 UI 全面巡檢。
  6. 縮圈墜落的單位是否需要專屬「墜落」動畫（目前是垂直掉入虛空後立即回收）。
  7. **架構：狀態所有權**。`Agent` 有約 89 個欄位，模擬與視覺狀態混在一起，「唯一寫入者」目前只靠紀律維持。下一步可替欄位分組並標註唯一寫入者；系統與渲染層之間仍有雙向 import（`engine/systems/` 內含渲染系統）。先設計再動手。

## 8. 使用者要做的事（提醒他）
- 實機看擊飛手感、熔岩圖流暢度、護盾貼合（含飛行單位）、大逃殺縮圈是否乾淨。
- 每次合併／push 前的決定由使用者下。

## 9. 在 Claude Code 使用的注意
- Claude Code 會自動讀根目錄 `CLAUDE.md`（主代理專用的精簡版，會載入本檔；`AGENTS.md` 為審查時才讀的檢查清單）。子代理定義在 `.claude/agents/`（explorer／worker／reviewer，模型與強度寫在 frontmatter）。內建子代理不會讀 `CLAUDE.md`。
- 使用者把這些指令檔統稱「合約」：主代理合約 `CLAUDE.md`、實作代理合約 `AGENTS.md` 與 `docs/*_AGENT_PROMPT.md`、子代理合約 `.claude/agents/*.md`。
- 推理強度上限 high；工作階段不能自己切換強度，需要時停下請使用者在 App 切。
- 本機指令用 PowerShell 或 Git Bash；長時間指令以背景方式執行並等待完成，**不要輪詢**。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
