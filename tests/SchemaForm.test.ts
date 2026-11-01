import { describe, it, expect, vi } from 'vitest';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    ZONE_SETTINGS_SCHEMA,
    GAMEPLAY_SETTINGS_SCHEMA,
    ToggleSettingField,
    SliderSettingField,
} from '../data/ui/settingsSchema';
import { UI_SETTINGS } from '../constants';

describe('settingsSchema SSOT (E4)', () => {
    describe('DIRECTOR_SETTINGS_SCHEMA', () => {
        it('has valid directorEnabled toggle field', () => {
            const field = DIRECTOR_SETTINGS_SCHEMA.find((f) => f.id === 'directorEnabled') as ToggleSettingField;
            expect(field).toBeDefined();
            expect(field.kind).toBe('toggle');
            expect(field.createCommand(true)).toEqual({
                type: 'SET_DIRECTOR_ENABLED',
                enabled: true,
            });
            expect(field.createCommand(false)).toEqual({
                type: 'SET_DIRECTOR_ENABLED',
                enabled: false,
            });
        });

        it('has valid camera stiffness slider fields bounded by UI_SETTINGS', () => {
            const follow = DIRECTOR_SETTINGS_SCHEMA.find((f) => f.id === 'followStiffness') as SliderSettingField;
            expect(follow).toBeDefined();
            expect(follow.kind).toBe('slider');
            expect(follow.min).toBe(UI_SETTINGS.CAMERA_STIFFNESS.min);
            expect(follow.max).toBe(UI_SETTINGS.CAMERA_STIFFNESS.sliderMax);
            expect(follow.createCommand(1.2)).toEqual({
                type: 'SET_CAMERA_TUNING',
                followStiffness: 1.2,
            });

            const zoom = DIRECTOR_SETTINGS_SCHEMA.find((f) => f.id === 'zoomStiffness') as SliderSettingField;
            expect(zoom).toBeDefined();
            expect(zoom.kind).toBe('slider');
            expect(zoom.createCommand(2.5)).toEqual({
                type: 'SET_CAMERA_TUNING',
                zoomStiffness: 2.5,
            });
        });

        it('groups fields under headings: director first, shake last', () => {
            const kinds = DIRECTOR_SETTINGS_SCHEMA.map((f) => `${f.kind}:${f.id}`);
            expect(kinds[0]).toBe('heading:headingDirector');
            const shakeAt = kinds.indexOf('heading:headingShake');
            expect(shakeAt).toBeGreaterThan(0);
            expect(DIRECTOR_SETTINGS_SCHEMA.slice(shakeAt + 1).map((f) => f.id)).toEqual([
                'shakeStrength',
                'shakeOffFocus',
                'shakeMax',
            ]);
        });
    });

    describe('GAMEPLAY_SETTINGS_SCHEMA', () => {
        it('puts the faction controls first, then the zone fields', () => {
            expect(GAMEPLAY_SETTINGS_SCHEMA.map((f) => f.id)).toEqual([
                'headingFactions',
                'battleFactions',
                'battleUnitsPerFaction',
                'battleApply',
                'headingZone',
                ...ZONE_SETTINGS_SCHEMA.map((f) => f.id),
            ]);
            const factions = GAMEPLAY_SETTINGS_SCHEMA.find((f) => f.id === 'battleFactions') as SliderSettingField;
            expect(factions.min).toBe(UI_SETTINGS.BATTLE_FACTIONS.min);
            expect(factions.createCommand(3)).toEqual({ type: 'SET_BATTLE_SETUP', setup: { factions: 3 } });
            const units = GAMEPLAY_SETTINGS_SCHEMA.find((f) => f.id === 'battleUnitsPerFaction') as SliderSettingField;
            expect(units.createCommand(1)).toEqual({ type: 'SET_BATTLE_SETUP', setup: { unitsPerFaction: 1 } });
        });
    });

    describe('ZONE_SETTINGS_SCHEMA', () => {
        it('has valid zone config fields matching UI_SETTINGS bounds', () => {
            const toggle = ZONE_SETTINGS_SCHEMA.find((f) => f.id === 'zoneEnabled') as ToggleSettingField;
            expect(toggle.createCommand(true)).toEqual({
                type: 'SET_ZONE_CONFIG',
                config: { enabled: true },
            });

            const initial = ZONE_SETTINGS_SCHEMA.find((f) => f.id === 'initialRadius') as SliderSettingField;
            expect(initial.min).toBe(UI_SETTINGS.ZONE_INITIAL_RADIUS.min);
            expect(initial.max).toBe(UI_SETTINGS.ZONE_INITIAL_RADIUS.max);
            expect(initial.createCommand(12)).toEqual({
                type: 'SET_ZONE_CONFIG',
                config: { initialRadius: 12 },
            });

            const interval = ZONE_SETTINGS_SCHEMA.find((f) => f.id === 'shrinkInterval') as SliderSettingField;
            expect(interval.min).toBe(UI_SETTINGS.ZONE_SHRINK_INTERVAL.min);
            expect(interval.max).toBe(UI_SETTINGS.ZONE_SHRINK_INTERVAL.max);
            expect(interval.createCommand(25)).toEqual({
                type: 'SET_ZONE_CONFIG',
                config: { shrinkInterval: 25 },
            });

            const minR = ZONE_SETTINGS_SCHEMA.find((f) => f.id === 'minRadius') as SliderSettingField;
            expect(minR.min).toBe(UI_SETTINGS.ZONE_MIN_RADIUS.min);
            expect(minR.max).toBe(UI_SETTINGS.ZONE_MIN_RADIUS.max);
            expect(minR.createCommand(2)).toEqual({
                type: 'SET_ZONE_CONFIG',
                config: { minRadius: 2 },
            });
        });
    });
});
