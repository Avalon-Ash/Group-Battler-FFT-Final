
import { Agent, GameEngine } from "../../game";
import { Projectile, Skill, Team } from "../../../types";
import { HexUtils, Vector } from "../../utils";
import { SkillExecutor } from "./SkillExecutor";
import { VisualMath } from "../../math/VisualMath";
import { HazardManager } from "./HazardManager";
import { HEX_SIZE } from "../../../constants";

export class ProjectileSystem {
    private pool: Projectile[] = [];

    constructor() {
        for (let i = 0; i < 60; i++) this.pool.push(this.createEmptyProjectile());
    }

    public update(dt: number, engine: GameEngine, skillExecutor: SkillExecutor) {
        const list = engine.projectiles;
        for (let i = list.length - 1; i >= 0; i--) {
            const p = list[i];
            if (!p.active) { this.removeProjectile(i, engine); continue; }

            const dtStep = dt / p.totalDuration;
            p.t = Math.min(1.0, p.t + dtStep);

            // 邏輯坐標插值 (作為物理真理)
            p.x = p.startX + (p.endX - p.startX) * p.t;
            p.y = p.startY + (p.endY - p.startY) * p.t;
            p.z = p.startZ + (p.endZ - p.startZ) * p.t;

            if (p.t >= 1.0) {
                this.handleImpact(p, engine, skillExecutor);
                this.release(p);
                this.removeProjectile(i, engine);
            }
        }
    }

    private handleImpact(p: Projectile, engine: GameEngine, skillExecutor: SkillExecutor) {
        const source = engine.agents.find(a => a.id === p.sourceId);
        const hitPos = { x: p.endX, y: p.endY };

        if (p.skill.type === 'AOE') {
            const radiusGrid = p.skill.aoeRadius || 1;
            // 轉換為像素半徑，並給予微量寬容度 (+10px) 以補償視覺邊緣
            const radiusPx = radiusGrid * HEX_SIZE + 10;
            const radiusSq = radiusPx * radiusPx;

            const hitHex = HexUtils.fromPx(hitPos.x, hitPos.y, engine.mapConfig);
            
            engine.agents.forEach(t => {
                if (t.team !== p.team && t.hp > 0 && !t.banished) {
                    // [FIX] 使用像素距離判定而非網格距離，解決視覺覆蓋但邏輯判失誤的問題
                    // 特別是對於核彈這種超大範圍、低速落點的技能
                    const targetPx = HexUtils.toPx(t.q, t.r, engine.mapConfig);
                    const dx = targetPx.x - hitPos.x;
                    const dy = targetPx.y - hitPos.y;
                    const distSq = dx*dx + dy*dy;

                    if (distSq <= radiusSq) {
                        // 即使施法者已死，只要 projectile 存在就應該造成傷害
                        // 如果 source 消失 (極端情況)，則無法計算屬性加成，暫時跳過
                        if (source) skillExecutor.resolveHit(source, t, p.skill, hitPos, engine);
                    }
                }
            });
            
            // 仍然生成危險區域 (Hazards 依賴網格)
            if (source) HazardManager.spawnHazards(source, HexUtils.range(hitHex, radiusGrid), p.skill, engine);
            
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
        if (last && idx < engine.projectiles.length) engine.projectiles[idx] = last;
    }

    public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
        const target = skill.type === 'AOE' ? (source.targetHex || source.target) : source.target;
        if (!target) return;

        const targetId = (target as any).id || `ground-${(target as any).q},${(target as any).r}`;
        const launchPoint = VisualMath.getUnitAnchor(source, engine);
        const targetPoint = VisualMath.resolveTargetPoint(targetId, engine);
        
        const dx = targetPoint.x - launchPoint.x;
        const dy = targetPoint.y - launchPoint.y;
        const totalDist = Math.sqrt(dx*dx + dy*dy);
        const speed = skill.projectileSpeed || 800;

        const p = this.pool.pop() || this.createEmptyProjectile();
        p.active = true;
        p.id = engine.nextId('PRJ');
        p.sourceId = source.id;
        p.team = source.team;
        p.skill = skill;
        p.t = 0;
        p.totalDuration = Math.max(0.1, totalDist / speed);
        p.startX = launchPoint.x; p.startY = launchPoint.y; p.startZ = launchPoint.z;
        p.endX = targetPoint.x; p.endY = targetPoint.y; p.endZ = targetPoint.z;
        p.totalDist = totalDist;
        p.targetId = targetId;
        p.trail = [];

        engine.projectiles.push(p);
        engine.events.push({ type: 'PROJECTILE_SPAWN', pos: {x: source.px, y: source.py}, skill, targetId });
    }

    private release(p: Projectile) { p.active = false; p.trail = []; this.pool.push(p); }

    private createEmptyProjectile(): Projectile {
        return { 
            id: '', active: false, createdAt: 0, lifespan: 0, 
            x: 0, y: 0, z: 0, t: 0, totalDuration: 0,
            startX: 0, startY: 0, startZ: 0, endX: 0, endY: 0, endZ: 0, totalDist: 0,
            targetId: '', targetPos: {x: 0, y: 0}, 
            speed: 0, skill: {} as Skill, sourceId: '', team: Team.BLUE, trail: [] 
        };
    }
}