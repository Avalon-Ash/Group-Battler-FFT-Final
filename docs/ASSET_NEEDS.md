# ASSET_NEEDS.md — 下一階段美術素材盤點與規格需求書

> **2026-10-29 狀態（以這段為準，下方是 10-19 的原始盤點）**
> - §2 障礙物：WALL、TREE、ICE_CRYSTAL、OBSIDIAN_PILLAR、SANDSTONE 與 4 種地面裝飾已換成烘焙圖集（`public/assets/obstacles/`）。ICE 冰塊牢籠（`FrozenPainter.bakeIceBlock`）與 SHEEP 變形羊（`PolymorphPainter`）仍是程式繪製，目前沒有換圖計畫。
> - §3 單位：兩陣營 × 五職業 × 男女共 20 張圖集已上線（`public/assets/units/`，含專用男神官）。只剩 P3 的特殊體型（半身人、巨人、野獸），沒有排程。
> - §4 特效：已改走零件烘焙管線（`data/vfx/parts/`、`engine/renderers/vfxparts/`），不再需要貼圖素材。
> - §5 圖示：狀態圖示由 `engine/renderers/hud/GaugePainter.ts` 程式繪製；技能圖示目前 UI 沒有使用的位置。
> 結論：正式版素材的 P1 已全部到位，沒有缺口。

本文件為 **Task A3** 產出之視覺資產需求評估報告。依據專案現有資料庫（`data/obstacles.ts`、`data/scenes.ts`、`data/skills/`）、渲染管線（`engine/graphics/EnvironmentFactory.ts`、`SpriteManager.ts`、`VFXFactory.ts`、`ParticleRenderer.ts`）以及未來擴充規格（`docs/ART_STYLE_BIBLE.md` §7、§11），全面盤點目前仍採純程序化繪製之物件與後續建議導入之素材清單。

---

## 1. 規格總覽與座標基準

為保持與現有 2.5D Isometric 六角格渲染管線相容，所有新素材應遵循以下統一空間契約：
- **相機視角 SSOT**：正交相機仰角 30°（對應引擎 `ISO_SCALE_Y = 0.5`），不旋轉。
- **單位空間尺度**：六角格半徑 `HEX_SIZE = 48px`，格子寬高約 `96px × 48px`，標準單位高度約 `52` 畫布像素。
- **渲染風格 SSOT**：Cel-shading（卡通色階）＋ 1~2px 深褐描邊（`#1a1010`），色彩飽和度適中，避免寫實雜訊干擾戰術辨識。

---

## 2. 障礙物與場景物件清單 (Obstacles & Environment Props)

| Key | 名稱與用途 | 目前實現方式 | 建議像素尺寸 (W×H) | 錨點 (Anchor) | 多朝向需求 | 優先級 | 說明與細節 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `WALL` | 石牆（阻擋移動、視線；飛行可跨越） | `EnvironmentFactory.drawIsoWall` (多邊形擠出) | 128 × 160 | 底面中心 (64, 140) | 單向即可（六角對稱） | **P1** | 粗糙石磚砌築城牆，頂面留有苔蘚或碎裂痕，高約 3 個 BLOCK_HEIGHT。 |
| `TREE` | 古木（阻擋移動、視線；飛行可穿樹冠） | `EnvironmentFactory.drawIsoTree` (幾何三角錐) | 128 × 192 | 底面中心 (64, 160) | 單向即可 | **P1** | 針葉/闊葉交錯之密林古樹，底盤樹根扎入六角格內，樹冠高度適度超出格子上緣。 |
| `ICE_CRYSTAL` | 冰晶（阻擋移動；不擋視線、飛行） | `EnvironmentFactory.drawIsoCrystal` (稜鏡多面體) | 128 × 160 | 底面中心 (64, 140) | 單向即可 | **P1** | 半透明淡藍晶體柱簇，微帶折射高光，底部帶碎冰結霜。 |
| `OBSIDIAN_PILLAR` | 黑曜石柱（阻擋移動、視線與飛行） | `EnvironmentFactory.drawIsoPillar` (幾何高柱) | 128 × 220 | 底面中心 (64, 190) | 單向即可 | **P1** | 漆黑火山黑曜巨柱，垂直高度極高（4.5 個 BLOCK），帶有紅色或暗紫符文刻痕。 |
| `SANDSTONE` | 砂岩（荒漠障礙物；阻擋移動與視線） | `EnvironmentFactory.drawIsoRockCluster` (碎塊群) | 128 × 160 | 底面中心 (64, 140) | 單向即可 | **P1** | 風化層疊之暖橙紅砂岩石堆，頂部風蝕平整。 |
| `ICE` | 冰凍冰塊（控制技能 ICE 狀態包覆物） | `EnvironmentFactory.generateIceBlock` | 128 × 160 | 底面中心 (64, 140) | 單向即可 | **P2** | 包裹單位的半透明六角冰塊牢籠。 |
| `SHEEP` | 變形術綿羊（特殊單位狀態模型） | `UnitFactory.generateSheep` (幾何繪製) | 96 × 96 | 腳底中心 (48, 80) | 4 方向 (SE/SW/NE/NW) | **P2** | 呆萌蓬鬆白毛羊，受變形術影響時的詼諧替代模型。 |

---

## 3. 單位模型與體型擴充 (Unit Body Types & Dedicated Roles)

現階段 `public/assets/units/` 包含 10 組 `MALE` 體型圖集。依據 `docs/ART_STYLE_BIBLE.md`，建議後續逐步擴充下列模型：

| 體型 / 職業 Key | 用途與定位 | 建議規格 | 動畫需求 | 優先級 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FEMALE:TANK` | 獅心 / 灰燼 女騎士 | 256×256 cell (圖集) | 6 動畫 × 4 方向 (同現行) | **P1** | 苗條板甲、單手長劍與鳶盾、披風。 |
| `FEMALE:WARRIOR` | 獅心 / 灰燼 女戰士/狂戰士 | 256×256 cell (圖集) | 6 動畫 × 4 方向 | **P1** | 輕裝皮甲/環甲、雙手巨斧或雙持手斧。 |
| `FEMALE:RANGER` | 獅心 / 灰燼 女遊俠/刺客 | 256×256 cell (圖集) | 6 動畫 × 4 方向 | **P1** | 兜帽斗篷、輕便皮靴、手弩或短弓。 |
| `FEMALE:MAGE` | 獅心 / 灰燼 女法師 | 256×256 cell (圖集) | 6 動畫 × 4 方向 (含 cast) | **P1** | 長袍法衣、寬簷巫師帽、寶石法杖。 |
| `FEMALE:SUPPORT` | 獅心 / 灰燼 女神官/聖職者 | 256×256 cell (圖集) | 6 動畫 × 4 方向 (含 cast) | **P1** | 長袍神官服、手持祈禱書與聖徽權杖。 |
| `MALE:SUPPORT` (專用) | 專用男神官（取代目前無帽法師暫代） | 256×256 cell (圖集) | 6 動畫 × 4 方向 (含 cast) | **P1** | 聖職者白金/黑金長袍、修道士披肩、治癒聖典。 |
| `CHILD` / `HALFLING` | 半身人 / 侏儒 / 盜賊體型 | 身高約 0.7× | 6 動畫 × 4 方向 | **P3** | 身形短小精悍，步伐輕快。 |
| `GIANT` | 巨人 / 狂暴泰坦 | 身高約 1.5×~1.8× | 6 動畫 × 4 方向 | **P3** | 體魄魁梧，震地重擊。 |
| `BEAST` | 召喚獸 / 戰狼 / 戰熊 | 四足步態 | idle, run, bite, hit, death | **P3** | 獵犬/戰狼/森林熊。 |

---

## 4. 技能特效與粒子元素 (VFX Elements & Decals)

目前高頻特效已藉由 `ParticleTextureStore` 整合 Kenney 粒子，但以下高階程序化 VFX 若具備專用貼圖將大幅躍升畫面厚重感：

| 特效 Key | 用途 | 目前實現方式 | 建議素材規格 | 優先級 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `MAGIC_CIRCLE` | 召喚、領域、大招施法法陣 | `GeometryPainter.drawHex` (Canvas 幾何圓與六角) | 256 × 256 (單張帶 Alpha) | **P2** | 符文同心圓法陣，支援色票 tint 著色。 |
| `BEAM_CORE` | 聚合射線、審判光柱、終極雷射 | `LinearGradient` 矩形 | 64 × 512 (條帶貼圖) | **P2** | 具備高能核心與電弧邊緣的光束貼圖。 |
| `SLASH_ARC` | 近戰揮砍弧光、劍氣軌跡 | 弧線 stroke | 128 × 128 (彎月弧帶) | **P2** | 半月牙揮砍光刃，帶有動態殘影拖尾。 |
| `CRACKS_DECAL` | 大地崩裂、衝擊凹痕貼花 | 無（舊 `drawCracks` 已刪；熔岩危害裂紋改 `rays` 零件） | 256 × 128 (等距俯視貼花) | **P2** | 碎裂岩石與焦黑凹坑，可持久烙印於地面。 |
| `BLOOD_SPLAT` | 受擊噴血、暗黑割裂貼花 | 簡單雜訊粒子 | 128 × 128 (放射狀水墨) | **P3** | 暗紅/紫黑血泊與噴濺漬痕。 |

---

## 5. 技能圖示與狀態圖示 (Skill & Status Icons)

| 類型 | Key / 項目 | 建議規格 | 建議風格 | 優先級 |
| :--- | :--- | :--- | :--- | :--- |
| **主動技能** | 旋風斬 (Cleave), 盾擊 (Shield Bash), 連續射擊 (Arrow Volley), 狙擊 (Snipe), 隕石術 (Meteor), 冰霜新星 (Frost Nova), 神聖治癒 (Holy Heal), 挑釁 (Taunt) | 64 × 64 PNG (方形圓角) | 暗黑奇幻手繪 / 金屬邊框 / 高對比剪影 | **P2** |
| **狀態異常** | 燃燒 (BURNING), 凍結 (FROZEN), 暈眩 (STUN), 流血 (BLEED), 虛弱 (WEAK), 中毒 (POISON) | 32 × 32 PNG (透明底) | 明顯特徵符號 (火苗、冰花、暈眩星圈、滴血) | **P2** |
| **增益狀態** | 護盾 (BARRIER), 攻擊提升 (ATK_BUFF), 防禦提升 (DEF_BUFF), 迅捷 (SPEED_BUFF), 隱匿 (STEALTH) | 32 × 32 PNG (透明底) | 向上箭頭、發光盾牌、劍光、疾風羽翼 | **P2** |

---

## 6. UI 與編輯器圖示 (UI / HUD Icons)

目前 UI 圖示多由 Unicode 字符或簡單幾何模擬，建議替換為一套風格統一的像素/向量圖示集：
- **戰鬥控制**：播放 (Play)、暫停 (Pause)、單步推進 (Step)、重置戰局 (Reset)、隨機對戰骰子 (Dice)。
- **視角與縮放**：放大 (Zoom In)、縮小 (Zoom Out)、視角重設 (Reset View)、網格切換 (Toggle Grid)。
- **編輯面板**：放置單位 (Place Unit)、地形畫筆 (Terrain Brush)、屬性檢視器 (Inspector)、時間軸 (Timeline)。
- **尺寸與格式**：24 × 24 與 32 × 32 SVG / PNG，單色可透過 CSS `currentColor` 動態著色。

---

## 7. 下一步建議工作流

1. **第一優先（P1）**：主代理以同一套 Blender 腳本（`tools/assets/blender/render_unit.py`），加入 5 類障礙物（WALL、TREE、ICE_CRYSTAL、OBSIDIAN_PILLAR、SANDSTONE）之 3D 模型進行等距 30° 渲染，輸出對應 128×160 Sprite，可直接無縫接入 `SpriteManager.getObstacleSprite`。
2. **第二優先（P1）**：引進 CC0 女性冒險者模型，經 Blender 離線生成 10 張 `*_female.webp`，將 `data/units/appearance/bodyTypes.ts` 中 `FEMALE.enabled` 改為 `true`，即可自動享受戰場隨機派發與編輯器切換功能。
3. **第三優先（P2）**：製作技能與狀態圖示包，整合入 `UnitInspector` 與頭頂狀態指示器。
