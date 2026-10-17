# 深度排序正確性：穩定錯序量測（只有證據，未改引擎）

> 2026-10-18。基底：`main`（已含地面鋪設與格子遲滯，`RenderList` 的法陣抬升已移除）。
> 先前的 `verify:coords --flicker` 只抓得到「順序來回跳」；每幀都畫錯的配對它看不見。這份文件用幾何預言（oracle）逐幀判定「任何重疊的配對」。
> 工具：`tools/ui-e2e/lib/depth-oracle.mjs`；入口 `node tools/ui-e2e/coord-guard.mjs --order`。引擎、`components/`、`data/`、`constants.ts` 一行未改，全部在頁面內 monkey-patch。

## 1. 結論（先看這個）

1. **唯一的主因是 `GridRenderStrategy` 給 OBSTACLE／HAZARD 的 `op.y = 足跡 Y + h * TERRAIN_SORT_SCALE(0.7)`。** 單位、屍體、地塊沒有這一項，所以站在高地上的單位或地塊永遠比同格／鄰格的障礙物、危害「更靠後」。
   把這一項拿掉（頁面內模擬，`--orderSim=noE`）：穩定錯序 **449 → 50 個、60,064 → 2,066 個錯誤配對幀（−97%）**，沒有出現新類型的違規群組（殘留群組都是遲滯帶，實戰基線與補充種子裡就有）。
2. **最明顯的畫面問題是「腳下有危害的高地單位」**：只要單位腳下格的高度 > 0，危害（火、毒）就整片蓋在單位身上（`h=24` 起就會，因為 `0.7*h` 已經超過單位腳點相對格心的偏移）。截圖 `docs/depth_order/depth_9_hazard_under_unit_plateau_FLAT.jpg`：棋座、身體被火蓋掉，只剩頭。實戰 9 場中 HAZARD×UNIT 有 194 個穩定錯序（其中 122 個是「同一格」），最大宗是格高 24 的格子（66 個）。
3. 使用者原本的懷疑（「高柱在低地單位正後方，障礙物蓋住單位頭」）**排序確實錯，但畫面上不會重疊**：低地單位頭頂在腳上 ~63 px，柱頂的精靈在高台上方更高處，兩者剪影不相交（矩陣 `hu=0` 全部是 `.`＝沒有重疊）。真正會重疊的是**高度相近的鄰格**：樹／柱／牆／危害在 `ho≥72` 的格子上，單位站在 `hu` 為 48～96 的鄰格（同一座高台上）——這是戰場上最常見的地形，見截圖 6（FLAT：樹幹蓋住單位的頭盔）。
4. 把規則對稱化（單位也加 `0.7*h`）**更糟**（模擬 `unitE`：650 個、66,319 幀），不建議。
5. 殘留的 50 個（2,066 幀）全部是**格子遲滯帶**（腳點離格界 ≤ ~6 px，`UnitFrame` 刻意讓單位多留在原格）：預言用不含遲滯的 `fromPx` 判定格子，兩者在邊界處不同意，視覺上不可見，不需處理。

## 2. 預言規則（寫在檔案開頭，這裡複述）

每個被判定的 op 都站在地面上，**高度不是規則的一部分**（高的東西在後面不會蓋住前面的東西，在前面一定蓋住後面的）：

| 配對 | 必須先畫的一方 |
| :-- | :-- |
| 同一格 | TERRAIN < HAZARD < OBSTACLE／UNIT／CORPSE（同格障礙物與單位不判定） |
| 格 vs 格 | 格心螢幕 Y 較小者先畫；同一列不判定；腳印沒有共同 x 範圍（`\|dx\| ≥ 格寬`）不判定 |
| 單位腳點 vs 格 B | **直欄規則**：用 `x = foot.x` 的垂直線切 B 的腳印六角形；腳點在上緣之上＝單位在後（單位先畫）；在下緣之下＝單位在前（單位後畫）；x 在 B 範圍外不判定 |

**預言的修正（為什麼不是「比格心 Y」）**：第一版是「單位所在格 vs 鄰格比格心 Y」。FLAT 版面的半格鄰居（格心 Y 差 20.8 px）會誤判：腳點在 A 格內但已經低於半格鄰居 B 的格心線（腳點最多可以低於 A 格心 25 px），這時 B 的腳印在該 x 處仍完全在腳點下方，單位並不在 B 前面。直欄規則修掉這類誤判；格 vs 格不需要修正（共享 x 範圍的兩格，格心 Y 小的就是在後面）。

**被判定的配對**：類型 TERRAIN／OBSTACLE／HAZARD／UNIT／CORPSE，至少一方是 UNIT／CORPSE／OBSTACLE，且螢幕剪影重疊（凸多邊形 SAT）：
- 地塊＝頂面環（`ty − h`）與底面環（`ty + 基座深度`，`TerrainRenderer.bakeBlock` 同公式含 `tBase` 島嶼底座）的凸包；
- 障礙物＝真實精靈的不透明包圍盒，貼在 `(tx − ANCHOR_X, ty − ANCHOR_Y)`（ENV_SPRITE）；
- 危害＝格頂平面六角環；單位＝x ±22、y 從 `ty − physics.z − getHeadHeight − 4` 到 `ty + 14`。
- 障礙物配對另外量「不透明像素重疊」（每 3 px 取樣，只在每個穩定段開頭量一次），用來區分「包圍盒重疊」與「真的蓋到」。

**違規**＝預期先畫的一方在 `RenderList.sort` 輸出（＝實際繪製順序）中排在後面。**穩定**＝同一個有序配對連續 ≥ 3 幀違規。

**決定性輸入（driver）**：反事實重算兩個 op 的排序鍵，依序嘗試移除 {E＝OBSTACLE／HAZARD 的 `h*0.7` 項、SB＝單位 sortBias、LIFT＝sortKey 的其他正向超額}，最小能讓配對回復正確的子集即為 driver；都不行則看純足跡鍵：同桶＝`subLayerTie`，否則 `footprintY`。

**預言的自我檢查**：(a) 九個手工案例的截圖與判定一致（見 §5，逐張人工確認，包含「預言說對」的案例沒有視覺異常，「預言說錯」的 6、7、9 號確實看到蓋錯）；(b) 預言只讀 `RenderList.sort` 之後的 op 欄位，不依賴法陣抬升或鋪設層；(c) 對照組 `hu=0` 的 `HAZARD_UNDER` 判定為正確（E=0），模擬 `noE` 後幾乎全部消失，沒有新類型的群組，表示預言與修正方向一致。

## 3. 指令與環境

```bash
# 正式資料：種子 1001–1003 × FOREST／VOID／MAGMA（一場 20 秒大逃殺 = 1200 幀）＋手工版面
node tools/ui-e2e/coord-guard.mjs --order
# 只跑手工版面（含截圖到 tools/ui-e2e/out/depth_*.png）
node tools/ui-e2e/coord-guard.mjs --order --seeds=0
# 補充種子（1004–1006 POINTY、1007–1009 FLAT：1001–1003 剛好全是 POINTY）
node tools/ui-e2e/coord-guard.mjs --order --no-crafted --seedStart=4 --seeds=6
# 假設性修正（只在頁面內：排序期間改 op.y，之後還原）
node tools/ui-e2e/coord-guard.mjs --order --no-crafted --orderSim=noE     # 障礙物＋危害都不加 h*0.7
node tools/ui-e2e/coord-guard.mjs --order --no-crafted --orderSim=noEH    # 只有危害
node tools/ui-e2e/coord-guard.mjs --order --no-crafted --orderSim=noEO    # 只有障礙物
node tools/ui-e2e/coord-guard.mjs --order --no-crafted --orderSim=unitE   # 單位／屍體改加 0.7*h（對稱化）
```
輸出 `tools/ui-e2e/out/coord_guard.json`（`orderRuns`、`orderSummary`、`crafted`）。`coord-guard.mjs` 只加了旗標接線與摘要列印；`--order` 不跑時行為不變。

## 4. 實戰結果（種子 1001–1003，FOREST／VOID／MAGMA）

9 場、10,800 幀、1,299,607 個被判定的配對幀，其中 60,064（4.6%）錯序；**穩定錯序 449 個（59,635 幀）**，短暫（<3 幀）351 個。三個地形差不多（FOREST 130、VOID 158、MAGMA 161 個）；種子 1001–1003 的版面全是 POINTY，FLAT 見補充種子。

| 群組（類型對） | driver | 穩定個數 | 錯誤幀 | 最長（幀） | 規則 | 不透明像素重疊（均值 px²，≥100px² 個數） |
| :-- | :-- | --: | --: | --: | :-- | :-- |
| OBSTACLE×TERRAIN | hTerm | 94 | 33,896 | 893 | hexRow | 86，10/94 |
| HAZARD×UNIT | hTerm | 194 | 17,107 | 627 | sameHex 122／column 72 | — |
| OBSTACLE×UNIT | hTerm | 33 | 4,087 | 487 | column | **249，21/33** |
| CORPSE×HAZARD | hTerm | 91 | 3,142 | 627 | sameHex 74／column 17 | — |
| CORPSE×TERRAIN | sortBias | 10 | 1,050 | 297 | column | — |
| CORPSE×TERRAIN | footprintY | 4 | 242 | 200 | sameHex | — |
| TERRAIN×UNIT | sortBias | 13 | 68 | 9 | column | — |
| TERRAIN×UNIT | footprintY | 7 | 27 | 6 | sameHex | — |
| CORPSE×OBSTACLE | hTerm | 2 | 6 | 3 | column | 450，2/2 |
| CORPSE×HAZARD | sortBias | 1 | 10 | 10 | column | — |

補充種子（1004–1009，含 3 場 FLAT×3 地形）：穩定 884 個（POINTY 504／FLAT 380），群組同上，另外出現 OBSTACLE×OBSTACLE hTerm 6 個、HAZARD×OBSTACLE hTerm 6 個（同樣是 h 項：高地上的物件排在前方低地的物件之後）。FLAT 的 380 個穩定錯序分布：OBSTACLE×TERRAIN 216、HAZARD×UNIT 97（hTerm 93）、OBSTACLE×UNIT 16、CORPSE×HAZARD 22、其餘為遲滯帶；沒有 FLAT 專屬的群組（HAZARD×OBSTACLE 只在 POINTY 出現）。

**各群組的責任規則與例子**（排序輸入全列；`rowDiff` ＝後者格心 Y − 前者格心 Y，以 hex 列距為單位）：

1. **OBSTACLE×TERRAIN／hTerm**（hexRow）：`GridRenderStrategy.ts:87` `op.y = visualBaseY + h*0.7`。
   VOID／1003：`O:7,-3`（障礙物，格高 72，`y=-57.6` ＝ 格心 −108 + E 50.4，`sub=44`，鍵 994284，排序位置 90）必須先於前方一列的 `T:7,-2`（格高 96，`y=-72`，E=0，`sub=10`，鍵 992810，位置 87）；rowDiff 1（36 px）。高地障礙物的 E 超過一列的距離，於是蓋在前方地塊頂面上。多數只剩底座陰影重疊（均值 86 px²），但 10/94 ≥100 px²。
2. **HAZARD×UNIT、CORPSE×HAZARD／hTerm**：`GridRenderStrategy.ts:97` `hOp.y = visualBaseY + tile.h*0.7`。
   FOREST／1003：`H:-1,-1`（格高 24，`y=-19.2`＝格心 −36 + E 16.8，`sub=30`，鍵 998109）必須先於站在**同一格**的 `U:RED-0010`（`y=-47.05`，`sortBias=11.05`，`sub=46`，鍵 996446）；hexRow 0。hazard 的 E=16.8 比單位的 `y + sortBias`（−36）大，單位反而先畫、被危害蓋住。只要 `0.7*h > 腳點相對格心的偏移` 就會發生，所以任何 `h>0` 的格子（h=24 就夠）都中招。
   column 例子：`H:5,-2`（格高 144，E=100.8）vs 前方一列的 `C:RED-0012`（屍體）。
3. **OBSTACLE×UNIT／hTerm**（column）：同上規則。VOID／1003：`O:-1,-3`（格高 144，`y=-7.2`＝格心 −108 + E 100.8，鍵 999323）必須先於後方一列的 `U:BLU-0005`（`y=-72`，鍵 992846）；剪影重疊 2,128 px²。單位站的是鄰格的高台（高度相近），所以精靈真的重疊（21/33 ≥100 px²）。
4. **sortBias／footprintY 殘留群組**：全部是遲滯帶。例：`C:BLU-0003` 腳點 `y=-54.01`，我的 `fromPx` 說它在格心 −72 的格內，引擎（遲滯）仍把它算在前方格心 −36 的格，`sortBias=18.01`，使它排到 `T:0,-1` 之後；腳點正好在兩格的邊界（誤差 ≈0.01 px）。其他例子的腳點離格界 0.3～6 px。視覺上看不出來。

假設性修正（同樣 9 場，頁面內模擬，`driver` 欄在模擬下的「otherExcess」只代表「排序鍵與重算值不同」）：

| 模擬 | 穩定個數 | 穩定錯誤幀 | 全部錯誤配對幀 | 結果 |
| :-- | --: | --: | --: | :-- |
| 無（現況） | 449 | 59,635 | 60,064 | — |
| `noEH`：危害不加 h 項 | 190 | 41,157 | 41,407 | HAZARD×UNIT、CORPSE×HAZARD 全消失 |
| `noEO`：障礙物不加 h 項 | 326 | 22,242 | 22,663 | OBSTACLE×TERRAIN、OBSTACLE×UNIT 全消失 |
| **`noE`：兩者都不加** | **50** | **1,824** | **2,066** | 只剩遲滯帶 |
| `unitE`：單位／屍體也加 `0.7*h` | 650 | 66,319 | 66,604 | **更糟**（TERRAIN×UNIT 同格直接壞掉，因為地塊沒有 E） |

## 5. 手工版面（確定性、`tools/ui-e2e/out/depth_<案例>_<FLAT|POINTY>.png`）

做法：`RANDOMIZE_MAP`（DESERT 版面，地面材質單純）→ 壓平所有高度、移除障礙物 → 以 `map.setHeight` 設高度、`SET_OBSTACLE`、`PLACE_AGENT`、`hazardSystem.registerHazard`；單位在中心格 `(0,0)`，特徵放在鄰格；相機 `snapTo` 單位、zoom 2.0，裁 400×330。`unit.spawnTimer=0`（編輯模式下 `CooldownSystem` 不倒數，精靈會縮成看不見）。截圖已複製到 `docs/depth_order/`（`sheet_FLAT.jpg`、`sheet_POINTY.jpg` 各 14 格接觸表，另有 6／7／9 號單張）。

| 案例 | 設定 | 預言 | 目前畫面是否正確 |
| :-- | :-- | :-- | :-- |
| 1 高柱在低地單位正後方 | `hu=0`、柱格 `ho=96` | 無違規 | **正確**。排序 key 雖然錯（見矩陣 E>列距），但柱子的精靈在高台上方，與單位剪影不相交 |
| 1b、1c | `ho=48`／左後方 `ho=72` | 無違規 | 正確 |
| 2 高地單位在低矮牆後方 | `hu=96`，牆在前方 `ho=0` | 無違規 | 正確（牆在前、單位在高地，不重疊） |
| 3 單位在較高地塊後方 | `hu=0`，前方地塊 `ho=96` | 無違規 | **正確**：地塊在前，蓋住單位（整個單位被地塊擋住） |
| 4 單位在柱子前方 | 柱 `ho=0` 在後 | 無違規 | 正確（單位蓋住柱底） |
| 4b 單位在高地塊前方 | 後方 `ho=96` 無障礙物 | 無違規 | 正確 |
| 5a 危害在高地後方 | 後方 `ho=96` 的火 | 無違規 | 正確（火在高台上，與單位不重疊） |
| 5b 低地危害在高地單位前方 | `hu=96`，前方 `ho=0` | 無違規 | 正確 |
| **6 台地上的樹在同高台地單位後方** | `hu=72`，樹 `ho=72`（後方） | 違規：OBSTACLE×UNIT／hTerm（E=50.4 > 列距 41.6／36） | **錯**：FLAT 樹幹蓋住單位頭盔（`depth_6_..._FLAT.jpg`）；POINTY 樹幹蓋住肩膀一角（不透明重疊 441 px²） |
| **7 台地危害在台地單位後方** | `hu=48`，火 `ho=72`（後方） | 違規：HAZARD×UNIT／hTerm | **錯但輕微**：火焰尖端碰到頭盔頂（`depth_7_..._FLAT.jpg`） |
| 8 柱在同高台地左後方 | `hu=48`，柱 `ho=48`（左後半格） | 違規：OBSTACLE×TERRAIN／hTerm（E=33.6 > 半格 20.8） | 剪影相交但不透明重疊 0 px²，畫面看不出來 |
| **9 單位站在有危害的台地上** | `hu=48`，火在單位腳下 | 違規：HAZARD×UNIT／hTerm（sameHex） | **嚴重錯誤**：火整片蓋住棋座與身體，只剩頭（`depth_9_hazard_under_unit_plateau_FLAT.jpg`） |
| 9b 對照：同上但 `hu=0` | | 無違規 | 正確（E=0） |

**矩陣**（`feature × 方向 × 單位格高 hu × 特徵格高 ho`，每層版面 1,266 組，剪影重疊且被判定的 FLAT 297／POINTY 562，其中違規 FLAT 45／POINTY 83）：違規格的條件完全一致——
`0.7*ho > 列距`（POINTY 鄰格列距 36 px → `ho ≥ 72`；FLAT 直後方 41.57 px → `ho ≥ 72`；FLAT 半格鄰居 20.8 px → `ho ≥ 48`，但半格鄰居與單位的腳點 x 不在同一欄，只剩 OBSTACLE×TERRAIN，例如案例 8）**且**剪影重疊（要求 `ho − hu` 不大：`hu=48` 配 `ho=72`，`hu≥72` 配 `ho≥72`）。`hu=0` 的低地單位在 `ho ≥ 48` 時全部是「沒重疊」，所以不會被看見。`HAZARD_UNDER`（危害在單位自己的格子上）：`hu=0` 正確，`hu=24、48、72、96、144` 全部違規。
完整表格在 `tools/ui-e2e/out/order_crafted.txt`。

## 6. 建議的最小規則修改（未實作）

1. **危害的排序 Y 去掉 h 項**：`GridRenderStrategy.ts` `hOp.y = visualBaseY`（`tile.h * TERRAIN_SORT_SCALE` 刪除）。危害是貼在格頂的平面物件，深度就是它的足跡；同格靠 `subLayer`（HAZARD 30 < UNIT 46）決定，已經夠用。證據：`noEH` 消掉 HAZARD×UNIT／CORPSE×HAZARD 全部 285 個穩定錯序（HAZARD×UNIT 17,107 幀、CORPSE×HAZARD 3,142 幀歸零），修好截圖 7、9。**這一條最優先**（腳下危害蓋住單位是最顯眼的視覺錯誤）。
2. **障礙物的排序 Y 去掉 h 項**：`GridRenderStrategy.ts` `op.y = visualBaseY`。證據：`noEO` 消掉 OBSTACLE×TERRAIN（94）與 OBSTACLE×UNIT（33，其中 21 個有 ≥100 px² 的實際重疊）；與第 1 條合併 `noE`：449 → 50、−97% 錯誤幀。歷史上「高地物件不能被低地蓋住」的理由沒有證據：預言（地面平面順序）認為這條規則從不需要——前方更高的地塊會正確地蓋住後方的東西，前方較低的地塊在螢幕上根本不會蓋到後方高台上的精靈。連同刪除 `TERRAIN_SORT_SCALE` 常數與 RenderSpec §3 的 `terrainSortY` 一行（同一個 commit）；`UnitSystem.ts:70` 的 AURA `op.y = sortY + groundH*TERRAIN_SORT_SCALE` 是同一個規則的另一份拷貝，應一併檢查（光環不在本次判定範圍，未量測）。
3. **不要把規則對稱化**（單位也加 `0.7*h`）：模擬顯示更糟（650 個穩定錯序）。若需要「高度感知」排序，必須所有 op（含 TERRAIN）一起用同一個鍵，並重新驗證；現況證據不支持。
   次要（不急）：遲滯帶的殘留（50 個、2k 幀，視覺不可見）可以讓 `UnitFrame` 的 `sortBias` 對遲滯保留的格子夾在不低於該格 TERRAIN 之前，或接受它。

**修完後的驗證**：`node tools/ui-e2e/coord-guard.mjs --order --assert`（目標：穩定錯序只剩遲滯帶；若要把殘留也歸零需把預言改成讀 `UnitFrame.hexUnderFoot`）＋`npm run perf:fidelity`（地形基準要重錄嗎：這個改動只動排序鍵，不動繪製，預期 0 差異）。

## 7. 限制

- 單位剪影是估計框（x ±22，高度取 `getHeadHeight`），不是精靈的不透明像素；障礙物才用真實不透明像素。因此 HAZARD×UNIT 的重疊面積偏大（框內有空白），截圖 7 顯示實際只有火焰尖端碰到頭盔，9 號才是整片蓋住。
- 轉場位移（地圖轉場 IN／OUT）與漂浮位移（VOID／MAGMA，只進 `op.ty`）不在預言內；預言用 `op.y`／`op.tx` 取格子。
- 1001–1003 的版面全是 POINTY；FLAT 的實戰資料來自補充種子 1007–1009（群組相同）。FLAT 與 POINTY 的手工版面都跑了。
- 修正前（`main` 71122cc，尚有法陣抬升）的一次量測：穩定錯序 1,022 個，其中 `decalLift` driver 的 TERRAIN×UNIT、OBSTACLE×UNIT、HAZARD×UNIT、CORPSE×* 共 595 個（12.4k 幀）；地面鋪設合併後這些群組為 0，上面的所有數字都是合併後的結果。
