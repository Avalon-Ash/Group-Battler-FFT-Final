# 棋座核心（Pedestal Core）

> 世界觀：單位是棋子，**棋座才是實體**，場上的角色是核心投影出來的魔法投影。
> 核心 = 棋座上方的小型懸浮六角晶體（投影器）。施法、投射物、光束都從它出發。
> **投影成形後，核心藏進投影中心**：晶體淡淡地透出來（`CORE_VISUAL.projectedAlpha`），施法時光暈拉高，讓「誰在詠唱」仍然看得出來。
> 只有投影還沒成形（編輯模式拖曳預覽、放置幽靈、出生前）才看得到懸在棋座上的實體寶石。

## 1. 外觀
- Lionheart：乾淨的金白稜晶；Ashen：裂紋深紅碎晶（缺角、透出餘燼的裂縫）。
- 輕微上下浮動；待機光暈弱，施法中（`castingSkillIdx !== -1`）光暈拉滿並放大 1.18 倍。
- 全部是烘焙 sprite（`CoreFactory`，由 `SpriteManager.getUnitImages` 快取）：每幀只有兩次 `drawImage`（本體＋`lighter` 光暈），沒有漸層、`shadowBlur`。
- 顏色在 `data/units/factionSkin.ts` 的 `skin.core`（`CoreSkin`），尺寸／高度／浮動／光暈強度在 `constants.ts` 的 `CORE_VISUAL`。貼圖槽 `core` 可換晶體本體（見 `docs/FACTION_SLOTS.md`）。
- 職業字形改為**刻在棋座頂面**（`UnitFactory.drawEngravedGlyph`，`CLASS_GLYPH`），取代舊的懸浮職業圖示。

## 2. 錨點 SSOT：投影中心 `VisualMath.projectionCenterAt`（`docs/CORE_PROJECTION_DESIGN.md`）
- 發射點（`getCoreAnchor`）、受擊點（`getUnitAnchor`）、投影成形後的核心寶石是**同一個點**：x、y ＝ `px + physics.x`、`py + physics.y`（沒有水平位移）；z ＝ 腳下地面 ＋ `physics.z` ＋ `projectionCenterHeight(體型)`。
- `projectionCenterHeight` 從精靈資料推導（`data/units/appearance/projection.ts`：精靈目標高度 × 體型 `heightScale` × `centerFraction` ＋ `footHover`），模擬端不需要圖集；`tests/CoreProjection.test.ts` 比對它與圖集實際頭頂高度。
- **含** `physics.z`：飛行單位從身體中心發射（2026-10 使用者要求，推翻原本「從地面核心發射」的決定）。
- 繪製（`UnitCorePainter`）：投影可見時寶石畫在投影中心（`VisualMath.getProjectionCenterY`，同一個高度公式），再加純繪製位移（受擊晃動）；出生期間依 `spawnTimer` 從棋座升到投影中心並淡出成內光；投影不可見時畫實體寶石，高度 `CORE_VISUAL.hoverHeight`。
- 血條錨點也從同一份資料推導：投影頭頂 ＋ `HUD_ANCHOR.barHeadMargin`（`UnitFrame.hudAnchorY`，取代舊的 `HUD_BAR_OFFSET = 150`）。
- 已改走核心的起點：`ProjectileSystem.spawnProjectile`（投射物起點）、`SequenceSystem`（光束／序列的 source，含延遲動作的即時來源）、`EventVFXMapper`（`PROJECTILE_SPAWN` 槍口閃光、`VISUAL_SLASH/BEAM` 的 fallback 光束）。
- 目標端（命中點、受擊特效、投射物追蹤終點）與發生在單位身上的特效（死亡、出生、詠唱中斷）用 `getUnitAnchor`，現在與發射點是同一個點。
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
- `tests/CoreAnchor.test.ts`：站立單位發射點＝受擊點＝投影中心；飛行含 `physics.z`；位移、地形高度過渡；投射物起點／終點。
- `tests/CoreProjection.test.ts`：投影高度與圖集頭頂高度的誤差（平均 2 px 內；法師帽 +7、輔助 −6 是職業本身的差異）、血條錨點在頭頂上方固定間距。
- `node tools/ui-e2e/pedestal-core-shot.mjs`：地面／飛行遠程基礎技的投射物離開核心、放置預覽；`node tools/ui-e2e/faction-shot.mjs --tag=<name>`：棋座＋核心總表。輸出在 `tools/ui-e2e/out/`（gitignored）。
- `battle_frozen` 基準因核心出現而重錄（獨立 commit），5 個地形基準 0 差異。
