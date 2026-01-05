
import { Role, UnitStats, MovementType } from "../types";
export const UNIT_DB: Record<Role, UnitStats & { jump: number, weight: number }> = {
    [Role.TANK]: {
        role: Role.TANK,
        maxHp: 1800, // Buff: 更坦，作為前排肉盾
        maxMp: 100,
        moveSpeed: 1.0, 
        jump: 2, 
        weight: 10, // 抗擊退
        movementType: MovementType.GROUND
    },
    [Role.WARRIOR]: {
        role: Role.WARRIOR,
        maxHp: 1150, // Buff: 輕微提升生存
        maxMp: 100,
        moveSpeed: 1.7, // Buff: 極速追擊，這是反制風箏的關鍵
        jump: 4, // Buff: 超高跳躍，可以直接跳上大部分地形追殺飛行單位
        weight: 5,
        movementType: MovementType.GROUND
    },
    [Role.RANGER]: {
        role: Role.RANGER,
        maxHp: 650, // Buff: 稍微提升生存以免被不明AOE砸死
        maxMp: 100,
        moveSpeed: 1.2, 
        jump: 3, 
        weight: 2,
        movementType: MovementType.GROUND
    },
    [Role.MAGE]: {
        role: Role.MAGE,
        maxHp: 420, // Nerf: 玻璃大砲，被近身即死
        maxMp: 100,
        moveSpeed: 0.85, // Nerf: 飛行單位移動較慢
        jump: 1,
        weight: 1, // 極易被擊飛
        movementType: MovementType.FLYING 
    },
    [Role.SUPPORT]: {
        role: Role.SUPPORT,
        maxHp: 750, 
        maxMp: 100,
        moveSpeed: 1.0,
        jump: 2,
        weight: 2,
        movementType: MovementType.GROUND
    }
};