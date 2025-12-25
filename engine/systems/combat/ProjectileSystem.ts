
import { Agent, GameEngine } from "../../game";
import { Projectile, Skill } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillResolutionSystem } from "./SkillResolutionSystem";

export class ProjectileSystem {
    public projectiles: Projectile[] = [];

    public update(dt: number, engine: GameEngine, skillResolver: SkillResolutionSystem) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            const isGroundTarget = p.targetId.startsWith('ground-');
            let target = isGroundTarget ? null : engine.agents.find(a => a.id === p.targetId);
            
            // Homing logic: update target position if unit moves
            if (target && !isGroundTarget) {
                p.targetPos = {x: target.px, y: target.py};
            }

            const dir = Vector.normalize(Vector.sub(p.targetPos, {x: p.x, y: p.y}));
            const dist = Vector.dist({x: p.x, y: p.y}, p.targetPos);
            const moveDist = p.speed * dt;
            
            // TRAIL UPDATE
            // Only add trail point if moved enough to prevent stacking
            // Limit trail buffer size for performance
            const lastTrail = p.trail.length > 0 ? p.trail[p.trail.length - 1] : null;
            if (!lastTrail || Vector.dist(lastTrail, {x: p.x, y: p.y}) > 10) {
                p.trail.push({x: p.x, y: p.y});
                if (p.trail.length > 12) p.trail.shift(); // Keep trail shorter but smoother
            }
            
            // Hit Detection
            if (dist <= moveDist || dist < 10) {
                const source = engine.agents.find(a => a.id === p.sourceId) || engine.agents[0]; 
                
                if (p.skill.type === 'AOE') {
                    const hitPos = p.targetPos; 
                    const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                    const radius = p.skill.aoeRadius || 1;
                    const targets = engine.agents.filter(e => e.team !== p.team && e.hp > 0 && !e.banished && HexUtils.dist(hitHex, e) <= radius);
                    
                    targets.forEach(t => { 
                        if (source) skillResolver.resolveHit(source, t, p.skill, hitPos, engine); 
                    });
                    
                    // NEW: Persistent Field Logic
                    // If AOE has DOT or specific lingering tag, spawn a Field
                    if (p.skill.ccType === 'DOT' || p.skill.name.includes("霧") || p.skill.name.includes("雨") || p.skill.name.includes("暴風")) {
                        if (source) engine.combat.spawnField(source, p.skill, hitPos, engine);
                    }

                    // IMPACT EVENT
                    engine.events.push({ type: 'IMPACT_AOE', pos: {x: hitPos.x, y: hitPos.y}, skill: p.skill, color: p.skill.color });
                    engine.events.push({ type: 'PROJECTILE_HIT', pos: {x: hitPos.x, y: hitPos.y}, skill: p.skill });

                } else {
                    if (target && target.hp > 0 && !target.banished) {
                        if (source) skillResolver.resolveHit(source, target, p.skill, undefined, engine);
                    }
                    engine.events.push({ type: 'PROJECTILE_HIT', pos: {x: p.x, y: p.y}, skill: p.skill });
                }
                
                const lastIdx = this.projectiles.length - 1;
                if (i !== lastIdx) {
                    this.projectiles[i] = this.projectiles[lastIdx];
                }
                this.projectiles.pop();
                
            } else {
                p.x += dir.x * moveDist;
                p.y += dir.y * moveDist;
            }
        }
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        // Fallback Visual: Ensure no invisible projectiles
        if (!skill.visual) {
            skill.visual = 'BOLT'; 
        }

        let tx = 0, ty = 0;
        let tid = "";
        let targetPos = {x: 0, y: 0};
        
        if (skill.type === 'AOE') {
             if (source.targetHex) {
                 const p = HexUtils.toPx(source.targetHex.q, source.targetHex.r, engine.mapConfig);
                 tx = p.x; ty = p.y;
                 tid = `ground-${source.targetHex.q},${source.targetHex.r}`;
             } else if (source.target) {
                 tx = source.target.px; ty = source.target.py;
                 tid = source.target.id;
             } else {
                 return; // No target
             }
             targetPos = {x: tx, y: ty};
             this.createProjectile(source, skill, targetPos, tid, engine);
             engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: tid });

        } else {
            // Single Target Projectile
            const targets = (source.target && !source.target.banished && source.target.hp > 0 ? [source.target] : []);
            targets.forEach(t => {
                 targetPos = {x: t.px, y: t.py};
                 this.createProjectile(source, skill, targetPos, t.id, engine);
                 engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: t.id });
            });
        }
    }

    private createProjectile(source: Agent, skill: Skill, targetPos: {x: number, y: number}, targetId: string, engine: GameEngine) {
        this.projectiles.push({
            id: Math.random().toString(),
            x: source.px, 
            y: source.py, 
            startX: source.px, 
            startY: source.py,
            startZ: source.physics.z, // Capture Height
            targetId: targetId,
            targetPos: targetPos,
            speed: skill.projectileSpeed || 600, // Safe default
            skill: skill,
            sourceId: source.id,
            team: source.team,
            trail: []
        });
    }
}
