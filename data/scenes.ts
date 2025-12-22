
import { SceneTheme } from "../types";

export const SCENE_DB: SceneTheme[] = [
    {
        id: 'VOID',
        name: '虛空深淵',
        background: '#020617', // Top: Deep Slate
        horizon: '#1e1b4b',    // Bottom: Indigo
        fogColor: '#312e81',   // Fog: Bright Indigo
        textureType: 'VOID',
        obstacleStyle: 'WALL',
        hexStroke: '#475569', 
        ambientType: 'SPORES', 
        ambientColor: '#a855f7', 
        bgFeature: 'SKY_RIVER'
    },
    {
        id: 'FOREST',
        name: '迷霧森林',
        background: '#022c22', // Top: Dark Emerald
        horizon: '#14532d',    // Bottom: Deep Green
        fogColor: '#3f6212',   // Fog: Lime haze
        textureType: 'FOREST',
        obstacleStyle: 'TREE',
        hexStroke: '#3f6212', 
        ambientType: 'SPORES',
        ambientColor: '#bef264',
        bgFeature: 'CANOPY'
    },
    {
        id: 'ICE',
        name: '極地凍原',
        background: '#0c4a6e', // Top: Sky Dark
        horizon: '#0369a1',    // Bottom: Sky Blue
        fogColor: '#e0f2fe',   // Fog: White/Cyan mist
        textureType: 'ICE',
        obstacleStyle: 'ICE_CRYSTAL',
        hexStroke: '#0369a1', 
        ambientType: 'SNOW',
        ambientColor: '#e0f2fe', 
        bgFeature: 'AURORA'
    },
    {
        id: 'MAGMA',
        name: '熔岩煉獄',
        background: '#450a0a', // Top: Dark Red
        horizon: '#7f1d1d',    // Bottom: Red
        fogColor: '#ea580c',   // Fog: Orange glow
        textureType: 'MAGMA',
        obstacleStyle: 'OBSIDIAN_PILLAR',
        hexStroke: '#c2410c', 
        ambientType: 'EMBER',
        ambientColor: '#fca5a5', 
        bgFeature: 'HEAT_WAVE'
    },
    {
        id: 'DESERT',
        name: '失落遺跡',
        background: '#271a0c', // Top: Dark Brown
        horizon: '#78350f',    // Bottom: Amber Brown
        fogColor: '#d97706',   // Fog: Gold dust
        textureType: 'DESERT',
        obstacleStyle: 'SANDSTONE',
        hexStroke: '#b45309', 
        ambientType: 'EMBER',
        ambientColor: '#fde047', 
        bgFeature: 'DUNES'
    }
];
