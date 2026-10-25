# 視覺路線圖：VFX、障礙物與場景狀態摘要

> 關聯文件：`docs/VFX_PIPELINE_MAP.md`（現行管線拓樸）、`docs/DECISIONS.md`（定案決策）、`docs/HANDOFF.md`（未完成事項）。
> 核心鐵律：渲染／座標工作同一時間只開一條；修改位置／高度／排序須同 commit 更新 `RenderSpec.ts` 與檔頭；保真基準重錄須附新舊差異圖與獨立 commit。

## 1. 歷史階段完成狀態摘要（已落地並核對 source）

| 階段代號 | 範圍與重點 | 狀態與落地證據 |
| :--- | :--- | :--- |
| **V1–V3** | 特效守門、剩餘活資產零件化、死碼清理 | ✅ `PARTICLE_TRAITS` 單一特性表；舊後端資產歸零；`tests/VFXBackend.test.ts` 鎖定推導集合。 |
| **V4** | 投射物零件化 | ✅ `ProjectilePartPainter` 依 `data/vfx/projectile_visuals.ts` 繪製 `missile` 零件與拖尾。 |
| **V5** | 直接繪製器零件化 | ✅ `UnitAuraPainter`（法陣）、`ShieldPainter`（稜柱）、`HazardPainter`（零件層）。 |
| **V6–V7** | 外觀調校、生物群系增益與保真基準驗證 | ✅ `VFX_BIOME_GAIN`（防止亮底發白）、隕石落影、光束端點；battle_frozen 重錄於 `359bc66`。 |
| **O1–O4** | 場景障礙物 CC0 3D 預渲染 | ✅ KayKit 與 Kenney 模型於 Blender 離線渲染，`ObstacleSpriteStore` 依 manifest 錨點載入；`ad64afd`。 |
| **T0–T5** | 地形調色盤、熔岩重繪、裝飾與天氣零件化 | ✅ `TERRAIN_SKIN.lumaBudget`、`TERRAIN_AMBIENCE.edge` 崖邊裝飾、PART 天氣粒子；`f312187`。 |
| **UA / UF / MF** | 奧義時序反饋、命中光爆、近戰揮擊命中包 | ✅ `tests/UltSpec.test.ts`、`UltFeelStore` 命中局部光爆（`c7df349`）、`tests/MeleeFxSpec.test.ts`（`3c9d06f`）。 |

## 2. 有效未完成／待驗證事項

1. **奧義重新設計與體積感強化（排定待做需求，非已實作）**：
   - 需求：50 個奧義需要有差異化結果，每個詠唱不得少於 1.5 秒。
   - 改善零件化奧義半透明柔邊疊層過多導致的虛化感，重塑原版厚重立體感與核心密度。
   - 待此項完全完成後才進行全庫平衡測試。
2. **高障礙剪影驗證（待驗證）**：
   - 高障礙擋住單位時的剪影繪製（`drawSilhouette`）與動態遮擋體感仍需更多實機戰鬥觀察。
3. **高刷新率效能複測（待驗證）**：
   - `perf:frames` 壓力情境下的幀間隔與零件快取淘汰率，待在 239 Hz 主螢幕重跑確認。
4. **戰場視覺混亂度收斂（暫緩）**：
   - 技能特效、反傷／狀態浮字與場地疊層同時出現時的資訊密度收斂，目前暫緩維持現狀。
5. **靜態地形分層烘焙（暫緩）**：
   - 見 `docs/BAKED_RENDERING_DESIGN.md`，目前效能足夠，高度分帶雙層烘焙暫不實作。
