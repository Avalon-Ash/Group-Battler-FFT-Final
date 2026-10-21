# 工作方法論（主代理每次都讀）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。怎麼工作、怎麼審查、怎麼量測、環境陷阱。決策與理由在 `docs/DECISIONS.md`，完成紀錄在 `docs/WORKLOG.md`，待辦只在 `docs/HANDOFF.md`。

## 1. 省點數守則（使用者額度有限，最重要）
- 使用者之前在 Antigravity 花了很多點數（含一次在 AI Studio 燒掉 400 元卻交出壞掉的畫面）。**Claude Code 的主代理請把工作壓到最小**。
- **分工**：長時間、機械性、無人值守的實作交給低階代理（IDE 端 Gemini：`/goal docs/<PROMPT>.md`；額度多）；主代理只做 ① 設計／寫提示詞 ② 審查 diff ③ 小修 ④ 本機驗證 ⑤ 合併。
- **審查要便宜**：先 `git diff main...<branch> --stat`，只讀**程式碼**變更（`engine/`、`components/`、`data/`、`constants/`）；**不要整份讀 `docs/*REPORT*`**（代理報告常誇大，只看數字表與回退指南）；用 `grep`／`Select-String` 抓關鍵字；每次只讀一小段。
- **不要重複量測**；少截圖；回覆精簡；一次對話做完一輪就收。
- Claude Code 內用 `/compact` 壓縮上下文；`HANDOFF.md`（待辦）＋本檔＋`AGENTS.md` 足以在新對話重建上下文，需要歷史時才搜 `WORKLOG.md`、`DECISIONS.md`。

## 2. 專案與紀律
- **專案**：TACTICAL.OS（Vite + React 19 + TS + HTML5 Canvas 2.5D 等距六角戰棋）。遠端 `https://github.com/Avalon-Ash/Group-Battler-FFT-Final.git`（目前只有 `main`）。
- **治理規則全在 `AGENTS.md`**：`Agent` 純資料（不加方法）、SSOT 在 `types.ts`／`constants/*.ts`／`data/**`、禁 `as any`、禁魔術數字／硬編碼顏色、tick／渲染迴圈禁 `console.log`、單次改動 ≤3 檔（超過先說明策略）、改完 `npm run lint`／`npm test`／`npm run build`，渲染變更再加 `npm run perf:guard`、禁 Three/Pixi/WebGL、素材 URL 用 `import.meta.env.BASE_URL`、子系統只透過 `engine.bus`、UI 只經 `UICommand` 寫入引擎。
- **鐵律**：**未經使用者明確指示不得合併進 `main`、不得 push**（合併與 push 要分開問）。低階代理在某個工作樹跑的時候，不碰那個工作樹、不跑 e2e／perf／Blender 等重工作。
- **使用者**：繁體中文；要簡潔、GitHub markdown；能自己做的（量測、安裝）就自己做；不確定就問。
- **使用者機器**：Windows、RTX 4070、Ryzen 7800X3D、主螢幕 2560×1440 @ 239 Hz（量測用）、副螢幕 59 Hz（AMD 內顯，會污染量測要避開）、Python 3.10、Node 24、`msedge` 供 Playwright。
- **PowerShell 陷阱**：終端機中文亂碼但檔案是 UTF-8；新檔寫 LF，多數原始檔是 CRLF（編輯保持原行尾）；巢狀引號易 ParserError，複雜字串改寫檔；字串內 `\r\n` 不會展開（用反引號）；**絕不輸出 `&gt;`／`&lt;` 之類 HTML 實體**；`git push` 的進度輸出會被當 stderr（退出碼 1 不代表失敗，看 `main -> main` 那行）。

## 3. 一輪工作的流程
- 程序放在按需載入的 skill（`.claude/skills/`），不放常駐文字：開新一輪與寫提示詞 → `agent-prompt`；審查、收尾、合約效果紀錄 → `review-round`；渲染實跑 → `render-verify`；重錄基準 → `rebaseline-fidelity`。
- 本地 tag（`perf*-ckpt-*`、`ui-ckpt-*`、`audio-ckpt-*`、`art-ckpt-*`、`br-fix-final`、`docs-cleanup-final`）未推，可忽略。

## 4. 審查教訓
  1. **AI Studio 容器看不到實際畫面、跑不了 Playwright**——它宣稱「全綠」不代表畫面正常。凡改渲染／生命週期，**必須本機實跑驗證**（最小：`createServer`＋`playwright-core`＋`msedge` 開頁、讀 `window.__TACTICAL_ENGINE__`、必要時截一張圖）。
  2. React StrictMode 下，元件清理**不可立即 `destroy()` 仍會被重用的物件**。
  3. 一個狀態欄位**只能有一個寫入者**（`deathTimer` 的教訓）。
  4. 刪除「舊管線」前先 `git grep` 證明零引用；新管線常仍依賴舊檔案的一部分。
  5. 排序（depth sort）鍵必須包含繪製時才套用的位移。
  6. 代理在缺乏證據時會加「安全網」掩蓋症狀（大逃殺的發呆看門狗）。B0 證據為 0 的修正一律拿掉，只保留對應到根因的改動。
  7. 代理會改到舊版的交接文件而造成衝突；任務合約要列出「受保護檔案」，`HANDOFF.md`／`METHODOLOGY.md`／`DECISIONS.md`／`WORKLOG.md`／合約檔由主代理親自維護。
  8. 只寫在提示詞文字裡的停下條件（「數值變差就停」）→ 代理照樣做完並回報「無遺留」；要它停，就把條件做成會讓指令失敗的檢查（測試、腳本退出碼），審查時自己重量關鍵數字。依據：背景輪 BG3／BG4 保真變差、bg-probe 變 2～4 倍都沒停（WORKLOG §R）。

## 5. 專案地圖（各系統在哪）
- **音訊**：`engine/audio/AudioEngine.ts`（共享單例＋擁有者計數＋BGM 請求序號；`?mute` 不建立 AudioContext）、`engine/systems/audio/AudioSystem.ts`（事件→Cue、BGM 切換）、`data/audio/{cues,music}.ts`、素材 `public/assets/audio/`（CC0／CC-BY，見 `docs/ASSET_LEDGER.md`、`CREDITS.md`）。展示模式只播 `SHOWCASE_AMBIENT`；手動：開戰 `BATTLE_NORMAL`→存活≤4 `BATTLE_TENSE`→勝敗曲（紅藍分開）→回氛圍。預覽頁 `tools/audio/preview.html`。
- **特效**：登記管線 `data/vfx/VFXRegistry.ts`＋`engine/presentation/vfx`；直接繪製管線在 `engine/renderers/*`；品質階層 `engine/renderers/RenderQuality.ts`＋`constants/render.ts` 的 `RENDER_QUALITY`、`constants/vfx.ts` 的 `VFX_BUDGET`／`DEATH_VFX`。
- **單位**：精靈 `engine/renderers/units/factions/SpriteUnitRenderer.ts`（圖集 `SpriteAtlasStore`；座標：在 `ctx.scale(UNIT_SCALE)` 之後繪製，需 `/UNIT_SCALE` 補償，腳底錨點 `UNIT_SPRITE.footOffsetLocal`）；地面底座／職業圖示仍由 Token 工廠產生。
- **UI**：視窗系統 `components/ui/window/*`、展示頁 `components/ui/showcase/ShowcaseOverlay.tsx`（標題卡除按鈕外穿透）。樣式基準 `tools/ui-e2e/style-baseline.json`（改 UI 樣式需 `E2E_UPDATE_STYLE=1 npm run e2e:ui` 並確認只有預期元素變動）。
- **量測工具**：`perf:fidelity`（保真，battle_frozen＋5 地形）、`perf:guard`、`perf:frames`（2560×1440，**用主螢幕**）、`perf:attribution`、`?perf` HUD（rAF 真實幀間隔＋尖峰記錄）。保真鐵律：基準不得任意重錄、門檻不得放寬。**測試用 hook `__resetSeed`／`__stepFrames` 不在 app 內**，由 `tools/` 腳本以 `addInitScript` 注入（見 `tools/assets/create-battle-comparison.mjs`、`tools/ui-e2e/render-fidelity.mjs`）。
- **dev server**：`npm run dev`（port 3000，`0.0.0.0`）。

## 6. 暫存區 `C:\Git\_asset_staging\`（repo 之外）
- `docs\`：舊手冊備份（**以 repo 為準**）；`art\terrain_grid.jpg`、`art\ref_*`（使用者風格參考，**不得進 repo**）；`sprites\`（10 張精靈＋manifest）；`assets3d\kaykit_adventurers\`；`tools\blender\...\blender.exe`（可攜）與 `tools\blender_scripts\`（`render_unit.py`、`pack_sprites.py`）；`audio_tmp\`。
- 美術風格：相機正交仰角 30°（=`ISO_SCALE_Y 0.5`）、四向原生渲染；BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱。

## 7. 在 Claude Code 使用的注意
- Claude Code 會自動讀根目錄 `CLAUDE.md`（主代理專用的精簡版，會載入 `HANDOFF.md` 與本檔；`AGENTS.md` 為審查時才讀的檢查清單）。子代理定義在 `.claude/agents/`（explorer／worker／reviewer，模型與強度寫在 frontmatter）。內建子代理不會讀 `CLAUDE.md`。
- 使用者把這些指令檔統稱「合約」：主代理合約 `CLAUDE.md`、實作代理合約 `AGENTS.md` 與 `docs/*_AGENT_PROMPT.md`、子代理合約 `.claude/agents/*.md`、程序 `.claude/skills/*/SKILL.md`、強制規則 `tools/hooks/agent-guardrails.mjs`。
- 推理強度上限 high；工作階段不能自己切換強度，需要時停下請使用者在 App 切。
- 本機指令用 PowerShell 或 Git Bash；長時間指令以背景方式執行並等待完成，**不要輪詢**。
- 沒有圖像生成工具時，改用現成素材與指令列（Blender、PIL、ffmpeg 已在本機）。
