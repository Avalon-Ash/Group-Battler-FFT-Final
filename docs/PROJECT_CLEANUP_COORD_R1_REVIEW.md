# COORD-R1 主審結論（2026-10-25）

證據：`tools/ui-e2e/out/coord-r1-{before,after,asym}/coord_guard.json`。三次都用 COORD-R1 提示詞 §4 的同一組設定，判定數都是 701,554；對照腳本會逐組列出。

## 決定

```
kept    -> A：oracle 取樣 ObstacleSprite (96b5ea5) -> 和 RenderDispatcher 的 OBSTACLE 分支一致（q/r 變體、battleTime 影格、裁切、anchorX/Y）；空 alpha 遮罩會報錯；crafted 棋盤 FLAT/POINTY 都是 0 違規
revised -> B：未壓扁平面距離 (8f7ef65) -> 保留距離尺度；改由 cc056b0 加上非對稱滯後，並規定原始格穩定不變才放開
```

## 報告更正

`PROJECT_CLEANUP_COORD_R1_REPORT.md` §2.3 的組別數字和原始 JSON 不符。JSON 裡沒有 UNIT×TERRAIN 這一組，報告寫的「CORPSE×TERRAIN 5→1」也不對。實際數字如下：

| 穩定錯序 episodes（pair-frames） | before | 8f7ef65 | cc056b0 |
| :-- | :-: | :-: | :-: |
| CORPSE×TERRAIN footprintY | 4 (49) | **15 (94)** | 0 |
| CORPSE×TERRAIN sortBias | 5 (17) | 1 (3) | 6 (20) |
| CORPSE×HAZARD footprintY | 1 (11) | 5 (26) | 0 |
| CORPSE×HAZARD sortBias | 1 (3) | 0 | 1 (3) |
| TERRAIN×UNIT footprintY | 5 (18) | 2 (6) | 0 |
| HAZARD×UNIT footprintY / sortBias | 2 / 1 | 2 / 0 | 0 / 0 |
| **合計** | **19 (111)** | **25 (135)** | **7 (23)** |
| wrongFrames | 308 | 287 | 131 |
| static 振盪 | 7 | 1 | 1（VOID/1002 UNIT×VFX，三版都有） |
| 振盪 events（含 static） | 83 | 86 | 93（CORPSE×VFX 37→43 最多） |
| sink / void | 1 / 1 | 1 / 1 | 1 / 1 |

## 根因（8f7ef65 的回歸）

FOREST/1001 的屍體 BLU-0007 在第 450～600 幀停在 (3.9, −22.9)，正好落在 (0,0) 與 (1,−1) 的格界上：到兩格心的未壓扁距離是 45.97 對 45.90。對稱滯後讓它停在後格；靜止放開的那一次又剛好用在原始格還是 (1,−1) 的那一幀，結果整段時間都被自己腳下的地塊 (0,0) 蓋住。舊的投影距離剛好偏向前格，所以之前沒出現。

修法：進入前格立即切換。格界上排在前格時，地塊遮擋一定正確；退回後格或同列側移才保留滯後。另外，原始格還在變動時不累計靜止幀。

## 剩餘

- CORPSE×TERRAIN sortBias 6 段，全部是同一具屍體在同一個格界、每段 3～5 幀，before 就有其中 5 段。oracle 把它判在後格，產品把它判在前格；格界上兩種判法各有一邊算違規。
- 移動中振盪多了約 1 成，主要是死亡滑行時的 CORPSE×VFX；沒有出現 static 振盪。這輪不處理。
- 驗證：lint、test（788 個）、build、runtime-smoke、perf:guard 全過（battle_frozen 差異 0.000）。
