
import { Role, UnitStats, MovementType } from "../types";

/**
 * Global Unit Balance Patch v8.0
 * 
 * Philosophy:
 * - MaxMP Normalized to 100 for all units. Pacing is controlled by Gain/Cost.
 * - HP Squish: Tuned for ~10-20s combat duration.
 * - Speed Tiering: Clear distinction between Heavy and Light units.
 */
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        maxHp: 1200, // High effective HP
        maxMp: 100,
        moveSpeed: 0.8, // Heavy & Slow
        jump: 1,
        weight: 5, // Immovable object
        movementType: MovementType.GROUND
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        maxHp: 900,
        maxMp: 100,
        moveSpeed: 1.1, // Chaser
        jump: 2,
        weight: 3,
        movementType: MovementType.GROUND
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        maxHp: 600, // Glass Cannon
        maxMp: 100,
        moveSpeed: 1.3, // Kiter
        jump: 3, // High verticality
        weight: 1,
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        maxHp: 550, // Lowest HP
        maxMp: 100,
        moveSpeed: 1.1,
        jump: 1,
        weight: 1,
        movementType: MovementType.FLYING // Flight advantage
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        maxHp: 750, // Moderate survival
        maxMp: 100,
        moveSpeed: 1.0,
        jump: 1,
        weight: 2,
        movementType: MovementType.GROUND
    }
};
