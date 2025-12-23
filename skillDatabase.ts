
import { Skill } from './types';
// We import from the barrel files to keep imports clean, 
// but the data physically lives in the granular files now.
import { BLUE_BASIC, BLUE_ACTIVE, BLUE_ULT } from './data/skills/blue';
import { RED_BASIC, RED_ACTIVE, RED_ULT } from './data/skills/red';

// =========================================================================================
// 技能資料庫架構 (Refactored v6.0 - Granular DBs)
// 
// 為了應對大規模技能擴充，原始資料已被拆分為以下細粒度模組：
// 
// 🔵 藍方 (ALLIANCE)
// - data/skills/blue_basic.ts
// - data/skills/blue_active.ts
// - data/skills/blue_ult.ts
//
// 🔴 紅方 (HORDE)
// - data/skills/red_basic.ts
// - data/skills/red_active.ts
// - data/skills/red_ult.ts
//
// 本檔案僅作為整合出口，確保對外介面不變。
// =========================================================================================

export const DEFAULT_SKILL_DB: Skill[] = [
    ...BLUE_BASIC,
    ...BLUE_ACTIVE,
    ...BLUE_ULT,
    ...RED_BASIC,
    ...RED_ACTIVE,
    ...RED_ULT
];
