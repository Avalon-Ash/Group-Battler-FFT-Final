# 主代理交接手冊（工具無關：Claude Code／Antigravity 皆可讀）

> 更新：2026-10-15 凌晨（使用者由 Antigravity 改用 **Claude Code**）。新對話的主代理 **先讀本檔 → 再讀 `AGENTS.md` → 開工**，不要重新探索專案。
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

## 2. Git 狀態（2026-10-15 凌晨）
**`origin/main` = `main` = `23e37c6`**（已 push）。已含：UI、效能 1～4、音訊、美術管線（精靈單位／貼圖地形／粒子貼圖）、AI Studio 的「美術修正輪」（**經我審查並修補**，見 §4）、地形烘焙預算、護盾貼合頭頂、`battle_frozen` 基準重錄。

**三個工作樹（`git worktree list`）— 各自有未合併的分支：**
| 路徑 | 分支 | 內容 | 狀態 |
| :-- | :-- | :-- | :-- |
| `C:\Git\Group-Battler-FFT-Final` | `fix/br-ghosts-idle` | 大逃殺兩大 bug（見 §3-A）；低階代理依 `docs/BR_FIX_AGENT_PROMPT.md` **執行中**（已有 B0 commit `eba8447`） | 代理跑完前**不要動這個工作樹** |
| `C:\Git\Group-Battler-death-vfx` | `feat/death-vfx` | 死亡特效／擊飛／計時修正（見 §3-B）＋ `docs/DOCS_CLEANUP_AGENT_PROMPT.md`；4 個 commit | **已完成待審**（lint／test／build 綠；擊飛手感待使用者實機看） |
| `C:\Git\Group-Battler-chore` | `chore/drop-aistudio` | 移除 AI Studio 專用檔（`.aistudio/`、`server.ts`、`metadata.json`、`.env.example`、`ALLOW_ALL_HOSTS`）；1 個 commit | 已完成待合併 |
| `C:\Git\Group-Battler-main` | `main` | **Claude Code 的乾淨工作樹**（`node_modules` 以 junction 連到主資料夾） | 在此讀檔／審查／合併 |

> `main` 沒有被任何工作樹以外的地方檢出；要合併時在 `C:\Git\Group-Battler-main` 做。代理（IDE）跑完後，使用者可把原資料夾改回 `main`（`git switch main`），再用 `git worktree remove` 清掉不要的工作樹。
> 本地 tag（`perf*-ckpt-*`、`ui-ckpt-*`、`audio-ckpt-*`、`art-ckpt-*`）未推，可忽略。

**建議合併順序**：① `fix/br-ghosts-idle`（代理完成並審查後）→ ② `feat/death-vfx`（與 ① 可能在 `AnimationSystem`／`agentManager` 衝突，見 §3）→ ③ `chore/drop-aistudio`（獨立）→ ④ 跑文件整理輪（`docs/DOCS_CLEANUP_AGENT_PROMPT.md`，**前提是 ①② 已合併**）。每次合併都**先問使用者**，push 另外問。

## 3. 進行中的工作（詳細）

### A. 大逃殺（縮圈）兩大 bug — `fix/br-ghosts-idle`
- **現象**：① 縮圈後掉落／被殺的單位模型（連護盾稜柱）殘留在空地上直到換場；② 部分單位在場上站著發呆（行為樹不明原因，歷來抓不到）。
- **我讀碼的疑點（未實測，需 B0 證據確認）**：`ZoneSystem` 縮圈殺人直接 `hp=0`＋`deadLogged=true` 卻**跳過 `handleDeadState`**（沒 `unregisterAgent`／`AGENT_DIED`／`deathTimer` 重置）；`PhysicsEngine.stepPhysics` 對 `hp<=0` 直接 return（死者物理凍結，下墜速度無效；被放逐者也不掉）；護盾等狀態繪製器未檢查死亡／出界；殘留佔位可能同時造成發呆。
- **代理計劃**：`docs/BR_FIX_AGENT_PROMPT.md`（B0 重現工具 `tools/ui-e2e/br-soak.mjs` → B1 修殘留 → B2 修發呆 → B3 驗證與 `docs/BR_FIX_REPORT.md`）。**審查重點**：每個修正是否對應 B0 證據；有無「發呆就隨機走」類掩蓋；`perf:guard` 是否仍 0 差異；是否重錄 baseline（不得）。

### B. 死亡特效／擊飛 — `feat/death-vfx`（已完成）
- **根因**：`deathTimer` 有**兩個寫入者**（`updateDeathState` 累加、`AnimationSystem` 遞減）→ 計時永遠 0，死亡動畫停在第 0 格、屍體也從不被移除。現已改為**單一寫入者**（`AnimationSystem` 不再碰它）；屍體殘留 `DEATH_ANIM_DURATION`=5.5 秒（死亡動畫 0.75 秒→停格→最後 1.2 秒淡出下沉）後移除。
- **擊飛**：`data/units/appearance/deathMotion.ts`（純函式，依 `deathTimer` 與 Ragdoll 軀幹初速推導滑行＋彈跳；參數 `constants.ts` 的 `DEATH_KNOCKBACK`）；`UnitDeathPainter.getKnockOffset`；`UnitSystem` 把滑行位移併入屍體的繪製位置**與深度排序鍵**（修過一次閃爍：排序鍵沒含位移導致被地塊來回覆蓋）。
- **死亡粒子**：`UnitShatter.spawn` 改為輕量塵煙（`SMOKE_PUFF`）＋火花（`SPARK`）＋陣營靈魂／血滴（參數 `DEATH_VFX`），舊的程序化 token 碎片噴射已移除。
- **合併注意**：縮圈殺人的單位在合併 ② 之前會「馬上消失」，② 之後會停在半空 5.5 秒——**必須先合 ① 再合 ②**（①會讓縮圈殺人走完整死亡收尾）。若兩邊都改了 `AnimationSystem` 的 `deathTimer` 段落，保留「單一寫入者」版本。
- **待使用者實機確認**：擊飛距離／彈跳手感（調 `DEATH_KNOCKBACK`）、是否仍閃爍、5.5 秒殘留是否太久（調 `AGENT_CONSTANTS.DEATH_ANIM_DURATION`）。

### C. 文件整理 — `docs/DOCS_CLEANUP_AGENT_PROMPT.md`（待跑，需 ①② 先合併）
只改文件與過期註解、歸檔已完成文件、移除雜物、`HANDOFF.md` 再校正；用 **`dist/assets` 檔名雜湊不變**來證明「沒改行為」。C6 才允許刪零引用死碼（例：`SpriteManager.getUnitLayersFull`）。

### D. 待使用者決定
- **Dockerfile／`server.js`／`.dockerignore`／`package.json` 的 `start`／README 的對應段落**（早期 Cloud Run 部署設定，commit `632019c`）：之後在 AI Studio 重新拉 git 發布時可能還用得到，暫時**保留**；使用者決定是否移除。
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
  1. 完成 §2 的合併序列與文件整理輪。
  2. 效能五：清掉 §4 殘留熱點，以 `perf:frames` 的 p99 驗證。
  3. 地形烘焙實作（設計 `docs/BAKED_RENDERING_DESIGN.md`、原型 `tools/baked-terrain-proto.html`）；先看熔岩圖在烘焙預算修正後是否已夠順。
  4. 每個地圖主題一首 BGM；紅方勝利曲換成真正的暗黑曲。
  5. FEMALE 與其他體型、專用神職模型、加強陣營辨識度。
  6. 手機版 UI 全面巡檢。
  7. 縮圈殺人的單位死亡演出（B 修好後，視覺是否需要專屬「墜落」動畫）。

## 8. 使用者要做的事（提醒他）
- 大逃殺修正代理跑完要告訴主代理；合併前親自開大逃殺看縮圈殺人是否乾淨、有無發呆。
- 實機看擊飛手感、熔岩圖流暢度、護盾貼合（含飛行單位）。
- 每次合併／push 前的決定由使用者下。

## 9. 在 Claude Code 使用的注意
- Claude Code 會自動讀根目錄 `CLAUDE.md`（已指向本檔與 `AGENTS.md`）。工作流不依賴對話記憶。
- 本機指令用 PowerShell；長時間指令以背景方式執行並等待完成，**不要輪詢**。
- IDE 代理與你同時存取同一工作樹時，只讀不寫；你的工作在 `C:\Git\Group-Battler-main`。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
