
import { GameEngine } from "../../../game";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath, Point3D } from "../../../math/VisualMath";

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        for (const p of engine.projectiles) {
            if (!p.active) continue;

            const traj = p.trajectoryInfo;
            const start: Point3D = { x: p.startX, y: p.startY, z: p.startZ };
            const end: Point3D = { x: p.endX, y: p.endY, z: p.endZ };

            // 1. Get Logic Position (Already calculated by ProjectileSystem)
            const current3D = { x: p.x, y: p.y, z: p.z };

            // 2. Calculate Visual Angle (Derivative)
            // Use TrajectoryMath to predict slightly future position
            // Then use VisualMath to project both points and get the 2D angle
            
            // Sample a bit ahead to get the tangent
            let tNext = p.t + 0.01;
            // Handle end-of-flight boundary (use backward diff if at end)
            if (tNext > 1.0) tNext = p.t - 0.01; 
            
            const next3D = TrajectoryMath.evaluate(traj, start, end, tNext);
            
            // If at end, vector is p -> prev, so angle needs flip? 
            // calculateProjectedAngle(p1, p2) gives angle from p1 to p2.
            // If p.t < 1.0, we want angle(current, next).
            // If p.t >= 1.0, we used backward diff (next is actually prev), so we want angle(prev, current).
            
            let visAngle;
            if (p.t >= 1.0) {
                visAngle = VisualMath.calculateProjectedAngle(next3D, current3D);
            } else {
                visAngle = VisualMath.calculateProjectedAngle(current3D, next3D);
            }

            // 3. Project to Screen
            const transOffset = VisualMath.getTransitionOffset(current3D.x, current3D.y, engine.mapConfig, transitionT, transitionPhase);
            // Use SSOT Projection
            const visY = VisualMath.getIsoVisualY(current3D.y, current3D.z) + transOffset;

            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            op.y = current3D.y; 
            op.z = 5000 + current3D.z; 
            
            op.pVisX = current3D.x;
            op.pVisY = visY;
            op.pAngle = visAngle;
            op.pSkillVis = traj.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pSpin = traj.spinSpeed ? (p.t * p.totalDuration * traj.spinSpeed) : 0;
            op.pScale = traj.scale || 1.0; 
            
            // 4. Trails (Calculated purely visually backwards from SSOT position)
            op.pTrail = [];
            const trailSamples = p.skill.tag === 'ULT' ? 20 : 10;
            
            if (trailSamples > 0) {
                const step = 0.015; 
                for (let j = 1; j <= trailSamples; j++) {
                    const tPast = Math.max(0, p.t - j * step);
                    // Use SSOT Evaluate for past points
                    const past3D = TrajectoryMath.evaluate(traj, start, end, tPast);
                    
                    const pOffset = VisualMath.getTransitionOffset(past3D.x, past3D.y, engine.mapConfig, transitionT, transitionPhase);
                    const pastY = VisualMath.getIsoVisualY(past3D.y, past3D.z) + pOffset;
                    op.pTrail.push({ x: past3D.x, y: pastY });
                    if (tPast <= 0) break;
                }
            }
        }
    }
};
