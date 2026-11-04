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

export function formatRgba(red: number, green: number, blue: number, alpha: number): string {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Semantic UI Tokens SSOT.
 * UI_TOKENS uses "R G B" channels for Tailwind opacity modifiers; UI_LITERAL_TOKENS keeps exact CSS color strings.
 * Team colors directly reference TEAM_COLORS from constants/palette.ts.
 */
export const UI_LITERAL_TOKENS = {
    slate500: '#64748b',
    slate600: '#475569',
    slate700: '#334155',
    slate300: '#cbd5e1',
    slate400: '#94a3b8',
    sky400: '#38bdf8',
    sky400Tint20: 'rgba(56, 189, 248, 0.2)',
    cyan500: '#06b6d4',
    cyan400: '#22d3ee',
    cyan300: '#67e8f9',
    cyanBrightTint20: 'rgba(34, 211, 238, 0.2)',
    amber400: '#fbbf24',
    amber300: '#fcd34d',
    amberTint20: 'rgba(245, 158, 11, 0.2)',
    amberTint50: 'rgba(245, 158, 11, 0.5)',
    emerald400: '#4ade80',
    emerald500: '#10b981',
    emeraldTint70: 'rgba(34, 197, 94, 0.7)',
    blue400: '#60a5fa',
    blueTint70: 'rgba(59, 130, 246, 0.7)',
    red300: '#fca5a5',
    redTint25: 'rgba(239, 68, 68, 0.25)',
    redTint50: 'rgba(239, 68, 68, 0.5)',
    whiteTint5: 'rgba(255, 255, 255, 0.05)',
    whiteTint20: 'rgba(255, 255, 255, 0.2)',
    whiteTint60: 'rgba(255, 255, 255, 0.6)',
    cyanTint20: 'rgba(6, 182, 212, 0.2)',
    cyanTint40: 'rgba(6, 182, 212, 0.4)',
    purpleTint20: 'rgba(168, 85, 247, 0.2)',
    purpleTint50: 'rgba(168, 85, 247, 0.5)',
    purple300: '#d8b4fe',
    white: '#ffffff',
    slateTint50: 'rgba(51, 65, 85, 0.5)',
    blackTint50: 'rgba(0,0,0,0.5)',
    redTint40: 'rgba(239, 68, 68, 0.4)',
} as const;

/**
 * 材質（完整 CSS 值，輸出成 --mat-*）。分級規則見 docs/UI_REFRESH_PLAN.md：
 * 外殼才有真模糊，內部元件只用半透明底、細邊框、頂部高光。
 * 數值來自 2026-11-04 GPT 視覺審查，外殼不透明度由主代理依白色爆閃的對比調整。
 */
export const UI_MATERIAL_TOKENS = {
    shell: {
        window: 'rgba(16, 24, 38, 0.82)',
        hud: 'rgba(16, 24, 38, 0.74)',
        popover: 'rgba(16, 24, 38, 0.88)',
        border: 'rgba(220, 235, 255, 0.18)',
        highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        shadow: '0 12px 32px rgba(0, 0, 0, 0.36), 0 2px 8px rgba(0, 0, 0, 0.24)',
    },
    solid: {
        inactive: '#141c29',
        maximized: '#101826',
        highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    },
    control: {
        bg: 'rgba(255, 255, 255, 0.04)',
        border: 'rgba(220, 235, 255, 0.16)',
        hoverBg: 'rgba(255, 255, 255, 0.08)',
        hoverBorder: 'rgba(220, 235, 255, 0.28)',
        pressBg: 'rgba(0, 0, 0, 0.18)',
        pressBorder: 'rgba(220, 235, 255, 0.24)',
        onBg: 'rgba(103, 217, 232, 0.14)',
        onBorder: 'rgba(103, 217, 232, 0.55)',
        offBg: 'rgba(255, 255, 255, 0.02)',
        offBorder: 'rgba(220, 235, 255, 0.08)',
        highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    },
    card: {
        bg: 'rgba(255, 255, 255, 0.035)',
        border: 'rgba(220, 235, 255, 0.10)',
    },
    well: {
        bg: 'rgba(0, 0, 0, 0.18)',
        border: 'rgba(220, 235, 255, 0.16)',
        shadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.20)',
    },
    primary: {
        bg: '#67d9e8',
        hover: '#83e3ef',
        press: '#4cc5d6',
        fg: '#10202b',
        border: 'rgba(255, 255, 255, 0.24)',
    },
    danger: {
        bg: 'rgba(255, 143, 154, 0.12)',
        hover: 'rgba(255, 143, 154, 0.20)',
        press: 'rgba(255, 143, 154, 0.28)',
        fg: '#ffb4bc',
        border: 'rgba(255, 143, 154, 0.45)',
    },
    focus: '#67d9e8',
    scrollThumb: 'rgba(166, 178, 194, 0.40)',
    scrollThumbHover: 'rgba(166, 178, 194, 0.65)',
} as const;

/**
 * 真模糊的值。必須直接寫進 CSS，不能走 custom property：
 * Safari 18.2 起 -webkit-backdrop-filter 的值來自變數時不會生效（WebKit bug 289149）。
 */
export const UI_GLASS_BLUR = 'blur(20px) saturate(130%)';

/** 尺度（輸出成 --ui-*）。手機版在 index.css 的 coarse 媒體查詢覆寫。 */
export const UI_SCALE_TOKENS = {
    radius: { window: '16px', card: '10px', control: '8px', tag: '4px', pill: '999px' },
    controlH: '36px',
    controlHSm: '28px',
    font: {
        num: '11px', numLh: '16px',
        label: '12px', labelLh: '16px',
        body: '13px', bodyLh: '20px',
        title: '16px', titleLh: '22px',
        display: '40px', displayLh: '44px',
        hero: '72px', heroLh: '76px',
    },
    scrollbar: '8px',
} as const;

export const UI_TOKENS = {
    fg: {
        primary: '241 245 249',
        secondary: '205 213 224',
        muted: '166 178 194',
        disabled: '135 147 163',
    },
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
        DEFAULT: '103 217 232',
        hover: '131 227 239',
        active: '76 197 214',
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
