# 外出執行指令 #4（貼給 IDE 代理）

> 用法：在 IDE 代理對話輸入 `/goal docs/UI_AGENT_PROMPT_4.md`（或貼上「指令本文」）。
> 前情：`UI_AGENT_PROMPT_3` 已全部完成並經主代理審查（**R7、R8、REPORT3 皆已完成並 commit，本輪直接從 `U6a` 開始**；lint 0、test 107/107、build OK、`e2e:ui` ALL PASSED）。主代理審查後把 Inspector 套件的「找不到入口就 SKIP」改成硬失敗（SKIP 會讓測試靜默通過）。
> 本輪：收尾 R7/R8 → 建立「**computed-style 視覺回歸護欄**」→ U11 Token SSOT（外觀必須逐像素等價）→ U12 響應式/觸控（以 e2e 幾何斷言驗證）。
> **整串一次跑完（無待核定事項）**：U6 已獲使用者核准（D6–D10 全採建議值，見 `docs/UI_U6_SUBPLAN.md`，排在 `REPORT3` 之後、`S1` 之前）；E8 依 `docs/UI_E8_SUBPLAN.md` 以預設決策 D11–D14 執行（排在 U12 之後）。**不做**：`U13`（選配 chrome，使用者尚未提出需求）、任何 push / 動 `main` / 合併。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程、守則、已知陷阱、停下條件**完全沿用 `docs/UI_AGENT_PROMPT_2.md` 第 4–7 點與 `docs/UI_AGENT_PROMPT_3.md` 的額外規則**（≤3 檔、lint/test/build、接 React 的任務跑 `npm run e2e:ui` 並連跑兩次確認穩定、E9 baseline 只減不增、更新 `docs/UI_WINDOW_PLAN.md` 進度、一任務一 commit、**不 push、不動 `main`**、同題失敗 3 次就停）。

先閱讀：`AGENTS.md`、`docs/UI_WINDOW_PLAN.md`（§2、§8、§10–§13）、`docs/UI_NIGHT_REPORT_2.md`、`docs/UI_AGENT_PROMPT_3.md`（R7/R8 的原始規格在其中）、`tailwind.config.js`、`index.css`、`constants.ts` 的 `TEAM_COLORS`/`UI_*`。**若 `R7`/`R8`/`REPORT3` 已在 `docs/UI_WINDOW_PLAN.md` 進度表標 ☑（上一個代理對話可能已做完），直接跳過，從第一個未完成任務開始。** 確認在 `feat/ui-window`，且 `git status` 乾淨、`npm run e2e:ui` 現況為 ALL PASSED。

### 任務（依序）

`R7` → `R8` → `REPORT3` → `U6a` → `U6b` → `U6c` → `S1` → `U11a` → `U11b` → `U11c` → `U11d` → `U11e-1…n`（至多 10 批）→ `U12a` → `U12b` → `U12c` → `E8-0` → `E8-a…g` → `REPORT4` → `FINAL`

| 任務 | 內容 | 檔案（≤3；測試/docs/e2e/baseline 不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **R7** | 規格見 `UI_AGENT_PROMPT_3.md` 的 R7（`showcaseConfigStore` 取代模組級 `sharedConfig/sharedLayout`+listener+`show`-bridge；開窗改走 `useWindowActions`；Showcase 外觀與行為完全不變）。 | 新增 `showcaseConfigStore.ts`、`ShowcaseSettings.tsx`、`ShowcaseOverlay.tsx` | store 單元測試 + lint/test/build/e2e（Showcase 套件仍過） |
| **R8** | 規格見 `UI_AGENT_PROMPT_3.md` 的 R8（Inspector 數字欄位「本地草稿 + blur/Enter 提交」）。**T1e 套件目前用 `fill('123')` 驗 maxHp，需同步改成 `fill` 後 `press('Enter')` 或 blur**，不得放寬斷言。 | `UnitInspectorHUD.tsx`（+ e2e） | lint/test/build/e2e |
| **REPORT3** | 補寫 `docs/UI_NIGHT_REPORT_3.md`（R1a–R8、T1a–T1e 結果、行為差異：Showcase 時間倍率上限 3.0→5.0、相機剛度預設顯示改正；E9 baseline 前後；未驗證項）。 | docs | — |
| **U6a** | 依 `docs/UI_U6_SUBPLAN.md` 的 U6a：新增 `components/ui/inspector/UnitInspectorBody.tsx`（純內容，props 僅 `engine`、`agentId`；資料用 `useEngineView(engine, (e) => selectAgentView(e, agentId))`；無 `useDraggable`/藥丸/`setInterval`/寫死寬度；無選取單位時顯示「請先選取單位」空狀態；分頁 狀態/AI/技能）。**必須完整保留 R8 的行為**（maxHp/maxMp 本地草稿字串、blur/Enter 提交、Esc 還原、非法輸入還原顯示、換單位時草稿重設；T1e 的 `fill`+`Enter` 斷言原樣通過）。**所有 hooks 必須寫在任何 early return 之前**（舊 `UnitInspectorHUD` 的 R8 草稿 hooks 放在 `if (!agent) return null` 之後，是潛在的 Rules-of-Hooks 違規，新元件不得重蹈）。尚未接畫面，舊 HUD 仍運作。 | 新增 `UnitInspectorBody.tsx`（可抽 `InspectorHeader.tsx`） | lint/test/build；舊畫面 e2e 不變 |
| **U6b** | 依子計畫 U6b：`windowRegistry` 註冊 `inspector`（`flush`）；render ctx 加 `selectedAgentId`；`App.tsx` 的 `selectedAgent` 變動 → `open/close('inspector')`（只在狀態不同時呼叫，避免迴圈；保留 rect，D5）；移除 `<UnitInspectorHUD>` 渲染；視窗 ✕ → `setSelectedAgent(null)`；Showcase/結算時隱藏。 | `windowRegistry.tsx`、`App.tsx`、（必要時 `useGameApp.ts`） | lint/test/build/**e2e**：`inspector` 加進 SUITES（以 canvas 點擊 + `__TACTICAL_ENGINE__` 開啟，通用 12 項全過）；T1e/R8 套件仍過；選另一個單位 rect 不變；視窗外點擊仍可選取/取消選取；☰ 選單蓋在 inspector 之上；單位死亡時顯示空狀態不丟例外 |
| **U6c** | 依子計畫 U6c：刪除舊 `UnitInspectorHUD.tsx`；`BehaviorTreeTab` 的 `z-[9999]` 改為視窗內局部層（不得高於視窗層以免蓋住選單）；`UnitStatusTab`/`BehaviorTreeTab` 內若有自己的輪詢改 `useEngineView`；E9 `setInterval`、`directEngineMutation` 等計數下調。 | 刪 `UnitInspectorHUD.tsx`、`BehaviorTreeTab.tsx`、baseline | lint/test/build/e2e（含 `zIndexClasses` 下調） |
| **S1** | **視覺回歸護欄（先於任何 Token 工作）**：在 e2e 新增 `style-snapshot` 套件：對固定場景（手動模式；開啟全部 7 個視窗；Showcase 模式；選取一個單位的 Inspector）逐一以 `getComputedStyle` 擷取**關鍵元素**（視窗殼、標題列、按鈕、滑桿軌道/拇指、tab、liquid-card、HUD 藥丸、工具列、選單項目）的 `color / backgroundColor / borderTopColor / boxShadow / backdropFilter / opacity / borderRadius / fontSize`，寫入 `tools/ui-e2e/style-baseline.json`；比對時**逐欄位完全相等**，差異列出元素與欄位。環境變數 `E2E_UPDATE_STYLE=1` 才允許覆寫 baseline。為這些元素補穩定的 `data-testid`（只加屬性，不改樣式）。**必須先在目前未改動的樹上產生並 commit baseline**（這就是「改前」基準）。動畫中的值要先等待穩定或暫停動畫（`animation-play-state`/`page.emulateMedia({ reducedMotion: 'reduce' })`），不穩定的欄位排除並在報告列出。 | `tools/ui-e2e/windows.e2e.mjs`、`tools/ui-e2e/style-baseline.json`、（`data-testid` 最多 2 個元件檔） | 連跑兩次一致；故意改一個色值確認會抓到差異（再還原） |
| **U11a** | `data/ui/tokens.ts`：語意 token SSOT。team 色**直接引用** `constants.ts` 的 `TEAM_COLORS`（不得複製色值）；定義 `surface`/`line`/`text`/`accent`/`danger`/`warn`/`team`…，色值**必須等於目前實際使用的 Tailwind 調色盤值**（例如 `cyan-400 = #22d3ee`；以 `tailwindcss/colors` 為準，寫成 `r g b` 通道字串以支援 `/20` 透明度）。 | 新增 `data/ui/tokens.ts`、`tests/UITokens.test.ts`（測：team 色等於 `TEAM_COLORS`、每個 token 值格式合法） | lint/test/build |
| **U11b** | `tools/gen-ui-tokens.ts`（用 `tsx`/`vite-node` 其中**專案已有**者執行；不得新增依賴）→ 產生 `styles/tokens.css`（`:root{--…}`）；`package.json` 加 `gen:tokens`；測試：產物與 SSOT 一致（已 commit 的 css 重新產生後 diff 為空）。 | 新增 `tools/gen-ui-tokens.ts`、`styles/tokens.css`、`package.json` | lint/test/build |
| **U11c** | `tailwind.config.js` 的 `theme.extend.colors` 以 `rgb(var(--token) / <alpha-value>)` 映射語意名；`index.css` 引入 `tokens.css`，並把 `liquid-*` 與 `--neon-*`、`--glass-*` 改引用 token；**`[data-team]` 區塊內的重複色值刪除，改由 token（來源 `TEAM_COLORS`）提供**。 | `tailwind.config.js`、`index.css`、`styles/tokens.css`（若需補變數） | lint/test/build/e2e + **style-snapshot 必須 0 差異** |
| **U11d** | `ToolWindow.tsx`（§10 F8）內寫死的 Tailwind 調色盤換成語意 token class。 | `ToolWindow.tsx`（+ 必要時 `WindowLayer.tsx`） | e2e + **style-snapshot 0 差異**；E9 `tailwindPaletteClasses` 下調 |
| **U11e-n** | 依 E9 統計，每批挑調色盤用量最多的 ≤3 個元件，把 `text/bg/border/ring/shadow/from/to/via-(cyan\|slate\|red\|blue\|amber\|emerald\|purple\|orange\|rose\|indigo\|yellow\|green\|violet\|sky)-NNN(/α)?` 換成語意 token class（**純改名，色值必須逐一對應**；沒有對應 token 的色先補進 `tokens.ts` 並重新 `gen:tokens`，不要用近似色）。每批後下調 `tailwindPaletteClasses` baseline。**至多 10 批**，其餘留待下輪，寫進報告。動態類名（模板字串拼接）不可拆，改成完整類名查表（`Record<Team, string>`）。 | 每批 ≤3 檔 | 每批：lint/test/build/e2e + **style-snapshot 0 差異** |
| **U12a** | **≤900px bottom sheet**：新增 `UI_WINDOW.SHEET_BREAKPOINT=900`、`SHEET_MAX_VH=72`（常數）。`ToolWindow` 在窄螢幕以底部面板呈現：寬度 100%、貼底、`max-height: min(72vh, …)`、**禁用拖曳/縮放/最大化把手**、一次只顯示最上層一個（其餘保持 open 狀態但不渲染為可見，切換回寬螢幕恢復）。**不改寫已存 rect**（顯示時推導，與 F1 同原則）。 | `ToolWindow.tsx`、`constants.ts`、（`WindowLayer.tsx`） | e2e：以 390×844 viewport 開 3 個視窗，斷言：只有一個可見、寬=viewport、底邊貼齊、高 ≤72vh、無把手元素；放大回 1440 恢復原 rect。**style-snapshot 寬螢幕場景仍 0 差異** |
| **U12b** | **觸控命中區**：`@media (pointer: coarse)` 下標題列按鈕與把手命中區 ≥44px（`UI_WINDOW` 常數；視覺大小可不變，用 padding/偽元素擴大命中區）。`prefers-reduced-motion`：關閉 `animate-*` 與 `transition-all` 大動畫。 | `ToolWindow.tsx`、`index.css`、`constants.ts` | e2e：以 `hasTouch:true,isMobile:true` context，量測標題列按鈕/把手 bounding box ≥44px；`emulateMedia({reducedMotion:'reduce'})` 下動畫元素 `animationName==='none'` |
| **U12c** | **觸控捲動**：根節點 `touch-none` 收斂到 Canvas 區，面板（視窗內容）可捲動（`touch-action: pan-y pan-x`）；視窗標題與把手仍 `touch-action:none`。 | `App.tsx`、`ToolWindow.tsx`（`index.css` 如需） | e2e：用 CDP `Input.synthesizeScrollGesture` 在 Logs/SkillDB 視窗內容上垂直捲動，斷言 `scrollTop` 改變且視窗 rect 不變、Canvas 相機不動（讀 `__TACTICAL_ENGINE__.renderer.camera`）。若 CDP 手勢在 headless 不可靠，標「未驗證」並寫入報告，**不要硬寫不穩定測試** |
| **E8-0** | 依 `docs/UI_E8_SUBPLAN.md`（**已預設核准 D11–D14**）的 E8-0：先寫編輯器 e2e（現況必須全綠）並擴充 E9 指標 `directEngineMethodCalls`/`directPoseWrites`（baseline=當下實測）。**任一動作找不到穩定 e2e 入口 → 該動作不遷移（保留為文件化例外並寫進報告），其餘動作照常進行，不必整串停下**。 | `windows.e2e.mjs`、`UIBoundary.test.ts`、baseline | 連跑兩次穩定 |
| **E8-a…E8-g** | 依子計畫逐段：命令與處理器（a）→ `EditorQuery`（b）→ `useGameInput` 低頻寫入與查詢（c）→ `useGameApp` 生命週期（d）→ 鏡頭命令與 FPS 守門（e/e2）→ 驅動迴圈 D13（f）→ 收尾與白名單、`AGENTS.md` §1.5 補 D11 例外句（g）。**每段一個 commit，並打本地 tag `ui-ckpt-E8<段>`**；E8-0 的 e2e 每段都要全綠。 | 每段 ≤3 檔（見子計畫） | 每段 lint/test/build/e2e |
| **FINAL** | 全量驗證（lint/test/build/`e2e:ui` 兩次）、確認 `git status` 乾淨且未 push、對每個已完成階段補打本地 tag（`ui-ckpt-U6`、`ui-ckpt-S1`、`ui-ckpt-U11`、`ui-ckpt-U12`、`ui-ckpt-E8`，若尚未存在）；寫 `docs/UI_MERGE_CHECKLIST.md`：①分支與 commit 摘要 ②所有「已核准的預期外觀/行為差異」清單（Showcase 時間倍率上限、相機剛度顯示、Inspector 位置/收合/寬度、bottom sheet…）③需使用者手動目視/實機確認項 ④回退指南（各 tag 與 `git revert` 範例）⑤合併指令範例（**僅供參考，不要執行**；合併 = 發佈到 GitHub Pages）。 | docs | — |
| **REPORT4** | `docs/UI_NIGHT_REPORT_4.md`：逐任務結果、style-snapshot 欄位清單與排除項、E9 baseline 前後（含 `tailwindPaletteClasses`）、U11e 完成批數與剩餘量、U12 的 e2e 斷言清單、未驗證項、**建議使用者手動看的畫面清單**（寬螢幕外觀對照、手機實機的 bottom sheet、觸控縮放/拖曳）。 | docs | — |

### 本輪額外規則

- **U11 的鐵律是「外觀逐像素等價」**：任何一批 `style-snapshot` 出現差異 → 還原該批、找出沒對上的色值、補 token 或修正對應後重做；**不得更新 baseline 來讓測試通過**（`E2E_UPDATE_STYLE=1` 只允許在 S1 使用一次）。
- **U6 若發現與 D6–D10 衝突、需要超過 3 檔、或 e2e 反覆不穩，停下回報**，不要自行改決定；U6 的畫面行為差異（Inspector 預設位置改左上、藥丸改收合、寬度改由使用者拉）是已核准的預期差異，寫進報告即可。**U6 必須在 S1 之前完成**，S1 的 baseline 才會包含新的 Inspector 外觀。
- **U12 預設決策（不需再問）**：窄螢幕 bottom sheet 一次只顯示最上層一個視窗（其餘維持 open 但不可見）；點選單項目時該視窗成為最上層；關閉最上層後次一層自動顯示。其他語意不明處採「風險最小、可回退」並記錄。
- 觸控相關 e2e 若在 headless 不可靠，優先量測幾何與 computed style（可靠），避免模擬複雜手勢。
- 時間/額度吃緊時的取捨順序：保 `R7→R8→REPORT3→U6a-c→S1→U11a-d→U12a`，再依序 `U12b-c→E8-0…→U11e` 批次；其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。** 完成每個階段（U6、S1、U11、U12、E8）都先打本地 tag `ui-ckpt-<階段>` 再繼續。
- **E8 專屬**：e2e 防線先行（E8-0），之後每段都要全綠；D12 的 FPS 守門、D13 的 grep 判斷是**條件式**步驟，不達條件就依子計畫的備案處理並寫進報告，不要停工。E8 若需要動 `engine/**`（子計畫已列的 `renderer.ts` 訂閱與條件式 `game.ts` 之外）→ 停下回報。
- **停工原則**：遇到本文件與子計畫都沒涵蓋、且會改變使用者可見行為的情況才停下；其餘自行選擇「風險最小、可回退」的做法並記錄在報告。

---

## 回來後使用者要做的事（給人看）

1. `git log feat/ui-window --oneline`，讀 `docs/UI_NIGHT_REPORT_3.md`、`UI_NIGHT_REPORT_4.md`。
2. 手動確認 Inspector 視窗：點單位開啟、✕ 取消選取、選別的單位位置不變、收合只剩標題列、☰ 選單可開關。
3. `npm run dev` 目視比對外觀（Token 化應與之前一模一樣）；手機實機看 bottom sheet 與觸控。
3. 編輯器手動確認（E8）：新增/刪除單位、放障礙、拖曳單位與障礙到合法/非法格、滾輪縮放、拖曳平移、開始/暫停、Showcase 一場能自動換場。
4. `docs/UI_MERGE_CHECKLIST.md` 是合併前清單；合併進 `main`（= 發佈到 GitHub Pages）前先別 push。
