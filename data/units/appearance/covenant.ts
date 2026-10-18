import { FactionAppearanceProfile } from './types';
import { THEME_COVENANT } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_COVENANT = {
  primaryColor: '#991b1b',    // Dried Blood (matching Factory)
  secondaryColor: THEME_COVENANT.secondary, 
  highlightColor: '#c0392b',  // Crimson Specular Highlight
  innerRimColor: 'rgba(255, 160, 50, 0.30)',
  // 棋座邊框：焦黑鐵（與 Lionheart 的金邊區隔；餘燼色在 FACTION_SKINS 的 ember）
  rimColor: '#78716c',
  rimShadowColor: '#0c0a09',
  runeGlowColor: '#ef4444',
  centerCoreColor: '#000000',
};

export const COVENANT_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.RED,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_COVENANT,
      highlightColor: '#c0392b',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.TANK]: {
      ...COMMON_COVENANT,
      highlightColor: '#f87171',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.RANGER]: {
      ...COMMON_COVENANT,
      highlightColor: '#ef4444',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.MAGE]: {
      ...COMMON_COVENANT,
      highlightColor: '#f87171',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.SUPPORT]: {
      ...COMMON_COVENANT,
      highlightColor: '#fb923c',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
  },
};
