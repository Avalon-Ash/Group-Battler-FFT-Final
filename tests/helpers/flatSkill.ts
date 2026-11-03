// 測試用：用編輯面板的欄位（ccType、effectType…）寫技能，轉成動作清單
import { actionsFromFlat, FLAT_SKILL_FIELDS, type FlatSkillFields, type SkillActionLists } from '../../data/skills/flatView';

export type FlatSpec<T> = T & FlatSkillFields;

export function flatSkill<T extends object>(spec: FlatSpec<T>): Omit<T, keyof FlatSkillFields> & SkillActionLists {
    const flat: FlatSkillFields = {};
    const rest = { ...spec } as Record<string, unknown>;
    for (const key of FLAT_SKILL_FIELDS) {
        if (key in rest) {
            Object.assign(flat, { [key]: rest[key] });
            delete rest[key];
        }
    }
    return { ...rest, ...actionsFromFlat(flat) } as Omit<T, keyof FlatSkillFields> & SkillActionLists;
}
