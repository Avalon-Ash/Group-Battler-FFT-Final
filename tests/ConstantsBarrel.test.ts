import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as C from '../constants';

export const EXPECTED_EXPORTS = [
    'AFTERIMAGE',
    'AGENT_CONSTANTS',
    'AGENT_MODEL_CENTER_Z',
    'ANNOUNCER_TEXT_COLORS',
    'AOE_INDICATOR',
    'AUDIO',
    'AUDIO_HEAVY_HIT_DAMAGE',
    'BACKGROUND_COLORS',
    'BACKGROUND_FX',
    'BATTLE_RULES',
    'BLOCK_HEIGHT',
    'BT_NODE_RULES',
    'BT_RULES',
    'CAST_LOCKOUT',
    'CAST_RING',
    'CAST_RULES',
    'CC_RULES',
    'CLASS_GLYPH',
    'COMBAT_PARAM',
    'CONTROL_RULES',
    'CORE_VISUAL',
    'DAMAGE_RULES',
    'DAMAGE_TEXT_COLORS',
    'DEATH_KNOCKBACK',
    'DEATH_VFX',
    'DEFAULT_HEX_LAYOUT',
    'DEFAULT_ZONE_CONFIG',
    'DOT_COLORS',
    'EFFECT_LIMITS',
    'ENV_SPRITE',
    'FIXED_ORIENTATION_PARTICLE_TYPES',
    'FLOATING_TEXT',
    'FLOAT_BOB',
    'FORCED_MOVE',
    'GRID_OVERLAY',
    'GRID_SPATIAL',
    'GROUND_DRAPE',
    'HAZARD_RULES',
    'HEX_SIZE',
    'HIT_REACTION_RULES',
    'HUD_ANCHOR',
    'HUD_BAR',
    'HUD_COLORS',
    'HUD_GAUGE',
    'HUD_LAYOUT',
    'ISO_SCALE_Y',
    'KILL_SPREE_MAX_TIER',
    'KILL_SPREE_MIN_KILLS',
    'KILL_STREAK_WINDOW',
    'LAST_STAND_BANNER',
    'LOG_COLORS',
    'MAP_GENERATION',
    'MAX_ARC_HEIGHT',
    'MAX_TERRAIN_TIER',
    'MOVEMENT_RULES',
    'OBSTACLE_SPRITE',
    'OBSTACLE_STYLES',
    'PALETTE',
    'PARTICLE_TRAITS',
    'PART_PARTICLE_TYPES',
    'PATH_RULES',
    'PHYSICAL_PARTICLE_TYPES',
    'PHYSICS',
    'PROJECTILE_RENDER',
    'PROJECTILE_RULES',
    'RENDER_CACHE',
    'RENDER_HOTSPOT_CACHE',
    'RENDER_PERF',
    'RENDER_QUALITY',
    'SCREEN_CONSTANTS',
    'SELF_DRAWN_PARTICLE_TYPES',
    'SHIELD_VISUAL',
    'SHOUT_GLOW',
    'TACTICAL_COLORS',
    'TARGET_RULES',
    'TEAM_COLORS',
    'TERRAIN_SKIN',
    'TERRAIN_THEMES',
    'TEXT_ANIM',
    'TEXT_BREAK_JITTER',
    'TEXT_PAINTER_COLORS',
    'THEME_COVENANT',
    'THEME_IMPERIAL',
    'UI_PIN',
    'UI_SETTINGS',
    'UI_WINDOW',
    'UI_Z',
    'ULT_FEEL',
    'UNIT_BODY_MOTION',
    'UNIT_BODY_OFFSET',
    'UNIT_FRAME',
    'UNIT_HOVER_OFFSET',
    'UNIT_OCCLUSION',
    'UNIT_SCALE',
    'UNIT_SHADOW',
    'UNIT_SPRITE',
    'UNIT_STEP_BLEND',
    'VFX_BIOME_GAIN',
    'VFX_BUDGET',
    'VFX_GROUND_TYPES',
    'VFX_PARAM',
    'VFX_RENDER',
    'VISUAL_ANCHORS',
    'ZONE',
    'ZONE_RENDER',
    'particleBackend',
];

function serialize(v: unknown): unknown {
    if (typeof v === 'function') {
        return 'function';
    }
    if (v instanceof Set) {
        return { __type: 'Set', values: Array.from(v).sort() };
    }
    if (v instanceof Map) {
        return { __type: 'Map', entries: Array.from(v.entries()) };
    }
    return v;
}

describe('Constants Barrel Export Contract', () => {
    it('exports exactly the expected names in sorted order', () => {
        const actualExports = Object.keys(C).sort();
        expect(actualExports).toEqual(EXPECTED_EXPORTS);
    });

    it('matches structural snapshot for each exported value', () => {
        const snapshotPath = path.resolve(__dirname, 'constants-snapshot.json');
        const snapshot: Record<string, unknown> = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

        for (const key of EXPECTED_EXPORTS) {
            const currentVal = serialize((C as Record<string, unknown>)[key]);
            const serializedCurrent = JSON.parse(JSON.stringify(currentVal));
            expect(serializedCurrent, `Value of constant ${key} differs from snapshot`).toEqual(snapshot[key]);
        }
    });
});
