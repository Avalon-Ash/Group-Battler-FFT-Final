
import { HEX_SIZE, BLOCK_HEIGHT, TERRAIN_THEMES, ISO_SCALE_Y } from "../../constants";
import { GameEngine, Agent } from "../game";
import { HexUtils, getTransitionOffset } from "../utils";
import { HexMath } from "../math/HexMath";
import { Hex, Skill, Projectile } from "../../types";
import { RenderList, RenderOpType } from "../renderers/RenderList";

interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
    key: string;
}

interface ZoneSource {
    type: 'CAST';
    q: number;
    r: number;
    radius: number;
    radiusSq: number;
    color: string;
    visual: string;
    progress: number;
}

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 95; 

export class GridSystem {
    // Spatial Hash Map for O(1) lookup by key
    private _tileMap: Map<string, CachedTile> = new Map();
    private _tileList: CachedTile[] = []; // Keep list for iteration
    private _lastMapVersion: number = -1;
    private _activeZones: ZoneSource[] = [];
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();

    public reset() {
        this._activeZones.length = 0;
        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        this._lastMapVersion = -1; 
    }

    getTerrainHeight(q: number, r: number, engine?: GameEngine): number {
        if(engine) return engine.map.getTerrainHeight(q, r);
        return 0; 
    }

    private ensureCache(engine: GameEngine) {
        if (this._lastMapVersion !== engine.mapVersion || this._tileList.length === 0) {
            this.rebuildTileCache(engine);
        }
    }

    private rebuildTileCache(engine: GameEngine) {
        this._tileList = [];
        this._tileMap.clear();
        this._lastMapVersion = engine.mapVersion;
        
        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            const tile = { q, r, px: pos.x, py: pos.y, h, key: k };
            this._tileList.push(tile);
            this._tileMap.set(k, tile);
        });
    }

    /**
     * Optimized Raycast for picking tiles.
     * Uses mathematical projection to guess the coordinate, then scans a small vertical range 
     * to account for terrain height (Z-axis).
     * O(1) complexity relative to map size.
     */
    getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine): Hex | null {
        this.ensureCache(engine);

        // 1. Project assuming Height = 0 (Base plane)
        // Note: wy passed here acts as the visual Y on screen relative to world origin
        // Visual Y = (Grid Y * Iso) - Height
        
        // We test a range of possible heights.
        // Assuming max terrain height is around 6 tiers * 24px = 144px.
        const maxHeight = 200; 
        const step = BLOCK_HEIGHT;
        
        // We iterate "up" the visual column.
        // A click at (wx, wy) could be a tile at height 0, or a tile "below" it visually (higher y in 2D) at height H
        
        let bestHex: Hex | null = null;
        let minDepth = Infinity; // Depth here refers to visual sorting order

        // Heuristic: Project assuming average height, then search neighborhood?
        // Better: Project assuming ground, then check valid tiles in the vertical column.
        
        // The mathematical projection from Screen to Hex (ignoring height)
        const baseHexFrac = HexMath.pixelToHex(wx, wy, engine.mapConfig.offsetX, engine.mapConfig.offsetY);
        const baseHex = HexMath.cubeToAxial(HexMath.cubeRound(HexMath.axialToCube(baseHexFrac)));

        // Because height offsets Y upwards (negative Y visually), 
        // a tile with height H would visually appear at y_vis = y_iso - H.
        // So if we clicked at y_click, and the tile has height H, 
        // the true iso-y should have been y_click + H.
        
        // Search candidates:
        // We construct a "Ray" in 3D Hex space.
        // Since H only affects Y, we just need to check:
        // projected_hex(wx, wy + possible_H)
        
        for (let h = 0; h <= maxHeight; h += step) {
            // Re-project with height compensation
            const testY = wy + h; 
            const frac = HexMath.pixelToHex(wx, testY, engine.mapConfig.offsetX, engine.mapConfig.offsetY);
            const rounded = HexMath.cubeToAxial(HexMath.cubeRound(HexMath.axialToCube(frac)));
            
            const key = HexUtils.key(rounded);
            const tile = this._tileMap.get(key);
            
            if (tile) {
                // Precision check
                // Does this tile's actual height match the height we probed?
                // Or rather, is the click *on* the hexagon face at this height?
                
                // Visual top of this tile
                const tileVisualY = tile.py - tile.h;
                
                // Distance from click center to tile center (in screen space)
                // Use Manhattan distance for rough box or Euclidean for circle
                const dx = Math.abs(wx - tile.px);
                const dy = Math.abs(wy - tileVisualY);
                
                // Hex radius approx 36. 
                if (dx < HEX_SIZE * 0.9 && dy < HEX_SIZE * 0.6) {
                    // Found a candidate.
                    // Since we iterate h from 0 upwards, we are checking "lower" visual points first?
                    // No, wy + h means we are checking assuming the ground was lower relative to click.
                    // Painters algorithm: Higher H (closer to camera) should block lower H.
                    
                    // Prioritize highest height (visually closest)
                    if (tile.h >= h - step && tile.h <= h + step) {
                         // Simple overlapping logic: Store candidate, if we find a "higher" one that is also valid, take it.
                         if (!bestHex || tile.h > (this._tileMap.get(HexUtils.key(bestHex))?.h || -999)) {
                             bestHex = rounded;
                         }
                    }
                }
            }
        }

        return bestHex;
    }

    getOccludedAgents(engine: GameEngine): Agent[] {
        const occluded: Agent[] = [];
        engine.agents.forEach(a => {
            if (a.hp <= 0 && a.fullyDead) return;
            const uPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const uHeight = engine.map.getTerrainHeight(a.q, a.r);
            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            for (const n of neighbors) {
                const k = HexUtils.key(n);
                if (engine.mapKeys.has(k)) {
                    const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                    if (nPx.y > uPx.y) {
                         if (engine.map.getTerrainHeight(n.q, n.r) > uHeight) {
                             occluded.push(a);
                             break;
                         }
                    }
                }
            }
        });
        return occluded;
    }

    submitRenderables(
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
        this.ensureCache(engine);
        const scene = engine.currentScene;
        const theme = TERRAIN_THEMES[scene.textureType] || TERRAIN_THEMES['VOID'];

        this._activeZones.length = 0;
        this._unitPresence.clear();
        this._unitVisualStatus.clear();

        // 1. Pre-process Unit Zones
        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') this._unitVisualStatus.set(key, a.visualStatus);
                if (a.stunTimer <= 0 && a.silenceTimer <= 0 && !a.banished && a.castingSkillIdx !== -1) {
                    const s = a.skills[a.castingSkillIdx];
                    if (s && s.type === 'AOE') {
                        let tq = a.q, tr = a.r;
                        if (a.targetHex) { tq = a.targetHex.q; tr = a.targetHex.r; }
                        else if (a.target) { tq = a.target.q; tr = a.target.r; }
                        const progress = 1 - (a.castTimer / s.cast);
                        const radius = (s.aoeRadius || 1);
                        this._activeZones.push({ type: 'CAST', q: tq, r: tr, radius, radiusSq: radius + 0.5, color: s.color, visual: s.visual || 'BOLT', progress });
                    }
                }
            }
        }

        const PROJ_LIGHT_RADIUS_SQ = 1600; 

        // 2. Iterate Tiles
        for (let i = 0; i < this._tileList.length; i++) {
            const tile = this._tileList[i];
            const { q, r, px, py, h, key } = tile;
            
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            const visualY = py + offset;

            if (offset > 800) continue;

            const sortY = py; // Stable sort key based on ground position

            // Obstacles
            const obstacleType = engine.obstacles.get(key);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.y = sortY; 
                op.z = OBSTACLE_Z_INDEX;
                op.tx = px; 
                op.ty = visualY - h - OBSTACLE_ANCHOR_Y; 
                op.ttype = obstacleType;
            }

            // Zones (Cast Preview) - Math Optimized
            let zoneInfo = undefined;
            // Only check zones if tile is reasonably close? 
            // For now, iterate active zones (usually < 10)
            for (const zone of this._activeZones) {
                const dist = HexMath.distance({q, r}, {q: zone.q, r: zone.r});
                if (dist <= zone.radius) {
                    zoneInfo = { type: zone.type, color: zone.color, visual: zone.visual, progress: zone.progress, centerQ: zone.q, centerR: zone.r, radius: zone.radius, dist };
                }
            }

            // Interactive Highlights
            let isRange = false;
            let rangeColor = '';
            if (hoveredSkill && highlightAgent) {
                // Height-Aware Range check
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const bonus = Math.max(0, Math.floor((agentH - h) / BLOCK_HEIGHT));
                const dist = HexMath.distance({q, r}, {q: highlightAgent.q, r: highlightAgent.r});
                
                if (dist <= hoveredSkill.range + bonus) { 
                    isRange = true; 
                    rangeColor = hoveredSkill.color; 
                }
            }
            
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            const hasUnit = !engine.isRunning && this._unitPresence.has(key);
            const hazard = engine.map.getHazardAt(q, r);

            // Projectile Lights (Distance Squared check is fast)
            let lightColor = null;
            let lightIntensity = 0;
            for (const p of projectiles) {
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    lightIntensity += (1 - Math.sqrt(distSq) / 40);
                }
            }

            // Create Render Op
            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.y = sortY; 
            op.z = 0;
            op.tx = px; 
            op.ty = visualY; 
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
