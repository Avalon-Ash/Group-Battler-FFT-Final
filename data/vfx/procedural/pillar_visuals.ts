
// =========================================================================================
// 🏛️ PILLAR VISUAL CONFIGURATION
// 
// Specialized definition for vertical columns/beams (Teleport, Divine Light, etc.)
// =========================================================================================

export interface PillarVisualDef {
    type: 'PILLAR';
    blendMode?: GlobalCompositeOperation;
    
    // Geometry
    height: number;         // Fixed height in pixels
    widthScale?: number;    // Width multiplier relative to particle size (default 1.0)
    hasBaseRing?: boolean;  // Draw a ring at the base?
    
    // Color / Gradient
    gradientTop?: string;   // 'transparent' or specific color
    gradientBottom?: string;// 'transparent', specific color, or 'current' (particle color)
}

export const DEFAULT_PILLAR_CONFIG: PillarVisualDef = {
    type: 'PILLAR',
    height: 1200,
    widthScale: 1.0,
    gradientTop: 'transparent',
    gradientBottom: 'current', 
    hasBaseRing: true,
    blendMode: 'screen'
};

export const PILLAR_DATA: Record<string, PillarVisualDef> = {
    // Standard Teleport / Divine Pillar
    'PILLAR_HOLY': {
        type: 'PILLAR',
        height: 1200,
        widthScale: 1.0,
        gradientTop: 'transparent',
        gradientBottom: 'current',
        hasBaseRing: true,
        blendMode: 'screen'
    },
    
    // Dark Void Pillar (Opaque base)
    'PILLAR_VOID': {
        type: 'PILLAR',
        height: 1000,
        widthScale: 1.2,
        gradientTop: 'transparent',
        gradientBottom: '#000', // Black core
        hasBaseRing: false,
        blendMode: 'source-over'
    }
};
