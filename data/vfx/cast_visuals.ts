
// =========================================================================================
// 🧙 CAST VISUAL CONFIGURATION
// 
// Defines the visual style of casting indicators (Magic Circles, Range Rings).
// Decouples "How it looks" from ZoneRenderer.
// =========================================================================================

export interface CastVisualDef {
    id: string;
    
    // Geometry
    baseRingWidth: number;
    innerRingWidth: number;
    
    // Style
    fillOpacityBase: number; // Opacity at start
    fillOpacityMax: number;  // Opacity at full charge
    
    // Animation
    spinSpeed: number;       // Rotation speed
    pulseSpeed: number;      // Opacity pulse speed
    
    // Decorations
    dashed: boolean;
    hasRunes: boolean;
    
    // Blend
    blendMode?: GlobalCompositeOperation;
}

export const CAST_VISUALS: Record<string, CastVisualDef> = {
    'BASIC': {
        id: 'BASIC',
        baseRingWidth: 2,
        innerRingWidth: 0,
        fillOpacityBase: 0.1,
        fillOpacityMax: 0.3,
        spinSpeed: 0,
        pulseSpeed: 0,
        dashed: false,
        hasRunes: false,
        blendMode: 'source-over'
    },
    'ACTIVE': {
        id: 'ACTIVE',
        baseRingWidth: 3,
        innerRingWidth: 1,
        fillOpacityBase: 0.15,
        fillOpacityMax: 0.4,
        spinSpeed: 1.0,
        pulseSpeed: 2.0,
        dashed: false,
        hasRunes: true,
        blendMode: 'lighter'
    },
    'ULT': {
        id: 'ULT',
        baseRingWidth: 5,
        innerRingWidth: 2,
        fillOpacityBase: 0.2,
        fillOpacityMax: 0.6,
        spinSpeed: 2.5,
        pulseSpeed: 5.0,
        dashed: true,
        hasRunes: true,
        blendMode: 'screen'
    },
    'AOE_WARNING': {
        id: 'AOE_WARNING',
        baseRingWidth: 4,
        innerRingWidth: 0,
        fillOpacityBase: 0.1,
        fillOpacityMax: 0.8,
        spinSpeed: 0.5,
        pulseSpeed: 10.0, // Fast flash
        dashed: true,
        hasRunes: false,
        blendMode: 'source-over'
    }
};
