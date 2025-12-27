
// =========================================================================================
// 💠 HEXAGON VISUAL CONFIGURATION
// 
// Specialized definition for geometric hexagon shapes (Falling tiles, Cores).
// =========================================================================================

export interface HexVisualDef {
    type: 'HEX_SHAPE';
    blendMode?: GlobalCompositeOperation;
    
    // Rendering Flags
    filled?: boolean;
    stroked?: boolean;
    
    // Properties
    strokeWidth?: number;
    innerScale?: number;    // If defined, draws a secondary inner hex (e.g. 0.6)
}

export const DEFAULT_HEX_CONFIG: HexVisualDef = {
    type: 'HEX_SHAPE',
    filled: true,
    stroked: false,
    blendMode: 'source-over'
};

export const HEX_DATA: Record<string, HexVisualDef> = {
    // Giant Falling Hex (Heaven Fall)
    'HEX_SOLID': {
        type: 'HEX_SHAPE',
        filled: true,
        stroked: true,
        strokeWidth: 2,
        blendMode: 'source-over' // Opaque
    },
    
    // Hex Beam Core (Double Hex)
    'HEX_CORE': {
        type: 'HEX_SHAPE',
        filled: true,
        innerScale: 0.6, // Inner white core
        blendMode: 'lighter'
    }
};
