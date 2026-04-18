
export type ParticleType = 'SPARK' | 'SMOKE' | 'SMOKE_PUFF' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'BEAM' | 'SHOCKWAVE' | 'BLAST' | 'CHIP' | 'PILLAR' | 'HEX_GLOW' | 'GRID_FIELD' | 'DOMAIN' | 'SPRITE' | 'DEATH_RAY' | 'ROCK' | 'HEX_LOCK' | 'HEX_BEAM' | 'GIANT_HEX' | 'STREAK' | 'RING' | 'CRACKS' | 'PEBBLE' | 'RUBBLE' | 'SPIKE' | 'DUST' | 'ATMOSPHERE' | 'MAGIC_CIRCLE' | 'GENERIC_DEBUG' | 'SLASH' | 'BLACK_HOLE' | 'HEX_GRID' | 'CHAOS_RIFT';

export const PROCEDURAL_TYPES = new Set([
    'PILLAR', 'BEAM', 'HEX_BEAM', 'GRID_FIELD', 'DOMAIN', 'MAGIC_CIRCLE', 
    'DEATH_RAY', 'SHOCKWAVE', 'RING', 'BLAST', 'HEX_GLOW', 'BLACK_HOLE', 'GIANT_HEX'
]);

// Define the "Verbs" of our visual language
export type VFXActionType = 
    | 'PARTICLE'    // Spawn an emitter
    | 'BEAM'        // Draw a line/laser
    | 'SHAKE'       // Camera trauma
    | 'GRID_PULSE'  // Floor ripple
    | 'HEAVEN_FALL' // High-altitude impact object
    | 'WAIT';       // Delay next action

export interface VFXAction {
    type: VFXActionType;
    delay?: number;        // Start time relative to sequence start
    id?: string;           // Asset/VFX Registry ID
    style?: string;        // Procedural Style Key
    color?: string;        // Optional override
    scale?: number;        
    duration?: number;
    height?: number;       // For HeavenFall or Pillars
    shakeIntensity?: number;
}

/**
 * The core ECS Component for Skill Visuals
 */
export interface VFXSequence {
    id: string;
    actions: VFXAction[];
}

// Add Range type
export type Range = [number, number];

// Add EmitterConfig type
export interface EmitterConfig {
    particleType: ParticleType;
    count: Range | number;
    speed: Range | number;
    lifetime: Range | number;
    delay: Range | number;
    size: Range | number;
    height?: Range | number;
    colors: string[];
    shape: 'POINT' | 'BURST_DIR' | 'CIRCLE';
    shapeRadius?: number;
    visualStyle?: string;
    drag?: number;
    locked?: boolean;
    gravity?: number;
    vRotation?: Range | number;
    // Added vz property to support explicit vertical velocity in registry definitions
    vz?: Range | number;
    blendMode?: GlobalCompositeOperation;
}

// Add VFXAsset type
export interface VFXAsset {
    id: string;
    description?: string;
    emitters: EmitterConfig[];
}
