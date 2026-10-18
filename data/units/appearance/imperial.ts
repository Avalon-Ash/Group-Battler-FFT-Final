import { FactionAppearanceProfile } from './types';
import { THEME_IMPERIAL } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_IMPERIAL = {
  primaryColor: '#2563eb',                // Bright Cobalt (matching Factory)
  secondaryColor: THEME_IMPERIAL.energy,   // #60a5fa
  highlightColor: '#6b9fff',               // Cerulean Specular Highlight
  innerRimColor: 'rgba(255, 255, 255, 0.12)',
  techRingColor: 'rgba(255, 255, 255, 0.3)',
  runeGlowColor: '#93c5fd',
};

export const IMPERIAL_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.BLUE,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_IMPERIAL,
      highlightColor: '#6b9fff',
      tokenRadius:    36,
      deepColor:      '#172554',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.TANK]: {
      ...COMMON_IMPERIAL,
      highlightColor: '#93c5fd',
      tokenRadius:    36,
      deepColor:      '#0f172a',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.RANGER]: {
      ...COMMON_IMPERIAL,
      highlightColor: '#60a5fa',
      tokenRadius:    36,
      deepColor:      '#1e3a5f',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.MAGE]: {
      ...COMMON_IMPERIAL,
      highlightColor: '#93c5fd',
      tokenRadius:    36,
      deepColor:      '#1a2f6e',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.SUPPORT]: {
      ...COMMON_IMPERIAL,
      highlightColor: '#bae6fd',
      tokenRadius:    36,
      deepColor:      '#1e3a5f',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
  },
};
