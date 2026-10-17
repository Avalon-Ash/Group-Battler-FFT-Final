# 座標協議稽核（2026-10-17，分支 `fix/coordinate-protocol`）

## 結論
- 規則原本就寫在 `engine/renderers/RenderSpec.ts` 與約 25 個檔案的方框檔頭裡，但**沒有強制力**：RenderSpec 的層序表、sortBias 規則已過期（例如寫「UNIT sortBias = 0」、OVERLAY subLayer 25），後續幾輪的代理改了實作卻沒有同步更新文件。
- 這輪的處理方式：RenderSpec 改寫成現行協議（v2.0），合約（`AGENTS.md` §2、§4，`CLAUDE.md`）明文要求「改規則就在同一個 commit 更新 RenderSpec 與檔頭」，並由 `tests/CoordinateProtocol.test.ts`（基準只減不增）擋住偏離。

## 盤點與處理

| # | 類別 | 位置 | 判定 | 處理 |
|---|------|------|------|------|
| C | 漂浮位移只套在地塊 | `TerrainRenderer.drawBlock` 內部自算 `sin(t*1.5+…)*4` | **錯位**：VOID／MAGMA 上的單位、屍體、障礙、射程疊層、狀態、HUD、法陣、貼花都不跟著浮動，最多差 8 px；地表細節與地塊狀態疊層也沒跟上 | 唯一實作改為 `VisualMath.floatBobAt`（參數 `FLOAT_BOB`）。地塊類由 `GridRenderStrategy` 加在 `op.ty`；其餘經 `RenderPipeline` 的「繪製用地面高度」自動取得；貼地特效／貼花在 `VFXRenderer` 補差值。不進排序鍵。 |
| A1 | 單位附著粒子用邏輯格高度 | `AgentVFXSystem`（擊退塵煙、待機、狀態粒子） | **錯位**：擊退到較高鄰格時粒子在柱子裡；移動中上坡時高度跳變 | 改用 `VisualMath.getUnitGroundHeight` |
| A2 | SHOUT 文字跟隨 | `hud.ts` | 同上，與血條（已用 SSOT）高度不一致 | 改用 `getUnitGroundHeight` |
| A3 | 死亡目標的受擊點 | `EventVFXMapper.resolvePoint` | **錯位**：單位事件的 `pos.z` 是相對高度（physics.z），死亡分支卻當成世界高度，致命一擊的特效畫在高台底下 | 加回腳下地形高度 |
| A4 | 護盾腳底距離 | `ShieldPainter.computeShieldGeometry` | 自己重算 `UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET` | 改由 `getVisualBodyCenterY` 推導（數值不變） |
| B | 發射事件的 `pos` 未含核心位置 | `ProjectileSystem` 的 `PROJECTILE_SPAWN`、`SkillExecutor` 的 `VISUAL_BEAM` 與 `CC_APPLIED`／`HEAL`／`DAMAGE` | **不是錯位**：事件 `pos` 只代表「發生在哪」，視覺端以 `sourceId` 經 `getCoreAnchor`、以 `targetId` 經 `getUnitAnchor` 解析（`EventVFXMapper`、`SequenceSystem`） | 寫進 RenderSpec §3「事件座標」，不改 |
| D | AURA 排序鍵含高度 | `UnitSystem` | 符合 `terrainSortY` 規則；漂浮位移使鍵有 ±2.8 的變動，遠小於 sortBias 邊距（HEX_SIZE*0.5） | 記錄，不改 |
| — | 射程預覽用選取單位的邏輯格 | `GridRenderStrategy.checkIsRange` | 屬於遊戲規則（高低差射程加成），邏輯格是對的；但 `/ 24` 與實際目標判定是否同源未查 | 列入基準（唯一一筆） |

已知限制：漂浮地圖上發射點（模擬端座標）與畫面上的核心最多差 `FLOAT_BOB.AMPLITUDE` px；投射物是空中物件，不套浮動。

## 守門測試 `tests/CoordinateProtocol.test.ts`
- `height.directAgent`：繪製端（renderers、vfx、visuals、unit、hud、components…）不得 `getTerrainHeight(agent.q, agent.r)`。
- `anchor.recompute`：不得在 VisualMath 以外重算身體中心或核心高度（核心繪製端 `UnitCorePainter` 例外）。
- `float.outsideSSOT`：`FLOAT_BOB` 與「VOID／MAGMA 判斷」只能在 SSOT；`floatBobAt`／`isFloatingBiome` 的呼叫端固定為 `RenderPipeline`、`GridRenderStrategy`。
- `submitter.header`：提交 RenderOp 的檔案必須有方框檔頭並指向 RenderSpec。
- RenderSpec 與實作一致：§1 表格逐列比對 `SUB_LAYER`、tiebreak 數值、引用的常數與 VisualMath 函式必須存在。
- 行為：單位排序鍵含 physics 位移且抬到腳下格格心；繪製 Y 用傳入的繪製用高度，排序鍵不含漂浮位移。

## 驗證
- `node tools/ui-e2e/float-align-probe.mjs --biome=VOID|MAGMA`：地塊浮動 8 px，單位與腳下地塊的距離逐幀恆定；FOREST 不浮動。
