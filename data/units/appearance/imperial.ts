import { RoleAppearance, FactionAppearanceProfile } from './types';
import { THEME_IMPERIAL } from '../../../constants';
import { Role, Team } from '../../../types';

const COMMON_IMPERIAL = {
  primaryColor: '#2563eb',                // Bright Cobalt (matching Factory)
  secondaryColor: THEME_IMPERIAL.energy,   // #60a5fa
  accentColor: THEME_IMPERIAL.secondary,   // #fde047
  capeColor: THEME_IMPERIAL.cape,          // rgba(30, 58, 138, 0.9)
};

export const IMPERIAL_APPEARANCE: FactionAppearanceProfile = {
  factionId: Team.BLUE,
  roles: {
    [Role.WARRIOR]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 38,
      bodyHeight: 46,
      headRadius: 9,
      weaponType: 'sword',
      tokenRadius:    36,
      deepColor:      '#172554',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.TANK]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 46,
      bodyHeight: 44,
      headRadius: 11,
      weaponType: 'shield_mace',
      tokenRadius:    36,
      deepColor:      '#0f172a',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.RANGER]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 32,
      bodyHeight: 50,
      headRadius: 8,
      weaponType: 'bow',
      tokenRadius:    36,
      deepColor:      '#1e3a5f',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.MAGE]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 26,
      bodyHeight: 52,
      headRadius: 8,
      weaponType: 'staff',
      tokenRadius:    36,
      deepColor:      '#1a2f6e',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
    [Role.SUPPORT]: {
      ...COMMON_IMPERIAL,
      bodyWidth: 28,
      bodyHeight: 50,
      headRadius: 9,
      weaponType: 'tome',
      tokenRadius:    36,
      deepColor:      '#1e3a5f',
      rimColor:       '#fcd34d',
      rimShadowColor: '#b45309',
      iconColor:      '#cffafe',
      iconGlow:       '#0ea5e9',
    },
  },
};
