# 核心投影化與發射／受擊點統一 — 待辦 F

> 2026-10-17 主代理。前情：`docs/PEDESTAL_CORE.md`（棋座核心）、`engine/renderers/RenderSpec.ts` §4（錨點）。

## 使用者的要求
1. 核心要跟著投影的真實 Y 位移走（跳躍、飛行、受擊晃動、漂浮）。
2. 原始設計是很淡的核心，現在變成實體寶石，畫面比重太重。**投影出現後由投影取代寶石**：寶石藏在投影中心，淡淡地透出來。
3. 投射物的起點、受擊點與投影對不上。

## 現況（三個點各說各話）

| 點 | 定義 | 離腳下地面高度 | 水平 |
|---|---|---|---|
| 發射點 `getCoreAnchor` | `CORE_VISUAL.hoverHeight` | 26（不含 physics.z） | +13（`offsetX`） |
| 受擊點 `getUnitAnchor` | `UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET` | 42 + physics.z | 0 |
| 投影實際中心 | 精靈約 59 高（`UNIT_SPRITE.targetHeightCanvasUnits` × 體型 heightScale） | 約 30 + physics.z | 0 |

## 設計
**一個點：投影中心（projection center）。** 發射、受擊、核心都是它。

- SSOT：`VisualMath.projectionCenterAt(x, y, groundH, physicsZ, bodyType)` → `{ x, y, z: groundH + physicsZ + projectionCenterHeight(bodyType) }`。
  - `projectionCenterHeight` 從**精靈資料**推導（精靈高度 × 體型 heightScale × 0.5 + 精靈腳底懸浮），放在 `data/units/appearance/`，模擬端（tick 內發射投射物）可以直接讀，不依賴圖集載入。
  - 測試比對它與 `SpriteUnitRenderer` 的實際頭頂高度（圖集就緒時），兩者不得漂移。
- `getUnitAnchor`（受擊）與 `getCoreAnchor`（發射）改由它組成。發射點不再有 `offsetX`；**飛行單位從身體中心發射**，這推翻原本「從地面核心發射」的決定，以使用者這次的要求為準。
  - `UNIT_BODY_OFFSET`／`UNIT_HOVER_OFFSET` 若只剩錨點在用，就併入新定義；仍有其他用途（狀態圖示、護盾）就保留，並在 RenderSpec 寫明兩者的關係。
- 繪製（`UnitCorePainter`）：
  - **投影可見**（活著、出生動畫結束、非拖曳預覽）：寶石畫在投影中心，畫在角色之後（上層），低不透明度（`CORE_VISUAL.projectedAlpha`，約 0.2～0.3）；施法時光暈拉高（`projectedCastGlow`），讓「誰在詠唱」仍然看得出來。跟著 physics.z、受擊晃動 `visualOffset`、漂浮位移走：位置取自 UnitFrame，與模擬端同一個公式，只多出純繪製位移。
  - **投影不可見**（拖曳預覽、放置幽靈、出生前）：維持現在的實體寶石，懸在棋座上（`hoverHeight`）。
  - 出生動畫期間：寶石從棋座升到投影中心並淡出成內光（依 `spawnTimer` 插值），表現「核心把角色投影出來」。
- 文件：`PEDESTAL_CORE.md` 世界觀補一句「投影成形後，核心藏進投影中心」；RenderSpec §4 錨點表改寫；`CORE_VISUAL` 參數集中在 constants。

## 驗收
- 單元測試：站立單位的發射點 == 受擊點 == 投影中心；飛行單位含 physics.z；`projectionCenterHeight` 與圖集頭頂高度差在 2 px 內。
- 截圖：待機、施法、受擊（同一張裡投射物起點在投影中心、命中點在目標投影中心）、飛行單位、拖曳預覽（實體寶石）、出生動畫中段。
- `battle_frozen` 預期會變（核心外觀）：照合約附新舊差異圖，再單獨 commit 重錄；地形基準 0 差異。
- `npm run verify:coords` 不變差；`perf:guard` 通過。
