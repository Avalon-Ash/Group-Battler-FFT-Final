
import { GameEngine, Agent } from "../../game";
import { GridCache } from "./GridCache"; 
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE } from "../../../constants";
import { HexUtils, getTransitionOffset } from "../../utils";
import { HexMath } from "../../math/HexMath";

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 0; 
const PROJ_LIGHT_RADIUS_SQ = 1600;

export class GridRenderStrategy {
    
    private _unitVisualStatus = new Map<string, string>();
    private _unitPresence = new Set<string>();

    public submit(
        cache: GridCache, // Kept for interface compatibility but we bypass the list
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
        // Cull global transition
        if (transitionPhase === 'OUT' && transitionT > 0.95) return;

        const scene = engine.currentScene;
        const theme = TERRAIN_THEMES[scene.textureType] || TERRAIN_THEMES['VOID'];

        // 1. Pre-calc Unit Status (Optimized Lookup)
        this._unitVisualStatus.clear();
        this._unitPresence.clear();
        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = HexUtils.key(a);
                this._unitVisualStatus.set(key, a.visualStatus);
                this._unitPresence.add(key);
            }
        }

        // 2. ITERATE MAP KEYS DIRECTLY (Source of Truth)
        // Convert Set iterator to array for loop
        const mapKeys = Array.from(engine.map.mapKeys);
        
        for (const key of mapKeys) {
            const [q, r] = key.split(',').map(Number);
            
            // MATH: Single source of truth for Position
            const pos = HexMath.hexToPixel(q, r, engine.mapConfig.offsetX, engine.mapConfig.offsetY);
            const px = pos.x;
            const py = pos.y;
            const h = engine.map.getTerrainHeight(q, r);

            // Transition Offset (Visual Only)
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 1200) continue; // Cull far off-screen

            // SORT KEY: Use the Base Y (py) + Offset
            // This ensures objects on the same "row" sort correctly regardless of height.
            // Objects "behind" (smaller Y) draw first.
            const sortY = py + offset;

            // A. Obstacles
            // Obstacles sit ON TOP of the terrain block.
            // Visual Y = BaseY - Height - ObstacleAnchor
            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.y = sortY; // Sorts with the tile
                op.z = OBSTACLE_Z_INDEX; 
                op.tx = px; 
                op.ty = py + offset - h; // Anchor to top of block
                op.ttype = obstacleType;
            }

            // B. Terrain Block
            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.y = sortY; 
            op.z = 0; // Base layer
            
            op.tx = px;
            op.ty = sortY; // The base of the column
            op.th = h;     // The height to extrude up
            
            op.tsize = HEX_SIZE;
            op.ttheme = theme;
            op.ttype = scene.textureType;
            op.tdetail = theme.detail;
            op.tq = q; op.tr = r;

            // C. Overlays (Zones, Hazards)
            // Passed as data, renderer handles drawing them on the Top Face
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = engine.zones.getZoneAt(q, r);
            op.oHazard = engine.hazards.getHazardAt(q, r);
            op.oHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            op.oHasUnit = this._unitPresence.has(key);

            // D. Lighting / Range (Logic)
            let lightColor = null;
            let lightIntensity = 0;
            for (const p of projectiles) {
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    lightIntensity += (1 - Math.sqrt(distSq) / 40);
                }
            }
            op.oLightCol = lightColor;
            op.oLightInt = Math.min(1, lightIntensity);

            // Interactive Range
            if (hoveredSkill && highlightAgent) {
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const deltaH = agentH - h;
                const bonus = Math.max(0, Math.floor(deltaH / 24)); 
                const dist = HexMath.distance({q, r}, {q: highlightAgent.q, r: highlightAgent.r});
                
                if (dist <= hoveredSkill.range + bonus) { 
                    op.oRange = true; 
                    op.oRangeCol = hoveredSkill.color; 
                }
            }
            
            op.time = globalTime;
        }
    }
}
