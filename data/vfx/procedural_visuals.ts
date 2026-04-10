
import { PillarVisualDef, PILLAR_DATA, DEFAULT_PILLAR_CONFIG } from './procedural/pillar_visuals';
import { DomainVisualDef, DOMAIN_DATA, DEFAULT_DOMAIN_CONFIG } from './procedural/domain_visuals';
import { HexVisualDef, HEX_DATA, DEFAULT_HEX_CONFIG } from './procedural/hex_visuals';
import { BeamVisualDef, BEAM_DATA, DEFAULT_BEAM_CONFIG } from './procedural/beam_visuals';
import { GridVisualDef, GRID_DATA, DEFAULT_GRID_CONFIG } from './procedural/grid_visuals';

// =========================================================================================
// 🔮 PROCEDURAL VISUAL HUB
// =========================================================================================

export type ProceduralType = 'PILLAR' | 'DOMAIN' | 'HEX_SHAPE' | 'IMPACT_RING' | 'GRID_FIELD';
export type ProceduralVisualDef = PillarVisualDef | DomainVisualDef | HexVisualDef | BeamVisualDef | GridVisualDef;

export type { PillarVisualDef, DomainVisualDef, HexVisualDef, BeamVisualDef, GridVisualDef };
export { DEFAULT_PILLAR_CONFIG, DEFAULT_DOMAIN_CONFIG, DEFAULT_HEX_CONFIG, DEFAULT_BEAM_CONFIG, DEFAULT_GRID_CONFIG };

// --- EXTEND BEAM DATA WITH RED STYLES ---
const RED_BEAM_DATA: Record<string, BeamVisualDef> = {
    'BEAM_RED_DRAIN': {
        type: 'VIBRANT',
        width: 8,
        coreColor: '#ef4444',
        glowColor: '#7f1d1d',
        noiseScale: 3.0, // Erratic
        blendMode: 'lighter'
    },
    'BEAM_RED_LINK': {
        type: 'HELIX',
        width: 5,
        coreColor: '#000000',
        glowColor: '#7c3aed', // Shadow link
        helixFreq: 0.2,
        helixAmp: 6,
        blendMode: 'source-over'
    }
};

// --- EXTEND GRID DATA WITH RED STYLES ---
const RED_GRID_DATA: Record<string, GridVisualDef> = {
    'GRID_RED_RITUAL': {
        type: 'GRID_FIELD',
        color: '#b91c1c',
        height: 5,
        isLiquid: false,
        opacity: 0.9,
        blendMode: 'multiply' // Darken ground
    },
    'GRID_RED_POISON': {
        type: 'GRID_FIELD',
        color: '#a3e635',
        height: 20, // Rising gas
        isLiquid: false,
        opacity: 0.5,
        blendMode: 'screen'
    }
};

export const PROCEDURAL_VISUALS: Record<string, ProceduralVisualDef> = {
    ...PILLAR_DATA,
    ...DOMAIN_DATA,
    ...HEX_DATA,
    ...BEAM_DATA,
    ...GRID_DATA,
    ...RED_BEAM_DATA,
    ...RED_GRID_DATA
};
