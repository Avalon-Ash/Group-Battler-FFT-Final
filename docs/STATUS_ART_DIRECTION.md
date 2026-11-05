# 單位狀態美術第三版：軟性增減益

2026-11-06；`C:\Git\_wt_status_art`，分支 `feat/status-art`。本輪只有文件、原型、烘焙腳本，未修改遊戲、public/assets、測試、基準，沒有 commit。本文件依第三版裁定重寫，第二版衝突段落不再有效。

## 1. 採用清單與交付

| 項目 | 使用者裁定 | 實作範圍 |
|---|---|---|
| STUN、ROOT、BURN、POISON | **已採用第二版** | 造型不改；原始附件像素重新打包，四項逐通道差異均為0。 |
| POLYMORPH | 第二版模型只縮腿 | 四腿軸長剩30%，身體下移，蹄底保留；四向各4幀已Blender重烘。 |
| FROZEN | **第二版新規格：使用者未採用** | 維持現行整身冰籠；不實作第二版冰藍材質／下肢冰。 |
| INVINCIBLE | **第二版新規格：使用者未採用** | 維持現行日輪／射線；不實作金材質、降幀與金框。 |
| SHIELD | **第二版新規格：使用者未採用** | 維持現行稜柱、掃描環與盾量血條；不實作貼身透明殼。 |
| REGEN | **第二版新規格：使用者未採用** | 維持現行上升光點；不改為只在治療事件短閃。 |
| 血條上方圖示列 | **第二版新規格：使用者未採用** | 直接使用現行BarPainter／StatusStripPainter，保留數量、尺寸、倒數、品質階層與選取行為。 |
| SLOW、VULNERABLE、HASTE | **第三版第一優先候選，待裁定** | 三者均已完成持續效果、比較圖、手機、疊加與連續幀。 |
| BLIND、REFLECT、LIFESTEAL | **第三版第二優先候選，待裁定** | 三項均已做並各自存檔；不因出現在板上便視為採用。 |
| 其餘未點名狀態 | 維持現行 | 包含BANISH、STASIS、SILENCE、FEAR、TAUNT、BLEED；第二版未驗證的推測規格不交付實作。 |

遊戲沒有獨立降防狀態。「破甲聖劍」「破城重弩」是技能名；`DamageCalculator.ts:111` 的VULNERABLE令受到傷害乘1.35。下文「破甲」只描述此狀態的外觀，不新增護甲數值／效果槽。

- [主對照板](status_art/board-v3.png)：1800×2415。第一排三主效果，第二排三次要效果；下方手機、疊加、新羊四向、加速方向與20人新舊混戰。請以100%開圖。
- [手機393×852](status_art/v3/mobile.png)、[手機20人](status_art/v3/crowd-mobile.png)、[桌機20人](status_art/v3/crowd-desktop.png)。桌機zoom1.4、放大2.3、手機zoom0.68。手機由DPR2畫布轉成CSS像素圖，另在viewport393×852／devicePixelRatio3執行過。
- [疊加](status_art/v3/combinations.png)、[六狀態疊加](status_art/v3/stress-combinations.png)、[羊四向](status_art/v3/sheep-four-directions.png)、[加速方向](status_art/v3/haste-direction.png)、[六項三外觀](status_art/v3/all-variants.png)。
- [連續幀播放](status_art/v3/motion/preview.html)，8fps；[直接繪製原型](status_art/prototype-v3.html)需Vite。沒有建立GameEngine、沒有按START SIMULATION。

20人圖使用三種正式外觀的固定fixture，混用已採用第二版、第三版候選及要求保留的現行效果；是候選核可後的美術組合預覽，並非自然戰鬥或已上線結果。

## 2. 三個主效果的固定規格

尺寸為腳錨相對world units；使用正式角色sprite、正式縮放、TerrainRenderer與現行HUD。精確曲線、色值、profile在[v3-runtime.js](status_art/v3-runtime.js)。準備時只烘單獨效果，draw時才與人物組合；沒有把人物＋效果拍成大圖後宣稱只繪一次。軟性圖格128×128、2px/world unit、格內腳錨(64,112)，draw rect=(-32,-56,64,64)。

| 狀態 | 持續造型 | 動作與實作 |
|---|---|---|
| SLOW 減速 | 兩個貼鞋底向側後拉扯的灰色黏滯拖痕，中心約(-7,-1)、(7,3)。深底`#4b535b`、主面`#91a1a5`、剪切線`#d3d9d1`。低伏寬扁曲面，不是箭頭、足圈、霜柱或藤蔓。 | 4幀、8fps；拖曳端偏移±1.3，單側約23×14、亮線寬1.3，兩側合烘一片。只表示被拖住，不再乘一次步速。ROOT仍向上纏小腿，SLOW在其前方較低的鞋底，兩者不共用造型。 |
| VULNERABLE 易傷／破甲 | 胸腹不對稱破口，約x=-11…8、y=-24…-10；深層`#322b31`、暴露底層`#9c686f/#cc9b95`，剝起甲邊`#949da1/#8b9599`、斷面`#dad5bf/#d7d4c3`。不畫裂盾、閃電、胸章，不遮臉。 | 4幀、8fps，甲邊只張合±0.35，破口始終存在。一張貼片依torso profile對位。戰士不偏移；法師寬0.78、Y=-2；坦克Y=-1。三外觀原型共用破片；全職業甲／布材質與武器前後遮擋尚未完成，後續依外觀準備片，不准runtime clip。 |
| HASTE 加速 | 雙臂／胸側兩條開放曲線，y約-28…-14，最外側x約±19；暗邊`#526565`寬3.5、乳白風體`#f2f0dd`寬2、白脈衝寬2.7。不用上升粒子或封閉魔法環。 | 8幀、8fps，左右反相，靜止仍循環，表示動作及技能回轉加快。移動時另加一張後方尾流，反向跟隨實際投影位移，長26–31、兩道不等長、alpha0.60–0.70、亮邊`#fcf9e8`。停下只去尾流，雙臂風不消失。 |

HASTE正式方向必須取連續兩次VisualMath投影後的真實位置差，或等價presentation velocity；不能用facing，也不能將未投影世界Y當螢幕Y。原型移動位置`x=290+35sin(2πt)`，尾流用其導數`vx=70πcos(2πt)`，另有上下左右及靜止圖。效果不更動移速或cooldown。是否能讓玩家聯想到冷卻加速仍需使用者判讀，沒有以標籤代替辨識測試。

三者兩隊同色，不讀LION_*／ASH_*陣營色帶；不用加法光暈、範圍圈、光柱或大片地面罩染。保留的現行護盾原有陣營環不屬於這次改色範圍。

## 3. 第二優先候選

| 狀態 | 已做的持續原型 | 邊界 |
|---|---|---|
| BLIND | 貼眼部炭灰遮蔽約22×9，`#403d43`主片、`#89838a`擦痕；4幀8fps、Y漂移±0.5；眼錨約y=-32，依三外觀torso offset修正。 | 不畫眼睛符號或繞頭煙球；法師帽頂不當眼錨。全職業／四向臉部定位仍需補。 |
| REFLECT | 肩甲／前臂灰銀折面，`#53626a/#9ca9ab`，邊`#d4dfde/#ffffff`；兩側合片，2幀8fps交替亮度，全程保留金屬面。 | 無環繞六角鏡片。此處是常駐能力材質，不冒充反傷成功事件；命中方向與回擊短閃未做。 |
| LIFESTEAL | 持武器前臂通向胸的暗莓紋，底`#542f46`寬4.8、主紋`#ad738f/#d5a4b3`寬2.5、內線`#e1c0ca`寬1.1；2幀8fps交替亮度。 | 表示具有吸血能力，不宣告傷害／治療成功；不畫上升血滴或地面血。真吸血事件由手臂收向胸的單次序列未做。 |

六項完成時均保存checkpoint與獨立比較圖。第二優先可逐項採用。

## 4. 已採用四項與羊

STUN沿用第二版三小星環、1秒8幀、人物`sin(2πt)×0.065rad`失衡與scaleY0.96；ROOT沿用兩條粗藤及前後片，暗邊5.6／主線4／亮線1.2；BURN沿用三股貼身火舌8幀；POISON沿用全身47%混色與4幀泡泡。造型／色值不改。

附件直接從`v2/effects-atlas.png`搬格，不重新光柵化：STUN槽0–7、BURN8–15、POISON16–19；ROOT從28搬至20。[artifact-check.json](status_art/v3/artifact-check.json)逐通道差異全部0。未採用的其他第二版槽不載入第三版候選。

羊腳本增加`--short-legs --sheep-only`；不帶參數仍可重現第二版。腿／蹄圓錐只縮局部長軸至0.30，半徑不變；蹄底中心z=0.025保留，身體／頭／耳／尾一起下降`(0.50-0.025)×0.70=0.3325`模型單位。腿水平步幅隨長軸縮短，四蹄每幀原地面點保留。沒有縮整張羊圖或改頭身比例。相機、材質、點頭序列相同。

四向SE／SW／NE／NW各4幀、8fps；原烘焙384×512，腳錨(192,410)，裁邊到512×512 atlas。[manifest](status_art/proto/v3/sheep/bake-manifest.json)保存每幀8根腿／蹄軸測量，長軸比例最大誤差5.17e-8、蹄底Z最大誤差3.73e-10；烘焙assert通過。

## 5. 疊加、座標與draw成本

順序：HASTE後方尾流 → ROOT後片 → 本體／毒材質／羊 → 破甲、反傷、吸血 → 原火／毒泡 → ROOT前片 → SLOW鞋底 → HASTE雙臂風 → BLIND → 保留現行效果 → STUN星環。正式仍在單位assembly裡依UnitFrame／VisualMath取腳、軀幹、臉錨點，不重算地形、不移到全場overlay蓋過前方人。

三主效果不因ROOT、STUN、BURN、POISON或tier而取消。六狀態圖是「三者＋暈眩＋定身＋燃燒」和「三者＋暈眩＋定身＋中毒」。BURN／POISON共用同一DOT槽，沒有偽造遊戲兩者同時成立。羊與軟效果完整重定位未驗證；現行凍結／羊仍依原身體替換語意。

下表實測drawImage含人物，不含地形／HUD。舊效果也計入，沒有把合成快照只算一次。

| 路徑 | 靜止 | 有移動向量 |
|---|---:|---:|
| SLOW或VULNERABLE單獨 | 2 | 2 |
| HASTE | 2 | 3 |
| BLIND／REFLECT／LIFESTEAL各單獨 | 2 | 2 |
| 三主效果同時 | 4 | 5 |
| 三者＋STUN／BURN／POISON各一 | 5 | 6 |
| 三者＋ROOT | 6 | 7 |
| 三者＋STUN＋ROOT＋BURN或POISON | 8 | 9 |
| 第二版STUN／BURN／POISON各單獨 | 2 | 2 |
| 第二版ROOT／新羊 | 3／1 | 3／1 |
| 現行FROZEN／INVINCIBLE／SHIELD／REGEN | 4／3／6／4 | 相同 |
| 現行FROZEN＋SHIELD | 9 | 9 |

第二版「每人持續最多4次、被截掉只留HUD」作廢，否則會藏掉使用者要求常駐的效果，且現行盾單獨已需6次。單一主效果新增1次，HASTE移動另加1次。未列全狀態任意組合沒有宣稱固定上限。

T0/T1表定8fps；T2可降4fps，T3可降2fps並省移動尾流，但不能省鞋底、胸甲破口、雙臂風。切tier只改幀索引、不烘副本。現行冰、盾、回血、HUD仍用現行品質規則；本輪未接正式tier切換。

## 6. 記憶體與效能硬限制

**draw路徑clip、Path2D、shadowBlur、filter、漸層、每單位離屏皆為0。** 只取共享圖集做drawImage與變換。準備階段可烘單獨效果／逐像素毒色，禁止draw miss同步烘圖。現行HUD圖示的首次素材準備有裁切，不是逐單位draw裁切。

毒材質池實際縮成768×1024、64格96×128、固定3MiB，只使用POISON六幀頁。鍵為外觀含hue＋動作＋方向；RGB保持原53%＋毒色47%，透明度不變。目前三外觀idle/SE共18格。最多容納10個完整六幀頁，剩4格不能放第11頁。更多頁需要活躍頁保護後再回收；缺頁退原人物＋已採用毒泡，不同步烘圖、不無限擴容。

原型有固定池與LRU，尚未接正式狀態進入／換向／動作排程、活躍頁保護或Worker。畫板準備在draw前完成；不能把整批準備時間塞進遊戲幀。正式仍須戰鬥外預熱或背景／分批準備。

| 從第二版調整 | MiB |
|---|---:|
| 第二版基準 | 9.296875 |
| 不採冰／金新材質，實際縮材質池6→3MiB | -3.000000 |
| 不採新盾、霜、回血、下肢冰，效果atlas縮1024×512→1024×384 | -0.500000 |
| 不新增第二版HUD atlas，直接用現行HUD快取 | -0.250000 |
| 六狀態共享atlas1024×512 | +2.000000 |
| **第三版相對現行遊戲的候選增量** | **7.546875** |
| **比第二版少** | **1.750000** |

明細：毒池3＋已採用附件1.5＋新附件2＋羊1＋唯一共用scratch0.046875＝**7,913,472 bytes**。軟atlas32格：SLOW4、VULNERABLE4、HASTE8、尾流8、BLIND4、REFLECT2、LIFESTEAL2；已採用atlas21格，保留3格空容量；羊16格。若只採第一優先仍按已配置2MiB計，不把空格假算成已省。新增全職業／四向貼片尚未烘，不包含在此容量；之後須先裁邊重排、回報，不得暗增。

DPR3不令圖集乘9，目前正式主renderer上限DPR2。每單位canvas新增0、全屏後處理新增0。比較板、checkpoint、第二版比較原圖、Blender原始PNG不是正式同時載入資源；正式只載裁邊圖集。原有冰籠、盾、HUD資源仍在，沒有假扣舊資源。

這是RGBA邏輯容量，不是Safari resident量測。若CPU／GPU各一份約15.09MiB，另加metadata、暫時ImageData與驅動開銷；既有陣營圖集也仍在。不能用本表宣稱iPhone GPU通過。

## 7. 重現與驗證

來源為`prepare-v3.mjs`＋`v3-runtime.js`；`render-v3.js`是生成產物。素材／板圖逐項存檔。

```text
node tools/agent/run.mjs status-art-v3-bake-verify 180 -- C:/Git/_asset_staging/tools/blender/blender-4.5.13-windows-x64/blender.exe -b -t 4 -P tools/assets/blender/render_status_art.py -- C:/Git/_wt_status_art/docs/status_art/proto/v3/sheep --sheep-only --short-legs
node docs/status_art/prepare-v3.mjs
node tools/agent/run.mjs status-art-v3-final 180 -- node docs/status_art/capture-v3.mjs
node docs/status_art/verify-v3.mjs
```

皆退出0。Blender16張及長軸／蹄底assert通過；有extension cache寫入警告但PNG完成。WMI權限不足時wrapper自動退spawn，後續以前景wrapper完成，已讀退出碼，沒有留下烘焙或擷取程序。

[evidence.json](status_art/v3/evidence.json)：34張PNG、45個有效單狀態fixture、43個案例各測靜止與移動，pageerror0；所有案例禁止的六項呼叫均0。含所列新舊組合，不涵蓋地形／UI首次素材準備或整場效能。[mobile-browser.json](status_art/v3/mobile-browser.json)為393×852／DPR3執行證據；[artifact-check.json](status_art/v3/artifact-check.json)記錄PNG尺寸、採用四項0差異、羊與記憶體加總。

已用原尺寸看手機、主效果、六狀態、新羊四向、三外觀、混戰與連續幀。第一輪破甲遮下臉、氣流像折角符號，已改為胸腹破口與曲線；減速移至藤蔓下方鞋底。密集20人仍有現行圖示／血條遮後排身體，沒有為了美化預覽而隱藏HUD。

沒有npm安裝、perf:guard、perf:fidelity或遊戲baseline重錄；依任務範圍不做重量回歸。

## 8. 待裁定與尚未驗證

要使用者決定：三主效果與新羊縮腿結果是否採用；第二優先三項可分項裁定。建議先核可主效果與羊，次要項目分開決定。已採用四項與保留現行項目不重問。

尚未驗證：iPhone14 Pro／Safari實機GPU與resident記憶體、自然20人戰鬥、玩家對破甲／移速及冷卻加速的辨識率、全職業與所有hue／四向／walk／attack／cast貼片對位及武器遮擋、飛行／高差、所有狀態組合、正式tier切換、材質排程與冷載／回收尖峰、反傷／吸血真事件及完整入出場。這些不宣稱本輪完成。

後續只接使用者核可的素材／profile／毒池與presentation排程；不得順帶改冰、金身、盾、回血、HUD或simulation值。若正式實作改座標／排序，再同步RenderSpec與檔頭。本輪沒有改遊戲協議。
