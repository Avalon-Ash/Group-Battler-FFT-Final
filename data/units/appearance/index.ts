import { Team } from '../../types';
import { FactionAppearanceProfile } from './types';
import { IMPERIAL_APPEARANCE } from './imperial';
import { COVENANT_APPEARANCE } from './covenant';

export const UNIT_APPEARANCE: Record<string, FactionAppearanceProfile> = {
  [Team.BLUE]: IMPERIAL_APPEARANCE,
  [Team.RED]: COVENANT_APPEARANCE,
};

export * from './types';
