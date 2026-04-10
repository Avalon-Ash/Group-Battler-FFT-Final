
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
    private initialized: boolean = false;

    public update(dt: number, engine: GameEngine) {
        this.activeZones = [];

        // Battle Royale Shrink Logic
        if (engine.zoneConfig.enabled) {
            if (!this.initialized) {
                this.safeRadius = engine.zoneConfig.initialRadius;
                this.shrinkTimer = engine.zoneConfig.shrinkInterval; // Initial shrink timer
                this.initialized = true;
                this.warningTiles.clear();
                this.collapsingTiles.clear();
            }

            if (this.safeRadius > engine.zoneConfig.minRadius) {
                this.shrinkTimer -= dt;
                
                const centerQ = Math.floor(engine.mapConfig.w / 2);
                const centerR = Math.floor(engine.mapConfig.h / 2);

                this.warningTiles.clear();
                if (this.shrinkTimer <= 3) {
                    for (const key of engine.map.mapKeys) {
                        const parts = key.split(',');
                        const q = parseInt(parts[0]);
                        const r = parseInt(parts[1]);
                        const dist = HexUtils.dist({q, r}, {q: centerQ, r: centerR});
                        if (dist === this.safeRadius) {
                            this.warningTiles.add(key);
                        }
                    }
                }

                if (this.shrinkTimer <= 0) {
                    this.shrinkTimer = engine.zoneConfig.shrinkInterval; // Reset timer for next shrink
                    
                    const keysToRemove: {q: number, r: number, key: string, h: number}[] = [];

                    for (const key of engine.map.mapKeys) {
                        const parts = key.split(',');
                        const q = parseInt(parts[0]);
                        const r = parseInt(parts[1]);
                        const dist = HexUtils.dist({q, r}, {q: centerQ, r: centerR});
                        if (dist === this.safeRadius) {
                            keysToRemove.push({q, r, key, h: engine.map.getTerrainHeight(q, r)});
                        }
                    }

                    this.safeRadius--;

                    for (const hex of keysToRemove) {
                        this.collapsingTiles.set(hex.key, { z: 0, speed: 0, q: hex.q, r: hex.r, h: hex.h });
                        engine.map.removeTile(hex.q, hex.r);
                    }

                    if (keysToRemove.length > 0) {
                        engine.mapVersion++; // Force cache invalidation
                        engine.bus.emit('ZONE_SHRUNK', { radius: this.safeRadius });
                        engine.log(null, 'SYSTEM', '地形潰縮', null, `安全半徑已縮小至 ${this.safeRadius}`);
                    }
                }
            }
            
            for (const [key, tile] of this.collapsingTiles.entries()) {
                tile.speed -= 3500 * dt; // PHYSICS.GRAVITY
                tile.z += tile.speed * dt;
                if (tile.z < -2000) {
                    this.collapsingTiles.delete(key);
                }
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
        this.activeZones = [];
        this.warningTiles.clear();
        this.collapsingTiles.clear();
    }

    public getZoneAt(q: number, r: number): ActiveZone | null {
        // Linear scan is fine for < 20 zones usually
        for (const zone of this.activeZones) {
            const dist = HexUtils.dist({q, r}, {q: zone.q, r: zone.r});
            if (dist <= zone.radius) {
                return zone;
            }
        }
        return null;
    }
}
