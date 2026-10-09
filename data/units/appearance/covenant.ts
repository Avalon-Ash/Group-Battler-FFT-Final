import { RoleAppearance, FactionAppearanceProfile } from './types';
import { THEME_COVENANT } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_COVENANT = {
  primaryColor: '#991b1b',    // Dried Blood (matching Factory)
  secondaryColor: THEME_COVENANT.secondary, 
  accentColor: THEME_COVENANT.accent,
  capeColor: null,
  highlightColor: '#c0392b',  // Crimson Specular Highlight
};

export const COVENANT_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.RED,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_COVENANT,
      highlightColor: '#c0392b',
      bodyWidth: 42,
      bodyHeight: 44,
      headRadius: 11,
      weaponType: 'sword',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.TANK]: {
      ...COMMON_COVENANT,
      highlightColor: '#f87171',
      bodyWidth: 54,
      bodyHeight: 41,
      headRadius: 12,
      weaponType: 'shield_mace',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.RANGER]: {
      ...COMMON_COVENANT,
      highlightColor: '#ef4444',
      bodyWidth: 34,
      bodyHeight: 46,
      headRadius: 9,
      weaponType: 'bow',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.MAGE]: {
      ...COMMON_COVENANT,
      highlightColor: '#f87171',
      bodyWidth: 38,
      bodyHeight: 46,
      headRadius: 11,
      weaponType: 'staff',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
    [Role.SUPPORT]: {
      ...COMMON_COVENANT,
      highlightColor: '#fb923c',
      bodyWidth: 36,
      bodyHeight: 44,
      headRadius: 10,
      weaponType: 'tome',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
  },
};
