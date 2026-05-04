import { RoleAppearance, FactionAppearanceProfile } from './types';
import { THEME_COVENANT } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_COVENANT = {
  primaryColor: THEME_COVENANT.primary,    // #ef4444
  secondaryColor: THEME_COVENANT.secondary, // #f87171
  accentColor: THEME_COVENANT.accent,      // #7f1d1d
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
    },
    [Role.TANK]: {
      ...COMMON_COVENANT,
      bodyWidth: 50,
      bodyHeight: 40,
      headRadius: 10,
      weaponType: 'shield_mace',
    },
    [Role.RANGER]: {
      ...COMMON_COVENANT,
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'bow',
    },
    [Role.MAGE]: {
      ...COMMON_COVENANT,
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'staff',
    },
    [Role.SUPPORT]: {
      ...COMMON_COVENANT,
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'staff',
    },
  },
};
