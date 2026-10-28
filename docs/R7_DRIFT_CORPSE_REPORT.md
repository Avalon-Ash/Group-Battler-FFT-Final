# R7 取證與修正報告

基底：最新本機 main `810dd50`；分支 `fix/drift-corpse`；獨立工作樹。

## 編輯前計畫

預計涉及五個檔案：探針 `tools/ui-e2e/drift-corpse-probe.mjs`、純繪製軌跡 `data/units/appearance/deathMotion.ts`、規則文件 `engine/renderers/RenderSpec.ts`、對應單元測試與本報告。推擠探針顯示 0.5 秒內回到 0.01px，6 秒為 0；不改模擬。死亡滑行達到 MAX_SLIDE 後，從每幀不同長度的向量重新正規化產生末位誤差，格界腳點在相鄰格切換；改成以固定初速向量決定封頂終點，消除誤差來源，不加滯後、clamp 高度或排序鎖。

## 結果與限制

已修正可重現的屍體格界高度閃爍；推擠的持續飄移未重現，沒有修改推擠、物理、AI 或技能。不能把這份結果解讀成使用者實機的兩個現象均已重現並修好。

探針為固定 seed=1 的隔離 production-system fixture（SSR 載入真實 StackingResolver、PhysicsEngine、UnitFrameStore、RenderList），不是自然對戰影片：四個單位同格、無 AI／走路／受擊；屍體初速 (300,173.20508075688772,150)，滑行終點恰在 (0,0)/(0,1) 格界。正常格高 24，鄰格用 `24-300*t*t` 模擬連續下降，1.5 秒後移除。這是放大高度差的根因探針，不是 ZoneSystem 的掉落速度調整或實機縮圈時間重現。擁擠測試的 spatial fixture 平坦、合法，位置更新等同 running MapSystem 的 q/r 寫入，高度差為 0。

## 根因與逐幀證據

### 推擠

`engine/systems/movement/StackingResolver.ts:50` 換邏輯格，`:60-61` 加速度；running 的 `engine/systems/map.ts:41` 保留原 px/py。`engine/physics/PhysicsEngine.ts:199-202` 等速度平方低於 5000 後，把 px/py 拉回新格中心；physics 偏移同時由彈簧積分回正。這是模擬層既有的短暫視覺過渡。本次沒有找到放錯邏輯格或持續不回正的證據，因此沒有改這些檔案，也沒有用渲染端強制貼格掩蓋它。

下表為 probe1，各幀距新邏輯格中心的距離（px）；另外兩個被擠單位的最慢回正時間相同。

| 幀 | px/py 基準偏移 | 含 physics 的繪製偏移 |
|---:|---:|---:|
| 0 | 74.939976 | 74.939976 |
| 1 | 74.939976 | 72.794913 |
| 5 | 15.391097 | 11.259252 |
| 10 | 0 | 2.330177 |
| 20 | 0 | 0.269952 |
| 30 | 0 | 0.007458 |
| 360 | 0 | 0 |

### 屍體

舊 `data/units/appearance/deathMotion.ts:26-30` 先算隨 t 改變的位移，再用該向量長度正規化到 MAX_SLIDE。數學上終點相同，但浮點運算每幀產生約 1e-14px 的差異。`computeDeathGround`（舊檔 :92-94，修後 :96-98）用未濾波的終點取格高，格界兩側高差隨塌落變大；`engine/renderers/frame/UnitFrame.ts:340-344` 消費這個高度。既有排序滯後沒有阻止高度取樣跳格。

| 版本／幀 | footX | footY | 高度取樣格 | groundH | drawY | 排序格 | sortKey |
|---|---:|---:|---|---:|---:|---|---:|
| 前 61 | 0 | 20.784609690826528 | 0,1 | -286.083333 | 306.867943 | 0,1 | 1004254 |
| 前 62 | 1.4210854715202004e-14 | 20.784609690826528 | 0,0 | 24 | -3.215390 | 0,1 | 1004254 |
| 前 63 | 0 | 20.784609690826528 | 0,1 | -306.75 | 327.534610 | 0,1 | 1004254 |
| 後 61 | 1.4210854715202004e-14 | 20.784609690826528 | 0,0 | 24 | -3.215390 | 0,0 | 1001976 |
| 後 62 | 1.4210854715202004e-14 | 20.784609690826528 | 0,0 | 24 | -3.215390 | 0,0 | 1001976 |
| 後 63 | 1.4210854715202004e-14 | 20.784609690826528 | 0,0 | 24 | -3.215390 | 0,0 | 1001976 |

修後 `deathMotion.ts:34-36` 直接用固定初速的方向求封頂終點。沒有高度 clamp、速度過濾、永久排序鎖或額外安全網；既有排序格仍能正常轉換。新增 DeathMotion 測試要求封頂後每幀 x/y bit-identical。RenderSpec §3 與方框檔頭已同步。

## 改前／改後數字

| 指標 | 改前 | 改後 |
|---|---:|---:|
| 推擠最大偏移 px | 74.939976 | 74.939976 |
| 回到 <0.01px 並保持的時間 s | 0.5 | 0.5 |
| 6 秒時偏移 px | 0 | 0 |
| 封頂後取樣格切換次數（frame >18） | 55 | 0 |
| 封頂後高度向上跳 >1px 次數 | 15 | 0 |
| 封頂後排序鍵切換次數 | 0 | 0 |
| 全軌跡向上高度跳變次數 | 18 | 1（封頂前正常跨格，非持續振盪） |
| 300 場逐場完整結果不同 | — | 0 |
| 座標 sink 違規 | 0 | 0 |
| 座標 static 振盪 | 0 | 0 |
| 座標振盪 events（含移動） | 75 | 75 |
| 穩定錯序 episodes / pair-frames | 7 / 26 | 7 / 26 |
| wrongFrames（工具欄位，實為 pair-frames） | 128 | 128 |
| framesWithWrong | 85 | 85 |

座標數字不等於提示詞列出的歷史基準 9/34、105、65、1。本次使用最新本機 main、指定參數，在同一工作樹改前與改後測得上述相同數字；保留兩份 JSON，未改基準或門檻。

## 驗收指令與退出碼

長指令均由 `node tools/agent/run.mjs --detach <name> <timeout> -- <下列指令>` 啟動並持續 `--wait` 到 DONE。退出碼均為被包裝的命令退出碼。

| 指令 | 退出碼／結果 |
|---|---|
| `node tools/ui-e2e/drift-corpse-probe.mjs --tag=before --baseline=810dd50` | 0 |
| `node tools/ui-e2e/drift-corpse-probe.mjs --tag=after` | 0 |
| `node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=tools/ui-e2e/out/r7-before-sim.json` | 0 |
| `node tools/balance/batch-sim.mjs --battles=300 --seed=1 --out=tools/ui-e2e/out/r7-after-sim.json` | 0 |
| `node tools/ui-e2e/drift-corpse-probe.mjs --compare` | 0；Node isDeepStrictEqual 逐場比較 battles 全部欄位，300/300 相同 |
| `npm run verify:coords -- --sink --flicker --order --seeds=2 --seedStart=1 --seconds=10 --orderSeconds=10 --biomes=FOREST,VOID,MAGMA --orderBiomes=FOREST,VOID,MAGMA` | 改前 0、改後 0；未使用 --assert，另比對上表不得增加的數字 |
| `npm run lint` | 0 |
| `npm test` | 0；102 檔、880 tests，含 CoordinateProtocol 與新增 DeathMotion 測試 |
| `npm run build` | 0 |
| `node tools/ui-e2e/runtime-smoke.mjs --shot` | 0；0 page errors、10 agents、battleTime 0.50 → 4.57，canvas 有變 |
| `npm run perf:guard` | 0；保真六張全過、效能 guard 全過 |
| `node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle` | 0；10/10 clean、ghost=0、idle=0 |
| `node --check tools/ui-e2e/drift-corpse-probe.mjs` | 0 |
| `git diff --check` | 0 |

保真 meanAbsDiff：VOID 0.216、FOREST 0.651、ICE 0.253、MAGMA 0.249、DESERT 0.530、battle_frozen 0.000。未重錄任何保真或測試基準，未放寬門檻。效能 A/B 在 headless browser 測得 4.17ms，僅作既有 guard 驗證，不宣稱實機幀時間改善。

## 證據路徑與重跑

相對本工作樹的 `tools/ui-e2e/out/`：`r7-before-probe.json`、`r7-after-probe.json` 保存全部逐幀數字；`r7-before-sim.json`、`r7-after-sim.json` 保存逐場結果；`r7-comparison.json` 保存比較摘要；`r7-before-coords.json`、`r7-after-coords.json` 保存座標量測。完整命令日誌在 `agent-logs/r7-*.log`。這些是 gitignored 的本機證據，需保留本工作樹以供主代理審查。

探針 `--baseline=810dd50` 透過 Vite transform 載入 git 內舊 deathMotion，沒有覆寫 production 檔案，因此可在修正後分支重跑相同改前取證。模擬比較不刪除 battles 的任何欄位；wallSeconds 僅在 summary，不屬逐場結果。

## 未達標項目與回退

- 尚未重現使用者實機的「持續推擠飄移」，因此沒有對它提供修正或宣稱找到缺陷根因。探針只證明本次四單位無攻擊場景會自行回正。
- 屍體數字來自精確格界 fixture；沒有宣稱自然對戰中的每一種閃爍均已排除。既有 R3 特效排序短暫翻轉維持原決策。
- 分支只包含屍體繪製、探針、測試與文件；原 BAL-03 工作樹及技能檔未動，沒有 merge、rebase、push。
- 實作 commit `5fc4d2b`：只改封頂終點計算、RenderSpec、DeathMotion 測試與探針。本報告另作一個 docs commit（只新增本檔）。需要撤回時由主代理在整合分支 revert `5fc4d2b` 即可，沒有資料遷移或 baseline 需要還原。
