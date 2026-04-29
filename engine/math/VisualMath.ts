
import { Agent, GameEngine } from "../game";
import { HexUtils, MapConfig } from "../utils";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, UNIT_VISUAL_HEIGHT, UNIT_SCALE, VISUAL_ANCHORS, ISO_SCALE_Y } from "../../constants";

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

    public static getEntityVisualY(py: number, terrainH: number, physicsY: number, physicsZ: number, offset: number): number {
        return (py + physicsY) - terrainH - physicsZ + offset;
    }

    public static getVisualBodyCenterY(surfaceY: number, z: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET;
    }

    /**
     * SSOT: Returns the visual Y coordinate for projectile aim targets.
     * Represents the approximate chest/center of the unit body in screen space.
     * Use this for all projectile hit targets, beam endpoints, and hitscan origin.
     * 
     * Distinct from getVisualBodyCenterY (which is for UI/status icon placement)
     * in that it accounts for the full visual body lift including hover offset.
     */
    public static getProjectileTargetY(surfaceY: number, z: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET;
    }

    public static getOverheadVisualY(surfaceY: number, z: number, bob: number): number {
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET - VISUAL_ANCHORS.HEAD_OFFSET + bob;
    }

    public static getShadowProperties(z: number): { scale: number, alpha: number } {
        const scale = Math.max(0.4, 1.0 - (z / 500));
        const alpha = Math.max(0.05, 0.35 - (z / 300));
        return { scale, alpha };
    }

    public static getUnitAnchor(agent: Agent, engine: GameEngine): Point3D {
        const terrainH = engine.getTerrainHeight(agent.q, agent.r);
        // UNIT_BODY_OFFSET represents the vertical center/chest in 3D space.
        // For 2D screen-space projectile endpoints, use getProjectileTargetY() instead.
        const z = terrainH + agent.physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET;
        return { x: agent.px + agent.physics.x, y: agent.py + agent.physics.y, z: z };
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
