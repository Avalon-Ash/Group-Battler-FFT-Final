import type { VFXRampId } from "./parts/vfxPalette";
import type { SigilEmblem } from "../../engine/renderers/vfxparts/PartSpec";
import { Team, type Skill } from "../../types";

// =========================================================================================
// 陣營 × 技能屬性 → 零件色階（SSOT）。零件不吃技能顏色，需要「看得出屬性」的繪製（詠唱環、聖域）從這裡選色階：
// 同一個陣營的冰／毒／血一眼分得出來，但仍維持陣營的色調（獅心乾淨金藍、灰燼深紅焦黑）。
// 沒有屬性的技能用 DEFAULT。
// =========================================================================================

export type SkillElement = NonNullable<Skill['element']>;

const ELEMENT_RAMPS: Readonly<Record<Team, Readonly<Record<SkillElement | 'DEFAULT', VFXRampId>>>> = {
    [Team.BLUE]: {
        DEFAULT: 'LION_ARCANE',
        PHYSICAL: 'LION_PHYSICAL',
        FIRE: 'LION_HOLY',
        ICE: 'LION_ICE',
        LIGHTNING: 'LION_LIGHTNING',
        HOLY: 'LION_HOLY',
        VOID: 'LION_VOID',
        POISON: 'STATUS_GREEN',
        ARCANE: 'LION_ARCANE',
        BLOOD: 'ASH_BLOOD',
    },
    [Team.RED]: {
        DEFAULT: 'ASH_FIRE',
        PHYSICAL: 'ASH_PHYSICAL',
        FIRE: 'ASH_FIRE',
        ICE: 'LION_ICE',
        LIGHTNING: 'ASH_FIRE',
        HOLY: 'ASH_FIRE',
        VOID: 'ASH_VOID',
        POISON: 'ASH_POISON',
        ARCANE: 'ASH_VOID',
        BLOOD: 'ASH_BLOOD',
    },
};

/** 奧義聖域的陣營紋章（PartSpec sigil） */
export const ULT_SANCTUM_EMBLEM: Readonly<Record<Team, SigilEmblem>> = {
    [Team.BLUE]: 'sun',
    [Team.RED]: 'hornSkull',
};

export function elementRamp(team: Team, element: Skill['element']): VFXRampId {
    return ELEMENT_RAMPS[team][element ?? 'DEFAULT'];
}
