import { RoleAppearance, FactionAppearanceProfile } from './types';
import { THEME_IMPERIAL } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_IMPERIAL = {
  primaryColor: THEME_IMPERIAL.primary,    // #3b82f6
  secondaryColor: THEME_IMPERIAL.energy,   // #60a5fa
  accentColor: THEME_IMPERIAL.secondary,   // #fde047
  capeColor: THEME_IMPERIAL.cape,          // rgba(30, 58, 138, 0.9)
};

export const IMPERIAL_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.BLUE,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'sword',
    },
    [Role.TANK]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 44,
      bodyHeight: 45,
      headRadius: 10,
      weaponType: 'shield_mace',
    },
    [Role.RANGER]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 36,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'bow',
    },
    [Role.MAGE]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 24,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'staff',
    },
    [Role.SUPPORT]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 24,
      bodyHeight: 45,
      headRadius: 9,
      weaponType: 'tome',
    },
  },
};
