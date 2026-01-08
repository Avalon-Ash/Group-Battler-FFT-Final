
import { GameEngine } from "../../../game";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath, Point3D } from "../../../math/VisualMath";
import { ISO_SCALE_Y } from "../../../../constants";

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

            // 1. Use Logic Position (SSOT)
            // No more TrajectoryMath.calculate here. Logic has already done it.
            const current3D = { x: p.x, y: p.y, z: p.z };

            // 2. Calculate Visual Angle (Derivative)
            // We still need the formula to calculate the angle tangent
            const getPosAt = (t: number) => {
                const start: Point3D = { x: p.startX, y: p.startY, z: p.startZ };
                const end: Point3D = { x: p.endX, y: p.endY, z: p.endZ };
                if (traj.type === 'ARC') return TrajectoryMath.parabolic(start, end, t, traj.arcHeight || 150);
                if (traj.type === 'WOBBLE') return TrajectoryMath.wobble(start, end, t, traj.wobbleAmp || 15, traj.wobbleFreq || 2);
                return TrajectoryMath.linear(start, end, t);
            };
            
            const visAngle = TrajectoryMath.getProjectedAngle(getPosAt, p.t, ISO_SCALE_Y);

            // 3. Project to Screen
            const transOffset = VisualMath.getTransitionOffset(current3D.x, current3D.y, engine.mapConfig, transitionT, transitionPhase);
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
            // Use visuals DB or default for trail length, as it's purely cosmetic and not in SSOT Logic state
            // Optimization: Just use a standard length or infer from type
            const trailSamples = p.skill.tag === 'ULT' ? 20 : 10;
            
            if (trailSamples > 0) {
                const step = 0.015; 
                for (let j = 1; j <= trailSamples; j++) {
                    const tPast = Math.max(0, p.t - j * step);
                    // We must recalculate past positions as we don't store history in Logic
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
