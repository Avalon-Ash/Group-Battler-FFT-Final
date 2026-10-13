# ART_PROGRESS.md — 美術管線與奇幻 HD 素材導入進度

本文件記錄 `feat/art-fantasy-hd` 分支上各任務之執行狀態、驗證結果與關鍵決策。

---

## 任務清單與進度摘要

| 任務 | 名稱 | 狀態 | Commit | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **Pre** | 素材暫存入庫與前置設定 | DONE | `d7a651e` | 複製 `art-source/`、`tools/assets/blender/`、docs 前置 |
| **A0a** | 素材目錄、授權制度、精靈入庫 | DONE | `fb61f1d` | `public/assets/units/` (4.27MB)、`ASSET_LEDGER.md`、`CREDITS.md`、blender README |
| **A0b** | 素材驗證與地形處理工具 | DONE | `f36e663` | `verify-sprites.mjs`、`process-terrain.mjs`、10 地形貼圖、預覽圖 |
| **A1a** | 地形材質貼圖化（TERRAIN_SKIN） | DONE | `ebed9d3` | `TerrainTextureStore.ts`、`TERRAIN_SKIN`、`TerrainRenderer.ts`、回退驗證全綠 |
| **A1b** [E2E] | 地形測試與 Baseline 重錄 | DONE | `6a2134f` | 縮放目視(0.5x~3x)、5 地形場景 + battle_frozen 重錄、e2e×2 全綠、perf:guard 通過 |
| **A2a** | 單位外觀資料（SSOT）＋體型軸＋圖集快取 | DONE | `160d125` | `bodyTypes.ts`、`sprite.ts`、`SpriteAtlasStore.ts`、mip、白閃烘焙、14 單元測試 |
| **A2b** | SpriteUnitRenderer（逐格動畫） | DONE | `c232474` | `SpriteUnitRenderer.ts`、`selectSpriteFrame.ts`、`UnitBodyPainter` 分派、14 單元測試 |
| **A2e** | 體型隨機派發＋戰場編輯器可改 | DONE |待 commit | `AgentManager`、`PLACE/EDIT_AGENT`、MapEditorToolbar、Inspector、9 測試、e2e×2 全綠 |
| **A2c** [E2E] | 死亡與狀態整合 | PENDING | — | `UnitDeathPainter`、battle_frozen 重錄、e2e×2、效能守則 |
| **A3** | 特效粒子材質與障礙物清單 | PENDING | — | ParticleTextureStore (Kenney) 或跳過、`docs/ASSET_NEEDS.md` |
| **REPORT** | 成果報告與交付更新 | PENDING | — | `docs/ART_REPORT.md`、`docs/DECOUPLING_HANDOFF.md` §11 |
| **FINAL** | 全量驗證與 Checkpoint Tags | PENDING | — | lint/test/build/e2e×2/perf:guard、tags 打點 |

---

## 任務細節紀錄

### Task A1: 地形材質貼圖化與驗證 (A1a + A1b)
- **回退驗證 (Procedural Fallback)**:
  - 當 `TERRAIN_SKIN.enabled = false` 時，`perf:fidelity` 與原 baseline 差異為 0.000 (100% 像素一致)。
- **縮放目視檢查**:
  - 於 `tools/ui-e2e/capture-zoom.mjs` 擷取 0.5x, 1x, 2x, 3x 各級縮放畫面，無鋸齒裂縫、無閃爍摩爾紋。
- **Before / After 比對**:
  - 產出 `tools/ui-e2e/out/art_before_after_terrain_*.png` 對比圖 (VOID, FOREST, ICE, MAGMA, DESERT, battle_frozen)。
- **Baseline 重錄授權與執行**:
  - 依 `docs/ART_AGENT_PROMPT.md` 特殊授權重錄 A1 baseline（5 地形場景 + battle_frozen）。
  - 修復 `render-fidelity.mjs` 中 `battle_frozen` 之 context 隔離，雙次獨立執行達成 100% pixel-identical (meanAbsDiff=0, badPixelPct=0%)。
- **全量驗證**:
  - `npm run perf:fidelity` × 2 通過 (0.000 diff)。
  - `npm run perf:guard` (perf:ab) 通過：FPS ~170，各場景幀時 5.66ms ~ 5.96ms (遠低於 26.4ms 守則門檻)。
  - `npm test` 通過 (25 files, 226 tests)。
  - `npm run e2e:ui` × 2 通過 (ALL PASSED)。

### Task A2a: 單位外觀資料（SSOT）＋體型軸＋圖集快取
- **型別與資料實體擴充**:
  - `types.ts` 新增 `BodyTypeId = 'MALE' | 'FEMALE'`、`BodyTypeProfile`、`SpriteAppearanceConfig`。
  - `Agent`（`engine/core/Agent.ts`）新增純資料可選欄位 `bodyType?: BodyTypeId`，於 `initialState`、`saveState`、`reset` 中完整維護。
- **體型設定與確定性生成**:
  - `data/units/appearance/bodyTypes.ts` 定義 `BODY_TYPE_PROFILE`（MALE: enabled true, FEMALE: enabled false 退回 MALE）。
  - `pickBodyType`: FNV-1a 確定性雜湊，不消耗模擬 RNG。
  - `resolveBodyType`: 解析有效體型並沿 fallback 鏈安全退回。
- **圖集外觀表與查找**:
  - `data/units/appearance/sprite.ts` 建構 `SPRITE_APPEARANCE` 表並提供 `lookupSpriteAppearance`。
  - 渲染器無須包含任何體型字面值。
- **全域常數與調校**:
  - `constants.ts` 新增 `UNIT_RENDER_MODE: 'sprite' | 'procedural'` 及 `UNIT_SPRITE` 常數群。
- **圖集快取與預烘焙**:
  - `engine/renderers/units/SpriteAtlasStore.ts` 實作懶載入、白閃剪影預烘焙（source-in 填白）、Mip 層級預烘焙（1.0, 0.5, 0.25）與 `selectMipLevel`。
- **單元測試**:
  - `tests/SpriteAtlas.test.ts` 14 項測試全數通過（涵蓋 manifest 解析、10 組外觀對齊、lookup 回退、體型雜湊分佈、Mip 選擇與 Agent 狀態重設）。

### Task A2b: SpriteUnitRenderer（逐格動畫）
- **選格純函式**:
  - `data/units/appearance/selectSpriteFrame.ts` 實作原生四向 (SE/SW/NE/NW) 選擇與滯後防抖（Hysteresis）。
  - 動畫優先序：死亡 > 受擊 > 施法/攻擊 > 移動(walk) > idle。
  - cast 缺少時平滑退回 attack；死亡動畫播放完畢後停留於最後一格。
  - 依 `agent.id` 計算相位偏移錯開呼吸與步頻。
- **逐格渲染器**:
  - `engine/renderers/units/factions/SpriteUnitRenderer.ts` 實作原生四向逐格渲染，腳底錨點對齊 (0, 0)，自動匹配 Mip 層級。
  - 受擊閃白直接 blit 預烘焙剪影，被遮擋輪廓以低 alpha 剪影繪製。
- **渲染管線分派與回退**:
  - `UnitBodyPainter.ts` 依 `UNIT_RENDER_MODE` 與圖集就緒狀態自動分派；當圖集未就緒或模式為 `procedural` 時無縫走舊程序化管線。
- **單元測試**:
  - `tests/SpriteUnitRenderer.test.ts` 14 項測試全數通過（覆蓋動畫優先序、進度映射、cast 退回、死亡停格、四向判定與滯後防抖）。

### Task A2e: 體型隨機派發＋戰場編輯器可改
- **產生時確定性派發**:
  - `AgentManager.matchSalt` 靜態欄位維護開局/重置隨機鹽值，於 `RESET_GAME` 時更新。
  - `AgentManager.addAgent` 透過 `pickBodyType(a.id, AgentManager.matchSalt)` 確定性計算體型（不消耗模擬 RNG）。
  - 若指定 `bodyTypeOverride` 則優先尊重。
- **UICommandSystem 擴充**:
  - `PLACE_AGENT` 與 `EDIT_AGENT` 支援選填 `bodyType?: BodyTypeId`，寫入 `Agent.bodyType` 並保存狀態。
- **UI 互動與動態體型清單**:
  - `MapEditorToolbar`: 單位設置區新增體型選擇群，預設「隨機」，並自 `BODY_TYPE_PROFILE` 動態過濾出 `enabled: true` 的體型項目（現為「男」，FEMALE 等未來啟用時自動出現），以 `draftBodyType` 傳入 `PLACE_AGENT`。
  - `UnitInspectorBody`: 抽屜面板擴充體型 `<select>` 下拉選單，讀取即時 `resolveBodyType(agent)` 並派發 `EDIT_AGENT` 命令。
  - 樣式採用內嵌 CSS 物件，維持 0 hardcoded Tailwind palette classes，符合 UIBoundary 護欄要求。
- **測試與驗證**:
  - `tests/BodyTypeEditor.test.ts`: 9 項測試全數通過（純函式雜湊決定性、雙體型各 1 權重時 1000 個連號 ID 比例落在 40–60%、fallback 退回、`addAgent` 派發/覆寫、`PLACE_AGENT` 與 `EDIT_AGENT` 命令處理、`RESET_GAME` 更新鹽值）。
  - `npm test`: 28 檔 263 測試全數通過。
  - `npm run e2e:ui` 連跑 2 次皆 ALL PASSED（包含 DRAFT 放置體型驗證與 Inspector 體型修改即時反映斷言）。
  - `perf:fidelity`: 程序化模式驗證與改前逐像素 100% 相同 (0.000 diff)；無更動任何既有 baseline。

---

## 前置檢查 (Pre-flight Checklist)

- [x] 分支確認：`feat/art-fantasy-hd`
- [x] Working tree clean
- [x] `types.ts` `WindowDef.visibleInManual` 存在
- [x] `npm run lint` 通過 (0 errors)
- [x] `npm test` 通過 (24 files, 219 tests)
- [x] `npm run build` 通過
- [x] `npm run e2e:ui` 通過 (ALL PASSED)
- [x] `npm run perf:guard` 通過 (ALL PASSED)
