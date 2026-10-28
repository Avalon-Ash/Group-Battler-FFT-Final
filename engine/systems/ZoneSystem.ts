
// ╔══════════════════════════════════════════════════════════╗
// ║  ZoneSystem — 縮圈、背水一戰與塌陷格掉落管理             ║
// ║  職責：逐層縮圈；到 minRadius 或整層移除會清空地圖時，   ║
// ║        改從外圈逐格塌陷，保留最後一格並觸發背水一戰。     ║
// ║        AOE 詠唱預警區暫時也在這裡，待移出。              ║
// ║  [ARCH] 圈外單位走死亡管線；TILE_COLLAPSED 同步 VFX。    ║
// ╚══════════════════════════════════════════════════════════╝

import { GameEngine } from "../game";
import { Team, ActiveZone } from "../../types";
import { applyLethal } from "./combat/DirectDamage";
import { PhysicsEngine } from "../physics/PhysicsEngine";
import { clearBanishedFlag } from "./status/ControlSystem";
import { HexUtils } from "../utils";
import { ISO_SCALE_Y, PHYSICS, ZONE } from "../../constants";
import { random } from "../math/rng";

export type { ActiveZone };

export class ZoneSystem {
    public activeZones: ActiveZone[] = [];
    public safeRadius: number = ZONE.INITIAL_SAFE_RADIUS;
    public shrinkTimer: number = 0;
    public collapsingTiles: Map<string, { z: number, speed: number, q: number, r: number, h: number }> = new Map();
    public tileDepths: Map<string, number> = new Map();
    public currentShrinkLevel: number = 0;
    public maxDepth: number = 0;
    private initialized: boolean = false;
    private warningLevel: number | null = null;
    private layerShrink: boolean = false;

    public getTileDepth(q: number, r: number): number {
        return this.tileDepths.get(`${q},${r}`) ?? -1;
    }

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
                engine.map.warningTiles.clear();
                this.collapsingTiles.clear();
                engine.log(null, 'SYSTEM', '縮圈初始化', null, `地圖網格深度: ${this.maxDepth}, 初始安全層級: ${this.safeRadius}, 間隔: ${engine.zoneConfig.shrinkInterval}s`);
            }

            if (engine.map.mapKeys.size > 1) {
                this.shrinkTimer -= dt;
                const isTickSecond = Math.floor(this.shrinkTimer + ZONE.TIME_EPSILON) !== Math.floor(this.shrinkTimer + dt + ZONE.TIME_EPSILON);
                if (this.warningLevel !== this.currentShrinkLevel) {
                    this.rebuildWarnings(engine);
                }
                const count = engine.map.warningTiles.size;

                // Log warning
                if (count > 0 && isTickSecond) {
                    const remaining = Math.ceil(this.shrinkTimer - ZONE.TIME_EPSILON);
                    if (remaining <= ZONE.WARNING_LOG_INTERVAL || remaining % ZONE.WARNING_LOG_INTERVAL === 0) {
                        engine.log(null, 'SYSTEM', '縮圈警告', null, `${Math.max(0, remaining)}秒後地形塌陷`);
                    }
                }

                if (this.shrinkTimer <= ZONE.TIME_EPSILON) {
                    this.shrinkTimer = engine.zoneConfig.shrinkInterval; 
                    
                    const keysToRemove: {q: number, r: number, key: string, h: number}[] = [];
                    
                    // Collapse exactly the tiles warned for this interval.
                    for (const key of engine.map.warningTiles) {
                        const [q, r] = key.split(',').map(Number);
                        keysToRemove.push({ q, r, key, h: engine.map.getTerrainHeight(q, r) });
                    }
                    this.currentShrinkLevel++;
                    if (this.layerShrink) {
                        this.safeRadius = Math.max(0, this.maxDepth - this.currentShrinkLevel + 1);
                    }

                    for (const hex of keysToRemove) {
                        // 1. 先處理站在格子上的單位，removeTile 前執行，確保座標資料還在
                        const victims = engine.agents.filter(a => !a.fullyDead && a.q === hex.q && a.r === hex.r);
                        for (const victim of victims) {
                            if (victim.hp > 0 || !victim.deadLogged) {
                                applyLethal(victim);
                                clearBanishedFlag(victim);
                                engine.agentManager.handleDeadState(victim, engine, '墜落出局', 'RING_OUT');
                                PhysicsEngine.startVoidFall(victim);
                            } else {
                                // 已經在戰鬥中死亡但仍在該地塊上的屍體，隨地塊崩塌垂直落下
                                PhysicsEngine.startVoidFall(victim);
                            }
                        }

                        // 2. [FIX] 清除陷落網格上的 Hazard 資料（避免特效懸浮在虛空）
                        for (let i = engine.state.spatialHazards.length - 1; i >= 0; i--) {
                            const h = engine.state.spatialHazards[i];
                            const prevCount = h.cells.length;
                            h.cells = h.cells.filter(c => c.q !== hex.q || c.r !== hex.r);
                            
                            // [PROACTIVE PUSH] 如果該 Hazard 的 cells 發生變動且歸零，則徹底移除
                            if (h.cells.length === 0) {
                                engine.state.spatialHazards.splice(i, 1);
                            } else if (h.cells.length !== prevCount) {
                                engine.mapVersion++; // 通知地圖觀察者此 hazard 的 cell 範圍已縮小
                            }
                        }

                        // [FIX] 發送事件通知 VFX 系統清除該區域的殘留特效
                        const worldPos = HexUtils.toPx(hex.q, hex.r, engine.mapConfig);
                        engine.bus.emit('TILE_COLLAPSED', { 
                            q: hex.q, 
                            r: hex.r,
                            worldX: worldPos.x,
                            // [ARCH] worldY / ISO_SCALE_Y 得到原始 3D 空間的 Y (對齊粒子系統物理座標)
                            worldY: worldPos.y / ISO_SCALE_Y 
                        });

                        // 3. 再移除地圖格，啟動掉落動畫
                        this.collapsingTiles.set(hex.key, { z: 0, speed: 0, q: hex.q, r: hex.r, h: hex.h });
                        engine.map.removeTile(hex.q, hex.r);
                    }

                    if (keysToRemove.length > 0) {
                        engine.mapVersion++; 
                        engine.bus.emit('ZONE_SHRUNK', { radius: this.safeRadius });
                        engine.log(null, 'SYSTEM', '地形潰縮', null, `剩餘安全網格: ${engine.map.mapKeys.size}`);

                        // --- LAST STAND TRIGGER ---
                        if (engine.map.mapKeys.size === 1 && !engine.state.isLastStand) {
                            engine.state.isLastStand = true;
                            const finalHexKey = Array.from(engine.map.mapKeys)[0];
                            const [fq, fr] = finalHexKey.split(',').map(Number);
                            engine.state.finalHex = { q: fq, r: fr };
                            engine.bus.emit('LAST_STAND_TRIGGERED', { q: fq, r: fr });
                            engine.log(null, 'SYSTEM', '背水一戰', null, '最後安全區域確立：全防禦瓦解，治癒禁絕，絕對穿透開啟！');
                        }
                    }
                }
            }
        } else {
            // If disabled, ensure we are not initialized so it can restart later
            if (this.initialized) {
                engine.log(null, 'SYSTEM', '系統停用', null, '大逃殺機制已關閉，狀態重置');
                this.reset(engine);
            }
        }

        for (const [key, tile] of this.collapsingTiles.entries()) {
            tile.speed -= PHYSICS.GRAVITY * dt;
            tile.z += tile.speed * dt;
            if (tile.z < ZONE.COLLAPSE_DESPAWN_Z) {
                this.collapsingTiles.delete(key);
            }
        }

        // Pre-process Unit Zones
        for (const a of engine.agents) {
            if (a.hp <= 0 || a.banished) continue;
            
            if (a.effects.STUN.remaining <= 0 && a.effects.SILENCE.remaining <= 0 && a.castingSkillIdx !== -1) {
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

    public reset(engine?: GameEngine) {
        this.initialized = false;
        this.safeRadius = ZONE.INITIAL_SAFE_RADIUS;
        this.shrinkTimer = 0;
        this.currentShrinkLevel = 0;
        this.maxDepth = 0;
        this.tileDepths.clear();
        this.activeZones = [];
        if (engine) engine.map.warningTiles.clear();
        this.collapsingTiles.clear();
        this.warningLevel = null;
        this.layerShrink = false;
    }

    private rebuildWarnings(engine: GameEngine): void {
        const mapKeys = engine.map.mapKeys;
        const layer = Array.from(mapKeys).filter(key => this.tileDepths.get(key) === this.currentShrinkLevel);
        this.layerShrink = this.safeRadius > engine.zoneConfig.minRadius && layer.length > 0 && layer.length < mapKeys.size;
        const nextWarnings = this.layerShrink ? layer : [this.chooseFinalTarget(engine)];
        const newlyWarned = new Set(nextWarnings.filter(key => !engine.map.warningTiles.has(key)));
        engine.map.warningTiles.clear();
        for (const key of nextWarnings) engine.map.warningTiles.add(key);
        for (const a of engine.agents) {
            if (a.hp > 0 && newlyWarned.has(HexUtils.key(a))) a.forceAiUpdate = true;
        }
        this.warningLevel = this.currentShrinkLevel;
    }

    private chooseFinalTarget(engine: GameEngine): string {
        const mapKeys = engine.map.mapKeys;
        const depths = this.depthsFor(mapKeys);
        const outerKeys = Array.from(mapKeys).filter(key => depths.get(key) === 0).sort();
        const connected: string[] = [];
        const largestCandidates: string[] = [];
        let bestSize = 0;
        for (const key of outerKeys) {
            const size = this.largestComponentAfterRemoval(mapKeys, key);
            if (size === mapKeys.size - 1) connected.push(key);
            if (size > bestSize) {
                bestSize = size;
                largestCandidates.length = 0;
            }
            if (size === bestSize) largestCandidates.push(key);
        }
        const candidates = connected.length > 0 ? connected : largestCandidates;
        if (connected.length === 0) {
            engine.log(null, 'SYSTEM', '縮圈連通退路', null, `所有外圈候選移除後皆不連通；保留最大連通塊 ${bestSize} 格`);
        }
        return candidates.length === 1 ? candidates[0] : candidates[Math.floor(random() * candidates.length)];
    }

    private largestComponentAfterRemoval(mapKeys: Set<string>, removed: string): number {
        const visited = new Set<string>([removed]);
        let largest = 0;
        for (const key of mapKeys) {
            if (visited.has(key)) continue;
            const queue = [key];
            visited.add(key);
            for (let head = 0; head < queue.length; head++) {
                const [q, r] = queue[head].split(',').map(Number);
                for (const n of HexUtils.neighbors({ q, r })) {
                    const nk = HexUtils.key(n);
                    if (mapKeys.has(nk) && !visited.has(nk)) {
                        visited.add(nk);
                        queue.push(nk);
                    }
                }
            }
            largest = Math.max(largest, queue.length);
        }
        return largest;
    }

    private calculateDepths(engine: GameEngine) {
        this.tileDepths = this.depthsFor(engine.map.mapKeys);
        this.maxDepth = Math.max(0, ...this.tileDepths.values());
    }

    private depthsFor(mapKeys: Set<string>): Map<string, number> {
        const depths = new Map<string, number>();
        if (mapKeys.size === 0) return depths;

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
                    depths.set(key, 0);
                    currentLayer.push(key);
                    break;
                }
            }
        }

        // 4. Propagate Depths inwards
        let depth = 1;
        while (currentLayer.length > 0) {
            const nextLayer: string[] = [];
            for (const key of currentLayer) {
                const [q, r] = key.split(',').map(Number);
                const neighbors = HexUtils.neighbors({q, r});
                for (const n of neighbors) {
                    const nk = HexUtils.key(n);
                    if (mapKeys.has(nk) && !depths.has(nk)) {
                        depths.set(nk, depth);
                        nextLayer.push(nk);
                    }
                }
            }
            currentLayer = nextLayer;
            if (currentLayer.length > 0) {
                depth++;
            }
        }
        return depths;
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
