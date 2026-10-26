# R1 特效零件快取報告

分支 fix/part-cache-thrash；base 7a4ce303a0ca6b4c20c97611801319bf50d39398。開工工作樹乾淨。

## R1-0：量測

探針使用固定 Math.random 種子 1337、真實 rAF、headless 2560×1440／DPR 1、quality=0；同頁連續三輪各 20 秒，不重新載入，第一輪包含冷烘焙。每次 store.get 後記錄駐留 bytes 峰值（不含烘焙過程暫時超額）；misses／evictions 是各輪增量。--large 僅在頁面記憶體中設 512 MiB／4096 條，未修改快取程式。

| 階段 | 輪 | evictions | misses | entries | 峰值 bytes |
| --- | --- | --- | --- | --- | --- |
| 改前 | 1 | 111 | 348 | 304 | 100657232 |
| 改前 | 2 | 79 | 57 | 282 | 100661164 |
| 改前 | 3 | 5 | 8 | 285 | 99941680 |
| 大上限 | 1 | 0 | 326 | 391 | 150796516 |
| 大上限 | 2 | 0 | 43 | 434 | 175735120 |
| 大上限 | 3 | 0 | 25 | 459 | 186236416 |

觀測工作集 177.61 MiB／459 條，低於 192 MiB 停止門檻。乘 1.25 後為 222.01 MiB／573.75 條，擬取整為階層 0／1 的 224 MiB／576 條；階層 2／3 維持 96 MiB／320 條。224 MiB 是含餘裕的上限，並非量到工作集超過 192 MiB。

限制：原上限第 3 輪呼叫數明顯減少（537 次，前兩輪 3105／2639 次），不能只憑該輪擠出低就主張改善。真實時間的情境受戰鬥演進、烘焙耗時影響，固定隨機種子也不保證逐輪完全相同；不以此量測聲稱幀時間改善。

## 檢查

log 根目錄：tools/ui-e2e/out/agent-logs/。

| 指令 | 退出碼 | log |
| --- | --- | --- |
| npm run lint（改前） | 0 | r1-pre-lint2.log |
| npx vitest run --exclude "**/AgentRunner.test.ts"（改前） | 0 | r1-pre-test2.log |
| npm run build（改前） | 0 | r1-pre-build2.log |
| node tools/ui-e2e/part-cache-probe.mjs | 0 | r1-probe-before.log |
| node tools/ui-e2e/part-cache-probe.mjs --large | 0 | r1-probe-large.log |

使用者授權排除 AgentRunner.test.ts：整檔共 7 項（含原本通過的 5 項），故本次為 817 項全綠，並非 822 項。完整 npm test 留主代理沙盒外審查。Git 以單次 -c safe.directory=C:/Git/_wt_r1 處理擁有者差異，未改全域設定。constants-snapshot.json 與 ConstantsBarrel.test.ts 均不包含 VFX_PARTS，依使用者澄清不修改快照。

## 實作計畫與回退

實作檔案共 4 個：新探針、partConfig.ts、VFXPartStore.ts、DesignExporter.ts（只同步匯出文件中的常數名稱）。單元測試與本報告依使用者授權另計。受保護的 HANDOFF 舊文字保留。

預定提交分組：R1-0 為探針與量測報告；R1-1 為設定、讀取、測試與文件常數名稱同步；R1-2 為驗證紀錄；REPORT 為最終報告。實際提交受 Git 索引權限阻擋，詳見下方最終任務狀態。

## R1-1：實作與驗收

設定改為 MAX_ENTRIES_BY_TIER=[576,576,320,320]，MAX_BYTES_BY_TIER=[224,224,96,96] MiB；每次 get 讀取當前品質階層，沿用既有 LRU 擠出流程。影格數、烘焙解析度與外觀未改。DesignExporter 只同步常數名稱，受保護的文件不修改。

新測試以 fakeSurface 和注入 getTier 比較相同靜態 ring 集合：總 bytes 超過 96 MiB，階層 3 擠出、階層 0 不擠出，並鎖定階層 2／3 常數。既有條目數與位元組測試更新引用。快照依使用者指示無須變動。

| 階段 | 輪 | evictions | misses | entries | 峰值 bytes |
| --- | --- | --- | --- | --- | --- |
| 改後 | 1 | 0 | 329 | 374 | 138702508 |
| 改後 | 2 | 0 | 67 | 441 | 179668752 |
| 改後 | 3 | 0 | 24 | 465 | 186451612 |

第 2／3 輪皆 0 次擠出，通過 ≤10 次。正式峰值 186451612 bytes（177.81 MiB），未超過 192 MiB。正式工作集略大於大上限那次，仍在取整餘裕內。量測限於本次三輪，不宣稱所有長跑工作集已收斂。

| 指令 | 退出碼 | log（同前述根目錄） |
| --- | --- | --- |
| npm run lint（改後） | 0 | r1-post-lint2.log |
| npx vitest run --exclude "**/AgentRunner.test.ts"（改後） | 0 | r1-post-test2.log |
| npm run build（改後） | 0 | r1-post-build.log |
| node tools/ui-e2e/part-cache-probe.mjs（改後） | 0 | r1-probe-after.log |
| node tools/ui-e2e/runtime-smoke.mjs --shot | 0 | r1-smoke.log |

改後為 818 項全綠。開發期間另有兩個失敗 log：r1-post-lint.log 退出 2（測試先加入、常數編輯尚未完成時誤啟檢查）；r1-post-test.log 退出 1（測試原用 soft glow，集合不足 96 MiB，已改用同尺寸靜態 ring 後通過）。沒有放寬測試門檻。

runtime-smoke：10 單位、running=true、battleTime 0.52→4.58 秒、0 頁面錯誤、畫布有變化；截圖 tools/ui-e2e/out/runtime-smoke.png。

## Commit 阻礙與回退

R1-0 的 git add 與 git commit 均退出 1：建立 C:/Git/_wt_r1/.git/index.lock 被拒絕（Permission denied）。此 clone 雖已使用本地 .git，當前執行環境仍無法寫入 Git 索引；未變更權限或繞過沙盒。沒有 commit 產生，故無法提供每任務的 commit 回退指南；所有交付保留在工作樹，需主代理於可寫 Git 環境分任務提交，訊息附 Co-Authored-By: Codex <noreply@openai.com>。

如需放棄本輪，主代理可還原 partConfig.ts、VFXPartStore.ts、DesignExporter.ts、tests/VFXParts.test.ts，移除新探針與本報告；本代理未執行還原。未動 main、未 push、未建其他分支、未安裝依賴、未改基準與門檻。

## R1-2：完整驗證結果

npm run perf:guard 退出 0，log：tools/ui-e2e/out/agent-logs/r1-guard.log。保真 meanAbsDiff：VOID 0.216、FOREST 0.651、ICE 0.253、MAGMA 0.249、DESERT 0.530、battle_frozen 0.170，六張皆通過既有門檻。效能護欄五場景全部通過（ratio 1.00 ≤1.15，當次 rAF baseline 均約 4.17 ms）；環境為 headless RTX 4070／DPR 1，這不是使用者主螢幕的 perf:frames 長幀改善證據。未重錄基準或放寬門檻。

node tools/vfx/fx-shot.mjs --keys=FX_HEAL_BURST 退出 0，log：tools/ui-e2e/out/agent-logs/r1-fx-shot.log。預覽圖 tools/ui-e2e/out/vfx/fx/FX_HEAL_BURST_2.png 已檢視。git diff --check 退出 0。未改位置、高度、排序或發射點，verify:coords 不適用。

## 最終任務狀態

| 任務 | 工作內容 | commit |
| --- | --- | --- |
| R1-0 | 探針與改前／大上限量測完成 | 無；Git 索引權限阻擋 |
| R1-1 | 階層上限、單元測試、正式探針驗收完成；快照依澄清免改 | 無；同上 |
| R1-2 | lint／排除 AgentRunner 的測試／build／smoke／perf:guard 全通過 | 無；同上 |
| REPORT | 本報告完成 | 無；同上 |

尚未達成的要求只有分任務 commit 與以 commit 為單位的回退指引；完整未排除 npm test 依使用者指示留主代理沙盒外執行。本輪所有自行啟動的驗證指令均已取得 DONE，無背景驗證待完成。

## 主代理補修（審查時）

- 品質階層開場是 0，跑得順不會降階：iPhone 會停在階層 0／1 吃到 224 MiB，違反「手機上限不高於 96 MiB」。新增 `RenderQuality.isMemoryConstrainedDevice()`（`pointer: coarse`）與 `VFX_PARTS.CONSTRAINED_MIN_LIMIT_TIER = 2`：觸控裝置的快取上限至少取階層 2，影格數仍跟實際階層。單元測試補「觸控裝置停在階層 0 也會擠出到 96 MiB 以內」。
- 沙盒外完整 `npm test` 94 檔／825 項全過（含 AgentRunner）；lint、build、runtime-smoke 通過。桌機路徑不變，`perf:guard` 沿用本報告 R1-2 的結果。
- Codex 的 workspace-write 沙盒把 `.git` 設為唯讀，獨立 clone 也無法 commit；commit 由主代理代做。
