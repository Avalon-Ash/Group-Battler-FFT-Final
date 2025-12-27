
// =========================================================================================
// 🏹 PROJECTILE TYPES & DEFAULTS
// =========================================================================================

export type ProjectileTrajectory = 'LINEAR' | 'ARC' | 'WOBBLE' | 'INSTANT';
export type ProjectileRenderType = 'SPRITE' | 'BEAM' | 'RAY';

export interface ProjectileVisualDef {
    // Behavior
    trajectory: ProjectileTrajectory;
    speed?: number;          
    
    // Trajectory Params
    arcHeight?: number;      
    wobbleFreq?: number;     
    wobbleAmp?: number;      
    spinSpeed?: number;      

    // Rendering
    renderType: ProjectileRenderType;
    spriteKey?: string;      
    
    // Visual Params
    scale?: number;
    colorOverride?: string;
    
    // Trail
    trailLength?: number;    
    trailWidth?: number;     
    beamWidth?: number;      
}

export const DEFAULT_PROJECTILE: ProjectileVisualDef = {
    trajectory: 'LINEAR',
    renderType: 'SPRITE',
    spriteKey: 'BOLT',
    trailLength: 5
};
