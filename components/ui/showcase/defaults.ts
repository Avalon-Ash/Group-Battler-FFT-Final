
import { MatrixConfig } from './types';

export const DEFAULT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" +
                      "αβγδεζηθικλμνξοπρστυφχψωΩΔΣΦΨ" + // Greek
                      "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン" + // Katakana
                      "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん" + // Hiragana
                      "戰機龍魔神界虚無光影雷風火土水氷剣盾弓矢兵将王帝聖邪鬼神愛憎生死"; // Kanji

export const PRESET_PALETTES = {
    CYAN: { text: '#06b6d4', head: '#ffffff', bg: '#020617' },
    GREEN: { text: '#22c55e', head: '#86efac', bg: '#020617' }, // Matrix Classic
    RED: { text: '#ef4444', head: '#fecaca', bg: '#180404' },   // Red Alert
    GOLD: { text: '#eab308', head: '#fef08a', bg: '#171202' },   // Cyberpunk Gold
    PURPLE: { text: '#a855f7', head: '#e9d5ff', bg: '#0f0518' }  // Synthwave
};

export const DEFAULT_MATRIX_CONFIG: MatrixConfig = {
    enabled: true,
    direction: 'DOWN',
    speed: 1.0,
    fontSize: 16,
    spacing: 0,
    trailLength: 20,
    depthVariance: 0.5,   // Moderate depth by default
    streamGap: 0.2,       // Small gap by default
    volatility: 0.05,
    charSet: DEFAULT_CHARS,
    textColor: '#06b6d4',
    headColor: '#ffffff',
    bgColor: '#020617',
    bgOpacity: 0.5,
    textOpacity: 1.0
};
