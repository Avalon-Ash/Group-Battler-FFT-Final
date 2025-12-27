
// =========================================================================================
// ☣️ HAZARD VISUAL DEFINITIONS
// 
// This file controls the "Look" of persistent ground effects (Zones).
// Modifying this file changes the visuals without touching the rendering engine.
// =========================================================================================

export interface HazardVisualDef {
    type: 'LIQUID' | 'FOG' | 'CRYSTAL' | 'VOID_HOLE'; // Render Mode
    primaryColor: string;   // Main body color
    secondaryColor: string; // Cracks / Highlights / Rim
    intensity: number;      // Opacity or Glow multiplier
    speed: number;          // Animation speed multiplier
    cracks?: boolean;       // Draw ground cracks? (For Magma/Fire)
    extrude?: boolean;      // Draw 3D volume? (For Ice)
}

export const HAZARD_VISUALS: Record<string, HazardVisualDef> = {
    // 🔥 FIRE / LAVA
    'FIRE': {
        type: 'LIQUID',
        primaryColor: '#ea580c', // Orange-600
        secondaryColor: '#fdba74', // Orange-300 (Cracks)
        intensity: 1.0,
        speed: 3.0,
        cracks: true
    },

    // 🧪 POISON / ACID
    'POISON': {
        type: 'FOG',
        primaryColor: '#65a30d', // Lime-600
        secondaryColor: '#bef264', // Lime-300
        intensity: 0.8,
        speed: 1.0
    },

    // ❄️ ICE / FROST
    'ICE': {
        type: 'CRYSTAL',
        primaryColor: '#38bdf8', // Sky-400
        secondaryColor: '#e0f2fe', // Sky-100
        intensity: 0.5,
        speed: 0.0,
        extrude: true
    },

    // ⚫ GRAVITY / VOID
    'GRAVITY': {
        type: 'VOID_HOLE',
        primaryColor: '#000000',
        secondaryColor: '#7c3aed', // Violet-600 (Ring)
        intensity: 0.7,
        speed: 2.0
    },

    // ☁️ GENERIC (Smoke/Mist)
    'GENERIC': {
        type: 'FOG',
        primaryColor: '#94a3b8', // Slate-400
        secondaryColor: '#fff',
        intensity: 0.5,
        speed: 0.5
    }
};
