import { Agent, GameEngine } from "../../game";
import { Projectile, Skill, Team } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillExecutor } from "./SkillExecutor";
import { PROJECTILE_VISUALS } from "../../../data/vfx/projectile_visuals";
import { VisualMath } from "../../math/VisualMath";
import { HazardManager } from "./HazardManager";
import { VISUAL_ANCHORS } from "../../../constants";

export class ProjectileSystem {
    public projectiles: Projectile[] = [];
    private pool: Projectile[] = [];

    constructor() {
        for (let i = 0; i < 50; i++) {
            this.pool.push(this.createEmptyProjectile());
        }
    }

    public reset() {
        this.projectiles.forEach(p => this.release(p));
        this.projectiles = [];
    }

    public update(dt: number, engine: GameEngine, skillExecutor: SkillExecutor) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            if (!p.active) {
                this.removeProjectile(i);
                continue;
            }

            const age = engine.battleTime - p.createdAt;
            if (age > p.lifespan) {
                this.release(p);
                this.removeProjectile(i);
                continue;
            }

            const def = PROJECTILE_VISUALS[p.skill.visualProjectileEffect || p.skill.visual || 'BOLT'];
            const isInstant = def ? def.trajectory === 'INSTANT' : false;

            const currentTargetPos = VisualMath.resolveTargetPoint(p.targetId, engine);
            if (currentTargetPos.x !== 0 || currentTargetPos.y !== 0) {
                p.targetPos = { x: currentTargetPos.x, y: currentTargetPos.y };
            }

            const dist = Vector.dist({x: p.x, y: p.y}, p.targetPos);
            const speed = isInstant ? 5000 : Math.max(300, p.speed); 
            const moveDist = speed * dt;
            
            const lastTrail = p.trail.length > 0 ? p.trail[p.trail.length - 1] : null;
            if (!lastTrail || Vector.dist(lastTrail, {x: p.x, y: p.y}) > 15) {
                p.trail.push({x: p.x, y: p.y});
                if (p.trail.length > 20) p.trail.shift(); 
            }
            
            if (dist <= moveDist || dist < VISUAL_ANCHORS.HITBOX_RADIUS) {
                this.handleImpact(p, engine, skillExecutor);
                this.release(p);
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
        
        if (p.skill.type === 'AOE') {
            const hitPos = p.targetPos; 
            const radius = p.skill.aoeRadius || 1;
            const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
            
            const targets = engine.agents.filter(e => 
                e.team !== p.team && e.hp > 0 && !e.banished && 
                HexUtils.dist(hitHex, e) <= radius
            );
            
            targets.forEach(t => { 
                if (source) skillExecutor.resolveHit(source, t, p.skill, hitPos, engine); 
            });
            
            if (source) {
                const centerHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
                HazardManager.spawnHazards(source, HexUtils.range(centerHex, radius), p.skill, engine);
            }
            engine.events.push({ type: 'IMPACT_AOE', pos: hitPos, skill: p.skill, color: p.skill.color });
        } else {
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

        const launchPoint = VisualMath.getUnitAnchor(source, engine);
        const p = this.acquire();
        
        p.active = true;
        p.createdAt = engine.battleTime;
        p.lifespan = 5.0;
        p.id = Math.random().toString(36).substr(2, 6);
        p.x = source.px;
        p.y = source.py;
        p.startX = source.px;
        p.startY = source.py;
        p.startZ = launchPoint.z;
        p.targetId = targetId;
        p.targetPos = targetPos;
        p.speed = skill.projectileSpeed || 600;
        p.skill = skill;
        p.sourceId = source.id;
        p.team = source.team;
        p.trail = [];

        this.projectiles.push(p);
        engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: targetId });
    }

    private acquire(): Projectile {
        return this.pool.pop() || this.createEmptyProjectile();
    }

    private release(p: Projectile) {
        p.active = false;
        p.trail = [];
        this.pool.push(p);
    }

    private createEmptyProjectile(): Projectile {
        return {
            id: '', active: false, createdAt: 0, lifespan: 0,
            x: 0, y: 0, startX: 0, startY: 0, startZ: 0,
            targetId: '', targetPos: {x: 0, y: 0},
            speed: 0, skill: {} as Skill, sourceId: '', team: Team.BLUE,
            trail: []
        };
    }
}