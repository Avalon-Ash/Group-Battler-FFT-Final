# 決策紀錄（已定案的方向與理由）

> 從 `docs/HANDOFF.md` 拆出（2026-10-19）。只記「選了什麼、為什麼、放棄了什麼」；要推翻某條先找使用者。
> 工作方法在 `docs/METHODOLOGY.md`，完成紀錄在 `docs/WORKLOG.md`，待辦在 `docs/HANDOFF.md`。

## 1. 題材與畫面
- 題材奇幻（FFT-like）、保持六角格、固定等距視角（相機正交仰角 30°＝`ISO_SCALE_Y 0.5`、四向原生渲染）。
- 陣營色：BLUE＝皇家藍、RED＝深紅＋暗護甲。已知弱點：兩陣營辨識度偏弱（待辦池）。
- HD 為主線，SD 像素原型已移除（tag `pixel-proto-ckpt`）。
- 禁 Three／Pixi／WebGL，全部 HTML5 Canvas 2D。

## 2. 素材策略與授權
- 單位：AI 逐張生圖已放棄，改 KayKit 預渲染（Blender 可攜版在 `_asset_staging`）。AI 圖只用於地形材質與日後圖示。
- 障礙物：選 CC0 3D 套件預渲染（KayKit Forest Nature／Dungeon Remastered／Medieval Hexagon、Kenney Nature Kit），不走改良程序化（`VISUAL_ROADMAP.md` D1）。
- 授權：CC0 優先、CC-BY 可（致謝）、拒絕 NC／ND／GPL／不明；維護 `docs/ASSET_LEDGER.md`、`CREDITS.md`。
- 使用者的風格參考圖（`_asset_staging\art\ref_*`）不得進 repo。

## 3. 視覺細節
- 特效一律預烘焙零件（`data/vfx/parts`、`engine/renderers/vfxparts`），模糊只在烘焙時用；渲染路徑 0 個每幀 `shadowBlur`。
- 零件外框語言是六角（ART_SPEC §0）；**詠唱法陣例外改圓形 `magicCircle`**（2026-10-19：實線六角高速旋轉造成毛刺，使用者回饋）。線條一律「模糊光暈＋細亮芯」，不畫實心粗線。
- 逐格鋪開的疊層（範圍、預警、區域）用柔光格 `SoftTile`，不逐格描實線（相鄰格雙邊會排成網格）。
- 地形變體 4→8 刻意不做：地塊快取翻倍，地表裝飾已提供變化。
- 障礙物動態：樹風擺用影格表；冰晶星芒、黑曜柱發光用疊層（影格表版多 3～5 ms p99）。
- 繪製點對齊裝置像素、主畫布 `imageSmoothingQuality` 為 low（`RENDER_QUALITY.IMAGE_SMOOTHING`，RenderSpec §3；歷史上曾設 high，因 drawImage 重複計算致幀時間倍增而降為 low；離線烘焙維持 high）。

## 4. 架構
- 座標協議以 `engine/renderers/RenderSpec.ts` 為準；渲染／座標工作一次只開一條（2026-10 平行拆工造成錯位回歸）。
- 狀態欄位唯一寫入者（`engine/core/AgentOwnership.ts` 所有權表）；嘲諷鎖定只在 `TargetingSystem`（P7a）。
- 大逃殺的「發呆看門狗」不採用：B0 證據 IDLE 為 0，屬掩蓋症狀且改到 facade。根因修法是行為樹 `Combat Actions` SELECTOR。
- 保真基準不得任意重錄、門檻不得放寬；重錄要附新舊差異圖並獨立 commit。
- 文件防過時（2026-10-20 使用者同意）：過時文件直接刪除、不歸檔（git 歷史已保存；歸檔會被代理 grep 到當成現況），刪前把程式註解引用的理由寫回註解或改指 commit。檔頭只留「職責＋[ARCH] 不變式」，不寫上下游清單與路徑（可由 import／grep 推得，最容易過時）。過時要變成測試失敗：`tests/DocDrift.test.ts` 檢查文件與註解裡的路徑、識別字、檔頭類別名都存在。能寫成棘輪測試的規則就寫成測試，文字只解釋理由。
- 合約分層（2026-10-20，參考 Harness² `google-research/harness2` 的元件成本排序）：常駐文字最貴，只放每次都適用的規則；有觸發情境的程序寫成 `.claude/skills/`（CLAUDE.md 列觸發句）；反覆被略過的鐵律寫進 hook，但 hook 不可卡住無人值守的長鏈：只有不可逆的破壞性 push 跳確認，一般 push／merge 由主代理在對話中先問，重錄基準改成事後提醒取證清單（使用者 10/20：「不要擋到我們自動長鏈」）；可檢查的合約規則寫成測試（`tests/HarnessContract.test.ts`）。不採用 Harness² 框架本身（需 Vertex＋OpenCode／Codex、同任務多次 rollout 的額度成本、評分方式不適用畫面正確性），也不平行跑多個 Gemini 候選版（違反渲染工作只開一條）。

- 奧義要有感（2026-10-21 使用者）：加共用演出（命中光爆；畫面名稱橫幅實作後使用者評「太難看、很廉價」，移除並恢復頭頂喊招；詠唱暗場＋聚光實作後使用者評：不是不好，而是奧義詠唱只有 0.1～2 秒，來不及聚焦，只看到畫面亮暗快速交替（VRR OLED 上像閃爍），移除；詠唱要 5～10 秒才值得做，實作在 `c7df349` 可取回），放寬 ART_SPEC §6「閃光不得高於現在」為有上限的局部光；不做鏡頭推近（縮放會觸發地形重烘焙，曾造成卡頓）、不做模擬時間的頓格（表現層不得寫模擬時間）。範圍由詠唱逐格預警表示，命中時不加範圍格閃光（使用者：瞬發的看到也沒用、干擾視覺）。

## 5. 專案範圍（2026-10-16 使用者決定）
- 刪除 Dockerfile／`server.js`／`.dockerignore`／`start` 指令與 README 的 Cloud Run 段落；全部搞定後再重新部署。
- 刪除與 `public/assets/units/` 完全相同的 `art-source/sprites/`，保留 `art-source/terrain_grid.jpg`（地形處理工具的來源圖）。
- 2026-10-19：網格線維持現狀（參數在 `TERRAIN_SKIN.edge`，隨時可調）；遠端只留 `main`（`20260328`、`experiment/unit-rig-skin-poc` 各留本地 tag `archive/*`，`feat/procedural-material-upgrade` 已合併）；縮圈墜落改做程式化動畫（不加新美術）；部署以後再說。
- 2026-10-19：現階段先打通功能通道，素材（曲子、模型）等正式版再換。每張地圖的戰鬥曲用占位曲（`data/audio/music.ts` `SCENE_BATTLE_TRACK`），候選留在 `docs/BGM_CANDIDATES.md`。Quaternius Ultimate Modular Women 風格與現有 KayKit 差太多，不採用。
- 2026-10-26：天降類奧義詠唱結束就算施放成功（ULT-V01 實戰探針後使用者選 B）。落下途中被暈、被打斷或施法者陣亡都照樣在詠唱結束時的落點與目標結算；只有詠唱期間的打斷會取消。理由：改版前傷害被取消、畫面上的落下物卻照樣落地，兩者對不上；「已出手就會落下」和投射物的規則一致。
- 2026-10-26：粒子預算放寬為軟 630／硬 1000（原 240／380），大範圍危害場的生成爆發每幀每場最多 12 格。依據是 `perf-particle-budget.mjs` 的真實 8 招量測（數字在 `constants/vfx.ts` 註解與 ULT-V01 報告 §4）。
- 2026-10-26：遠程光束（雷射）只留給奧義。普攻與主動技原本用雷射的 12 招改成真投射物（命中延遲 0.1～0.3 秒，屬玩法改動，隨平衡一起重跑）；tr_a5 靈魂吞噬射程 1，改成近身命中爆發。長槍突刺（wb_b2、tr_b5）與衝刺殘影（wb_a2、mb_a3、wr_a3）不算雷射，保留。`tests/BeamUltOnly.test.ts` 把守。
- 2026-10-26：COORD-SINK-01（受擊位移後下坡插值下陷 1.89 px）不修：使用者實機幾乎看不到。有新證據（下陷更大或玩家看得見）才重開。
- 2026-10-26：額度分配。Claude（Pro）每週額度要省，主代理只做設計、提示詞、審查、驗收與合併；實作優先派 Codex（工作樹）或 Gemini（IDE）。渲染修正一次一條（CLAUDE.md 鐵律），平衡等非渲染工作可並行。
- 2026-10-29（OPT-01）：專案衛生改由自動化閘門把關，取代逐檔人工審計清冊（清冊凍結）：knip、`MagicNumberBudget`／`color-literal-budget`（只減不增）、`NoLocalHash`（雜湊只在 `engine/math/`）、`ToolsReferenced`（`tools/` 腳本要有入口，一次性探針寫在 `tools/ui-e2e/out/`）、`WhitepaperDrift`、`DocDrift`。
- 2026-10-29：「畫面沒變」一律用同環境 A/B（同一次執行切換新舊程式碼、逐像素比）證明；保真的 meanAbsDiff 跨次執行會漂移，不拿兩次執行的數字比。
- 2026-10-29：縮圈 `minRadius` 的意義定為「縮到幾層後改成外圈逐格塌」，任何設定都縮到 1 格並觸發背水一戰；最終階段塌陷不得切斷剩餘地圖。詠唱預警紅藍同一套畫法（進度波紋＋施法者陣營色），不假設玩家陣營。
- 2026-10-29：多段命中每段走完整單發流程（總威力不變）；CC 規則照 WoW——硬控一次施放只套一次、遞減依類別 100%→50%→25%→免疫且從控制結束起算、位移與緩速不吃遞減；DOT 等週期傷害是另一條管線，傷害帶直接／週期通道，給之後的防禦公式分流。理由：每段都套控制會讓多段技能自己把目標刷到免疫；WoW 是最多人驗證過的參考。
- 2026-10-30：狀態視覺規則——配色依控制種類的 MMO／FFT 慣例，不借陣營色帶；場景內頭頂標記與腳下圈各只畫優先序最高的一個（不輪播），全部狀態列在血條上方的圖示列（參考 WoW 名牌、FFXIV）；換身體的狀態（羊、冰塊）用和單位同一套相機的烘焙模型。多段傷害數字同一目標先往上疊、再左右錯開。
- 2026-10-27：R3 屍體滑行時與特效的排序翻轉**不修**。重量後 CORPSE×VFX 振盪 24 次（COORD-R1 後是 43），逐事件分類：19 次是屍體跨格時排序鍵跳到新格格心、移動中的粒子剛好穿過，4 次是同格內鍵從格心轉回腳點，1 次是排序格來回切換；屍體腳點、死區與 VFX 鍵都沒有折返。主因是 `max(腳點, 腳下格心)` 這個設計（為了讓單位永遠蓋在自己腳下地塊之上），消掉它就會讓地塊遮擋回歸；翻轉只出現在 8 幀內的移動屍體旁，肉眼難察覺。有玩家看得見的證據才重開。
