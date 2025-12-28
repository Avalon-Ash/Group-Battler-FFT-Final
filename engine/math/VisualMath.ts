
import { Agent, GameEngine } from "../game";
import { GridSystem } from "../systems/grid";
import { HexUtils } from "../utils";
import { UNIT_BODY_OFFSET, UNIT_HOVER_OFFSET, UNIT_VISUAL_HEIGHT, UNIT_SCALE } from "../../constants";

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export class VisualMath {

    /**
     * [CORE STANDARD] Calculates the precise "Chest/Core" position of a unit in 3D World Space.
     * This is the single source of truth for Projectile Launch, Hit detection, and VFX spawning.
     * 
     * Formula: TerrainHeight + JumpHeight + BodyOffset + HoverLift + (VisualHeight * 0.4 * Scale)
     */
    public static getUnitAnchor(agent: Agent, engine: GameEngine, grid: GridSystem | null = null): Point3D {
        // Resolve Terrain Height
        // If grid system is provided, use its cache (faster), otherwise fallback to engine map
        const terrainH = grid 
            ? grid.getTerrainHeight(agent.q, agent.r, engine) 
            : engine.map.getTerrainHeight(agent.q, agent.r);

        // Chest Logic: 40% up from the "feet" of the model
        const chestHeight = (UNIT_VISUAL_HEIGHT * 0.4) * UNIT_SCALE;
        
        // Total World Z
        const z = terrainH + agent.physics.z + UNIT_BODY_OFFSET + UNIT_HOVER_OFFSET + chestHeight;

        return {
            x: agent.px,
            y: agent.py,
            z: z
        };
    }

    /**
     * Calculates the center position of a specific Hex on the ground surface.
     */
    public static getHexCenter(q: number, r: number, engine: GameEngine): Point3D {
        const p = HexUtils.toPx(q, r, engine.mapConfig);
        const h = engine.map.getTerrainHeight(q, r);
        return { x: p.x, y: p.y, z: h };
    }

    /**
     * Resolves a target ID (Unit or Ground) to a 3D Point.
     */
    public static resolveTargetPoint(targetId: string, engine: GameEngine): Point3D {
        // 1. Is it a Unit?
        const agent = engine.agents.find(a => a.id === targetId);
        if (agent) {
            return this.getUnitAnchor(agent, engine);
        }

        // 2. Is it a Ground Location? (Format: "ground-q,r")
        if (targetId.startsWith("ground-")) {
            const parts = targetId.split("-")[1].split(",");
            const q = parseInt(parts[0]);
            const r = parseInt(parts[1]);
            const center = this.getHexCenter(q, r, engine);
            // Add slight offset for ground targets so they aren't buried
            center.z += 10; 
            return center;
        }

        return { x: 0, y: 0, z: 0 };
    }
}
