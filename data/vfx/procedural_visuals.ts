
import { PillarVisualDef, PILLAR_DATA, DEFAULT_PILLAR_CONFIG } from './procedural/pillar_visuals';
import { DomainVisualDef, DOMAIN_DATA, DEFAULT_DOMAIN_CONFIG } from './procedural/domain_visuals';
import { HexVisualDef, HEX_DATA, DEFAULT_HEX_CONFIG } from './procedural/hex_visuals';
import { BeamVisualDef, BEAM_DATA, DEFAULT_BEAM_CONFIG } from './procedural/beam_visuals';
import { GridVisualDef, GRID_DATA, DEFAULT_GRID_CONFIG } from './procedural/grid_visuals';

// =========================================================================================
// 🔮 PROCEDURAL VISUAL HUB
// 
// Aggregates specialized visual definitions into a single lookup for the Renderer.
// =========================================================================================

export type ProceduralType = 'PILLAR' | 'DOMAIN' | 'HEX_SHAPE' | 'IMPACT_RING' | 'GRID_FIELD';

// Union Type for Renderer consumption
export type ProceduralVisualDef = PillarVisualDef | DomainVisualDef | HexVisualDef | BeamVisualDef | GridVisualDef;

// Exports for direct access by Renderer
export { PillarVisualDef, DomainVisualDef, HexVisualDef, BeamVisualDef, GridVisualDef };
export { DEFAULT_PILLAR_CONFIG, DEFAULT_DOMAIN_CONFIG, DEFAULT_HEX_CONFIG, DEFAULT_BEAM_CONFIG, DEFAULT_GRID_CONFIG };

// Central Registry
export const PROCEDURAL_VISUALS: Record<string, ProceduralVisualDef> = {
    ...PILLAR_DATA,
    ...DOMAIN_DATA,
    ...HEX_DATA,
    ...BEAM_DATA,
    ...GRID_DATA
};
