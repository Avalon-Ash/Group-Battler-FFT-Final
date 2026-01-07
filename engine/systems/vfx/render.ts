
import { GameEngine } from "../../game";
import { RenderList, RenderOpType } from "../../renderers/RenderList";
import { VFXSystem } from "../vfx";
import { MapConfig } from "../../utils";
import { Camera } from "../../systems/CameraSystem";
import { getTransitionOffset, isChaosStyle } from "./utils";
import { ProjectileRenderer } from "./renderers/ProjectileRenderer";

const GROUND_PROJECTION_TYPES = new Set([
    'GIANT_HEX', 'MAGIC_CIRCLE', 'RING', 'SHOCKWAVE', 
    'BLAST', 'HEX_GLOW', 'GRID_FIELD', 'CRACKS', 'DOMAIN'
]);

export class VFXRenderer {
    public submitRenderables(
        renderList: RenderList,
        engine: GameEngine,
        vfx: VFXSystem,
        getTerrainHeight: (q: number, r: number) => number,
        mapConfig: MapConfig,
        transitionT: number,
        transitionPhase: 'IN' | 'OUT' | 'IDLE',
        viewport?: { width: number, height: number, camera: Camera } 
    ) {
        let cullMinX = -Infinity, cullMaxX = Infinity, cullMinY = -Infinity, cullMaxY = Infinity;
        
        // Culling Padding needs to be huge vertically to account for Z-axis (Heaven Fall)
        const PAD_X = 1200;
        const PAD_Y_TOP = 2500; // Look way up for meteors
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

            const offset = getTransitionOffset(p.x, p.y, mapConfig, transitionT, transitionPhase);
            if (Math.abs(offset) > 1500) return;

            const op = renderList.next();
            op.type = RenderOpType.VFX;
            
            const isGroundLocked = GROUND_PROJECTION_TYPES.has(p.type);
            const isUlt = (p as any).pIsUlt || p.type === 'GIANT_HEX' || p.type === 'MAGIC_CIRCLE';
            
            op.y = p.y + offset + (isGroundLocked ? 2 : 0); 
            op.z = isGroundLocked ? (p.z + 5) : p.z; 
            op.pIsUlt = isUlt; // 核心：傳遞奧義標記至排序器
            
            op.particle = p;
            op.vProgress = 1 - (p.life / p.maxLife);
            op.vChaos = isChaosStyle(p.color);
            op.tx = p.x;
            op.ty = p.y + offset - p.z; 
            op.th = p.z; 
        });

        this.submitDecalLayer(renderList, vfx, mapConfig, transitionT, transitionPhase, cullMinX, cullMaxX, cullMinY, cullMaxY);
        ProjectileRenderer.submit(renderList, engine, transitionT, transitionPhase);
    }

    private submitDecalLayer(renderList: RenderList, vfx: VFXSystem, mapConfig: MapConfig, t: number, phase: any, minX: number, maxX: number, minY: number, maxY: number) {
        vfx.state.decals.forEach(d => {
            if (d.x < minX || d.x > maxX || d.y < minY || d.y > maxY) return;
            const offset = getTransitionOffset(d.x, d.y, mapConfig, t, phase);
            const op = renderList.next();
            op.type = RenderOpType.DECAL;
            op.y = d.y + offset + 1; 
            op.z = 2; 
            op.tx = d.x; op.ty = d.y + offset; 
            op.dColor = d.color;
            op.dScale = d.scale;
            op.dLife = d.life;
        });
    }
}
