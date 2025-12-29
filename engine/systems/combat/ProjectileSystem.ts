import { Agent, GameEngine } from "../../game";
import { Projectile, Skill } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillExecutor } from "./SkillExecutor";
import { VisualMath } from "../../math/VisualMath";
import { HazardManager } from "./HazardManager";

const POOL_SIZE = 256;
const TRAIL_MAX = 20;

export class ProjectileSystem {
    private pool: Projectile[] = [];

    constructor() {
        for (let i = 0; i < POOL_SIZE; i++) {
            this.pool.push(this.createEmpty());
        }
    }

    private createEmpty(): Projectile {
        const trail = [];
        for (let j = 0; j < TRAIL_MAX; j++) trail.push({ x: 0, y: 0 });
        return {
            id: "", active: false, x: 0, y: 0, startX: 0, startY: 0, startZ: 0,
            targetId: "", targetPos: { x: 0, y: 0 }, speed: 0,
            skill: null as any, sourceId: "", team: 0,
            trail, trailIndex: 0, trailCount: 0, createdAt: 0, lifespan: 0
        };
    }

    private acquire(engine: GameEngine): Projectile {
        const p = this.pool.length > 0 ? this.pool.pop()! : this.createEmpty();
        p.active = true;
        p.trailIndex = 0;
        p.trailCount = 0;
        p.createdAt = engine.battleTime;
        return p;
    }

    private release(p: Projectile) {
        p.active = false;
        p.id = "";
        p.targetId = "";
        p.sourceId = "";
        p.skill = null as any;
        this.pool.push(p);
    }

    public update(dt: number, engine: GameEngine, skillExecutor: SkillExecutor) {
        const projs = engine.projectiles;
        const time = engine.battleTime;
        
        for (let i = projs.length - 1; i >= 0; i--) {
            const p = projs[i];
            const age = time - p.createdAt;

            if (age >= p.lifespan) {
                this.handleImpact(p, engine, skillExecutor);
                projs.splice(i, 1);
                this.release(p);
                continue;
            }

            const target3D = VisualMath.resolveTargetPoint(p.targetId, engine);
            if (target3D.z > -9000) {
                p.targetPos.x = target3D.x;
                p.targetPos.y = target3D.y;
            }

            const t = age / p.lifespan;
            p.x = p.startX + (p.targetPos.x - p.startX) * t;
            p.y = p.startY + (p.targetPos.y - p.startY) * t;

            const prevIdx = (p.trailIndex - 1 + TRAIL_MAX) % TRAIL_MAX;
            const last = p.trail[prevIdx];
            const dx = p.x - last.x, dy = p.y - last.y;
            
            if (p.trailCount === 0 || (dx * dx + dy * dy) > 225) {
                const pt = p.trail[p.trailIndex];
                pt.x = p.x; pt.y = p.y;
                p.trailIndex = (p.trailIndex + 1) % TRAIL_MAX;
                if (p.trailCount < TRAIL_MAX) p.trailCount++;
            }
        }
    }

    private handleImpact(p: Projectile, engine: GameEngine, skillExecutor: SkillExecutor) {
        const source = engine.agents.find(a => a.id === p.sourceId);
        if (p.skill.type === 'AOE') {
            const radius = p.skill.aoeRadius || 1;
            const hex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
            for (const e of engine.agents) {
                if (e.team !== p.team && e.hp > 0 && !e.banished && HexUtils.dist(hex, e) <= radius) {
                    if (source) skillExecutor.resolveHit(source, e, p.skill, p.targetPos, engine);
                }
            }
            if (source) HazardManager.spawnHazards(source, HexUtils.range(hex, radius), p.skill, engine);
            engine.events.push({ type: 'IMPACT_AOE', pos: p.targetPos, skill: p.skill, color: p.skill.color });
        } else {
            const target = engine.agents.find(a => a.id === p.targetId);
            if (target && target.hp > 0 && !target.banished && source) {
                skillExecutor.resolveHit(source, target, p.skill, undefined, engine);
            }
        }
        engine.events.push({ type: 'PROJECTILE_HIT', pos: p.targetPos, skill: p.skill });
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        let tid = "";
        let tx = 0, ty = 0;
        
        if (skill.type === 'AOE') {
            if (source.targetHex) {
                const p = HexUtils.toPx(source.targetHex.q, source.targetHex.r, engine.mapConfig);
                tx = p.x; ty = p.y;
                tid = `ground-${source.targetHex.q},${source.targetHex.r}`;
            } else if (source.target) {
                tx = source.target.px; ty = source.target.py;
                tid = source.target.id;
            } else return;
        } else {
            if (source.target && !source.target.banished && source.target.hp > 0) {
                tx = source.target.px; ty = source.target.py;
                tid = source.target.id;
            } else return;
        }

        const p = this.acquire(engine);
        const anchor = VisualMath.getUnitAnchor(source, engine);
        
        p.id = `PX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        p.x = p.startX = source.px;
        p.y = p.startY = source.py;
        p.startZ = anchor.z;
        p.targetId = tid;
        p.targetPos.x = tx; p.targetPos.y = ty;
        p.speed = skill.projectileSpeed || 600;
        p.skill = skill;
        p.sourceId = source.id;
        p.team = source.team;

        const dist = Math.sqrt((p.startX - tx)**2 + (p.startY - ty)**2);
        p.lifespan = Math.max(0.01, dist / p.speed);

        engine.events.push({ type: 'PROJECTILE_SPAWN', pos: { x: source.px, y: source.py }, skill, targetId: tid });
        engine.projectiles.push(p);
    }
}