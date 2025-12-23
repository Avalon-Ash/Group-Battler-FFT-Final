
import { ObstacleDef } from "../types";

export const OBSTACLE_DB: Record<string, ObstacleDef> = {
    'WALL': {
        id: 'WALL',
        name: '石牆',
        blocksMovement: true,
        blocksVision: true,
        blocksFlying: false // Flyers can pass
    },
    'TREE': {
        id: 'TREE',
        name: '古木',
        blocksMovement: true,
        blocksVision: true,
        blocksFlying: false // Flyers fly over canopy
    },
    'ICE_CRYSTAL': {
        id: 'ICE_CRYSTAL',
        name: '冰晶',
        blocksMovement: true,
        blocksVision: false,
        blocksFlying: false
    },
    'OBSIDIAN_PILLAR': {
        id: 'OBSIDIAN_PILLAR',
        name: '黑曜石柱',
        blocksMovement: true,
        blocksVision: true,
        blocksFlying: true // Too tall / dangerous to fly over
    },
    'SANDSTONE': {
        id: 'SANDSTONE',
        name: '砂岩',
        blocksMovement: true,
        blocksVision: true,
        blocksFlying: false
    }
};
