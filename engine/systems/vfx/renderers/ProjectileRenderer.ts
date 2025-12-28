
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Point } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath"; // CORRECTED PATH

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        getTerrainHeight: (q: number, r: number) => number, // Kept for compatibility but redundant with VisualMath
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        engine.projectiles.forEach(p => {
             const offsetP = getTransitionOffset(p.x, p.y, engine.mapConfig, transitionT, transitionPhase);
             if (offsetP > 800) return;

             const lookupKey = p.skill.visualProjectileEffect || p.skill.id || p.skill.visual || 'BOLT';
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[lookupKey] || DEFAULT_PROJECTILE;

             // --- STRICT Z-AXIS CALCULATION ---
             // Start Z is stored in the projectile at spawn time (via VisualMath)
             const hStart = p.startZ || 0;
             
             // End Height: Dynamic resolution based on Target ID
             const targetPoint3D = VisualMath.resolveTargetPoint(p.targetId, engine);
             const hEnd = targetPoint3D.z;

             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             // Helper to calculate visual position at progress t
             const getVisualPos = (lx: number, ly: number, flightProgress: number): { x: number, y: number, shadowY: number, visualZ: number } => {
                 const t = flightProgress;
                 
                 // Linear height interpolation (Base Path)
                 const idealBaseH = hStart + (hEnd - hStart) * t;
                 
                 // Trajectory offsets (Arc / Wobble)
                 let heightOffset = 0;
                 let lateralOffset = 0;

                 if (def.trajectory === 'ARC') {
                     // Fixed arc height logic to be more consistent
                     const baseArc = def.arcHeight || 120;
                     // Slight distance scaling to avoid huge arcs on short shots
                     const distScale = Math.min(1.0, totalDist / 300);
                     heightOffset = TrajectoryMath.arcOffset(t, baseArc * distScale);
                 } 
                 else if (def.trajectory === 'WOBBLE') {
                     const freq = def.wobbleFreq || 0.2;
                     const amp = def.wobbleAmp || 10;
                     lateralOffset = TrajectoryMath.wobbleOffset(lx, ly, freq, amp);
                 }
                 
                 // Apply Transition Offset (Map enter/exit animation)
                 const transOffset = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 
                 // Final Z
                 const totalZ = idealBaseH + heightOffset; 
                 
                 // Visual Y = BaseY - TotalZ + Transition
                 const visY = ly - totalZ + transOffset;
                 
                 // Shadow Y: We need the terrain height at THIS specific point [lx, ly] for the shadow
                 const currentHex = HexUtils.fromPx(lx, ly, engine.mapConfig);
                 const currentGroundH = engine.map.getTerrainHeight(currentHex.q, currentHex.r); // Use Engine map directly
                 const shadY = ly - currentGroundH + transOffset;

                 return {
                     x: lx + lateralOffset,
                     y: visY,
                     shadowY: shadY,
                     visualZ: totalZ
                 };
             };

             // 3. Current Position Calculation
             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));
             const headVis = getVisualPos(p.x, p.y, progress);
             
             // 4. Rotation Lookahead
             const lookAheadDist = 20; // Increased lookahead for smoother rotation
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             
             // Clamp next progress
             const nextDist = Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy});
             const nextProgress = Math.min(1, Math.max(0, nextDist / totalDist));
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = def.spinSpeed ? (progress * def.spinSpeed) : 0;
             
             // 5. Trail Generation
             const visualTrail: Point[] = [];
             if ((def.trailLength || 0) > 0 && p.trail.length > 1) {
                 visualTrail.push({ x: headVis.x, y: headVis.y });
                 // Limit trail points
                 const pointsToProcess = Math.min(p.trail.length, (def.trailLength || 5) + 2);
                 
                 // Trace back
                 for (let i = p.trail.length - 1; i >= p.trail.length - pointsToProcess; i--) {
                     if (i < 0) break;
                     const tp = p.trail[i];
                     const tDist = Vector.dist({x: p.startX, y: p.startY}, tp);
                     const tProg = Math.min(1, Math.max(0, tDist / totalDist));
                     const tv = getVisualPos(tp.x, tp.y, tProg);
                     visualTrail.push({ x: tv.x, y: tv.y });
                 }
             }

             // 6. Submit Op
             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             
             // Z-Sort: Projectiles fly relatively high
             op.y = p.y + offsetP; 
             op.z = headVis.visualZ; 
             
             op.proj = p;
             op.pVisX = headVis.x;
             op.pVisY = headVis.y;
             op.pVisShadowY = headVis.shadowY;
             op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
             op.pColor = def.colorOverride || p.skill.color;
             op.pIsUlt = p.skill.tag === 'ULT';
             op.pAngle = angle;
             op.pSpin = spin;
             op.pTrail = visualTrail; 
             
             // Override visual for beams
             if (def.renderType === 'RAY' || def.renderType === 'BEAM') {
                 op.pSkillVis = 'BEAM'; 
             }
        });
    }
};
