
import { Role, UnitStats, MovementType } from "../types";

/**
 * Base stats for each unit role.
 * Rebalanced for "Terrain-Pacing":
 * - Tanks: Slow, anchored, heavy.
 * - Rangers: Fast, agile, light.
 * - Warriors: Balanced.
 * - Mages: Now configured as FLYING units (Air Superiority)
 */
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        baseHp: 1000,
        maxHp: 1000,
        maxMp: 100,
        moveSpeed: 0.85, // Tier: Heavy (Slow)
        jump: 1,
        weight: 4, // Physics: Very hard to knockback
        movementType: MovementType.GROUND
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        baseHp: 750,
        maxHp: 750,
        maxMp: 100,
        moveSpeed: 1.0, // Tier: Standard
        jump: 2, // Athletic: Can climb 2 blocks
        weight: 2, // Physics: Medium
        movementType: MovementType.GROUND
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        baseHp: 550,
        maxHp: 550, 
        maxMp: 100,
        moveSpeed: 1.3, // Tier: Scout/Assassin (Fast)
        jump: 3, // Parkour: Can scale tall walls quickly
        weight: 1, // Physics: Light (Easy to push)
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        baseHp: 450,
        maxHp: 450, 
        maxMp: 150, // Higher mana pool
        moveSpeed: 1.2, // Tier: Air Superiority (Fast)
        jump: 1,
        weight: 1, // Physics: Light
        movementType: MovementType.FLYING // FLIGHT ENABLED (Hover mechanics active)
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        baseHp: 600,
        maxHp: 600, 
        maxMp: 150,
        moveSpeed: 0.9, // Tier: Backline
        jump: 1,
        weight: 2, // Physics: Medium
        movementType: MovementType.GROUND
    }
};
