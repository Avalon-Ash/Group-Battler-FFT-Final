import { GameEngine } from "../../../game";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { ProjectileVisualDef, PROJECTILE_VISUALS, DEFAULT_PROJECTILE } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath";

const TRAIL_MAX = 20;

export const ProjectileRenderer = {
    submit(renderList: RenderList, engine: GameEngine, tIn: number, phase: 'IN' | 'OUT' | 'IDLE') {
        const cfg = engine.mapConfig;
        const projs = engine.projectiles;

        for (let i = 0; i < projs.length; i++) {
            const p = projs[i];
            const offset = getTransitionOffset(p.x, p.y, cfg, tIn, phase);
            if (offset > 800) continue;

            const visId = p.skill.visualProjectileEffect || p.skill.visual || 'BOLT';
            const def: ProjectileVisualDef = PROJECTILE_VISUALS[visId] || DEFAULT_PROJECTILE;
            
            const hStart = p.startZ || 0;
            const target3D = VisualMath.resolveTargetPoint(p.targetId, engine);
            const hEnd = target3D.z > -9000 ? target3D.z : hStart;

            const dx = p.targetPos.x - p.startX;
            const dy = p.targetPos.y - p.startY;
            const d2 = dx * dx + dy * dy;
            if (d2 < 1) continue;

            const curDx = p.x - p.startX;
            const curDy = p.y - p.startY;
            const progress = Math.min(1, Math.sqrt((curDx * curDx + curDy * curDy) / d2));

            const calc = (lx: number, ly: number, prg: number) => {
                const bZ = hStart + (hEnd - hStart) * prg;
                let hZ = 0;
                if (def.trajectory === 'ARC') {
                    hZ = TrajectoryMath.arcOffset(prg, def.arcHeight || 120) * (1 - Math.abs(hEnd - hStart) / 500);
                } else if (def.trajectory === 'WOBBLE') {
                    lx += TrajectoryMath.wobbleOffset(lx, ly, def.wobbleFreq || 0.2, def.wobbleAmp || 10);
                }
                const tr = getTransitionOffset(lx, ly, cfg, tIn, phase);
                return { x: lx, y: ly - (bZ + hZ) + tr, z: bZ + hZ };
            };

            const head = calc(p.x, p.y, progress);
            const look = calc(p.x + dx * 0.05, p.y + dy * 0.05, progress + 0.05);

            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            op.y = p.y + offset;
            op.z = head.z;
            op.proj = p;
            op.pVisX = head.x;
            op.pVisY = head.y;
            op.pVisShadowY = p.y + offset;
            op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = def.colorOverride || p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pAngle = Math.atan2(look.y - head.y, look.x - head.x);
            op.pSpin = def.spinSpeed ? progress * def.spinSpeed * 10 : 0;

            if ((def.trailLength || 0) > 0 && p.trailCount > 1) {
                const max = Math.min(p.trailCount, def.trailLength || 5);
                for (let j = 0; j < max; j++) {
                    const idx = (p.trailIndex - 1 - j + TRAIL_MAX) % TRAIL_MAX;
                    const pt = p.trail[idx];
                    const distToPointSq = (pt.x - p.startX)**2 + (pt.y - p.startY)**2;
                    const tp = Math.sqrt(distToPointSq / d2);
                    const v = calc(pt.x, pt.y, tp);
                    op.pTrail.push({ x: v.x, y: v.y });
                }
            }
        }
    }
};