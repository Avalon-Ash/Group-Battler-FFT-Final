
import { GameEngine } from "../../../game";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath, Point3D } from "../../../math/VisualMath";
import { VFX_RENDER, ISO_SCALE_Y } from "../../../../constants";

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
            // Un-scale Y back to pure 3D for correct trajectory math and angle calculation
            const start3D: Point3D = { x: p.startX, y: p.startY / ISO_SCALE_Y, z: p.startZ };
            const end3D: Point3D = { x: p.endX, y: p.endY / ISO_SCALE_Y, z: p.endZ };

            // 1. Get Pure 3D Position (SSOT)
            const current3D = TrajectoryMath.evaluate(traj, start3D, end3D, p.t);

            // 2. Calculate Visual Angle (Derivative via SSOT Projection)
            // Use TrajectoryMath to predict a tiny step forward/backward in 3D
            // Then use VisualMath to project BOTH points to 2D screen space and find the angle.
            // This guarantees the sprite angle matches the visual parabolic curve exactly.
            
            let tNext = Math.min(1.0, p.t + 0.01);
            let visAngle;

            if (p.t >= 0.99) {
                // At end of flight: look backwards (Current - Prev)
                const tPrev = p.t - 0.01;
                const prev3D = TrajectoryMath.evaluate(traj, start3D, end3D, tPrev);
                visAngle = VisualMath.calculateProjectedAngle(prev3D, current3D);
            } else {
                // Normal flight: look forwards (Next - Current)
                const next3D = TrajectoryMath.evaluate(traj, start3D, end3D, tNext);
                visAngle = VisualMath.calculateProjectedAngle(current3D, next3D);
            }

            // 3. Project to Screen
            const transOffset = VisualMath.getTransitionOffset(current3D.x, current3D.y * ISO_SCALE_Y, engine.mapConfig, transitionT, transitionPhase);
            // Use SSOT Projection for final Y position
            const visY = VisualMath.getIsoVisualY(current3D.y * ISO_SCALE_Y, current3D.z) + transOffset;

            const dist = Math.sqrt((end3D.x - start3D.x)**2 + (end3D.y - start3D.y)**2);
            const speed = dist / Math.max(0.01, p.totalDuration); 
            
            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            op.y = current3D.y * ISO_SCALE_Y; 
            op.z = 5000 + current3D.z; 
            
            op.pVisX = current3D.x;
            op.pVisY = visY;
            op.pAngle = visAngle;
            op.pSkillVis = traj.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pSpin = traj.spinSpeed ? (p.t * p.totalDuration * traj.spinSpeed) : 0;
            op.pScale = traj.scale || 1.0; 
            op.pSpeed = speed; // Pass speed for motion blur scaling
            
            // 4. Trails (Calculated purely visually backwards from SSOT position)
            op.pTrail = [];
            const trailSamples = p.skill.tag === 'ULT' ? 24 : 12;
            
            if (trailSamples > 0) {
                // Determine step size based on actual pixel distance to ensure smooth physical gap 
                // between trail points. Fast projectiles need smaller 't' steps to not appear choppy.
                // we want a sample roughly every 15-20 pixels
                const optimalStepDist = VFX_RENDER.TRAIL_STEP_DIST;
                let step = optimalStepDist / Math.max(1, dist);
                
                // Clamp step to avoid excessive iterations, but ensure dense enough for fast projectiles
                step = Math.max(0.005, Math.min(0.05, step));

                for (let j = 1; j <= trailSamples; j++) {
                    const tPast = Math.max(0, p.t - j * step);
                    // Use SSOT Evaluate for past points in 3D
                    const past3D = TrajectoryMath.evaluate(traj, start3D, end3D, tPast);
                    
                    const pOffset = VisualMath.getTransitionOffset(past3D.x, past3D.y * ISO_SCALE_Y, engine.mapConfig, transitionT, transitionPhase);
                    const pastY = VisualMath.getIsoVisualY(past3D.y * ISO_SCALE_Y, past3D.z) + pOffset;
                    op.pTrail.push({ x: past3D.x, y: pastY });
                    if (tPast <= 0) break;
                }
            }
        }
    }
};
