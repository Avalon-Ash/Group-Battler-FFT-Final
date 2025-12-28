
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Point } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET } from "../../../../constants"; 

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
             if (offsetP > 800) return;

             const lookupKey = p.skill.visualProjectileEffect || p.skill.id || p.skill.visual || 'BOLT';
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[lookupKey] || DEFAULT_PROJECTILE;

             // --- STRICT Z-AXIS CALCULATION ---
             const startHex = HexUtils.fromPx(p.startX, p.startY, engine.mapConfig);
             const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
             
             // Start Height: 
             // If stored, add to terrain. If not stored (legacy/spawned elsewhere), assume Chest Height.
             const hStartTerrain = getTerrainHeight(startHex.q, startHex.r);
             const hStart = (p.startZ !== undefined) ? (hStartTerrain + p.startZ) : (hStartTerrain + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET);
             
             // End Height: Dynamic.
             let hEnd = getTerrainHeight(targetHex.q, targetHex.r) + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET; 
             
             const targetAgent = engine.agents.find(a => a.id === p.targetId);
             if (targetAgent) {
                 const tHex = HexUtils.fromPx(targetAgent.px, targetAgent.py, engine.mapConfig);
                 const tTerrain = getTerrainHeight(tHex.q, tHex.r);
                 // Aim for Chest: Terrain + JumpHeight + BodyOffset + Hover
                 hEnd = tTerrain + targetAgent.physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET;
             }

             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             // Helper to calculate visual position
             const getVisualPos = (lx: number, ly: number, flightProgress: number): { x: number, y: number, shadowY: number, visualZ: number } => {
                 const t = flightProgress;
                 
                 // Linear height interpolation
                 const idealBaseH = hStart + (hEnd - hStart) * t;
                 
                 // Real-time terrain sample for shadow
                 const currentHex = HexUtils.fromPx(lx, ly, engine.mapConfig);
                 const currentGroundH = getTerrainHeight(currentHex.q, currentHex.r);

                 // Trajectory offsets
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
                 const totalZ = idealBaseH + heightOffset; 
                 
                 // Visual Y = BaseY - TotalZ
                 const visY = ly - totalZ + transOffset;
                 
                 // Shadow Y = BaseY - GroundZ
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
             const lookAheadDist = 10;
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             const nextProgress = Math.min(1, Math.max(0, Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy}) / totalDist));
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = def.spinSpeed ? (progress * def.spinSpeed) : 0;
             
             // 5. Trail
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

             // 6. Submit Op
             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             op.y = p.y + offsetP; 
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
