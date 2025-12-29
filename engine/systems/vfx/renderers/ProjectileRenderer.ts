
import { GameEngine } from "../../../game";
import { Vector, HexUtils } from "../../../utils";
import { RenderList, RenderOpType } from "../../../renderers/RenderList";
import { getTransitionOffset } from "../utils";
import { Projectile } from "../../../../types";
import { PROJECTILE_VISUALS, DEFAULT_PROJECTILE, ProjectileVisualDef } from "../../../../data/vfx/projectile_visuals";
import { TrajectoryMath, Point3D } from "../../../math/TrajectoryMath";
import { VisualMath } from "../../../math/VisualMath";
import { ISO_SCALE_Y } from "../../../../constants";

export const ProjectileRenderer = {
    submit(
        renderList: RenderList,
        engine: GameEngine,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE'
    ) {
        const now = engine.battleTime;

        for (const p of engine.projectiles) {
            if (!p.active) continue;

            const def: ProjectileVisualDef = PROJECTILE_VISUALS[p.skill.visualProjectileEffect || p.skill.visual || 'BOLT'] || DEFAULT_PROJECTILE;

            // 1. 建立解析座標函數
            const startP: Point3D = { x: p.startX, y: p.startY, z: p.startZ || 30 };
            const targetP = VisualMath.resolveTargetPoint(p.targetId, engine);
            
            // 安全邊界處理
            let endP: Point3D = targetP;
            if (endP.z < -9000) {
                 const h = engine.map.getTerrainHeight(HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig).q, HexUtils.fromPx(p.targetPos.x, p.targetPos.y, engine.mapConfig).r);
                 endP = { x: p.targetPos.x, y: p.targetPos.y, z: h + 25 };
            }

            const totalDist = Math.sqrt((endP.x - startP.x)**2 + (endP.y - startP.y)**2);
            const duration = totalDist / Math.max(200, p.speed);
            const age = now - p.createdAt;
            const t = Math.min(1.0, age / duration);

            const getPosAt = (progress: number) => {
                if (def.trajectory === 'ARC') return TrajectoryMath.parabolic(startP, endP, progress, def.arcHeight || 120);
                if (def.trajectory === 'WOBBLE') return TrajectoryMath.wobble(startP, endP, progress, def.wobbleAmp || 15, def.wobbleFreq || 2);
                return TrajectoryMath.linear(startP, endP, progress);
            };

            const pos3D = getPosAt(t);
            const visAngle = TrajectoryMath.getProjectedAngle(getPosAt, t, ISO_SCALE_Y);

            // 2. 計算視覺座標 (等角投影)
            const transOffset = getTransitionOffset(pos3D.x, pos3D.y, engine.mapConfig, transitionT, transitionPhase);
            const visX = pos3D.x;
            const visY = pos3D.y * ISO_SCALE_Y - pos3D.z + transOffset;

            // 3. 提交渲染指令
            const op = renderList.next();
            op.type = RenderOpType.PROJECTILE;
            
            // 核心優化：飛行物 Y 排序偏置。讓高速飛行物看起來在地形「之上」
            op.y = pos3D.y + 10; 
            op.z = pos3D.z + 500; // 給予極高的層級分數以防 Z-fighting
            
            op.pVisX = visX;
            op.pVisY = visY;
            op.pAngle = visAngle;
            op.pSkillVis = def.spriteKey || p.skill.visual || 'BOLT';
            op.pColor = p.skill.color;
            op.pIsUlt = p.skill.tag === 'ULT';
            op.pSpin = def.spinSpeed ? (age * def.spinSpeed) : 0;
            
            // 4. 解析尾跡採樣 (Analytic Trail Sampling)
            op.pTrail = [];
            const trailSamples = def.trailLength || 0;
            if (trailSamples > 0) {
                const step = 0.02; // 時間步長
                for (let i = 1; i <= trailSamples; i++) {
                    const tPast = Math.max(0, t - i * step);
                    const past3D = getPosAt(tPast);
                    const pastY = past3D.y * ISO_SCALE_Y - past3D.z + transOffset;
                    op.pTrail.push({ x: past3D.x, y: pastY });
                    if (tPast <= 0) break;
                }
            }
        }
    }
};
