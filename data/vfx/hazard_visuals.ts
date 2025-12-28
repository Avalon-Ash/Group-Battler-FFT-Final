
export interface HazardVisualDef {
    type: 'LIQUID' | 'FOG' | 'CRYSTAL' | 'VOID_HOLE'; 
    primaryColor: string;
    secondaryColor: string;
    intensity: number;
    speed: number;
    cracks?: boolean;
    extrude?: boolean;
    
    // NEW: Spawn VFX (played when hazard is created)
    spawnVfx?: string; 
}

export const HAZARD_VISUALS: Record<string, HazardVisualDef> = {
    'FIRE': {
        type: 'LIQUID',
        primaryColor: '#ea580c', 
        secondaryColor: '#fdba74',
        intensity: 1.0, speed: 3.0, cracks: true,
        spawnVfx: 'FX_HIT_RED_MAGMA'
    },
    'POISON': {
        type: 'FOG',
        primaryColor: '#65a30d', // Green-600
        secondaryColor: '#d9f99d', // Green-200 (Highlight)
        intensity: 0.9, speed: 0.8,
        spawnVfx: 'FX_HIT_RED_FEL'
    },
    'ICE': {
        type: 'CRYSTAL',
        primaryColor: '#38bdf8', 
        secondaryColor: '#e0f2fe',
        intensity: 0.5, speed: 0.0, extrude: true,
        spawnVfx: 'FX_HIT_BLUE_ICE'
    },
    'GRAVITY': {
        type: 'VOID_HOLE',
        primaryColor: '#000000',
        secondaryColor: '#7c3aed',
        intensity: 0.7, speed: 2.0,
        spawnVfx: 'FX_HIT_RED_SHADOW'
    },
    'GENERIC': {
        type: 'FOG',
        primaryColor: '#94a3b8', 
        secondaryColor: '#fff',
        intensity: 0.5, speed: 0.5
    }
};
