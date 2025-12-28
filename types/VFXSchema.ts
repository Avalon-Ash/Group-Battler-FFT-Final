
// ==========================================
// 🎨 VFX ASSET SCHEMA (Data-Driven)
// ==========================================

export type ParticleType = 'SPARK' | 'SMOKE' | 'SMOKE_PUFF' | 'GLOW' | 'DEBRIS' | 'SHARD' | 'BEAM' | 'SHOCKWAVE' | 'BLAST' | 'CHIP' | 'PILLAR' | 'HEX_GLOW' | 'GRID_FIELD' | 'DOMAIN' | 'SPRITE' | 'DEATH_RAY' | 'ROCK' | 'HEX_LOCK' | 'HEX_BEAM' | 'GIANT_HEX' | 'STREAK' | 'RING' | 'CRACKS' | 'PEBBLE' | 'RUBBLE' | 'SPIKE' | 'DUST' | 'ATMOSPHERE' | 'MAGIC_CIRCLE' | 'GENERIC_DEBUG';
export type EmitterShape = 'POINT' | 'CIRCLE' | 'CONE' | 'BURST_DIR';
export type BlendMode = 'source-over' | 'lighter' | 'screen' | 'overlay' | 'multiply';

// Range Helper [min, max] or number
export type Range = [number, number]; 

export interface EmitterConfig {
    // Identity
    id?: string;
    particleType: ParticleType;
    textureId?: string; // Optional: If specific texture needed from VFXFactory
    
    // Visual Style Reference (New)
    // Points to entries in BEAM_VISUALS or PROCEDURAL_VISUALS
    visualStyle?: string; 
    
    // Spawning Logic
    count: number | Range; // How many particles
    delay: number | Range; // Start delay
    lifetime: Range;       // How long particles live
    
    // Physics
    speed: Range;
    gravity?: number;      // Override default gravity
    drag?: number;         // Air resistance (0-1)
    
    // Visuals
    size: Range;
    colors: string[];      // Randomly picked from array
    blendMode?: BlendMode;
    
    // Transform
    shape: EmitterShape;
    shapeRadius?: number;  // For Circle/Cylinder
    
    // Advanced
    locked?: boolean;      // If true, moves with parent/source
    vRotation?: Range;     // Angular velocity
}

export interface VFXAsset {
    id: string;
    description?: string;
    emitters: EmitterConfig[];
    soundRef?: string;
}
