# 狀態視覺：使用者定案範圍（2026-11-06）

**本檔優先於 `docs/STATUS_VISUAL_DESIGN.md` 與 `docs/STATUS_ART_DIRECTION.md`。** 那兩份只當規格與事實來源，寫了但本檔沒列的一律不做。使用者的規則：只有點名的才換新，沒點名的維持舊版。

## 換新（5 種）
| 狀態 | 做法 | 規格 |
| :-- | :-- | :-- |
| 暈眩 STUN | 頭上細緻小星環加身體失衡，取代現在的金色六角塊 | `STATUS_ART_DIRECTION.md` |
| 變羊 POLYMORPH | Blender 重烘的新羊，四腿剩 30%（四向各 4 幀），取代毛團羊 | 烘焙腳本與成品在 `C:/Git/_wt_status_art`（`tools/assets/blender/render_status_art.py`、`docs/status_art/proto/sheep_*`） |
| 定身 ROOT | 粗藤蔓纏腳，加腳下一點效果 | 同上 |
| 燃燒 BURN | 火舌附著在身上 | 同上 |
| 中毒 POISON | 全身染綠加綠色泡泡 | 同上 |

使用者看的樣子是 `C:/Git/_wt_status_art/docs/status_art/board.png`（第二版）與 `board-v3.png` 的短腿羊。遊戲裡要長得一樣。那個資料夾只讀。

## 維持現行，不准改畫面
冰凍、金身／無敵、護盾、回血、減速、易傷、加速、致盲、反傷、吸血、沉默、恐懼、嘲諷、放逐、凝滯，以及**血條上方圖示列**（上限 8/6/4/2、排序、外觀都不變）、血條、浮字。

## 要做
- **P1、P2**（`STATUS_VISUAL_DESIGN.md` §8）：狀態投影與顯示用觀測資料。模擬結果零差異。
- **Inspector 狀態面板**（§6、P6）：桌機與手機，查得到每個狀態、剩餘時間、誰上的。圖示重用現有圖示列的烘焙圖，不做新圖示。

## 不做
- §4、§5 的身側符號、牌框、關係符號；§8 的 P3、P5；P4 中上表以外的狀態；P7 刪 `BarPainter`。
- 流血的新視覺（`BLOOD`、`PHYSICAL` 的 DoT 畫面仍是中毒，只有面板可依資料標名）。
- 第二版文件 D1（`+N`）與 §10.1 的 R1、R2、R3 中關於圖示列與身側符號的部分全部作廢。

## 效能硬限制
draw 路徑每單位 clip、Path2D、shadowBlur、filter、漸層、離屏畫布都是 0；不得每幀配置物件。全身染色走 `STATUS_ART_DIRECTION.md` §4 的固定容量快取，只服務中毒，容量照需要縮小，不要照 9 種狀態配置；缺圖時本幀畫原樣，不同步烘。保真基準不得重錄，門檻不得放寬。
