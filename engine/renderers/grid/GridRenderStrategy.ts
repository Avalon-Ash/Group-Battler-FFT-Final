// ╔══════════════════════════════════════════════════════════╗
// ║  GridRenderStrategy — 地塊／障礙／危害／疊層 RenderOp 提交 ║
// ║  職責：每格提交 TERRAIN、OBSTACLE、HAZARD、OVERLAY         ║
// ║  上游：GridCache（格心、高度、鄰格遮罩）                   ║
// ║  [ARCH] 座標規則見 engine/renderers/RenderSpec.ts §2、§3：  ║
// ║  op.y＝足跡 Y（不含高度，與單位同一把尺），op.ty＝繪製 Y  ║
// ║  漂浮位移（§5，VisualMath.floatBobAt）只加在 op.ty。       ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine, Agent } from "../../game";
import { GridCache } from "../../systems/grid/GridCache";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { HexUtils } from "../../utils";
import { VisualMath } from "../../math/VisualMath";

export class GridRenderStrategy {
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();
    private _castingAOE = new Set<string>();
    private _castingColor: string = '';

    public submit(
        cache: GridCache,
        renderList: RenderList,
        engine: GameEngine, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null, 
        highlightAgent: Agent | null, 
        projectiles: Projectile[],
        transitionT: number,      
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        globalTime: number
    ) {
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        cache.ensure(engine);
        const scene = engine.currentScene;
        const theme = TERRAIN_THEMES[scene.textureType] || TERRAIN_THEMES['VOID'];
        // 漂浮位移只加在繪製位置 ty（不進排序鍵 op.y）；同一個值也由 RenderPipeline 併入繪製用地面高度（見 RenderSpec）
        const floating = VisualMath.isFloatingBiome(scene.textureType);

        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        this._castingAOE.clear();
        this._castingColor = '';

        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') this._unitVisualStatus.set(key, a.visualStatus);

                // Check for casting AOE to highlight
                if (a.castingSkillIdx !== -1 && a.currentTelegraph) {
                    const skill = a.skills[a.castingSkillIdx];
                    if (skill) {
                        const telegraph = a.currentTelegraph;
                        for (let i = 0; i < telegraph.length; i++) {
                            const c = telegraph[i];
                            this._castingAOE.add(`${c.q},${c.r}`);
                        }
                        if (!this._castingColor) this._castingColor = skill.color;
                    }
                }
            }
        }

        for (const tile of cache.tileList) {
            const { q, r, px, py, h, key, edgeMask, baseLevel } = tile;
            
            // 使用 VisualMath 進行轉場位移解算
            const offset = VisualMath.getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            const visualBaseY = py + offset;
            const visualSurfaceY = VisualMath.getIsoVisualY(visualBaseY, h);
            const bob = floating ? VisualMath.floatBobAt(px, py, globalTime) : 0;

            if (Math.abs(offset) > 800) continue;

            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.tq = q; op.tr = r; op.th = h; 
                op.tx = px; op.ty = visualSurfaceY + bob; 
                // 排序只看足跡 Y，不加高度：舊的 h*TERRAIN_SORT_SCALE 讓高地上的障礙物排到同一座高台上前方單位之後，
                // 蓋住單位（docs/DEPTH_ORDER_FINDINGS.md，穩定錯序 449→50）。同格時 subLayer 決定先後。
                op.y = visualBaseY;
                op.ttype = obstacleType;
            }

            const hazardsAtTile = engine.getSpatialHazardsAt(q, r);
            for (const h of hazardsAtTile) {
                const hOp = renderList.next();
                hOp.type = RenderOpType.HAZARD;
                hOp.tq = q; hOp.tr = r; hOp.th = tile.h;
                hOp.tx = px; hOp.ty = visualSurfaceY + bob; 
                hOp.y = visualBaseY; // 同上：危害不再因格高排到站在其上的單位之後（DEPTH_ORDER_FINDINGS §1-2）
                hOp.oHazard = h;
                hOp.time = globalTime;
            }

            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.tq = q; op.tr = r; op.th = h;
            op.tEdge = edgeMask;
            op.tBase = baseLevel;
            op.tx = px; op.ty = visualBaseY + bob; 
            op.y = visualBaseY; // Sorting based on footprint
            op.tsize = HEX_SIZE; op.ttheme = theme; op.ttype = scene.textureType; op.tdetail = theme.detail;
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = engine.zones.getZoneAt(q, r); 
            
            // Mix player hover range and AI casting AOE
            const isHoverRange = this.checkIsRange(q, r, h, hoveredSkill, highlightAgent, engine);
            const isCastAOE = this._castingAOE.has(key);
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            const isWarning = engine.map.warningTiles.has(key);
            const isLastStand = engine.state.isLastStand && engine.state.finalHex?.q === q && engine.state.finalHex?.r === r;

            op.oHasUnit = !engine.isRunning && this._unitPresence.has(key);
            op.time = globalTime;

            // Submit a separate OVERLAY op for range/hover/warning/laststand
            if (isHoverRange || isCastAOE || isHover || isWarning || isLastStand) {
                const overlayOp = renderList.next();
                overlayOp.type = RenderOpType.OVERLAY;
                overlayOp.tq = q; overlayOp.tr = r; overlayOp.th = h;
                overlayOp.tx = px; overlayOp.ty = visualBaseY + bob; 
                overlayOp.y = visualBaseY; 
                // 疊層畫在格子頂面：與地塊同鍵，subLayer（42）排在同格障礙（44）與單位（46）之前；
                // 舊的半格前緣 sortBias 會蓋住同格的障礙物（拿掉障礙物 h*0.7 加成後才顯現，DEPTH_ORDER_FINDINGS）。
                overlayOp.sortBias = 0;
                overlayOp.tsize = HEX_SIZE;
                overlayOp.oRange = isHoverRange || isCastAOE;
                overlayOp.oRangeCol = (isHoverRange ? hoveredSkill?.color : this._castingColor) || '';
                overlayOp.oHover = isHover;
                overlayOp.oWarning = isWarning;
                overlayOp.oLastStand = isLastStand;
                overlayOp.time = globalTime;
            }
        }

        // Render collapsing tiles
        for (const [, tile] of engine.zones.collapsingTiles.entries()) {
            const { q, r, z, h } = tile;
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            
            const offset = VisualMath.getTransitionOffset(pos.x, pos.y, engine.mapConfig, transitionT, transitionPhase);
            // z is negative when falling. In isometric, lower z means higher visual Y.
            const fallVisualOffset = -z * ISO_SCALE_Y;
            const visualBaseY = pos.y + offset + fallVisualOffset;

            if (Math.abs(offset) > 800) continue;

            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.tq = q; op.tr = r; op.th = h; // Keep original height for block thickness
            op.tEdge = 0; // 掉落中的地塊不套用鄰格遮罩
            op.tBase = 0; // 掉落中的地塊維持舊基座
            op.tx = pos.x; op.ty = visualBaseY + (floating ? VisualMath.floatBobAt(pos.x, pos.y, globalTime) : 0); 
            op.y = pos.y + offset; // Sorting based on initial footprint, ignore falling Z
            op.z = z; // Negative Z indicates falling and used for opacity calculation
            op.tsize = HEX_SIZE; op.ttheme = theme; op.ttype = scene.textureType; op.tdetail = theme.detail;
            op.oStatus = undefined;
            op.oDanger = undefined; 
            op.oRange = false;
            op.oHover = false;
            op.oWarning = false;
            op.oHasUnit = false;
            op.time = globalTime;
        }
    }

    private checkIsRange(q: number, r: number, h: number, skill: Skill | null, highlight: Agent | null, engine: GameEngine): boolean {
        if (!skill || !highlight) return false;
        const agentH = engine.map.getTerrainHeight(highlight.q, highlight.r);
        const bonus = Math.max(0, Math.floor((agentH - h) / 24)); 
        return HexUtils.dist({q, r}, {q: highlight.q, r: highlight.r}) <= skill.range + bonus;
    }
}