
// =========================================================================================
// 🏹 PROJECTILE VISUAL CONFIGURATION
// 
// Defines how projectiles move (Trajectory) and look (Render Type).
// Decouples physics logic from the renderer.
// =========================================================================================

export type ProjectileTrajectory = 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT';
export type ProjectileRenderType = 'SPRITE' | 'BEAM' | 'RAY';

export interface ProjectileVisualDef {
    // Behavior
    trajectory: ProjectileTrajectory;
    speed?: number;          // Override skill speed if needed
    
    // Trajectory Params
    arcHeight?: number;      // For ARC (Pixels at apex)
    wobbleFreq?: number;     // For WOBBLE
    wobbleAmp?: number;      // For WOBBLE
    spinSpeed?: number;      // Rotation speed (radians/sec)

    // Rendering
    renderType: ProjectileRenderType;
    spriteKey?: string;      // 'ARROW', 'BOLT', 'FIREBALL', 'BOMB'
    
    // Visual Params
    scale?: number;
    colorOverride?: string;
    
    // Trail
    trailLength?: number;    // Number of history points to keep
    trailWidth?: number;     // Width of beam/trail
    beamWidth?: number;      // For RAY/BEAM
}

// Default Fallback
export const DEFAULT_PROJECTILE: ProjectileVisualDef = {
    trajectory: 'LINEAR',
    renderType: 'SPRITE',
    spriteKey: 'BOLT',
    trailLength: 5
};

export const PROJECTILE_VISUALS: Record<string, ProjectileVisualDef> = {
    // --- GENERIC ARCHETYPES ---
    'ARROW': {
        trajectory: 'ARC',
        arcHeight: 120,
        renderType: 'SPRITE',
        spriteKey: 'ARROW',
        trailLength: 8
    },
    'BOLT': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'BOLT',
        trailLength: 5
    },
    'FIREBALL': {
        trajectory: 'WOBBLE',
        wobbleFreq: 0.2,
        wobbleAmp: 10,
        renderType: 'SPRITE',
        spriteKey: 'FIREBALL',
        trailLength: 8
    },
    'BOMB': {
        trajectory: 'ARC',
        arcHeight: 200,
        spinSpeed: 15,
        renderType: 'SPRITE',
        spriteKey: 'BOMB',
        trailLength: 0
    },
    'BEAM': {
        trajectory: 'INSTANT', // Instant hit visual (Ray)
        renderType: 'RAY',
        beamWidth: 3,
        trailLength: 2
    },
    
    // --- SKILL SPECIFIC OVERRIDES ---
    
    // Ranger Ult: Railgun
    'rr_u1': {
        trajectory: 'INSTANT',
        renderType: 'RAY',
        beamWidth: 16,
        colorOverride: '#000000', // Black core
        trailLength: 2
    },
    // Mage Ult: Death Finger
    'mr_u2': {
        trajectory: 'INSTANT',
        renderType: 'RAY',
        beamWidth: 8,
        colorOverride: '#be123c',
        trailLength: 2
    },
    // Warrior: Spear/Javelin (If added later)
    'SPEAR_THROW': {
        trajectory: 'LINEAR',
        renderType: 'SPRITE',
        spriteKey: 'ARROW', // Reuse arrow sprite but linear
        scale: 1.5,
        trailLength: 10
    }
};
