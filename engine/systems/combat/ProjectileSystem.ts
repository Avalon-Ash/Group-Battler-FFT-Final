import { Agent, GameEngine } from "../../game";
import { Projectile, Skill, Team } from "../../../types";
import {
  PROJECTILE_VISUALS,
  DEFAULT_PROJECTILE,
} from "../../../data/vfx/projectile_visuals";
import { TrajectoryMath, Point3D } from "../../math/TrajectoryMath";
import { VisualMath } from "../../math/VisualMath";
import { SkillExecutor } from "./SkillExecutor";
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
      if (!p.active) {
        this.removeProjectile(i, engine);
        continue;
      }

      // 1. Advance Time
      const dtStep = dt / p.totalDuration;
      p.t = Math.min(1.0, p.t + dtStep);

      // 2. Calculate True 3D Position (SSOT)
      this.updatePosition(p, engine);

      // 3. Impact Check
      if (p.t >= 1.0) {
        this.handleImpact(p, engine, skillExecutor);
        this.release(p);
        this.removeProjectile(i, engine);
      }
    }
  }

  private updatePosition(p: Projectile, engine: GameEngine) {
    if (p.targetId && !p.targetId.startsWith("ground-")) {
      const target = engine.agents.find((a) => a.id === p.targetId);
      if (target && target.hp > 0) {
        const targetPoint = VisualMath.getUnitAnchor(target, engine);
        p.endX = targetPoint.x;
        p.endY = targetPoint.y;
        p.endZ = targetPoint.z;
      }
    }

    const start: Point3D = { x: p.startX, y: p.startY, z: p.startZ };
    const end: Point3D = { x: p.endX, y: p.endY, z: p.endZ };

    // Use SSOT evaluate function
    const pos = TrajectoryMath.evaluate(p.trajectoryInfo, start, end, p.t);

    // Save history for trail rendering BEFORE updating the current position
    // We only want the last ~10 positions for a fast projectile trail
    if (p.x !== 0 && p.y !== 0) {
        p.trail.unshift({ x: p.x, y: p.y - p.z });
        if (p.trail.length > 12) p.trail.pop();
    }

    p.x = pos.x;
    p.y = pos.y;
    p.z = pos.z;
  }

  private handleImpact(
    p: Projectile,
    engine: GameEngine,
    skillExecutor: SkillExecutor,
  ) {
    const source = engine.agents.find((a) => a.id === p.sourceId);
    const hitPos = { x: p.endX, y: p.endY };

    if (p.skill.type === "AOE") {
      const radiusGrid = p.skill.aoeRadius || 1;
      const radiusPx = radiusGrid * HEX_SIZE + 10;
      const radiusSq = radiusPx * radiusPx;

      engine.agents.forEach((t) => {
        if (t.team !== p.team && t.hp > 0 && !t.banished) {
          const targetPx = VisualMath.getUnitAnchor(t, engine);
          const dx = targetPx.x - hitPos.x;
          const dy = targetPx.y - hitPos.y;
          const distSq = dx * dx + dy * dy;

          if (distSq <= radiusSq) {
            if (source)
              skillExecutor.resolveHit(source, t, p.skill, hitPos, engine);
          }
        }
      });

      engine.events.push({
        type: "IMPACT_AOE",
        pos: hitPos,
        skill: p.skill,
        color: p.skill.color,
        targetId: p.targetId,
      });
    } else {
      const target = engine.agents.find((a) => a.id === p.targetId);
      if (target && target.hp > 0 && !target.banished) {
        if (source)
          skillExecutor.resolveHit(source, target, p.skill, undefined, engine);
      }
      engine.events.push({
        type: "PROJECTILE_HIT",
        pos: hitPos,
        skill: p.skill,
        targetId: p.targetId,
      });
    }
  }

  private removeProjectile(idx: number, engine: GameEngine) {
    const removing = engine.projectiles[idx];
    if (removing) this.release(removing);
    const last = engine.projectiles.pop();
    if (last && idx < engine.projectiles.length) engine.projectiles[idx] = last;
  }

  public spawnProjectile(source: Agent, skill: Skill, engine: GameEngine) {
    const target =
      skill.type === "AOE" ? source.targetHex || source.target : source.target;
    if (!target) return;

    const targetId =
      (target as any).id || `ground-${(target as any).q},${(target as any).r}`;
    
    // [FIX] Directly use target agent position if available instead of fetching by ID.
    // This prevents falling back to 0,0,-9999 if the target agent just died and was removed from engine.agents.
    const launchPoint = VisualMath.getUnitAnchor(source, engine);
    let targetPoint: Point3D;
    if ((target as Agent).id && (target as Agent).px !== undefined) {
      targetPoint = VisualMath.getUnitAnchor(target as Agent, engine);
    } else {
      targetPoint = VisualMath.resolveTargetPoint(targetId, engine);
    }

    const dx = targetPoint.x - launchPoint.x;
    const dy = targetPoint.y - launchPoint.y;
    const totalDist = Math.sqrt(dx * dx + dy * dy);
    const speed = skill.projectileSpeed || 800;

    const p = this.pool.pop() || this.createEmptyProjectile();
    p.active = true;
    p.id = engine.nextId("PRJ");
    p.sourceId = source.id;
    p.team = source.team;
    p.skill = skill;
    p.t = 0;
    p.totalDuration = Math.max(0.1, totalDist / speed);
    p.startX = launchPoint.x;
    p.startY = launchPoint.y;
    p.startZ = launchPoint.z;
    p.endX = targetPoint.x;
    p.endY = targetPoint.y;
    p.endZ = targetPoint.z;
    p.targetId = targetId;
    p.trail = [];

    const visualKey = skill.visualProjectileEffect || skill.visual || "BOLT";
    const def = PROJECTILE_VISUALS[visualKey] || DEFAULT_PROJECTILE;

    p.trajectoryInfo = {
      type: def.trajectory,
      arcHeight: def.arcHeight,
      wobbleFreq: def.wobbleFreq,
      wobbleAmp: def.wobbleAmp,
      spinSpeed: def.spinSpeed,
      spriteKey: def.spriteKey || visualKey,
      scale: def.scale,
    };

    this.updatePosition(p, engine);

    engine.projectiles.push(p);
    engine.events.push({
      type: "PROJECTILE_SPAWN",
      pos: { x: source.px, y: source.py },
      skill,
      targetId,
    });
  }

  private release(p: Projectile) {
    p.active = false;
    p.trail = [];
    this.pool.push(p);
  }

  private createEmptyProjectile(): Projectile {
    return {
      id: "",
      active: false,
      createdAt: 0,
      lifespan: 0,
      x: 0,
      y: 0,
      z: 0,
      t: 0,
      totalDuration: 0,
      startX: 0,
      startY: 0,
      startZ: 0,
      endX: 0,
      endY: 0,
      endZ: 0,
      targetId: "",
      targetPos: { x: 0, y: 0 },
      speed: 0,
      skill: {} as Skill,
      sourceId: "",
      team: Team.BLUE,
      trail: [],
      trajectoryInfo: { type: "LINEAR" },
    };
  }
}
