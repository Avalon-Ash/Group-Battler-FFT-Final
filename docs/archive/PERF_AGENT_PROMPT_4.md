# 外出執行指令 #10：效能第四輪——特效管線檢視與瞬時負載優化（貼給 IDE 代理）

> 用法：`/goal docs/PERF_AGENT_PROMPT_4.md`
> **前置條件**：音訊輪（`feat/audio`）已由主代理合併進 `main`。本輪在**新分支 `perf/render-opt-4`**（由 `main` 開出）上進行；**不得在 `main` 上工作、不得 push、不得合併**。開工時分支不存在 → 停下回報。同一時間只能有一個代理在此工作樹執行。
>
> **使用者的實際回報（最重要）**：主螢幕（2560×1440 @ 239 Hz、RTX 4070、縮放 100%）實際遊玩時 FPS 約 100 多；**「狂掉 FPS」（掉到 60 多）幾乎都發生在「全場各種特效同時跑出來」的時候**（網格特效、AOE 預警、AOE 詠唱、詠唱領域、詠唱破棄、角色死亡、網格持續效果……）。這個特效系統是早期由 AI 輔助堆出來的，內容雜、可能有重複繪製／無用繪製／每幀分配。後來做過解耦與登記（`data/vfx/VFXRegistry.ts`、`engine/systems/vfx/`、`engine/systems/visuals/effects/`），理論上都有登記，但**沒人量過每種特效的實際成本**。
> **另外**：使用者貼的截圖顯示 `?perf` HUD「FPS 390」，與體感 1xx 矛盾（239 Hz 螢幕不可能 >239）→ HUD 的 FPS 算法不可信（P0b 修正）。第三輪量測都在 1440×900、**無特效齊發情境**，只看平均／中位數，所以完全沒抓到這個問題。
>
> **目標（2560×1440、DPR 1、手動戰鬥、「全特效齊發」壓力情境）**：p99 幀時間 ≤8.4 ms（不低於 120 FPS）；除首次載入與轉場外 **0 個 >16.7 ms 的幀**；一般戰鬥中位數 ≤6 ms。WebGL 仍禁用（`AGENTS.md` §1.4）。
> **整串一次跑完（無待核定事項）。** **不做**：push／動 `main`／合併、新增依賴、重錄既有 5 個地形 baseline、改變使用者可見的預設外觀（例外見 P4 的「可接受外觀差異」）、改變遊戲邏輯／事件語意（只改繪製與資源管理）。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。流程、守則、陷阱、停下條件**沿用 `docs/PERF_AGENT_PROMPT_3.md` 的「指令本文」「量測可信度鐵律」「本輪額外規則」**（主 GPU 檢查、取消限制＋vsync 雙版、DOM click 生成戰場並斷言 `agents ≥ 2`、同變體 ≥3 輪交錯、避免戰鬥結束／轉場污染、≤3 檔、lint/test/build、一任務一 commit、不 push、同題失敗 3 次就停、不 `as any`、常數進 `constants.ts`、渲染迴圈無 `console.log`）。差異：① 進度寫在新檔 `docs/PERF_BASELINE_4.md`；② 結束後在 `docs/DECOUPLING_HANDOFF.md` 新增 §13；③ `e2e:ui` 只在 **[E2E]** 任務與 FINAL 跑（各連跑兩次）；④ **量測視窗必須是 2560×1440、DPR 1、headed、主螢幕（NVIDIA）**（視窗 <2400×1300 或 AMD → 腳本非 0 結束）；⑤ 量測網址帶 `?quality=0&mute`；⑥ 量測期間不跑其他重負載。

**先閱讀**：`AGENTS.md`、`docs/PERF_REPORT_3.md`、`docs/PERF_BASELINE_3.md`、`docs/BAKED_RENDERING_DESIGN.md`、`constants.ts`（`VFX_PARAM`、`RENDER_QUALITY`、`RENDER_CACHE`）、`types/VFXSchema.ts`、`data/vfx/*`（尤其 `VFXRegistry.ts`、`vfx_library.ts`、`active_visuals.ts`、`cast_visuals.ts`、`hazard_visuals.ts`、`status_visuals.ts`、`ult_visuals.ts`、`beam_visuals.ts`、`procedural_visuals.ts`、`SkillSequences.ts`、`materialConfig.ts`）、`engine/systems/vfx/**`、`engine/systems/visuals/effects/**`、`engine/renderers/**`（`RenderPipeline.ts`、`RenderDispatcher.ts`、`RenderList.ts`、`ProjectileDrawer.ts`、`GlowSpriteCache.ts`、`CtxOpCounter.ts`、`RenderStats.ts`、`RenderQuality.ts`）、`engine/events/**`（`GameEventPool`）、`engine/graphics/**`（`NoiseLib`、`MaterialPainter`、各 painter）、`useGameLoop.ts`、`components/**`（HUD、`GameCanvas.tsx`；注意每 tick 重新渲染的元件）、`tools/ui-e2e/lib/perf-common.mjs`、`tools/ui-e2e/perf-*.mjs`。

**開工檢查**：分支必須是 `perf/render-opt-4`；`git status` 乾淨；`npm run lint`、`npm test`、`npm run build`、`npm run perf:guard` 全綠。若 `docs/PERF_BASELINE_4.md` 已存在，從第一個未完成任務接續。

### 任務（依序）

`P0a` → `P0b` → `P1` → `P2` → `P3a` → `P3b` → `P4` **[E2E]** → `P5` → `REPORT` → `FINAL`

| 任務 | 內容 | 檔案（≤3；測試/docs/tools 不計） | 驗證 |
| :-- | :-- | :-- | :-- |
| **P0a** | **幀時間分佈量測工具**（`tools/ui-e2e/perf-frames.mjs`，沿用 `lib/perf-common.mjs`）：2560×1440 headed。場景：① `battle_calm`（5v5 持續交戰，HP 調高）② **`battle_vfx_storm`（特效壓力情境，見 P1 的產生器）**③ `showcase`（純交戰區間）。每場 20 秒 × 3 輪交錯。每幀記 rAF 時間戳，並用 `PerformanceObserver`（`long-animation-frame`、`longtask`）與 CDP Tracing（`v8.gc`、`devtools.timeline`：`MinorGC`／`MajorGC`／`Layout`／`UpdateLayoutTree`／`Paint`／`CompositeLayers`、`gpu`、`viz`）。輸出：median／p90／p95／p99／max、**1% low FPS**、`>8.4 ms`／`>16.7 ms` 的幀數、**每個長幀的歸因**（GC／Layout／React commit／我方繪製階段）、GC 次數與耗時；寫 `tools/ui-e2e/out/perf_frames.json` 與 markdown 表；`package.json` 新增 `perf:frames`。 | tools、`package.json` | 本機跑一次；GPU 為 NVIDIA；視窗 ≥2400×1300；`agents ≥ 2` |
| **P0b** | **修正 `?perf` HUD 的 FPS**：寫下目前算法；與 P0a 的 rAF 間隔逐項比對。若不一致（如 390 vs 1xx）→ 修正為「**實際 rAF 間隔的滑動平均**」，另顯示 **1% low** 與近 1 秒最長幀，並新增「frame total」「JS 合計」兩欄（`?perf` 以外不顯示）。改動僅限 `RenderStats`／診斷 HUD。**建立真實基準**（`battle_calm`、`battle_vfx_storm`）寫入 `PERF_BASELINE_4.md`（含 GPU 字串、DPR、視窗、更新率）。 | `RenderStats.ts`、診斷 HUD、（必要時 `constants.ts`） | HUD 與腳本量測誤差 <5%；基準入檔 |
| **P1** | **特效盤點＋壓力情境產生器**。① **盤點**：以程式為準，列出**所有特效類別與實例**（網格特效、AOE 預警／詠唱／爆發、詠唱領域、詠唱中斷（破棄）、角色死亡、網格持續效果／危害區、狀態光環、投射物、光束、技能序列、傷害數字／浮字、地面衝擊、鏡頭震動、區域縮圈、崩塌……），欄位：key、定義檔、觸發事件、繪製函式、**是否已登記於 `VFXRegistry`**、生命週期、同時數量上限（有／無）、繪製手法（漸層？`shadowBlur`？`globalCompositeOperation`？`createPattern`？每幀新物件？離屏 canvas？）。寫成 `docs/VFX_INVENTORY.md`。**同時標出可疑項**：未登記但在畫的、同一事件被多處重複繪製、已不再觸發的死碼、只靠 `Math.random()` 每幀重算的視覺。② **壓力情境**：在**量測工具內**（不改產品預設）以 `engine.bus` 發事件或呼叫既有技能觸發路徑，產生「全場齊發」：10 單位同時施放不同技能（覆蓋各類 AOE 預警／詠唱／爆發／持續區域）、同時多個死亡、多個狀態光環、多個投射物與光束、數十個傷害數字；持續 20 秒不斷再觸發（每秒補發）。該情境必須能重現「掉到 60」的程度（若沒掉，把強度加到 `engine` 允許的上限，並在報告註明）。 | tools、docs | 盤點表涵蓋 `data/vfx` 與 `engine/systems/vfx|visuals/effects` 的全部項目；壓力情境 p99 明顯劣於 `battle_calm` |
| **P2** | **逐項成本歸因**：在 `battle_vfx_storm` 下，對 P1 盤點的**每一類特效**做「單獨開／關」A/B（診斷參數或腳本注入，不改預設）：量該類特效的 median／p99 貢獻、**每幀分配量**（CDP `HeapProfiler.startSampling` 取前 10 名分配位置，重點：`tick()`、事件處理、粒子、浮字、`GameEventPool` 外的新物件／陣列／閉包／字串拼接）、**Canvas 操作計數**（`CtxOpCounter`：`shadowBlur`、`createRadialGradient`／`createLinearGradient`、`createPattern`、`globalCompositeOperation` 切換、`clip`、`save/restore`、`drawImage` 次數）、重疊疊加（同種特效數量增加時成本是否超線性）。輸出**成本排行榜**（前 10 名：特效、median ms、p99 ms、每幀分配、主要手法、可否預烘焙／池化／節流／LOD）。另外用 CDP 找出壓力情境中「長幀」的前 5 名成因（GC？某類特效？快取失效重烘？React？Layout？）。 | tools、docs | 排行榜入檔；每項有 A/B 數字（中位數＋min/max＋p99） |
| **P3a** | **依 P2 排行榜決定修正清單**（寫進 `PERF_BASELINE_4.md`「P3 決策」）：**最多 4 項**，依證據排序，每項預期 p99 或 median 改善 ≥8%。**預設外觀逐像素等價者**以 `perf:fidelity`（有單位的 `battle_frozen`，嚴格）0 差異驗證；每項附改前後（2560×1440、`battle_vfx_storm` 與 `battle_calm`，p50／p99／1% low，≥3 輪交錯；改善 <5% 就還原）。**優先手法**（以數據為準）：預烘焙成 sprite／離屏快取（`GlowSpriteCache` 擴展到光環／預警圈／領域邊緣）、物件池與預配置陣列（消除每幀分配）、**漸層／pattern 只建一次並重用**、去掉每幀 `shadowBlur`、合併同類特效為單次繪製、移除死碼與重複繪製、`Math.random` 視覺改為種子化預計算。 | 每項 ≤3 檔 | lint/test/build/`perf:guard`；數據佐證 |
| **P3b** | 執行 P3a 決策清單的**剩餘項目**。同樣的證據門檻。每完成一項更新 `PERF_BASELINE_4.md` 並 commit。 | 每項 ≤3 檔 | 同上 |
| **P4** **[E2E]** | **特效預算與自動降級（LOD）**：為「同時存在的特效」建立**預算層**（資料驅動，常數在 `constants.ts` 的 `VFX_BUDGET`）：各類別同時數量上限、**超過預算時的降級規則**（優先保留：與玩家選取單位相關、傷害／死亡等關鍵回饋；次要的：背景光環、重疊的同類粒子、遠處／被遮擋者 → 降低粒子數、跳過發光層、縮短壽命、合併），並與 `RenderQuality` 治理器整合（掉幀時預算自動收緊）。**可接受外觀差異**：降級只在「超過預算」時發生，**一般戰鬥外觀不變**；壓力情境下的差異用截圖前後對照（附 meanAbsDiff／badPixelPct）。使用者已表示「肉眼看不出差異就效能優先」。預設開啟，旗標可關（`VFX_BUDGET.enabled`）；**關閉時行為逐像素與改前相同**。`e2e:ui` 連跑兩次 ALL PASSED，並做 `?quality=1/2/3`、`?mute` 冒煙。 | `constants.ts`、`engine/systems/vfx/**` 或 `engine/systems/visuals/effects/**`（授權 ≤4 檔，commit 說明）、tools | lint/test/build/e2e×2；壓力情境 p99 達標 |
| **P5** | **治理器對照真實體感**：2560×1440 headed、`battle_vfx_storm` 停留 60 秒，記錄品質階層時間序列、rAF 間隔、長幀；確認治理器在**真的掉幀時會降階**、**不抖動**、降階後 p99 確實改善（反而更慢 → 修）。門檻對照 239 Hz（≥144 FPS 為健康、<100 FPS 持續 2 秒才降階）。 | `RenderQuality.ts`、`constants.ts` | lint/test/build；時間序列入檔 |
| **REPORT** | `docs/PERF_REPORT_4.md`：①使用者回報與本輪發現（HUD 的 FPS 為何矛盾；特效盤點結論〔未登記／重複／死碼數量〕）②真實基準（2560×1440；median／p99／1% low／長幀數；calm vs storm）③**特效成本排行榜**④長幀成因表⑤各修正前後數據與保真結果⑥P4 預算規則表與降級外觀對照圖⑦治理器時間序列⑧**使用者要做的事**⑨回退指南（各 tag、`VFX_BUDGET.enabled`）⑩**建議：下一步（美術／烘焙）要注意的事**。補寫 `DECOUPLING_HANDOFF.md` §13。 | docs | — |
| **FINAL** | 全量驗證：lint/test/build/`e2e:ui`（兩次）/`perf:guard`；工作樹乾淨、未 push；本地 tag：`perf4-ckpt-P0`、`perf4-ckpt-P3`、`perf4-ckpt-final`。 | docs | — |

### 本輪額外規則

- **取捨順序**（額度吃緊時）：`P0a → P0b → P1 → P2 → P3a → P4 → P5 → P3b`，其餘可略並在報告列為未完成。**任何時候中斷都要確保工作樹乾淨且最後一個 commit 全綠。**
- **以 p99 與 1% low 為主要指標**；「平均變好但長幀沒變」＝沒有解決問題。
- **省額度**：不要重複讀整個大檔；量測腳本迭代時用小視窗取樣（但最終結果必須用完整 20 秒 × 3 輪）；`DECOUPLING_HANDOFF.md` 等大檔只增補、不整檔重寫；**寫檔注意換行符為 LF**（不要產生 CRLF 造成假變更）。
- 若 P2 顯示成本主要在**瀏覽器合成／DOM／React**而非 Canvas 特效 → 把重點轉向減少合成層數、DOM 重繪、React 提交，並在報告說明；不得為了「有改」保留無收益的改動。
- 任何涉及 `battle_frozen` 的比較用嚴格逐像素；地形 5 場景沿用既有門檻，**不得放寬、不得重錄**。
- 停工原則：只有遇到會改變使用者可見預設外觀（超出 P4 授權）、且文件未涵蓋的情況才停下；其餘自行選擇最低風險、可回退的做法並記錄。

---

## 回來後使用者要做的事（給人看）

1. 讀 `docs/PERF_REPORT_4.md`，先看「特效成本排行榜」與 `docs/VFX_INVENTORY.md`（可順便抓出你記憶中那些亂七八糟的東西）。
2. 主螢幕（2560×1440 @ 239 Hz）開 `?perf` 實玩，把「全場特效齊發」時的新 HUD 截圖（真實 FPS、1% low、最長幀）貼給主代理。
3. 看 P4 的降級對照圖，決定預算規則要不要更激進或更保守（`constants.ts` 的 `VFX_BUDGET`）。
4. 不要 push；合併進 `main` 前先等主代理審查。
