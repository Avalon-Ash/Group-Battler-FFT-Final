import { GameEngine } from "../../../game";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath, Point3D } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath";

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        for (const p of engine.projectiles) {
            if (!p.active) continue;

            const def: ProjectileVisualDef = PROJECTILE_VISUALS[p.skill.visualProjectileEffect || p.skill.visual || 'BOLT'] || DEFAULT_PROJECTILE;

            // 起點與終點來自 Projectile SSOT
            const startP: Point3D = { x: p.startX, y: p.startY, z: p.startZ };
            const endP: Point3D = { x: p.endX, y: p.endY, z: p.endZ };

            const getPosAt = (progress: number) => {
                if (def.trajectory === 'ARC') {
                    const arcH = Math.min(def.arcHeight || 150, Math.max(30, p.totalDist * 0.35));
                    return TrajectoryMath.parabolic(startP, endP, progress, arcH);
                }
                if (def.trajectory === 'WOBBLE') return TrajectoryMath.wobble(startP, endP, progress, def.wobbleAmp || 15, def.wobbleFreq || 2);
                return TrajectoryMath.linear(startP, endP, progress);
            };

            const current3D = getPosAt(p.t);
            const visAngle = TrajectoryMath.getProjectedAngle(getPosAt, p.t, 1.0);

            // 轉場偏置統合至 VisualMath
            const transOffset = VisualMath.getTransitionOffset(current3D.x, current3D.y, engine.mapConfig, transitionT, transitionPhase);
            const visY = VisualMath.getIsoVisualY(current3D.y, current3D.z) + transOffset;

            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            op.y = current3D.y; 
            op.z = 5000 + current3D.z; 
            
            op.pVisX = current3D.x;
            op.pVisY = visY;
            op.pAngle = visAngle;
            op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pSpin = def.spinSpeed ? (p.t * p.totalDuration * def.spinSpeed) : 0;
            op.pScale = def.scale || 1.0; 
            
            op.pTrail = [];
            const trailSamples = def.trailLength || 0;
            if (trailSamples > 0) {
                const step = 0.015; 
                for (let j = 1; j <= trailSamples; j++) {
                    const tPast = Math.max(0, p.t - j * step);
                    const past3D = getPosAt(tPast);
                    const pOffset = VisualMath.getTransitionOffset(past3D.x, past3D.y, engine.mapConfig, transitionT, transitionPhase);
                    const pastY = VisualMath.getIsoVisualY(past3D.y, past3D.z) + pOffset;
                    op.pTrail.push({ x: past3D.x, y: pastY });
                    if (tPast <= 0) break;
                }
            }
        }
    }
};