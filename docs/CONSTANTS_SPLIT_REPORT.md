# 常數依領域拆檔報告（ECS-lite S4）

> 依據 `docs/CONSTANTS_SPLIT_AGENT_PROMPT.md` 執行完成。
> 分支：`refactor/constants-split`
> 狀態：全綠，0 行業務邏輯變更，185 個 import 端無須變更。

---

## 1. 執行摘要

將原先 1,448 行、混雜 86 個匯出常數的 `constants.ts`，依領域拆分為 `constants/*.ts` 10 個模組。
`constants.ts` 簡化為 17 行純轉發門面（Barrel）及檔頭說明，完全保留型別與常數導出，外部 import 端（`from '../constants'`）零改動。

- **匯出名稱與結構快照保真**：86 個匯出全數通過 `tests/ConstantsBarrel.test.ts` 嚴格斷言與 `tests/constants-snapshot.json` 結構比對。
- **畫面保真度（Fidelity）**：6 個場景在改前與改後 `meanAbsDiff` 完全一致（差異為 0.000）。
- **Battle Royale Soak**：10/10 seeds 全部 PASS（0 ghost, 0 idle）。

---

## 2. 檔案配置與匯出統計

| 檔案 | 行數 | 匯出個數 | 匯出名稱列表 |
| :--- | :--- | :--- | :--- |
| `constants/geometry.ts` | 49 | 13 | `AGENT_MODEL_CENTER_Z`, `BLOCK_HEIGHT`, `DEFAULT_HEX_LAYOUT`, `DEFAULT_ZONE_CONFIG`, `FLOAT_BOB`, `HEX_SIZE`, `ISO_SCALE_Y`, `MAX_ARC_HEIGHT`, `MAX_TERRAIN_TIER`, `UNIT_BODY_OFFSET`, `UNIT_HOVER_OFFSET`, `UNIT_SCALE`, `VISUAL_ANCHORS` |
| `constants/combat.ts` | 98 | 6 | `AGENT_CONSTANTS`, `CAST_LOCKOUT`, `COMBAT_PARAM`, `FORCED_MOVE`, `KILL_STREAK_WINDOW`, `PHYSICS` |
| `constants/palette.ts` | 93 | 7 | `DAMAGE_TEXT_COLORS`, `DOT_COLORS`, `LOG_COLORS`, `PALETTE`, `TEAM_COLORS`, `THEME_COVENANT`, `THEME_IMPERIAL` |
| `constants/units.ts` | 219 | 11 | `AFTERIMAGE`, `CLASS_GLYPH`, `CORE_VISUAL`, `DEATH_KNOCKBACK`, `SHIELD_VISUAL`, `UNIT_BODY_MOTION`, `UNIT_FRAME`, `UNIT_OCCLUSION`, `UNIT_SHADOW`, `UNIT_SPRITE`, `UNIT_STEP_BLEND` |
| `constants/hud.ts` | 206 | 10 | `FLOATING_TEXT`, `HUD_ANCHOR`, `HUD_BAR`, `HUD_COLORS`, `HUD_GAUGE`, `HUD_LAYOUT`, `LAST_STAND_BANNER`, `TEXT_ANIM`, `TEXT_BREAK_JITTER`, `TEXT_PAINTER_COLORS` |
| `constants/terrain.ts` | 306 | 10 | `BACKGROUND_COLORS`, `BACKGROUND_FX`, `ENV_SPRITE`, `GRID_OVERLAY`, `OBSTACLE_SPRITE`, `OBSTACLE_STYLES`, `TACTICAL_COLORS`, `TERRAIN_SKIN`, `TERRAIN_THEMES`, `ZONE_RENDER` *(型別：ObstacleAnimConfig, TerrainTheme, TerrainSkinConfig, ObstacleStyle)* |
| `constants/vfx.ts` | 270 | 16 | `AOE_INDICATOR`, `CAST_RING`, `DEATH_VFX`, `FIXED_ORIENTATION_PARTICLE_TYPES`, `GROUND_DRAPE`, `PARTICLE_TRAITS`, `PART_PARTICLE_TYPES`, `PHYSICAL_PARTICLE_TYPES`, `PROJECTILE_RENDER`, `SELF_DRAWN_PARTICLE_TYPES`, `VFX_BIOME_GAIN`, `VFX_BUDGET`, `VFX_GROUND_TYPES`, `VFX_PARAM`, `VFX_RENDER`, `particleBackend` *(型別：ParticleBackend)* |
| `constants/ui.ts` | 80 | 5 | `SCREEN_CONSTANTS`, `UI_PIN`, `UI_SETTINGS`, `UI_WINDOW`, `UI_Z` |
| `constants/render.ts` | 146 | 6 | `RENDER_CACHE`, `RENDER_GLOW`, `RENDER_HOTSPOT_CACHE`, `RENDER_PERF`, `RENDER_QUALITY`, `SHOUT_GLOW` |
| `constants/audio.ts` | 32 | 2 | `AUDIO`, `AUDIO_HEAVY_HIT_DAMAGE` |
| **總計** | **1,499** | **86** | 完整涵蓋原 `constants.ts` 86 個匯出，`constants.ts` 本身降為 17 行 |

---

## 3. 表外匯出歸類判斷

經對比原 `constants.ts` 之 86 個執行期匯出名稱，所有匯出皆在 `docs/CONSTANTS_SPLIT_AGENT_PROMPT.md` §1 目標設計表列範圍內，**無任何未列入表的額外匯出**。

型別匯出部分：
- `ObstacleAnimConfig`, `TerrainTheme`, `TerrainSkinConfig`, `ObstacleStyle` 依其領域隨地形常數歸入 `constants/terrain.ts`。
- `ParticleBackend` 隨粒子特性表歸入 `constants/vfx.ts`。

內部輔助函式部分：
- `particleTypesWhere` 隨 `PARTICLE_TRAITS` 留在 `constants/vfx.ts`，維持模組私有輔助函式。

---

## 4. 修改的測試與工具

| 檔案 | 修改內容 | 理由 |
| :--- | :--- | :--- |
| `tests/ConstantsBarrel.test.ts` (新) | (1) 斷言 `import * as C from '../constants'` 之匯出名稱列表排序後完全等於 86 個改前名單；(2) 深度比對每一項之序列化結構與改前快照。 | CS0 建立之不變量護欄，防止拆檔過程中漏掉或竄改任何常數名稱與值。 |
| `tests/constants-snapshot.json` (新) | 記錄 86 個常數改前的結構快照（包含 Set 轉陣列排序與函式標記）。 | 作為 CS1、CS2 之金鑰比對基準，建立後不修改。 |
| `tests/CoordinateProtocol.test.ts` | (1) 將 `SSOT_FILES` 擴充納入 `listSources('constants')`；(2) 第 167 行 `read('constants.ts')` 掃描 `TERRAIN_SORT_SCALE` 擴充為掃描 `constants.ts` 與整個 `constants/` 資料夾。 | 依 prompt §1 規定，維護座標協議守門棘輪，確保拆檔後 SSOT 檔案依然受保護，且廢棄常數不回流到任何常數檔。 |
| `tools/gen-ui-tokens.ts` | 無需修改代碼，由 `constants.ts` barrel 順暢導入 `TEAM_COLORS`。重新執行後 `styles/tokens.css` 0 diff，`tests/UITokens.test.ts` 5/5 全過。 | 驗證外部工具消費 barrel 之無縫相容性。 |

---

## 5. 驗證數據（改前 vs 改後）

| 檢查項目 | 改前基準 | 改後成果 | 狀態 |
| :--- | :--- | :--- | :--- |
| `npm run lint` | 0 errors | 0 errors | PASS |
| `vitest run --dir tests` | 75 files passed (621 tests) | 76 files passed (623 tests, +2 from ConstantsBarrel) | PASS |
| `npm run build` | 3.36s (290 modules transformed) | 3.33s (300 modules transformed) | PASS |
| **Fidelity: VOID** | meanAbsDiff: 0.194, bad: 0.01% | meanAbsDiff: 0.194, bad: 0.01% | PASS (0 diff) |
| **Fidelity: FOREST** | meanAbsDiff: 0.635, bad: 0.16% | meanAbsDiff: 0.635, bad: 0.16% | PASS (0 diff) |
| **Fidelity: ICE** | meanAbsDiff: 0.234, bad: 0.21% | meanAbsDiff: 0.234, bad: 0.21% | PASS (0 diff) |
| **Fidelity: MAGMA** | meanAbsDiff: 0.237, bad: 0.03% | meanAbsDiff: 0.237, bad: 0.03% | PASS (0 diff) |
| **Fidelity: DESERT** | meanAbsDiff: 0.513, bad: 0.22% | meanAbsDiff: 0.513, bad: 0.22% | PASS (0 diff) |
| **Fidelity: battle_frozen** | meanAbsDiff: 0.422, bad: 0.16% | meanAbsDiff: 0.422, bad: 0.16% | PASS (0 diff) |
| **BR Soak (10 seeds)** | Clean: 10/10, Ghosts: 0, Idles: 0 | Clean: 10/10, Ghosts: 0, Idles: 0 | PASS |

---

## 6. 回退指南（Task Commits）

所有變更皆在分支 `refactor/constants-split` 上進行，依任務順序嚴格獨立 commit：

1. **CS0** (`b591451`): `test(constants): add ConstantsBarrel test and structural snapshot (CS0)`
   - 新增 `tests/ConstantsBarrel.test.ts` 與 `tests/constants-snapshot.json`。
   - 回退至此點：`git reset --hard b591451`
2. **CS1** (`8319c67`): `refactor(constants): extract geometry, combat, palette, audio, ui, render modules (CS1)`
   - 抽出 `geometry.ts`、`combat.ts`、`palette.ts`、`audio.ts`、`ui.ts`、`render.ts`，`constants.ts` 轉發。
   - 回退至此點：`git reset --hard 8319c67`
3. **CS2** (`649cd8b`): `refactor(constants): extract units, hud, terrain, vfx modules and update barrel (CS2)`
   - 抽出剩餘 `units.ts`、`hud.ts`、`terrain.ts`、`vfx.ts`，`constants.ts` 轉為純 barrel，更新 `CoordinateProtocol.test.ts`。
   - 回退至此點：`git reset --hard 649cd8b`
4. **REPORT**: 本報告與任務結案。

若需完全放棄此輪重構回退到 `main`：
```bash
git checkout main
git branch -D refactor/constants-split
```

---

## 7. 程式碼觀察記錄（未改動，僅記錄供後續架構參考）

在搬移過程中觀察到以下既存特性，依守則不順手修改，留待後續專題評估：
1. **重複斷點定義**：`constants/ui.ts` 中 `UI_WINDOW.MOBILE_BREAKPOINT: 900` 與 `UI_WINDOW.SHEET_BREAKPOINT: 900` 數值重複；`BOTTOM_SHEET_MAX_HEIGHT_VH: 72` 與 `SHEET_MAX_VH: 72` 數值重複。日後可評估收斂為單一 token。
2. **已廢棄欄位保留**：`constants/terrain.ts` 之 `TERRAIN_SKIN.tintStrength` 標記為 `@deprecated R1 起不再影響畫面`，為維持下游相容性仍保留其常數值。
3. **已失效常數保留行為**：`constants/vfx.ts` 之 `VFX_PARAM.IDLE_VFX_CULL_CENTER_PER_TILE: 40` 註解中提及「原程式讀取不存在的 engine.camera，恆走此 fallback」，仍保留以維持既有邏輯行為。
4. **強制位移比例數值對等**：`constants/combat.ts` 之 `FORCED_MOVE.IMPACT_BASE_PCT: 0.05` 與 `IMPACT_PER_HEIGHT_PCT: 0.05` 恰好相同，目前語意分別為格數與高度差乘數。
