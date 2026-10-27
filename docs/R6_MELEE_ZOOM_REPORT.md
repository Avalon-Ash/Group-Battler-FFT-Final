# R6 近戰高低差＋鏡頭縮放報告

日期：2026-10-28。工作樹 C:/Git/_wt_r1；HEAD b078f62309dd4d382a4d725f8e46af47d605fe9a。開工乾淨；未切分支、未 commit／push／合併、未安裝依賴、未調整技能數值。

## 任務結果

R6-0、R6-1、R6-2、R6-3、REPORT 完成。lint、排除 AgentRunner 的 869 項測試、build、br-soak、runtime-smoke、perf:guard 通過。平衡報告存在 3 招技能勝率差超標，依指令只回報、不調整。

前次因基準保護範圍衝突中止後，主代理已刪除 coordinate-protocol.baseline.json 的已修正條目並將 MELEE_RANGE 加入 constants-snapshot.json；本輪依補充授權接續。未再修改 coordinate 基準；未新增任何基準違規或放寬門檻。constants-snapshot.json 另外同步新增鏡頭參數，沒有重錄畫面。

## 各任務修改檔案

| 任務 | 檔案與用途 |
| --- | --- |
| R6-0 | 無追蹤原始碼改動；改前量測備份 tools/ui-e2e/out/r6_before_balance_a.json、r6_before_balance_b.json |
| R6-1 | constants/combat.ts（MELEE_RANGE）；engine/ai/TargetingSystem.ts（射程 SSOT、可達目標）；engine/ai/Pathfinder.ts（占用中的攻擊目標格不能當終點）；engine/renderers/grid/GridRenderStrategy.ts（僅 checkIsRange 改走 SSOT）；tests/AIIdlePriority.test.ts、tests/MeleeHeightRange.test.ts（回歸測試） |
| R6-1 主代理處理 | tests/coordinate-protocol.baseline.json（只刪已修正項目）；tests/constants-snapshot.json（MELEE_RANGE） |
| R6-2 | constants/ui.ts（鏡頭參數）；engine/presentation/CameraSystem.ts、DirectorSystem.ts、CameraTargetGroup.ts；hooks/useCameraControl.ts、useGameCamera.ts；components/GameCanvas.tsx；types.ts、engine/renderer.ts（CAMERA_RESET_ZOOM 指令）；engine/systems/ui/editorQueries.ts（只讀目標倍率）；tests/CameraZoom.test.ts、CameraInput.test.ts；tests/constants-snapshot.json（新增鏡頭常數快照） |
| R6-3 | 無額外原始碼改動；量測、保真與實跑產物寫在 tools/ui-e2e/out/ |
| REPORT | docs/R6_MELEE_ZOOM_REPORT.md（覆寫前次中止報告） |

R6-2 編輯前計畫：更新指定的鏡頭、hook、GameCanvas；在 types.ts／renderer.ts 加入重設縮放指令，新增相應測試並同步常數快照。UI 邊界測試指出 hook 不應直接存取 renderer，故改用既有 editorQueries 查詢層讀取目標倍率。沒有新增抽象或更動世界座標、排序、渲染層規則。

## 近戰規則與所有呼叫點

COMBAT_PARAM.MELEE_RANGE = 1，註明使用者決定日期 2026-10-28。唯一公式仍在 TargetingSystem.getEffectiveRange：

- baseRange === 0：維持回傳 0 的精確抵達語意。
- baseRange <= MELEE_RANGE：回傳 baseRange − round(abs(deltaH) / BLOCK_HEIGHT)，允許負值；因此原本的 dist <= effRange 等價於 dist + tiers <= baseRange。沒有保底或高打低加成。
- 射程 >= 2：原本的高度判斷、加減上限 2、保底 1 完全保留。

既有 0.1 距離容差不會跨過整數 hexDist／tiers 邊界。技能資料沒有變更。

| 原始呼叫位置（改前行號） | 改成什麼／保留原因 |
| --- | --- |
| TargetingSystem:50 | SSOT 加近戰分支；公開簽章不變 |
| TargetingSystem:218 | 危險區目標評分保留原呼叫，自動套用新射程 |
| TargetingSystem:339/370 | 友軍／敵軍單體技能黏著判斷保留原呼叫 |
| TargetingSystem:425/462 | AOE 候選與退化目標保留原呼叫 |
| Pathfinder:25/45 | 起點是否已抵達、搜尋終點是否能攻擊都保留同一 SSOT |
| BTRegistry:176 | 友軍技能目標是否在射程內，保留原呼叫 |
| BTRegistry:217 | IsTargetInRange，保留原呼叫與容差 |
| BTRegistry:574/587 | 不能移動時是否就位、追擊塌陷區判斷，保留原呼叫 |
| BTRegistry:697 | 背水一戰施放判斷，保留原呼叫 |
| SkillExecutor:123 | 最終單體命中判斷保留原呼叫；延遲施法的既有結算例外保留 |
| game:391/392 | 公開代理保留，未修改 game facade |
| MovementSystem:29/30/48 | 射程代理與移動抵達判斷保留 |
| GridRenderStrategy.checkIsRange | 刪除獨立高度公式，改用 engine.getEffectiveRange；保留原 h 參數，將修改限於函式內 |
| TargetingSystem.updateTarget（新增） | 可站鄰格判斷與已在射程內判斷也呼叫 getEffectiveRange，沒有再定義一份射程規則 |

## AI 可達性與爬升

選目標先對近戰普攻檢查：目標鄰格中是否存在有效、符合射程 SSOT、且不被對應移動類型的地形障礙擋住的攻擊格；沒有就跳過該敵人。暫時的單位占用不算地形不可達。

**有同層鄰格也不直接視為可達。** 候選評分能勝過目前最佳目標、且尚未在射程內時，沿用 Pathfinder.findPath 的完整 A* 檢查，逐步經 canStepUp 判斷爬升、套用飛行與地形障礙規則。找不到路徑就換候選；不會因為同層攻擊格「存在」而持續鎖住爬不上去的平台。搜尋沿用既有 1000 次迭代上限；忽略暫時的單位阻擋，以免密集戰鬥中錯把目標判為地形不可達。

Pathfinder 在 range > 0 且目標格由其他活單位占用時禁止把該格當通路／終點，包含 ignoreUnits 的擠過去查詢；避免以「走到敵人腳下」誤判可以近戰。range 0 的逃生不受影響。

判斷證據：

- tests/AIIdlePriority.test.ts 增加「孤立高一層、沒有同層攻擊鄰格」及「平台有同層鄰格、但高度 3 層超過 jump 1」兩項。兩項都確認改選可達敵人，ChaseTarget 回 RUNNING、isMoving 為真。
- 全套最終 100 檔／869 項測試通過；近戰同層相鄰、高低雙向、不增加遠距離、遠程原公式、range 0、懸停顯示一致性皆有回歸驗證。
- br-soak seeds #1001～#1010：10/10 CLEAN、Ghost 0、Idle 0；tools/ui-e2e/out/br_soak.json。

這些測試確認有可達替代目標時能換目標與移動，以及指定 10 個 BR seed 未觀察到發呆。若人工地圖把所有敵人完全隔絕，單純無目標狀態仍由原有行為樹／求生流程處理；沒有新增隨機走動、看門狗或補救計時器。

## 縮放改動與操作

- 滾輪以 factor = exp(−normalizedDeltaY × log(1.15) / 100) 連續縮放；100px 一格相當於 1.15 倍，line／page 模式依常數換算，觸控板保留 deltaY 大小。
- 雙指送 dist / lastDist 的比例；抬指或取消後重置手勢距離，重新捏合不會沿用舊手勢。
- useGameCamera.zoom(factor) 經 editorQueries 讀 CameraSystem.targetZoom，送 CAMERA_ZOOM UI_COMMAND；React 不累加倍率。CameraSystem.sync 改為把引擎目前狀態寫出到外部 ref，避免拖曳時把舊倍率寫回。
- 手動縮放永久保留至重設，不再共用 1 秒導播冷卻。導播平移仍可接手；縮放鎖定期間使用 stiffness 18 的快速平滑。
- 雙擊畫布或短距離雙點觸控：送 CAMERA_RESET_ZOOM，立刻把目標倍率交回最近的導播倍率，再依導播平滑追蹤。捏合、拖曳、長按不視為雙點。
- 換場／重設經既有 renderer reset 解除手動縮放；單純 viewport 重置／snap 不會覆寫鎖定中的手動倍率。
- 單一常數段 UI_SETTINGS.CAMERA_ZOOM：全域 min 0.4、max 3.0，導播子範圍 min 0.45、max 1.6；CameraSystem、DirectorSystem、CameraTargetGroup 共用。
- 測試涵蓋超過 5 秒導播不改手動縮放、平移接手、解除與比賽重設、上下限、快速連續輸入累乘、wheel delta 模式、pinch 比例及重啟、雙擊／雙點。

## 平衡改前／改後（各 1000 + 1000 場，seed 1）

勝率分母採已分勝負場次，與標準 report 一致；時間單位秒。

| 站位 | 改前藍勝率 | 改後藍勝率 | 改前 p10 / p50 / p90 | 改後 p10 / p50 / p90 | 改前平手 / 逾時 | 改後平手 / 逾時 |
| --- | --- | --- | --- | --- | --- | --- |
| 一般 | 49.35% | 51.70% | 12.1 / 17.5 / 29.3 | 12.5 / 18.2 / 30.8 | 1 / 0 | 0 / 0 |
| 交換 | 50.40% | 53.70% | 12.1 / 17.2 / 27.6 | 12.3 / 17.8 / 29.5 | 0 / 0 | 0 / 0 |
| 合併 | 49.87% | 52.70% | 12.1 / 17.4 / 28.5 | 12.4 / 18 / 30.5 | 1 / 0 | 0 / 0 |

| 職業 | 改前藍每場傷害 | 改後藍 | 改前紅每場傷害 | 改後紅 |
| --- | --- | --- | --- | --- |
| TANK | 503 | 454 | 474 | 407 |
| WARRIOR | 1025 | 947 | 984 | 877 |
| RANGER | 1304 | 1417 | 1142 | 1214 |
| MAGE | 1450 | 1566 | 1276 | 1293 |
| SUPPORT | 379 | 412 | 339 | 353 |

以上使用標準報告的每場傷害欄（DOT 另外統計）。近戰為主的 TANK／WARRIOR 每場傷害下降；沒有因此調技能數值。完整 DOT、治療、傷害歸屬與全部技能數字在 r6-pre-report.log／r6-post-report.log。

| 技能 | 改前勝率差 | 改後勝率差 | picks |
| --- | --- | --- | --- |
| mr_u5 靈魂爆燃 | +0.060 | +0.104 | 440 |
| mb_u3 時間停止 | −0.054 | −0.090 | 432 |
| mr_u3 時間凝結 | −0.044 | −0.100 | 418 |

改前無超過 ±0.08 的技能；改後為上述 3 招（全部 picks >= 300）。標準量測 report 指令退出碼為 0，但技能勝率差驗收表為 FAIL，保留供下一輪平衡。兩種站位與合併的雙方整體勝率均未低於 40%。

## 實跑、保真與效能

- runtime-smoke --shot：0 頁面錯誤、10 單位，battleTime 0.52 → 4.57 秒、畫布不同；截圖 tools/ui-e2e/out/runtime-smoke.png。
- perf:guard 退出碼 0：5 張地形與 battle_frozen 全部通過；效能 A/B 各場景 ratio 1.00、原門檻 1.15，記錄門檻亦通過。這是工具在目前 headless 環境的結果，未額外執行主螢幕 perf:frames。
- 世界座標、排序、錨點未改，verify:coords 不適用；CoordinateProtocol 既有測試通過。

| 保真場景 | meanAbsDiff（log 四捨五入） | badPixelPct | 結果 |
| --- | --- | --- | --- |
| VOID | 0.216 | 0.03% | PASS |
| FOREST | 0.651 | 0.17% | PASS |
| ICE | 0.253 | 0.22% | PASS |
| MAGMA | 0.249 | 0.04% | PASS |
| DESERT | 0.530 | 0.23% | PASS |
| battle_frozen | 0.533 | 0.30% | PASS |

battle_frozen 原預期可能因戰鬥軌跡改變而失敗，本次實際仍低於原門檻 meanAbsDiff <= 0.8、badPixelPct <= 0.5%。未放寬、未重錄。標準腳本在 PASS 不存畫面，因此另用 tools/ui-e2e/out/_scratch_r6-fidelity.mjs 沿用同一 capture／比較流程，只補存證據，得到相同結果：

- 基準副本：tools/ui-e2e/out/fidelity/r6_battle_frozen_base.png
- 目前畫面：tools/ui-e2e/out/fidelity/r6_battle_frozen_curr.png
- 絕對 RGB 差異圖：tools/ui-e2e/out/fidelity/r6_battle_frozen_diff.png
- 原始精確指標：tools/ui-e2e/out/fidelity/r6_battle_frozen_metrics.json（strict mean 2.3336、strict bad 4.1438%；guard 使用原有鄰域對齊指標）

未引用 out/fidelity/battle_frozen_diff_curr.png 舊檔，該檔非本輪產物。

## 指令、退出碼、log

長指令均透過 node tools/agent/run.mjs --detach <name> <timeout> -- <command> 啟動並 --wait 至 STATE=DONE；下表列實際內層指令。所有背景狀態已 done。WMI 啟動遭拒後包裝器自動使用 spawn，沒有因此中斷驗證。

| 名稱 | 指令 | 退出碼 | log |
| --- | --- | --- | --- |
| r6-pre-lint | `npm run lint` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-lint.log) |
| r6-pre-test | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-test.log) |
| r6-pre-build | `npm run build` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-build.log) |
| r6-pre-balance-a | `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --out=tools/ui-e2e/out/balance_a.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-balance-a.log) |
| r6-pre-balance-b | `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --swapSides --out=tools/ui-e2e/out/balance_b.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-balance-b.log) |
| r6-pre-report | `node tools/balance/report.mjs tools/ui-e2e/out/balance_a.json tools/ui-e2e/out/balance_b.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-pre-report.log) |
| r6-melee-lint | `npm run lint` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-lint.log) |
| r6-melee-test | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 1 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-test.log) |
| r6-melee-test2 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-test2.log) |
| r6-melee-build | `npm run build` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-build.log) |
| r6-melee-test3 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-test3.log) |
| r6-melee-lint2 | `npm run lint` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-lint2.log) |
| r6-melee-build2 | `npm run build` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-build2.log) |
| r6-melee-soak | `node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-melee-soak.log) |
| r6-zoom-test | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 1 | [log](../tools/ui-e2e/out/agent-logs/r6-zoom-test.log) |
| r6-zoom-lint | `npm run lint` | 2 | [log](../tools/ui-e2e/out/agent-logs/r6-zoom-lint.log) |
| r6-zoom-test2 | `npx vitest run --exclude "**/AgentRunner.test.ts"` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-zoom-test2.log) |
| r6-zoom-lint2 | `npm run lint` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-zoom-lint2.log) |
| r6-zoom-build | `npm run build` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-zoom-build.log) |
| r6-post-balance-a | `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --out=tools/ui-e2e/out/balance_a.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-post-balance-a.log) |
| r6-post-balance-b | `node tools/balance/batch-sim.mjs --battles=1000 --seed=1 --swapSides --out=tools/ui-e2e/out/balance_b.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-post-balance-b.log) |
| r6-post-report | `node tools/balance/report.mjs tools/ui-e2e/out/balance_a.json tools/ui-e2e/out/balance_b.json` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-post-report.log) |
| r6-runtime | `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-runtime.log) |
| r6-guard | `npm run perf:guard` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-guard.log) |
| r6-fidelity-evidence | `node tools/ui-e2e/out/_scratch_r6-fidelity.mjs` | 0 | [log](../tools/ui-e2e/out/agent-logs/r6-fidelity-evidence.log) |

失敗處理：r6-melee-test 的 2 項為前次基準衝突，主代理按本輪補充授權修正後 r6-melee-test2 通過；新增爬升可達性測試後 test3 通過。r6-zoom-test 的 UI 邊界失敗改用 editorQueries 正式查詢層修正；r6-zoom-lint 的測試型別錯誤加上型別縮窄修正，後續 test2／lint2／build 全通過，未修改邊界 baseline 或放寬測試。

開工 git 原始命令因 dubious ownership 退出 128，改用單次 -c safe.directory=C:/Git/_wt_r1 的 rev-parse HEAD／status --short 成功（0），未更動全域設定。git diff --check 成功（0）；既有修改檔維持原有 CRLF／UTF-8。rg 不可用時改用 git grep／Select-String。

## 未達標與實際限制

1. 平衡技能勝率差有 3 招超出 ±0.08，已列數字，未調值；量測及報告任務完成。
2. AgentRunner 的 2 項依提示詞排除，完整 npm test 留主代理在沙盒外跑；本輪排除後 869/869 通過。
3. build 有既存大 bundle 警告，退出碼 0。
4. AI 不發呆的驗收依指定 br-soak 10/10 與兩個可達性回歸案例；未宣稱對所有人工封閉地形都有可攻擊目標。

改動留在工作樹供主代理審查。沒有仍在執行的自啟命令。
