import { TEAM_COLORS } from '../../constants';
import { Team } from '../../types';

/**
 * Converts a hex color string (e.g., '#3b82f6') to space-separated RGB channel string ('59 130 246')
 * for CSS variable alpha channel support: rgb(var(--token) / <alpha-value>).
 */
export function hexToRgbChannels(hex: string): string {
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return `${r} ${g} ${b}`;
    }
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r} ${g} ${b}`;
}

/**
 * Converts an RGB channel string ('59 130 246') back to a hex color string ('#3b82f6').
 */
export function rgbChannelsToHex(channels: string): string {
    const [r, g, b] = channels.trim().split(/\s+/).map(Number);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Semantic UI Tokens SSOT.
 * All color values are formatted as "R G B" channel strings to support Tailwind's opacity modifier syntax (e.g. /20, /50).
 * Team colors directly reference TEAM_COLORS from constants.ts.
 */
export const UI_TOKENS = {
    surface: {
        base: '2 6 23',        // slate-950 (app root background)
        panel: '15 23 42',     // slate-900 (windows, modals, cards)
        slot: '30 41 59',      // slate-800 (inner slots, tabs, chips)
        subtle: '51 65 85',    // slate-700 (card hover, active pill)
        dark: '0 0 0',         // black (overlays, deep backdrops)
        card: '15 23 42',      // slate-900 (liquid-card body)
    },
    line: {
        subtle: '255 255 255', // white (used with /10, /20 opacity in liquid borders)
        muted: '51 65 85',     // slate-700
        default: '71 85 105',  // slate-600
        accent: '6 182 212',   // cyan-500
        danger: '239 68 68',   // red-500
        warn: '245 158 11',    // amber-500
    },
    text: {
        primary: '241 245 249', // slate-100
        base: '226 232 240',    // slate-200
        muted: '148 163 184',   // slate-400
        faint: '100 116 139',   // slate-500
        accent: '34 211 238',   // cyan-400
        danger: '248 113 113',  // red-400
        warn: '251 191 36',     // amber-400
    },
    accent: {
        DEFAULT: '6 182 212',  // cyan-500
        hover: '34 211 238',    // cyan-400
        active: '8 145 178',    // cyan-600
        subtle: '103 232 249',  // cyan-300
        faint: '165 243 252',   // cyan-200
    },
    danger: {
        DEFAULT: '239 68 68',  // red-500
        hover: '248 113 113',   // red-400
        active: '220 38 38',    // red-600
        subtle: '252 165 165',  // red-300
        faint: '254 202 202',   // red-200
        deep: '127 29 29',      // red-900
        dark: '69 10 10',       // red-950
    },
    warn: {
        DEFAULT: '245 158 11', // amber-500
        hover: '251 191 36',    // amber-400
        active: '217 119 6',    // amber-600
        subtle: '252 211 77',   // amber-300
    },
    success: {
        DEFAULT: '16 185 129', // emerald-500
        hover: '52 211 153',    // emerald-400
    },
    team: {
        blue: {
            primary: hexToRgbChannels(TEAM_COLORS[Team.BLUE].primary),
            secondary: hexToRgbChannels(TEAM_COLORS[Team.BLUE].secondary),
            armorLight: hexToRgbChannels(TEAM_COLORS[Team.BLUE].armorLight),
        },
        red: {
            primary: hexToRgbChannels(TEAM_COLORS[Team.RED].primary),
            secondary: hexToRgbChannels(TEAM_COLORS[Team.RED].secondary),
            armorLight: hexToRgbChannels(TEAM_COLORS[Team.RED].armorLight),
        },
    },
} as const;
