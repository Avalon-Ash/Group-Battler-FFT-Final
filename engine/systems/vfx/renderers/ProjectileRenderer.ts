
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { AssetManager } from "../../../assets";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Point } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../../data/projectile_visuals";

const UNIT_CHEST_HEIGHT = 40;

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
             if (offsetP > 500) return;

             // 1. Resolve Definition (ID > Visual Name > Default)
             const def: ProjectileVisualDef = PROJECTILE_VISUALS[p.skill.id] || PROJECTILE_VISUALS[p.skill.visual || 'BOLT'] || DEFAULT_PROJECTILE;

             let hStart = 0, hEnd = 0;
             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             if (getTerrainHeight && engine.mapConfig) {
                 const startHex = HexUtils.fromPx(p.startX, p.startY, engine.mapConfig);
                 const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
                 hStart = getTerrainHeight(startHex.q, startHex.r) + (p.startZ || 0);
                 hEnd = getTerrainHeight(targetHex.q, targetHex.r);
             }

             const getVisualPos = (lx: number, ly: number, flightProgress: number): { x: number, y: number, shadowY: number } => {
                 const t = flightProgress;
                 const trajectoryTerrainHeight = hStart + (hEnd - hStart) * t;
                 const currentHex = HexUtils.fromPx(lx, ly, engine.mapConfig);
                 const groundHeight = getTerrainHeight(currentHex.q, currentHex.r);

                 // --- TRAJECTORY LOGIC ---
                 let arcOffset = 0;
                 let lateralOffset = 0;

                 if (def.trajectory === 'ARC') {
                     const distFactor = Math.min(150, totalDist * 0.25);
                     const baseArc = def.arcHeight || 50;
                     const arcHeight = baseArc + distFactor;
                     arcOffset = 4 * arcHeight * t * (1 - t);
                 } 
                 else if (def.trajectory === 'WOBBLE') {
                     const freq = def.wobbleFreq || 0.2;
                     const amp = def.wobbleAmp || 10;
                     lateralOffset = Math.sin(lx * freq + ly * freq) * amp;
                 }
                 
                 const off = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 return {
                     x: lx,
                     y: ly - trajectoryTerrainHeight - UNIT_CHEST_HEIGHT - arcOffset - lateralOffset + off,
                     shadowY: ly - groundHeight + off
                 };
             };

             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));
             const headVis = getVisualPos(p.x, p.y, progress);
             
             // Look Ahead for Rotation
             const lookAheadDist = 10;
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             const nextProgress = Math.min(1, Math.max(0, Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy}) / totalDist));
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = def.spinSpeed ? (progress * def.spinSpeed) : 0;
             
             // Trail Generation
             const visualTrail: Point[] = [];
             if ((def.trailLength || 0) > 0 && p.trail.length > 1) {
                 visualTrail.push({ x: headVis.x, y: headVis.y });
                 // Limit trail points based on config
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

             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             op.y = p.y + 50 + offsetP; 
             op.z = 20;
             
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
             
             // Pass Render Type info via existing fields (or repurpose)
             // We'll reuse pSkillVis for 'BEAM' logic inside GameRenderer if renderType is RAY/BEAM
             if (def.renderType === 'RAY' || def.renderType === 'BEAM') {
                 op.pSkillVis = 'BEAM'; // Triggers beam drawer in renderer
             }
        });
    }
};
