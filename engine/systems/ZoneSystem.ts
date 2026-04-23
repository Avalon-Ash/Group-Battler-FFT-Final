
import { GameEngine } from "../game";
import { Team } from "../../types";
import { HexUtils } from "../utils";

export interface ActiveZone {
    q: number;
    r: number;
    radius: number;
    color: string;
    progress: number;
    isEnemy: boolean;
}

export class ZoneSystem {
    public activeZones: ActiveZone[] = [];
    public safeRadius: number = 999;
    public shrinkTimer: number = 0;
    public warningTiles: Set<string> = new Set();
    public collapsingTiles: Map<string, { z: number, speed: number, q: number, r: number, h: number }> = new Map();
    private tileDepths: Map<string, number> = new Map();
    private currentShrinkLevel: number = 0;
    private maxDepth: number = 0;
    private initialized: boolean = false;

    public update(dt: number, engine: GameEngine) {
        this.activeZones = [];
        
        // Battle Royale Shrink Logic
        if (engine.zoneConfig.enabled) {
            if (!this.initialized) {
                this.calculateDepths(engine);
                this.currentShrinkLevel = 0;
                this.safeRadius = this.maxDepth + 1;
                this.shrinkTimer = engine.zoneConfig.shrinkInterval; 
                this.initialized = true;
                this.warningTiles.clear();
                this.collapsingTiles.clear();
                engine.log(null, 'SYSTEM', '縮圈初始化', null, `地圖網格深度: ${this.maxDepth}, 初始安全層級: ${this.safeRadius}, 間隔: ${engine.zoneConfig.shrinkInterval}s`);
            }

            if (this.safeRadius > engine.zoneConfig.minRadius || engine.map.mapKeys.size > engine.zoneConfig.minRadius) {
                this.shrinkTimer -= dt;
                
                this.warningTiles.clear();
                
                // Identify which tiles to warn
                let count = 0;
                if (this.safeRadius > engine.zoneConfig.minRadius) {
                    // Normal layer-based warning
                    for (const key of engine.map.mapKeys) {
                        const depth = this.tileDepths.get(key);
                        if (depth !== undefined && depth === this.currentShrinkLevel) {
                            this.warningTiles.add(key);
                            count++;
                        }
                    }
                } else if (engine.map.mapKeys.size > engine.zoneConfig.minRadius) {
                    // Final phase: random tile warning if more than minRadius tiles remain
                    const keys = Array.from(engine.map.mapKeys);
                    // For consistency, we warn a random tile but keep it stable during the interval
                    const seed = Math.floor(this.currentShrinkLevel); 
                    const randomIndex = (seed * 9301 + 49297) % 233280 % keys.length;
                    this.warningTiles.add(keys[randomIndex]);
                    count = 1;
                }
                
                // Log warning
                if (count > 0 && Math.floor(this.shrinkTimer + 0.001) !== Math.floor(this.shrinkTimer + dt + 0.001)) {
                    const remaining = Math.ceil(this.shrinkTimer - 0.001);
                    if (remaining <= 5 || remaining % 5 === 0) {
                        engine.log(null, 'SYSTEM', '縮圈警告', null, `${Math.max(0, remaining)}秒後地形塌陷`);
                    }
                }

                if (this.shrinkTimer <= 0.001) {
                    this.shrinkTimer = engine.zoneConfig.shrinkInterval; 
                    
                    const keysToRemove: {q: number, r: number, key: string, h: number}[] = [];
                    
                    if (this.safeRadius > engine.zoneConfig.minRadius) {
                        // Normal layer-based shrink
                        for (const key of engine.map.mapKeys) {
                            const depth = this.tileDepths.get(key);
                            if (depth !== undefined && depth === this.currentShrinkLevel) {
                                const [q, r] = key.split(',').map(Number);
                                keysToRemove.push({q, r, key, h: engine.map.getTerrainHeight(q, r)});
                            }
                        }
                        this.currentShrinkLevel++;
                        this.safeRadius = Math.max(0, this.maxDepth - this.currentShrinkLevel + 1);
                    } else if (engine.map.mapKeys.size > engine.zoneConfig.minRadius) {
                        // Final phase: remove 1 random tile to reach minRadius
                        const keys = Array.from(engine.map.mapKeys);
                        const seed = Math.floor(this.currentShrinkLevel);
                        const randomIndex = (seed * 9301 + 49297) % 233280 % keys.length;
                        const key = keys[randomIndex];
                        const [q, r] = key.split(',').map(Number);
                        keysToRemove.push({q, r, key, h: engine.map.getTerrainHeight(q, r)});
                        this.currentShrinkLevel++; // Increment to change random seed next time
                    }

                    for (const hex of keysToRemove) {
                        this.collapsingTiles.set(hex.key, { z: 0, speed: 0, q: hex.q, r: hex.r, h: hex.h });
                        engine.map.removeTile(hex.q, hex.r);
                    }

                    if (keysToRemove.length > 0) {
                        engine.mapVersion++; 
                        engine.bus.emit('ZONE_SHRUNK', { radius: this.safeRadius });
                        engine.log(null, 'SYSTEM', '地形潰縮', null, `剩餘安全網格: ${engine.map.mapKeys.size}`);
                    }
                }
            }
        } else {
            // If disabled, ensure we are not initialized so it can restart later
            if (this.initialized) {
                engine.log(null, 'SYSTEM', '系統停用', null, '大逃殺機制已關閉，狀態重置');
                this.reset();
            }
        }

        for (const [key, tile] of this.collapsingTiles.entries()) {
            tile.speed -= 3500 * dt; // PHYSICS.GRAVITY
            tile.z += tile.speed * dt;
            if (tile.z < -2000) {
                this.collapsingTiles.delete(key);
            }
        }

        // Pre-process Unit Zones
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;
            
            if (a.stunTimer <= 0 && a.silenceTimer <= 0 && a.castingSkillIdx !== -1) {
                const s = a.skills[a.castingSkillIdx];
                if (s && s.type === 'AOE') {
                    let tq = a.q, tr = a.r;
                    if (a.targetHex) { tq = a.targetHex.q; tr = a.targetHex.r; }
                    else if (a.target) { tq = a.target.q; tr = a.target.r; }
                    
                    const progress = 1 - (a.castTimer / s.cast);
                    const radius = (s.aoeRadius || 1);
                    
                    // Unified Logic: Just track if it's an enemy
                    const isEnemy = a.team === Team.RED; // Assuming player perspective is Blue

                    this.activeZones.push({ 
                        q: tq, r: tr, 
                        radius, 
                        color: s.color, 
                        progress,
                        isEnemy
                    });
                }
            }
        }
    }

    public reset() {
        this.initialized = false;
        this.safeRadius = 999;
        this.shrinkTimer = 0;
        this.currentShrinkLevel = 0;
        this.maxDepth = 0;
        this.tileDepths.clear();
        this.activeZones = [];
        this.warningTiles.clear();
        this.collapsingTiles.clear();
    }

    private calculateDepths(engine: GameEngine) {
        this.tileDepths.clear();
        const mapKeys = engine.map.mapKeys;
        if (mapKeys.size === 0) return;

        // 1. Find Bounding Box
        let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
        for (const key of mapKeys) {
            const [q, r] = key.split(',').map(Number);
            minQ = Math.min(minQ, q); maxQ = Math.max(maxQ, q);
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        }

        // 2. Flood Fill Outer Void to identify "infinity"
        const outerVoid = new Set<string>();
        const queue: {q: number, r: number}[] = [];
        
        // Start from a ring around the bounding box
        for (let q = minQ - 1; q <= maxQ + 1; q++) {
            const k1 = HexUtils.key({q, r: minR - 1});
            const k2 = HexUtils.key({q, r: maxR + 1});
            if (!mapKeys.has(k1)) { outerVoid.add(k1); queue.push({q, r: minR - 1}); }
            if (!mapKeys.has(k2)) { outerVoid.add(k2); queue.push({q, r: maxR + 1}); }
        }
        for (let r = minR; r <= maxR; r++) {
            const k1 = HexUtils.key({q: minQ - 1, r});
            const k2 = HexUtils.key({q: maxQ + 1, r});
            if (!mapKeys.has(k1)) { outerVoid.add(k1); queue.push({q: minQ - 1, r}); }
            if (!mapKeys.has(k2)) { outerVoid.add(k2); queue.push({q: maxQ + 1, r}); }
        }

        let head = 0;
        while (head < queue.length) {
            const curr = queue[head++];
            const neighbors = HexUtils.neighbors(curr);
            for (const n of neighbors) {
                const nk = HexUtils.key(n);
                // Stay within a reasonable padding of the bounding box
                if (n.q < minQ - 2 || n.q > maxQ + 2 || n.r < minR - 2 || n.r > maxR + 2) continue;
                if (!mapKeys.has(nk) && !outerVoid.has(nk)) {
                    outerVoid.add(nk);
                    queue.push(n);
                }
            }
        }

        // 3. Identify Layer 0 (Tiles touching Outer Void)
        let currentLayer: string[] = [];
        for (const key of mapKeys) {
            const [q, r] = key.split(',').map(Number);
            const neighbors = HexUtils.neighbors({q, r});
            for (const n of neighbors) {
                if (outerVoid.has(HexUtils.key(n))) {
                    this.tileDepths.set(key, 0);
                    currentLayer.push(key);
                    break;
                }
            }
        }

        // 4. Propagate Depths inwards
        let depth = 1;
        this.maxDepth = 0;
        while (currentLayer.length > 0) {
            const nextLayer: string[] = [];
            for (const key of currentLayer) {
                const [q, r] = key.split(',').map(Number);
                const neighbors = HexUtils.neighbors({q, r});
                for (const n of neighbors) {
                    const nk = HexUtils.key(n);
                    if (mapKeys.has(nk) && !this.tileDepths.has(nk)) {
                        this.tileDepths.set(nk, depth);
                        nextLayer.push(nk);
                    }
                }
            }
            currentLayer = nextLayer;
            if (currentLayer.length > 0) {
                this.maxDepth = depth;
                depth++;
            }
        }
    }

    public getZoneAt(q: number, r: number): ActiveZone | undefined {
        // Linear scan is fine for < 20 zones usually
        for (const zone of this.activeZones) {
            const dist = HexUtils.dist({q, r}, {q: zone.q, r: zone.r});
            if (dist <= zone.radius) {
                return zone;
            }
        }
        return undefined;
    }
}
