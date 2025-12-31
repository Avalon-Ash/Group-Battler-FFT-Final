
import { Role, UnitStats, MovementType } from "../types";
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        maxHp: 1600, // Buff: Massive HP boost to survive approach
        maxMp: 100,
        moveSpeed: 0.95, // Buff: Slightly faster to keep formation
        jump: 2, // Buff: Can climb standard ledges now
        weight: 10, // Buff: Very hard to knockback
        movementType: MovementType.GROUND
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        maxHp: 1050, // Buff: Moderate HP boost
        maxMp: 100,
        moveSpeed: 1.5, // Buff: Fastest ground unit (Chaser archetype)
        jump: 3, // Buff: Matches Ranger verticality
        weight: 4,
        movementType: MovementType.GROUND
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        maxHp: 550, // Nerf: Squishier
        maxMp: 100,
        moveSpeed: 1.15, // Nerf: Slower than Warrior (cannot kite indefinitely by running)
        jump: 3, 
        weight: 1,
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        maxHp: 500, // Nerf: Glass cannon
        maxMp: 100,
        moveSpeed: 0.9,
        jump: 1,
        weight: 1,
        movementType: MovementType.FLYING 
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        maxHp: 700, 
        maxMp: 100,
        moveSpeed: 1.0,
        jump: 1,
        weight: 2,
        movementType: MovementType.GROUND
    }
};
