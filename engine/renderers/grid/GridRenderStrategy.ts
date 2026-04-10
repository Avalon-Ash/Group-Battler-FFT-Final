import { GameEngine, Agent } from "../../game";
import { GridCache } from "./GridCache";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE, ISO_SCALE_Y } from "../../../constants";
import { HexUtils } from "../../utils";
import { VisualMath } from "../../math/VisualMath";

export class GridRenderStrategy {
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();

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
        const layout = engine.mapConfig.layout;

        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') this._unitVisualStatus.set(key, a.visualStatus);
            }
        }

        for (const tile of cache.tileList) {
            const { q, r, px, py, h, key } = tile;
            
            // 使用 VisualMath 進行轉場位移解算
            const offset = VisualMath.getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            const visualBaseY = py + offset;
            const visualSurfaceY = VisualMath.getIsoVisualY(visualBaseY, h);

            if (Math.abs(offset) > 800) continue;

            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.tq = q; op.tr = r; op.th = h; 
                op.tx = px; op.ty = visualSurfaceY; 
                op.ttype = obstacleType;
            }

            const hazard = engine.map.getHazardAt(q, r, engine);
            if (hazard) {
                const hOp = renderList.next();
                hOp.type = RenderOpType.HAZARD;
                hOp.tq = q; hOp.tr = r; hOp.th = h;
                hOp.tx = px; hOp.ty = visualSurfaceY; 
                hOp.oHazard = hazard;
                hOp.time = globalTime;
            }

            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.tq = q; op.tr = r; op.th = h;
            op.tx = px; op.ty = visualBaseY; 
            op.tsize = HEX_SIZE; op.ttheme = theme; op.ttype = scene.textureType; op.tdetail = theme.detail;
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = engine.zones.getZoneAt(q, r); 
            op.oRange = this.checkIsRange(q, r, h, hoveredSkill, highlightAgent, engine);
            op.oRangeCol = hoveredSkill?.color || '';
            op.oHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            op.oWarning = engine.zones.warningTiles.has(key);
            op.oHasUnit = !engine.isRunning && this._unitPresence.has(key);
            op.time = globalTime;
        }

        // Render collapsing tiles
        for (const [key, tile] of engine.zones.collapsingTiles.entries()) {
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
            op.tx = pos.x; op.ty = visualBaseY; 
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