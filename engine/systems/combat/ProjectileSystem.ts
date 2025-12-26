import { Agent, GameEngine } from "../../game";
import { Projectile, Skill } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillResolutionSystem } from "./SkillResolutionSystem";

export class ProjectileSystem {
    public projectiles: Projectile[] = [];

    public update(dt: number, engine: GameEngine, skillResolver: SkillResolutionSystem) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // LOGICAL RAY DETECTION
            // High velocity skills (e.g., rr_u1 Railgun) move instantly to prevent trail gaps
            const isInstantRay = p.skill.projectileSpeed > 1400 || p.skill.id === 'rr_u1' || p.skill.id === 'mr_u2';

            const isGroundTarget = p.targetId.startsWith('ground-');
            let target = isGroundTarget ? null : engine.agents.find(a => a.id === p.targetId);
            
            if (target && !isGroundTarget) {
                p.targetPos = {x: target.px, y: target.py};
            }

            const dist = Vector.dist({x: p.x, y: p.y}, p.targetPos);
            const moveDist = isInstantRay ? 4000 * dt : p.speed * dt;
            
            // Update trail before moving
            const lastTrail = p.trail.length > 0 ? p.trail[p.trail.length - 1] : null;
            if (!lastTrail || Vector.dist(lastTrail, {x: p.x, y: p.y}) > 10) {
                p.trail.push({x: p.x, y: p.y});
                if (p.trail.length > 12) p.trail.shift(); 
            }
            
            // Reach target?
            if (dist <= moveDist || dist < 10) {
                const source = engine.agents.find(a => a.id === p.sourceId);
                
                if (p.skill.type === 'AOE') {
                    const hitPos = p.targetPos; 
                    const radius = p.skill.aoeRadius || 1;
                    const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                    const targets = engine.agents.filter(e => e.team !== p.team && e.hp > 0 && !e.banished && HexUtils.dist(hitHex, e) <= radius);
                    
                    targets.forEach(t => { 
                        if (source) skillResolver.resolveHit(source, t, p.skill, hitPos, engine); 
                    });
                    
                    if (p.skill.ccType === 'DOT' || p.skill.name.includes("霧") || p.skill.name.includes("雨")) {
                        if (source) {
                            const centerHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                            const affectedTiles = HexUtils.range(centerHex, radius);
                            const dur = p.skill.ccDur || 5.0;
                            let hType: 'POISON' | 'FIRE' | 'ICE' | 'GRAVITY' | 'GENERIC' = 'GENERIC';
                            
                            if (p.skill.ccType === 'DOT') hType = 'POISON';
                            if (p.skill.name.includes('火') || p.skill.name.includes('Lava')) hType = 'FIRE';
                            if (p.skill.name.includes('冰') || p.skill.name.includes('Frost')) hType = 'ICE';
                            
                            affectedTiles.forEach(tile => {
                                engine.map.addHazard(
                                    tile.q, tile.r, 
                                    hType, 
                                    dur, 
                                    source.id, 
                                    source.team, 
                                    p.skill.color,
                                    (p.skill.power * 0.2) || 10, 
                                    0.5 
                                );
                            });
                        }
                    }
                    engine.events.push({ type: 'IMPACT_AOE', pos: hitPos, skill: p.skill, color: p.skill.color });
                } else {
                    if (target && target.hp > 0 && !target.banished) {
                        if (source) skillResolver.resolveHit(source, target, p.skill, undefined, engine);
                    }
                }
                engine.events.push({ type: 'PROJECTILE_HIT', pos: p.targetPos, skill: p.skill });
                
                this.removeProjectile(i);
            } else {
                const dir = Vector.normalize(Vector.sub(p.targetPos, {x: p.x, y: p.y}));
                p.x += dir.x * moveDist;
                p.y += dir.y * moveDist;
            }
        }
    }

    private removeProjectile(idx: number) {
        const lastIdx = this.projectiles.length - 1;
        if (idx !== lastIdx) this.projectiles[idx] = this.projectiles[lastIdx];
        this.projectiles.pop();
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        let targetPos = {x: 0, y: 0};
        let tid = "";
        
        if (skill.type === 'AOE') {
             if (source.targetHex) {
                 const p = HexUtils.toPx(source.targetHex.q, source.targetHex.r, engine.mapConfig);
                 targetPos = p; tid = `ground-${source.targetHex.q},${source.targetHex.r}`;
             } else if (source.target) {
                 targetPos = {x: source.target.px, y: source.target.py}; tid = source.target.id;
             } else return;
             this.createProjectile(source, skill, targetPos, tid);
             engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: tid });
        } else {
            if (source.target && !source.target.banished && source.target.hp > 0) {
                targetPos = {x: source.target.px, y: source.target.py};
                this.createProjectile(source, skill, targetPos, source.target.id);
                engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: source.target.id });
            }
        }
    }

    private createProjectile(source: Agent, skill: Skill, targetPos: {x: number, y: number}, targetId: string) {
        this.projectiles.push({
            id: Math.random().toString(36).substr(2, 6),
            x: source.px, y: source.py, 
            startX: source.px, startY: source.py, startZ: source.physics.z, 
            targetId, targetPos,
            speed: skill.projectileSpeed || 600, skill, sourceId: source.id, team: source.team, trail: []
        });
    }
}