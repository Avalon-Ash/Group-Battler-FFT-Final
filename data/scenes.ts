
import { SceneTheme } from "../types";

export const SCENE_DB: SceneTheme[] = [
    {
        id: 'VOID',
        name: '虛空深淵',
        background: '#020617', // Deepest Slate
        horizon: '#312e81',    // Indigo Glow
        fogColor: '#4338ca',   // Indigo Haze
        textureType: 'VOID',
        obstacleStyle: 'WALL',
        hexStroke: '#1e293b', 
        ambientType: 'SPORES', 
        ambientColor: '#a855f7', 
        bgFeature: 'SKY_RIVER'
    },
    {
        id: 'FOREST',
        name: '迷霧森林',
        background: '#022c22', // Deep Jungle
        horizon: '#065f46',    // Emerald Light
        fogColor: '#047857',   // Green Mist
        textureType: 'FOREST',
        obstacleStyle: 'TREE',
        hexStroke: '#14532d', 
        ambientType: 'SPORES',
        ambientColor: '#bef264',
        bgFeature: 'CANOPY'
    },
    {
        id: 'ICE',
        name: '極地凍原',
        background: '#082f49', // Sky Dark
        horizon: '#0ea5e9',    // Cyan Glow
        fogColor: '#38bdf8',   // Light Blue Mist
        textureType: 'ICE',
        obstacleStyle: 'ICE_CRYSTAL',
        hexStroke: '#0c4a6e', 
        ambientType: 'SNOW',
        ambientColor: '#e0f2fe', 
        bgFeature: 'AURORA'
    },
    {
        id: 'MAGMA',
        name: '熔岩煉獄',
        background: '#2a0a0a', // Almost Black Red
        horizon: '#dc2626',    // Burning Red
        fogColor: '#991b1b',   // Dark Red Haze
        textureType: 'MAGMA',
        obstacleStyle: 'OBSIDIAN_PILLAR',
        hexStroke: '#7f1d1d', 
        ambientType: 'EMBER',
        ambientColor: '#fca5a5', 
        bgFeature: 'HEAT_WAVE'
    },
    {
        id: 'DESERT',
        name: '失落遺跡',
        background: '#271a0c', // Dark Sepia
        horizon: '#d97706',    // Golden Sunset
        fogColor: '#b45309',   // Dust Storm
        textureType: 'DESERT',
        obstacleStyle: 'SANDSTONE',
        hexStroke: '#78350f', 
        ambientType: 'EMBER',
        ambientColor: '#fde047', 
        bgFeature: 'DUNES'
    }
];
