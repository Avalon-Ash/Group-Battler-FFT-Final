
import { HEX_SIZE, BLOCK_HEIGHT, TERRAIN_THEMES } from "../../constants";
import { GameEngine, Agent } from "../game";
import { HexUtils } from "../utils";
import { Hex, Skill, Projectile } from "../../types";

// Renderers
import { TerrainRenderer } from "../renderers/grid/TerrainRenderer";
import { GridOverlays } from "../renderers/grid/GridOverlays";

export interface RenderableItem {
    y: number;
    z: number;
    draw: (ctx: CanvasRenderingContext2D) => void;
}

interface CachedTile {
    q: number;
    r: number;
    px: number;
    py: number;
    h: number;
}

export class GridSystem {
    // Optimization: Cache tiles to avoid re-parsing keys and re-calculating positions every frame
    private _tileCache: CachedTile[] = [];
    private _lastMapVersion: number = -1;

    // Optimization: Reuseable buffers to reduce GC pressure
    // Updated: Include 'state' in the value ('ACTIVE' | 'BROKEN')
    private _dangerZones = new Map<string, {color: string, progress: number, visual: string, state: 'ACTIVE' | 'BROKEN', fadeRatio: number}>();
    private _unitPresence = new Set<string>();
    private _unitVisualStatus = new Map<string, string>();

    // Passthrough
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

    getHexAtScreenPoint(mx: number, my: number, camera: {x: number, y: number, zoom: number}, engine: GameEngine): Hex | null {
        this.ensureCache(engine);
        
        // Convert screen mouse to world coordinates (unzoomed)
        const wx = mx / camera.zoom + camera.x;
        const wy = my / camera.zoom + camera.y;

        const candidates: CachedTile[] = [];
        const limit = HEX_SIZE * 2; 
        
        for (const tile of this._tileCache) {
            const dist = Math.abs(wx - tile.px) + Math.abs(wy - (tile.py - tile.h));
            if (dist < limit) { 
                candidates.push(tile);
            }
        }

        // Sort by visual depth (Front to Back)
        candidates.sort((a, b) => b.py - a.py);

        for (const cand of candidates) {
            const testHex = HexUtils.fromPx(wx, wy + cand.h, engine.mapConfig);
            const rounded = HexUtils.round(testHex.q, testHex.r);
            if (rounded.q === cand.q && rounded.r === cand.r) {
                return { q: cand.q, r: cand.r };
            }
        }

        return null;
    }

    /**
     * Identifies agents that are visually blocked by taller terrain in front of them.
     */
    getOccludedAgents(engine: GameEngine): Agent[] {
        const occluded: Agent[] = [];
        
        engine.agents.forEach(a => {
            if (a.hp <= 0 && a.fullyDead) return;

            const uPx = HexUtils.toPx(a.q, a.r, engine.mapConfig);
            const uHeight = engine.map.getTerrainHeight(a.q, a.r);

            // In Diamond Isometric, "Front" means Higher Y on screen.
            // Blocks with higher Y and higher Z can occlude units with lower Y.
            const neighbors = HexUtils.neighbors({q: a.q, r: a.r});
            let isBlocked = false;

            for (const n of neighbors) {
                const k = HexUtils.key(n);
                if (engine.mapKeys.has(k)) {
                    const nPx = HexUtils.toPx(n.q, n.r, engine.mapConfig);
                    
                    // Check if neighbor is physically "in front" (Screen Y is larger)
                    if (nPx.y > uPx.y) {
                         const nHeight = engine.map.getTerrainHeight(n.q, n.r);
                         // If the blocking tile is strictly taller
                         if (nHeight > uHeight) {
                             isBlocked = true;
                             break;
                         }
                    }
                }
            }

            if (isBlocked) {
                occluded.push(a);
            }
        });

        return occluded;
    }

    collectRenderables(
        engine: GameEngine, 
        hoveredHex: Hex | null, 
        hoveredSkill: Skill | null, 
        highlightAgent: Agent | null, 
        flashes: any[],
        projectiles: Projectile[],
        transitionT: number,      
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        globalTime: number
    ): RenderableItem[] {
        this.ensureCache(engine);
        
        const list: RenderableItem[] = [];
        const scene = engine.currentScene;
        const theme = TERRAIN_THEMES[scene.textureType] || TERRAIN_THEMES['VOID'];

        // Clear and Reuse Buffers
        this._dangerZones.clear();
        this._unitPresence.clear();
        this._unitVisualStatus.clear();

        engine.agents.forEach(a => {
            // 1. ACTIVE CASTS (Only if not suppressed)
            if (a.hp > 0 && a.stunTimer <= 0 && a.silenceTimer <= 0 && !a.banished && a.castingSkillIdx !== -1) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.type === 'AOE') {
                    let centerHex: Hex | null = null;
                    if (a.targetHex) centerHex = a.targetHex;
                    else if (a.target) centerHex = {q: a.target.q, r: a.target.r};
                    else centerHex = {q: a.q, r: a.r};

                    if (centerHex) {
                        const progress = 1 - (a.castTimer / s.cast);
                        // DYNAMIC EXPANSION:
                        const currentRadius = Math.max(0.5, (s.aoeRadius || 1) * progress);
                        const potentialHexes = HexUtils.range(centerHex, s.aoeRadius || 1);
                        
                        potentialHexes.forEach(h => {
                            if (HexUtils.dist(centerHex!, h) <= currentRadius) {
                                this._dangerZones.set(`${h.q},${h.r}`, {
                                    color: s.color, 
                                    progress: progress,
                                    visual: s.visual || 'BOLT',
                                    state: 'ACTIVE',
                                    fadeRatio: 1.0
                                });
                            }
                        });
                    }
                }
            }
            
            if(a.hp > 0) {
                const key = `${a.q},${a.r}`;
                this._unitPresence.add(key);
                if (a.visualStatus !== 'NONE') {
                    this._unitVisualStatus.set(key, a.visualStatus);
                }
            }
        });

        const centerQ = Math.floor(engine.mapConfig.w / 2);
        const centerR = Math.floor(engine.mapConfig.h / 2);
        const maxDist = Math.max(engine.mapConfig.w, engine.mapConfig.h) / 2;

        for (const tile of this._tileCache) {
            const { q, r, px, py, h } = tile;
            
            // --- TRANSITION LOGIC ---
            let visualY = py;
            if (transitionPhase !== 'IDLE') {
                const dist = Math.sqrt((q - centerQ)**2 + (r - centerR)**2);
                const d = dist / maxDist; 
                
                if (transitionPhase === 'OUT') {
                    const trigger = d * 0.3;
                    if (transitionT > trigger) {
                        const fallT = Math.min(1, (transitionT - trigger) * 2.5);
                        const easedFall = fallT * fallT * fallT;
                        visualY += easedFall * 1000;
                    }
                } else if (transitionPhase === 'IN') {
                    const trigger = d * 0.3;
                    const riseT = Math.max(0, Math.min(1, (transitionT - trigger) * 2.5));
                    const easedRise = 1 - Math.pow(1 - riseT, 3);
                    visualY += (1 - easedRise) * 1000;
                }
            }

            if (visualY > py + 800) continue;

            const flash = flashes.find(f => f.q === q && f.r === r);
            let isRange = false;
            let rangeColor = '';
            
            if (hoveredSkill && highlightAgent) {
                const agentH = engine.map.getTerrainHeight(highlightAgent.q, highlightAgent.r);
                const tileH = h;
                const bonus = Math.max(0, Math.floor((agentH - tileH) / BLOCK_HEIGHT));
                const effRange = hoveredSkill.range + bonus;

                if (HexUtils.dist({q, r}, highlightAgent) <= effRange) {
                    isRange = true; 
                    rangeColor = hoveredSkill.color;
                }
            }
            
            const isHover = hoveredHex ? (hoveredHex.q === q && hoveredHex.r === r) : false;
            
            const k = `${q},${r}`;
            const dangerInfo = this._dangerZones.get(k);
            const hasUnit = this._unitPresence.has(k);
            const specialStatus = this._unitVisualStatus.get(k);

            let lightColor = null;
            let lightIntensity = 0;
            const PROJ_LIGHT_RADIUS = 40; 
            const PROJ_LIGHT_RADIUS_SQ = PROJ_LIGHT_RADIUS * PROJ_LIGHT_RADIUS;
            
            for (const p of projectiles) {
                const distSq = (p.x - px)**2 + (p.y - py)**2;
                if (distSq < PROJ_LIGHT_RADIUS_SQ) {
                    lightColor = p.skill.color;
                    lightIntensity += (1 - Math.sqrt(distSq) / PROJ_LIGHT_RADIUS);
                }
            }

            list.push({
                y: visualY, 
                z: 0,        
                draw: (ctx) => {
                    // 1. Draw Physical Block
                    TerrainRenderer.drawBlockGeometry(ctx, px, visualY, HEX_SIZE, h, theme);
                    
                    // 2. Draw Texture Detail
                    TerrainRenderer.drawTerrainDetail(ctx, px, visualY - h, q, r, scene.textureType, theme.detail);

                    // 3. Draw Overlays (Status, Range, Danger, Lighting)
                    GridOverlays.drawOverlays(
                        ctx, px, visualY - h, HEX_SIZE,
                        specialStatus, dangerInfo,
                        lightColor, Math.min(1, lightIntensity),
                        flash, isRange, rangeColor, isHover, hasUnit,
                        q, r, globalTime
                    );
                }
            });
        }

        return list;
    }
}
