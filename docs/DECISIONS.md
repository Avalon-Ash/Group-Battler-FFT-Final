# 決策紀錄（已定案的方向與理由）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。只記「選了什麼、為什麼、放棄了什麼」；要推翻某條先找使用者。
> 工作方法在 `docs/METHODOLOGY.md`，完成紀錄在 `docs/WORKLOG.md`，待辦在 `docs/HANDOFF.md`。
> 架構級決策在 `docs/adr/`，本檔是索引與小決定。

## 1. 題材與畫面
- 題材奇幻（FFT-like）、保持六角格、固定等距視角（相機正交仰角 30°＝`ISO_SCALE_Y 0.5`、四向原生渲染）。
- 陣營色：BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱（待辦池）。
- HD 為主線，SD 像素原型已移除（tag `pixel-proto-ckpt`）。
- 渲染限 HTML5 Canvas 2D、禁 Three／Pixi／WebGL，詳見 [0001](adr/0001-canvas2d-and-prebaked-vfx.md)。

## 2. 素材策略與授權
- 單位：AI 逐張生圖已放棄，改 KayKit 預渲染（Blender 可攜版在 `_asset_staging`）。AI 圖只用於地形材質與日後圖示。
- 障礙物：選 CC0 3D 套件預渲染（KayKit Forest Nature／Dungeon Remastered／Medieval Hexagon、Kenney Nature Kit），不走改良程序化（`VISUAL_ROADMAP.md` D1）。
- 授權：CC0 優先、CC-BY 可（致謝）、拒絕 NC／ND／GPL／不明；維護 `docs/ASSET_LEDGER.md`、`CREDITS.md`。
- 使用者的風格參考圖（`_asset_staging\art\ref_*`）不得進 repo。

## 3. 視覺細節
- 特效一律預烘焙零件、渲染路徑 0 個每幀 `shadowBlur`，詳見 [0001](adr/0001-canvas2d-and-prebaked-vfx.md)。
- 零件外框語言是六角（ART_SPEC §0）；**詠唱法陣例外改圓形 `magicCircle`**（2026-10-19：實線六角高速旋轉造成毛刺，使用者回饋）。線條一律「模糊光暈＋細亮芯」，不畫實心粗線。
- 逐格鋪開的疊層（範圍、預警、區域）用柔光格 `SoftTile`，不逐格描實線（相鄰格雙邊會排成網格）。
- 地形變體 4→8 刻意不做：地塊快取翻倍，地表裝飾已提供變化。
- 障礙物動態：樹風擺用影格表；冰晶星芒、黑曜柱發光用疊層（影格表版多 3～5 ms p99）。
- 繪製點對齊裝置像素、主畫布 `imageSmoothingQuality` 為 low（`RENDER_QUALITY.IMAGE_SMOOTHING`，RenderSpec §3；歷史上曾設 high，因 drawImage 重複計算致幀時間倍增而降為 low；離線烘焙維持 high）。

## 4. 架構
- 座標協議以 `engine/renderers/RenderSpec.ts` 為準，渲染／座標工作一次只開一條，詳見 [0003](adr/0003-coordinate-protocol-and-serial-render.md)。
- 狀態欄位唯一寫入者（`engine/core/AgentOwnership.ts`）與嘲諷鎖定歸屬，詳見 [0002](adr/0002-state-field-single-owner.md)。
- 大逃殺的「發呆看門狗」不採用：B0 證據 IDLE 為 0，屬掩蓋症狀且改到 facade。根因修法是行為樹 `Combat Actions` SELECTOR。
- 保真基準不得任意重錄、門檻不得放寬，重錄須附新舊差異圖並獨立 commit，詳見 [0007](adr/0007-visual-verification-same-env-ab.md)。
- 文件防過時（2026-10-20）：過時直接刪除不歸檔、檔頭瘦身、`tests/DocDrift.test.ts` 把關，詳見 [0004](adr/0004-doc-anti-drift.md)。
- 合約分層（2026-10-20）：常駐文字、skill、hook 與 `tests/HarnessContract.test.ts` 分工，詳見 [0005](adr/0005-contract-layering.md)。

- 奧義要有感（2026-10-21 使用者）：加共用演出（命中光爆；畫面名稱橫幅實作後使用者評「太難看、很廉價」，移除並恢復頭頂喊招；詠唱暗場＋聚光實作後使用者評：不是不好，而是奧義詠唱只有 0.1～2 秒，來不及聚焦，只看到畫面亮暗快速交替（VRR OLED 上像閃爍），移除；詠唱要 5～10 秒才值得做，實作在 `c7df349` 可取回），放寬 ART_SPEC §6「閃光不得高於現在」為有上限的局部光；不做鏡頭推近（縮放會觸發地形重烘焙，曾造成卡頓）、不做模擬時間的頓格（表現層不得寫模擬時間）。範圍由詠唱逐格預警表示，命中時不加範圍格閃光（使用者：瞬發的看到也沒用、干擾視覺）。

## 5. 專案範圍（2026-10-16 使用者決定）
- 刪除 Dockerfile／`server.js`／`.dockerignore`／`start` 指令與 README 的 Cloud Run 段落；全部搞定後再重新部署。
- 刪除與 `public/assets/units/` 完全相同的 `art-source/sprites/`，保留 `art-source/terrain_grid.jpg`（地形處理工具的來源圖）。
- 2026-10-19：網格線維持現狀（參數在 `TERRAIN_SKIN.edge`，隨時可調）；遠端只留 `main`（`20260328`、`experiment/unit-rig-skin-poc` 各留本地 tag `archive/*`，`feat/procedural-material-upgrade` 已合併）；縮圈墜落改做程式化動畫（不加新美術）；部署以後再說。
- 2026-10-19：現階段先打通功能通道，素材（曲子、模型）等正式版再換。每張地圖的戰鬥曲用占位曲（`data/audio/music.ts` `SCENE_BATTLE_TRACK`）。Quaternius Ultimate Modular Women 風格與現有 KayKit 差太多，不採用。
- 2026-10-26：天降類奧義詠唱結束就算施放成功（ULT-V01 實戰探針後使用者選 B）。落下途中被暈、被打斷或施法者陣亡都照樣在詠唱結束時的落點與目標結算；只有詠唱期間的打斷會取消。理由：改版前傷害被取消、畫面上的落下物卻照樣落地，兩者對不上；「已出手就會落下」和投射物的規則一致。
- 2026-10-26：粒子預算放寬為軟 630／硬 1000（原 240／380），大範圍危害場的生成爆發每幀每場最多 12 格。依據是 `perf-particle-budget.mjs` 的真實 8 招量測（數字在 `constants/vfx.ts` 註解與 ULT-V01 報告 §4）。
- 2026-10-26：遠程光束（雷射）只留給奧義。普攻與主動技原本用雷射的 12 招改成真投射物（命中延遲 0.1～0.3 秒，屬玩法改動，隨平衡一起重跑）；tr_a5 靈魂吞噬射程 1，改成近身命中爆發。長槍突刺（wb_b2、tr_b5）與衝刺殘影（wb_a2、mb_a3、wr_a3）不算雷射，保留。`tests/BeamUltOnly.test.ts` 把守。
- 2026-10-26：COORD-SINK-01（受擊位移後下坡插值下陷 1.89 px）不修：使用者實機幾乎看不到。有新證據（下陷更大或玩家看得見）才重開。
- 2026-10-26：額度分配。Claude（Pro）每週額度要省，主代理只做設計、提示詞、審查、驗收與合併；實作優先派 Codex（工作樹）或 Gemini（IDE）。渲染修正一次一條（CLAUDE.md 鐵律），平衡等非渲染工作可並行。
- 2026-10-29（OPT-01）：專案衛生改由自動化閘門把關、凍結人工審計清冊，詳見 [0006](adr/0006-automated-hygiene-gates.md)。
- 2026-10-29：「畫面沒變」一律以同環境 A/B 逐像素證明，不拿跨次保真數字比對，詳見 [0007](adr/0007-visual-verification-same-env-ab.md)。
- 2026-10-29：縮圈 `minRadius` 的意義定為「縮到幾層後改成外圈逐格塌」，任何設定都縮到 1 格並觸發背水一戰；最終階段塌陷不得切斷剩餘地圖。詠唱預警紅藍同一套畫法（進度波紋＋施法者陣營色），不假設玩家陣營。
- 2026-10-29：多段命中每段走完整單發流程（總威力不變）；CC 規則照 WoW——硬控一次施放只套一次、遞減依類別 100%→50%→25%→免疫且從控制結束起算、位移與緩速不吃遞減；DOT 等週期傷害是另一條管線，傷害帶直接／週期通道，給之後的防禦公式分流。理由：每段都套控制會讓多段技能自己把目標刷到免疫；WoW 是最多人驗證過的參考。
- 2026-10-30：狀態視覺規則——配色依控制種類的 MMO／FFT 慣例，不借陣營色帶；場景內頭頂標記與腳下圈各只畫優先序最高的一個（不輪播），全部狀態列在血條上方的圖示列（參考 WoW 名牌、FFXIV）；換身體的狀態（羊、冰塊）用和單位同一套相機的烘焙模型。多段傷害數字同一目標先往上疊、再左右錯開。
- 2026-11-06：狀態美術改為表現在單位模型本身（參考 LoL：重要性決定醒目程度、沿用熟悉慣例），單位身上不貼靜態圖示牌，硬控可有一個小動畫（暈眩星環）。圖示只留在血條上方圖示列與 Inspector。這次只換使用者點名的 5 種，其餘維持 10-30 的做法；使用者的核可方式是「只有點名的才換新」。
- 2026-10-27：R3 屍體滑行時與特效的排序翻轉**不修**。重量後 CORPSE×VFX 振盪 24 次（COORD-R1 後是 43），逐事件分類：19 次是屍體跨格時排序鍵跳到新格格心、移動中的粒子剛好穿過，4 次是同格內鍵從格心轉回腳點，1 次是排序格來回切換；屍體腳點、死區與 VFX 鍵都沒有折返。主因是 `max(腳點, 腳下格心)` 這個設計（為了讓單位永遠蓋在自己腳下地塊之上），消掉它就會讓地塊遮擋回歸；翻轉只出現在 8 幀內的移動屍體旁，肉眼難察覺。有玩家看得見的證據才重開。
- 2026-11-20：G1 技能設計維持原樣（使用者確認）：`mb_u3` 不加傷害（守住奧義視覺規則 C7）、`wb_a5`／`rb_a3` 維持單段（主動技沒有多段視覺）。`rr_u1` 灰燼穿心接受勝率貢獻約 −9%，不改機制：它的 `PIERCE 1` 讓護盾完全吸收不到，目標低於 25% 血量時直接斬殺（`applyLethal`，不看傷害多寡）；偏弱的主因是它選血最多的目標（`HIGHEST_HP`），斬殺門檻很少觸發。

- 2026-11-23：嘲諷頭頂的倒三角不指向嘲諷者，只標狀態（使用者：像 WoW 一樣，被嘲諷的單位走過去打嘲諷者就是效果）；加速的速度線維持順著移動方向（R4）。
- 2026-11-23：G1 單技能勝率差只處理兩個種子都超標的（`tr_b4`、`sr_a4`），其餘當抽樣雜訊結案（使用者）。
- 2026-11-23：手動模式重做成獨立的 PLAY 模式：一隻主角、其他隊友 AI；桌機優先；即時、選目標時自動放慢；技能按鈕＋點目標（使用者）。作法在 `docs/plans/play-mode.md`，機動技點地面或單位、主角陣亡後觀戰到結束、沒有指令時自動反擊（同日追加）。模式、瞄準狀態與放慢的擁有者詳見 [0025](adr/0025-play-mode-and-aim-slowdown.md)。

## AI 與大逃殺（2026-11-02）
- AI 行為採狀態拓樸（`AI_MODE_GRAPH`）加每狀態一棵小樹，詳見 [0008](adr/0008-ai-mode-topology-small-trees.md)。
- 站在敵方危害區上依風險決定去留（會死、血少、出口在旁才走；2026-11-20，使用者提議看血量），詳見 [0023](adr/0023-hazard-stay-or-leave-by-risk.md)。
- 接近敵人時扛得住的敵方危害格可以走（尋路小成本、不讓路徑作廢；機動技落點照舊避開；2026-11-20），詳見 [0024](adr/0024-hazard-tolerable-cells-for-approach.md)。
- 近戰在跳躍力內可打高低差，推翻 R6 規則 A。理由：規則 A 讓貼著的兩人都打不到，是全坦克發呆的主因。依提案先做，等使用者實機確認。
- 貼地鋪設不用路徑裁切（2026-11-03）：合成圖配預烘三色六角遮罩、走畫布變換，詳見 [0011](adr/0011-ground-drape-baked-hex-mask.md)。
- 背水一戰於最後一圈開始倒數時觸發（警告格數＝地塊數−1）、不提早收地圖、不加新 AI 模式，詳見 [0010](adr/0010-last-stand-final-ring-countdown.md)（取代 [0009](adr/0009-last-stand-early-trigger.md)）。
- 技能是動作清單加狀態機、`Agent` 不拆元件（2026-11-04），詳見 [0012](adr/0012-skill-action-pipeline-flat-agent.md)。
- 機動技落點（使用者 2026-11-05）：機動技射程固定是資料值，高低差不增減；突進、後撤由 `LandingPlanner` 在範圍內選落點，不落警告格與敵方危害區，沒有落點就不放；機動擊退推到場邊就停，只有奧義能擊出場外；拉扯一律不會拉出場。奧義射程照舊吃高度，只加落點安全。理由：地圖只有 8～9 × 10～11 格，站高地突進 7 格等於橫跨全場；機動槽人人都有，不該是主要的墜落死來源（WORKLOG §2 BQ）。
- 機動技不帶硬控，定身時不能放會移動自己的技能（2026-11-04）。理由：機動槽人人都有，帶硬控等於全場多一倍控制；定身不擋位移的話定身就沒用了。
- 導播用一份排分清單，同分先進榜（使用者 2026-11-03）。鏡頭只框主角和它的目標，分特寫、中景、全景三種景別（使用者 2026-11-04）。理由：實測群組框進全場與攻擊者時鏡頭幾乎一直在框全場，沒有焦點。別處的奧義只靠換主角才拍得到，這是焦點的代價。
- 大逃殺（陣營數 ≥3）大招與主動跨職業與隊伍抽、普攻照職業、血量差距減半。混用實驗在 `docs/AI_ROYALE_DESIGN.md` §4。
- 現在的素材就是正式版（使用者 2026-11-03），待辦不再列「正式版素材」。早先寫「等正式版再換」的是當時的說法。
- 近戰隔層打人實機確認「還行」（使用者 2026-11-03）。
- iPhone 側邊靜音開關照系統行為關掉遊戲聲音，不用 `navigator.audioSession` 強制出聲（2026-11-09，主代理照預設定案，使用者要改再開）。理由：尊重使用者的靜音設定（WORKLOG §2 BO）。

## UI（2026-11-04，使用者逐題確認）
- UI 是純投影：元件只吃 selector 與資料表、只發 `UICommand`，條件不寫進元件，詳見 [0013](adr/0013-ui-pure-projection-and-boundaries.md)。
- UI 魔法數字歸零，由 `tests/UIAudit.test.ts` 擋住：尺寸、字級、圓角、顏色、模糊、動畫時間走 token（`data/ui/tokens.ts` 生成 `styles/tokens.css`）；className 不用任意值與調色盤 class；標籤表放 `data/ui`。
- 材質分級：HUD、選單、彈出層、聚焦視窗用真模糊，只有 `.mat-blur` 一個來源（Safari 18.2 起 `-webkit-backdrop-filter` 不吃變數，所以是字面值）。沒聚焦、最大化、手機底部面板用純色。內部元件用半透明底、細邊框、頂部高光，不加模糊。理由：手機效能，也避免巢狀模糊。
- 層級照 `UI_Z`：展示 < HUD < 視窗 < 選單 < 最大化視窗 < 全螢幕覆蓋 < 彈出層。只有最上層視窗能用最大化層，否則最大化的檢查器會蓋住從它開的行為樹。`WindowLayer` 用 `display: contents`，不自成 stacking context。
- 行為樹是獨立視窗，手動開、跟著選取走；取消選取時保留視窗顯示空狀態。
- UI 狀態歸屬與依賴邊界：版面／選取留 UI store、倍率單源在引擎，匯入邊界經 `hooks/useEnginePort`／`hooks/adapters`／`GameCanvas`，詳見 [0013](adr/0013-ui-pure-projection-and-boundaries.md)。
- 標題全用英文大寫等寬（JetBrains Mono），不用中文（使用者：中文不好看）；中文內文用系統字型，font stack 要列中文字型，否則 Windows 退回細明體。
- 操作列（播放列、工具列）純圖示、單列，不放可見文字（使用者 2026-11-05：文字佔位、面板不夠就拉伸，每次改版都回來）。說明放 `aria-label`／`title`，數值讀數可以留，放不下時縮滑桿。由 `ui-audit-static` 的 `CONTROL_BAR_FILES` 與 `windows.e2e` 的 `checkControlBars` 擋住，新增操作列要一起加進去。
- 開場標題直接浮在戰場上，和進入按鈕分開，不放玻璃板（使用者 2026-11-04）。設計由 GPT Astra 出方向與實作（校準座標：角標、刻度、TACTICAL 白＋.OS 強調色）。
- 遊戲指令於戰鬥中下一個 tick 開頭套用並記錄（2026-11-09，L1），詳見 [0015](adr/0015-game-commands-at-tick-start.md)。
- 固定步長 1/60 秒與倍率控制（2026-11-09，L3），詳見 [0016](adr/0016-fixed-timestep-and-timescale.md)。
- 回放以「開戰快照＋種子＋開戰後指令」為單位（2026-11-17，契約 S2），詳見 [0018](adr/0018-replay-snapshot-seed-commands.md)。
- undo 與 seek 用從開戰快照重跑、不做中途快照（2026-11-17，契約 S3），詳見 [0019](adr/0019-undo-by-rerun.md)。
- 固定步長之上僅於 `UnitFrameStore.build` 做畫面插值（2026-11-17，契約 R1），詳見 [0020](adr/0020-frame-interpolation-in-unit-frame-store.md)。
- 玩家操控＝換一張模式圖、即時可暫停下令、無指令時原地堅守（2026-11-17，契約 G3），詳見 [0022](adr/0022-player-control-mode-graph-and-orders.md)。
- 對局流程在引擎端、階段由引擎狀態推導且不監聽匯流排（2026-11-18，契約 R2），詳見 [0021](adr/0021-match-flow-in-engine.md)。
- 玩家指令三個落點（驗證／寫入／執行）與規則（2026-11-18，契約 G3），詳見 [0022](adr/0022-player-control-mode-graph-and-orders.md)。
- 玩家操控的單位是導播的主角（2026-11-19，使用者試玩回饋）：有玩家單位時導播不看排分，鏡頭以它為中心並留出四周視野；場上用金色光圈與箭頭標示，不靠選取。理由：玩家要一直知道自己控的是哪一隻，也要看得到周圍才能下指令。
- 點擊規則集中於 `engine/systems/ui/tapIntent.ts`、輸入層只負責送出（2026-11-18），詳見 [0022](adr/0022-player-control-mode-graph-and-orders.md)。
- 架構契約先行：型別、空殼與受保護紅色驗收（2026-11-17），詳見 [0017](adr/0017-contract-first-architecture.md)。
- UI 採用現成基礎元件庫（Radix、lucide、TanStack Virtual、cva），詳見 [0014](adr/0014-ui-off-the-shelf-primitives.md)。
