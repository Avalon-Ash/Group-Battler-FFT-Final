import { Skill } from './types';
import { BLUE_BASIC, BLUE_ACTIVE, BLUE_ULT } from './data/skills/blue';
import { RED_BASIC, RED_ACTIVE, RED_ULT } from './data/skills/red';
export const DEFAULT_SKILL_DB: Skill[] = [
    ...BLUE_BASIC,
    ...BLUE_ACTIVE,
    ...BLUE_ULT,
    ...RED_BASIC,
    ...RED_ACTIVE,
    ...RED_ULT
];