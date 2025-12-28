
import { HEX_SIZE, BLOCK_HEIGHT, TERRAIN_THEMES, ISO_SCALE_Y } from "../../constants";
import { GameEngine, Agent } from "../game";
import { HexUtils, getTransitionOffset } from "../utils";
import { HexMath } from "../math/HexMath";
import { Hex, Skill, Projectile, Team } from "../../types";
import { RenderList, RenderOpType } from "../renderers/RenderList";

interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
    key: string;
}

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 95; 

export class GridSystem {
    private _tileMap: Map<string, CachedTile> = new Map();
    private _tileList: CachedTile[] = []; 
    private _lastMapVersion: number = -1;
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();

    public reset() {
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

    public getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine): Hex | null {
        this.ensureCache(engine);
        const maxHeight = 200; 
        const step = BLOCK_HEIGHT;
        let bestHex: Hex | null = null;

        for (let h = 0; h <= maxHeight; h += step) {
            const testY = wy + h; 
            const frac = HexMath.pixelToHex(wx, testY, engine.mapConfig.offsetX, engine.mapConfig.offsetY);
            const rounded = HexMath.cubeToAxial(HexMath.cubeRound(HexMath.axialToCube(frac)));
            
            const key = HexUtils.key(rounded);
            const tile = this._tileMap.get(key);
            
            if (tile) {
                const tileVisualY = tile.py - tile.h;
                const dx = Math.abs(wx - tile.px);
                const dy = Math.abs(wy - tileVisualY);
                
                if (dx < HEX_SIZE * 0.9 && dy < HEX_SIZE * 0.6) {
                    if (tile.h >= h - step && tile.h <= h + step) {
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

        // Update Unit Presence map for overlays
        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        for (const a of engine.agents) {
            if (a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') this._unitVisualStatus.set(key, a.visualStatus);
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

            const sortY = py; 

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

            // Zones (Delegated to ZoneSystem)
            let zoneInfo = undefined;
            const zResult = engine.zones.getZoneAt(q, r);
            if (zResult) {
                const { zone, dist } = zResult;
                zoneInfo = { 
                    type: zone.type, 
                    color: zone.color, 
                    visual: zone.visual, 
                    progress: zone.progress, 
                    centerQ: zone.q, 
                    centerR: zone.r, 
                    radius: zone.radius, 
                    dist 
                };
            }

            // Interactive Highlights
            let isRange = false;
            let rangeColor = '';
            if (hoveredSkill && highlightAgent) {
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

            // Projectile Lights
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
