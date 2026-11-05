# 單位狀態視覺與 UI 顯示設計

> 2026-11-05；設計提案，尚未實作。工作樹 `C:/Git/_wt_status_visuals`，分支 `feat/status-visuals`，讀取 HEAD `f61fa017a810e1d56a06cc633304d5fe2d7d7172`。本輪僅新增本文件、`docs/status_design/**` 與 `tools/ui-e2e/out/**`；沒有修改遊戲、測試、基準或合約，沒有 commit／push／合併。

## 1. 建議範圍與交付物

建議做「語意正確的狀態投影、可辨識的固定符號、完整單位狀態面板」。沿用 Canvas 2D、既有羊／冰籠素材、單位錨點與品質管理；不重做技能特效、奧義、地面危害、血條主體或戰鬥規則。

先修圖示置中與截斷、再做多狀態顯示及 UI。最高優先控制依舊佔頭頂、腳下最多一圈、不輪播；DoT 與 HoT 各有固定身側符號，避免被低優先排序完全吃掉。陣營外觀與狀態語意分離，敵我依 `side` 判斷。

- [截圖與證據清單](status_design/SCREENSHOTS.md)：區分自然實戰、現行 renderer 的固定輸入、現行 UI 的固定輸入。
- [視覺與 UI 示意](status_design/status-mockup.html)、[示意 PNG](status_design/status-mockup.png)：一張提案圖；其中數值是假資料，人物是定位示意，不是新增角色美術。
- [執行資料](status_design/evidence/natural-run.json)、[逐幀與 UI 資料](status_design/evidence/detail-run.json)、[現行繪製次數](status_design/evidence/current-gallery.json)、[170 招技能資料快照](status_design/evidence/skill-inventory.json)。

**主代理已核可 D1、D2，並修正數項規格：實作以 §10.1 為準，與其他章節衝突時 §10.1 優先。**

## 2. 取證方法與可信範圍

### 2.1 本輪確實執行的指令

所有 git 指令使用 `git -c safe.directory=C:/Git/_wt_status_visuals …`。先確認 branch、HEAD、status；既存未追蹤檔 `docs/STATUS_DESIGN_AGENT_PROMPT.md` 未修改。`rg` 不在 PATH，後續使用 git grep 與 Node 讀檔。

```text
node tools/agent/run.mjs status-design-natural-v2 180 -- node tools/ui-e2e/out/status-design-probe.mjs
node tools/agent/run.mjs status-design-gallery 180 -- node tools/ui-e2e/out/status-design-gallery.mjs
node tools/agent/run.mjs status-design-detail-v2 180 -- node tools/ui-e2e/out/status-design-detail.mjs
```

三次有效執行皆 EXIT=0，pageerror=0。log 在 `tools/ui-e2e/out/agent-logs/`。探針用 `vite.createServer`、`playwright-core`、`channel:'msedge'`，Vite cache 明設在允許的 out 目錄；沒有 npm 安裝。全程不按 START SIMULATION，自然戰鬥取證維持展示模式。UI fixture 最後才停止該頁引擎並另掛實際元件；不當成自然 UI 操作證據。

第一次自然探針有語法錯誤，修正探針後重跑。第一次逐幀探針誤選開場雨幕 canvas，得到黑圖；改用 `canvas.block`（`components/GameCanvas.tsx:181`）後重跑並覆寫無效圖片。以下只引用重跑後已目視的圖片。不可只用「有 agents」認定截圖有效。

### 2.2 視覺觀察

| 有效樣本 | 方法與結果 | 能／不能證明的事 |
|---|---|---|
| D：`desktop-motion-00…05.png` | 1440×900、DPR 1；每張前後讀取有效狀態；自然時間約 1.70→4.52s，18 人開場 | 已看見嘲諷、禁錮、恐懼、中毒、燃燒、再生、護盾、反傷、變羊等混合；鏡頭移動、狀態列與浮字會交疊。不能當同種子 A/B |
| M：`mobile-motion-00…05.png` | 393×852、裝置 DPR 3；CSS 尺寸截圖；自然時間約 1.50→2.68s，16 人開場；zoom 約 0.678 | 身側毒滴／細速度線遠小於 20px 圖示；圖示列有圓框卻不易辨認其中小字形。不是 iPhone Safari 實機 |
| DC／MC：`desktop-consecutive-0…7.png`、`mobile-consecutive-0…7.png` | 真 rAF 連續回呼讀 GameCanvas，含每幀座標與狀態；桌機 1.767→2.200s，手機 1.417→1.717s | 已看見帶狀態單位的位置與畫面變化；匯出 PNG 會干擾耗時，不能拿圖上的 FPS 當效能結果。手機 PNG 為 render DPR 2 的 786×1704，不是 CSS 尺寸 |
| G0／G3：`current-status-gallery-tier0.png`、`…tier3.png` | 20 種可持續視覺各自單獨啟用；使用實際 UnitBodyPainter、StatusPartPainter、ShieldPainter、StatusStripPainter；大／小縮放 1.4／0.678 | 已確認每格 active key 正確、羊與冰籠有載入。這是固定輸入，不代表技能自然出現率、戰鬥合法組合或遮擋驗收 |
| U：`desktop-inspector-fixture.png`、`mobile-inspector-fixture.png`、`desktop-banished-inspector-fixture.png` | 實際 ToolWindow＋UnitInspectorBody；fixture 同時有 STUN、SILENCE、DOT、HOT、HASTE、shield=260 | 只出現兩個標籤與護盾數字；hp=800 的放逐 fixture 顯示「單位已陣亡」。手機確實是底部面板；不證明展示模式能自然開啟 inspector |

目前圖示列放大公式為 `max(1,min(2.2,20/(20×zoom)))`，所以 zoom=0.678 時圖示外框可達 20 CSS px，但不是任意縮放都達標：zoom<0.455 時已碰倍率上限（`constants/hud.ts:135`、`StatusStripPainter.ts:71`）。場景零件沒有相同的最小螢幕尺寸機制（`StatusPartPainter.ts:83`）。

## 3. 現況盤點

### 3.1 機制與資料的邊界

1. **17 個 effect 固定槽，不是 20 個獨立狀態實例。** `types.ts:166`、`engine/core/Effects.ts:10`。FROZEN 是 STUN 外觀；STASIS 是 BANISH＋STASIS 的現有組合；BURN／POISON 共用 DOT；REGEN 對應 HOT。SHIELD 是 `shield/maxShield`，不是計時槽（`StatusActivity.ts:13`、`CCManager.ts:235`）。
2. **沒有獨立流血槽或現成 BLEED 視覺。** BLOOD 與 PHYSICAL 的 DOT 目前也被寫成 POISON，只有 FIRE 變成 BURN（`CCManager.ts:272`）。例如 `tr_b5/ wr_b1` 是 BLOOD DOT；`rb_a5/rr_a2/rr_a3` 是 PHYSICAL DOT；技能快照可查。提案 BLEED 僅是顯示變體，不能新增傷害規則或第二 DOT 槽。
3. **不疊層。** DOT/HOT 直接覆寫時間／值；其他多數效果延長才寫入，SLOW 取最大減速與較長時間，護盾累加。不能把 DR stacks 當 buff stacks（`CCManager.ts:84`、`:258`、`:272`、`:321`）。
4. **每秒率不等於每跳量。** DOT/HOT 每 simulation tick 用 value×dt 扣／補血，0.5s 才送一次數字，數字卻是整個每秒率；EffectSlot 的「每跳」註解不符執行行為（`EffectSystem.ts:10`、`:28`、`:69`；`types.ts:175`）。本輪不能改結算頻率；新浮字應明標 `/s`，不把它宣稱成 0.5 秒的實扣量。
5. **來源有缺漏。** CCManager 只有 TAUNT、SLOW、DOT 填 `sourceId`；HOT、其他效果與累加護盾沒有完整有效來源。`CC_APPLIED` 有 sourceId/targetId，但沒有結構化 kind／是否真的更新槽位；文字也帶 DR，不能反解析中文當資料（`CCManager.ts:148`、`:258`、`:272`、`:288`、`:297`）。
6. **兩個單值外觀會隱藏有效槽位。** INVINCIBLE/POLYMORPH 是否顯示看 `view.visualStatus`，它一次只有一值；多效果時可能有有效無敵卻不列圖示（`StatusActivity.ts:61`、`AnimationSystem.ts:44`、`ControlSystem.ts:64`）。資料面板與圖示列應由槽位成立判斷，本體仍只選一種。
7. **加速同時提高移動與 CD 回復。** 用相同比例上限計算（`MotionEngine.ts:32`、`CooldownSystem.ts:7`）。不得寫成只影響其中一種。
8. **敵我不是 Team。** Team 是外觀／技能組，side 才是敵我（`engine/core/Allegiance.ts:1`）。同一場可以有相同紅／藍外觀但互為敵人的單位。

### 3.2 持續狀態全表

表中來源皆為本 base 的實際技能動作；G0/G3 的格名與第一欄相同，截圖在 §2。成本為固定輸入 t=2 的 **狀態場景 drawImage 實測數 T0/T3**，不含血條、狀態列、角色本體；火焰／上升粒子可能隨相位少畫，不能當峰值。狀態定義完整依 `data/status/effect_defs.ts:23`；目前圖示／場景定義依 `data/vfx/status_parts.ts` 下列行號。

| 視覺／槽位；技能例 | 現行視覺與行號 | 實際問題／保留項 | 圖片；成本 |
|---|---|---|---|
| STUN／STUN；tb_a2、tr_a3 | 金黃三顆繞頭六角星，`:77`；技能 `blue_active.ts:20`、`red_active.ts:29` | 剪影可留；小畫面可合烘星簇，避免三顆獨立小點 | G0/G3 STUN；4/3 |
| FROZEN／STUN＋ICE；rb_a1、rb_u1 | 冰籠模型＋腳下冰環，`:140`；ICE 判斷 `CCManager.ts:95` | 冰籠可辨認，保留；圖示應是雪晶，不再是窄碎片；不能與 STUN 重複計數 | G0/G3 FROZEN；2/1，另冰籠本體 1 |
| POLYMORPH／POLYMORPH；mr_a3 | 羊模型＋粉紅上升光點，`:132`；`red_active.ts:156` | 羊可辨認，移除冗餘光點；模型風格既有待辦另案，見 `HANDOFF.md:58` | G0/G3 POLYMORPH、D04；3/3，替換本體 |
| BANISH／BANISH；sr_u3 | 蒼白光柱＋碎片，`:95`；`red_ult.ts:238` | 長柱像技能能量構造；用斷開門框表「離場」；面板不得當死人 | G0/G3 BANISH、U-banished；6/5 |
| STASIS／BANISH＋STASIS；mr_u3 | 琥珀柱＋上下環，`:149`；`red_ult.ts:185`、`CCManager.ts:119` | 面板合併為凝滯 1 列，說明其放逐語意；圖示改沙漏 | G0/G3 STASIS；3/2 |
| SILENCE／SILENCE；wb_a3 | 藍紫禁止環，`:86`；`blue_active.ts:69` | 保留禁止語意，補「不能主動／奧義」說明，不能誤稱禁止所有普攻 | G0/G3 SILENCE、U；2/2 |
| ROOT／ROOT；tb_a3、rb_a4 | 腳下藤環＋五根刺，`:105`；`blue_active.ts:28`、`:121` | 低階仍 6 貼圖；可合烘腳踝鉗形與稀疏藤環 | G0/G3 ROOT、D03；6/6 |
| FEAR／FEAR；mb_a5 | 紫色顫抖骷髏，`:114`；`blue_active.ts:173` | G0 小尺寸暗紫線不明顯；改淺色骷髏實線，仍保留暗紫底 | G0/G3 FEAR、D03；2/1 |
| TAUNT／TAUNT；tb_m1、tr_a2 | 紅倒三角＋放射線，`:123`；`blue_mobility.ts:16`、`red_active.ts:20` | 不指向施加者；不增加滿場連線，改本地短指針＋詳情來源 | G0/G3 TAUNT、D03；2/1 |
| BLIND／BLIND；rr_a4 | 灰煙兩團＋碎線，`:161`；`red_active.ts:123` | 容易當灰塵；改劃線眼，移除持續煙雲 | G0/G3 BLIND；5/2 |
| SLOW／SLOW；tb_b1 | 霜藍雙下箭頭，`:170`；`blue_basic.ts:13` | 保留向下語意，合成一枚；移到可見身側，避免腳踝極小 | G0/G3 SLOW、M01；2/2 |
| VULNERABLE／VULNERABLE；wb_a2 | 橘色兩道裂紋，`:178`；`blue_active.ts:61` | 裂紋像普通命中；圖示換破盾、場景保留單枚裂盾 | G0/G3 VULNERABLE、M01；2/2 |
| BURN／DOT.tag=BURN；rr_a1 | 橘火舌兩枚，`:186`；`red_active.ts:99` | 圓圖示火焰被裁到頂緣；場景火舌小；浮字被統一染中毒綠 | G0/G3 BURN、M01；2/2 |
| POISON／DOT.tag=POISON；rr_b3 | 上升綠滴＋瘴氣，`:194`；`red_basic.ts:110` | 易和再生上升點混淆；含原本 BLOOD/PHYSICAL 傷害的誤分類 | G0/G3 POISON、M05；4/3 |
| BLOOD/PHYSICAL DOT（目前也 POISON）；tr_b5、wr_b1、rb_a5 | 無專屬流血外觀；`red_basic.ts:45`、`:55`、`blue_active.ts:130`、`CCManager.ts:277` | 新增 BLEED 顯示變體；本輪未獨立在自然戰鬥追蹤這些技能的覆寫鏈 | 以 G0 POISON 示現行分支；自然流血樣本未驗證 |
| REGEN／HOT；sb_a3、sr_a3 | 上升綠光點，`:205`；`blue_active.ts:198`、`red_active.ts:199` | 圓環＋光點不等於清楚的「回血」；改十字；來源缺漏 | G0/G3 REGEN、D03；3/3 |
| HASTE／HASTE；wr_a5 | 上升青白速度線，`:213`；`red_active.ts:87` | 朝上而非沿運動方向；與再生類似；靜止也播線，未表達 CD 加速 | G0/G3 HASTE、M01；3/3 |
| REFLECT／REFLECT；tb_a5 | 銀鏡片環繞，`:221`；`blue_active.ts:44` | 圖示像盾／普通六角，不表反彈；改鏡面回箭 | G0/G3 REFLECT、D03；3/3 |
| LIFESTEAL／LIFESTEAL；wr_u3 | 深紅血滴上升，`:229`；`red_ult.ts:80` | 易被當流血；應用心形＋內收箭，與負向血滴不同 | G0/G3 LIFESTEAL；2/2 |
| INVINCIBLE／INVINCIBLE；sb_a4 | 金白日輪＋放射光，`:237`；`blue_active.ts:205` | 與奧義金色能量重疊；改封閉盾與短角標；有效槽不可被 ccVisual 蓋掉 | G0/G3 INVINCIBLE；2/1 |
| SHIELD／shield>0；sb_a2、sr_a2 | 五貼圖玻璃稜柱、陣營環，`:246`；`ShieldPainter.ts:105`；`blue_active.ts:190`、`red_active.ts:191` | 稜柱與冰籠／奧義混淆；護盾量不是剩餘秒。技能寫 duration=4 也不會過期，不能 UI 倒數 | G0/G3 SHIELD、U；5/5 |

### 3.3 瞬間事件、環境與非效果狀態

| 項目 | 現況證據 | 本輪顯示決定 |
|---|---|---|
| IMMUNE／DR 抵抗 | `CCManager.ts:68`、`:339`；`status_parts.ts:278` | 一次性灰白斜槓盾＋`IMMUNE`，不進持續效果列表；只有結構化原因已知才補 `DR`。本輪未拍到可確認 DR 的自然免疫瞬間 |
| KNOCKBACK／PULL | `CCManager.ts:243`、`:348`；技能見 §3.2 技能快照；MC/ DC 可見擊退浮字 | 位移與短箭頭事件，不新增倒數／持續圖示，不把自我 DASH／TELEPORT 當增益 |
| DISPEL | `CCManager.ts:415`；`blue_basic.ts:196` | 清除的列立即退出；結構化事件才顯示 `CLEANSED`；無事件資料時只顯示「已結束」而非猜原因。自然淨化瞬間未驗證 |
| CAST_ACTIVE／CAST_ULT | `status_parts.ts:253`、`:260`；`HUDRenderer.ts:36` | 保留既有詠唱量表，依新 strip 高度避讓；不算狀態數 |
| CC_INTERRUPT | `status_parts.ts:266`、`StatusActivity.ts:55` | 改為短暫 `INTERRUPTED` 回饋，不讓 aiState 的停留時間持續假扮暈眩；目前 D03 有殘留星簇與 CC_INTERRUPT 資料，但停留是否 AI 缺陷未驗證 |
| EVADING／DANGER | `status_parts.ts:270`、`AnimationSystem.ts:44` | 行動提示，非增益；不列效果。這輪不改逃生行為 |
| 地面 LAVA／POISON／ICE／GRAVITY | `HazardSystem.ts:119`、`:127`、`:171`；`MotionEngine.ts:20` | 危害自身不變；由進場施加的 ROOT 等照效果列，僅區域內的移速倍率不偽造 SLOW。可在詳情另列 `ENVIRONMENT` 非計時說明，非本輪必要範圍 |
| VAMP、TRUE_STRIKE、EXECUTE、MANA_BURN、SELF_DAMAGE 等 | `types.ts:118` 的技能 action 聯集；`DamageCalculator.ts:98`、`:116`、`:180` | 單次技能機制，不是常駐 buff。技能說明頁保留，不能從名稱猜出新狀態 |
| DEFAULT | `status_parts.ts:281` | 未知顯示資料時灰色 `?`＋`UNKNOWN EFFECT`；保留真實剩餘時間與原始 kind，不能靜默漏列 |

### 3.4 UI 現況

主面板為 `components/ui/inspector/UnitInspectorBody.tsx:38`；STATUS 分頁內是 AI 狀態、座標、護盾、HP/MP，並無完整效果列（`:164`）。`UnitStatusTab` 實際是 SKILLS 配置頁，不應因檔名而把狀態 UI 塞在這裡（`UnitStatusTab.tsx:13`）。`selectInspectorView` 只有 STUN/SILENCE 標籤且把 banished 判為 isDead（`views/l3.ts:38`）；`types/ui/l3.ts:7` 亦只有兩種標籤。

視窗預設 340×520、最小 300×240、展示模式不可見（`data/ui/windows.ts:32`）。寬度 ≤900 使用既有底部面板、最高 72vh（`ToolWindow.tsx:106`、`constants/ui.ts:21`）。沿用這套 UI，不另造視窗管理器。這輪不改展示模式開窗政策；正常手動選取後使用狀態面板。

## 4. 視覺語言與共通規格

### 4.1 外形與色彩

- **硬控**：20px 切角牌、中央清楚剪影；**其他減益／DoT**：20px 方牌＋底部 2px 短橫；**增益／HoT**：20px 圓牌＋頂部 2px 短橫。三種外框都用中性色，狀態本色只用在字形，減少紅綠框的依賴。中性底 `STATUS_INK=#0b1524`、亮邊 `STATUS_EDGE=#e7edf5` 放資料表；不寫在 painter。
- 圖示 glyph 20×20 viewBox，線寬 1.8、圓端點、圓轉角，安全框 `(2,2)–(18,18)`；圖示烘焙輸出 96×96，可供面板 32 CSS px @DPR3。完整 path 定義見示意 HTML 的 `glyphs`，複製到唯一資料來源 `data/status/iconShapes.ts`，示意檔不是執行期依賴。FEAR 使用 `STATUS_DREAD.core` 而非暗紫 main；LIFESTEAL 保留現行 primary 的玫紅。
- 不用即時 glow、shadowBlur、漸層、模糊或粒子拖尾；小字形可在烘焙時加 1px 暗底輪廓。常駐 alpha ≥0.9；只有進出場過渡降低 alpha。狀態整體走 `source-over`，不借用奧義半透明能量構造與大片 `lighter`。
- 現行圓圖示的對齊需先修：`StatusStripPainter.ts:51` 以 `center+(width/2-anchor)` 補償，但 drawPart 又減 anchor（`VFXPartStore.ts:150`）。非中心錨點會偏兩次。新烘焙以矩形中心為原點、先旋轉再置中縮放；測試以最終 alpha bbox 中心與安全框驗證，不能只反轉符號後假設有旋轉的零件也正確。

### 4.2 敵我與所在單位

狀態色不染 Team，維持 `DECISIONS.md:50`。血條左側新增 10×10 CSS px 中性關係符號，距血條 3px：同側 `=`、敵側 `×`、沒有觀看／操控參考側 `◇`。符號採預烘，1 drawImage；不以 BLU/RED 字首判敵我。

參考側沿用 `director.getWatchSide(engine)`／未來玩家操控側，不因「點選敵人檢查」突然換成敵方視角；`SET_WATCH_AGENT` 原本會改觀看側（`UICommandSystem.ts:49`），檢查來源動作不能偷偷發這個指令。UI 明列 `ALLY / ENEMY / UNALIGNED`、`SIDE 02`，來源列也以相同基準判斷。換導播參考側時，符號允許同步切換；面板顯示目前參考 SIDE，避免誤會。

關係標記附在 HUD，不給每種狀態再畫一份。既有棋座／羊項圈的陣營外觀保留；它們不是正確敵我的唯一依據。

### 4.3 錨點、尺寸與動作

所有尺寸下列均為 **CSS px**，不是 DPR pixel。世界座標的實際大小由本幀有效 zoom 換算；DPR 只決定畫布解析度，不參與語意尺寸。

| 部位 | 位置與尺寸 | 安全限制 |
|---|---|---|
| 狀態列 | UnitFrame.hudAnchorY 上方；圖示 20–24px，間隙 2px，距血條 3px；面板圖示 24px 桌機／32px 手機 | 從 RenderPipeline 的既有 camera 縮放純量傳入 HUDRenderer，不新增 `getTransform()`／DOMMatrix 配置。世界圖示倍率取消 2.2 上限，尺寸夾至 20–24px |
| HEAD | 沿 UnitFrame＋projectionTopHeight；標記最小 18px、最大 24px；位於血條下緣與頭頂間 | 空間不足時將 HUD 整體上移，保留與模型至少 2px，不把圖示壓到臉；詠唱量表隨 strip 高度一起避讓 |
| BODY 左／右 | projectionCenterHeight；負向在左、正向在右；單枚最小 14px、最大 18px；中心距角色投影外緣 2px | 最多每側兩個位置，第二枚下移 16px。DoT 固定左 1、HoT 固定右 1；其他 buff/debuff 用第 2 格。不能為讓位改 agent 位置 |
| GROUND | 現行 frame.floorY−physics.z；只選一種貼地標記 | 半徑 ≤32 世界單位，**不**為最低像素放大到跨格；太小只靠 HEAD／BODY／HUD 表達。仍是附著於單位的標記，非危害範圍 |
| 羊／冰籠 | 保留 UnitBodyPainter、CcBodyStore 的同相機烘焙錨點 | 不放大整個模型來補手機可讀性；新 glyph 補足即可 |

遵守 `RenderSpec.ts:116`、`UnitFrame.ts:42`，不在 painter 重算 terrain height、不增 sortBias、不把狀態移入地面鋪設；若新增 HUD 避讓／身側偏移，同包更新 RenderSpec 與碰到的方框檔頭。這是未來實作包的允許清單，不是授權本設計階段修改它們。

動畫使用 simulation/presentation 時間，暫停時凍結。固定狀態圖示不旋轉；場景允許小幅節奏，不做整個字形閃滅。移動 HASTE 從相鄰兩幀的 UnitFrame 足點／身體錨點差求畫面速度方向；歷史資料只存在既有 `UnitFrameStore`（與既有 afterimage／sort history 一樣），painter 只讀 frame 的方向／移動旗標，不另存狀態。停住即停線，不能依 `physics.vx/vy` 假設那就是一般步行速度；同一 battleTime 不更新歷史以免暫停時被判成移動。嘲諷指針用來源與目標的 UnitFrame 投影中心差，只轉本地短針，不畫橫跨全場的射線；找不到來源／同點時不畫指針，保留固定倒三角。

### 4.4 多狀態規則（含待核可項）

先 normalize，再決定可見性：`STASIS` 隱藏其相同 BANISH 列，`FROZEN` 取代同槽 STUN；POLYMORPH／INVINCIBLE 只要各自槽位有效就都列出，即使只有一種模型外觀。未知 kind 有 fallback；SHIELD 只一列；不把 CAST/EVADING/IMMUNE/位移事件納入數量。

**固定排序（不依剩餘時間重排）**：BANISH、STASIS、FROZEN、STUN、POLYMORPH、FEAR、SILENCE、TAUNT、ROOT、INVINCIBLE、SHIELD、BURN、POISON、BLEED/DOT、REGEN、BLIND、VULNERABLE、SLOW、REFLECT、LIFESTEAL、HASTE。同一槽的變體互斥，物件 key 保持 slot identity；刷新時間不讓整列換位。

場景以固定預算分配：先主控制／替換模型，再 DoT、HoT，再無敵／護盾，再次控制的腳下形狀、最後一般 buff/debuff。HEAD、GROUND 各自仍只選最高一種、不輪播；所有候選按 §5 成本扣點，沒有預算只退回狀態列與面板，不改狀態成立性。凍結／羊的本體優先於一般 BODY 裝飾；放逐中其餘 BODY 不畫，但面板可查、以「暫停生效」註記 DOT/HOT（`EffectSystem.ts:19`）。

**圖示列提案，需核可 D1**：桌機仍用 [8,6,4,2] 上限，手機 ≤900 CSS px 再限為 [4,4,3,2]；沒有溢出才全列。溢出時最後一格固定 `+N`，N 為省略的正規化效果數；其餘格先保留最高控制，再保留 INVINCIBLE 或 SHIELD，再交替取負向與正向。容量 2 時只有最高效果＋`+N`。排序仍採上面固定順序，不輪播。示意圖 mobile 的狀態列為 3 個＋`+2`；面板永不受品質階層截斷。

全部狀態列表仍在 inspector；戰場 strip 的 `+N` 是非互動提示，手機不把 20px 小圖當點擊目標。點單位或現有選取入口開面板。相鄰名牌若重疊，不作任意漂移或全場避碰求解；先遵守列寬上限，選中單位在 HUD 最後繪製。驗收要包含 40 人擠群，不能只看單人圖鑑。

## 5. 逐狀態新規格

色帶沿用 `data/vfx/parts/vfxPalette.ts:26`、`:35`；下表 token 指對應 `main`，除另註 core。所有 glyph 精確 path 以 mockup HTML 的 `glyphs` 為準；BODY 的標準 badge／外框由 §4 決定，不另做自由發揮。場景成本 `T0/T1/T2/T3` 是**單狀態上限 drawImage 數**；HUD icon 另計。T1 靜態輪廓與 T0 相同、移除第二裝飾；T2 動畫減為 4fps；T3 除方向指針外靜態。所有 tier 都保留完整 UI 資料。

| key／glyph | 色帶 token | 場景零件與位置 | 動畫（T0/T1） | 成本；低階具體退化 |
|---|---|---|---|---|
| STUN／三星簇 | STATUS_GOLD | HEAD 一張包含三顆星的合烘 sprite | 4 幀／1s，整簇位移 ≤1px | 1/1/1/1；T2 2fps，T3 第一幀 |
| FROZEN／六枝雪晶 | STATUS_ICE | 保留冰籠 1；GROUND 裂冰環 1 | 冰籠靜止；裂環不轉 | 2/2/1/1；T2/T3 只冰籠；成本含額外冰籠、不含原角色 |
| POLYMORPH／羊側面 | STATUS_PINK | 保留羊本體；額外光點全部移除 | 沿用羊跳動；T3 沿用既有模型路徑 | 0/0/0/0 額外貼圖；羊 1 次算角色替換，不新增大圖 |
| BANISH／斷開菱門＋上箭 | STATUS_GHOST | GROUND 兩條斷門邊合成 1；HEAD glyph 1，不畫實心光柱 | 門邊 alpha 0.9→1，1Hz | 2/2/1/1；T2/T3 只 HEAD glyph，原本離場本體不恢復 |
| STASIS／沙漏 | STATUS_AMBER | HEAD 沙漏 1；GROUND 小型開口六角框 1 | 沙漏內沙點 4 幀／1.6s，外框不轉 | 2/2/1/1；T2/T3 只沙漏 |
| SILENCE／劃線喇叭 | STATUS_VIOLET | HEAD 一張完整禁止圖示 | 靜態 | 1/1/1/1 |
| ROOT／兩個腳踝鉗＋鏈 | STATUS_VINE | GROUND 合烘腳鉗與斷藤環 1；BODY 左 2 的腳鉗 glyph 1 | 靜態 | 2/2/1/1；T2/T3 只 BODY，腳下不擴圈 |
| FEAR／骷髏 | STATUS_DREAD.core | HEAD 明亮骷髏 1、深紫暗底同張 | x ±1px、3Hz；不縮放 | 1/1/1/1；T2/T3 靜態 |
| TAUNT／警告倒三角 | STATUS_RED | HEAD 三角 1＋8×6px 本地指針 1；針距中心 12px | 指針朝來源，無 bob／放射光 | 2/2/2/2；低階仍保留方向，來源失效即 1；若被另一 HEAD 壓掉，僅 strip／來源列 |
| BLIND／劃線眼 | STATUS_SLATE | 無 HEAD 勝者時 HEAD；否則 BODY 左 2，1 張 | 靜態 | 1/1/1/1 |
| SLOW／雙下箭 | STATUS_FROST | BODY 左 2；箭尖朝畫面下 | 每 1s 向下 2px 後回位，alpha 不變 | 1/1/1/1；T2/T3 靜態 |
| VULNERABLE／裂盾 | STATUS_CRACK | BODY 左 2，裂縫在盾內 | 靜態；受傷 receipt 才短促亮 120ms | 1/1/1/1；不另加命中粒子 |
| BURN／火焰 | STATUS_BURN | BODY 左 1 的火焰 badge 1；不繞身 | 4 幀／0.8s，接到 DOT 回饋時放大 1→1.12→1、160ms | 1/1/1/1；T3 不循環，只收到回饋作亮邊 |
| POISON／帶兩孔的毒滴 | STATUS_POISON | BODY 左 1 的毒滴 1；移除腳下瘴氣 | 下移 2px、1s；DOT 回饋短亮邊 | 1/1/1/1；T2/T3 靜態＋回饋 |
| BLEED／雙血滴 | 新 STATUS_BLEED：core #fecdd3／main #be123c／dark #4c0519 | BODY 左 1、下滴；只在有可靠 BLOOD/PHYSICAL 來源變體時用 | 4 幀／1s，沿下方 3px，不上升 | 1/1/1/1；T2/T3 靜態＋回饋 |
| DOT（未知變體）／斜排三點 | STATUS_SLATE | BODY 左 1 | 僅收到週期回饋時亮邊 | 1/1/1/1；名稱「持續傷害」，不可猜毒／血 |
| REGEN／十字 | STATUS_GREEN | BODY 右 1，14–18px 明確十字 | HEAL periodic receipt 時上移 2px、160ms；沒有 receipt 不假造跳數 | 1/1/1/1；T3 靜態十字＋亮邊 |
| HASTE／雙前箭 | STATUS_WIND | BODY 右 2 的箭 1；移動時才加身後一張雙短線 1 | 線長 12px、兩線距 3px，沿實際螢幕速度反向延伸；停下 100ms 內消失 | 2/1/1/1；T1 起只箭；UI 說明移動與 CD 同時加快 |
| REFLECT／鏡面回箭 | STATUS_SILVER | BODY 右 2；不畫環繞鏡片 | 反傷 receipt 時水平翻亮 120ms，不旋轉符號 | 1/1/1/1 |
| LIFESTEAL／心形＋內收箭 | STATUS_CRIMSON（glyph 用 #e11d48） | BODY 右 2；不是血滴 | 真吸血事件才內收 2px／160ms；無明確事件不猜 | 1/1/1/1 |
| INVINCIBLE／封閉盾＋十字 | STATUS_RADIANT | BODY 右 2 的封閉盾 1；角色四角短括號合烘 1 | 固定輪廓，無日輪／大放射光 | 2/2/1/1；T2/T3 只盾；來源圖示同時可與羊存在 |
| SHIELD／空心盾 | STATUS_SKY | BODY 右 2 的空心盾 1；角色左右護角合烘 1；不用全包玻璃柱 | 盾量減少才護角亮 120ms，不循環掃描 | 2/2/1/1；T2/T3 只盾；血條護盾部分沿用 |

BLIND／SLOW／VULNERABLE 競爭左 2，優先 BLIND→VULNERABLE→SLOW；右 2 優先 INVINCIBLE→SHIELD→REFLECT→LIFESTEAL→HASTE。被排除的都在 strip／面板；不額外堆第三層。控制勝者選定後，再依總預算扣點；多種控制的 GROUND 補件不會擠掉 DOT/HOT。場景總預算 **8/7/6/5 次／人**（T0…T3），包含冰籠增量、護角、指針，角色替換羊按原本角色成本計。

瞬間回饋：有效首次施加時，既有 icon 做 1.15→1 的 160ms 收縮；刷新只補時間底線，不重新爆發。自然結束當幀移除場景符號與圖示，時間底線歸零即退場，不保留會誤認仍生效的殘影；UI 保留焦點位置。若收到 DISPEL 事件才加碎線 1 張／180ms。抵抗是被拒的效果旁一枚斜槓盾 1 張／400ms；低階僅選中／關注單位顯示。全場新增瞬間 sprite 上限 [16,12,8,4]，滿時捨棄一般施加動畫、先留抵抗／中斷；不捨棄真正狀態列。

DOT/HOT 不新增第二套常駐特效。每 0.5s receipt 只促動原有身側符號；浮字使用 `−30/s`／`+80/s`，名稱／glyph 分流 BURN、POISON、BLEED、REGEN。這是**每秒率提示**，不宣稱每次扣補的總額。護盾吸收仍用 ABSORB；HOT 期間若也有瞬間治療，不能把所有 HEAL 都標作 HoT。正負浮字分左右，沿用現有 stagger；不做全畫面正負數量累加的新 UI。

## 6. UI 方案與資料接法

### 6.1 桌機

沿用 UNIT INSPECTOR／STATUS 分頁，HP/MP 之下、AI STATE 之前放 `ACTIVE EFFECTS`。顯示總數；下面依 `CONTROL`、`DAMAGE & WEAKEN`、`RECOVERY & PROTECT` 三組排列（仍用同一固定順序）。空組不佔高度；無效果顯示 `NO ACTIVE EFFECTS` 與「目前沒有持續狀態」。AI 與座標移到其後，SKILLS 頁原樣。

列高最少 48px，圖示 24px，欄距 8px；左側名稱與來源摘要，右側 56px 等寬時間／護盾值。不得為塞下資訊縮到 10px 字；內文字級用現有 `text-ui-body`，時間 14px token。預設視窗 340px 可用，最小 300px 時來源摘要省略但詳細列可展開。

- 倒數：`ceil(remaining×10)/10`，例如 0.01 顯示 0.1s，不提早顯示 0.0；≥10 秒顯示整秒，<10 秒 0.1s。進度條 `clamp(remaining/max,0,1)`，2px 高，100ms 更新；暫停與放逐中停住的 DOT/HOT 忠實停住。
- SHIELD 顯示目前數值 `260`，詳情「消耗型；無固定期限」，不用 ∞ 或秒。護盾總量旁顯示「最近增量來源」，不能將所有剩餘護盾歸給最後一人。
- 層數：現行全部不顯示 ×1；模型預留 `stacks: null`。未來有真實疊層資料才顯示 ×N。DR 額外列 `CONTROL RESISTANCE`，不得借用層數角標。
- hover／鍵盤 focus 延遲 250ms 顯示 Tooltip（名稱、作用）；點擊整列／Enter 展開同面板的詳細區。詳細區列剩餘／本次最大時間、數值、來源單位 ID／side／技能名，以及「時間來源」「強度來源」分開的特殊情況。Esc 收合，焦點回原列。
- 點來源旁的 44px 圖示按鈕只改 UI selectionStore，來源仍在場才可選；不寫戰鬥 target、不改 watch side、不讓引擎行動。來源離場保留 ID 與「已離場」，關閉跳轉。來源未知明寫「來源未記錄」。
- 效果在 tooltip 開啟時結束：detail 顯示「已結束」300ms，接著收起；只描述觀測結果，不憑時間猜「淨化」。移除列後焦點移到下一列或 ACTIVE EFFECTS 標題，不掉到 document body。

### 6.2 手機與窄畫面

沿用 ≤900px 的底部 ToolWindow；純色材質、不新增 blur。標準展開高度 `min(520px,72dvh)`（以既有 sheet 72vh 為上限，safe area 由既有外殼處理）；保留關閉／收合圖示。視窗內僅效果列表可垂直捲動，標頭與 HP 摘要固定。

圖示 32px、整列至少 56px、所有點擊區 ≥44×44 CSS px；點列直接展開細節，不要求 hover／長按。詳情在同底部面板內，不另彈一層遮住戰場；返回是單個圖示按鈕。窄畫面來源摘要可只顯示 ID，完整 side／技能在展開內容。手機橫向、320px 寬、200% 文字縮放下仍可捲，不出水平截斷。

新控制操作若形成 bar，一律純圖示單列，說明寫 aria-label/title，不換行；登錄 `CONTROL_BAR_FILES`／`checkControlBars`。分組標題英文大寫、中文只用內文。讀屏狀態列表有名稱／時間／來源，但**不**每 100ms aria-live 報倒數；只在使用者聚焦時讀當下值，加入／結束作節流 polite 公告。

### 6.3 共用投影，不讓 UI 依賴 renderer

```text
Agent.effects + shield + ccVisual（模擬真值，唯讀）
    + Agent.view.statusPresentation（新：純顯示 receipt／來源，表現層唯一寫入）
           ↓ neutral status query / display descriptor
    ┌──────┴──────────────────────────────┐
StatusActivity / renderer              views/status.ts
固定 scratch buffer、無配置           selectUnitStatusView，10Hz 快照
    ↓                                    ↓
StatusStrip / Parts                   useViewOf → UnitEffectsPanel
```

新增 `data/status/status_display.ts`：kind→名稱、分類、顯示變體、固定優先序、圖示 key、文字說明 key；不放戰鬥數值。`data/status/iconShapes.ts` 是共享路徑表；場景材質留在 status_parts，顏色留 vfxPalette。`engine/core/StatusQueries.ts` 只依中性型別與 live slots 判斷 canonical key、比例，不 import presentation/renderers；`StatusActivity` 保留既有 API 並委派查詢，不另維護第二張規則表。

`types/ui/status.ts` 的 `UnitStatusView` 至少含：`agentId, side, referenceSide, relation, availability, effects[]`。每個 row 有 `id(slot identity), kind, displayKey, label, category, remainingSeconds, maxSeconds, progress, valueText, stacks:null, sourceSummary, durationSource, valueSource, sourceSkill, sourceAvailability, detailLines`。所有條件在 selector；元件只畫，不讀 Agent。可玩／編輯的未來入口預留 effect kind 與 skill ID，這輪不做新增、清除、修改狀態按鈕。

`views/l3.ts` 修正 `isDead`：hp<=0 或 fullyDead；另外傳 `availability='ACTIVE'|'BANISHED'|'OUT_OF_BOUNDS'|'DEAD'`。BANISHED 保留完整內容、顯示「暫時離場」，不造假死亡。不能用這個修正反寫 agent.banished。

投影沿用 `useEngineView.ts:6` 的 10Hz ticker；只對已選單位建立有變更的快照，簽章使用 0.1s 的量化時間；無變更回傳同一物件。不向 React 暴露可變槽位引用、不對 40 人每 render map 產物件。Canvas 走固定陣列／bit mask，icon 烘焙與 UI 圖像轉換由 `hooks/adapters/statusIcon.ts` 處理，component 不 import renderer。

### 6.4 資料缺口與最小觀測補充（D2 核可後）

不新增效果槽、不改現有 `sourceId` 的戰鬥用途，尤其 TAUNT 鎖定來源。新增的是**成功寫入與回饋事件的結構化欄位**，由既有 `engine.pushEvent`／EventPool 送至 VisualSystem；不能在模擬端 import 新的 presentation system。

| 提供者 | 必要新資料 | 表現層處理／禁止猜測 |
|---|---|---|
| CCManager 寫入有效槽後 | effectKind、skillId、sourceId、sourceSide、element 快照、結果 APPLIED/REFRESHED/UNCHANGED/IMMUNE；`changedDuration/changedValue/changedVariant` bit flags | 各欄分開更新 provenance；被忽略的較短效果不取代原時間來源。SLOW 的最強值與最長時間可能來自不同人，要分開顯示；TAUNT 來源始終以真正生效的 sourceId 為準 |
| SHIELD 成功增量 | targetId、sourceId、skillId、grantedAmount | 顯示「最近 +X，由 Y」；不追溯剩餘護盾的各人份額，不做假的 shield stack |
| CCManager.dispelEffects | removedKind mask、來源／技能（從 SkillActions 呼叫端傳給觀測事件；不改 dispel 判斷） | 明確 CLEANSED；自然到期可由 remaining→0 偵測，無需每 tick 發 expiration event |
| EffectSystem 既有 0.5s 回饋 | `periodicKind:'DOT'|'HOT'`、rate、DOT variant、targetId；來源可由已記錄 receipt 查 | 分開普通 HEAL 與 HOT；使用 `/s`，不從 hp 差推算傷害，避免混入其他命中／過量治療。HOＴ滿血仍有狀態，rate 是能力值，不代表實補 |
| HazardSystem 的週期傷害 | `periodicKind:'HAZARD'` 與 hazard kind／source | 不誤當身上 DOT、不讓地面毒沼跳數觸發身上燃燒符號 |
| 抵抗／中斷／反傷／吸血 | enum reason／feedbackKind，而非中文 text | 沒有資料就只沿用現有一般回饋，不推測抵抗原因或吸血來源 |

`StatusPresentationSystem` 新增於 `engine/presentation/`，是 `agent.view.statusPresentation` 的正常執行期唯一寫入者；在既有 `VisualSystem.flush` 內先複製事件純量到預配置視覺槽，再跑 HUD/VFX。不得保存會回池的 GameEvent 參考。初始化／reset 是既有 `engine/core/ViewCommands.ts:10`、`:18` 的生命週期例外，沿原本 reset 呼叫；讀取 live slot 已失效時 origin 不對外投影。自然到期直接讀 live remaining 隱藏，不依賴 flush 每幀執行：`engine/game.ts:341` 只有非空事件批次才呼叫 renderer，不能僅移除 VisualSystem 的 early return 就假設可以逐 tick 清理。固定槽的舊 receipt 留到下一次 APPLIED 或 reset 覆寫即可，不增長、不暴露為有效狀態，也不改 facade／tick order。視覺編排器只分派 receipt；其他系統不得直接呼叫新系統改資料。

同一 tick 先結束又重施、DOT 換類、重設／下一局、來源死亡、讀舊狀態沒有 receipt 都要覆蓋；後兩者用 Unknown／已離場，不能靠 current target／lastHitSourceId 猜。來源技能快照只保留必要 ID/name/element，玩家修改資料庫後不倒改已施加狀態的歷史外觀。BLEED 依成功 DOT receipt 的 BLOOD 或 PHYSICAL 映射；原 `DOT.tag` 仍維持原值，確定性與相容性不因換美術被改動。沒有可靠 receipt 時 FIRE 的 BURN tag 可辨認，其餘泛用 DOT；不聲稱知道是否中毒／流血。

**確定性保證的實作條件**：觀測發生在原分支之後；不增加 RNG 呼叫、不用牆鐘、不改 dt、HP/MP/shield/remaining/value/tag、DR、target、命中順序或技能效果；observer 只寫 Agent.view，不提供任何 AI／戰鬥判斷。現有 `balance:fingerprint` 不含 view 與 slot.sourceId（`sim-fingerprint.mjs:47`），因此除既有指紋零差異外，新增同種子觀測 on/off 的逐 tick 核對，明比每個 sourceId、DR 與 RNG stream 狀態；不能只拿原指紋通過宣稱全部確認。本設計階段未改碼，這些是待實作證明的條件。

D2 不核可時：只做現有可靠欄位，來源不足顯示未記錄；不做 BLEED 分型、不猜抵抗／淨化、不把普通 HEAL 改成 HoT 數字。此降級能改善可讀性，**不能滿足全部「誰上的」需求**。

## 7. 效能預算與手機 A/B

### 7.1 繪製呼叫（設計上限，尚未量測新實作）

不把 drawImage 數當 GPU 效能的替代結論。以下只約束**新增／替換的狀態場景＋狀態 strip＋關係標記**；不含原角色／地形／奧義／血條／文字。只處理畫面內單位，使用既有 frame 可見性及 viewport 邊界排除；不能對所有場外 agents 先畫再遮掉。

| tier | 每人場景上限 | 桌機 strip icon 上限（含 +N） | strip 時間底線 | 關係符號 | 40 人靜態最壞總 drawImage／fillRect |
|---|---:|---:|---:|---:|---:|
| 0 | 8 | 8 | 每個計時 icon 1 fillRect，最多 8 | 1 image | 680 images + ≤320 rects |
| 1 | 7 | 6 | 最多 6 rects | 1 | 560 images + ≤240 rects |
| 2 | 6 | 4 | 只選中單位，最多 4 rects 全場 | 1 | 440 images + ≤4 rects |
| 3 | 5 | 2 | 無 | 1 | 320 images |

20 人為上述一半（T2 選中底線仍最多 4）。手機 T0 strip 上限 4，所以 40 人 ≤520 images＋160 rects；T1 ≤480 images＋160 rects；T2 ≤400 images＋3 rects。瞬間回饋最多再加 16/12/8/4 images。DOＴ/HOT pulse 改原有 sprite 的 transform/alpha，不另增加 draw。護盾的 1–2 張已計場景上限，不允許沿用 5 張殼再疊新 glyph。表內是最壞預算；有多少效果、畫面內幾人決定實際值。

場景高控制＋DoT＋HoT＋護盾壓力例：T3 一個主控制 1（若嘲諷含針為 2）＋DOT1＋HOT1＋護盾1＝4–5，已覆蓋重要資訊。多個控制只保留主控制，不把最低階 budget 用完在 6 根藤刺。文字成本另外用既有 TextPainter／GlowTextCache 的統計比對，不能因表未列文字而新增無上限浮字。

新 painter 熱路徑每幀 `shadowBlur` 設定、createGradient、clip、new object/array、new Map、動態字串 cache key 各為 0；scratch typed arrays／可變 options 在建構時配好。所有貼圖 `source-over`；不得增加大於角色包圍框的 blending 面積。不得增加每人全螢幕 offscreen、每個狀態一張隨 camera zoom 成長的畫布。

### 7.2 DPR 3 記憶體口徑

沿 `tools/ui-e2e/mem-probe.mjs:15` 的 **393×852、deviceScaleFactor=3**；計算仍是活畫布 `width×height×4`，不是壓縮 PNG 檔案大小；也不是宣稱量到了 GPU resident bytes。`getRenderDpr()` 目前上限 2，再乘品質倍率（`RenderQuality.ts:124`），不能把每張 canvas 又乘 9。

本輪相同 WeakRef accounting 的短樣本：桌機 **443.78 MiB**，手機 **196.16 MiB**，見 `detail-run.json`。是不同隨機場景、很早的一個時間點，**不是 base/new A/B、不是 120 秒最高量，也不是通過手機記憶體驗收**。

新狀態資產**增量固定容量**如下；與人物數、鏡頭縮放、隊伍數無關：

| 項目 | 上限／計算 | MiB |
|---|---|---:|
| 22 種持續 glyph，含 BLEED／泛用 DOT | 22×96×96×4 | 0.774 |
| 場景合烘 sprite 含額外動畫影格與兩種版面 | 最多 30 格，每格 ≤192×192 RGBA；使用 glyph 可重用上列，不另算一份 | 4.219 |
| +N tile（1…18 與兩個 fallback） | 20×60×60×4 | 0.275 |
| 關係標記 | 3×48×48×4 | 0.026 |
| UI adapter 解碼圖像最壞第二份 | 22×96×96×4（mem-probe 不含 HTMLImageElement，另列保守預算） | 0.774 |
| 單張烘焙 scratch 高峰 | 192×192×4，重用一張 | 0.141 |
| 合計 | 不含既有羊／冰籠資產（重用，不加載第二套） | **約 6.21 MiB，增量硬上限 7 MiB** |

動畫不要每種狀態都做 16 張大圖；30 格含全部 frame/layout 變體，超出就減影格或重用變換，不增大預算。sprite 固定 pixel 尺寸、不跟 renderDpr 再相乘、不以 team/side 複製；style/tier 切換共用同一資產並換取樣率，不留四份 cache。+N 是靜態 tile，不每 frame fillText；時間採 bottom fillRect，不為每個剩餘百分比烘 100 張。

實作後 `npm run perf:mem -- 120 mute` 在 base／new 各跑同 viewport；另用固定種子／固定壓力場景記 20/40 人、四 tier、十次重設與切 tier 的 live canvas bytes，status 分類總增量 ≤7 MiB，重設後不累積。隨機展示總量需配場景／人數才能解讀，不能單憑兩次隨機最高值斷言回歸。

### 7.3 實機 A/B 清單

在 iPhone 14 Pro Safari，固定地形／陣容／種子／鏡頭與亮度，以 A/B/B/A 各 60 秒、先暖機 15 秒；5v5、20、40 人各測 FOREST、MAGMA，以及多人同時奧義。狀態壓力固定為 STUN 或 TAUNT＋DOT＋HOT＋SHIELD，另測 FROZEN、POLYMORPH 與放逐。用新暫時旗標分開關閉 `statusScene`、`statusStrip`、`statusPulse`；不可改模擬，旗標只屬呈現。

量 frame p50/p95/p99、JS p95、低 5% FPS、掉 tier 次數、畫布記憶體／頁面回收，並錄移動連續畫面。接受門檻：同場景新版本 frame p95 不劣化超過 5%，新增狀態 JS p95 ≤0.5ms（同機固定壓力探針），20 人目標 ≥40 FPS、40 人目標 ≥30 FPS；既有 base 達不到絕對目標時如實報 base/new，不藉此放寬既有 perf:guard。40 人與 iPhone 實機本輪未測。

觀看：14px 身側符號在原尺寸可指出「正回血／正持續受傷」；能指出控制種類及 `= / × / ◇`；灰階仍可區分。手機下滑／開關面板時不掉點、不新增大片模糊；角色上坡、跳躍、跨格、嘲諷者離場時標記不脫離。這項實機體驗必須由使用者／主代理取得，桌機 emulation 不能代簽。

## 8. 實作工作包（依序交給 GPT）

共同前提：每包於 `feat/status-visuals`（或主代理指定隔離分支）實作；不要碰別人寫入中的目錄。每包報檔案清單、數字、產生數字的指令、回退範圍。下列 >3 檔的計畫已預先列出；超出清單先回報理由。不改任何 baseline／閾值，亦不順手修目前的 AI／平衡問題。

每次 code change 共同驗收：`npm run lint`、`npm test`、`npm run build`、`npm run knip`（對 base/main 無新增）；UI 包另 `npm run audit:ui -- all`、`npm run e2e:ui`。長指令依 repo runner，不能停在背景未完成。任何 rendering 包先讀／套 `render-verify` skill，跑其 runtime 與座標驗證；保真預期差異照下表取證，不自行重錄。以下新測試／probe 名稱是**要建立的交付物**，不是聲稱 repo 已有。

### P1 — 正規化與狀態 UI 資料

- 檔案：新增 `data/status/status_display.ts`、`engine/core/StatusQueries.ts`、`types/ui/status.ts`、`engine/systems/ui/views/status.ts`；改 `engine/renderers/status/StatusActivity.ts`、`engine/systems/ui/views/l3.ts`、`types/ui/l3.ts`；新增 `tests/StatusProjection.test.ts`。
- 範圍：17 槽＋shield 正規化，凍結／凝滯去重，INVINCIBLE/POLYMORPH 的有效槽不再被單值外觀漏列；修 banished→isDead UI 判斷。先只輸出已知來源、未知不猜；不改 CCManager。
- 驗收：單狀態20格、同時羊＋無敵＋DOT＋HOT＋盾、0 秒、max=0、缺來源、來源離場、放逐、刷新；時間誤差 ≤0.1s，stable key／同內容參考不變；LayerBoundary、EffectFieldsRatchet、VisualStatusOwnership 原測試全過。
- 畫面：G0/G3、U-banished 同 fixture 重拍。此包若只是資料新增通常圖不變，但修正漏列時 `battle_frozen` 有可能改；五種純地形圖應 0 diff。不要為省保真差異保留已確認的錯誤。

### P2 — 顯示觀測資料（必須先核可 D2）

- 檔案：`types.ts`（GameEvent、AgentView 及純資料型別）、`engine/events/GameEventPool.ts`、`engine/core/ViewCommands.ts`（既有 create/resetAgentView）、`engine/systems/combat/CCManager.ts`、`engine/systems/combat/SkillActions.ts`、`engine/systems/status/EffectSystem.ts`、`engine/systems/HazardSystem.ts`、`engine/presentation/VisualSystem.ts`；新增 `engine/presentation/StatusPresentationSystem.ts`、`tests/StatusProvenance.test.ts`、`tests/StatusObservationDeterminism.test.ts`。
- 範圍：§6.4 的結構化 metadata／receipt；保留舊事件既有欄位與戰鬥流程，新增 optional 欄位 EventPool get/release 都清乾淨；不改 Agent 方法、公開 facade、tick 順序、RNG、效果規則。
- 驗收：兩人續控（較短被忽略）、SLOW 不同人的強度／時長、DOT POISON→BLOOD→FIRE、HOT 來源、護盾累加、DR 拒絕、淨化、同 tick 清掉再施加、reset 後相同 ID、事件回池不污染；每項來源與成功寫入者吻合。`npm run balance:fingerprint -- --battles=60` 不加 record，全部既有指紋零差異；觀測 on/off 加驗全部效果欄位／DR／RNG 亦零差異。
- 畫面／基準：若 HUD 尚未消費新 metadata，此包畫面應 0 diff；D2 不核可即整包不做，不能用解析中文 CC 字串替代。

### P3 — 共享圖示與血條上方狀態列

- 檔案：新增 `data/status/iconShapes.ts`、`engine/graphics/StatusIconAtlas.ts`、`hooks/adapters/statusIcon.ts`；改 `data/vfx/status_parts.ts`、`data/vfx/status_visuals.ts`、`data/vfx/parts/vfxPalette.ts`、`constants/hud.ts`、`engine/renderers/hud/StatusStripPainter.ts`、`engine/renderers/HUDRenderer.ts`、`engine/renderers/RenderPipeline.ts`（傳既有 camera zoom 與 referenceSide 純量，不更動 facade）、`engine/renderers/RenderSpec.ts`、必要的 `GaugePainter.ts`；新增 `tests/StatusIconLayout.test.ts`，擴充 `tests/StatusParts.test.ts`。
- 範圍：22 glyph、修烘焙對齊、20px 下限、底線計時、+N／代表席位（D1 核可後）、血條側關係符號與詠唱避讓。不修改 HP/MP 填條造型。
- 驗收：22 glyph 在 20px/24px/32px 各拍白／暗／森林底；alpha bbox 居中誤差 ≤1 CSS px、不裁 glyph；0/1/4/8/18 效果與四 tier 的 `+N = total−visibleEffects`；freeze/stasis 不重複；同 side 不同 team 仍 ALLY、同 team 不同 side ENEMY、無參考為 UNALIGNED。所有 UI token 與 icon atlas 只一份來源。
- 新探針：`node tools/ui-e2e/out/status-strip-probe.mjs`，至少輸出 JSON 尺寸／座標與 PNG，不能只寫 PASS。D1 未核可時保留舊上限／截斷排序，仍可修字形與座標。
- 基準：`battle_frozen.png` 預期變；五種地形 0 diff；e2e style 是否受共享 glyph 影響按實際 selector 差異列出。

### P4 — 場景零件與品質退化

- 檔案：`data/vfx/status_parts.ts`、`constants/hud.ts`（螢幕尺寸）／`constants/vfx.ts`（節奏與預算）、`engine/renderers/status/StatusOrchestrator.ts`、`engine/renderers/status/painters/StatusPartPainter.ts`、`ShieldPainter.ts`、`engine/renderers/frame/UnitFrame.ts`（在既有 store 算方向，painter 不存歷史）、`engine/renderers/RenderSpec.ts`；新增 `tests/StatusRenderBudget.test.ts`。有方向輸入只改狀態專用路徑，不重構危害共用 PartLayerPainter。
- 範圍：§5 每一列、合烘優先、稜柱護盾改護角、DoT/HoT 保留席位、TAUNT 指向來源、HASTE 動作方向。只允許讀 UnitFrame/projection SSOT；POLYMORPH/FROZEN 的素材與本體 painter 保留。
- 驗收：新增 `node tools/ui-e2e/out/status-cost-probe.mjs`，40 個有效單位、每人多效果，按每 tier 實際 drawImage/clip/gradient/shadowBlur/配置量計數；不超 §7。新 cache 增量 ≤7MiB；四 tier 逐幀切換不重烘新副本。
- 必看：桌機／393×852 原尺寸、20/40人、移動、上坡、空中、同格前後遮擋、羊＋無敵、冰籠＋盾、嘲諷者死亡／離場；至少 12 連續 rAF 幀，附 slot/UnitFrame 記錄；禁止只做靜止 sprite sheet。
- 指令：共同驗收＋`node tools/ui-e2e/runtime-smoke.mjs --shot`（既有 smoke 會進手動一局，只作 runtime 檢查；狀態主取證仍用展示 probe）、`npm run verify:coords`、`npm run perf:guard`、`npm run perf:mem -- 120 mute`。設計階段沒跑這些重量測；這是實作驗收。
- 基準：battle_frozen 預期變；純地形 0 diff，coordinate-protocol baseline 不得增加。若 guard 在 fidelity 已停止，依 P7 保存差異，再獨立跑既有 perf-ab `--assert`，不能把沒跑到的後半說成通過。

### P5 — 施加／結束／週期／抵抗回饋

- 檔案：`engine/presentation/StatusPresentationSystem.ts`、`engine/presentation/visuals/EventHUDMapper.ts`、`engine/presentation/visuals/handlers/CombatVFXHandler.ts`、`constants/hud.ts`、`data/status/status_display.ts`；必要的浮字型別在 `types.ts`；新增 `tests/StatusFeedback.test.ts`。
- 範圍：分辨 ordinary HEAL、HOT、DOT、HAZARD；burn 字不再全部綠色；rate 使用 `/s`；單一持續符號 pulse；刷新無重播；免疫不假增效果。不增地面循環特效、不為每個 HOT 回饋再播完整 HEAL burst。
- 驗收：同人 DOT＋HOT 各連續 3s，兩者皆有回饋、各自頻率與原 emitter 一致；普通治療不被標 `/s`；傷害／治療的**模擬數值完全不變**；事件缺 metadata 退回既有一般顯示，不猜 kind。新瞬間 sprite ≤16/12/8/4；畫面錄影／連續幀需能對到 event payload。
- 指令／基準：共同＋runtime／render-verify；battle_frozen 可能因浮字與回饋改變，其餘純地形 0 diff。無 D2 時略過需要新 metadata 的部分，文案不可假稱完整驗證。

### P6 — 桌機與手機完整狀態面板

- 檔案：新增 `components/ui/inspector/UnitEffectsPanel.tsx`、`data/ui/labels/status.ts`；改 `UnitInspectorBody.tsx`、`types/ui/status.ts`、`engine/systems/ui/views/status.ts`、`data/ui/tokens.ts` 及其生成 `styles/tokens.css`、`hooks/adapters/statusIcon.ts`；必要時擴充既有 primitives，不另造底部視窗；新增 `tests/StatusViewModel.test.ts`、UI e2e status case。
- 範圍：§6 全部互動與可及性；來源選取只走 selectionStore，任何未來引擎寫入只能 useCommands/UI_COMMAND；不在 components 寫效果成立或敵我判斷。
- 驗收：1440×900、393×852、320px、橫向、200%文字；0/1/18效果、暫停／倍速、0.01秒、來源已死、來源缺失、放逐與真正死亡、同側異 team；按鍵／觸控一次可開關詳情，hit target≥44px、無水平捲動、UI audit=0；同快照不重 render、10Hz 之外無倒數 ticker。
- 指令：共同＋`npm run audit:ui -- all`＋`npm run e2e:ui`；必要 token 先 `npm run gen:tokens`。提供 `node tools/ui-e2e/out/status-ui-probe.mjs` 原尺寸圖與量測 JSON。
- 基準：`tools/ui-e2e/style-baseline.json` 中 inspector／相關 layout 可能變；新案例新增覆蓋不等於可重錄舊基準。既有其他視窗、control bars 的 style 值應不變。

### P7 — 合併前取證與清理

- 刪除 `BarPainter.ts:66` 舊控制條的 dead branch 僅限已 `git grep` 確認的舊 timer 讀取，保留血條／護盾／詠唱；沒有引用的 export 才能刪，不能順手掃別的 legacy。
- 跑一輪完整共同驗收與 P4/P6 檢查；逐張 base/new/diff 列出預期視覺變更；固定壓力 profiler＋記憶體＋實機 A/B 按 §7。測試需要重跑的理由附在報告，已過且未再改的檢查不用無限重複。
- 不修改基準、不放寬門檻。如預期差異使 fidelity fail，交主代理舊／新／diff 與精確範圍，由主代理依 `rebaseline-fidelity` 流程另行取得重錄授權；不能把預期失敗寫成全綠。無關失敗停止該檢查並報 log，不修其他系統湊綠。
- 回退：每包獨立提交由有權限主代理完成；回退 P6 不影響戰鬥、P4 可回原場景 painter、P3 可回原 strip、P2 的 optional 事件欄位沒有 consumer 也不影響戰鬥。最終退回基準點為 f61fa017；本設計階段不建立提交。

## 9. 預期基準差異總表

| 基準／守門 | 期待 | 誰能處理 |
|---|---|---|
| `tools/ui-e2e/baseline/fidelity/battle_frozen.png` | 圖示形狀、名牌佔位、狀態零件、浮字可能變 | 主代理取 old/new/diff 後按授權重錄；實作代理只提供證據 |
| `…/fidelity/FOREST.png`、ICE、MAGMA、DESERT、VOID | 純地形內容 0 diff；不得連帶改 tone／terrain／shader | 差異超範圍視為缺陷 |
| `tools/ui-e2e/style-baseline.json` | inspector 新清單／細節／手機高度可能變；其他視窗和操作列不變 | 逐 selector 列差異，主代理取證 |
| `tests/coordinate-protocol.baseline.json`、UI boundary／ownership ratchets | 不增加任何例外 | 實作必須改對依賴／座標，不增 baseline |
| `tools/balance/fingerprint.baseline.json` | 0 差異 | 不可重錄以通過 |
| perf 閾值／`tools/ui-e2e/perf-baseline.json` | 原閾值保留 | 未達標退化視覺／回退，不放寬 |

## 10. 待使用者決定

1. **D1：戰場圖示列改成「有限代表圖示＋明確 +N」，完整清單放 inspector。建議採用。** 理由：目前先減益後增益且直接截斷，滿格時可能完全看不見再生／無敵，也沒有溢出提示（`StatusStripPainter.ts:83`）。手機強塞所有狀態會讓多個名牌更易重疊；提案保留 DoT／HoT 身側訊號，不靠輪播補資訊。這改變 `DECISIONS.md:50`「全部狀態列在血條上方」的既定表述，必須使用者核可。若不採用，維持舊 cap／排序，本輪仍可修 glyph 與補完整面板。
2. **D2：允許在既有模擬事件產生處補「只供顯示的結構化 metadata」。建議採用 P2。** 不改任何模擬結果、平衡、效果槽或 RNG，來源／kind／成功寫入旗標／periodic 類型由當下程式已有資料送出，表現層自行保存。代價是少量改動會碰 CCManager、EffectSystem、HazardSystem、SkillActions 與 pool／types，需要確定性驗收；只允許改表現檔則無法可靠完成「每個效果誰上的」、流血分型與精確抵抗／淨化分類。未核可時依 §6.4 降級，不能以推測補齊。

頭頂／腳下單一最高標記、狀態獨立配色與 Canvas 2D 均維持；沒有第三個需要使用者決策的視覺規則。羊模型風格另案，不以這份計畫重做；原因是本輪辨認缺口可用明確 glyph 與面板解決，現有冰籠／羊的定位和烘焙管線可沿用。

## 10.1 主代理裁定（2026-11-05，使用者授權主代理核可計畫）

- **D1 核可**：圖示列改代表圖示＋`+N`。主代理合併時更新 `DECISIONS.md`，實作代理不碰。
- **D2 核可**：P2 照做，確定性驗收照 §6.4，指紋零差異是硬條件。
- **R1 砍掉戰場關係符號**：血條旁的 `= / × / ◇` 不做，P3 不傳 `referenceSide`，§7 的關係符號成本與記憶體一併扣除。理由：它不是狀態視覺，每個單位多一張圖，陣營染色已負責敵我。Inspector 的 `ALLY / ENEMY / UNALIGNED` 文字照做，判斷仍用 `side`。
- **R2 場景身側符號不加外框**：BODY 位置（DoT、HoT、其他左右第 2 格）畫裸 glyph，只烘 1px 暗色輪廓。切角牌、方牌、圓牌只用在血條上方圖示列與面板。HEAD 標記同樣不加牌框。理由：14～18px 的外框會吃掉字形面積，而且單位身上貼滿小牌會把單位蓋住；mockup 的 FIELD LANGUAGE 畫法以這條為準修正。
- **R3 實機 A/B 不歸實作代理**：§7.3 與 P7 的 iPhone A/B 由主代理和使用者做。實作代理只保證 `statusScene`、`statusStrip`、`statusPulse` 三個呈現旗標存在（只影響繪製，預設開啟，放在 `diagnostics/` 既有的網址旗標做法裡；找不到既有做法就回報，不自創）。

## 11. 未驗證與交付限制

- 未在 iPhone 14 Pro／Safari 實機執行；40 人壓力、120 秒記憶體峰值、5 種地形 A/B 與新規格效能均未驗證。§7 是預算與未來驗收，不是效能提升宣稱。
- 自然實戰只覆蓋這次隨機出現的效果；20 種外觀由固定 renderer fixture 補齊。獨立流血、完整 DR 抵抗／淨化因果、每一種來源覆寫鏈未在自然實戰驗證。
- 新 glyph／UI 為一張靜態提案；尚未實作互動、計時投影、事件觀測與品質退化，亦沒有玩家辨識度測試。灰階辨識度是驗收目標。
- 沒有跑 lint/test/build、perf:guard/fidelity 或重錄任何 baseline：本輪未改遊戲程式，probe 已實跑且查看輸出；後續實作仍須照各包驗收。
- 本輪已確認真實帶狀態的畫面與移動幀；沒有把引擎狀態 JSON、錯抓的黑 canvas 或桌機 FPS 當作視覺／手機效能證明。
