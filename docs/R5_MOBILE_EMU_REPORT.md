# R5 手機模擬量測工具

2026-10-27：R5-0、REPORT 完成。基於指定 main 快照 `3f71c384dbc4fae776712588c6e6d376a2722a21`，在既有 `tools/mobile-emu` 工作樹執行；未切換分支、未 commit、未 push、未合併。初始工作樹乾淨。僅新增 `tools/ui-e2e/perf-mobile-emu.mjs` 與本報告，沒有修改產品程式、既有工具或任何 baseline。

用法（專案根目錄）：

```powershell
node tools/ui-e2e/perf-mobile-emu.mjs --cpu=4 --seconds=60
node tools/ui-e2e/perf-mobile-emu.mjs --cpu=1 --seconds=60 --out=tools/ui-e2e/out/perf_mobile_emu_cpu1.json
# 加 --headed 使用可見視窗，幀時間較接近實機。
```

預設輸出 `tools/ui-e2e/out/perf_mobile_emu.json`，stdout 印出兩列 Markdown 表。工具自行啟動與關閉 Vite dev server、Chromium。兩次實測分別用 `--out=tools/ui-e2e/out/perf_mobile_emu_cpu4.json`、`--out=tools/ui-e2e/out/perf_mobile_emu_cpu1.json` 保存原始資料，這些是 ignored 執行產物，沒有寫入受保護的 baseline 目錄。不安裝依賴。頁面例外或 harness 失敗退出 1；效能數字沒有通過門檻。

量測方式：393×852、DPR 3、isMobile、hasTouch、iOS Chrome UA；CPU 降速從導航前套用。只開 `?mute`，不傳 `quality`、不呼叫品質 setter。以既有模組 `getQualityTier()` 每 rAF 觀察品質，保留展示模式自動輪播與所有過場幀。每段 60 秒，測量前等待資產與引擎就緒，不改原生時間或 rAF。兩次使用相同亂數種子 1337；真實幀時序仍使後續場景與狀態有差異。

展示段後呼叫既有 `prepareManualBattle`。壓力段依 `ult-battle-probe` 的 eight 套件，在 DESERT 透過 UI_COMMAND 清場、擺八位施法者與兩位高血量目標，停用 AI、縮圈與打斷，八次 initiateCast 在同一個同步 rAF callback 內執行，再送出既有 visual events。採用 `mb_u1, rr_u2, wb_u4, sb_u4, tr_u4, mr_u4, rb_u2, wr_u5`，每約 15 秒清場重建、重放一輪，沒有使用 `__stepFrames`。此 fixture 量八招能完成時的畫面壓力，不代表一般對戰規則。壓力段沿用展示段結束時的品質，沒有重設 tier。

以下 S/P/E 為開始／觀測峰值／結束，記憶體使用 MB（bytes / 1048576）。tier 是開始／結束／期間最差品質，數字越大品質越低，因此最低品質是期間最大的 tier。粒子是總粒子數的峰值／逐幀平均。

| CPU | 情境 | FPS 平均 / 1% low | p95 ms | tier S/E/最差 | 粒子峰值/平均 | 存活畫布 S/P/E | JS heap MB S/P/E | renderer Private MB S/P/E | GPU Private MB S/P/E | 頁面錯誤 |
| :-- | :-- | --: | --: | :-- | --: | :-- | :-- | :-- | :-- | --: |
| 4× | 展示 | 64.71 / 13.16 | 33.40 | 0/3/3 | 249/57.32 | 363/1157/1107 | 15.87/33.22/29.56 | 137.26/670.11/647.52 | 604.07/982.19/755.29 | 0 |
| 4× | 八招奧義 | 75.29 / 11.61 | 41.60 | 3/3/3 | 380/49.73 | 1438/1438/1346 | 34.97/53.79/20.66 | 657.51/704.45/689.18 | 1008.87/1158.80/600.61 | 0 |
| 1× | 展示 | 215.30 / 57.93 | 8.30 | 0/0/0 | 672/144.66 | 277/1246/1246 | 18.28/41.60/41.60 | 175.01/1240.61/1214.13 | 628.45/1104.17/854.65 | 0 |
| 1× | 八招奧義 | 185.35 / 43.49 | 8.50 | 0/0/0 | 728/124.26 | 1306/1521/1437 | 21.30/51.06/21.26 | 1219.06/1484.87/1394.20 | 1349.61/2323.21/818.10 | 0 |

CPU 4× 展示段在 5.40 秒降至 tier 1、7.49 秒降至 tier 2、28.72 秒降至 tier 3；奧義段以 tier 3 開始，無其他降階。CPU 1× 兩段皆維持 tier 0。八招重放時間（相對各自壓力段）：4× 為 0.006、15.012、30.002、45.004 秒；1× 的精確秒數見 JSON casts。兩次每輪都記錄八次施放呼叫。所有 FPS > 0，tier 皆在 0～3。4× 奧義粒子峰值相對展示增加約 53%；1× 增加約 8%。每輪爆發之間有空檔，粒子全段平均反而較低，不能把此平均解讀為每幀持續有八招。較輕量且已降品質的壓力 fixture 也可能比展示段有更高的平均 FPS。

FPS 平均 = 1000 / 平均 rAF 間隔；1% low = 1000 / 最慢 ceil(N×1%) 個間隔的平均；p95 使用 nearest-rank。只排除開始時沒有上一幀的第一個 callback，不隱藏過場或長幀。每段以頁內時鐘滿 60 秒的 rAF 停止（誤差最多到下一幀）。

JS heap 用 CDP Performance.getMetrics，renderer/GPU 的 pid 來自 SystemInfo.getProcessInfo，再由 PowerShell Get-Process 讀 PrivateMemorySize64；多個相同程序類型相加。每約 2 秒取樣，實際週期包含查詢成本，JSON 保留 samples 與 elapsedS。起點在開始 callback 附近、末次樣本可能在 60 秒後約 2 秒內；峰值是取樣觀測值，可能漏掉短暫尖峰。兩次所有指定欄位皆取得數字，unavailable 為空。失敗量法至多試兩次後列 unavailable，沒有用 0 假裝取得資料。

畫布在 addInitScript 包裝 document.createElement，以 WeakRef 包含仍存活的 DOM 外快取畫布；不把 DOM canvas 數當全部畫布，不持有畫布強引用，也不強制 GC 干擾真實幀時間。因此這是自然 GC 下仍存活的 HTMLCanvasElement 觀測值，並非 GC 後保留量；未攔截 OffscreenCanvas 或其他建立途徑。

限制：只模擬 CPU 與版面／觸控，GPU、WebKit、iOS 記憶體回收以實機為準。實測 GPU 是桌機 NVIDIA GeForce RTX 4070，兩次均為預設 headless（以 config.headed=false 為準；共用 getEnvInfo 的 isHeadless 僅是 heuristic，這次回 false，不作判定依據）。桌機可超過 60 FPS，這些值不是 iPhone FPS。headed、桌機更新率、背景負載、瀏覽器版本與快取都影響結果；後續比較需固定這些條件。Vite dev 模式的程序 Private 絕對值可偏高至約 2 GB，只適合比較差值，不能當 iOS 記憶體額度。這次沒有實機效能或 WebKit 驗證，沒有變更效能判定門檻。

檢查皆以 `node tools/agent/run.mjs --detach <名稱> <逾時> -- <指令>` 啟動，反覆 `--wait` 到 DONE。以下 log 相對根目錄 `tools/ui-e2e/out/agent-logs/`：

| 時點 | 指令 | 退出碼 | log |
| :-- | :-- | --: | :-- |
| 前置 | `npm run lint` | 0 | `r5-pre-lint.log` |
| 前置 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r5-pre-test.log`（95 檔、841 tests） |
| 前置 | `npm run build` | 0 | `r5-pre-build.log` |
| 量測 | `node tools/ui-e2e/perf-mobile-emu.mjs --cpu=4 --seconds=60 --out=tools/ui-e2e/out/perf_mobile_emu_cpu4.json` | 0 | `r5-cpu4.log` |
| 量測 | `node tools/ui-e2e/perf-mobile-emu.mjs --cpu=1 --seconds=60 --out=tools/ui-e2e/out/perf_mobile_emu_cpu1.json` | 0 | `r5-cpu1.log` |
| 修改後 | `npm run lint` | 0 | `r5-post-lint.log` |
| 修改後 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | `r5-post-test.log` |
| 修改後 | `npm run build` | 0 | `r5-post-build.log` |

額外 `node --check tools/ui-e2e/perf-mobile-emu.mjs` 退出 0（終端檢查，無獨立 log）。build 僅有既有 chunk size 警告。沒有改渲染，未跑 perf:guard 或更新 baseline。Git 初次因 dubious ownership 拒絕，之後僅用命令區域 `-c safe.directory=C:/Git/_wt_r1` 完成唯讀檢查，沒有改 Git 設定。包裝器 WMI 啟動權限被拒後，自動 fallback spawn，所有工作均正常完成；CPU 1× 的一次 --wait 遇狀態 JSON 寫入競態，立即重試成功，未重開量測、未改既有包裝器。
