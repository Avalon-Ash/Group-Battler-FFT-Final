import { Skill } from './types';
import { BLUE_BASIC, BLUE_ACTIVE, BLUE_ULT, BLUE_MOBILITY } from './data/skills/blue';
import { RED_BASIC, RED_ACTIVE, RED_ULT, RED_MOBILITY } from './data/skills/red';
export const DEFAULT_SKILL_DB: Skill[] = [
    ...BLUE_BASIC,
    ...BLUE_ACTIVE,
    ...BLUE_ULT,
    ...BLUE_MOBILITY,
    ...RED_BASIC,
    ...RED_ACTIVE,
    ...RED_ULT,
    ...RED_MOBILITY,
];
