
// =========================================================================================
// ⚡ BEAM VISUAL CONFIGURATION
// 
// Specialized definition for continuous beams, lasers, and connectors.
// =========================================================================================

export type BeamStyleType = 'STRAIGHT' | 'HELIX' | 'LIGHTNING' | 'VIBRANT';

export interface BeamVisualDef {
    type: BeamStyleType;
    width: number;          // Base width of the beam
    coreColor: string;      // Inner core color
    glowColor: string;      // Outer glow color
    
    // Animation
    noiseScale?: number;    // Jitter amount (0 = stable)
    helixFreq?: number;     // For HELIX: Frequency of sine wave
    helixAmp?: number;      // For HELIX: Amplitude of sine wave
    
    // Rendering
    blendMode?: GlobalCompositeOperation;
    texture?: string;       // Optional texture key
}

export const DEFAULT_BEAM_CONFIG: BeamVisualDef = {
    type: 'HELIX',
    width: 6,
    coreColor: '#ffffff',
    glowColor: '#ffffff', // Will be overridden by skill color usually
    helixFreq: 0.1,
    helixAmp: 4,
    blendMode: 'screen'
};

export const BEAM_DATA: Record<string, BeamVisualDef> = {
    // Standard Healer / Link Beam
    'GENERIC_BEAM': {
        type: 'HELIX',
        width: 6,
        coreColor: '#ffffff',
        glowColor: '#ffffff',
        helixFreq: 0.1,
        helixAmp: 4,
        blendMode: 'screen'
    },

    // Ranger "Railgun" Ult / Mage "Death Finger"
    'DEATH_RAY': {
        type: 'STRAIGHT',
        width: 12,
        coreColor: '#000000', // Black Core
        glowColor: '#ef4444', // Red Glow (Default)
        noiseScale: 0,
        blendMode: 'source-over'
    },

    // Quick slash connector (Melee hit line)
    'SLASH_CONNECT': {
        type: 'STRAIGHT',
        width: 16,
        coreColor: '#ffffff',
        glowColor: '#ffffff',
        noiseScale: 0,
        blendMode: 'overlay'
    },

    // Mage "Soul Drain"
    'DRAIN_LINK': {
        type: 'VIBRANT',
        width: 5,
        coreColor: '#d8b4fe',
        glowColor: '#a855f7',
        noiseScale: 2.0,
        blendMode: 'lighter'
    },

    // Teleport Pillar (Vertical Beam)
    'TELEPORT_PILLAR': {
        type: 'STRAIGHT',
        width: 40,
        coreColor: '#ffffff',
        glowColor: '#60a5fa',
        blendMode: 'screen'
    }
};
