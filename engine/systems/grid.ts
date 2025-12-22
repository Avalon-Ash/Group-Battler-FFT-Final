
import { HEX_SIZE, BLOCK_HEIGHT, TERRAIN_THEMES, MAX_TERRAIN_TIER } from "../../constants";
import { GameEngine, Agent } from "../game";
import { HexUtils, ISO_SCALE_Y } from "../utils";
import { AssetManager } from "../assets";
import { Hex, Skill, Projectile } from "../../types";

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

        const dangerZones = new Map<string, {color: string, progress: number}>();
        engine.agents.forEach(a => {
            if (a.hp > 0 && a.castingSkillIdx !== -1) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.type === 'AOE') {
                    let centerHex: Hex | null = null;
                    if (a.targetHex) centerHex = a.targetHex;
                    else if (a.target) centerHex = {q: a.target.q, r: a.target.r};
                    else centerHex = {q: a.q, r: a.r};

                    if (centerHex) {
                        const progress = 1 - (a.castTimer / s.cast);
                        HexUtils.range(centerHex, s.aoeRadius || 1).forEach(h => {
                            dangerZones.set(`${h.q},${h.r}`, {
                                color: s.color, 
                                progress: progress
                            });
                        });
                    }
                }
            }
        });

        const unitPresence = new Map<string, boolean>();
        const unitVisualStatus = new Map<string, string>(); 

        engine.agents.forEach(a => {
            if(a.hp > 0) {
                const key = `${a.q},${a.r}`;
                unitPresence.set(key, true);
                if (a.visualStatus !== 'NONE') {
                    unitVisualStatus.set(key, a.visualStatus);
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
                // HEIGHT AWARE RANGE CHECK
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
            const dangerInfo = dangerZones.get(k);
            const hasUnit = unitPresence.has(k);
            const specialStatus = unitVisualStatus.get(k);

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
                draw: (ctx) => this.drawIsoBlock(
                    ctx, 
                    px, visualY, 
                    HEX_SIZE, h, 
                    theme, 
                    flash, 
                    isRange, rangeColor, 
                    isHover, 
                    dangerInfo, 
                    hasUnit,
                    lightColor,
                    Math.min(1, lightIntensity),
                    q, r, scene.textureType,
                    specialStatus,
                    globalTime
                )
            });
        }

        return list;
    }

    private drawIsoBlock(
        ctx: CanvasRenderingContext2D, 
        x: number, y: number, 
        size: number, height: number, 
        theme: any, 
        flash: any, 
        isRange: boolean, rangeColor: string, 
        isHover: boolean, 
        dangerInfo: {color: string, progress: number} | undefined, 
        hasUnit: boolean,
        lightColor: string | null,
        lightIntensity: number,
        q: number = 0, r: number = 0, textureType: string = 'VOID',
        specialStatus: string | undefined,
        globalTime: number
    ) {
        // Use standard compressed hex factor
        const Y_SCALE = ISO_SCALE_Y; 
        
        const corners: {x: number, y: number}[] = [];
        const startAngle = Math.PI / 6; 
        
        for (let i = 0; i < 6; i++) {
            const angle = startAngle + i * Math.PI / 3;
            corners.push({ 
                x: x + size * Math.cos(angle), 
                y: y + size * Math.sin(angle) * Y_SCALE 
            });
        }
        
        // This is the TOP face Y level
        const topY = height; 

        const traceTopFace = () => {
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y - topY);
            for (let i = 1; i < 6; i++) {
                ctx.lineTo(corners[i].x, corners[i].y - topY);
            }
            ctx.closePath();
        };

        // --- 1. Draw Side Faces (The Stack) ---
        // We render sides that are facing the camera (bottom 3 faces for hex)
        // Indices 0, 1, 2 are usually the top-ish faces in this corner gen order.
        
        const visibleIndices = [0, 1, 2];

        for (const i of visibleIndices) {
            const j = (i + 1) % 6;
            
            const grad = ctx.createLinearGradient(0, y - topY, 0, y);
            // Alternate brightness for 3D effect
            const baseColor = (i === 1) ? theme.sideDark : theme.sideLight;
            grad.addColorStop(0, baseColor);
            grad.addColorStop(1, '#020617'); 

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(corners[i].x, corners[i].y); // Ground corner
            ctx.lineTo(corners[j].x, corners[j].y); // Ground next corner
            ctx.lineTo(corners[j].x, corners[j].y - topY); // Top next corner
            ctx.lineTo(corners[i].x, corners[i].y - topY); // Top corner
            ctx.closePath();
            ctx.fill();
            
            // "Layer Lines" for Block Stack Effect (Tactics Ogre)
            if (height > BLOCK_HEIGHT) {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let hStep = BLOCK_HEIGHT; hStep < height; hStep += BLOCK_HEIGHT) {
                    ctx.moveTo(corners[i].x, corners[i].y - hStep);
                    ctx.lineTo(corners[j].x, corners[j].y - hStep);
                }
                ctx.stroke();
            }

            // Outline Side
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'; 
            ctx.lineWidth = 1; 
            ctx.stroke();
        }

        // --- 2. Draw Top Face (Base) ---
        traceTopFace();
        
        const topGrad = ctx.createRadialGradient(x, y - topY, 0, x, y - topY, size);
        topGrad.addColorStop(0, theme.top);
        topGrad.addColorStop(1, theme.detail); 
        ctx.fillStyle = topGrad;
        ctx.fill();
        
        // --- 2.5 Draw Terrain Texture (Detailing) ---
        this.drawTerrainDetail(ctx, x, y - topY, size, q, r, textureType, theme.detail);

        // --- 2.6 SPECIAL STATUS FLOOR EFFECT ---
        if (specialStatus) {
            traceTopFace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'overlay';
            if (specialStatus === 'FROZEN') {
                ctx.fillStyle = '#bae6fd'; 
                ctx.globalAlpha = 0.6;
            } else if (specialStatus === 'POLYMORPH') {
                ctx.fillStyle = '#d8b4fe'; 
                ctx.globalAlpha = 0.5;
            } else if (specialStatus === 'STASIS') {
                ctx.fillStyle = '#fde047';
                ctx.globalAlpha = 0.5;
            }
            ctx.fill(); 
            ctx.restore();
        }

        // --- 2.7 AOE TELEGRAPH ---
        if (dangerInfo) {
            traceTopFace(); 
            ctx.save();
            // 1. Tile Coloring
            const opacity = 0.1 + dangerInfo.progress * 0.6;
            ctx.fillStyle = dangerInfo.color;
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = 'source-over'; 
            ctx.fill(); 
            
            // 2. Glowing Border
            ctx.strokeStyle = dangerInfo.color;
            ctx.lineWidth = 1 + dangerInfo.progress * 2;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            // 3. Particles
            if (dangerInfo.progress > 0.2) {
                const particleCount = 3 + Math.floor(dangerInfo.progress * 5);
                ctx.fillStyle = dangerInfo.color;
                ctx.globalCompositeOperation = 'lighter'; 
                
                for(let i=0; i<particleCount; i++) {
                    const seed = (Math.abs(q * 100 + r * 10) + i * 123.45);
                    const speed = 20 + (seed % 20);
                    const t = (globalTime * speed * 0.05 + seed) % 1; 
                    const pAlpha = 1 - t;
                    
                    const pX = x + Math.sin(t * 10 + seed) * (size * 0.5);
                    const pY = (y - topY) - (t * 40); 
                    
                    ctx.globalAlpha = pAlpha * opacity; 
                    const pSize = 1 + (seed % 2);
                    
                    ctx.beginPath();
                    ctx.arc(pX, pY, pSize, 0, Math.PI*2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        // --- 3. Dynamic Lighting ---
        if (lightColor && lightIntensity > 0) {
            traceTopFace(); 
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; 
            ctx.globalAlpha = lightIntensity * 0.8; 
            ctx.fillStyle = lightColor;
            ctx.fill();
            ctx.restore();
        }

        // --- 4. Interactive Overlays ---
        if (flash || isRange || isHover || hasUnit) {
            ctx.save();
            traceTopFace(); 

            if (isRange) { 
                ctx.fillStyle = rangeColor;
                ctx.globalAlpha = 0.2; 
                ctx.fill();
                ctx.strokeStyle = rangeColor; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = 0.8; 
                ctx.stroke();
            }
            
            if (isHover) { 
                ctx.fillStyle = 'rgba(255,255,255,0.15)'; 
                ctx.globalAlpha = 1.0;
                ctx.fill(); 
                ctx.strokeStyle = '#fff'; 
                ctx.lineWidth = 3; 
                ctx.stroke(); 
            }
            
            if (flash) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = flash.color;
                ctx.globalAlpha = 0.6;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            if (hasUnit && !isHover && !dangerInfo) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }

    private noise(q: number, r: number) {
        return Math.sin(q * 12.9898 + r * 78.233) * 43758.5453 - Math.floor(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453);
    }

    private drawTerrainDetail(
        ctx: CanvasRenderingContext2D, 
        cx: number, cy: number, 
        size: number, 
        q: number, r: number, 
        type: string, 
        detailColor: string
    ) {
        ctx.save();
        ctx.fillStyle = detailColor;
        ctx.strokeStyle = detailColor;
        ctx.globalAlpha = 0.3; 
        
        const n = this.noise(q, r);
        const n2 = this.noise(r, q);

        if (type === 'VOID') {
            if (n > 0.6) {
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx - 10, cy - 5);
                ctx.lineTo(cx, cy + 5);
                ctx.lineTo(cx + 10, cy - 2);
                ctx.stroke();
            } else if (n < 0.3) {
                ctx.beginPath();
                ctx.arc(cx + n2 * 10, cy + n * 10, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'FOREST') {
            const tufts = Math.floor(n * 3) + 1;
            for(let i=0; i<tufts; i++) {
                const ox = (this.noise(q+i, r) - 0.5) * 20;
                const oy = (this.noise(r, q+i) - 0.5) * 10;
                ctx.beginPath();
                ctx.moveTo(cx + ox, cy + oy);
                ctx.lineTo(cx + ox - 3, cy + oy - 5);
                ctx.moveTo(cx + ox, cy + oy);
                ctx.lineTo(cx + ox + 3, cy + oy - 5);
                ctx.stroke();
            }
        } else if (type === 'ICE') {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#fff';
            if (n > 0.5) {
                ctx.beginPath();
                ctx.moveTo(cx - 15, cy + 5);
                ctx.lineTo(cx + 15, cy - 5);
                ctx.lineTo(cx + 18, cy - 4);
                ctx.lineTo(cx - 12, cy + 6);
                ctx.fill();
            }
        } else if (type === 'MAGMA') {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(cx - 10, cy);
            ctx.lineTo(cx - 5, cy + 5 * n);
            ctx.lineTo(cx + 5, cy - 5 * n2);
            ctx.lineTo(cx + 10, cy);
            ctx.stroke();
            if (n > 0.8) {
                ctx.fillStyle = '#ef4444';
                ctx.globalAlpha = 0.6;
                ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill();
            }
        } else if (type === 'DESERT') {
            ctx.strokeStyle = '#92400e';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(cx - 10, cy - 10, 30, 0.5, 2.0);
            ctx.stroke();
        }

        ctx.restore();
    }
}
