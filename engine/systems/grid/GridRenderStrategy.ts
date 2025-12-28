
import { GameEngine, Agent } from "../../game";
import { GridCache } from "./GridCache";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { Hex, Skill, Projectile } from "../../../types";
import { TERRAIN_THEMES, HEX_SIZE } from "../../../constants";
import { HexUtils, getTransitionOffset } from "../../utils";
import { HexMath } from "../../math/HexMath";

const OBSTACLE_Z_INDEX = 10;
const PROJ_LIGHT_RADIUS_SQ = 1600;

export class GridRenderStrategy {
    
    // Transient Sets for faster lookup
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
            
            // Visual Transition Offset
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 800) continue;

            // --- STRICT COORDINATE DEFINITION ---
            // Base Y: The bottom of the terrain column (Ground Level 0).
            // Surface Y: The top of the terrain block (Where units stand).
            // 
            // Screen Y = IsometricY - Z_Height
            
            const visualBaseY = py + offset;        // Screen Y of the bottom
            const visualSurfaceY = visualBaseY - h; // Screen Y of the top surface

            const sortY = visualBaseY; // Sort by base position for correct occlusion

            // A. Obstacles (Sit on SURFACE)
            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.y = sortY; 
                op.z = OBSTACLE_Z_INDEX;
                op.tx = px; 
                op.ty = visualSurfaceY; // Anchor to top
                op.ttype = obstacleType;
            }

            // B. Terrain Block
            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.y = sortY; 
            op.z = 0; 
            
            op.tx = px; 
            op.ty = visualBaseY; // Base of column
            op.th = h;           // Height to extrude UP from base
            
            op.tsize = HEX_SIZE;
            op.ttheme = theme;
            op.ttype = scene.textureType;
            op.tdetail = theme.detail;
            op.tq = q; op.tr = r;
            
            // Overlays (Drawn on SURFACE)
            // The renderer uses op.ty - op.th to find the top surface.
            op.oStatus = this._unitVisualStatus.get(key);
            op.oDanger = engine.zones.getZoneAt(q, r);
            op.oHazard = engine.hazards.getHazardAt(q, r);
            
            // D. Interactive & Lighting
            let lightColor = null;
            let lightIntensity = 0;
            for (const p of projectiles) {
                // Projectiles emit light relative to their ground position proximity
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    lightIntensity += (1 - Math.sqrt(distSq) / 40);
                }
            }
            op.oLightCol = lightColor;
            op.oLightInt = Math.min(1, lightIntensity);

            // Range Highlight
            let isRange = false;
            let rangeColor = '';
            if (hoveredSkill && highlightAgent) {
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const deltaH = agentH - h;
                const bonus = Math.max(0, Math.floor(deltaH / 24)); 
                const dist = HexMath.distance({q, r}, {q: highlightAgent.q, r: highlightAgent.r});
                
                if (dist <= hoveredSkill.range + bonus) { 
                    isRange = true; 
                    rangeColor = hoveredSkill.color; 
                }
            }
            
            op.oRange = isRange; op.oRangeCol = rangeColor;
            op.oHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            op.oHasUnit = !engine.isRunning && this._unitPresence.has(key);
            op.time = globalTime;
        }
    }
}
