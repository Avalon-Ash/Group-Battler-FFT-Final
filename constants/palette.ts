// ╔══════════════════════════════════════════════════════════╗
// ║  constants/palette.ts — 顏色、色盤與視覺主題常數 SSOT       ║
// ║  職責：定義陣營主題色、日誌色、DoT 色與浮動傷害文字顏色     ║
// ╚══════════════════════════════════════════════════════════╝

import { Team } from '../types';

// SSOT: Element Colors for DoT and Effects
export const DOT_COLORS: Record<string, string> = {
    BURN: '#f97316', // 鍵＝agent.effects.DOT.tag（CCManager 只寫 'BURN'／'POISON'）；原為 FIRE，燃燒誤用綠色後備色
    POISON: '#10b981',
    VOID: '#a855f7',
    ICE: '#3b82f6',
    COVENANT: '#ef4444',
    IMPERIAL: '#3b82f6'
};

// SSOT: Floating Combat Text Colors
export const DAMAGE_TEXT_COLORS = {
    DASH: '#60a5fa',
    MISS: '#9ca3af',
    BLOCK: '#fb923c',
    ABSORB: '#bae6fd',
    HEAL: '#86efac',
    CRIT: '#ef4444',
    VAMP: '#be123c',
    MANA_BURN: '#8b5cf6',
    MANA_RESTORE: '#60a5fa',
    RECOIL: '#ef4444',
    REFLECT: '#f59e0b'
};

export const THEME_IMPERIAL = {
    primary: '#3b82f6',
    secondary: '#fde047',
    armorLight: '#f1f5f9',
    armorDark: '#1e3a8a',
    energy: '#60a5fa',
    cape: 'rgba(30, 58, 138, 0.9)'
};

export const THEME_COVENANT = {
    primary: '#ef4444',
    secondary: '#fb923c',
    armorDark: '#09090b',
    armorBase: '#27272a',
    accent: '#7f1d1d',
    spike: '#18181b'
};

export const TEAM_COLORS = {
    [Team.BLUE]: {
        primary: THEME_IMPERIAL.primary,
        secondary: THEME_IMPERIAL.secondary,
        glow: 'rgba(59, 130, 246, 0.6)',
        armorLight: THEME_IMPERIAL.armorLight,
        borderRadius: '1rem',
    },
    [Team.RED]: {
        primary: THEME_COVENANT.primary,
        secondary: THEME_COVENANT.secondary,
        glow: 'rgba(239, 68, 68, 0.6)',
        armorLight: '#fca5a5',
        borderRadius: '0.25rem',
    },
} as const;

export const LOG_COLORS = {
    MOVE: '#38bdf8',
    CAST: '#fbbf24',
    HIT: '#f87171',
    HEAL: '#4ade80',
    DECISION: '#c084fc',
    DEATH: '#94a3b8',
    CC: '#facc15',
    SYSTEM: '#64748b',
    HAZARD: '#fb923c'
};

export const PALETTE = {
    UI_BG: '#020617',
    UI_BORDER: '#1e293b',
    SHADOW: 'rgba(0, 0, 0, 0.6)',
    TEAMS: {
        [Team.BLUE]: { main: '#2563eb', dark: '#1e3a8a', light: '#fbbf24', glow: 'rgba(59, 130, 246, 0.8)', accent: '#f8fafc' },
        [Team.RED]: { main: '#dc2626', dark: '#450a0a', light: '#fca5a5', glow: 'rgba(220, 38, 38, 0.8)', accent: '#2d0a0a' }
    },
    DAMAGE: '#ffffff',
    HEAL: '#10b981',
    CRIT: '#ef4444',
    MAGIC: '#8b5cf6'
};
