
import { ObstacleDef } from "../types";

export const OBSTACLE_DB: Record<string, ObstacleDef> = {
    'WALL': {
        id: 'WALL',
        name: '石牆',
        blocksMovement: true,
        blocksVision: true
    },
    'TREE': {
        id: 'TREE',
        name: '古木',
        blocksMovement: true,
        blocksVision: true // Forest theme
    },
    'ICE_CRYSTAL': {
        id: 'ICE_CRYSTAL',
        name: '冰晶',
        blocksMovement: true,
        blocksVision: false // Translucent? Currently logic treats all as blocking vision, but good for metadata
    },
    'OBSIDIAN_PILLAR': {
        id: 'OBSIDIAN_PILLAR',
        name: '黑曜石柱',
        blocksMovement: true,
        blocksVision: true // Magma theme
    },
    'SANDSTONE': {
        id: 'SANDSTONE',
        name: '砂岩',
        blocksMovement: true,
        blocksVision: true // Desert theme
    }
};
