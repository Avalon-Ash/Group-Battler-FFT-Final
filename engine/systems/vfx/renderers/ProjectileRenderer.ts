
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Point } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { UNIT_BODY_OFFSET } from "../../../../constants"; // Replaces UNIT_CHEST_HEIGHT for consistency

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        getTerrainHeight: (q: number, r: number) => number,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        engine.projectiles.forEach(p => {
             const offsetP = getTransitionOffset(p.x, p.y, engine.mapConfig, transitionT, transitionPhase);
             
             // Cull if off-screen (transition logic)
             if (offsetP > 800) return;

             // 1. Resolve Visual Definition
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[p.skill.id] || PROJECTILE_VISUALS[p.skill.visual || 'BOLT'] || DEFAULT_PROJECTILE;

             // 2. Trajectory Math
             // Calculate Logical Start/End Height
             const startHex = HexUtils.fromPx(p.startX, p.startY, engine.mapConfig);
             const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
             
             // Use stored startZ if available (for flying units), else terrain height
             const hStart = (p.startZ !== undefined) ? (getTerrainHeight(startHex.q, startHex.r) + p.startZ) : (getTerrainHeight(startHex.q, startHex.r) + UNIT_BODY_OFFSET);
             const hEnd = getTerrainHeight(targetHex.q, targetHex.r) + UNIT_BODY_OFFSET;

             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             // Helper to calculate visual position at any progress point t (0 to 1)
             const getVisualPos = (lx: number, ly: number, flightProgress: number): { x: number, y: number, shadowY: number, visualZ: number } => {
                 const t = flightProgress;
                 
                 // Linear interpolation of the "Ideal" trajectory height line
                 const idealBaseH = hStart + (hEnd - hStart) * t;
                 
                 // Sample REAL terrain height at current position for Shadow/Clipping check
                 const currentHex = HexUtils.fromPx(lx, ly, engine.mapConfig);
                 const currentGroundH = getTerrainHeight(currentHex.q, currentHex.r);

                 // --- TRAJECTORY OFFSETS ---
                 let heightOffset = 0;
                 let lateralOffset = 0;

                 if (def.trajectory === 'ARC') {
                     const distFactor = Math.min(150, totalDist * 0.25);
                     const baseArc = def.arcHeight || 50;
                     const arcHeight = baseArc + distFactor;
                     heightOffset = TrajectoryMath.arcOffset(t, arcHeight);
                 } 
                 else if (def.trajectory === 'WOBBLE') {
                     const freq = def.wobbleFreq || 0.2;
                     const amp = def.wobbleAmp || 10;
                     lateralOffset = TrajectoryMath.wobbleOffset(lx, ly, freq, amp);
                 }
                 
                 const transOffset = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 
                 // Total Visual Height (Z) from ground zero
                 const totalZ = idealBaseH + heightOffset; 
                 
                 // The visual Y coordinate on screen
                 // Y_screen = Y_iso - Z_total
                 const visY = ly - totalZ + transOffset;
                 
                 // The shadow Y coordinate
                 // Y_shadow = Y_iso - Z_ground
                 const shadY = ly - currentGroundH + transOffset;

                 return {
                     x: lx + lateralOffset, // Apply wobble to X
                     y: visY,
                     shadowY: shadY,
                     visualZ: totalZ
                 };
             };

             // 3. Current Position Calculation
             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));
             const headVis = getVisualPos(p.x, p.y, progress);
             
             // 4. Rotation Calculation (Look Ahead)
             const lookAheadDist = 10;
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             const nextProgress = Math.min(1, Math.max(0, Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy}) / totalDist));
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             // Angle in screen space
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = def.spinSpeed ? (progress * def.spinSpeed) : 0;
             
             // 5. Trail Generation (History)
             const visualTrail: Point[] = [];
             if ((def.trailLength || 0) > 0 && p.trail.length > 1) {
                 visualTrail.push({ x: headVis.x, y: headVis.y });
                 
                 const pointsToProcess = Math.min(p.trail.length, (def.trailLength || 5) + 1);
                 
                 for (let i = p.trail.length - 1; i >= p.trail.length - pointsToProcess; i--) {
                     if (i < 0) break;
                     const tp = p.trail[i];
                     const tDist = Vector.dist({x: p.startX, y: p.startY}, tp);
                     const tProg = Math.min(1, Math.max(0, tDist / totalDist));
                     const tv = getVisualPos(tp.x, tp.y, tProg);
                     visualTrail.push({ x: tv.x, y: tv.y });
                 }
             }

             // 6. Create Render Op
             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             
             // Sort Order:
             // Base sorting on Y (ground position).
             // High flying projectiles should render 'in front' of the tile they are over, 
             // but 'behind' a wall that is physically in front of them.
             // Standard painter's algo handles this via p.y
             op.y = p.y + offsetP; 
             
             // Z-Bias: Ensure projectiles draw above units/terrain on the same tile
             op.z = 50; 
             
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
             
             if (def.renderType === 'RAY' || def.renderType === 'BEAM') {
                 op.pSkillVis = 'BEAM'; 
             }
        });
    }
};
