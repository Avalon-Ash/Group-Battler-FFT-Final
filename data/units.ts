import { Role, UnitStats, MovementType } from "../types";
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        maxHp: 1200, 
        maxMp: 100,
        moveSpeed: 0.8,
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
        moveSpeed: 1.4,
        jump: 3, 
        weight: 1,
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        maxHp: 550, 
        maxMp: 100,
        moveSpeed: 0.9,
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