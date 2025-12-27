
export interface CastVisualDef {
    id: string;
    
    // Geometry
    baseRingWidth: number;
    innerRingWidth: number;
    
    // Style
    fillOpacityBase: number; // Opacity at start
    fillOpacityMax: number;  // Opacity at full charge
    
    // Animation
    spinSpeed: number;       
    pulseSpeed: number;      
    
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
        fillOpacityBase: 0.15, // Increased slightly for visibility without line
        fillOpacityMax: 0.3,
        spinSpeed: 0,
        pulseSpeed: 1.0,
        dashed: false,
        hasRunes: false,
        blendMode: 'screen' // Safer than lighter
    },
    'ACTIVE': {
        id: 'ACTIVE',
        baseRingWidth: 3,
        innerRingWidth: 2,
        fillOpacityBase: 0.2,
        fillOpacityMax: 0.5,
        spinSpeed: 1.0,
        pulseSpeed: 2.0,
        dashed: false,
        hasRunes: true,
        blendMode: 'screen' // Avoids blowout on overlapping active skills
    },
    'ULT': {
        id: 'ULT',
        baseRingWidth: 4,
        innerRingWidth: 2,
        fillOpacityBase: 0.3,
        fillOpacityMax: 0.7,
        spinSpeed: 2.5,
        pulseSpeed: 5.0,
        dashed: true,
        hasRunes: true,
        blendMode: 'screen' // Ult can be brighter
    },
    'AOE_WARNING': {
        id: 'AOE_WARNING',
        baseRingWidth: 4,
        innerRingWidth: 0,
        fillOpacityBase: 0.2,
        fillOpacityMax: 0.6,
        spinSpeed: 0.5,
        pulseSpeed: 8.0, 
        dashed: true,
        hasRunes: false,
        blendMode: 'source-over' // Red warning should be opaque/overlay, not additive
    }
};
