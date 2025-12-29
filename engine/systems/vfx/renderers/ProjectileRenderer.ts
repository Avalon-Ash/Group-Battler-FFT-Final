import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { ProjectileVisualDef, PROJECTILE_VISUALS, DEFAULT_PROJECTILE } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath";

/**
 * Projectile Trail Buffer Capacity
 */
const TRAIL_MAX = 20;

export const ProjectileRenderer = {
    submit(renderList: RenderList, engine: GameEngine, transitionT: number, transitionPhase: 'IN' | 'OUT' | 'IDLE') {
        const config = engine.mapConfig;
        for (const p of engine.projectiles) {
            const offsetP = getTransitionOffset(p.x, p.y, config, transitionT, transitionPhase);
            if (offsetP > 800) continue;

            const def: ProjectileVisualDef = PROJECTILE_VISUALS[p.skill.visualProjectileEffect || p.skill.visual || 'BOLT'] || DEFAULT_PROJECTILE;
            const hStart = p.startZ || 0;
            const target3D = VisualMath.resolveTargetPoint(p.targetId, engine);
            const hEnd = target3D.z > -9000 ? target3D.z : hStart;

            const dxS = p.targetPos.x - p.startX;
            const dyS = p.targetPos.y - p.startY;
            const totalDistSq = dxS * dxS + dyS * dyS;
            if (totalDistSq < 1) continue;

            const dxC = p.x - p.startX;
            const dyC = p.y - p.startY;
            const progress = Math.min(1, Math.sqrt((dxC * dxC + dyC * dyC) / totalDistSq));

            const getPos = (lx: number, ly: number, t: number) => {
                const baseZ = hStart + (hEnd - hStart) * t;
                let hz = 0;
                if (def.trajectory === 'ARC') {
                    hz = TrajectoryMath.arcOffset(t, def.arcHeight || 120) * (1 - Math.abs(hEnd - hStart) / 500);
                } else if (def.trajectory === 'WOBBLE') {
                    lx += TrajectoryMath.wobbleOffset(lx, ly, def.wobbleFreq || 0.2, def.wobbleAmp || 10);
                }
                const trans = getTransitionOffset(lx, ly, config, transitionT, transitionPhase);
                return { x: lx, y: ly - (baseZ + hz) + trans, z: baseZ + hz };
            };

            const head = getPos(p.x, p.y, progress);
            const next = getPos(p.x + (p.targetPos.x - p.startX) * 0.05, p.y + (p.targetPos.y - p.startY) * 0.05, progress + 0.05);

            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            op.y = p.y + offsetP;
            op.z = head.z;
            op.proj = p;
            op.pVisX = head.x;
            op.pVisY = head.y;
            // Define shadow vertical anchor
            op.pVisShadowY = p.y + offsetP;
            op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = def.colorOverride || p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pAngle = Math.atan2(next.y - head.y, next.x - head.x);
            op.pSpin = def.spinSpeed ? progress * def.spinSpeed * 10 : 0;

            op.pTrail = [];
            if ((def.trailLength || 0) > 0 && p.trailCount > 1) {
                const max = Math.min(p.trailCount, def.trailLength || 5);
                for (let j = 0; j < max; j++) {
                    const idx = (p.trailIndex - 1 - j + TRAIL_MAX) % TRAIL_MAX;
                    const pt = p.trail[idx];
                    const dxt = pt.x - p.startX;
                    const dyt = pt.y - p.startY;
                    const t = Math.sqrt((dxt * dxt + dyt * dyt) / totalDistSq);
                    const tv = getPos(pt.x, pt.y, t);
                    op.pTrail.push({ x: tv.x, y: tv.y });
                }
            }
        }
    }
};