# 交接：還沒做的事（TBD）

> 更新：2026-10-26。**本檔只放還沒做、還沒確認、還沒決定的事**；做完就刪掉，紀錄寫進 `docs/WORKLOG.md`。
> 其他文件：`docs/METHODOLOGY.md`（怎麼工作，與本檔一起自動載入）、`docs/DECISIONS.md`（已定的決策與理由）、`docs/WORKLOG.md`（完成紀錄，平常不讀）、`AGENTS.md`（審查清單）、`docs/VISUAL_ROADMAP.md`、`docs/VFX_PIPELINE_MAP.md`。

## 1. 目前狀態

- `main` 與 origin 同步到 7dd59d0 之後的文件提交；奧義重製、雷射改投射物、手機記憶體兩輪都已合併（WORKLOG §2 T、DECISIONS §5）。
- **額度**：Claude（Pro）每週額度要省；GPT 額度寬鬆。主代理只做設計、寫提示詞、審查、驗收與合併，實作優先派 Codex（工作樹）或 Gemini（IDE `/goal`）。
- **三條並行線**（第 2 節）：A 平衡（Gemini，非渲染）、B 渲染修正佇列（Codex，同一時間只開一條）、C 獅心 skin（GPT 自己跑完，主代理最後一次看）。
- Codex 的 skin 工作樹：`C:\Users\xino_\.codex\worktrees\lionheart-warrior-skins\`（分支 `codex/lionheart-warrior-skins`），主代理不寫入。
- 清冊 `docs/PROJECT_CLEANUP_AUDIT01_INVENTORY.csv` 共 659 列：520 列未讀、31 列只核對部分事實、108 列不適用。逐檔語義審計沒有完成，只能逐檔累積證據，不可整批標成完成。
- 座標 findings：COORD-SINK-01（受擊下坡下陷 1.89 px）使用者 2026-10-26 實機幾乎看不到，**不修**，有新證據（更大的下陷、玩家看得見）才重開；COORD-VOID-01 屬量測工具問題，同樣擱置。已否決的修法：永久鎖定屍體排序格、`vz<-50` 過濾、高度 clamp。

## 2. 下一步（三條線）

**A. 平衡**：BAL-02 已合併（WORKLOG §2 W）。報告 `docs/BAL02_REPORT.md` §5.2 留了兩個要改機制的缺口，暫不排：STORM 類 10 招分段結算（要補總傷害）、`rb_u5` 投射物與 STORM 落點演出統一。之後平衡再跑時一起決定。

**B. 渲染修正佇列（Codex Sol／medium，獨立工作樹，依序一次一條；主代理審 diff＋`render-verify`）**
1. **R3 屍體滑行排序翻轉**：COORD-R1 後振盪事件 83→93，主要是屍體滑行時的 CORPSE×VFX（`docs/PROJECT_CLEANUP_COORD_R1_REVIEW.md`）。要對照 RenderSpec，修完同 commit 更新 RenderSpec 與檔頭，`verify:coords --flicker` 量化，做完刪除該審查文件。
2. **R4 網格效果優先序**：優先序表使用者 2026-10-27 核准，提示詞 `docs/R4_GRID_PRIORITY_AGENT_PROMPT.md` 已寫好（含詠唱預警與 AOE 指示去重、預警紅藍分色）。skin 已合併，**可以派 Codex**（派工時填 base SHA）；R3 排在 R4 之後。
3. **R5 手機模擬量測工具**：使用者手機上很難用 `?perf`。在 `tools/ui-e2e/` 做一支手機模擬量測腳本：iPhone 14 Pro 版面＋CDP CPU 降速（4 倍）跑展示模式與 8 招奧義，輸出 FPS、品質階層、粒子數與記憶體。只能模擬 CPU，GPU 與 WebKit 行為仍以實機為準。可和 R1～R4 並行（不改渲染程式）。

**C. skin 後續（暫不排）**：manifest 從 73 KB 變 508 KB（格式化 JSON），可壓縮；20 張圖集共約 15.8 MB（比全尺寸試作版大，使用者要求不再加有損壓縮，維持）。

**有空時**：繼續讀清冊未讀的檔案。

## 3. 待使用者實機確認
1. **iPhone 14 Pro 展示模式長跑（含新 skin）**：2026-10-27 合併 20 套 skin＋男女各半＋按陣容載入。模擬 iPhone soak 穩態與改前相同（2046 vs 2047 MB），要實機確認不再自動重新載入、換隊時不頓。
2. **新 skin 實機看**：男女混合戰鬥的外觀、法師帽與法杖是否穿出護盾頂、頭頂標記與血條位置（法師高約 5 px、戰士／坦克低約 5 px）。
3. **BAL-02 後的展示戰鬥**：看幾場，確認兩邊沒有一面倒；天降奧義（`mr_u1` 降傷降暈、`rb_u1`／`tb_u3` 加傷）與 `tr_b2` 肉鉤頻率的手感。
4. **衝刺殘影實機看**（R2 已合併）：`wb_a2`、`wr_a3`、`mb_a3` 衝刺後殘影留在路徑上約 0.3 秒淡出，看是否夠明顯、會不會太雜。
5. **R3～R4 做完後的實機看**：網格優先序、屍體排序、特效壓力情境的頓挫。

## 4. 以後再說（暫緩項目）
- **地形烘焙（`docs/BAKED_RENDERING_DESIGN.md`）**：已做的是地塊、零件、液面、障礙物、光暈文字的快取。剩下兩階段都暫緩：
  - Phase 2「高度分帶雙層烘焙」：把高度 ≤ 0 的地面層烘成一張整圖，單位與高地塊照舊交錯排序。觸發條件：B5 模擬或實機顯示手機 FPS 仍偏低，且歸因在地塊繪製。步驟：① 量地塊佔每幀繪製的比例（`perf:attribution`）② 原型只做 VOID／FOREST 兩張圖 ③ 保真 6 張 0 差異或取證 ④ 轉場與漂浮位移（VOID／MAGMA）另驗。
  - Phase 3「圖集整合／粒子合批」：收益不確定，等 Phase 2 有結論再評估。
- **重新部署方式**：Cloud Run 相關檔案已刪，全部搞定後再重新評估。
- **正式版素材**：交給 GPT 慢慢換；外觀軸 `Team×Role×BodyType` 支援直接擴充。成品走「改材質＋配件後重新烘焙」，不逐格重畫 2D。
- **奧義視覺細修**：使用者 2026-10-26「先這樣，主要是把流程和視覺管線建出來」。之後要優化再從 `docs/ULT_VISUAL_CLAUDE_REPORT.md` §6 與矩陣開始。
