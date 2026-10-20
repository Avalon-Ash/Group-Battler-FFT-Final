# 座標／排序執行期守門員：量測結果（只有證據，沒有修正）

> 日期：2026-10-17。基底：`main` @ `384dd22`（座標協議 v2 合併後）。工具：`tools/ui-e2e/coord-guard.mjs`（`npm run verify:coords`），探針邏輯在 `tools/ui-e2e/lib/coord-probes.mjs`。
> 這份文件只提供證據與假說；沒有改任何 `engine/`、`components/`、`data/`、`constants.ts`。下一輪依這裡的數字修。

## 1. 結論（先看這段）

| 檢查 | 結果 |
| :-- | :-- |
| `--float`（VOID、MAGMA） | **通過**。3 個單位、90 幀，地塊確實在浮，單位與腳下地塊的繪製 Y 差恆定。 |
| `--sink`（6 場種子對戰） | **0 次陷地**（56,661 個著地單位樣本，地形高度 0～144）。另有 **1 個單格幀**「活著、著地、腳下沒有 TERRAIN op」（VOID 種子 1003，地塊剛塌陷、`physics.z` 才 −0.19）。 |
| `--flicker`（6 場對戰＋2 個閒置棋盤） | **有，而且很多**：42,803 次相對順序翻轉，其中 **3,346 次震盪事件**（A<B、B<A、A<B 落在 8 幀內，2,841 段），**1,024 次兩個 op 都沒移動超過 2 px**。閒置編輯棋盤 0 次。 |

「使用者說一直在閃」被量到了，而且**主因不是座標高度，而是排序鍵**：

1. **貼地法陣抬升（`RenderList.sort` 的 decal lift）**造成 2,845／3,346（85%）。關掉它（實驗旗標 `--no-decal-lift`），震盪事件 3,346 → 740，靜止事件 1,024 → 75。
2. 剩下的 740 次由 `sortBias` 鋸齒（194）、空中 VFX 的 z 加權（313）、單位 `physics.y` 抖動（233）構成。

目前結果代表「繪製順序在重疊的物件之間來回切換」的上限；是否每一次都肉眼可見，要看兩者畫面像素是否真的重疊，修正輪請用截圖確認（見 §6 的重現座標）。

## 2. 指令與環境

```bash
npm run verify:coords                       # 預設：float + sink + flicker，3 個種子、每場 20 秒、FOREST 與 VOID，約 45～50 秒
npm run verify:coords -- --assert           # 有任何違規就 exit 1（目前會失敗：1 次 void 樣本、3,346 次震盪）
node tools/ui-e2e/coord-guard.mjs --flicker --no-decal-lift   # 實驗：停用 decal lift，證明它的占比
node tools/ui-e2e/coord-guard.mjs --sink --injectSink=6        # 負對照：把單位 op 下移 6 px，應該大量違規（已驗證會觸發）
```

旗標：`--float --sink --flicker`（不指定則全跑）、`--seeds=N`（預設 3）、`--seedStart=1`、`--seconds=S`（預設 20）、`--biomes=FOREST,VOID`、`--fxfx`（連粒子對粒子也算）、`--floatFrames=90`。輸出 `tools/ui-e2e/out/coord_guard.json`（被 gitignore，本文件的表是它的摘要）。

場景：headless msedge、1600×900、`?mute&quality=0`；每場 12 單位（6v6、隨機職業、HP 1500～2000）、地圖 12×10（半徑 7）、區域縮圈 `initialRadius 8`／`shrinkInterval 3`／`minRadius 1`、導演攝影機關閉；種子 1001～1003（`__resetSeed`，與 `render-fidelity`／`br-soak` 同一套步進 harness）。FOREST 與 VOID 各 3 場；閒置棋盤各 240 幀（VOID 另外驅動 `battleTime` 讓地塊浮動）。

量測點：包住 `RenderList.prototype.sort`，每幀排完序後讀整份 `ops`（與 `RenderPipeline.drawWorld` 依序 dispatch 的順序一致）。這樣可以同時讀到 `sortKey`、`y`、`sortBias`、`z`、`isGround`、`gHalfH`。

與任務書的差異（都是為了避免誤報）：

- **sink 公式**：任務書寫 `unitOp.ty > terrainOp.ty − terrainOp.th + 1`，但單位的腳不在格心，直接比會把「腳離格心的 Y 偏移」誤判成陷地（第一版就誤報 244 次）。實作改成 `unitOp.ty > terrainOp.ty − terrainOp.th + (unitOp.y − terrainOp.y) + 1`，等價於「格高 − 單位腳下高度」（漂浮地圖還會抓位移不一致）。負對照 `--injectSink` 確認會觸發。
- **粒子對粒子（VFX×VFX）預設不算**（`--fxfx` 才算）：它們之間的先後不屬於座標協議，而且量很大。
- **轉場位移**：判斷 IDLE 的方式是「前 20 個 TERRAIN 的 `op.y` 是否等於 `HexUtils.toPx` 的格心 Y」，6 場對戰 0 幀被判成轉場中。
- **harness 小發現**：`br-soak.mjs` 的 `__resetSeed` 會把 `syntheticTime` 倒回 1000，但遊戲迴圈的 `lastTime` 還留著上一場，`dt` 變負，**第二場起模擬停在 battleTime=0 很久**。`coord-probes.mjs` 的 harness 讓時鐘單調遞增。`br-soak` 沒有改（不在範圍）；它連跑多個種子時第二場起可能沒有真的在跑，值得下一輪確認。

## 3. float 與 sink 結果

| 檢查 | 結果 |
| :-- | :-- |
| float VOID | PASS：3 單位、90 幀、地塊 Y 有起伏（bobbing=true）、單位間距恆定 |
| float MAGMA | PASS：同上 |
| sink | 6 場、66,005 個活單位樣本；56,661 個著地（`−1 ≤ physics.z < 1`）；166 個墜落中略過；**陷地 0（移動中 0、靜止 0）**；腳下格 ≠ 邏輯格 0 次 |
| over-void | **1 個樣本**：VOID／1003，`BLU-0007`，第 659 幀，腳下格 (2,3)、邏輯格 (3,3)，`physics.z=−0.19`、HP 700、非移動中，`map.isValid` 兩格都是 false、不在 `collapsingTiles`。解讀：地塊已從 `cache.tileList` 移除、單位才剛開始掉（z −0.19），單格幀。幾乎無害，但 `--assert` 會因此失敗；修正輪可決定要放寬成「連續 ≥2 幀」。 |

## 4. flicker 結果

### 4.1 依型別組合（預設，6 場對戰＋2 個閒置棋盤）

欄位：重疊的配對數／發生過翻轉的配對／有震盪的配對／震盪事件／段數（連續事件合併）／兩者皆未移動 >2 px／至少一方移動 >2 px／driver 為各項的事件數。driver 是「兩次翻轉之間，哪一項排序輸入讓 `keyB − keyA` 變動最大」。

| 型別組合 | 配對 | 翻轉配對 | 震盪配對 | 事件 | 段 | 靜止 | 移動 | decal lift | z 加權 | sortBias | y |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| UNIT×VFX | 64187 | 15565 | 1643 | **1902** | 1677 | 602 | 1300 | 1843 | 21 | 10 | 28 |
| CORPSE×VFX | 6087 | 1480 | 255 | 363 | 259 | 7 | 356 | 341 | 6 | 16 | 0 |
| TERRAIN×UNIT | 2582 | 596 | 132 | 221 | 193 | 134 | 87 | 213 | 0 | 5 | 3 |
| TERRAIN×VFX | 227252 | 4632 | 125 | 151 | 125 | 7 | 144 | 0 | 109 | 0 | 42 |
| OVERLAY×UNIT | 1773 | 449 | 81 | 126 | 95 | 77 | 49 | 115 | 0 | 10 | 1 |
| UNIT×UNIT | 191 | 125 | 55 | 100 | 78 | 50 | 50 | 92 | 0 | 2 | 6 |
| HAZARD×UNIT | 835 | 341 | 68 | 96 | 86 | 46 | 50 | 96 | 0 | 0 | 0 |
| AURA×VFX | 36977 | 1279 | 52 | 78 | 53 | 33 | 45 | 0 | 10 | 0 | 68 |
| OVERLAY×VFX | 127503 | 2316 | 65 | 74 | 65 | 4 | 70 | 0 | 62 | 0 | 12 |
| HAZARD×VFX | 76716 | 2905 | 60 | 62 | 60 | 3 | 59 | 0 | 55 | 0 | 7 |
| AURA×UNIT | 395 | 170 | 34 | 47 | 41 | 27 | 20 | 47 | 0 | 0 | 0 |
| CORPSE×UNIT | 101 | 47 | 23 | 34 | 29 | 7 | 27 | 31 | 0 | 2 | 1 |
| CORPSE×TERRAIN | 516 | 88 | 24 | 28 | 24 | 10 | 18 | 28 | 0 | 0 | 0 |
| OBSTACLE×UNIT | 186 | 81 | 11 | 17 | 16 | 12 | 5 | 17 | 0 | 0 | 0 |
| OBSTACLE×VFX | 13268 | 270 | 9 | 12 | 9 | 1 | 11 | 0 | 10 | 0 | 2 |
| CORPSE×OVERLAY | 306 | 59 | 9 | 12 | 9 | 1 | 11 | 12 | 0 | 0 | 0 |
| AURA×TERRAIN／×HAZARD／×OVERLAY／×CORPSE、CORPSE×HAZARD／×OBSTACLE | — | — | 22 | 23 | 22 | 3 | 20 | 10 | 0 | 0 | 13 |
| **合計** | | | | **3346** | **2841** | **1024** | **2322** | **2845** | | | |

FOREST 3 場 1,601 次、VOID 3 場 1,745 次（兩種地形差不多）。閒置編輯棋盤（FOREST、VOID 各 240 幀）0 翻轉、0 震盪：靜止場景是乾淨的，閃爍只在對戰中出現。

### 4.2 停用 decal lift 的對照（`--no-decal-lift`，同種子同模擬）

| 項目 | 預設 | 停用 decal lift |
| :-- | --: | --: |
| 順序翻轉總數 | 42,803 | 18,182 |
| 震盪事件 | 3,346 | **740** |
| 段數 | 2,841 | 578 |
| 兩者皆未移動 >2 px 的事件 | 1,024 | **75** |
| UNIT×VFX／CORPSE×VFX／TERRAIN×UNIT 事件 | 1902／363／221 | 198／67／10 |
| 剩餘 740 的 driver | — | z 加權 313、y 233、sortBias 194 |

## 5. 假說（每條都指到確切規則與數字）

### H1（主因，85%）：`RenderList.sort` 的「貼地法陣抬升」隨法陣出現／消失／縮放而開關

規則：`engine/renderers/RenderList.ts:159-184`。`gHalfH ≥ VFX_RENDER.DECAL_LIFT_MIN_HALF_H(20)` 的貼地 VFX 視為法陣；站在橢圓範圍內（`dx²+dy² ≤ 1`，用法陣當幀的 `gHalfW`／`gHalfH`）的 UNIT／CORPSE，`finalSortY` 被抬到 `g.y + g.sortBias + 1.0 + 0.01`，其中 `g.sortBias = gHalfH + GROUND_SORT_BIAS(15)`。

證據：

- **抬升量很大**：`lift` 欄位（單位實際 sortKey − 它自己的 `y+sortBias` 鍵）常見 3,000～13,000 鍵單位＝30～130 px。單位的鍵一次跳過整排地塊、障礙、危害與疊層，開關那一幀就翻轉。
- **有法陣的單位幀占比高**：66,005 個活單位樣本裡 20,030 個（30%）被抬升。
- **法陣壽命短、一直換**：6 場共 1,467 個符合條件的法陣（1,450 個 `PART_GROUND` 零件、17 個 `SHOCKWAVE`），壽命中位數 11～30 幀，4～10 幀 545 個、11～30 幀 780 個、>30 幀 140 個；0 個有提交缺口（所以不是剔除造成的閃爍，是真的生滅）。
- **邊界與縮放**：UNIT×VFX 的 1,843 次抬升事件裡，79%（1,463）的法陣半寬在這 3 幀內變動 >2%（零件法陣有 `PartPainter.scaleAt` 的縮放動畫），33%（602）單位在橢圓邊緣 ±25% 內；79%（1,455）的「最近法陣」在事件期間換了一個。其他組合比例相近。三者合起來就是「站在邊界的單位被縮放中的橢圓一下包進去、一下排出來」，以及「一個法陣消失、下一個零件法陣在同位置出現」。
- **範例（種子 1001、FOREST、`U:RED-0002`，位置 y=−36 幾乎不動，移動 0.02 px）**：
  - 第 89 幀：最近法陣 `PART_GROUND` 半寬 61.4、`d²=0.00` → lift 4,670、sortKey 1,001,116，排在前方地塊 `T:1,0`（key 1,000,010，y=0）之後。
  - 第 90 幀：該法陣消失，最近的是 `SHOCKWAVE`（`d²=25.5`，範圍外）→ lift 0、sortKey 996,446，排回地塊之前（鍵差 +3,564）。
  - 第 93 幀：又一個 `PART_GROUND` 出現（半寬 42.4，`d²=0.00`）→ lift 3,720、sortKey 1,000,166，再度排在地塊之後。同一個靜止單位在 4 幀內 後—前—後，鍵差 −1,106／+3,564／−156。
- **單位對單位的平局**：UNIT×UNIT 61 次「鍵差 <0.05」的平局，有 56 次兩個單位**都被抬升**（同一個法陣，鍵被設成同一個值 `g.y+g.sortBias+1.01`），先後只剩 `idHash*0.00001`。例：`RED-0006`（y=36）與 `RED-0004`（y=72）在同一法陣內，第 287 幀兩者鍵都是 1,014,829，原本 y 較小（較後面）的單位應先畫，現在只剩 id 雜湊決定。
- 屍體同理：CORPSE×VFX 363 次、341 次由此觸發（例 `C:BLU-0005` 在法陣邊緣 `d²` 1.61→1.45→0.96，sortKey 1,005,321→1,005,321→1,007,098，同時法陣自己的 `sortBias` 由 84.5 長到 105）。

### H2：單位／屍體的 `sortBias` 是鋸齒函數（格界上有最大約半格的不連續）

規則：當時的 `UnitSystem.ts`（現 `engine/presentation/unit/UnitSystem.ts`），`sortBias = max(0, 腳下格格心Y − 腳Y)`；RenderSpec §2 寫的是「腳跨過格界進入前方格時，排在該格地塊之後」。這讓鍵 `y + sortBias` 在格內是常數（等於格心線），一跨格界就掉到新格自己的 `y`，反向則往上跳，不連續量約 20 px（2,000 鍵單位）。

證據（停用 decal lift 後仍剩的 194 次 sortBias 驅動事件）：CORPSE×UNIT 54、CORPSE×VFX 63、UNIT×VFX 61、TERRAIN×UNIT 7、OVERLAY×UNIT 7。

- 範例（種子 1002、`U:BLU-0007` 飛行單位 z≈70 對 `C:BLU-0005` 屍體）：第 289、290、291、294 幀單位 y=53.48→52.34→51.50→50.48，`sortBias` 0→0→**20.5**→0，sortKey 1,005,393→1,005,279→**1,007,246**→1,005,094；屍體固定約 1,005,319。單位沿著格界走，1 px 的 y 讓鍵跳 +19.6 px 又跳回，與屍體的順序連翻 3 次（鍵差 −74／+40／−1,927／+226）。
- 範例（種子 1001、擊飛屍體 `C:RED-0002` 對 `SHARD`）：屍體 y=−46.3、sortBias 10.3 → y=−50.95、sortBias 14.95，鍵都是 996,498（鎖在格心線）；下一幀跨進後方格 y=−63.2、sortBias 0，鍵掉到 993,778（−27 px）。往螢幕上方飛的屍體，鍵「先不動、再突然掉一格」，剛好從 SHARD 的鍵（996,946→996,384→994,753）兩側穿過去。

### H3：空中 VFX／投射物的 `z` 加權（`op.z * 20`，z==0 時固定 +60）與 `y*100` 互相抵銷

規則：`engine/renderers/RenderList.ts:224-232`。鍵 = `(y+1+10000)*100 + 50 + 20*z`（z>0）；`z==0` 則是 `+60`。沿 y 方向 1 px = 100 鍵單位，沿 z 方向 1 px = 20，但碎片／火花往下掉時 `dz` 可達 −6～−9 px／幀、`dy` 約 +0.5～+2 px／幀，`100·dy + 20·dz` 在 0 附近，鍵在配對對手的鍵上下來回。z 掉到 0 時還有一個 +60 的階梯。

證據（停用 lift 後仍有 313 次 z 驅動）：TERRAIN×VFX 109、OVERLAY×VFX 62、HAZARD×VFX 55、UNIT×VFX 63、OBSTACLE×VFX 10、AURA×VFX 10。

- 範例（種子 1001、`PART_DEBRIS` 對 `T:2,3`，地塊鍵固定 1,010,810）：第 282/283/288 幀 碎片 z 45.3→39.3→32.3、y 98.06→98.58→100.70，鍵 1,010,861.8→1,010,793.5→1,010,864.8，與地塊鍵的差 +51.8／−16.5／+54.8：連續 3 次翻轉，地塊沒有動。
- 範例（種子 1002、`PART` 對 `T:−1,−1`）：碎片慢速漂移（y −47.08→−47.11、z 48.4→48.6），鍵差 +0.32／−0.31／+0.01：兩者鍵剛好貼在一起（差 <1 鍵單位），任何小數誤差就翻。
- TERRAIN×VFX 的 151 次裡 144 次至少一方在動（靜止 7）：粒子在動、地塊不動，等著被它穿過去；單次穿越是合法翻轉，問題是它穿越的鍵不單調。

### H4（次要，噪音級）：單位 `physics.y` 抖動約 1 px 對上 0.5 px 的 tiebreak 與相鄰鍵

- CORPSE×UNIT（停用 lift 後 56 次，靜止 16）：屍體 y=0.00、鍵 1,000,098（含 `CORPSE_TIEBREAK 0.5` = 50 鍵單位）；同格的單位 y 在 1.55／0.36／1.36 之間抖動，鍵 1,000,200／1,000,081／1,000,182，每幀翻。抖動 ≥ 0.5 px 就超過 tiebreak。
- y 驅動的 AURA×VFX 68、UNIT×VFX 74：靜止單位 `y=−36.00 → −34.91 → −36.00`（約 1.1 px），鍵 996,446→996,555→996,446，對上間隔 46～64 鍵的 SPARK／PART。

## 6. 重現座標與下一輪建議

- 重現（確定性）：`FOREST` 種子 1001，第 89～93 幀看 `U:RED-0002`（H1，單位靜止、法陣生滅）；`FOREST` 種子 1002 第 289～291 幀看 `U:BLU-0007`／`C:BLU-0005`（H2）；`FOREST` 種子 1001 第 282～288 幀看 `PART_DEBRIS`／`T:2,3`（H3）。步進方式見 `lib/coord-probes.mjs` 的 `setupBattle`／`stepFrames`；每個事件在 `coord_guard.json` 的 `flickerGroups[].exStatic／exMoved` 有 3 幀的完整排序輸入。
- 修正輪的驗收：`npm run verify:coords -- --assert` 的震盪事件要大幅下降（先看靜止事件 1,024 → 接近 0，再看總數），sink 維持 0；`perf:guard` 與保真基準照常跑（排序規則一動，單格保真基準可能需要說明）。任何修正不要放寬閾值，要的是讓鍵對時間連續（例如對 lift 加遲滯或讓法陣範圍判定與壽命脫鉤，對 sortBias 與 z 加權設計單調鍵）。
- 若要確認肉眼可見：對 §6 的座標在震盪幀區間逐幀截圖，比較重疊的兩個 op 是否真的像素重疊。
- 副帶發現（不屬於本輪）：`tools/ui-e2e/br-soak.mjs` 的時鐘倒退問題（§2）。

## 7. 修正結果（H1、H2；2026-10-17，分支 `claude/keen-faraday-6d08d6`）

修法：H1 → 貼地鋪設（`engine/renderers/GroundDrape.ts`，RenderSpec §9）；法陣抬升已刪。H2 → `UnitFrameStore` 的排序用腳下格滯後（`UNIT_FRAME.HEX_HYSTERESIS_PX`＝3，RenderSpec §2）。H3、H4 未動。同一套種子、同一個探針（閾值與定義沒改）：

| 項目 | 修正前 | 修正後 |
| :-- | --: | --: |
| 順序翻轉總數 | 42,793 | 14,940 |
| 震盪事件 | 3,340 | **647** |
| 段數 | 2,841 | 564 |
| 兩者皆未移動 >2 px 的事件 | 1,024 | **61** |
| float VOID／MAGMA | PASS | PASS |
| sink 違規（腳陷地） | 0 | 0（另有同一個單格 over-void 樣本，未變） |

剩餘 647 依型別組合：UNIT×VFX 199、TERRAIN×VFX 151、AURA×VFX 78、OVERLAY×VFX 74、HAZARD×VFX 62、CORPSE×VFX 26、OBSTACLE×VFX 12、TERRAIN×UNIT 11、其餘共 34。幾乎全是「空中粒子 × 某物」：driver 以 z 加權（H3）與單位／粒子 y 抖動（H4）為主；靜止的 61 件中 AURA×VFX 33、UNIT×VFX 10、TERRAIN×VFX 7、OVERLAY×VFX 4、HAZARD×VFX 3，其餘 4。UNIT×UNIT 100 → 6、CORPSE×UNIT 34 → 4。

## 8. 修正結果（H3、H4、AURA；2026-10-18，分支 `claude/draw-residuals`，基底 `main` @ `7d9cf60`）

同一套種子、同一個探針（`npm run verify:coords`，閾值與定義沒改；探針只更新了「zBoost driver」模型，因為 z 加權已不存在）。表內是各型別組合 `flickerGroups` 的總和。

| 項目 | 修正前 | 修正後 |
| :-- | --: | --: |
| 震盪配對（pairsOscillating） | 578 | **141** |
| 震盪事件／段數（episodes） | 690／582 | **145／141** |
| 靜止事件（兩者皆未移動 >2 px） | 52 | **2** |
| 順序翻轉總數 | 15,575 | 12,955 |
| UNIT×VFX（配對／段／靜止） | 223／224／13 | 93／93／2 |
| TERRAIN×VFX | 89／89／2 | 0 |
| AURA×VFX | 67／69／31 | 6／6／0 |
| HAZARD×VFX | 65／65／4 | 0 |
| OVERLAY×VFX | 42／42／2 | 0 |
| CORPSE×VFX | 39／39／0 | 12／12／0 |
| float VOID／MAGMA | PASS | PASS |
| sink 違規／over-void | 0／0 | 0／0 |

景深預言（`--order --no-crafted`，種子 1001–1003 × FOREST／VOID／MAGMA；補充 1004–1009）：

| | 修正前 | 修正後 |
| :-- | --: | --: |
| 穩定錯序，**不判 AURA**（舊預言） | 61（2,646 幀） | 61 不變（AURA 以外的群組 episode 數逐項相同：74 − 13 個 AURA = 61；幀數差 ≤ 6） |
| 穩定錯序，**判 AURA**（本輪新增） | 361（9,887 幀） | **74（2,700 幀）** |
| 補充種子，判 AURA | 718（16,382 幀） | **249（6,247 幀）** |

### 8.1 H3：空中特效的鍵（`z*20` 與 `+60` 已刪）

- 規則：非貼地 VFX／PROJECTILE／AURA 的鍵 = 足跡 Y（`op.y`，粒子在地面的投影）＋固定 `VFX_RENDER.AIR_SORT_BIAS`（`HEX_SIZE*0.5`，由 `VFXRenderer` 以 `op.sortBias` 提交）；`RenderList.sort` 不再讀 `op.z`（只剩 `z > 600` 的 `+1e8`，投射物 `op.z = 5000 + 高度` 靠它永遠在最上層）。
- 為什麼單調：往下掉的碎片 `y` 不變 → 鍵不變；水平移動 → 鍵單調，對靜止的地塊／單位／疊層最多翻轉一次。舊式 `100*dy + 20*dz` 在 0 附近，鍵在鄰居兩側來回。
- 值為什麼是半格：把「飄在這一格上方」的粒子當作站在該格前緣，所以它排在腳下那格的地塊、危害、障礙、單位之後（和 AURA 原有的 `HEX_SIZE*0.5` 同一把尺），又不越過前方整列（列距 36～41.6 px）。
- 效果：TERRAIN×VFX 89→0、HAZARD×VFX 65→0、OVERLAY×VFX 42→0（原本都是 z 驅動）。規格：RenderSpec §1、§2、§7。

### 8.2 H4：單位 `physics.y` 抖動的根因與處理

- **根因（量到的）**：不是 bug，是受擊後退。`SkillExecutor` 對受擊者 `PhysicsEngine.applyImpulse(…HIT_IMPULSE_MIN)`，`PhysicsEngine.stepPhysics` 的彈簧使 `physics.y` 在約 5～8 幀內擺盪 1～2 px（探針 `tools/ui-e2e/unit-jitter-probe.mjs`：種子 1001/1002 的 14 筆「靜止」單位 `py + physics.y` 變動 0.3～1.05 px，全部 `hitFlashTimer > 0`、`vy` 由 ±98 衰減到 0；另有 `finalizeMove` 的 ±4 px/s 隨機推擠）。這是刻意的受擊回饋，真實位移，不能拿掉；問題只在連續的排序鍵會被它推過鄰居的鍵（屍體 0.5 px 平局值、粒子）。
- **處理**：`UnitFrameStore` 的排序用腳點 Y 加死區 `UNIT_FRAME.SORT_DEADBAND_PX = 2`（離上次採用值不超過死區就不動，超過才跟隨，落後 ≤ 2 px）。只作用在排序鍵；`op.y`／`op.ty`（繪製）仍是真實腳點。鍵 = `max(濾波腳點, 腳下格格心)`，所以單位永遠不會排到自己腳下那格地塊之前（`sortBias` 因此可為 ≥ −2 的小負值）。AURA 讀同一個濾波值（`UnitFrame.sortFootY`）。
- 效果：靜止事件 52 → 2；UNIT×VFX 靜止 13 → 2。測試：`tests/CoordinateProtocol.test.ts` 的「sort foot deadband」。

### 8.3 AURA：用證據決定（去掉高度加成）

做法：`depth-oracle.mjs` 新增 AURA 判定。AURA 是掛在施法者身上的空中效果（光環畫在身體中心 `AGENT_MODEL_CENTER_Z`，蓋在施法者上），所以以足跡點判定，和空中 VFX 同一條規則：同格排在 TERRAIN／HAZARD／OBSTACLE／UNIT（含施法者）／CORPSE 之後；對其他格用直欄規則；對其他單位／屍體比足跡 Y（差 ≥ `HEX_SIZE/2` 才判，那是光環自己的前緣）；輪廓是身體中心高度的六角環（偏小，只會少算重疊）。`--orderSim=noEA` 在頁面內模擬「AURA 不加 `h*0.7`」。

| 景深預言（判 AURA） | 現況（`h*0.7`） | `noEA` 模擬 | 實作後 |
| :-- | --: | --: | --: |
| 種子 1001–1003 穩定錯序 | 361 | 70 | **74** |
| 補充種子 1004–1009 穩定錯序 | 718 | 225 | **249** |
| AURA 群組（穩定）：AURA×UNIT／×TERRAIN／×OBSTACLE／×HAZARD／×CORPSE | 127／80／69／11／13 | 0／7／1／1／0 | 0／7／1／5／0 |
| AURA×OBSTACLE 有 ≥100 px² 真實不透明重疊（hTerm 群組） | 68／68 個 | 1／1 | 1／1 |

結論：**去掉。** `h*0.7` 在高地上把光環排到前方一整列的地塊、樹、危害之後（光環蓋在樹／危害上，樹幹應該蓋住光環下半部），與障礙物、危害同一個錯誤；去掉後只剩前緣偏移造成的少量殘留（13 個 episode，光環固定前緣與單位 hex 提升的差）。`TERRAIN_SORT_SCALE` 常數與 RenderSpec 的 `terrainSortY` 一併刪除（沒有任何 op 的排序 Y 再含高度）。

### 8.4 限制

- UNIT×VFX 剩 93：driver 以單位 `sortBias`（走過格心線時的轉折）與粒子 y 為主，兩者都在動，屬真實穿越。
- 預言仍判不到光環的 AOE 指示器（圓形範圍蓋到鄰格）；它是一張橫跨多格的平貼圖，長遠該走 RenderSpec §9 的鋪設，不在本輪。
- 預言的 AURA 輪廓只用身體環；上升粒子與詠唱聖域更大，所以數字偏保守。

## 9. 腳下格滯後的靜止放開（2026-10-19，`main`）

- 現象：景深預言（`coord-guard --order`，FOREST／VOID／MAGMA × 種子 1001–1003）穩定錯序 110 段，其中 CORPSE×TERRAIN sameHex 70 段：屍體擊飛滑停在格界後方 3 px 內，`resolveSortHex` 的滯後讓排序格一直停在上一格，鍵（腳點 96.3）低於自己腳下那格地塊的鍵（格心 108），整段 5.5 秒殘留都被那格頂面蓋住腳。違反 RenderSpec §2「鍵永遠不低於腳下格格心」。
- 修法：腳點連續 `UNIT_FRAME.HEX_RELEASE_FRAMES`（12）幀待在同一個錨點 `STILL_PX`（0.5 px，累積位移）內就採用實際所在格；每次靜止只放開一次（腳正好壓在格界時原始格會隨次像素抖動來回跳）。`tests/CoordinateProtocol.test.ts` 新增回歸測試。
- 試過不採用的：用每幀位移判靜止（慢速行走每幀 < 0.25 px 會被當成靜止，滯後失效）；放開後不鎖（閃爍 53 → 753）；屍體完全不做滯後（預言 29 段最好，但屍體確實會在格界抖動，閃爍 → 1057）。

| 指標 | 修正前 | 修正後 |
| :-- | --: | --: |
| 預言穩定錯序 episodes／pair-frames | 110／1,727 | 106／668 |
| 其中 CORPSE×TERRAIN sameHex（最長段） | 70（253 幀） | 68（多為 3～5 幀，最長 52） |
| 預言錯序 pair-frames 合計 | 2,164 | 1,103 |
| verify:coords 振盪事件（靜止） | 53（2） | 57（2） |
| sink 違規 | 0 | 0 |

剩下的屍體錯序是擊飛末段的慢速滑行（錨點每幾幀就重設），每段只有數幀。保真 battle_frozen 不變（0.09%）。

