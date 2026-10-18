// ╔══════════════════════════════════════════════════════════╗
// ║  VisualMath — 視覺錨點 SSOT                               ║
// ║  職責：腳下地面高度、投影中心（發射點＝受擊點）、漂浮位移   ║
// ║  投影中心的高度由 data/units/appearance/projection.ts 從    ║
// ║  精靈資料推導（模擬端不依賴圖集）。                         ║
// ║  [ARCH] 繪製／特效／HUD 一律從這裡取，不得自己用           ║
// ║  getTerrainHeight(agent.q, agent.r) 重算。規則與用途表見   ║
// ║  engine/renderers/RenderSpec.ts §4、§5。                   ║
// ╚══════════════════════════════════════════════════════════╝


import { Agent, GameEngine } from "../game";
import { HexUtils, MapConfig } from "../utils";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, ISO_SCALE_Y, UNIT_STEP_BLEND, FLOAT_BOB, RENDER_CACHE } from "../../constants";
import { BodyTypeId } from "../../types";
import { resolveBodyType } from "../../data/units/appearance/bodyTypes";
import { projectionCenterHeight } from "../../data/units/appearance/projection";

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export class VisualMath {
    public static readonly HORIZON_Y_PCT = 0.62;
    public static readonly PROJECTILE_HIT_TOLERANCE_SQ = 900; 
    
    // SSOT: Visual Layer Biases (Positive value = Shift Upwards visually)
    // Used to prevent Z-fighting on the ground plane.
    public static readonly Z_LAYERS = {
        TERRAIN: 0,
        HAZARD: 3,       // Lifted above terrain
        HAZARD_FOG: -15, // Pushed down/behind
        OVERLAY: 5,      // UI Overlays
        SHADOW: 8,       // Shadows on top of overlays
        DECAL: 2,        // Ground decals (cracks, scorch marks)
        AURA: 1.5,       // Unit Auras (just below decals to blend?) or slightly above
        UNIT_FEET: 0,
        LIQUID_OFFSET: 1
    };

    public static getTransitionOffset(x: number, y: number, config: MapConfig, t: number, phase: 'IN' | 'OUT' | 'IDLE'): number {
        if (phase === 'IDLE') return 0;
        const cx = config.offsetX;
        const cy = config.offsetY;
        const dist = Math.sqrt((x - cx)**2 + (y - cy)**2);
        const maxDist = 1000;
        const d = Math.min(1, dist / maxDist);
        const BASE_OFFSET = 1500;
        if (phase === 'OUT') {
            const startT = d * 0.3;
            if (t < startT) return 0;
            let localT = (t - startT) * 1.8;
            localT = Math.max(0, Math.min(1, localT));
            return (localT * localT * (1.5 * localT - 0.5)) * BASE_OFFSET;
        } else if (phase === 'IN') {
            const startT = d * 0.2;
            if (t < startT) return BASE_OFFSET;
            let localT = Math.max(0, Math.min(1, (t - startT) * 1.5));
            return (1 - (1 - Math.pow(1 - localT, 4))) * BASE_OFFSET;
        }
        return 0;
    }

    public static getIsoVisualY(y: number, z: number, extraOffset: number = 0): number {
        return y - z + extraOffset;
    }

    public static calculateProjectedAngle(p1: Point3D, p2: Point3D): number {
        const dx = p2.x - p1.x;
        // Apply ISO_SCALE_Y to Y before computing visual angle to match screen projection
        const screenY1 = p1.y * ISO_SCALE_Y - p1.z;
        const screenY2 = p2.y * ISO_SCALE_Y - p2.z;
        const dy = screenY2 - screenY1;
        return Math.atan2(dy, dx);
    }

    /**
     * Applies standard layer bias to a surface Y coordinate.
     * Use this for anything drawn "flat" on the ground to avoid flickering.
     */
    public static applyLayerBias(surfaceY: number, layer: keyof typeof VisualMath.Z_LAYERS): number {
        return surfaceY - this.Z_LAYERS[layer];
    }

    /**
     * SSOT：單位腳下的地面高度（不含 physics.z）。所有繪製／錨點／狀態圖示都從這裡取，
     * 以免身體、血條、護盾各自用不同高度（曾發生：身體用邏輯格、血條用線性插值）。
     * 不在移動中時等於邏輯格高度；移動中依 moveProgress 在目前格與下一格之間過渡（見 UNIT_STEP_BLEND）。
     */
    public static getUnitGroundHeight(
        agent: Pick<Agent, 'q' | 'r' | 'isMoving' | 'path' | 'moveProgress' | 'px' | 'py' | 'physics'>,
        heightAt: (q: number, r: number) => number,
        mapConfig?: MapConfig
    ): number {
        let h = heightAt(agent.q, agent.r);
        if (agent.isMoving && agent.path.length > 0) {
            const next = agent.path[0];
            const hB = heightAt(next.q, next.r);
            if (hB !== h) {
                const t = Math.max(0, Math.min(1, agent.moveProgress));
                const k = hB > h
                    ? VisualMath.smoothstep(UNIT_STEP_BLEND.RISE_START, UNIT_STEP_BLEND.RISE_END, t)
                    : VisualMath.smoothstep(UNIT_STEP_BLEND.FALL_START, UNIT_STEP_BLEND.FALL_END, t);
                h = h + (hB - h) * k;
            }
        }
        if (mapConfig) {
            // 精靈不一定在邏輯格上方：受擊／擊退的 physics 位移、瞬移後 px/py 還在漂向新格、換路徑時 moveProgress 對不上位置。
            // 腳下地面不得低於精靈實際所在格的頂面（否則腳陷進較高的柱子）；較低的鄰格不降（不憑空掉落）。
            const hv = HexUtils.fromPx(agent.px + agent.physics.x, agent.py + agent.physics.y, mapConfig);
            if (hv.q !== agent.q || hv.r !== agent.r) h = Math.max(h, heightAt(hv.q, hv.r));
        }
        return h;
    }

    public static isFloatingBiome(textureType: string): boolean {
        return FLOAT_BOB.BIOMES.includes(textureType);
    }

    /**
     * SSOT：漂浮地形的繪製時浮動（螢幕 px，正值往下，已取整數像素避免 sprite 落在半像素變糊）。
     * x、y 取格心的世界座標（HexUtils.toPx），同一格的地塊與站在上面的東西拿到同一個值。
     * 不進排序鍵：相鄰格的相位差很小（整片一起起伏），不改變前後關係。
     */
    public static floatBobAt(x: number, y: number, t: number): number {
        const raw = Math.sin(t * FLOAT_BOB.SPEED + (x + y) * FLOAT_BOB.PHASE_PER_PX) * FLOAT_BOB.AMPLITUDE;
        return Math.round(Math.round(raw / RENDER_CACHE.FLOAT_STEP) * RENDER_CACHE.FLOAT_STEP);
    }

    /**
     * 投射物發射格的漂浮位移權重（RenderSpec §5）：發射時 1，飛行進度 t 到 FLOAT_BOB.LAUNCH_FADE_T 時線性降為 0。
     * 發射點是模擬座標（沒有繪製時漂浮），漂浮地圖上要補上施法者格的位移才與浮動的投影中心對齊。
     */
    public static floatLaunchWeight(t: number): number {
        return Math.max(0, 1 - t / FLOAT_BOB.LAUNCH_FADE_T);
    }

    private static smoothstep(edge0: number, edge1: number, x: number): number {
        const u = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return u * u * (3 - 2 * u);
    }

    public static getEntityVisualY(py: number, terrainH: number, physicsY: number, physicsZ: number, offset: number): number {
        return (py + physicsY) - terrainH - physicsZ + offset;
    }

    /**
     * 精靈繪製原點（身體中心）的螢幕 Y：精靈腳底落在 surfaceY（見 SpriteUnitRenderer 的 footOffsetLocal）。
     * 這是「繪製原點」，不是投影中心：投影中心在腳底之上頭頂高度的一半（getProjectionCenterY）。
     * UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET 只剩這個繪製慣例與護盾稜柱貼地在用（RenderSpec §4）。
     */
    public static getVisualBodyCenterY(surfaceY: number, z: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET;
    }

    /** 投影中心的螢幕 Y（繪製端用；floorY 為腳底繪製 Y，不含 physics.z）。與 projectionCenterAt 同一個高度 */
    public static getProjectionCenterY(floorY: number, z: number, body: BodyTypeId): number {
        return floorY - z - projectionCenterHeight(body);
    }

    public static getShadowProperties(z: number): { scale: number, alpha: number } {
        const scale = Math.max(0.4, 1.0 - (z / 500));
        const alpha = Math.max(0.05, 0.35 - (z / 300));
        return { scale, alpha };
    }

    /**
     * SSOT：投影中心的世界座標——發射點、受擊點、核心寶石都是這一點。
     * 高度＝腳下地面 + physics.z + projectionCenterHeight(體型)（從精靈資料推導，不依賴圖集）。
     */
    public static projectionCenterAt(x: number, y: number, groundH: number, physicsZ: number, body: BodyTypeId): Point3D {
        return { x, y, z: groundH + physicsZ + projectionCenterHeight(body) };
    }

    /** 受擊點／身體中心＝投影中心 */
    public static getUnitAnchor(agent: Agent, engine: GameEngine): Point3D {
        const ground = VisualMath.getUnitGroundHeight(agent, (q, r) => engine.getTerrainHeight(q, r), engine.mapConfig);
        return VisualMath.projectionCenterAt(
            agent.px + agent.physics.x, agent.py + agent.physics.y, ground, agent.physics.z, resolveBodyType(agent));
    }

    /**
     * 施法／投射物／光束起點＝投影中心（與受擊點同一點）。
     * 核心寶石投影成形後藏在這裡；飛行單位從身體中心發射（含 physics.z）。
     */
    public static getCoreAnchor(agent: Agent, engine: GameEngine): Point3D {
        return VisualMath.getUnitAnchor(agent, engine);
    }

    public static resolveTargetPoint(targetId: string, engine: GameEngine): Point3D {
        if (!targetId) return { x: 0, y: 0, z: -9999 };
        const agent = engine.agents.find(a => a.id === targetId);
        if (agent) return this.getUnitAnchor(agent, engine);
        if (targetId.startsWith("ground-")) {
            const coordsStr = targetId.substring(7); // remove "ground-"
            const parts = coordsStr.split(",");
            if (parts.length >= 2) {
                const q = parseInt(parts[0]);
                const r = parseInt(parts[1]);
                const p = HexUtils.toPx(q, r, engine.mapConfig);
                const h = engine.getTerrainHeight(q, r);
                if (!isNaN(p.x) && !isNaN(p.y)) {
                    return { x: p.x, y: p.y, z: h + 2 };
                }
            }
        }
        return { x: 0, y: 0, z: -9999 };
    }
}
