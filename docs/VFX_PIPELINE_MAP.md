# 特效管線地圖（現行拓樸與操作手冊）

> **現況**：所有特效與投射物均已全面零件化。粒子分派依據 `constants/vfx.ts` 的 `PARTICLE_TRAITS`。舊管線（`ProceduralPainter`、`GroundPainter`、看板繪製器、舊投射物繪製器）已全數刪除。歷史遷移過程請參閱 Git 歷史與 `docs/WORKLOG.md`。

## 1. 現行管線拓樸

```
 遊戲事件（engine.bus）
  ├─ VisualSystem.flush(events)
  │   ├─ EventHUDMapper  ──► DAMAGE / HEAL / CC / CAST 事件 ──► HUDSystem
  │   ├─ EventVFXMapper  ──► 狀態、受創、護盾火花、出場、中斷等 ──► VFXSystem
  │   └─ CAST_START (skill.id) ──► 符合資格單體非投射物帶 targetId/lockAt ──► SequenceSystem.run
  │         ├─ PARTICLE   ──► VFXSystem.playEffect(id)（掛零件）
  │         ├─ BEAM       ──► VFXSystem.playBeam(style)（掛光束零件，依陣營色階）
  │         ├─ GRID_PULSE ──► VFXSystem.playEffect（依 teamOf 選 FX_GRID_IMPACT_BLUE 或 RED）
  │         ├─ HEAVEN_FALL──► 生成兩顆同步自由落體 PART_DEBRIS（rock＋glow）＋貼地 PART_GROUND shadow
  │         ├─ SHAKE      ──► engine.bus.emit('CAMERA_SHAKE')
  │         └─ ULT_IMPACT ──► UltFeelStore.recordImpact（奧義命中光爆）
 │
 ├─ 投射物管線
 │   └─ ProjectileSystem ──► engine.projectiles
 │         └─ ProjectileRenderer.submit ──► RenderOpType.PROJECTILE
 │               └─ ProjectilePartPainter.draw（依 data/vfx/projectile_visuals.ts 與 op.pTeam）
 │                     ├─ 本體：missile 零件（依速度動態拉伸）
 │                     ├─ 拖尾：beam 光痕或 smoke 煙零件
 │                     └─ 頭部：glow 零件
 │
 └─ 粒子與空間渲染（VFXRenderer.submitRenderables）
       └─ RenderOp VFX ──► ParticleRenderer.drawSingleParticle（依 particleBackend 分派）：
             ├─ PART (PART, PART_GROUND, PART_DEBRIS) ──► PartPainter.draw（預烘焙六角零件）
             ├─ BEAM (帶 p.part) ───────────────────────► PartPainter.drawBeam（可捲動光管磚）
             └─ 其餘未掛零件／除錯型別 ─────────────────► ParticleRenderer.drawDebugDot（洋紅除錯點）

不經粒子的直接零件繪製（各自讀取 Agent 或空間狀態）：
  - 單位光環：UnitAuraPainter（magicCircle 圓形法陣零件，反向慢轉）
  - 護盾表現：ShieldPainter（prism 六角稜柱零件＋上升掃描環）
  - 危害場域：HazardPainter（partLayer 零件層＋中心格漩渦）
  - AOE 預警：UnitIndicatorPainter（magicCircle 外環＋softTile 柔光格）
  - 終局縮圈：ZoneRenderer（softTile 柔光格＋邊界）
  - 奧義反饋：UltWorldRenderer（UltFeelStore 記錄之局部加法光爆，不透明度上限 0.35）
```

## 2. 粒子特性與分派規則（SSOT）

`constants/vfx.ts` 中的 `PARTICLE_TRAITS` 是粒子特性的單一來源：

| ParticleType | backend | ground | physical | fixed | selfDrawn | 繪製行為 |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `PART` | `PART` | — | — | ✓ | ✓ | `PartPainter.draw` |
| `PART_GROUND` | `PART` | ✓ | — | ✓ | ✓ | `PartPainter.draw`（貼地排序） |
| `PART_DEBRIS` | `PART` | — | ✓ | ✓ | ✓ | `PartPainter.draw`（受重力與反彈） |
| `BEAM` | `BILL` | — | — | — | ✓ | `p.part ? PartPainter.drawBeam : drawDebugDot` |
| `GENERIC_DEBUG`| `BILL` | — | — | — | — | `ParticleRenderer.drawDebugDot` |

- 守門測試：`tests/VFXBackend.test.ts` 鎖定推導集合，舊後端資產與未掛零件型別只減不增。

## 3. 取樣品質與對齊規範

- **Smoothing 規範**：主畫布與貼地離屏畫布每幀 `ctx.imageSmoothingQuality = RENDER_QUALITY.IMAGE_SMOOTHING`（現值為 `low`，見 `RenderSpec.ts` §3；歷史上曾設 high，因 drawImage 重複計算致幀時間倍增而降為 low；離線烘焙維持 high）。
- **像素對齊**：繪製點對齊裝置像素（`RenderDispatcher.setDeviceGrid` / `snap`），避免抗鋸齒模糊。
- **生物群系增益**：加法零件乘群系增益 `VFX_BIOME_GAIN`（ICE 0.77、DESERT 0.94，RenderPipeline 每幀依場景設定），防止亮底發白。

## 4. 操作與驗證命令入口

| 命令／工具 | 用途說明 |
| :--- | :--- |
| `node tools/vfx/fx-shot.mjs --keys=<KEY>` | 單一特效／法陣／投射物截圖預覽 |
| `node tools/vfx/ult-sheet.mjs --feel` | 奧義全畫面演出（起手／命中／餘韻）截圖總表 |
| `node tools/vfx/vfx-coverage.mjs` | 特效覆蓋率與後端分派執行期探針 |
| `npm run verify:coords` | 座標與景深協議驗證 |
| `npx vitest run tests/VFXBackend.test.ts` | 特效後端與型別特性契約測試 |
| `npx vitest run tests/UltSpec.test.ts` | 奧義時序與粒子規格測試 |
| `npx vitest run tests/MeleeFxSpec.test.ts` | 近戰揮擊與命中包規格測試 |
