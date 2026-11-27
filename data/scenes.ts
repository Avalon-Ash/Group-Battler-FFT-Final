
import { SceneTheme } from "../types";

export const SCENE_DB: SceneTheme[] = [
    {
        id: 'VOID',
        name: '虛空星河',
        background: '#020617', // Slate 950
        horizon: '#4f46e5',    // Indigo 600
        fogColor: '#312e81',   // Indigo 900
        textureType: 'VOID',
        obstacleStyle: 'WALL',
        hexStroke: '#1e293b',
        ambientType: 'SPORES',
        ambientColor: '#a5b4fc', // Indigo 200
        bgFeature: 'SKY_RIVER'
    },
    {
        id: 'FOREST',
        name: '秘境古樹',
        background: '#022c22', // Emerald 950
        horizon: '#0b4a3c',    // F2 試作：原 #059669（Emerald 600），壓暗讓島比天空亮
        fogColor: '#053528',   // F2 試作：原 #064e3b
        textureType: 'FOREST',
        obstacleStyle: 'TREE',
        hexStroke: '#14532d',
        ambientType: 'SPORES',
        ambientColor: '#fcd34d', // Amber (Fireflies)
        bgFeature: 'CANOPY'
    },
    {
        id: 'ICE',
        name: '極光凍土',
        background: '#082f49', // Sky 950
        horizon: '#0b5a82',    // F2 試作：原 #0ea5e9（Sky 500）
        fogColor: '#0a3550',   // F2 試作：原 #0c4a6e
        textureType: 'ICE',
        obstacleStyle: 'ICE_CRYSTAL',
        hexStroke: '#075985',
        ambientType: 'SNOW',
        ambientColor: '#e0f2fe',
        bgFeature: 'AURORA'
    },
    {
        id: 'MAGMA',
        name: '地核熔爐',
        background: '#2a0a0a', // Custom Dark Red
        horizon: '#dc2626',    // Red 600
        fogColor: '#7f1d1d',   // Red 900
        textureType: 'MAGMA',
        obstacleStyle: 'OBSIDIAN_PILLAR',
        hexStroke: '#450a0a',
        ambientType: 'EMBER',
        ambientColor: '#fdba74', // Orange 300
        bgFeature: 'HEAT_WAVE'
    },
    {
        id: 'DESERT',
        name: '風蝕遺跡',
        background: '#1c1917', // Stone 900
        horizon: '#8a4a0a',    // F2 試作：原 #d97706（Amber 600）
        fogColor: '#4a2410',   // F2 試作：原 #78350f
        textureType: 'DESERT',
        obstacleStyle: 'SANDSTONE',
        hexStroke: '#451a03',
        ambientType: 'SAND', // Changed from EMBER to SAND
        ambientColor: '#fde68a', // Amber 200
        bgFeature: 'DUNES'
    }
];
