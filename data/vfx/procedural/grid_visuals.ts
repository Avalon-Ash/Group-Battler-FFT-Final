
// =========================================================================================
// 🕸️ GRID VISUAL CONFIGURATION
// 
// Specialized definition for surface/tile effects (Tech Grid, Corruption, etc.)
// =========================================================================================

export interface GridVisualDef {
    type: 'GRID_FIELD';
    blendMode?: GlobalCompositeOperation;
    
    // Style
    color: string;
    height?: number;        // Extrusion height
    isLiquid?: boolean;     // Use liquid rendering logic?
    opacity?: number;
}

export const DEFAULT_GRID_CONFIG: GridVisualDef = {
    type: 'GRID_FIELD',
    color: '#fff',
    height: 15,
    isLiquid: false,
    opacity: 0.6,
    blendMode: 'screen'
};

export const GRID_DATA: Record<string, GridVisualDef> = {
    // Imperial Blue Tech Grid
    'GRID_TECH_BLUE': {
        type: 'GRID_FIELD',
        color: '#3b82f6',
        height: 15,
        isLiquid: false,
        opacity: 0.6,
        blendMode: 'screen'
    },
    
    // Covenant Red Corruption
    'GRID_CORRUPT_RED': {
        type: 'GRID_FIELD',
        color: '#ef4444',
        height: 15,
        isLiquid: false,
        opacity: 0.6,
        blendMode: 'lighter'
    },
    
    // Void Purple Zone
    'GRID_VOID': {
        type: 'GRID_FIELD',
        color: '#7c3aed',
        height: 5,
        isLiquid: false,
        opacity: 0.8,
        blendMode: 'source-over'
    },
    
    // Blood Pool (Liquid)
    'GRID_BLOOD': {
        type: 'GRID_FIELD',
        color: '#991b1b',
        height: 0,
        isLiquid: true,
        opacity: 0.9,
        blendMode: 'overlay'
    }
};
