import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Point, Projectile } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath";

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        const sorted = engine.projectiles.slice().sort((a, b) => {
            const keyA = a.skill.visualProjectileEffect || a.skill.visual || 'BOLT';
            const keyB = b.skill.visualProjectileEffect || b.skill.visual || 'BOLT';
            return keyA.localeCompare(keyB);
        });

        for (const p of sorted) {
             const offsetP = getTransitionOffset(p.x, p.y, engine.mapConfig, transitionT, transitionPhase);
             if (offsetP > 800) continue;

             const lookupKey = p.skill.visualProjectileEffect || p.skill.id || p.skill.visual || 'BOLT';
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[lookupKey] || DEFAULT_PROJECTILE;

             const hStart = p.startZ || 0;
             const targetPoint3D = VisualMath.resolveTargetPoint(p.targetId, engine);
             const hEnd = targetPoint3D.z > -9000 ? targetPoint3D.z : hStart;

             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));

             const getVisualPos = (lx: number, ly: number, flightProgress: number) => {
                 const t = flightProgress;
                 const baseH = hStart + (hEnd - hStart) * t;
                 
                 let heightOffset = 0;
                 if (def.trajectory === 'ARC') {
                     const heightDelta = hEnd - hStart;
                     const arcBase = (def.arcHeight || 120);
                     const arcReduction = Math.max(0.2, 1 - Math.abs(heightDelta) / 400);
                     heightOffset = TrajectoryMath.arcOffset(t, arcBase * arcReduction);
                 } else if (def.trajectory === 'WOBBLE') {
                     const lateral = TrajectoryMath.wobbleOffset(lx, ly, def.wobbleFreq || 0.2, def.wobbleAmp || 10);
                     lx += lateral;
                 }

                 const trans = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 return { x: lx, y: ly - (baseH + heightOffset) + trans, z: baseH + heightOffset };
             };

             const headVis = getVisualPos(p.x, p.y, progress);
             
             const lookAheadDist = 30; 
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextVis = getVisualPos(p.x + rawDir.x * lookAheadDist, p.y + rawDir.y * lookAheadDist, progress + (lookAheadDist/totalDist));
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);

             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             op.y = p.y + offsetP; 
             op.z = headVis.z; 
             
             op.proj = p;
             op.pVisX = headVis.x;
             op.pVisY = headVis.y;
             op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
             op.pColor = def.colorOverride || p.skill.color;
             op.pIsUlt = p.skill.tag === 'ULT';
             op.pAngle = angle;
             op.pSpin = def.spinSpeed ? (progress * def.spinSpeed * 10) : 0;
             
             op.pTrail = [];
             if ((def.trailLength || 0) > 0 && p.trail.length > 1) {
                 const step = Math.max(1, Math.floor(p.trail.length / (def.trailLength || 5)));
                 for(let i = p.trail.length-1; i >= 0; i -= step) {
                     const tp = p.trail[i];
                     const tDist = Vector.dist({x: p.startX, y: p.startY}, tp);
                     const tv = getVisualPos(tp.x, tp.y, tDist / totalDist);
                     op.pTrail.push({x: tv.x, y: tv.y});
                     if (op.pTrail.length > (def.trailLength || 5)) break;
                 }
             }
        }
    }
};