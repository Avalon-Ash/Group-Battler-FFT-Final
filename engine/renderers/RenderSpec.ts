
export class RenderSpec {
    static generateSpec(): string {
        let s = "# TACTICAL.OS — 渲染管線視覺規格白皮書 (Renderer v1.0)\n\n";

        s += "## 1. RenderOp 層序總表 (Layer Order SSOT)\n\n";
        s += "說明：RenderList.sort() 所使用的 subLayer 值是整個渲染系統的唯一排序真相。\n";
        s += "任何新增渲染類型，必須在此表取得一個明確的 subLayer 值後，才能提交至 RenderList。\n\n";

        s += "| 層級 | RenderOpType    | subLayer | 描述 |\n";
        s += "|------|-----------------|----------|------|\n";
        s += "| 1    | TERRAIN         | 10       | 地形格與地塊本體 |\n";
        s += "| 2    | DECAL           | 20       | 地面貼花（彈孔、血跡、燒灼痕） |\n";
        s += "| 3    | OVERLAY         | 25       | UI 覆蓋層（射程、懸停、警告、背水一戰） |\n";
        s += "| 4    | HAZARD          | 30       | 持續性空間危害（熔岩、毒霧） |\n";
        s += "| 5    | AURA            | 35       | 單位光環與施法圈 |\n";
        s += "| 6    | OBSTACLE        | 40       | 地形障礙物（樹、石、水晶） |\n";
        s += "| 7    | UNIT            | 45       | 角色本體 |\n";
        s += "| 8    | VFX (isGround)  | 32       | 貼地 VFX（爆炸圈、震波）|\n";
        s += "| 9    | VFX (air, z>0)  | 50+      | 空中 VFX，額外疊加 op.z * 20 |\n";
        s += "| 10   | VFX (air, z==0) | 50+60    | 零高度空中 VFX，額外疊加固定 +60 |\n";
        s += "| 11   | PROJECTILE      | 同 VFX   | 投射物，適用同一套 z-boost 規則 |\n\n";

        s += "--- \n\n";

        s += "## 2. sortBias 使用協議 (sortBias Protocol)\n\n";
        s += "說明：sortBias 是針對同一個 RenderOp 的「視覺前緣補償量」，\n";
        s += "不改變 op.y 的物理意義，只影響排序時的等效 Y 值。\n\n";
        s += "規則：\n";
        s += "- DECAL、OVERLAY：使用 sortBias = HEX_SIZE * 0.5，代表「以六邊形前緣為排序基準」\n";
        s += "- TERRAIN、OBSTACLE、UNIT：sortBias = 0（以格子世界座標 Y 為準）\n";
        s += "- 禁止：在同一個 op 同時設定 sortBias 與非零 op.z，兩者語意衝突\n\n";

        s += "--- \n\n";

        s += "## 3. 視覺座標系協議 (Visual Coordinate Protocol)\n\n";
        s += "說明：GridRenderStrategy 中存在三個關鍵 Y 值，語意嚴格不可混用。\n\n";
        s += "visualBaseY  = py + transitionOffset\n";
        s += "  → 世界基準 Y，不含等角高度投影\n";
        s += "  → 用於：TERRAIN op.y（排序用）、OVERLAY op.ty / op.y\n";
        s += "  → 絕對不用於：含地形高度的繪製錨點\n\n";
        s += "visualSurfaceY = VisualMath.getIsoVisualY(visualBaseY, h)\n";
        s += "  → 等角投影後的地表頂面 Y\n";
        s += "  → 用於：OBSTACLE、HAZARD、UNIT 的 op.ty（繪製錨點）\n";
        s += "  → 含義：地塊頂面在螢幕上的實際像素 Y\n\n";
        s += "terrainSortY = visualBaseY + (h * TERRAIN_SORT_SCALE)\n";
        s += "  → 帶高度補償的排序 Y\n";
        s += "  → 用於：OBSTACLE、HAZARD 的 op.y（排序用）\n";
        s += "  → 保證高地物件不被低地物件蓋過\n\n";

        s += "--- \n\n";

        s += "## 4. VISUAL_OPTIONS 與 Painter 映射表 (Visual ID → Painter Route)\n\n";
        s += "說明：InspectorConstants.ts 中的 VISUAL_OPTIONS 是設計師填入技能視覺的入口。\n";
        s += "每個 ID 在 VFX 管線中對應固定的 Painter 路徑，填錯 ID 不會報錯但會靜默失效。\n\n";

        s += "[SSOT 邊界說明]\n";
        s += "本表管理「技能特效 VFX」的 Painter 路由，屬於 Skill-level 視覺。\n";
        s += "「單位本體外觀」（顏色/尺寸/武器形狀/披風）不在此範疇，\n";
        s += "請至 data/units/appearance/ 查閱與修改：\n\n";
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

        s += "## 5. isGround 旗標語意 (isGround Semantics)\n\n";
        s += "說明：isGround 是 VFX Particle 的核心分類旗標，決定排序行為與 Painter 路徑。\n\n";
        s += "規則：\n";
        s += "- isGround = true：subLayer 固定為 32，不套用 z-boost\n";
        s += "  → 適用：貼地爆炸、衝擊波、地面光環\n";
        s += "  → op.z 應為 0 或地面高度補償值，不應為正值\n";
        s += "- isGround = false, z > 0：subLayer = 50，額外加 op.z * 20\n";
        s += "  → 適用：空中飛行特效、HEX_PRISM、護盾\n";
        s += "- isGround = false, z == 0：subLayer = 50 + 60 固定補償\n";
        s += "  → 適用：平面空中 Billboard（頭頂狀態標記）\n\n";

        s += "--- \n\n";

        s += "## 6. 新增渲染類型的標準作業流程 (New RenderOpType SOP)\n\n";
        s += "說明：任何新增渲染層級，必須嚴格按照以下順序修改，缺少任何一步均視為未完成。\n\n";
        s += "步驟：\n";
        s += "1. RenderList.ts：在 RenderOpType enum 中新增值（選用不衝突的整數）\n";
        s += "2. RenderList.ts：在 sort() 的 subLayer 判斷區塊中，按照層序表插入對應的 subLayer 值\n";
        s += "3. RenderList.ts：確認 RenderOp.clear() 已重設所有新 op 會使用的欄位\n";
        s += "4. 提交端（Strategy/System）：調用 renderList.next()，設定 op.type 與所有必要欄位\n";
        s += "5. RenderDispatcher.ts：新增對應的 case，呼叫正確的 Painter/Renderer\n";
        s += "6. RenderSpec.ts（本文件）：更新章節 1 的層序總表\n";
        s += "※ 若新增類型涉及單位外觀（非 VFX），請改至 data/units/appearance/ 建立新的\n";
        s += "  RoleAppearance 欄位，而非在此新增 RenderOpType。\n";

        return s;
    }

    static downloadSpec() {
        const text = RenderSpec.generateSpec();
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'Tactical_OS_v1.0_Render_Pipeline_Spec.md';
        anchor.click();
        URL.revokeObjectURL(url);
    }
}
