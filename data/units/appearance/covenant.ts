import { RoleAppearance, FactionAppearanceProfile } from './types';
import { THEME_COVENANT } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_COVENANT = {
  primaryColor: '#991b1b',    // Dried Blood (matching Factory)
  secondaryColor: THEME_COVENANT.secondary, 
  accentColor: THEME_COVENANT.accent,
  capeColor: null,
};

export const COVENANT_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.RED,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_COVENANT,
      bodyWidth: 38,
      bodyHeight: 48,
      headRadius: 9,
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
      bodyWidth: 52,
      bodyHeight: 44,
      headRadius: 11,
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
      bodyWidth: 30,
      bodyHeight: 50,
      headRadius: 8,
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
      bodyWidth: 26,
      bodyHeight: 52,
      headRadius: 8,
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
      bodyWidth: 28,
      bodyHeight: 50,
      headRadius: 9,
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
