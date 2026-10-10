import { describe, it, expect } from 'vitest';
import { UI_TOKENS, hexToRgbChannels, rgbChannelsToHex } from '../data/ui/tokens';
import { TEAM_COLORS } from '../constants';
import { Team } from '../types';

describe('UI Tokens SSOT (U11a)', () => {
    it('verifies team colors directly match TEAM_COLORS in constants.ts', () => {
        expect(rgbChannelsToHex(UI_TOKENS.team.blue.primary).toLowerCase())
            .toBe(TEAM_COLORS[Team.BLUE].primary.toLowerCase());
        expect(rgbChannelsToHex(UI_TOKENS.team.blue.secondary).toLowerCase())
            .toBe(TEAM_COLORS[Team.BLUE].secondary.toLowerCase());
        expect(rgbChannelsToHex(UI_TOKENS.team.blue.armorLight).toLowerCase())
            .toBe(TEAM_COLORS[Team.BLUE].armorLight.toLowerCase());

        expect(rgbChannelsToHex(UI_TOKENS.team.red.primary).toLowerCase())
            .toBe(TEAM_COLORS[Team.RED].primary.toLowerCase());
        expect(rgbChannelsToHex(UI_TOKENS.team.red.secondary).toLowerCase())
            .toBe(TEAM_COLORS[Team.RED].secondary.toLowerCase());
        expect(rgbChannelsToHex(UI_TOKENS.team.red.armorLight).toLowerCase())
            .toBe(TEAM_COLORS[Team.RED].armorLight.toLowerCase());
    });

    it('verifies every token leaf value is a valid "R G B" channel string (0-255)', () => {
        const rgbChannelPattern = /^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})$/;

        const validateTokens = (obj: Record<string, unknown>, path: string = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;
                if (typeof value === 'object' && value !== null) {
                    validateTokens(value as Record<string, unknown>, currentPath);
                } else if (typeof value === 'string') {
                    const match = value.match(rgbChannelPattern);
                    expect(match, `Token at ${currentPath} ("${value}") must match "R G B" pattern`).not.toBeNull();
                    if (match) {
                        const [, r, g, b] = match;
                        const rNum = Number(r);
                        const gNum = Number(g);
                        const bNum = Number(b);
                        expect(rNum).toBeGreaterThanOrEqual(0);
                        expect(rNum).toBeLessThanOrEqual(255);
                        expect(gNum).toBeGreaterThanOrEqual(0);
                        expect(gNum).toBeLessThanOrEqual(255);
                        expect(bNum).toBeGreaterThanOrEqual(0);
                        expect(bNum).toBeLessThanOrEqual(255);
                    }
                } else {
                    throw new Error(`Unexpected token value type at ${currentPath}: ${typeof value}`);
                }
            }
        };

        validateTokens(UI_TOKENS);
    });

    it('verifies hexToRgbChannels and rgbChannelsToHex conversion round-trip', () => {
        const testHexes = ['#000000', '#ffffff', '#22d3ee', '#ef4444', '#f59e0b', '#10b981', '#3b82f6'];
        for (const hex of testHexes) {
            const channels = hexToRgbChannels(hex);
            const backHex = rgbChannelsToHex(channels);
            expect(backHex.toLowerCase()).toBe(hex.toLowerCase());
        }
    });

    it('verifies core Tailwind palette values align with official specifications', () => {
        // cyan-400 = #22d3ee = 34 211 238
        expect(UI_TOKENS.accent.hover).toBe('34 211 238');
        // cyan-500 = #06b6d4 = 6 182 212
        expect(UI_TOKENS.accent.DEFAULT).toBe('6 182 212');
        // red-500 = #ef4444 = 239 68 68
        expect(UI_TOKENS.danger.DEFAULT).toBe('239 68 68');
        // slate-950 = #020617 = 2 6 23
        expect(UI_TOKENS.surface.base).toBe('2 6 23');
        // slate-900 = #0f172a = 15 23 42
        expect(UI_TOKENS.surface.panel).toBe('15 23 42');
    });
});
