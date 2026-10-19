// ╔══════════════════════════════════════════════════════════╗
// ║  VFXRenderer — 粒子／貼花／投射物 RenderOp 提交            ║
// ║  職責：未投影 Y（p.y）乘回 ISO_SCALE_Y 成足跡 Y。大型平貼   ║
// ║        特效（GROUND_DRAPE.MODE 內且 gHalfH ≥ MIN_HALF_H）   ║
// ║        不提交 op，登記進 GroundDrapeLayer 鋪在格子頂面；    ║
// ║        其餘貼地特效以前緣排序（sortBias＝gHalfH＋           ║
// ║        GROUND_SORT_BIAS），不做任何法陣抬升。空中特效以     ║
// ║        足跡 Y＋固定 AIR_SORT_BIAS 排序，高度 z 不進鍵。     ║
// ║  上游：VFXSystem 狀態、RenderPipeline 的繪製用地面高度     ║
// ║  [ARCH] 規則見 engine/renderers/RenderSpec.ts §2、§3、§5、  ║
// ║  §7、§9；貼花跟地塊浮動；光束兩端與投射物發射點各加所在格  ║
// ║  的漂浮位移（§5，只動 op.ty／繪製位置，不進排序鍵）。      ║
// ╚══════════════════════════════════════════════════════════╝


import { GameEngine } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { VFXSystem } from "./VFXSystem";
import { HexUtils, MapConfig } from "../../utils";
import { Camera } from "../CameraSystem";
import { VisualMath } from "../../math/VisualMath";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";
import { PartPainter } from "./renderers/painters/PartPainter";
import { GroundDrapeLayer } from "../../renderers/GroundDrape";

import { VFX_RENDER, ISO_SCALE_Y, VFX_GROUND_TYPES, GROUND_DRAPE } from "../../../constants";

export class VFXRenderer {
    public submitRenderables(
        renderList: RenderList,
        engine: GameEngine,
        vfx: VFXSystem,
        drape: GroundDrapeLayer,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        viewport?: { width: number, height: number, camera: Camera } 
    ) {
        // 貼地特效與貼花跟著腳下地塊的繪製時位移（漂浮地形）：繪製用高度（getTerrainHeight，RenderPipeline 已含位移）
        // 與模擬高度之差就是那一格的位移；非漂浮地形為 0。空中特效與投射物不套用（RenderSpec「漂浮位移」）。
        const groundDrawShift = (x: number, screenY: number): number => {
            const hex = HexUtils.fromPx(x, screenY, mapConfig);
            return engine.getTerrainHeight(hex.q, hex.r) - getTerrainHeight(hex.q, hex.r);
        };

        let cullMinX = -Infinity, cullMaxX = Infinity, cullMinY = -Infinity, cullMaxY = Infinity;
        
        const PAD_X = 1200;
        const PAD_Y_TOP = 2500; 
        const PAD_Y_BOT = 1200;

        if (viewport) {
            const { width, height, camera } = viewport;
            const viewW = width / camera.zoom;
            const viewH = height / camera.zoom;
            cullMinX = camera.x - (viewW / 2) - PAD_X;
            cullMaxX = camera.x + (viewW / 2) + PAD_X;
            cullMinY = camera.y - (viewH / 2) - PAD_Y_TOP;
            cullMaxY = camera.y + (viewH / 2) + PAD_Y_BOT;
        }

        vfx.state.particles.forEach(p => {
            if (p.delay && p.delay > 0) return;
            if (p.x < cullMinX || p.x > cullMaxX || p.y < cullMinY || p.y > cullMaxY) return;

            // Use SSOT Math
            const offset = VisualMath.getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 1500) return;

            const isGroundLocked = VFX_GROUND_TYPES.has(p.type);
            const isUlt = !!p.pIsUlt;

            // [SSOT FIX] 1. Y calculation: op.y must be the footprint Y (raw world projected).
            // We use op.sortBias to handle the "front edge" depth sorting for large ground effects.
            const projectedY = p.y * ISO_SCALE_Y;

            // 貼地特效的實際範圍：零件法陣用實際繪製範圍（含縮放動畫）；其他沿用 size 估算。
            let halfW = 0;
            if (isGroundLocked) {
                halfW = p.size || 0;
                if (p.part) {
                    const s = PartPainter.scaleAt(p, 1 - p.life / p.maxLife);
                    halfW = Math.max(p.part.anchorX, p.part.width - p.part.anchorX) * s;
                }
                // 大型平貼特效（RenderSpec §9）：不進排序，鋪在它蓋到的每一格頂面
                if (GroundDrapeLayer.modeOf(p.type) !== undefined && halfW * ISO_SCALE_Y >= GROUND_DRAPE.MIN_HALF_H) {
                    drape.add(p, p.x, projectedY + offset, halfW, 1 - (p.life / p.maxLife));
                    return;
                }
            }

            const op = renderList.next();
            op.type = RenderOpType.VFX;
            op.y = projectedY + offset;

            if (isGroundLocked) {
                // 貼地特效以前緣排序（RenderSpec §2）。
                // In iso view, front edge is approx projectedY + 0.5 * visual_height.
                op.gHalfW = halfW;
                op.gHalfH = halfW * ISO_SCALE_Y;
                op.sortBias = op.gHalfH + VFX_RENDER.GROUND_SORT_BIAS;
            } else {
                // 空中特效：鍵＝足跡 Y（op.y）＋固定前緣。高度 z 不進鍵（RenderSpec §2），鍵對粒子壽命單調。
                op.sortBias = VFX_RENDER.AIR_SORT_BIAS;
                // 光束是一條空中的線：以兩端中最靠前的足跡排序（sy／ty 是螢幕 Y），整條畫在它經過的地塊之後；
                // 只用起點排序時，朝畫面前方延伸的那段會被起點前方的地塊蓋住（看起來穿進地底）。
                if (p.sy !== undefined && p.ty !== undefined) op.sortBias += Math.max(0, p.ty - p.sy);
            }

            op.z = isGroundLocked
                ? Math.max(p.z + VFX_RENDER.GROUND_Z_BIAS, VFX_RENDER.GROUND_Z_BIAS)
                : p.z; 
            op.pIsUlt = isUlt; 
            op.isGround = isGroundLocked;
            
            op.particle = p;
            op.vProgress = 1 - (p.life / p.maxLife);
            op.tx = p.x;
            
            // [SSOT FIX] 2. Screen Y (繪製位置) calculation:
            // Apply visual bias (Z-Fighting prevention) directly to ty, NOT to sorting y.
            // visualBias is a pixel-space compensation to ensure ground effects hover slightly above terrain.
            const visualBias = isGroundLocked ? VFX_RENDER.GROUND_VISUAL_BIAS : 0;
            // 光束兩端（模擬座標＝投影中心）各跟著所在格的漂浮位移：起點加在 op.ty，終點與起點的差交給 drawBeam（RenderSpec §5）
            let beamStartBob = 0;
            if (p.type === 'BEAM' && p.sx !== undefined && p.sy !== undefined && p.tx !== undefined && p.ty !== undefined) {
                beamStartBob = groundDrawShift(p.sx, p.sy);
                p.beamEndDy = groundDrawShift(p.tx, p.ty) - beamStartBob;
            }
            op.ty = projectedY + offset - p.z - visualBias + (isGroundLocked ? groundDrawShift(p.x, projectedY) : beamStartBob);
            op.th = p.z; 
        });

        ProjectileRenderer.submit(renderList, engine, transitionT, transitionPhase, groundDrawShift);
    }
}
