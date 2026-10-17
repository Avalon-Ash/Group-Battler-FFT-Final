# 每幀單位視覺快照（UnitFrame）設計 — 待辦 A

> 2026-10-17 主代理。前情：`docs/COORDINATE_AUDIT.md`。協議 SSOT：`engine/renderers/RenderSpec.ts`。

## 問題
同一個單位的「腳點、腳下高度、排序 Y、身體中心、頭頂」每幀由 6 個地方各算一次：

| 呼叫端 | 怎麼算腳下高度 | 已知不一致 |
|---|---|---|
| `UnitVisualProcessor.process`（身體） | `getUnitGroundHeight`；拖曳預覽改取游標格 | — |
| `UnitSystem.submitRenderables`（排序、屍體） | 上面的結果；屍體另用 `computeDeathGround` | 腳下格、sortBias、擊飛位移只在這裡 |
| `HUDRenderer`（血條） | `getUnitGroundHeight` | 拖曳預覽時血條留在原格高度 |
| `StatusOrchestrator`（護盾、狀態） | `getUnitGroundHeight`，`mapConfig` 選填 | 漏傳 mapConfig 就少了「取較高格」規則；拖曳同上 |
| `UnitSystem.drawSilhouette`（剪影） | `UnitVisualProcessor` | 沒有擊飛位移、沒有 sortBias 判斷 |
| `tactical.ts`（選取路徑提示） | `grid.getTerrainHeight(highlight.q, highlight.r)` | 直接查邏輯格（棘輪的 regex 漏抓三參數寫法） |

函式是同一個，但每個呼叫端傳的參數不同。結果就是「SSOT 存在，畫面卻對不齊」。

## 設計
**每幀算一次，所有繪製端讀同一份。**

```ts
// engine/renderers/frame/UnitFrame.ts（新檔，方框檔頭）
export interface UnitFrame {
    agent: Agent;
    footX: number;        // px + physics.x（屍體再加擊飛滑行 x）
    footY: number;        // py + physics.y（屍體再加擊飛滑行 y），不含轉場位移
    transition: number;   // 轉場位移（地塊也套同一個）
    groundH: number;      // 繪製用腳下高度（含漂浮位移；拖曳預覽＝游標格；屍體＝computeDeathGround）
    drawY: number;        // footY + transition - groundH（＝UNIT op.ty）
    sortY: number;        // footY + transition（＝UNIT op.y）
    sortBias: number;     // max(0, 腳下格格心 Y - footY)
    hexUnderFoot: Hex;
    bodyCenterY: number;  // VisualMath.getVisualBodyCenterY(drawY, physics.z)
    hudAnchorY: number;   // 血條錨點（原 HUDRenderer 公式）
    visible: boolean;     // 轉場超界、fullyDead、outOfBounds
}

export class UnitFrameStore {          // RenderPipeline 持有；物件池化，不每幀配置
    build(agents, renderHeightAt, mapConfig, transitionT, phase, hasGround): void;  // drawWorld 開頭呼叫一次
    get(agent): UnitFrame | undefined;
    readonly list: readonly UnitFrame[];
}
```

- **唯一寫入者**：`UnitFrameStore.build`。把 `UnitVisualProcessor` 的高度選擇、`UnitSystem` 的擊飛／`computeDeathGround`／sortBias 邏輯搬進來（搬移，不改公式）。
- **讀取端改簽名**：`UnitSystem.submitRenderables(renderList, frames, …)`、`drawSilhouette(ctx, frame, …)`、`HUDRenderer.draw(ctx, hud, frames, …)`、`StatusOrchestrator.draw(ctx, frames, …)`、`tactical.drawOverlay` 的選取單位高度改讀 `frames.get(highlight)`。這些繪製端**不再收到地形高度函式**，所以無法自己重算。
- `UnitVisualProcessor` 只剩 `isSelected` 等非座標旗標，或直接併入 builder 後刪除（先 `git grep` 證明零引用）。
- 模擬端（`EventVFXMapper`、`AgentVFXSystem`、`hud.ts` 的 SHOUT 跟隨）在 tick 內執行，讀不到每幀快照，維持 `VisualMath` 的模擬高度版本，這屬於 RenderSpec §4 的「模擬高度」。SHOUT 跟隨若要跟漂浮，改為繪製時由 `TextPainter` 依 `frames.get(owner)` 偏移（選做）。

## 棘輪
- `CoordinateProtocol.test.ts` 新增 `height.unitGroundCallers`：`engine/renderers/**` 內呼叫 `getUnitGroundHeight` 的檔案只允許 `UnitFrame.ts`。基準為空。
- `height.directAgent` 的 regex 補三參數寫法（`getTerrainHeight\(\s*X\.q\s*,\s*X\.r\s*,`），把 `tactical.ts` 修掉，不列基準。
- 行為測試：同一個單位在 UnitFrame、UNIT op、HUD 錨點、Status 身體中心之間的關係固定（例如 `op.ty === frame.drawY`、`hudAnchorY === drawY - physics.z - HUD_BAR_OFFSET`）；拖曳預覽時 HUD 跟著游標格。

## 驗證
- `npm run perf:guard`：battle_frozen 應為 0 差異（純搬移）。若有差異，必須是拖曳／屍體這類已知不一致被修正，並照合約附差異圖。
- `npm run verify:coords`（D 產出）：sink、float、flicker 不得變差。
- 本機截圖：拖曳預覽中的血條、擊飛中的屍體、VOID 上的護盾。

## 範圍與風險
- 大約 8 個檔案（新檔 1 個，加上 UnitSystem、UnitVisualProcessor、RenderPipeline、HUDRenderer、StatusOrchestrator、tactical、測試）。`renderer.ts` facade 不動：`RenderPipeline` 自己持有 store。
- 風險：剪影、HUD 的繪製順序與時機不變，只換資料來源。若發現某個繪製端「刻意」用了不同高度，停下來回報，不要統一掉。

## 待辦 E（排序收斂）
等 D（`docs/COORD_GUARD_FINDINGS.md`）的閃爍證據出來再定案。原則：
1. 只修證據指出的規則。
2. sortBias 與各種特例收斂成一張表加一個 `sortKeyFor(op)`，RenderSpec §1、§2 由它生成或由測試比對。
3. 法陣抬升的 O(單位×法陣) 迴圈保留或改格子索引，看量測結果決定。
