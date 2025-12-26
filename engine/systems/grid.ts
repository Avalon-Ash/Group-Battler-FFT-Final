
import { HEX_SIZE, BLOCK_HEIGHT, TERRAIN_THEMES } from "../../constants";
import { GameEngine, Agent } from "../game";
import { HexUtils, getTransitionOffset } from "../utils";
import { Hex, Skill, Projectile } from "../../types";
import { RenderList, RenderOpType } from "../renderers/RenderList";
import { SurfaceAssets } from "../graphics/SurfaceAssets";

interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
}

// Lightweight struct to track Zones (Both Instant Casts & Persistent Fields)
interface ZoneSource {
    type: 'CAST' | 'FIELD';
    q: number;
    r: number;
    radius: number; // Hex radius
    radiusSq: number; // For fast distance check (cached)
    color: string;
    visual: string;
    progress: number; // 0-1 for CAST, 1.0 for FIELD
}

const OBSTACLE_Z_INDEX = 10;
const OBSTACLE_ANCHOR_Y = 95; 

export class GridSystem {
    // Cache
    private _tileCache: CachedTile[] = [];
    private _lastMapVersion: number = -1;

    // Optimization: Reuse buffers
    private _activeZones: ZoneSource[] = [];
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();

    public reset() {
        this._activeZones.length = 0;
        this._unitPresence.clear();
        this._unitVisualStatus.clear();
        // Force tile cache rebuild on next frame just in case
        this._lastMapVersion = -1; 
    }

    getTerrainHeight(q: number, r: number, engine?: GameEngine): number {
        if(engine) return engine.map.getTerrainHeight(q, r);
        return 0; 
    }

    private ensureCache(engine: GameEngine) {
        if (this._lastMapVersion !== engine.mapVersion || this._tileCache.length === 0) {
            this.rebuildTileCache(engine);
        }
    }

    private rebuildTileCache(engine: GameEngine) {
        this._tileCache = [];
        this._lastMapVersion = engine.mapVersion;

        engine.mapKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            const pos = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            this._tileCache.push({ q, r, px: pos.x, py: pos.y, h });
        });
    }

    getHexAtWorldPoint(wx: number, wy: number, engine: GameEngine): Hex | null {
        this.ensureCache(engine);
        const limit = HEX_SIZE * 2; 
        
        // Find closest tile visual center
        let bestTile: CachedTile | null = null;
        let bestDist = Infinity;

        for (const tile of this._tileCache) {
            const visualY = tile.py - tile.h;
            const dist = Math.abs(wx - tile.px) + Math.abs(wy - visualY);
            if (dist < limit && dist < bestDist) { 
                bestDist = dist;
                bestTile = tile;
            }
        }

        if (bestTile) {
            const testHex = HexUtils.fromPx(wx, wy + bestTile.h, engine.mapConfig);
            const rounded = HexUtils.round(testHex.q, testHex.r);
            if (rounded.q === bestTile.q && rounded.r === bestTile.r) {
                return { q: bestTile.q, r: bestTile.r };
            }
        }
        return null;
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
                         const nHeight = engine.map.getTerrainHeight(n.q, n.r);
                         if (nHeight > uHeight) {
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

        // Reset buffers
        this._activeZones.length = 0;
        this._unitPresence.clear();
        this._unitVisualStatus.clear();

        // 1. COLLECT ZONES (Casting & Fields)
        
        // A. Casting Agents (Telegraphs)
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
                        
                        this._activeZones.push({
                            type: 'CAST',
                            q: tq, r: tr,
                            radius: radius,
                            radiusSq: radius + 0.5, 
                            color: s.color,
                            visual: s.visual || 'BOLT',
                            progress: progress
                        });
                    }
                }
            }
        }

        // B. Persistent Fields (Poison, Gravity, etc.)
        for (const f of engine.fields) {
            // Decoupled Visual Logic: Ask the Asset Library what this should look like
            const visual = SurfaceAssets.resolveFieldVisual(f.skill, f.visualType);
            
            this._activeZones.push({
                type: 'FIELD',
                q: f.q, r: f.r, 
                radius: f.radius,
                radiusSq: f.radius + 0.5,
                color: f.color,
                visual: visual,
                progress: 1.0 
            });
        }

        // 2. ITERATE TILES
        const PROJ_LIGHT_RADIUS_SQ = 1600; // 40^2

        for (const tile of this._tileCache) {
            const { q, r, px, py, h } = tile;
            
            const offset = getTransitionOffset(px, py, engine.mapConfig, transitionT, transitionPhase);
            const visualY = py + offset;

            if (visualY > py + 800) continue;

            const k = `${q},${r}`;
            
            // --- SUBMIT OBSTACLE ---
            const obstacleType = engine.obstacles.get(k);
            if (obstacleType) {
                const op = renderList.next();
                op.type = RenderOpType.OBSTACLE;
                op.y = visualY; 
                op.z = OBSTACLE_Z_INDEX;
                op.tx = px; 
                op.ty = visualY - h - OBSTACLE_ANCHOR_Y; 
                op.ttype = obstacleType;
            }

            // --- SUBMIT TERRAIN ---
            
            let zoneInfo = undefined;
            
            // Iterate zones to find overlap
            for (const zone of this._activeZones) {
                const dist = (Math.abs(q - zone.q) + Math.abs(q + r - zone.q - zone.r) + Math.abs(r - zone.r)) / 2;
                
                if (dist <= zone.radius) {
                    zoneInfo = {
                        type: zone.type,
                        color: zone.color,
                        visual: zone.visual,
                        progress: zone.progress,
                        centerQ: zone.q, 
                        centerR: zone.r, 
                        radius: zone.radius,
                        dist: dist 
                    };
                    if (zone.type === 'FIELD') break; 
                }
            }

            let isRange = false;
            let rangeColor = '';
            
            if (hoveredSkill && highlightAgent) {
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const bonus = Math.max(0, Math.floor((agentH - h) / BLOCK_HEIGHT));
                const effRange = hoveredSkill.range + bonus;
                const dist = (Math.abs(q - highlightAgent.q) + Math.abs(q + r - highlightAgent.q - highlightAgent.r) + Math.abs(r - highlightAgent.r)) / 2;

                if (dist <= effRange) {
                    isRange = true; 
                    rangeColor = hoveredSkill.color;
                }
            }
            
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            
            // UX UPDATE: Only show unit footprint indicators when NOT running (Planning phase)
            const hasUnit = !engine.isRunning && this._unitPresence.has(k);
            
            const specialStatus = this._unitVisualStatus.get(k);

            let lightColor = null;
            let lightIntensity = 0;
            
            for (const p of projectiles) {
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    lightIntensity += (1 - Math.sqrt(distSq) / 40);
                }
            }

            const op = renderList.next();
            op.type = RenderOpType.TERRAIN;
            op.y = visualY; 
            op.z = 0;
            
            op.tx = px; 
            op.ty = visualY; 
            op.th = h;
            op.tsize = HEX_SIZE;
            op.ttheme = theme;
            op.ttype = scene.textureType;
            op.tdetail = theme.detail;
            op.tq = q;
            op.tr = r;
            
            // Overlays
            op.oStatus = specialStatus;
            op.oDanger = zoneInfo; 
            op.oLightCol = lightColor;
            op.oLightInt = Math.min(1, lightIntensity);
            op.oRange = isRange;
            op.oRangeCol = rangeColor;
            op.oHover = isHover;
            op.oHasUnit = hasUnit;
            op.time = globalTime;
        }
    }
}
