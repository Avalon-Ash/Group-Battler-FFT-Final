# ART_STYLE_BIBLE — 美術風格聖經（FFT-like 奇幻 HD）

> 決策者：使用者授權主代理全權決定（2026-10-11）。題材：**奇幻**；格子：**保持六角**；畫風：**HD 手繪、柔和賽璐珞（cel）上色**，目標質感 = *Final Fantasy Tactics: The War of the Lions HD* × *Tactics Ogre: Reborn*。相機：固定等距視角、不旋轉。

## 1. 總則

| 項目 | 規範 |
| :-- | :-- |
| 單位比例 | 約 3.5 頭身的 chibi-realistic，全身、強辨識剪影 |
| 線條 | 乾淨的深棕色外框（約 2–3px @ 原圖），不用純黑 |
| 上色 | 手繪質感 + 柔和賽璐珞陰影；暖色大地調為底，重點色用在陣營識別 |
| 光源 | 左上方柔光；不烘焙地面陰影（陰影由引擎 `UnitShadowPainter` 繪製） |
| 背景（生成時） | **純綠 #00FF00 平塗，無地面、無陰影、無文字**，以便程式去背 |
| 朝向 | `front` 表＝面向**右下（SE）**的 3/4 正面；`back` 表＝面向**左上（NW）**的 3/4 背面。其餘兩個方向（SW／NE）由程式**水平鏡射**取得（相機不旋轉，故只需 2 張） |
| 同表一致性 | 一張表內 5 個職業等比例、同高度基線、同間距；換陣營/換朝向時**必須帶前一張當參考圖**，並明說「same art style, proportions, line weight, scale, positions」 |

## 2. 陣營識別

| 陣營 | 對應引擎 `Team` | 名稱 | 色票 | 紋章 | 氣質 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 藍方 | `Team.BLUE`（舊 Imperial） | **Lionheart Knights 獅心騎士團** | 皇家藍、鋼銀、金邊、白布 | 獅子 | 正統、整潔、莊嚴 |
| 紅方 | `Team.RED`（舊 Covenant） | **Ashen Legion 灰燼軍團** | 暗緋紅、炭黑、骨白、鏽鐵與青銅 | 角骷髏＋火焰 | 鋸齒狀盔甲、較具威脅感 |

> 引擎內部的 enum 名稱（`Team.BLUE/RED`、`Role.*`）**不改**；只改外觀資料。舊科幻外觀（Imperial/Covenant token）保留為 `procedural` 後備模式。

## 3. 職業 → 造型（每陣營同構）

| `Role` | 造型 |
| :-- | :-- |
| `TANK` | 重甲騎士、巨大塔盾、短劍 |
| `WARRIOR` | 輕甲劍士、長劍扛肩 |
| `RANGER` | 兜帽弓手、長弓、箭袋 |
| `MAGE` | 尖帽黑魔導士風、法杖＋發光水晶（藍方水晶藍光、紅方橘紅火光） |
| `SUPPORT` | 白袍（藍方）／暗兜帽（紅方）牧師、權杖、聖典 |

## 4. 地形五主題（與引擎 `MapTheme` 對應：VOID／FOREST／ICE／MAGMA／DESERT）

每主題兩張材質：**頂面**（嚴格俯視、無透視、無陰影、均勻光、可無縫拼貼）與**懸崖側面**（正視、層狀岩層、可水平拼貼，上緣允許保留一圈苔蘚/冰緣/砂緣）。

| 主題 | 頂面 | 側面 |
| :-- | :-- | :-- |
| VOID | 暗紫黑裂紋奧術石，隱約紫色符文脈 | 黑曜岩層、紫色微光 |
| FOREST | 青苔草地、小三葉草與落葉 | 棕色泥土岩層帶樹根 |
| ICE | 淡藍霜冰、白色霜晶與細裂紋 | 藍白冰川層 |
| MAGMA | 暗玄武岩殼、橘色熔岩裂縫 | 焦黑岩層、發光裂縫 |
| DESERT | 金黃細沙波紋、少量小卵石 | 橘褐砂岩層 |

## 5. 生成記錄（可重現）

模型：Google Gemini 圖像生成（透過 Antigravity `generate_image`）。以下為實際使用的提示摘要，原圖在 `art-source/`。

1. **units_blue_front**：*Character sprite sheet for a tactical RPG in the style of FFT: The War of the Lions HD and Tactics Ogre Reborn. Five full-body fantasy characters in a single horizontal row, same 3/4 front-facing pose looking toward the lower-right … chibi-realistic about 3.5 heads tall, hand-painted HD, soft cel shading, clean dark-brown outline … Faction Lionheart Knights — royal blue, silver, gold, white … TANK / WARRIOR / RANGER / MAGE / SUPPORT … flat pure green #00FF00 background.*
2. **units_red_front**：帶 `units_blue_front` 當參考圖，指定 Ashen Legion 配色與紋章，其餘同上。
3. **units_blue_back / units_red_back**：帶對應 front 表當參考圖，*same five characters seen from BEHIND in a 3/4 back view facing away toward the upper-left … keep every costume detail identical*。
4. **terrain_grid**：帶 `units_blue_front` 當風格參考，*10 square flat texture swatches in 2 rows × 5 columns … strictly top-down, shadowless, seamlessly tileable hand-painted material …*（生成圖含了 swatch 下方文字標籤，**處理腳本須只裁切 swatch 內部**，忽略標籤）。

## 6. 後續素材生成規則（給所有代理）

- 一律**先帶既有成品當參考圖**再生成新素材，確保風格延續；一次只生成一張表（5–10 個物件），不要要求一次生成整套。
- 需要透明背景者一律要求純綠 #00FF00 平塗，由 `tools/assets/` 的處理腳本去背（去綠邊 despill）。
- 每張新圖要在 `docs/ASSET_LEDGER.md` 記錄：檔名、來源（AI 生成／下載）、模型或作者、授權、日期、提示摘要或來源網址。
- 禁止使用有明確版權角色／商標的描述（不要寫「Final Fantasy 角色名」，只用風格描述）。

## 7. 體型軸（BodyType）— 單位外觀的第三個維度

> 使用者決策（2026-10-11）：雙陣營 × 五職業 **都要有男女兩種體型**，且這是**基本架構**；未來會擴充幼童、巨人、動物、神話生物等差異體型。因此外觀鍵是 **`Team × Role × BodyType × view`**，而不是寫死「男／女」。

### 7.1 現階段體型
| `BodyTypeId` | 說明 | 生成規範 |
| :-- | :-- | :-- |
| `MALE` | 基準體型（原 5 張表） | 寬肩、較重的裝甲量體 |
| `FEMALE` | 女性體型 | **重畫輪廓**：肩與軀幹較窄、收腰、下擺／裙甲較展開、四肢較細、手較小、整體高度約基準的 92%（武器／盾牌尺寸不變）、柔和臉部、可見的髮型（馬尾／辮子／捲髮）；裝甲為收腰剪裁。同一套服裝語彙、同陣營配色與紋章 |

注意：紅方戰士／遊俠／法師／輔助的面具會遮臉，性別辨識主要靠髮型與輪廓——這是設計上可接受的。

### 7.2 檔名與資料鍵（已生成的 8 張）
`art-source/units_<blue|red>_<m|f>_<front|back>.jpg`。一張表固定 5 人（TANK／WARRIOR／RANGER／MAGE／SUPPORT）、同基準線、同間距。manifest 鍵：`<TEAM>:<ROLE>:<BODY>:<front|back>`，例：`BLUE:MAGE:FEMALE:front`。（§5 中舊檔名 `units_<team>_<view>.jpg` 已更名為 `units_<team>_m_<view>.jpg`。）

### 7.3 擴充規則（未來體型）
- 新增體型＝新增 `BodyTypeId` 成員 + `data/units/appearance/bodyTypes.ts` 的一筆 `BODY_TYPE_PROFILE`（`heightScale`、`shadowScale`、`hitboxVisualScale`、`anchorYOffset`、`animProfile` 〔呼吸／跳步幅度倍率，巨人較慢、幼童較快〕、`fallback` 〔缺圖時退回哪個體型，預設 `MALE`〕）+ 該體型的圖集。**不得改渲染器程式**。
- 非人形（動物／神話生物）的職業造型可不同：`SPRITE_APPEARANCE` 以 `Team × Role × BodyType` 取值，缺值走 `BodyType.fallback` 鏈，最終退回 `procedural`。
- 每次生成新體型：一次一張表，**帶同陣營 MALE 表當風格參考＋明說「重畫身體輪廓，不只換髮型」**（只改髮型與臉是實測會發生的失敗模式）。
- 參考資料：`art-source/ref_v0_gpt_pixel/`（使用者提供的 GPT 像素風造型稿）**僅作服裝／髮型／配件設計參考，不得直接入庫為遊戲素材**（畫風為像素風，與本專案 HD 手繪不同）。

### 7.4 生成記錄補充
5. **units_<team>_f_front**：帶 `units_blue_m_front`（紅方帶 `units_red_m_front`＋`units_blue_f_front` 當身體畫法參考）重畫為女性體型（第一次只換髮型失敗，第二次明確要求「重畫身體輪廓」成功）。
6. **units_<team>_f_back**：帶對應 `f_front` ＋ `m_back` 當參考，*seen from BEHIND … keep every costume detail and feminine body type identical*。

## 8. 單角色旋轉圖（Turnaround）規範 — 取代 §7.2／§7.4 的「整陣營分表」流程

> **背景（使用者 2026-10-11 驗收回饋）**：先前「整陣營 5 人一張、正面表與背面表分開生成」的做法，背面表是**另一次獨立生成**，導致持握手、盾牌／劍位置、髮型髮色、飄帶等細節前後對不上（騎士的劍盾最嚴重：背面只是身體轉向、盾劍沒有跟著翻到正確側）。使用者提供的 GPT 三視圖沒有此問題，因為**同一角色的所有視角在同一張圖中一次生成**。舊的 8 張分表已移到 `art/_superseded/`，**不得用於遊戲素材**（只留作風格參考）。

### 8.1 新流程：每個（陣營×職業）一張圖，共 10 張
- 檔名：`art-source/turn_<blue|red>_<tank|warrior|ranger|mage|support>.jpg`。
- 版式（固定，處理腳本依此切割）：**單列 4 個全身人物、等比例、同地面基準線、等間距**，由左至右：① 男性正面（3/4 面向右下 SE）② 同一男性背面（3/4 背向，面向左上 NW）③ 女性正面 ④ 同一女性背面。純綠 #00FF00 背景。
- 生成當下就把「持握側」寫進提示（以**角色自身的左／右手**描述，並明說兩視角在畫面上的對應左右互換）。圖上若仍出現 (1)(2)(3)(4) 之類編號文字，**處理腳本以面積門檻忽略**（它們是遠小於人物的獨立連通元件）。
- 一致性驗收（逐張目視，不過就重生，最多 3 次）：同一把武器／盾牌在正背面指向同一隻手；盾牌背面可見內側握把與綁帶（不是紋章面）；髮型、髮色、頭盔羽飾／飄帶方向、披風、箭袋前後連續；男女各自連貫。

### 8.2 各職業的固定持握（角色自身左右手）
| 職業 | 持握規範 |
| :-- | :-- |
| TANK | 盾綁在**左**臂、短劍握於**右**手 |
| WARRIOR | 長劍握於**右**手、扛在右肩上；左手扶腰帶；劍鞘掛在**左**髖 |
| RANGER | 長弓握於**左**手、**右**手持箭；箭袋斜揹於背後（背帶由左前胸斜向右後） |
| MAGE | 法杖握於**右**手 |
| SUPPORT | 權杖握於**右**手；聖典夾持於**左**側 |

### 8.3 已知限制（水平鏡射）
單位朝左（SW／NE）時程式以水平鏡射取得，鏡射後持握手會互換（例如盾變成在右臂）。這是 FFT-like 2.5D 的常見取捨，**本輪接受**；若日後要消除，需為朝左另生成一組圖。不要為此再增加素材或寫特例程式。

### 8.4 生成記錄補充（取代 §7.4）
- 提示範本要點：*Character turnaround model sheet, ONE character design … four full-body figures in one horizontal row … (1) MALE front 3/4 lower-right (2) the SAME MALE from behind, 3/4 back view toward upper-left (3) FEMALE front (4) the SAME FEMALE from behind … STRICT 3D CONSISTENCY: <weapon> in the character's <LEFT/RIGHT> hand … in the back view they swap sides on the viewer's side …*。
- 第一張（藍 TANK）作為版式與一致性標準；後續每張帶「該陣營舊 front 表（只當服裝與畫風參考）」＋「`turn_blue_tank.jpg`（只當版式與一致性標準）」兩張參考圖。

## 9. 四向原生視角（取代 §8.3「接受鏡射」）

> 使用者決策（2026-10-11）：現在的圖像模型已能在同一張圖裡產出一致的多視角，**不應再接受「朝左時持握手互換」**。（業界現況：多數遊戲仍以水平鏡射省成本；但本專案角色有明確的單側裝備——盾、弓、箭袋、劍鞘——鏡射會直接造成錯誤，而且 §8 的實測證明同圖多視角可以做到一致，所以改為原生繪製四個斜向。）

### 9.1 四個方向
`SE`＝面向右下（主要視角）、`NW`＝背向、面向左上、`SW`＝面向左下、`NE`＝背向、面向右上。單位 `facing=+1` 用 SE／NE，`facing=−1` 用 SW／NW；上下由垂直移動／目標方向決定。

### 9.2 每個（陣營×職業）兩張旋轉圖，共 20 張
- **A 表** `turn_<team>_<role>.jpg`（§8 已生成的版式）：男 SE、男 NW、女 SE、女 NW。
- **B 表** `turn_<team>_<role>_b.jpg`：**同一批角色**的男 SW、男 NE、女 SW、女 NE。生成時**必須帶對應 A 表當參考**，並明說：*the same four characters as the reference sheet, same costumes, colors, hair and equipment sides in the character's own left/right hands, but now rotated: (1) male facing lower-LEFT toward camera (2) male from behind facing upper-RIGHT (3) female facing lower-LEFT (4) female from behind facing upper-RIGHT; do NOT mirror the reference image — the shield/sword/bow/quiver must stay on the same hand of the character, which means they appear on the opposite side of the picture compared with the SE view*。
- 持握規範仍用 §8.2（以角色自身左右手為準）。一致性驗收同 §8.1，並新增：SW 視角的持握手要與 SE 視角是同一隻手（畫面上位置左右對調才是對的）。
- 驗收流程：處理腳本輸出四方向並排預覽，目視確認；不過就重生（最多 3 次）。

### 9.3 鏡射的角色
僅作**缺圖後備**（資料宣告 `mirrorFrom`），例如日後新增體型暫時只有 SE／NW 兩個方向時先頂著用。

## 10. 單位素材來源變更（2026-10-11 決策；取代 §8、§9 的「AI 旋轉圖」生產流程）

AI 逐張生成旋轉圖（含單圖多視角）的正背面一致性（持握手、盾劍、髮型飄帶）無法保證，**改採 3D 預渲染管線**：CC0 已綁骨架角色包（KayKit Adventurers、Quaternius Universal）＋ Blender 離線渲染四向（SE／SW／NE／NW，不鏡射）與固定動作清單。細節見 `PILOT_3D_PLAN.md`。

- **保留**：§7 體型軸（`Team × Role × BodyType`）、§9 的四向資料結構與 `mirrorFrom` 後備、A2e 的隨機派發與編輯器、陣營識別（§2）、地形材質（§4，仍用 `terrain_grid.jpg`）。
- **降級為風格參考（不入遊戲）**：`art/_superseded/`、`art/turn_*.jpg`、`IMAGE_PROMPT_PACK.md`，以及使用者自備的雙陣營五職業 10 張圖。
- **待試驗後確認**：低多邊形卡通渲染是否接受；女性體型來源（Quaternius）；動作格清單與格尺寸。
