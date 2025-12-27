
// =========================================================================================
// 🛡️ DOMAIN VISUAL CONFIGURATION
// 
// Specialized definition for circular zones, shields, and fields.
// =========================================================================================

export interface DomainVisualDef {
    type: 'DOMAIN';
    blendMode?: GlobalCompositeOperation;
    
    // Style
    rimColor?: string;      // Border color (defaults to particle color if null)
    fillAlpha?: number;     // Opacity of center fill (0.0 - 1.0)
    rimWidth?: number;      // Stroke width in pixels
    dashed?: boolean;       // Dashed border style?
}

export const DEFAULT_DOMAIN_CONFIG: DomainVisualDef = {
    type: 'DOMAIN',
    fillAlpha: 0.3,
    rimWidth: 1,
    dashed: true,
    blendMode: 'lighter'
};

export const DOMAIN_DATA: Record<string, DomainVisualDef> = {
    // Standard Aura / Zone
    'DOMAIN_STANDARD': {
        type: 'DOMAIN',
        fillAlpha: 0.3,
        rimWidth: 1,
        dashed: true,
        blendMode: 'lighter'
    },
    
    // Heavy Shield Bubble
    'DOMAIN_SHIELD': {
        type: 'DOMAIN',
        fillAlpha: 0.1,
        rimWidth: 3,
        dashed: false,
        blendMode: 'screen'
    }
};
