# COORD-R1：排序距離尺度與遮擋驗證工具

日期 2026-10-25，產品基底 f08bb75。前次 push 已確認成功，feat/project-cleanup 本機與遠端一致。本次主代理只做隔離實驗及設計文件，未修改產品程式。

本次文件變更範圍：本設計、COORD_R1_AGENT_PROMPT、COORD_R1_EVIDENCE.json、NEXT_PLAN、HANDOFF、AUDIT01_FINDINGS。原始大體積取證保留在 tools/ui-e2e/out/；不改歷史清冊完成數。

## 已定位：兩種距離尺度衝突（COORD-OSC-01，P2/D3）

HexUtils.fromPx 經 HexMath.pixelToHex 先把 Y 除以 ISO_SCALE_Y（目前0.5），再做 cubeRound，所以格界定義在未壓扁平面。UnitFrameStore.resolveSortHex 卻以壓扁後的 toPx 格心直接算歐氏距離；兩者對「更接近哪格」的判定不一致。

修正後 trace 的 VOID1002、C:RED-0010：f508 因 still=12 一次性釋放到(1,2)，f510 腳點只有微小移動且仍在格界附近，排序卻跳回(2,1)。f510 的現行投影距離為23.1930對39.8072；還原Y尺度後兩者均為45.866229（浮點誤差範圍）。現行差距16.6142大於 HEX_HYSTERESIS_PX=3，因而跳回；正規平面沒有這個優勢。

產品沒有 cOld.y typo；該誤報已於 f08bb75 撤回。這次修的是度量尺度，不是那個不存在的 typo，也不需要截斷 deathMotion 或永久鎖定屍體格子。

## 隔離實驗結果

以 Vite load override 僅在記憶體替換 UnitFrame 的兩個距離算式：

```ts
Math.hypot(footX - center.x, (footY - center.y) / ISO_SCALE_Y)
```

其他規則／常數／產品檔案不變。資料來自 coord-metric-ab.log、out/coord-metric-ab/results.json。

| 地圖/seed | static 原→候選 | oscillation events 原→候選 |
| --- | --- | --- |
| FOREST/1001 | 6→0 | 22→18 |
| FOREST/1002 | 0→0 | 9→8 |
| VOID/1001 | 0→0 | 9→5 |
| VOID/1002 | 4→0 | 9→3 |
| MAGMA/1001 | 0→0 | 13→8 |
| MAGMA/1002 | 4→0 | 6→1 |
| 合計 | **14→0** | **68→43** |

每景600幀、各自獨立 context；sink維持1、void維持1，沒有瀏覽器錯誤。這些是事件數，不是所有情境的正確性保證；剩餘移動中翻轉不能一律當bug。

另以真實 UnitFrameStore.build 做 FLAT/POINTY 與非零 offset 的可控案例：格界兩側0.005平面單位的微移動，原版釋放後跳回、候選維持；真正回到舊格中心及瞬移至(5,5)都仍切換。記錄見 coord-metric-geometry.log 與 geometry.json。

## 新發現：depth oracle API 過時（COORD-TOOL-01，P2/D1）

tools/ui-e2e/lib/depth-oracle.mjs:obstacleBox 把 SpriteManager.getObstacleSprite 回傳物當 Canvas 呼叫 getContext，實際已是 ObstacleSprite 物件。現行 RenderDispatcher 讀 image、可選 atlas crop、width/height、anchorX/Y、q/r變體及battleTime影格。oracle 同時仍用 ENV_SPRITE 固定錨點，不能只修到不崩潰。

穩定遮擋 A/B 未完成：coord-metric-order-ab、coord-metric-order-ab2 均 EXIT=1，cv.getContext is not a function。第二次隔離相容腳本的多行替換未匹配CRLF，實際仍呼叫舊API，不能把它當作候選工具已驗證。依兩次失敗規則停止此量測，將工具修復列為下一輪第一工作包。

## 核准的實作邊界

1. A先修oracle，驗證程序化／圖集裁切／不同錨點與變體，保留原alpha門檻、幾何規則與違規門檻。產品程式不動。恢復可靠的before量測。
2. B才修UnitFrame兩個距離的Y尺度，數值常數不變，更新相應距離單位註解、RenderSpec與回歸測試。保留靜止釋放、累積移動重置、teleport和腳點死區，不改死亡運動。
3. B交付前必須完成穩定遮擋before/after與現有完整渲染驗證；本設計只核准局部演算法，沒有預先認定所有驗收已通過。

sink、void、完整清冊仍保留待辦。本輪不夾帶高度clamp、速度過濾、技能／奧義／平衡改動。
