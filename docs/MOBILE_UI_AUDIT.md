# 手機版 UI 巡檢（HANDOFF §7 待辦 #5）

> 日期 2026-10-16。範圍：`components/**` 與 `index.css`，只動 CSS／版面，不碰引擎。
> 工具：`node tools/ui-e2e/mobile-audit.mjs --tag=<before|after>`（Vite + `playwright-core` + `msedge`，`isMobile`＋`hasTouch`，即 `pointer: coarse`）。
> 截圖在 `tools/ui-e2e/out/mobile/<tag>/<視窗>_<畫面>.png`（git 忽略，不入庫）；幾何掃描結果在同目錄 `findings.json`。
> 視窗：375×812、390×844（直向）、812×375（橫向）。畫面：展示頁、展示設定、手動模式、工具列子選單×3、系統選單、7 個工具視窗、單位檢查器、勝利畫面。

## 缺陷清單

嚴重度：**高**＝內容或按鈕被切掉／無法操作；**中**＝可用但重疊、難點或壞掉的版面；**低**＝外觀或邊角。

| # | 嚴重度 | 缺陷（修前） | 證據（`before/`） | 狀態 |
| :-- | :-- | :-- | :-- | :-- |
| D1 | 高 | 播放 HUD 寬 406px，比 375 視窗還寬；`useDraggable` 夾不進去，左右兩端被切（暫停鈕／展示鈕可能出界） | `375x812_03_manual.png`、`findings.json` `block-offscreen playback-hud [0,664→406,752]` | 已修 |
| D2 | 高 | 地圖編輯工具列（寬約 346px）被系統選單鈕（右上 48px）蓋住，最右的「刪除」鈕完全點不到 | `375x812_03_manual.png`（`overlap system-menu-button ∩ toolbar`） | 已修 |
| D3 | 高 | 單位工具子選單寬 389px，超出 375；「指定男體型」鈕出界（350→377） | `375x812_05_toolbar_unit_draft.png` | 已修 |
| D4 | 高 | 橫向 812×375：系統選單下拉不可捲動，「導演 AI 設定／縮圈／音訊／重設版面／匯出」五項落在畫面外；點選時瀏覽器把整個 App 根容器捲動 31px，選單鈕被推到畫面上方（`top:-7`） | `812x375_07_menu.png` | 已修 |
| D5 | 高 | 橫向勝利畫面：卡片（`p-10`＋`text-5xl`標題＋3 鈕）高於 375px，垂直置中後上下被切、無法捲動，「再戰一局」落在畫面外 | `812x375_99_gameover.png`（`offscreen 再戰一局 [191,366→621,412]`） | 已修 |
| D6 | 中 | 橫向展示設定：標題卡的隱藏條件用 Tailwind `max-md`（≤768），但視窗改成底部抽屜是 ≤900，所以 769–900px 寬時「TACTICAL.OS」疊在設定抽屜上 | `812x375_02_showcase_settings.png` | 已修 |
| D7 | 中 | 畫布容器 `flex-1` 缺 `min-h-0`，被畫布內在尺寸撐高（812×375 時 406px > 375px），App 根容器多出 31px 可捲動範圍，上述 D4 的位移就是它造成；畫布可見區也比畫布小 31px（鏡頭置中偏移） | 量測：根容器 `scrollHeight 406 > clientHeight 375`（修後 0） | 已修 |
| D8 | 中 | 點擊目標小於 40px：播放 HUD 重來／隨機 32×32；工具列子選單的 HP 輸入 16px 高、模式／體型／平頂尖頂鈕 23–25px 高、下拉 27–31px；展示設定頁籤 32px、排版鈕 35px；日誌／技能庫／特效庫／檢查器的頁籤與篩選鈕 25–33px；檢查器設定鈕 28×28；音訊靜音鈕 30px | `findings.json` `tap-small`（每個畫面 5–10 筆） | 已修（高度 44，見下） |
| D9 | 中 | 視窗內滑桿軌道只有 6px 高，手指幾乎按不到（音訊、縮圈、導演、展示設定） | `375x812_win_zoneSettings.png` | 已修（觸控區 34px，外觀不變） |
| D10 | 低 | 橫向時底部抽屜佔 72vh（270px），只剩約 100px 看戰場；工具列浮在抽屜上方 | `812x375_win_*.png` | 未修（設計取捨，要改需調 `UI_WINDOW.SHEET_MAX_VH` 並按方向區分） |
| D11 | 低 | 部分頁籤／切換鈕寬度只有 27–38px（高度已補到 44），相鄰時容易誤觸 | `after/findings.json` `tap-small`（38×44、27×44、31×44） | 未修 |
| D12 | 低 | 沒有 `viewport-fit=cover`／安全區域處理：有瀏海或底部手勢列的手機，貼邊的 HUD 可能被遮住 | `index.html` | 未修（要全面改 inset，風險大於收益，留待實機回報） |
| D13 | 低 | 展示頁直向：「啟動戰術模擬」按鈕文字折成兩行；`?quality` 的 FPS 除錯字會蓋在左上設定鈕上（僅除錯時出現） | `375x812_01_showcase.png` | 未修 |
| D14 | 低 | 未涵蓋：檢查器的 AI／技能分頁內容、展示設定其他三個分頁、畫布手勢（拖曳平移／雙指縮放）、長時間實機表現 | — | 未巡檢 |

修前掃描總計（三種視窗）：D1/D2 在每個直向畫面都出現；`tap-small` 每個畫面 2–10 筆。修後直向（375×812、390×844）所有畫面 0 筆高／中；橫向只剩 D11（寬度）與捲動容器內的誤報。

## 修正內容（只有 CSS／版面）

- **新 `hooks/useCompactViewport.ts`**：`(max-width: UI_WINDOW.SHEET_BREAKPOINT)`，與視窗變抽屜同一個斷點（900），避免再有「兩個斷點不一致」（D6 的根因）。桌面（≥1280）不受影響。
- **`index.css`**：`--touch-target-min`（= `UI_WINDOW.TOUCH_TARGET_MIN_PX` 44）；既有的 `pointer: coarse` 規則改用它；新增選用類別 `.touch-target`（高 44）、`.touch-target-icon`（44×44），**只在粗指標生效**；視窗內滑桿以 `padding-block`＋`background-clip` 放大觸控區（D8、D9）。
- **`SystemMenu`**：緊湊時 `top-3 right-3`，下拉 `max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain`（D4）。
- **`MapEditorToolbar`**：緊湊時隱藏拖曳把手、縮間距與分隔線（約 346→250px，D2）；子選單 `flex-wrap`＋`max-w-[calc(100vw-1.5rem)]`（D3）；控件加 `.touch-target`（D8）。
- **`PlaybackHUD`**：緊湊時縮間距、滑桿 w-24、重來／隨機並排、隱藏握把（406→約 340px，D1）；按鈕加 `.touch-target-icon`。
- **`ShowcaseOverlay`**：標題卡隱藏條件改用同一個緊湊判斷（D6）。
- **`GameCanvas`**：勝利層改 `overflow-y-auto` 並用 `m-auto` 置中（放不下時可捲動），緊湊時縮小邊距與標題字級（D5）。
- **`App.tsx`**：畫布容器加 `min-h-0`（D7）。
- 頁籤／篩選／設定鈕加 `.touch-target`：`ShowcaseSettings`、`UnitInspectorBody`、`AudioSettingsWindow`、`LogTab`、`SkillDbTab`、`VFXMapTab`（D8）。

**策略說明（超過 3 檔）**：每個檔案都只是加／換 class 或插一行 hook，沒有邏輯變動；按缺陷分組提交以便回退。顏色與尺寸沿用既有 Tailwind 與 token，沒有新增硬編碼顏色；唯一的新數字 44 是從 `UI_WINDOW.TOUCH_TARGET_MIN_PX` 抄成 CSS 變數並註明來源。

## 驗證

- `npm run e2e:ui`：全過，`style-snapshot: 0 diffs against baseline`（桌面樣式沒變，基準不需重錄）。
- `npm run lint`、`npm test`（343 通過）、`npm run build`：全過。
- 修前／修後截圖：`tools/ui-e2e/out/mobile/before/` 與 `after/`（同檔名一一對應，重跑 `mobile-audit.mjs --tag=...` 可重現）。
- 沒有跑 `perf:*`（GPU 被別的工作階段使用）。D7 的 `min-h-0` 只在畫布被內在尺寸撐高時有差，桌面 1440×900 掃描無新增溢出，但**使用者仍建議在實機確認畫布置中沒位移**。
