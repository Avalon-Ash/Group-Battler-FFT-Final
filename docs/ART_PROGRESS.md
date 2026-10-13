# ART_PROGRESS.md — 美術管線與奇幻 HD 素材導入進度

本文件記錄 `feat/art-fantasy-hd` 分支上各任務之執行狀態、驗證結果與關鍵決策。

---

## 任務清單與進度摘要

| 任務 | 名稱 | 狀態 | Commit | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **Pre** | 素材暫存入庫與前置設定 | DONE | `d7a651e` | 複製 `art-source/`、`tools/assets/blender/`、docs 前置 |
| **A0a** | 素材目錄、授權制度、精靈入庫 | DONE | `fb61f1d` | `public/assets/units/` (4.27MB)、`ASSET_LEDGER.md`、`CREDITS.md`、blender README |
| **A0b** | 素材驗證與地形處理工具 | DONE | Pending | `verify-sprites.mjs`、`process-terrain.mjs`、10 地形貼圖、預覽圖 |
| **A1a** | 地形材質貼圖化（TERRAIN_SKIN） | PENDING | — | `TerrainTextureStore.ts`、`materialConfig.ts`、`TerrainRenderer.ts` |
| **A1b** [E2E] | 地形測試與 Baseline 重錄 | PENDING | — | 縮放目視、5 地形場景 + battle_frozen 重錄、效能守則 |
| **A2a** | 單位外觀資料（SSOT）＋體型軸＋圖集快取 | PENDING | — | `bodyTypes.ts`、`sprite.ts`、`SpriteAtlasStore.ts`、mip、白閃烘焙 |
| **A2b** | SpriteUnitRenderer（逐格動畫） | PENDING | — | `SpriteUnitRenderer.ts`、`selectSpriteFrame`、`UnitBodyPainter` 分派 |
| **A2e** | 體型隨機派發＋戰場編輯器可改 | PENDING | — | `AgentManager`、`PLACE/EDIT_AGENT`、MapEditorToolbar、Inspector |
| **A2c** [E2E] | 死亡與狀態整合 | PENDING | — | `UnitDeathPainter`、battle_frozen 重錄、e2e×2、效能守則 |
| **A3** | 特效粒子材質與障礙物清單 | PENDING | — | ParticleTextureStore (Kenney) 或跳過、`docs/ASSET_NEEDS.md` |
| **REPORT** | 成果報告與交付更新 | PENDING | — | `docs/ART_REPORT.md`、`docs/DECOUPLING_HANDOFF.md` §11 |
| **FINAL** | 全量驗證與 Checkpoint Tags | PENDING | — | lint/test/build/e2e×2/perf:guard、tags 打點 |

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
