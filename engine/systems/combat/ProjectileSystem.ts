
import { Agent, GameEngine } from "../../game";
import { Projectile, Skill } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillExecutor } from "./SkillExecutor";
import { PROJECTILE_VISUALS } from "../../../data/vfx/projectile_visuals";
import { VisualMath } from "../../math/VisualMath";
import { HazardManager } from "./HazardManager";

export class ProjectileSystem {
    public projectiles: Projectile[] = [];

    public reset() {
        this.projectiles = [];
    }

    public update(dt: number, engine: GameEngine, skillExecutor: SkillExecutor) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // 1. Resolve Visual Definition
            const def = PROJECTILE_VISUALS[p.skill.visualProjectileEffect || p.skill.visual || 'BOLT'];
            const isInstant = def ? def.trajectory === 'INSTANT' : false;

            // 2. Update Target Position (Homing Logic)
            // Always update target position if it's a unit, to ensure homing hits correctly
            // Use VisualMath to ensure we are aiming at the CHEST, not the feet
            const currentTargetPos = VisualMath.resolveTargetPoint(p.targetId, engine);
            
            // If target is valid, update p.targetPos (Flattened 2D for movement logic, we handle Z visually)
            if (currentTargetPos.x !== 0 || currentTargetPos.y !== 0) {
                p.targetPos = { x: currentTargetPos.x, y: currentTargetPos.y };
            }

            // 3. Movement Logic (2D Plane)
            const dist = Vector.dist({x: p.x, y: p.y}, p.targetPos);
            
            // Speed Logic:
            // - Instant: Massive speed
            // - Linear/Arc: Use skill speed. 
            // *FIX*: Minimum speed clamp to prevent stuck projectiles
            const speed = isInstant ? 5000 : Math.max(200, p.speed);
            const moveDist = speed * dt;
            
            // 4. Update Trail
            const lastTrail = p.trail.length > 0 ? p.trail[p.trail.length - 1] : null;
            if (!lastTrail || Vector.dist(lastTrail, {x: p.x, y: p.y}) > 15) {
                p.trail.push({x: p.x, y: p.y});
                if (p.trail.length > 20) p.trail.shift(); 
            }
            
            // 5. Hit Detection
            if (dist <= moveDist || dist < 15) {
                this.handleImpact(p, engine, skillExecutor);
                this.removeProjectile(i);
            } else {
                const dir = Vector.normalize(Vector.sub(p.targetPos, {x: p.x, y: p.y}));
                p.x += dir.x * moveDist;
                p.y += dir.y * moveDist;
            }
        }
    }

    private handleImpact(p: Projectile, engine: GameEngine, skillExecutor: SkillExecutor) {
        const source = engine.agents.find(a => a.id === p.sourceId);
        
        // A. Area of Effect
        if (p.skill.type === 'AOE') {
            const hitPos = p.targetPos; 
            const radius = p.skill.aoeRadius || 1;
            const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
            
            // Find targets in range
            const targets = engine.agents.filter(e => 
                e.team !== p.team && 
                e.hp > 0 && !e.banished && 
                HexUtils.dist(hitHex, e) <= radius
            );
            
            targets.forEach(t => { 
                if (source) skillExecutor.resolveHit(source, t, p.skill, hitPos, engine); 
            });
            
            // Spawn Hazards (e.g. Fire/Poison zones)
            if (source) {
                const centerHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                const affectedTiles = HexUtils.range(centerHex, radius);
                HazardManager.spawnHazards(source, affectedTiles, p.skill, engine);
            }
            
            engine.events.push({ type: 'IMPACT_AOE', pos: hitPos, skill: p.skill, color: p.skill.color });
        } 
        // B. Single Target
        else {
            const target = engine.agents.find(a => a.id === p.targetId);
            if (target && target.hp > 0 && !target.banished) {
                if (source) skillExecutor.resolveHit(source, target, p.skill, undefined, engine);
            }
        }
        
        engine.events.push({ type: 'PROJECTILE_HIT', pos: p.targetPos, skill: p.skill });
    }

    private removeProjectile(idx: number) {
        const lastIdx = this.projectiles.length - 1;
        if (idx !== lastIdx) this.projectiles[idx] = this.projectiles[lastIdx];
        this.projectiles.pop();
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        let targetId = "";
        let targetPos = {x: 0, y: 0};

        if (skill.type === 'AOE') {
             if (source.targetHex) {
                 const p = HexUtils.toPx(source.targetHex.q, source.targetHex.r, engine.mapConfig);
                 targetPos = p; 
                 targetId = `ground-${source.targetHex.q},${source.targetHex.r}`;
             } else if (source.target) {
                 targetPos = {x: source.target.px, y: source.target.py}; 
                 targetId = source.target.id;
             } else return;
        } else {
            if (source.target && !source.target.banished && source.target.hp > 0) {
                targetPos = {x: source.target.px, y: source.target.py};
                targetId = source.target.id;
            } else return;
        }

        // --- VISUAL MATH INTEGRATION ---
        // Use VisualMath to get exact launch height
        const launchPoint = VisualMath.getUnitAnchor(source, engine);

        this.projectiles.push({
            id: Math.random().toString(36).substr(2, 6),
            x: source.px, y: source.py, 
            startX: source.px, startY: source.py, 
            startZ: launchPoint.z, // Use the standardized Z
            targetId, 
            targetPos,
            speed: skill.projectileSpeed || 600, 
            skill, 
            sourceId: source.id, 
            team: source.team, 
            trail: []
        });
        
        engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: targetId });
    }
}
