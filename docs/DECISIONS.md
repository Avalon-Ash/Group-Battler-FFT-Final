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
- 繪製點對齊裝置像素、主畫布 `imageSmoothingQuality` high（RenderSpec §3）。

## 4. 架構
- 座標協議以 `engine/renderers/RenderSpec.ts` 為準；渲染／座標工作一次只開一條（2026-10 平行拆工造成錯位回歸）。
- 狀態欄位唯一寫入者（`engine/core/AgentOwnership.ts` 所有權表）；嘲諷鎖定只在 `TargetingSystem`（P7a）。
- 大逃殺的「發呆看門狗」不採用：B0 證據 IDLE 為 0，屬掩蓋症狀且改到 facade。根因修法是行為樹 `Combat Actions` SELECTOR。
- 保真基準不得任意重錄、門檻不得放寬；重錄要附新舊差異圖並獨立 commit。
- 文件防過時（2026-10-20 使用者同意）：過時文件直接刪除、不歸檔（git 歷史已保存；歸檔會被代理 grep 到當成現況），刪前把程式註解引用的理由寫回註解或改指 commit。檔頭只留「職責＋[ARCH] 不變式」，不寫上下游清單與路徑（可由 import／grep 推得，最容易過時）。過時要變成測試失敗：`tests/DocDrift.test.ts` 檢查文件與註解裡的路徑、識別字、檔頭類別名都存在。能寫成棘輪測試的規則就寫成測試，文字只解釋理由。
- 合約分層（2026-10-20，參考 Harness² `google-research/harness2` 的元件成本排序）：常駐文字最貴，只放每次都適用的規則；有觸發情境的程序寫成 `.claude/skills/`（CLAUDE.md 列觸發句）；反覆被略過的鐵律寫進 hook，但 hook 不可卡住無人值守的長鏈：只有不可逆的破壞性 push 跳確認，一般 push／merge 由主代理在對話中先問，重錄基準改成事後提醒取證清單（使用者 10/20：「不要擋到我們自動長鏈」）；可檢查的合約規則寫成測試（`tests/HarnessContract.test.ts`）。不採用 Harness² 框架本身（需 Vertex＋OpenCode／Codex、同任務多次 rollout 的額度成本、評分方式不適用畫面正確性），也不平行跑多個 Gemini 候選版（違反渲染工作只開一條）。

- 奧義要有感（2026-10-21 使用者）：加共用演出（暗場聚光、名稱橫幅、命中光爆），放寬 ART_SPEC §6「閃光不得高於現在」為有上限的局部光；不做鏡頭推近（縮放會觸發地形重烘焙，曾造成卡頓）、不做模擬時間的頓格（表現層不得寫模擬時間）。範圍由詠唱逐格預警表示，命中時不加範圍格閃光（使用者：瞬發的看到也沒用、干擾視覺）。

## 5. 專案範圍（2026-10-16 使用者決定）
- 刪除 Dockerfile／`server.js`／`.dockerignore`／`start` 指令與 README 的 Cloud Run 段落；全部搞定後再重新部署。
- 刪除與 `public/assets/units/` 完全相同的 `art-source/sprites/`，保留 `art-source/terrain_grid.jpg`（地形處理工具的來源圖）。
- 2026-10-19：網格線維持現狀（參數在 `TERRAIN_SKIN.edge`，隨時可調）；遠端只留 `main`（`20260328`、`experiment/unit-rig-skin-poc` 各留本地 tag `archive/*`，`feat/procedural-material-upgrade` 已合併）；縮圈墜落改做程式化動畫（不加新美術）；部署以後再說。
- 2026-10-19：現階段先打通功能通道，素材（曲子、模型）等正式版再換。每張地圖的戰鬥曲用占位曲（`data/audio/music.ts` `SCENE_BATTLE_TRACK`），候選留在 `docs/BGM_CANDIDATES.md`。Quaternius Ultimate Modular Women 風格與現有 KayKit 差太多，不採用。
