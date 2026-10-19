# 執行指令：常數依領域拆檔（ECS-lite S4）

> 用法：在 IDE 代理對話輸入 `/goal docs/archive/CONSTANTS_SPLIT_AGENT_PROMPT.md`。
> 背景：`docs/ECS_LITE_ASSESSMENT.md` §2 S4。`constants.ts` 1,447 行、86 個匯出，參數、顏色、UI、渲染快取、物理全混在一起，找參數要整檔搜。本輪把它依領域拆成 `constants/*.ts`，`constants.ts` 只留轉發（barrel），**185 個 import 端一個都不用改**。
> **本輪是純搬移：任何常數的值、名稱、型別都不得改變。** 保真、`br-soak` 必須與改前相同；任何基準不得重錄、門檻不得放寬。

---

## 指令本文

你是本專案（`c:\Git\Group-Battler-FFT-Final`）的執行代理。

### 0. 開工前
- 先讀：`AGENTS.md`（全部）、`constants.ts`（全部）、`tests/CoordinateProtocol.test.ts`、`tests/UITokens.test.ts`、`tools/gen-ui-tokens.ts`。
- 從 `main` 開分支 `refactor/constants-split`；`git status` 必須乾淨。先跑一次並記進報告（「改前」基準；任何一項不綠就停下回報）：`npm run lint`、`npx vitest run --dir tests`、`npm run build`、`npm run perf:fidelity`（記下每個場景的 meanAbsDiff）、`node tools/ui-e2e/br-soak.mjs --seeds=10 --shrinkInterval=3 --assert-ghost --assert-idle`。
- **受保護檔案（不得修改）**：`CLAUDE.md`、`AGENTS.md`、`docs/HANDOFF.md`、`docs/METHODOLOGY.md`、`docs/DECISIONS.md`、`docs/WORKLOG.md`、`engine/renderers/RenderSpec.ts`、`tools/ui-e2e/baseline/**`、`tools/ui-e2e/style-baseline.json`、所有 `tests/*.baseline.json` 的放寬方向。
- 不准 `push`、不准動 `main`、不准合併。一個任務一個 commit。

### 1. 目標設計（照做，不要自行改設計；有矛盾就停下回報）

**檔案配置**：新資料夾 `constants/`（repo 根目錄，與 `constants.ts` 同層）。每個常數**原封不動**（連註解、`as const`、型別註記）搬到下表的檔案，順序照原檔：

| 檔案 | 內容（以現在 `constants.ts` 的匯出名稱列出） |
| :-- | :-- |
| `constants/geometry.ts` | `DEFAULT_HEX_LAYOUT`、`DEFAULT_ZONE_CONFIG`、`HEX_SIZE`、`BLOCK_HEIGHT`、`MAX_TERRAIN_TIER`、`ISO_SCALE_Y`、`UNIT_BODY_OFFSET`、`UNIT_HOVER_OFFSET`、`UNIT_SCALE`、`AGENT_MODEL_CENTER_Z`、`VISUAL_ANCHORS`、`MAX_ARC_HEIGHT`、`FLOAT_BOB` |
| `constants/combat.ts` | `KILL_STREAK_WINDOW`、`PHYSICS`、`FORCED_MOVE`、`COMBAT_PARAM`、`AGENT_CONSTANTS`、`CAST_LOCKOUT` |
| `constants/palette.ts` | `THEME_IMPERIAL`、`THEME_COVENANT`、`TEAM_COLORS`、`LOG_COLORS`、`PALETTE`、`DOT_COLORS`、`DAMAGE_TEXT_COLORS` |
| `constants/units.ts` | `UNIT_STEP_BLEND`、`UNIT_OCCLUSION`、`CLASS_GLYPH`、`CORE_VISUAL`、`UNIT_FRAME`、`AFTERIMAGE`、`DEATH_KNOCKBACK`、`SHIELD_VISUAL`、`UNIT_SHADOW`、`UNIT_SPRITE`、`UNIT_BODY_MOTION` |
| `constants/hud.ts` | `HUD_ANCHOR`、`FLOATING_TEXT`、`HUD_LAYOUT`、`HUD_COLORS`、`HUD_BAR`、`HUD_GAUGE`、`LAST_STAND_BANNER`、`TEXT_ANIM`、`TEXT_BREAK_JITTER`、`TEXT_PAINTER_COLORS` |
| `constants/terrain.ts` | `TACTICAL_COLORS`、`GRID_OVERLAY`、`ZONE_RENDER`、`BACKGROUND_COLORS`、`BACKGROUND_FX`、`ENV_SPRITE`、`OBSTACLE_SPRITE`、`ObstacleAnimConfig`、`TerrainTheme`、`TERRAIN_THEMES`、`TerrainSkinConfig`、`TERRAIN_SKIN`、`ObstacleStyle`、`OBSTACLE_STYLES` |
| `constants/vfx.ts` | `VFX_RENDER`、`CAST_RING`、`GROUND_DRAPE`、`VFX_PARAM`、`VFX_BUDGET`、`DEATH_VFX`、`AOE_INDICATOR`、`VFX_BIOME_GAIN`、`PROJECTILE_RENDER`、`ParticleBackend`、`PARTICLE_TRAITS` 與其衍生（`particleBackend`、`VFX_GROUND_TYPES`、`PHYSICAL_PARTICLE_TYPES`、`FIXED_ORIENTATION_PARTICLE_TYPES`、`SELF_DRAWN_PARTICLE_TYPES`、`PART_PARTICLE_TYPES` 及它們用到的私有輔助函式） |
| `constants/ui.ts` | `SCREEN_CONSTANTS`、`UI_WINDOW`、`UI_Z`、`UI_SETTINGS`、`UI_PIN` |
| `constants/render.ts` | `RENDER_PERF`、`RENDER_CACHE`、`RENDER_QUALITY`、`RENDER_GLOW`、`RENDER_HOTSPOT_CACHE`、`SHOUT_GLOW` |
| `constants/audio.ts` | `AUDIO`、`AUDIO_HEAVY_HIT_DAMAGE` |

- 表中沒列到的匯出（若有）：放進語意最接近的檔案，並在報告列出你的判斷。非匯出的模組內部常數／函式跟著使用它的匯出走；被兩個檔案用到時放在被依賴的那一邊並匯出（不要複製）。
- 檔案之間互相需要時**直接 import 對方檔案**（例如 `units.ts` 從 `./geometry` 取 `HEX_SIZE`），**不得**經由 `constants.ts` barrel 回頭 import（會循環）。`types.ts` 的 import 照原樣搬到需要的檔案。
- `constants.ts` 改成只有檔頭說明＋`export * from './constants/geometry';` 等 10 行轉發（型別用 `export type *` 或 `export *` 皆可，以 `tsc` 與 `vite build` 都過為準）。檔頭寫明：「參數 SSOT 在 `constants/*.ts`，依領域分檔；本檔只轉發，新增常數請放進對應領域檔」。
- 每個新檔加方框檔頭（照 repo 慣例：職責／下游主要使用者）。
- **import 端不改**：所有 `from '…/constants'` 維持原樣。

**測試與工具**
- `tests/CoordinateProtocol.test.ts` 的 `SSOT_FILES` 含 `'constants.ts'`：改成同時接受 `constants/*.ts`（例如 `constants/geometry.ts`、`constants/units.ts`、`constants/vfx.ts`… 依該測試實際需要；寫成目錄前綴判斷亦可），**不得**因此放寬其他檢查。第 167 行 `read('constants.ts')` 的「不得出現 `TERRAIN_SORT_SCALE`」改為掃 `constants.ts` 與 `constants/` 全部檔案。
- 其他測試或 `tools/**` 若以檔案路徑或文字讀取 `constants.ts`（`grep -rn "constants.ts" tests tools`），改成讀對應的新檔或掃整個 `constants/`，行為與檢查強度不得降低。`tools/gen-ui-tokens.ts` 照此處理後要能產生與改前相同的輸出（跑一次比對）。
- 任何禁止硬編碼顏色／魔術數字的棘輪，若以「`constants.ts` 例外」實作，改成「`constants.ts` 與 `constants/**` 例外」。

### 2. 任務（依序）

| 任務 | 內容 | 驗證 |
| :-- | :-- | :-- |
| **CS0** | 新增 `tests/ConstantsBarrel.test.ts`：(1) 以 `import * as C from '../constants'` 取得全部匯出名稱，與寫在測試內的「改前名單」（當下實測的 86 個名稱，排序後寫死）完全相同；(2) 對每個匯出值做結構快照（`JSON.stringify`，函式改記 `typeof`），快照寫在測試內或 `tests/constants-snapshot.json`（**本任務建立，之後不得修改**）。 | lint／test |
| **CS1** | 建 `constants/geometry.ts`、`combat.ts`、`palette.ts`、`audio.ts`、`ui.ts`、`render.ts`，搬對應常數，`constants.ts` 加轉發。 | lint／test（CS0 必須照過，名單與快照不變）／build |
| **CS2** | 建 `constants/units.ts`、`hud.ts`、`terrain.ts`、`vfx.ts`，搬完其餘常數；`constants.ts` 只剩檔頭與轉發。更新 §1 列的測試與工具。 | lint／test／build／**fidelity**／**br-soak 10/10**／`tools/gen-ui-tokens.ts` 輸出不變 |
| **REPORT** | `docs/CONSTANTS_SPLIT_REPORT.md`：每個新檔的匯出清單與行數、表外匯出的歸類判斷、修改的測試／工具與理由、fidelity 改前／改後、br-soak、回退指南（每個任務的 commit）。發現「原本好像是 bug」或「值看起來重複／可衍生」的地方只記錄，不要順手改。 | — |

### 3. 守則與停下條件
- 本輪是機械性搬移，允許一次超過 3 個檔案；**不得改任何常數的值、名稱、型別、註解內容**（移動位置除外）；不得合併、刪除、改名任何匯出。
- 不得修改任何 import 端（`engine/**`、`components/**`、`data/**`、`hooks/**`）。若 build 因循環 import 失敗：停下，把循環路徑寫進報告，不要用改 import 端的方式繞過。
- `npm run perf:fidelity`：必須 PASS，且每個場景 meanAbsDiff 與改前實測相同（差 0.01 以內）；做不到就還原該任務並查原因。**不得重錄基準**。
- `br-soak` 失敗：同上。
- 同一個任務失敗 3 次、或發現本文件與程式碼現況矛盾：停下，把發現寫進報告，`git status` 保持乾淨（最後一個 commit 全綠）。
- 不新增依賴、不用 `as any`、不加任何執行期邏輯。

---

## 回來後使用者要做的事（給人看）
1. 告訴主代理「S4 跑完了」，主代理會審查 `git diff main...refactor/constants-split`、再問你要不要合併。
2. 這輪不改畫面與行為，不需要實機看。
