// ╔══════════════════════════════════════════════════════════╗
// ║  RenderSpec — 渲染座標協議 SSOT（層序、排序鍵、座標、錨點）║
// ║  職責：記錄所有「位置／高度／排序／發射點」規則的唯一文件 ║
// ║  上游：RenderList.sort（SUB_LAYER）、VisualMath（錨點）、  ║
// ║        RenderPipeline（繪製用地面高度）                    ║
// ║  [ARCH] 改到任何一條規則，必須在同一個 commit 更新本檔與  ║
// ║  受影響檔案的方框檔頭；tests/CoordinateProtocol.test.ts   ║
// ║  以只減不增的基準擋住偏離。                                ║
// ╚══════════════════════════════════════════════════════════╝

export class RenderSpec {
    static generateSpec(): string {
        let s = "# TACTICAL.OS — 渲染管線座標協議 (Renderer v2.0, 2026-10-17)\n\n";
        s += "本文件是位置、高度、排序與發射點的唯一規格。各檔方框檔頭（職責／上游／[ARCH]）是它的局部說明。\n";
        s += "改到任何一條規則，必須在同一個 commit 同步更新本檔與受影響檔案的檔頭；tests/CoordinateProtocol.test.ts 擋住偏離。\n\n";

        s += "## 1. RenderOp 層序總表 (Layer Order SSOT)\n\n";
        s += "唯一定義點：RenderList.ts 的 SUB_LAYER。排序鍵：\n\n";
        s += "  finalSortY = op.y + op.sortBias（＋貼地法陣抬升，見 §2）＋ tiebreak（CORPSE +0.5、VFX／PROJECTILE +1.0）\n";
        s += "  sortKey    = floor((finalSortY + 10000) * 100) + subLayer\n";
        s += "             ＋ 空中 VFX／PROJECTILE：z > 0 加 op.z * 20，z == 0 加 60\n";
        s += "             ＋ UNIT：agent id 雜湊 * 0.00001（同鍵決定性）\n";
        s += "             ＋ 奧義或 z > 600：+1e8（永遠在最上層）\n\n";
        s += "subLayer 只決定「同一個 Y 桶」內的先後；跨格遮擋由 finalSortY 決定（相鄰格 Y 差約 24 px，tiebreak 必須遠小於它）。\n\n";

        s += "| RenderOpType     | subLayer | 描述 |\n";
        s += "|------------------|----------|------|\n";
        s += "| TERRAIN          | 10       | 地塊本體＋地表細節＋地塊狀態疊層 |\n";
        s += "| DECAL            | 20       | 地面貼花（燒灼痕） |\n";
        s += "| HAZARD           | 30       | 持續性空間危害（熔岩、毒霧） |\n";
        s += "| VFX (isGround)   | 32       | 貼地特效（法陣、震波），不套 z-boost |\n";
        s += "| AURA             | 38       | 單位施法圈 |\n";
        s += "| OVERLAY          | 42       | 射程、懸停、警告、背水一戰 |\n";
        s += "| OBSTACLE         | 44       | 地形障礙物 |\n";
        s += "| UNIT             | 46       | 角色（棋座＋核心＋角色投影） |\n";
        s += "| CORPSE           | 48       | 死亡單位（擊飛、淡出） |\n";
        s += "| VFX (air)        | 50       | 空中特效，套 z-boost |\n";
        s += "| PROJECTILE       | 50       | 投射物，套同一套 z-boost |\n\n";

        s += "--- \n\n";

        s += "## 2. sortBias 協議 (sortBias Protocol)\n\n";
        s += "sortBias 是「視覺前緣補償」：不改變 op.y 的意義，只把排序用的 Y 往前推。只抬不降。\n\n";
        s += "| 提交者 | op | sortBias |\n";
        s += "|--------|----|----------|\n";
        s += "| GridRenderStrategy | TERRAIN、OBSTACLE、HAZARD | 0 |\n";
        s += "| GridRenderStrategy | OVERLAY | HEX_SIZE * 0.5（格子前緣） |\n";
        s += "| UnitSystem | AURA | HEX_SIZE * 0.5 |\n";
        s += "| UnitSystem | UNIT、CORPSE | max(0, 腳下格格心 Y − 腳 Y)：腳跨過格界進入前方格時，排在該格地塊之後 |\n";
        s += "| VFXRenderer | VFX (isGround) | gHalfH + VFX_RENDER.GROUND_SORT_BIAS（法陣前緣） |\n\n";
        s += "貼地法陣抬升（RenderList.sort）：gHalfH ≥ VFX_RENDER.DECAL_LIFT_MIN_HALF_H 的大型法陣範圍內的 UNIT／CORPSE，\n";
        s += "finalSortY 至少抬到法陣鍵之後（法陣不得蓋住棋座，ART_SPEC §13）。\n\n";
        s += "**繪製時才套用的位移必須進排序鍵**（腳點 op.y 含 physics.y 與屍體擊飛滑行；腳下格以含位移的腳點判斷）。\n";
        s += "唯一例外是 §5 漂浮位移：整片地形一起起伏，相鄰格相位差很小，不改變前後關係，所以不進排序鍵。\n\n";

        s += "--- \n\n";

        s += "## 3. 座標系 (Coordinate Spaces)\n\n";
        s += "世界座標（px, py）是 HexUtils.toPx 的輸出：已經是等角投影後的螢幕平面座標，高度另計。\n\n";
        s += "visualBaseY    = py + transitionOffset           地塊足跡 Y。TERRAIN／OVERLAY 的 op.y 與 op.ty\n";
        s += "visualSurfaceY = getIsoVisualY(visualBaseY, h)   地塊頂面 Y。OBSTACLE／HAZARD 的 op.ty\n";
        s += "terrainSortY   = visualBaseY + h * TERRAIN_SORT_SCALE   OBSTACLE／HAZARD／AURA 的 op.y（高地物件不被低地蓋過）\n\n";
        s += "單位（UnitSystem）：\n";
        s += "  op.tx = px + physics.x（屍體再加擊飛滑行 x）\n";
        s += "  op.y  = py + physics.y + transitionOffset（屍體再加擊飛滑行 y）＝腳點，排序用\n";
        s += "  op.ty = op.y − 腳下地面高度（§4 getUnitGroundHeight；屍體用 computeDeathGround）\n";
        s += "  physics.z（跳躍、飛行）在繪製時再往上扣，不進 op.y。\n\n";
        s += "VFX 粒子：p.y 是「未投影 Y」＝螢幕 Y / ISO_SCALE_Y（VFXPlayer 存入時除、VFXRenderer 提交時乘回）；p.z 是世界高度（含地形）。\n";
        s += "投射物：startY／endY 是螢幕 Y，ProjectileRenderer 內轉成未投影 Y 插值後再乘回。\n\n";
        s += "事件座標（GameEvent.pos）：xy 是「發生在哪」的世界座標；pos.z 若存在，**一律是世界高度**（模擬高度，\n";
        s += "engine.getTerrainHeight 的尺度，單位事件含 physics.z 空中高度），沒有 z＝地面上某處，由消費端查該格高度。\n";
        s += "發射端只能用 engine/events/EventPos.ts 的 unitEventPos／hexEventPos／pointEventPos 建構（§4），不手寫 pos 字面量。\n";
        s += "視覺端一律以 sourceId／targetId 經 §4 的 SSOT 函式解析活著的單位；單位已死／出局時才用 pos，\n";
        s += "並只加身體中心偏移，不再加地形高度（EventVFXMapper.resolvePoint）。\n\n";

        s += "--- \n\n";

        s += "## 4. SSOT 錨點函式 (Anchor Helpers, engine/math/VisualMath.ts)\n\n";
        s += "禁止在繪製、特效、HUD 程式碼裡自己用 getTerrainHeight(agent.q, agent.r) 算單位高度。\n\n";
        s += "| 用途 | 函式 | 定義 |\n";
        s += "|------|------|------|\n";
        s += "| 單位腳下地面高度 | getUnitGroundHeight | 邏輯格高度；移動中依 UNIT_STEP_BLEND 過渡；精靈實際所在格較高時取較高者（腳不陷進柱子） |\n";
        s += "| 受擊點／身體中心 | getUnitAnchor | 腳下高度 + physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET |\n";
        s += "| 施法／投射物／光束起點 | getCoreAnchor／coreAnchorAt | 棋座核心：腳下高度 + CORE_VISUAL.hoverHeight，不含 physics.z（飛行單位也從核心出發） |\n";
        s += "| 地面目標點 | resolveTargetPoint（ground-q,r） | 格高 + 2 |\n";
        s += "| 漂浮位移 | floatBobAt／isFloatingBiome | 見 §5 |\n";
        s += "| 單位事件位置 | unitEventPos（engine/events/EventPos.ts） | xy＝px+physics；z＝getUnitGroundHeight（模擬高度）+ physics.z |\n";
        s += "| 格子事件位置 | hexEventPos | 六角格中心；z＝getTerrainHeight(q, r) |\n";
        s += "| 純 2D 事件位置 | pointEventPos | 只有 xy（無 z），消費端自查該格高度 |\n\n";
        s += "高度有兩種：模擬高度 engine.getTerrainHeight（物理、AI、事件）與繪製用高度（RenderPipeline 傳給各繪製端的 getTerrainHeight，\n";
        s += "＝模擬高度 − 該格漂浮位移）。單位、屍體、狀態、HUD、貼地特效用繪製用高度；模擬端永遠不讀繪製用高度。\n\n";

        s += "--- \n\n";

        s += "## 5. 漂浮位移 (Floating Bob: VOID／MAGMA)\n\n";
        s += "唯一實作 VisualMath.floatBobAt(格心 x, 格心 y, battleTime)，參數 FLOAT_BOB（constants.ts），取整數像素，正值往下。\n";
        s += "- 地塊、障礙、危害、射程疊層：GridRenderStrategy 把位移加在 op.ty（不加在 op.y）。\n";
        s += "- 單位、屍體、狀態、HUD、剪影：從繪製用高度自動取得（RenderPipeline 的高度函式扣掉位移）。\n";
        s += "- 貼地特效、貼花：VFXRenderer 以「模擬高度 − 繪製用高度」補到 op.ty。\n";
        s += "- 不套用：空中特效、投射物、發射點（模擬端座標）。漂浮地圖上發射點與核心最多差 FLOAT_BOB.AMPLITUDE px。\n";
        s += "- 地形 sprite 快取鍵不含位移（TerrainBlockCache 固定傳 0），否則每個縮放級距上千種組合（docs/PERF_LIFECYCLE_FINDINGS.md）。\n";
        s += "驗證：node tools/ui-e2e/float-align-probe.mjs --biome=VOID（單位與腳下地塊的距離必須恆定）。\n\n";

        s += "--- \n\n";

        s += "## 6. VISUAL_OPTIONS 與 Painter 映射表 (Visual ID → Painter Route)\n\n";
        s += "說明：InspectorConstants.ts 中的 VISUAL_OPTIONS 是設計師填入技能視覺的入口。\n";
        s += "每個 ID 在 VFX 管線中對應固定的 Painter 路徑，填錯 ID 不會報錯但會靜默失效。\n\n";

        s += "[SSOT 邊界說明]\n";
        s += "本表管理「技能特效 VFX」的 Painter 路由，屬於 Skill-level 視覺。\n";
        s += "「單位本體外觀」（顏色/尺寸/武器形狀/披風）不在此範疇，\n";
        s += "請至 data/units/appearance/ 查閱與修改：\n\n";
        s += "  陣營外觀  : data/units/factionSkin.ts → FACTION_SKINS（渲染器唯一入口，見 docs/FACTION_SLOTS.md）\n";
        s += "  SSOT 入口 : data/units/appearance/index.ts → UNIT_APPEARANCE\n";
        s += "  介面定義  : data/units/appearance/types.ts → RoleAppearance\n";
        s += "  欄位      : bodyWidth, bodyHeight, headRadius,\n";
        s += "              primaryColor, secondaryColor, accentColor,\n";
        s += "              weaponType, capeColor\n";
        s += "  映射方式  : UNIT_APPEARANCE[Team.*].roles[Role.*]\n\n";
        s += "修改流程：\n";
        s += "  調整外觀顏色/尺寸  → data/units/appearance/imperial.ts 或 covenant.ts\n";
        s += "  調整 Painter 繪法  → engine/renderers/units/factions/\n";
        s += "                       engine/renderers/units/painters/\n\n";

        s += "| Visual ID      | Painter 路徑         | 渲染分類     | 備註 |\n";
        s += "|----------------|----------------------|--------------|------|\n";
        s += "| SLASH          | BillboardPainter     | isGround     | 揮砍弧光 |\n";
        s += "| ARROW          | ProjectileDrawer     | air          | 物理投射物 |\n";
        s += "| FIREBALL       | ProjectileDrawer     | air          | 帶尾跡彈道 |\n";
        s += "| BOLT           | ProjectileDrawer     | air          | 直線高速彈 |\n";
        s += "| BEAM           | ProceduralPainter    | air (locked) | 鎖定型光束，不進排序 |\n";
        s += "| BOMB           | ProjectileDrawer     | air          | 拋物線落點型 |\n";
        s += "| SMASH          | GroundPainter        | isGround     | 貼地衝擊波 |\n";
        s += "| HEX_HALO       | GroundPainter        | isGround     | 六角光環 |\n";
        s += "| HEX_PRISM      | VolumePainter        | air (z>0)    | 立體柱狀 |\n";
        s += "| HEX_RUNE       | GroundPainter        | isGround     | 貼地符文 |\n";
        s += "| HEX_SHIELD     | VolumePainter        | air (z>0)    | 護盾立體球 |\n";
        s += "| HEX_SKULL      | BillboardPainter     | air          | 狀態標記 |\n";
        s += "| HEX_ANGRY      | BillboardPainter     | air          | 狀態標記 |\n";
        s += "| HEX_EYE        | BillboardPainter     | air          | 狀態標記 |\n";
        s += "| HEX_LOCK       | BillboardPainter     | air          | 狀態標記 |\n\n";

        s += "--- \n\n";

        s += "## 7. isGround 旗標語意 (isGround Semantics)\n\n";
        s += "isGround 由 VFX_GROUND_TYPES 決定，是排序行為與 Painter 路徑的分類旗標。\n\n";
        s += "- isGround = true：subLayer 32，不套 z-boost；op.z = max(p.z + GROUND_Z_BIAS, GROUND_Z_BIAS)，\n";
        s += "  繪製位置再扣 GROUND_VISUAL_BIAS（只動 op.ty，不動排序用 op.y）\n";
        s += "- isGround = false, z > 0：subLayer 50，加 op.z * 20（空中特效、HEX_PRISM、護盾）\n";
        s += "- isGround = false, z == 0：subLayer 50，加固定 60（平面空中 Billboard）\n\n";

        s += "--- \n\n";

        s += "## 8. 新增渲染類型或改座標規則的標準作業流程 (SOP)\n\n";
        s += "缺少任何一步均視為未完成：\n";
        s += "1. RenderList.ts：在 RenderOpType enum 新增值、在 SUB_LAYER 取得一個 subLayer\n";
        s += "2. RenderList.ts：確認 RenderOp.clear() 重設了新欄位\n";
        s += "3. 提交端（Strategy/System）：op.y＝足跡 Y（含所有繪製時位移，§2）、op.ty＝繪製 Y、高度取自 §4 的 SSOT 函式\n";
        s += "4. RenderDispatcher.ts：新增 case\n";
        s += "5. 本文件：更新層序表、sortBias 表或座標章節\n";
        s += "6. 受影響檔案的方框檔頭（職責／上游／[ARCH]）同步更新\n";
        s += "7. npm test（含 tests/CoordinateProtocol.test.ts）；動到畫面再本機實跑截圖\n";
        s += "※ 若涉及單位外觀（非 VFX），改 data/units/appearance/ 的 RoleAppearance，而非新增 RenderOpType。\n";

        return s;
    }

    static downloadSpec() {
        const text = RenderSpec.generateSpec();
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Tactical_OS_v2.0_Render_Pipeline_Spec.md';
        anchor.click();
        URL.revokeObjectURL(url);
    }
}
