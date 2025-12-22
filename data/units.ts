
import { Role, UnitStats } from "../types";

/**
 * Base stats for each unit role.
 * baseHp is often used for visual scaling references.
 * maxHp is the actual starting health.
 * moveSpeed: Tiles per second. 
 *   - 1.0 = 1 sec per tile (Warrior Baseline)
 *   - 0.65 = ~1.5 sec per tile (Tank)
 *   - 1.5 = ~0.66 sec per tile (Ranger/Assassin)
 * jump: Max height tiers climbable (1 Tier = 24px)
 * weight: Resistance to knockback (1 = Light, 3 = Heavy)
 */
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        baseHp: 900,
        maxHp: 900,
        maxMp: 100,
        moveSpeed: 0.9,
        jump: 1,
        weight: 3 // Heavy: Hard to push
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        baseHp: 700,
        maxHp: 700,
        maxMp: 100,
        moveSpeed: 1.0,
        jump: 1,
        weight: 2 // Medium
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        baseHp: 500,
        maxHp: 480, 
        maxMp: 100,
        moveSpeed: 1.5,
        jump: 2, // High Jump: Can climb taller walls
        weight: 1 // Light
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        baseHp: 450,
        maxHp: 450, 
        maxMp: 120,
        moveSpeed: 0.8,
        jump: 1,
        weight: 1 // Light
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        baseHp: 550,
        maxHp: 600, 
        maxMp: 150,
        moveSpeed: 0.8,
        jump: 1,
        weight: 1 // Light
    }
};
