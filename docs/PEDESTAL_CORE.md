# 棋座核心（Pedestal Core）

> 世界觀：單位是棋子，**棋座才是實體**，場上的角色是核心投影出來的魔法投影。
> 核心 = 棋座上方的小型懸浮六角晶體（投影器）。施法、投射物、光束都從它出發。

## 1. 外觀
- Lionheart：乾淨的金白稜晶；Ashen：裂紋深紅碎晶（缺角、透出餘燼的裂縫）。
- 輕微上下浮動；待機光暈弱，施法中（`castingSkillIdx !== -1`）光暈拉滿並放大 1.18 倍。
- 全部是烘焙 sprite（`CoreFactory`，由 `SpriteManager.getUnitImages` 快取）：每幀只有兩次 `drawImage`（本體＋`lighter` 光暈），沒有漸層、`shadowBlur`。
- 顏色在 `data/units/factionSkin.ts` 的 `skin.core`（`CoreSkin`），尺寸／高度／浮動／光暈強度在 `constants.ts` 的 `CORE_VISUAL`。貼圖槽 `core` 可換晶體本體（見 `docs/FACTION_SLOTS.md`）。
- 職業字形改為**刻在棋座頂面**（`UnitFactory.drawEngravedGlyph`，`CLASS_GLYPH`），取代舊的懸浮職業圖示。

## 2. 錨點 SSOT：`VisualMath.getCoreAnchor(agent, engine)`
- x、y ＝ 棋座位置（`px + physics.x`、`py + physics.y`，與棋座繪製同源）＋ `CORE_VISUAL.offsetX`；z ＝ `getUnitGroundHeight`（腳下地面）＋ `CORE_VISUAL.hoverHeight`。
- **不含** `physics.z`、身體／飛行高度：飛行單位的核心留在地面棋座上方，只有角色投影浮空，所以投射物不再從帽子射出。
- 純函式 `VisualMath.coreAnchorAt(x, y, groundHeight)` 供繪製（`UnitCorePainter` 讀同一組 `CORE_VISUAL`）與測試使用。
- 已改走核心的起點：`ProjectileSystem.spawnProjectile`（投射物起點）、`SequenceSystem`（光束／序列的 source，含延遲動作的即時來源）、`EventVFXMapper`（`PROJECTILE_SPAWN` 槍口閃光、`VISUAL_SLASH/BEAM` 的 fallback 光束）。
- 仍用身體中心（`getUnitAnchor`）：**目標端**（命中點、受擊特效、投射物追蹤終點）與發生在單位身上的特效（死亡、出生、詠唱中斷）。
- 刻意沒動：`engine/game.ts`、`engine/renderer.ts`（facade）、`UnitAuraPainter`（貼地法陣本來就以棋座為中心）。

## 3. 放置預覽
- 放置工具（部署藍／紅軍）啟用、尚未開戰時，游標所在的空格顯示**實體**（棋座＋字形＋核心，半透明，`PedestalGhostPainter`）；角色投影不畫。放下後 `PLACE_AGENT` 產生單位，編輯模式下投影本來就停在出生效果起點（`spawnTimer` 不前進），開戰才投射出來。
- 拖曳既有單位預覽：只移動實體（棋座＋核心），不畫角色。
- 順手修正：`useGameInput` 在第一次按下前不更新懸停格（`hoveredHexRef`），ghost 與格子高亮因此第一次點擊前不出現；現在移動指標就更新，離開畫布清除。UI 對引擎的寫入仍只經 `UICommand`（ghost 只讀）。

## 4. 舊債處理
| 項目 | 處理 | 證據 |
| :-- | :-- | :-- |
| 懸浮職業圖示看板（`generateRoleIcon`、`UnitAssets.icon`、`UnitShadowPainter` 內的圖示＋橢圓陰影＋`shadowBlur`） | 刪除，字形改刻在棋座頂面 | 只有 `UnitShadowPainter`／`faction-shot.mjs` 使用；後者已改畫核心 |
| `SpriteManager.getUnitLayers`／`UnitLayers` | 刪除 | `git grep` 零外部引用（原檔註解即寫「已無外部使用端」） |
| `appearance` 的 `coreGlowColor`／`coreGlowMidColor`／`coreGlowFadeColor`／`coreShadowColor` | 刪除 | `git grep` 只剩定義與兩個資料檔，沒有任何讀取者 |
| `centerCoreColor` | **保留** | `factionSkin.ts` 的 `pedestal.topEdge` 仍在讀 |
| Token 工廠（`ImperialTokenFactory`／`CovenantTokenFactory`） | **保留** | 仍負責棋座本體 |

## 5. 驗證
- `tests/CoreAnchor.test.ts`：飛行／地面、位移、地形高度過渡；投射物起點等於核心、終點等於目標身體。
- `node tools/ui-e2e/pedestal-core-shot.mjs`：地面／飛行遠程基礎技的投射物離開核心、放置預覽；`node tools/ui-e2e/faction-shot.mjs --tag=<name>`：棋座＋核心總表。輸出在 `tools/ui-e2e/out/`（gitignored）。
- `battle_frozen` 基準因核心出現而重錄（獨立 commit），5 個地形基準 0 差異。
