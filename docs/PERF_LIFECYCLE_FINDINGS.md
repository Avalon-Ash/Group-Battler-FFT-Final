# PERF_LIFECYCLE_FINDINGS — MAGMA/VOID 卡頓與「越跑越慢」調查（只蒐證，未改任何引擎碼）

> **歷史量測說明**：本文數據為先前分支 `fix/perf-lifecycle` 之歷史量測紀錄（數據維持歷史原值不變，不作為本輪重測數據）。文中提及之 `GlowSpriteCache` 為歷史模組，已於 commit `2b15fad` 正式退役。

分支 `fix/perf-lifecycle`。機器：RTX 4070（`assertMainGpu` 通過）、msedge 155、2560×1440、DPR 1、有頭、vsync（約 238 Hz）、dev server。
工具：`tools/ui-e2e/terrain-float-probe.mjs`（A）、`tools/ui-e2e/perf-lifecycle-soak.mjs`（B）、共用 `tools/ui-e2e/lib/lifecycle-probe.mjs`。原始資料在 `tools/ui-e2e/out/`（gitignored）。

## 方法
- **A**：每個 run 開新 context（冷快取）→ 進手動模式 → 固定 12×8 FLAT、指定地形、5v5、HP 999999、關閉導播與縮圈 → 90 s 固定縮放（1.3）＋ 30 s 縮放掃描（0.4→3.0→0.4，直接寫 `camera.zoom`）。每 5 s 取：rAF 間隔中位／p99／max、`store.getStats()`、渲染階段 EMA 總和（`work`，與 vsync 無關）、烘焙次數與耗時（包住 `TerrainRenderer.bakeBlock`）、累計不同 key 數（包住 `store.get`）。A/B 全靠頁內執行期改值：`RENDER_CACHE.FLOAT_STEP=1e9`（floatflat）、`SurfacePainter.drawLiquid` 設為空函式（noliquid）。
- **B**：單一頁面 11 分鐘（66 次取樣，每 10 s，先強制 `gc()`）。前 5 分鐘 showcase 自動換場（隨機地形、預設縮圈），後 6 分鐘手動：骰子／「下一關」／「再戰一局」輪流，縮圈間隔 4 s 與 10 s 交替，每場打到結束。共 33 場開戰＋4 次 restart。音訊開啟（`--mute-audio`），`?perf&quality=0`。
- 蒐集：heap（GC 後）、DOM、存活 canvas（WeakRef）、事件監聽（包住 `addEventListener` ＋ CDP `JSEventListeners`）、timer、rAF 呼叫率、音訊節點、bus 每事件監聽數、所有 `export` 單例快取、Vite 記憶體內轉換暴露的模組層級 `new Map/Set`（`__CACHE_REG`，不寫檔）、以及對 `engine` 物件圖的通用普查（每個 Map/Set/Array 的長度，約 650 個序列）、瀏覽器各行程私有記憶體。
- 判定「單調成長」：去掉前 15%，Spearman ρ≥0.6、最後三分之一的最低值 > 最前三分之一最低值 ×1.05＋1、且最後三分之一均值 > 中段。累計計數器（hits/created…）不列入。

## A 結果：MAGMA / VOID

| run | 固定縮放 p99 / work ms | 掃描段 p99 / work ms | 掃描段 miss/s | 掃描段烘焙總耗時 | 掃描最長幀 | 不同 key 數 | 前 5 s 烘焙 |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| VOID baseline | 11.8 / 2.44 | **86.8 / 26.8** | 110 | 14.5 s（3284 次） | 429 ms | 6052 | 1147 次 2583 ms，p99 96，max 142 |
| VOID floatflat | 13.2 / 2.88 | 15.9 / 4.1 | 10 | 2.3 s | 47 ms | 404 | — |
| MAGMA baseline | 14.7 / 3.44 | **103.1 / 50.9** | 158 | 16.3 s（4741 次） | 435 ms | 6800 | 1322 次 2683 ms，p99 117，max 174 |
| MAGMA floatflat | 17.4 / 4.79 | 22.0 / 6.2 | 11 | 2.7 s | 64 ms | 424 | — |
| MAGMA noliquid | 13.4 / 2.91 | 87.5 / 34.9 | 103 | 14.0 s | 356 ms | 5780 | 1189 次 |
| FOREST（對照） | 14.2 / 3.45 | 15.7 / 3.8 | 11 | 2.5 s | 34 ms | 440 | 0 |
| FOREST floatflat | 16.9 / 4.61 | 19.7 / 5.9 | 11 | 2.7 s | 67 ms | 432 | 0 |

- 每個縮放級距的不同 key：VOID 1513、MAGMA 1700，非浮島 101–110（= 17 個 float 步 ×7 高度 ×4 variant ×約 30 種邊遮罩 vs 1 個 float 步）。單一級距低於上限 2048（74%／83%），所以**固定縮放時零 miss、零淘汰**，穩態與 FOREST 同級。
- **假說「key 組合超過上限導致持續淘汰重烘」：部分成立，需修正**。成立的情境：(1) 相機跨越 ≥2 個縮放級距（2 級 ≈3000–3400 key）→ `evictOtherScales` 丟光其他級距，來回縮放就反覆重烘；掃描段單窗 miss 達 1000–1700、單幀 429 ms。(2) 快取上限跨地形共用：VOID/MAGMA 同級距的 1500–1700 筆加上前一張圖殘留超過 2048，`removed===0` 時走整體 `clear()`。B 的 23 次 clear 全發生在 VOID／MAGMA 窗（含 2 次 FOREST 貼圖載入的 revision）。不成立：穩態縮放下並無持續淘汰。
- 液面（MAGMA）：穩態約 0.2 ms/幀（sub-phase `liquid`），關掉液面對掃描段／冷啟動幾乎無差異，**不是主因**。
- 冷啟動：浮島圖前 5 s 要烘約 1150–1320 張（約 2.2 ms/張，不受預算限制，因為尚無可借用的相鄰級距），p99 96–117 ms；非浮島與 floatflat 為 0。
- 量測雜訊：vsync 幀間隔中位數各 run 在 4.2–10.6 ms 間飄（顯示器更新率切換），**不可用來比較**；本表以 p99、work、miss 為準。

## B 結果：11 分鐘／33 場

- **沒有發現典型洩漏**：GC 後 heap 29→35→36 MB（三等分均值，後兩段持平，ρ 未達門檻）；DOM 74–80；監聽 175–188；timeout/interval ≤1/2；bus 每事件監聽數全程固定（GAME_OVER 3、UI_COMMAND 3…）；rAF 呼叫率＝幀率（無重複迴圈）；音訊存活節點 6–51 後回落（累計建立 GainNode 3874，皆被回收）；VFX 粒子池 ≤350、decals 0、floatingTexts 0–45、renderList 容量固定 8000。
- 11 分鐘 canvas 累計建立 74,666、存活 1100–3000（隨 GC 擺動）；renderer 私有記憶體 0.96→約 1.3–1.5 GB，GPU 0.8–1.7 GB，皆**非單調**，但數值偏大。
- 「越跑越慢」**不成立**：同類地形早／中／晚窗的 p99——FOREST/DESERT/ICE 12.6／12.5／11.6 ms；VOID/MAGMA 383／108／63 ms（改善，因為快取暖機）。
- 效能問題集中在 VOID／MAGMA（showcase 內導播縮放 1.21–1.54 橫跨 1.5 的級距邊界）：

| 地形 | 窗數 | p99 中位 | p99>50 ms 窗 | 平均 miss/窗 | 平均淘汰/窗 | work 中位 ms |
| :-- | --: | --: | --: | --: | --: | --: |
| VOID | 24 | 204 ms | 20 | 1894 | 1711 | 89 |
| MAGMA | 9 | 125 ms | 8 | 2146 | 2478 | 66 |
| DESERT | 10 | 12.5 ms | 1 | 378 | 625 | 1.9 |
| FOREST | 19 | 12.5 ms | 0 | 128 | 0 | 2.1 |
| ICE | 3 | 12.6 ms | 0 | 71 | 0 | 3.6 |

  整場累計：miss 73,501、淘汰 71,827、clear 23、借用 fallback 63,353（`size` 峰值 2034，貼近上限）。

## 成長／堆積嫌疑（依風險排序）
1. **地形 sprite 快取抖動（主因，非洩漏）**：`TerrainRenderer.ts:73-78` 的 float 量化讓 key 空間 ×17；`TerrainBlockCache.ts:79` 打包；`:238-249` 滿時 `evictOtherScales`（`:189`）或整體 `clear()`（`:152`）；`constants.ts:662-668` 上限 2048 與烘焙預算。預算只在「有相鄰級距可借」時生效（`:227-233`），冷啟動／跨級距無可借者仍強制烘焙。證據：上表；floatflat 把掃描段 p99 降 5 倍。
2. **被淘汰的 canvas 變垃圾**（同上 `:196` `intMap.delete`）：11 分鐘 7.4 萬張，renderer／GPU 行程各 1–1.7 GB。證據是行程記憶體與 canvas 計數，**未量到單張大小與 GPU 常駐量**。
3. **無上限但飽和的顏色鍵快取**（低風險）：`VFXFactory.ts:16/29`（`T92_${type}_${color}`）75→187；`engine/assets.ts:3`（`GLOW_SPRITE_/PROJ_/SK_ICON_…`）34→138；`engine/sprites.ts:23`。約第 500 s 起持平；只有 `reset()`／換貼圖才清。若日後出現動態顏色字串會變成真洩漏。
4. 有上限，行為正常：`logger.logs`（5000，`BattleLogger.ts:58`）、`GlowSpriteCache`（256，實際 113；歷史量測，已於 commit `2b15fad` 退役）、`particleTint`（128，實際 97）、液面循環 slots（16，實際 8）。
5. **保留而非成長**：`RenderList.ts` 的 8000 個 op 在 `reset()` 後仍持有 agent／particle／proj 引用直到被覆寫（有界）；`RenderOp.clear()` 每次 `pTrail = []` 產生小垃圾。未量到影響。

## 未能量到／限制
- 只跑 dev server（`__TACTICAL_ENGINE__` 僅 DEV），StrictMode 會多建一個 `GameEngine`；未跑 production build。DPR 固定 1（縮放級距邊界在 DPR>1 會移位，浮島問題大概更嚴重但未量）。
- 品質治理器被 `?quality=0` 釘死；導播縮放只在 B 的取樣瞬間觀察，未連續記錄縮放時間序列，故「跨 1.5 邊界的頻率」是推論（取樣縮放 1.21–1.54）。
- A 的 A/B 為冷快取單次，每格 1 次重複（FOREST 對照組給出雜訊下限：掃描段 p99 15.7–19.7）；floatflat 同時移除浮動動畫，視覺不同。
- 音訊為 `--mute-audio`，未驗證實際播放；列表中的 `lastCuePlayTime`、`_ice.POINTY`、貼圖 pattern 的「成長」是有限 key 空間的暖機。
- 未做超過 11 分鐘、地圖編輯器、視窗系統開關、手機的測試；GPU 常駐量只有行程私有記憶體，沒有 per-texture 資料。

## 失敗／修正紀錄
- 首次 soak 因 `browser.process()` 不存在而中止，改用 `SystemInfo.getProcessInfo` 取 PID。`new Map` 被 esbuild 加上 `/* @__PURE__ */`，導致模組層級快取登錄為空，已修正 regex 後重跑。
