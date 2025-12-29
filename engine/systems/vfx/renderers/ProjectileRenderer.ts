
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Projectile } from "../../../../types";
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
        const sorted = engine.projectiles.slice().sort((a, b) => {
            const keyA = a.skill.visualProjectileEffect || a.skill.visual || 'BOLT';
            const keyB = b.skill.visualProjectileEffect || b.skill.visual || 'BOLT';
            return keyA.localeCompare(keyB);
        });

        const now = engine.battleTime;

        for (const p of sorted) {
             const lookupKey = p.skill.visualProjectileEffect || p.skill.id || p.skill.visual || 'BOLT';
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[lookupKey] || DEFAULT_PROJECTILE;

             // 1. Resolve Start & End Points (3D)
             const startPoint: Point3D = { x: p.startX, y: p.startY, z: p.startZ || 0 };
             const targetPoint = VisualMath.resolveTargetPoint(p.targetId, engine);
             
             // Fallback if target invalid (use projectile's last known target pos + map height)
             let endPoint: Point3D = targetPoint;
             if (endPoint.z < -9000) {
                 const h = engine.map.getTerrainHeight(0, 0); // Approx
                 endPoint = { x: p.targetPos.x, y: p.targetPos.y, z: h + 20 };
             }

             // 2. Calculate Analytic Progress (Time-based for smoothness)
             const totalDist = Vector.dist({x: startPoint.x, y: startPoint.y}, {x: endPoint.x, y: endPoint.y});
             const speed = Math.max(100, p.speed);
             const duration = totalDist / speed;
             const age = now - p.createdAt;
             
             // Clamp progress 0..1, but allow slight overshoot for impact frame
             const progress = Math.min(1.0, Math.max(0.0, age / duration));

             // 3. Trajectory Function
             const getPosAt = (t: number): Point3D => {
                 let pos: Point3D;
                 if (def.trajectory === 'ARC') {
                     const arcH = def.arcHeight || 120;
                     pos = TrajectoryMath.parabolic(startPoint, endPoint, t, arcH);
                 } else if (def.trajectory === 'WOBBLE') {
                     pos = TrajectoryMath.wobble(startPoint, endPoint, t, def.wobbleAmp || 10, def.wobbleFreq || 2);
                 } else if (def.renderType === 'BEAM') { // Beam trajectory implies 'INSTANT' usually
                     pos = TrajectoryMath.linear(startPoint, endPoint, t);
                 } else {
                     // Default Linear
                     pos = TrajectoryMath.linear(startPoint, endPoint, t);
                 }
                 return pos;
             };

             // 4. Calculate Current Position & Rotation
             const currentPos3D = getPosAt(progress);
             
             // Look ahead slightly for rotation tangent
             const lookAheadT = Math.min(1.0, progress + 0.05);
             const nextPos3D = getPosAt(lookAheadT);
             
             // Calculate visual Y (projected 3D -> 2D screen space)
             // We apply transition offset here
             const transOffset = getTransitionOffset(currentPos3D.x, currentPos3D.y, engine.mapConfig, transitionT, transitionPhase);
             
             // VISUAL Y = GroundY - HeightZ
             // Project both current and next to get 2D angle
             const visX = currentPos3D.x;
             const visY = currentPos3D.y - currentPos3D.z + transOffset;
             
             const nextVisX = nextPos3D.x;
             const nextVisY = nextPos3D.y - nextPos3D.z + transOffset; // Height affects angle!

             const angle = Math.atan2(nextVisY - visY, nextVisX - visX);

             // Cull off-screen
             if (Math.abs(transOffset) > 800) continue;

             // 5. Submit Render Op
             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             
             // Sorting: Use ground Y for sort, but modify by Z height logic in RenderList
             op.y = currentPos3D.y + transOffset; 
             op.z = currentPos3D.z;
             
             op.proj = p;
             op.pVisX = visX;
             op.pVisY = visY;
             // Store shadow Y (Ground level)
             op.pVisShadowY = currentPos3D.y - engine.map.getTerrainHeight(
                 HexUtils.fromPx(visX, currentPos3D.y, engine.mapConfig).q,
                 HexUtils.fromPx(visX, currentPos3D.y, engine.mapConfig).r
             ) + transOffset;

             op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
             op.pColor = def.colorOverride || p.skill.color;
             op.pIsUlt = p.skill.tag === 'ULT';
             op.pAngle = angle;
             op.pSpin = def.spinSpeed ? (age * def.spinSpeed) : 0;
             
             // 6. Generate Trail
             // Analytic sampling for smooth curves
             op.pTrail = [];
             if ((def.trailLength || 0) > 0) {
                 const trailSamples = def.trailLength || 5;
                 const step = 0.02 * (1000 / speed); // Adjust step size based on speed
                 
                 for(let i = 1; i <= trailSamples; i++) {
                     const tSample = Math.max(0, progress - (i * step));
                     const sample3D = getPosAt(tSample);
                     const sTrans = getTransitionOffset(sample3D.x, sample3D.y, engine.mapConfig, transitionT, transitionPhase);
                     const sVisY = sample3D.y - sample3D.z + sTrans;
                     
                     op.pTrail.push({x: sample3D.x, y: sVisY});
                     
                     // Optimization: Stop if we hit start
                     if (tSample <= 0) break;
                 }
             }
        }
    }
};
