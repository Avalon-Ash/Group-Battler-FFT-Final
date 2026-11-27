
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
        horizon: '#059669',    // Emerald 600
        fogColor: '#064e3b',   // Emerald 900
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
        horizon: '#0ea5e9',    // Sky 500
        fogColor: '#0c4a6e',   // Sky 900
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
        horizon: '#d97706',    // Amber 600
        fogColor: '#78350f',   // Amber 900
        textureType: 'DESERT',
        obstacleStyle: 'SANDSTONE',
        hexStroke: '#451a03',
        ambientType: 'SAND', // Changed from EMBER to SAND
        ambientColor: '#fde68a', // Amber 200
        bgFeature: 'DUNES'
    }
];
