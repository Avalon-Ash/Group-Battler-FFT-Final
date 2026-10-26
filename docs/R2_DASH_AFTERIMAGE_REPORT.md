# R2 衝刺殘影停留

R2-0、R2-0b、R2-1、R2-2、REPORT 完成。HEAD：64cf338eafc214b29260461b1ef90fea95385623；開工時乾淨。未 commit、未安裝依賴、未改物理／技能／trailHistory 寫入者、未重錄基準或放寬門檻。依更正使用 wb_a2、wr_a3、mb_a3。

## R2-0／R2-0b：wr_a3 零殘影根因

根因在舊探針場景建立：只清 e.obstacles，漏清 e.map.obstaclesHash。engine/systems/map/MapSpatial.ts:48 的 hasObstacle 讀雜湊；engine/systems/ui/UICommandSystem.ts:177 因此可能拒絕 PLACE_AGENT。舊探針沒有驗證雙方各一名，單一隊伍會讓 engine/systems/VictorySystem.ts:30 啟動勝負結算，:44–47 倒數後停止引擎。

證據：tools/ui-e2e/out/agent-logs/r2-before-v2.log。wr_a3 第0–17幀均 speed=1798.559、trailHistory.length=0、ghostCount=0、physics.z=0；battleTime 固定0.501103，running=false；hp=20000、corpse=false、visible=true、fullyDead=false、outOfBounds=false、banished=false、drag=false、visualStatus=NONE。不是屍體、隱藏、變羊或剪影條件；停止的引擎不跑物理，trail 不增加。

直接擋住殘影的是 engine/renderers/frame/UnitFrame.ts:382 的 agent.trailHistory.length>0 不成立。UnitAfterimagePainter 因 ghostCount=0 早退；z不參與速度門檻。沒有修改產品端來掩蓋探針錯誤。

探針 tools/ui-e2e/dash-afterimage-probe.mjs:41 現在同時清雜湊，:56 斷言兩名單位及施法者隊伍。修正後原程式 wr_a3 第8幀 speed=854.227、trail=10、ghostCount=4、z=9.831、running=true；第12幀 speed=313.241、trail=14、ghostCount=4；第13幀 speed=237.529、trail=15、ghostCount=0，確認真正問題是降速瞬間消失。

r2-before-v2 因走路位移斷言退出1，是已修正的探針場景缺陷。r2-before-v3 退出0，才是有效改前基線。

## 改前／改後

固定種子42、FOREST、FLAT、quality=0；手動 __stepFrames，每幀1/60秒，每案例120幀。可見定義 ghostCount>0且最大alpha>0，可見秒數=可見幀數/60。三招可見幀連續。逐幀資料包含battleTime、ghostCount、最大alpha、速度、trail長度、z、腳點與各排除條件。

使用原 SkillExecutor 執行原技能，隔離施法完成後的位移（不含詠唱時間）；施法者統一使用地面戰士以控制外觀與移動類型，目標為前方五格空格，並非各職業完整AI戰鬥測試。mb_a3 在此版本確實走DASH物理流程，並非零速度瞬移，所以正常量測，不標不適用。

| 案例 | 改前幀／秒 | 改後幀／秒 | 最大殘影數前→後 | 倍率 | 60幀內最大腳點位移px |
|---|---:|---:|---:|---:|---:|
| wb_a2 疾光突襲 | 12／0.200 | 31／0.516667 | 4→4 | 2.583 | 375.258 |
| wr_a3 毀滅跳斬 | 12／0.200 | 31／0.516667 | 4→4 | 2.583 | 375.258 |
| mb_a3 易位術 | 12／0.200 | 31／0.516667 | 4→4 | 2.583 | 375.258 |
| 一般走路 | 0／0 | 0／0 | 0→0 | — | 74.987 |
| 近戰前衝 | 0／0 | 0／0 | 0→0 | — | 11.382 |

wb_a2、wr_a3 均≥0.3秒且≥改前2倍；探針已加正式斷言。控制組位移分別>20px、>5px且殘影幀數必須為0。三招峰值4496.399px/s；走路物理速度峰值4.588（一般走路主要更新px/py）；前衝峰值540。

原始資料：tools/ui-e2e/out/dash-afterimage/before.json、after.json。改後wr_a3降速第一幀alpha=0.5，接著0.472222、0.444444、0.416667、0.388889；降速後0.15秒約0.25。浮點時間在壽命尾端可能多採到一幀極小正alpha，表格保留實測31幀。

## R2-1：實作與常數

- LINGER_SEC=0.3：高速約0.2秒，加0.3秒停留，實測可見0.516667秒。
- LINGER_MIN_PEAK_SPEED=600：高於前衝540與走路4.588，低於實測衝刺4496.399；判斷採渲染觀測到的峰值，沒有新增模擬欄位。
- 保留MAX_GHOSTS=4、STRIDE=2、GHOSTS_BY_TIER=[4,3,2,1]；停留已達標，不必增加繪製量。

UnitFrameStore 以Agent物件為鍵保存最後一組高速殘影的世界x、繪製Y、z與原alpha。降到既有300門檻後，以battleTime線性淡出，暫停不流逝。每幀減去目前footX/floorY成局部偏移，不重新取高度，因此單位走開或高度改變不拖走殘影。新高速軌跡取代舊記憶。

每單位首次高速時配置固定槽位，之後重用，不為每幀／每個殘影新增物件。死亡、移除、隱藏、變羊、拖曳時清除；battleTime回捲視為新戰鬥，也清除。同長度roster替換亦會清理舊單位。

RenderPipeline僅增加frames.build的既有t參數，不讀Date.now／performance.now。RenderSpec §10及UnitFrame方框檔頭同步更新。Afterimage純計算與painter的既有偏移／alpha介面足夠，不需修改。

新增11項測試：單調淡出、壽命結束、暫停、世界x／繪製Y／z固定、低峰值不停留、移除／死亡／隱藏等清理、新軌跡替換及槽位重用、戰鬥時鐘重設。

## 每個任務改動檔案

| ID | 檔案 |
|---|---|
| R2-0 | tools/ui-e2e/dash-afterimage-probe.mjs（新增） |
| R2-0b | 同探針：診斷欄位、清障礙物雜湊、雙方隊伍斷言；無產品端根因修補 |
| R2-1 | constants/units.ts；engine/renderers/frame/UnitFrame.ts；engine/renderers/RenderPipeline.ts（僅build參數）；engine/renderers/RenderSpec.ts；tests/AfterimageGhosts.test.ts；tests/constants-snapshot.json；探針的驗收斷言與截圖 |
| R2-2 | 無產品檔案；產生gitignored驗證產物 |
| REPORT | docs/R2_DASH_AFTERIMAGE_REPORT.md（覆寫） |

## 指令、退出碼、log

以下log皆位於tools/ui-e2e/out/agent-logs/。長指令用run.mjs --detach，再--wait直到STATE=DONE。WMI拒絕後wrapper的spawn fallback正常完成。無尚在執行的指令。

| 指令 | 時點 | 退出碼 | log |
|---|---|---:|---|
| npm run lint | 改前 | 0 | r2-pre-lint.log |
| npx vitest run --exclude "**/AgentRunner.test.ts" | 改前 | 0，93files／818tests | r2-pre-test.log |
| npm run build | 改前 | 0 | r2-pre-build.log |
| node tools/ui-e2e/dash-afterimage-probe.mjs --tag=before | 場景診斷 | 1（走路未移動，已修正） | r2-before-v2.log |
| node tools/ui-e2e/dash-afterimage-probe.mjs --tag=before | 有效改前 | 0 | r2-before-v3.log |
| npm run lint | 改後 | 0 | r2-lint.log |
| npx vitest run --exclude "**/AgentRunner.test.ts" | 改後 | 0，93files／829tests | r2-test.log |
| npm run build | 改後 | 0 | r2-build.log |
| node tools/ui-e2e/dash-afterimage-probe.mjs --tag=after | 改後 | 0 | r2-after-probe.log |
| node tools/ui-e2e/runtime-smoke.mjs | 改後 | 0 | r2-smoke.log |
| npm run perf:guard | 改後 | 0 | r2-guard.log |
| npm run verify:coords | 改後額外 | 0 | r2-coords.log |
| git -c safe.directory=C:/Git/_wt_r1 diff --check | 改後 | 0 | 無（直接執行） |

上一回合的r2-before-probe.log（初版採樣，0）與r2-final-{lint,test,build}.log（初版探針後，各0）保留，但初版數據由before-v3取代。上一回合node --check tools/ui-e2e/dash-afterimage-probe.mjs退出0，無log。完整npm test依指令排除AgentRunner，待主代理在沙盒外補跑。

runtime-smoke：10單位、running=true、battleTime 0.52→4.57秒、0 page errors、canvas改變。build僅有既有bundle大小警告。

| 保真場景 | meanAbsDiff | 結果 |
|---|---:|---|
| VOID | 0.216 | PASS |
| FOREST | 0.651 | PASS |
| ICE | 0.253 | PASS |
| MAGMA | 0.249 | PASS |
| DESERT | 0.530 | PASS |
| battle_frozen | 0.001（strict 0.0012） | PASS |

五地形皆通過，沒有待判斷的保真失敗。產物在tools/ui-e2e/out/fidelity/。perf A/B五場景皆通過，baseline/no_grain=4.17ms、ratio=1.00，僅是本次headless guard數據。

verify:coords的VOID／MAGMA float皆PASS，退出0；也記錄54489個貼地樣本中的1次移動中下陷（FOREST seed=1001）、排序振盪觀測。詳見tools/ui-e2e/out/coord_guard.json與log。本輪未改地形／排序，不追修這些範圍外觀測；零退出碼不代表零觀測。

## 截圖路徑

以下六張均已開圖檢視。during取至少三個殘影且仍高速的幀；after150ms取首次降到300門檻以下後9幀。既有鏡頭會改變縮放，圖不是像素座標對比基準；世界座標固定由單元測試驗證。

- tools/ui-e2e/out/dash-afterimage/wb_a2_during.png
- tools/ui-e2e/out/dash-afterimage/wb_a2_after150ms.png
- tools/ui-e2e/out/dash-afterimage/wr_a3_during.png
- tools/ui-e2e/out/dash-afterimage/wr_a3_after150ms.png
- tools/ui-e2e/out/dash-afterimage/mb_a3_during.png
- tools/ui-e2e/out/dash-afterimage/mb_a3_after150ms.png

未達標項目：本輪指定驗收無。完整npm test的AgentRunner依任務排除，待主代理補跑；未commit。