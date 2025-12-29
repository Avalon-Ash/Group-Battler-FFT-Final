
import { GameEngine, Agent } from "../../game";
import { GridCache } from "./GridCache";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE } from "../../../constants";
import { HexUtils, getTransitionOffset } from "../../utils";

const OBSTACLE_Z_INDEX = 10;
const PROJ_LIGHT_RADIUS_SQ = 1600;

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

        const len = cache.tileList.length;
        for (let i = 0; i < len; i++) {
            const tile = cache.tileList[i];
            const { q, r, px, py, h, key } = tile;
            
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            const visualBaseY = py + offset;
            const visualSurfaceY = visualBaseY - h;

            if (Math.abs(offset) > 800) continue;

            // 1. 提交障礙物 (繼承 tile 座標供排序)
            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.tq = q; op.tr = r; // 核心：傳入邏輯座標
                op.th = h; 
                op.tx = px; 
                op.ty = visualSurfaceY; 
                op.ttype = obstacleType;
            }

            // 2. 提交地面效果
            const hazard = engine.map.getHazardAt(q, r, engine);
            if (hazard) {
                const hOp = renderList.next();
                hOp.type = RenderOpType.HAZARD;
                hOp.tq = q; hOp.tr = r;
                hOp.th = h;
                hOp.tx = px; 
                hOp.ty = visualSurfaceY; 
                hOp.oHazard = hazard;
                hOp.time = globalTime;
            }

            // 3. 提交地形
            const zoneInfo = engine.zones.getZoneAt(q, r);
            let isRange = false;
            let rangeColor = '';
            if (hoveredSkill && highlightAgent) {
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const deltaH = agentH - h;
                const bonus = Math.max(0, Math.floor(deltaH / 24)); 
                const dist = HexUtils.dist({q, r}, {q: highlightAgent.q, r: highlightAgent.r});
                if (dist <= hoveredSkill.range + bonus) { isRange = true; rangeColor = hoveredSkill.color; }
            }
            
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            const hasUnit = !engine.isRunning && this._unitPresence.has(key);

            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.tq = q; op.tr = r; // 核心：傳入邏輯座標
            op.tx = px; 
            op.ty = visualBaseY; 
            op.th = h;
            op.tsize = HEX_SIZE;
            op.ttheme = theme;
            op.ttype = scene.textureType;
            op.tdetail = theme.detail;
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = zoneInfo; 
            op.oRange = isRange; op.oRangeCol = rangeColor;
            op.oHover = isHover; op.oHasUnit = hasUnit;
            op.time = globalTime;
        }
    }
}
