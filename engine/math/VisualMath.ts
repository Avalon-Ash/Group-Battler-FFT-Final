
import { Agent, GameEngine } from "../game";
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, UNIT_VISUAL_HEIGHT, UNIT_SCALE, VISUAL_ANCHORS } from "../../constants";

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export class VisualMath {

    /**
     * SSOT: Rendering Layer Bias (Negative Y moves UP on screen)
     * Used to prevent Z-fighting on the flat ground plane.
     * Higher "Lift" means it draws "Above" the layer below it.
     */
    public static readonly Z_LAYERS = {
        TERRAIN: 0,
        HAZARD: 3,        // Slightly above terrain
        OVERLAY: 5,       // Above hazards (Grids, Ranges)
        SHADOW: 8,        // Shadows overlay everything on ground
        UNIT_FEET: 0      // Logical reference point
    };

    /**
     * SSOT: Calculate standard isometric visual Y.
     * Subtracts Z (height) from Y (ground) to project into 2D screen space.
     */
    public static getIsoVisualY(y: number, z: number): number {
        return y - z;
    }

    /**
     * SSOT: Apply a specific layer bias to a Visual Y coordinate.
     * Effectively "Lifts" the sprite up by N pixels to sort above the ground.
     */
    public static applyLayerBias(visualY: number, layer: keyof typeof VisualMath.Z_LAYERS): number {
        // In screen space, UP is negative Y. So we subtract the bias.
        return visualY - this.Z_LAYERS[layer];
    }

    /**
     * SSOT: Calculate the visual Y coordinate of the unit's body center.
     * Takes into account surface Y, physics Z (jump), and model offsets.
     */
    public static getVisualBodyCenterY(surfaceY: number, z: number): number {
        // surfaceY is typically (WorldY - TerrainHeight)
        // We further subtract physics Z and offsets
        return surfaceY - z - UNIT_BODY_OFFSET - UNIT_HOVER_OFFSET;
    }

    /**
     * 獲取單位的「核心錨點」(通常是胸口)
     * 用於投射物命中、雷射連接
     */
    public static getUnitAnchor(agent: Agent, engine: GameEngine, grid: GridSystem | null = null): Point3D {
        const terrainH = grid 
            ? grid.getTerrainHeight(agent.q, agent.r, engine) 
            : engine.map.getTerrainHeight(agent.q, agent.r);

        // 胸口高度計算：基礎偏移 + 物理高度 + 模型高度的 40%
        const chestHeight = (UNIT_VISUAL_HEIGHT * 0.45) * UNIT_SCALE;
        const z = terrainH + agent.physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET + chestHeight;

        return { x: agent.px, y: agent.py, z: z };
    }

    /**
     * 獲取單位的「腳底錨點」
     * 用於地面法陣、影子、傳送門
     */
    public static getUnitFeet(agent: Agent, engine: GameEngine): Point3D {
        const terrainH = engine.map.getTerrainHeight(agent.q, agent.r);
        return { x: agent.px, y: agent.py, z: terrainH + agent.physics.z + 2 }; // +2 解決穿插
    }

    public static getHexCenter(q: number, r: number, engine: GameEngine): Point3D {
        const p = HexUtils.toPx(q, r, engine.mapConfig);
        const h = engine.map.getTerrainHeight(q, r);
        return { x: p.x, y: p.y, z: h + 2 }; // 地面特效默認抬高 2px 避免 Z-fighting
    }

    public static resolveTargetPoint(targetId: string, engine: GameEngine): Point3D {
        if (!targetId) return { x: 0, y: 0, z: -9999 };

        const agent = engine.agents.find(a => a.id === targetId);
        if (agent) {
            return this.getUnitAnchor(agent, engine);
        }

        if (targetId.startsWith("ground-")) {
            const parts = targetId.split("-")[1].split(",");
            if (parts.length === 2) {
                const q = parseInt(parts[0]);
                const r = parseInt(parts[1]);
                return this.getHexCenter(q, r, engine);
            }
        }

        return { x: 0, y: 0, z: -9999 };
    }
}
