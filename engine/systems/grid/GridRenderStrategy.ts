
import { GameEngine, Agent } from "../../game";
import { GridCache } from "./GridCache";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE } from "../../../constants";
import { HexUtils, getTransitionOffset } from "../../utils";
import { HexMath } from "../../math/HexMath";

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 95; 
const PROJ_LIGHT_RADIUS_SQ = 1600;

export class GridRenderStrategy {
    
    // Transient Sets for faster lookup during render loop
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
        // Cull if map is effectively gone
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        cache.ensure(engine);
        const scene = engine.currentScene;
        const theme = TERRAIN_THEMES[scene.textureType] || TERRAIN_THEMES['VOID'];

        // 1. Pre-calc Unit Presence
        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') this._unitVisualStatus.set(key, a.visualStatus);
            }
        }

        // 2. Iterate Tiles
        const len = cache.tileList.length;
        for (let i = 0; i < len; i++) {
            const tile = cache.tileList[i];
            const { q, r, px, py, h, key } = tile;
            
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            // Visual Ground Top Y = (BaseY - Height + Transition)
            const visualTopY = py - h + offset;
            const visualBaseY = py + offset;

            // Cull off-screen transition elements
            if (Math.abs(offset) > 800) continue;

            const sortY = py; // Stable sort key based on logic ground position

            // A. Obstacles
            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.y = sortY; 
                op.z = OBSTACLE_Z_INDEX;
                op.tx = px; 
                // Obstacles anchor to the visual top of the block
                op.ty = visualTopY - OBSTACLE_ANCHOR_Y; 
                op.ttype = obstacleType;
            }

            // B. Zones (Delegated to ZoneSystem)
            let zoneInfo = undefined;
            const zResult = engine.zones.getZoneAt(q, r);
            if (zResult) {
                const { zone, dist } = zResult;
                zoneInfo = { 
                    type: zone.type, 
                    color: zone.color, 
                    visual: zone.visual, 
                    progress: zone.progress, 
                    centerQ: zone.q, centerR: zone.r, 
                    radius: zone.radius, dist 
                };
            }

            // C. Interactive Highlights
            let isRange = false;
            let rangeColor = '';
            // Only show range if hovering a skill OR holding a skill hotkey (future)
            // Currently logic depends on hoveredSkill from UI
            if (hoveredSkill && highlightAgent) {
                // Check Range Logic
                // Note: TargetingSystem.getEffectiveRange logic duplicated here slightly for speed?
                // Better to use engine.movement.getEffectiveRange if accessible, but we are inside renderer.
                // Re-implement simple height check:
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const deltaH = agentH - h;
                // Height bonus logic must match TargetingSystem
                const bonus = Math.max(0, Math.floor(deltaH / 24)); // 24 = BLOCK_HEIGHT
                const dist = HexMath.distance({q, r}, {q: highlightAgent.q, r: highlightAgent.r});
                
                if (dist <= hoveredSkill.range + bonus) { 
                    isRange = true; 
                    rangeColor = hoveredSkill.color; 
                }
            }
            
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            const hasUnit = !engine.isRunning && this._unitPresence.has(key);
            const hazard = engine.hazards.getHazardAt(q, r);

            // D. Projectile Lights (Dynamic Lighting)
            let lightColor = null;
            let lightIntensity = 0;
            for (const p of projectiles) {
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    // Simple linear falloff
                    lightIntensity += (1 - Math.sqrt(distSq) / 40);
                }
            }

            // E. Create Terrain Op
            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.y = sortY; 
            op.z = 0; // Terrain is layer 0
            
            op.tx = px; 
            // Important: We pass the Visual Base Y. The renderer will draw up to -h.
            op.ty = visualBaseY; 
            op.th = h;
            
            op.tsize = HEX_SIZE;
            op.ttheme = theme;
            op.ttype = scene.textureType;
            op.tdetail = theme.detail;
            op.tq = q; op.tr = r;
            
            // Overlays
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = zoneInfo; 
            op.oHazard = hazard;
            op.oLightCol = lightColor; op.oLightInt = Math.min(1, lightIntensity);
            op.oRange = isRange; op.oRangeCol = rangeColor;
            op.oHover = isHover; op.oHasUnit = hasUnit;
            op.time = globalTime;
        }
    }
}
