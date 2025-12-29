
import { Agent, GameEngine } from "../../game";
import { Projectile, Skill, Team } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillExecutor } from "./SkillExecutor";
import { VisualMath } from "../../math/VisualMath";
import { HazardManager } from "./HazardManager";

export class ProjectileSystem {
    private pool: Projectile[] = [];

    constructor() {
        for (let i = 0; i < 60; i++) {
            this.pool.push(this.createEmptyProjectile());
        }
    }

    public update(dt: number, engine: GameEngine, skillExecutor: SkillExecutor) {
        const list = engine.projectiles;
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            if (!p.active) { this.removeProjectile(i, engine); continue; }

            // 1. 邏輯步進 (解析解座標同步)
            // 系統只負責檢查碰撞範圍，具體座標由解析公式計算
            const targetPoint = VisualMath.resolveTargetPoint(p.targetId, engine);
            if (targetPoint.z > -9000) p.targetPos = { x: targetPoint.x, y: targetPoint.y };

            const dx = p.targetPos.x - p.x;
            const dy = p.targetPos.y - p.y;
            const distSq = dx*dx + dy*dy;
            
            const moveStep = Math.max(300, p.speed) * dt;

            // 2. 命中判定
            if (distSq < (moveStep * moveStep * 2) || distSq < 400) {
                this.handleImpact(p, engine, skillExecutor);
                this.release(p);
                this.removeProjectile(i, engine);
            } else {
                const mag = Math.sqrt(distSq);
                p.x += (dx / mag) * moveStep;
                p.y += (dy / mag) * moveStep;
            }
        }
    }

    private handleImpact(p: Projectile, engine: GameEngine, skillExecutor: SkillExecutor) {
        const source = engine.agents.find(a => a.id === p.sourceId);
        const hitPos = p.targetPos;

        if (p.skill.type === 'AOE') {
            const radius = p.skill.aoeRadius || 1;
            const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
            
            engine.agents.forEach(t => {
                if (t.team !== p.team && t.hp > 0 && !t.banished) {
                    if (HexUtils.dist(hitHex, t) <= radius) {
                        if (source) skillExecutor.resolveHit(source, t, p.skill, hitPos, engine);
                    }
                }
            });
            
            if (source) {
                HazardManager.spawnHazards(source, HexUtils.range(hitHex, radius), p.skill, engine);
            }
            engine.events.push({ type: 'IMPACT_AOE', pos: hitPos, skill: p.skill, color: p.skill.color });
        } else {
            const target = engine.agents.find(a => a.id === p.targetId);
            if (target && target.hp > 0 && !target.banished) {
                if (source) skillExecutor.resolveHit(source, target, p.skill, undefined, engine);
            }
        }
        engine.events.push({ type: 'PROJECTILE_HIT', pos: hitPos, skill: p.skill });
    }

    private removeProjectile(idx: number, engine: GameEngine) {
        const last = engine.projectiles.pop();
        if (last && idx < engine.projectiles.length) {
            engine.projectiles[idx] = last;
        }
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        const target = skill.type === 'AOE' ? (source.targetHex || source.target) : source.target;
        if (!target) return;

        const targetId = (target as any).id || `ground-${(target as any).q},${(target as any).r}`;
        const targetPos = (target as any).px !== undefined ? {x:(target as any).px, y:(target as any).py} : HexUtils.toPx((target as any).q, (target as any).r, engine.mapConfig);

        const launchAnchor = VisualMath.getUnitAnchor(source, engine);
        const p = this.pool.pop() || this.createEmptyProjectile();
        
        p.active = true;
        p.createdAt = engine.battleTime;
        p.lifespan = 5.0;
        p.id = Math.random().toString(36).substr(2, 6);
        p.x = source.px;
        p.y = source.py;
        p.startX = source.px;
        p.startY = source.py;
        p.startZ = launchAnchor.z;
        p.targetId = targetId;
        p.targetPos = targetPos;
        p.speed = skill.projectileSpeed || 800;
        p.skill = skill;
        p.sourceId = source.id;
        p.team = source.team;
        p.trail = [];

        engine.projectiles.push(p);
        engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill: skill, targetId: targetId });
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
