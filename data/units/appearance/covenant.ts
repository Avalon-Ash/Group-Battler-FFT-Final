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
      bodyWidth: 36,
      bodyHeight: 45,
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
      bodyWidth: 50,
      bodyHeight: 40,
      headRadius: 10,
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
      bodyWidth: 36,
      bodyHeight: 45,
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
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
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
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'staff',
      tokenRadius:    36,
      deepColor:      '#450a0a',
      rimColor:       '#d97706',
      rimShadowColor: '#78350f',
      iconColor:      '#fdba74',
      iconGlow:       '#ea580c',
    },
  },
};
