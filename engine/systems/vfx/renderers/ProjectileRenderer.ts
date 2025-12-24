
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { AssetManager } from "../../../assets";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset, isChaosStyle } from "../utils";

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

             let hStart = 0, hEnd = 0;
             let totalDist = Vector.dist({x: p.startX, y: p.startY}, p.targetPos);
             if (totalDist < 1) totalDist = 1;

             if (getTerrainHeight && engine.mapConfig) {
                 const startHex = HexUtils.fromPx(p.startX, p.startY, engine.mapConfig);
                 const targetHex = HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig);
                 hStart = getTerrainHeight(startHex.q, startHex.r);
                 hEnd = getTerrainHeight(targetHex.q, targetHex.r);
             }

             // Calculate Visual Position
             const getVisualPos = (lx: number, ly: number, flightProgress: number) => {
                 const t = flightProgress;
                 const trajectoryTerrainHeight = hStart + (hEnd - hStart) * t;
                 const currentHex = HexUtils.fromPx(lx, ly, engine.mapConfig);
                 const groundHeight = getTerrainHeight(currentHex.q, currentHex.r);

                 let arcOffset = 0;
                 if (p.skill.visual === 'ARROW' || p.skill.visual === 'BOMB') {
                     const distFactor = Math.min(150, totalDist * 0.25);
                     const baseArc = p.skill.visual === 'BOMB' ? 100 : 20;
                     const arcHeight = baseArc + distFactor;
                     arcOffset = 4 * arcHeight * t * (1 - t);
                 } else if (p.skill.visual === 'BOLT' || p.skill.visual === 'FIREBALL') {
                     const wobbleFreq = 0.2; 
                     const wobbleAmp = 10;
                     arcOffset = Math.sin(lx * wobbleFreq + ly * wobbleFreq) * wobbleAmp;
                 }
                 
                 const off = getTransitionOffset(lx, ly, engine.mapConfig, transitionT, transitionPhase);
                 return {
                     x: lx,
                     y: ly - trajectoryTerrainHeight - UNIT_CHEST_HEIGHT - arcOffset + off,
                     shadowY: ly - groundHeight + off
                 };
             };

             const currentDist = Vector.dist({x: p.startX, y: p.startY}, {x: p.x, y: p.y});
             const progress = Math.min(1, Math.max(0, currentDist / totalDist));
             const headVis = getVisualPos(p.x, p.y, progress);
             
             // Rotation
             const lookAheadDist = 10;
             const rawDir = Vector.normalize(Vector.sub(p.targetPos, {x: p.startX, y: p.startY}));
             const nextLx = p.x + rawDir.x * lookAheadDist;
             const nextLy = p.y + rawDir.y * lookAheadDist;
             const nextProgress = Math.min(1, Math.max(0, Vector.dist({x: p.startX, y: p.startY}, {x: nextLx, y: nextLy}) / totalDist));
             const nextVis = getVisualPos(nextLx, nextLy, nextProgress);
             
             const angle = Math.atan2(nextVis.y - headVis.y, nextVis.x - headVis.x);
             const spin = p.skill.visual === 'BOMB' ? (progress * 15) : 0;
             
             // Submit Op
             const op = renderList.next();
             op.type = RenderOpType.PROJECTILE;
             op.y = p.y + 50 + offsetP; 
             op.z = 20;
             
             op.proj = p;
             op.pVisX = headVis.x;
             op.pVisY = headVis.y;
             op.pVisShadowY = headVis.shadowY;
             op.pSkillVis = p.skill.visual || 'BOLT';
             op.pColor = p.skill.color;
             op.pIsUlt = p.skill.tag === 'ULT';
             op.pAngle = angle;
             op.pSpin = spin;
             
             // For trails, we might need more complex handling, but for now we'll calc active trail points in draw or here?
             // To be purely data-oriented, we should calc trail points here and pass arrays.
             // But to save allocs, we'll keep trail calc in renderer for now using `op.proj`.
        });
    }
};
