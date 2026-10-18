# 視覺路線圖：VFX 收尾、障礙物換新、地形美術與網格氛圍（2026-10-18 草案，待對齊）

> 依據：`docs/VFX_PIPELINE_MAP.md`（管線地圖＋覆蓋率）、`docs/TERRAIN_R2_REPORT.md`、`docs/ASSET_NEEDS.md`、本輪盤點。
> 鐵律照舊：渲染／座標工作同一時間只開一條；動到位置／高度／排序就同 commit 更新 `RenderSpec.ts` 與檔頭；保真基準重錄要附新舊差異圖、獨立 commit。
> 共用驗收工具：`tools/vfx/fx-shot.mjs`（單一特效／光束／隕石／死亡逐格）、`tools/vfx/vfx-coverage.mjs`（後端覆蓋率）、`npm run verify:coords`、`tools/ui-e2e/beam-align-shot.mjs`、`tools/ui-e2e/terrain-contrast.mjs`、`perf:guard`／`perf:fidelity`／`perf:frames`。

## 0. 建議總順序（三條都是渲染工作，只能串行）

| 順位 | 工作 | 理由 |
| :-- | :-- | :-- |
| 1 | VFX V1～V3（守門、剩餘舊資產、死碼） | 便宜、收尾；先把棘輪立起來，後面每一輪才不會回退 |
| 2 | 地形 T0～T1（調色盤、已知缺陷） | 地表亮度決定特效在各地圖的可讀性（冰面發白就是這個問題），要先定 |
| 3 | VFX V4～V5（投射物、直接繪製器） | 依 T0 的亮度預算調 |
| 4 | 障礙物 O1～O4 | O1 的 Blender 素材管線是離線工具，**可以在 1～3 進行時並行**；O2 起才碰渲染 |
| 5 | 地形 T2～T4（地表細節、網格氛圍、天氣） | 障礙物定稿後再做地表裝飾，避免互相蓋 |
| 6 | VFX V6～V7＋全面重錄保真基準 | 最後一次性附證據重錄（battle_frozen 已 0.43%／門檻 0.5%） |

---

## A. VFX 管線收尾長計畫

現況：技能與預設實戰的粒子 100% 零件化。剩下的是「探針沒涵蓋的場景」與「不經粒子的直接繪製器」。

### V1 守門與探針補強（✅ 2026-10-18：150／150 技能只用零件、特性表＋棘輪）
- 覆蓋率探針補盲點：13 個技能單獨施放沒命中（`tb_b1～b4` 等）→ 目標閃避歸零／保證命中後重跑；新增情境：危害場、縮圈終局、出場、待機、各控制狀態、護盾吸收、死亡。
- **單一後端宣告**：`ParticleRenderer`（PROCEDURAL_SET／GROUND_PLANE_SET）、`VFXPlayer`（FIXED_ORIENTATION／PROCEDURAL_TYPES）、`render.ts`（VFX_GROUND_TYPES）、`VFXPhysics`（isPhysical）四份型別清單收斂成一張表（constants 或 data），各處讀同一張。
- **棘輪測試** `tests/VFXBackend.test.ts`：登記表舊後端資產數、引擎內直接 `getParticle()` 生成舊型別的呼叫點數，只減不增（同 `CoordinateProtocol` 模式）。

### V2 剩餘活的舊資產（8 組）（✅ 2026-10-18）
| 鍵 | 用途 | 方向 |
| :-- | :-- | :-- |
| `FX_SPAWN_BLUE／RED` | 布陣出場（程序化法陣＋光柱） | 陣營法陣 sigil＋pillar 零件 |
| `FX_IDLE_BLUE／RED` | 待機火花 | 零件或併入 `UnitAmbientPainter`（擇一，避免雙軌） |
| `FX_SELF_DAMAGE`、`FX_MANA_RESTORE` | 自傷、回魔 | 零件（回魔 LION_ARCANE） |
| `FX_LAST_STAND_LOCKED` | 縮圈終局鎖格 | 零件 ring＋glow |
| `FX_HAZARD_FIELD_*`（5） | 危害場生成 | 零件；與 `HazardPainter` 的持續場面分工講清楚 |
| `FX_STATUS_ROOT_LOOP`（被當擊退塵） | 擊退塵 | 改名 `FX_KNOCKBACK_DUST`＋零件 puff |

### V3 死碼清理（✅ 2026-10-18）
- 死鍵 9 個（`FX_CASTING_*`、`FX_HIT_FIRE`、`FX_MASSIVE_IMPACT`、`FX_STATUS_*_LOOP` 其餘）、`SkillDef.visualCastEffect／visualAoeEffect`（只被 `VFXValidator` 檢查）、`vfx_library`（inspector 清單）同步。
- 遷移後沒人走的 `ProceduralPainter`／`GroundPainter`／`BillboardPainter` 分支：先用探針證明零呼叫再刪（教訓：刪舊管線前 `git grep` 證明零引用）。
- 無陣營後備光束：給中性色階後也走光束零件，`ProceduralPainter.drawBeam` 可整段刪。

### V4 投射物零件化（✅ 2026-10-19，見 VFX_PIPELINE_MAP §4.11）
- `ProjectileDrawer`（14 種外觀：箭、冰箭、法球、斧、血鉤、散射…；每幀漸層＋光暈貼圖）→ 投射物零件（本體 sprite＋拖尾零件）。
- 不動 `TrajectoryMath` 與 RenderSpec §5 的發射點漂浮位移；驗收：`beam-align-shot` 發射點 0 px、`verify:coords` 不升。

### V5 直接繪製器逐項決策（保留程序化／改零件／改烘焙）
- ✅ V5a 2026-10-19：舊管線死碼（舊粒子型別、貼花、舊貼圖、`IconPainter`／`GeometryPainter`），見 VFX_PIPELINE_MAP §4.12。
| 繪製器 | 現況 | 建議 |
| :-- | :-- | :-- |
| `UnitAuraPainter` 詠唱環 | 每幀描邊六角 | 烘成旋轉 sigil 零件（懸空平面機制不動） |
| `UnitFlightPainter` 緞帶 | 每幀路徑 | 保留（依軌跡變形，烘焙不划算），統一色階 |
| ~~`UnitAmbientPainter` 陣營氛圍~~ | ✅ 2026-10-19 刪除：座標是舊程序化身體的胸甲位置，換精靈後浮在頭頂（藍方矩形、紅方光點） | 待機氛圍只留零件版 `FX_IDLE_*` |
| `ShieldPainter` | 舊式稜柱描邊 | 零件化或烘焙 |
| `GridOverlays` 預警／射程、`HazardPainter`、`ZoneRenderer` | 地格層 | 併入地形 T3（網格氛圍）一起設計 |
| `TextPainter` SHOUT／傷害數字 | 效能熱點（漸層、shadowBlur） | 烘焙字形快取（PERF_REPORT_4 §3 已列） |

### V6 外觀調校
- **亮底發白**：`lighter` 疊加在冰面／沙地飽和成白（地面環、六角碎片、治療偏青）。依 T0 的地表亮度預算加「生物群系增益」（例如 `VFX_BIOME_GAIN`），或在亮地表改用 `screen`。
- 隕石落點影子、光束兩端光點（命中閃光）等小項。

### V7 效能驗證＋保真重錄
- `perf:frames` 加特效壓力情境（多奧義同時），看 p99 與零件快取 evictions。
- 全部完成後一次性重錄保真基準（附新舊差異圖、寫明哪些元素變動）。

---

## B. 場景障礙物換新計畫

現況：5 種障礙（WALL／TREE／ICE_CRYSTAL／OBSIDIAN_PILLAR／SANDSTONE，每張地圖一種），`EnvironmentFactory` 程序化畫在 128×160 畫布、每種只有一個造型；錨點 `ENV_SPRITE.ANCHOR_Y = 140` 是手調值；遊戲語意在 `data/obstacles.ts`（擋移動／視線／飛行）。

### O0 決策（需要你定）
1. **素材來源**（建議 A）：
   - A. 用 CC0 3D 套件（例如 KayKit 自然／地城系列、Kenney Nature Kit）在 Blender 以單位同款相機（正交、仰角 30°）預渲染。風格與現有 KayKit 單位一致；需要你同意下載（授權記進 `ASSET_LEDGER`）。
   - B. 改良程序化畫法：零下載，但質感上限低。
2. **每種幾個變體**（建議 3～4，依格子雜湊決定，不閃爍）。
3. 是否一張地圖混用多種障礙（例：森林＝古木＋倒木＋岩石），以及新增「不阻擋的裝飾物」（移到地形 T2）。

### O0 決定（2026-10-18）：A，CC0 3D 套件預渲染，每種 3～4 個變體
候選套件（**尚未下載，等你確認**）：

| 用途 | 套件 | 來源 | 大小 | 授權 |
| :-- | :-- | :-- | --: | :-- |
| TREE（森林）＋岩石、灌木 | KayKit Forest Nature Pack（Free 版，100+ 模型：樹、岩、灌木、草） | kaylousberg.itch.io/kaykit-forest | 6.1 MB | CC0（不需署名；不得原樣轉售） |
| WALL（虛空）牆段 | KayKit Dungeon Remastered（Free 1.1，200+ 地城模型：牆、地板、樓梯、門） | kaylousberg.itch.io/kaykit-dungeon-remastered | 31 MB | CC0（同上） |
| SANDSTONE（沙漠）岩群 | Kenney Nature Kit（330+ 自然物件：樹、岩、石、地形元素） | kenney.nl/assets/nature-kit（OpenGameArt 鏡像 2.1 版 10.5 MB） | 約 10 MB | CC0（署名非必要） |
| ICE_CRYSTAL、OBSIDIAN_PILLAR | 不下載：用 Blender 腳本自己建模（六角稜柱冰晶簇、玄武岩柱群），同一條渲染管線 | — | — | 自製 |

註：找到的 CC0 水晶包（OpenGameArt「LowPoly Crystals Pack」）留言區有授權爭議，所以冰晶與黑曜柱改自製；六角稜柱也正好符合本作的六角骨架。KayKit 與現有單位同一作者，風格最一致。

### O1 素材管線（離線，可並行）
- `tools/assets/blender/render_obstacle.py`：沿用 `render_unit.py` 的相機與燈光（左上光源，與地形 R1 一致），輸出 WebP 圖集＋manifest（每張的錨點、底面六角足跡、像素高度）。
- `public/assets/obstacles/`、`ASSET_LEDGER.md`、`CREDITS.md`。

### O2 執行期接入（渲染工作）
- `ObstacleSpriteStore`（仿 `SpriteAtlasStore`）：圖集載入、變體選擇、未載入時退回現行程序化。
- **錨點與高度改讀 manifest**，刪掉 `ANCHOR_Y` 魔術數字；障礙物的排序規則照 RenderSpec §2（腳點＝格子中心，不加高度），同 commit 更新 RenderSpec 與檔頭。
- 高障礙擋住單位時的剪影（`drawSilhouette`）要跟著新高度驗證。

### O3 生物群系細節（可選）
- 樹木 2～4 格風擺影格、冰晶閃光、黑曜柱符文微光（預渲染循環，執行期只有 drawImage）。

### O4 驗收
- 景深 oracle（`depth-oracle`）＋`verify:coords` 不回退；`perf:guard` 通過。
- 5 張地形保真基準一定會變 → 附新舊差異圖、獨立 commit 重錄。

---

## C. 場景美術升級／網格氛圍翻新計畫

現況：R1 光照與高度接合、R2 地表細節（沙紋、虛空紋烘焙；冰面、草叢、液面預渲染循環）已完成。已知問題：島嶼左下底部被切平線；VOID／FOREST 頂面偏暗；ICE 的 aurora 背景造成 p99 約 19 ms；亮地表讓特效發白；網格線是很亮的白色描邊（截圖裡非常搶眼）。

### T0 美術方向與調色盤（✅ 2026-10-18：亮度預算）
- **已做**：`TERRAIN_SKIN.exposure`（每群系增益，烘焙最後乘上，側／頂明暗比不變）＋`TERRAIN_SKIN.lumaBudget` 45～90（頂面中心 Rec.709 luma）。量測與驗收：`node tools/ui-e2e/terrain-contrast.mjs`（acceptance 會檢查預算）。前→後：VOID 29→48、FOREST 53→62、MAGMA 46→52、ICE 128→86、DESERT 104→84；冰面上的 `lighter` 特效發白明顯減輕。調色盤（色相）未動，留給 T2。
- 每個生物群系一張調色盤＋亮度預算（頂面最高亮度、對比），與 VFX 色階對照，確保特效在每張地圖都讀得出來（解決冰面發白的根）。
- 參考圖：你在 `_asset_staging/art/ref_*` 的風格參考（不進 repo）。

### T1 修已知缺陷（✅ 2026-10-18：三項都已不成立或已修）
- 島嶼底座切平線：10/17 已修（`docs/TERRAIN_FOUNDATION_REPORT.md`）。VOID／FOREST 偏暗：T0 曝光已拉進預算。
- ICE aurora：早已改為低解析度離屏（`BACKGROUND_FX.AURORA.RESOLUTION_SCALE`，9043459）。實測（`node tools/ui-e2e/biome-frames.mjs --biomes=ICE,VOID --no-bg=ICE`，2560×1440 unthrottled）：ICE p99 3.2 ms、關背景 1.9 ms、VOID 2.4 ms——19 ms 尖峰已不存在，未再改。
- 原計畫：
- 島嶼底座切平線、VOID／FOREST 頂面偏暗（R1 光照增益依群系調）。
- ICE aurora 改預渲染低解析度循環影格（R2 報告已建議），目標 ICE p99 < 8 ms。

### T2 地表細節 v2
- 每種地形的變體從 4 → 8，加烘焙貼花（裂紋、苔蘚、積雪、焦痕）。
- 高低差邊緣：崖邊草垂、積雪簷、熔岩邊緣發光（沿用 R1 的鄰格高度遮罩，烘進 sprite，每幀成本不變）。
- 不阻擋的小裝飾（草叢、小石、骨頭、冰渣），與障礙物 O0 第 3 點合併決定。

### T3 網格氛圍翻新
- **網格線**：白色亮描邊 → 依群系染色、低對比的細線；選取／射程／預警另有高對比樣式（`GridOverlays`）。
- 危害場（`HazardPainter`）、縮圈（`ZoneRenderer`）、預警格的視覺語言統一（與 VFX V5 合併做）。
- 低處霧氣（VOID／FOREST）、光柱（FOREST）、熔岩岸邊熱浪（MAGMA）：預渲染循環圖層，鋪在地格上（用 `GroundDrape` 的逐格裁切避免穿到前景高地）。

### T4 天氣粒子零件化
- 天氣 `ATMOSPHERE` 仍是舊看板粒子：雪、灰燼、沙塵、孢子、虛空微光改零件，並受 `VFX_BUDGET` 控量。

### T5 驗收
- `terrain-contrast.mjs --grid` 新舊對照、`perf:frames` 各群系 p99、保真基準附證據重錄。

---

## D. 待你決定
1. 障礙物素材來源（A：CC0 3D 套件預渲染，需同意下載；B：改良程序化）與變體數。
2. 網格線改成低對比染色細線是否 OK。
3. 是否接受第 0 節的總順序（或要先做哪一條）。
