import { Agent, GameEngine } from "../game";
import { HexUtils, MapConfig } from "../utils";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, UNIT_VISUAL_HEIGHT, UNIT_SCALE, VISUAL_ANCHORS } from "../../constants";

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export class VisualMath {
    public static readonly HORIZON_Y_PCT = 0.62;
    public static readonly PROJECTILE_HIT_TOLERANCE_SQ = 900; 
    
    public static readonly Z_LAYERS = {
        TERRAIN: 0,
        HAZARD: 3,
        HAZARD_FOG: -15,
        OVERLAY: 5,
        SHADOW: 8,
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

    /**
     * 套用渲染層級偏置以解決 Z-fighting
     */
    public static applyLayerBias(surfaceY: number, layer: keyof typeof VisualMath.Z_LAYERS): number {
        return surfaceY - this.Z_LAYERS[layer];
    }

    /**
     * 計算實體（如 HUD）的視覺 Y 軸錨點
     */
    public static getEntityVisualY(py: number, terrainH: number, physicsY: number, physicsZ: number, offset: number): number {
        return (py + physicsY) - terrainH - physicsZ + offset;
    }

    public static getVisualBodyCenterY(surfaceY: number, z: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET;
    }

    /**
     * 計算頭頂特效（如狀態圖標）的視覺 Y 軸位置
     */
    public static getOverheadVisualY(surfaceY: number, z: number, bob: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET - VISUAL_ANCHORS.HEAD_OFFSET + bob;
    }

    public static getUnitAnchor(agent: Agent, engine: GameEngine): Point3D {
        const terrainH = engine.map.getTerrainHeight(agent.q, agent.r);
        const chestHeight = (UNIT_VISUAL_HEIGHT * 0.45) * UNIT_SCALE;
        const z = terrainH + agent.physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET + chestHeight;
        return { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: z };
    }

    public static resolveTargetPoint(targetId: string, engine: GameEngine): Point3D {
        if (!targetId) return { x: 0, y: 0, z: -9999 };
        const agent = engine.agents.find(a => a.id === targetId);
        if (agent) return this.getUnitAnchor(agent, engine);
        if (targetId.startsWith("ground-")) {
            const parts = targetId.split("-")[1].split(",");
            const q = parseInt(parts[0]);
            const r = parseInt(parts[1]);
            const p = HexUtils.toPx(q, r, engine.mapConfig);
            const h = engine.map.getTerrainHeight(q, r);
            return { x: p.x, y: p.y, z: h + 2 };
        }
        return { x: 0, y: 0, z: -9999 };
    }
}