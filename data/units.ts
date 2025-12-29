
import { Role, UnitStats, MovementType } from "../types";

/**
 * Global Unit Balance Patch v8.3 - Flight Physics Update
 * 
 * Philosophy:
 * - Flyers are now SLOWER (0.9) but ignore terrain. This makes them feel like heavy floating destroyers.
 * - Rangers speed boost slightly to emphasize kiting.
 */
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        maxHp: 1200, 
        maxMp: 100,
        moveSpeed: 0.8, // Heavy
        jump: 1,
        weight: 5, 
        movementType: MovementType.GROUND
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        maxHp: 900,
        maxMp: 100,
        moveSpeed: 1.1, 
        jump: 2,
        weight: 3,
        movementType: MovementType.GROUND
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        maxHp: 600, 
        maxMp: 100,
        moveSpeed: 1.4, // Buffed for kiting
        jump: 3, 
        weight: 1,
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        maxHp: 550, 
        maxMp: 100,
        moveSpeed: 0.9, // NERFED: Slower, deliberate flight
        jump: 1,
        weight: 1,
        movementType: MovementType.FLYING 
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        maxHp: 750, 
        maxMp: 100,
        moveSpeed: 1.0,
        jump: 1,
        weight: 2,
        movementType: MovementType.GROUND
    }
};
