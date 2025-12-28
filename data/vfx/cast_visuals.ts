
export interface CastVisualDef {
    id: string;
    // ... simplified
}

// Minimal config needed for UnitAuraPainter (unit rings), not used for Ground Zones anymore
export const CAST_VISUALS: Record<string, any> = {
    'BASIC': {
        fillOpacityBase: 0.15,
        fillOpacityMax: 0.3,
        pulseSpeed: 1.0,
        blendMode: 'screen'
    },
    'ACTIVE': {
        fillOpacityBase: 0.2,
        fillOpacityMax: 0.5,
        pulseSpeed: 2.0,
        blendMode: 'screen'
    },
    'ULT': {
        fillOpacityBase: 0.3,
        fillOpacityMax: 0.7,
        pulseSpeed: 5.0,
        blendMode: 'screen'
    }
    // REMOVED: AOE_WARNING specific config
};
