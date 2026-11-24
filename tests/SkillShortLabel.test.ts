import { describe, it, expect } from 'vitest';
import { factorySkills } from '../engine/core/MatchSnapshot';
import { skillShortLabel, SKILL_SHORT_LABEL_LENGTH } from '../data/ui/labels/play';

/**
 * PLAY 技能鈕上的縮寫（使用者 2026-11-24：很多招共用同一個圖示，鈕上要加技能名縮寫）。
 * 同一職業、不同槽的技能可能同時出現在一個主角身上，縮寫不能撞；陣營不分開算（比 PLAY 實際抽法更嚴）。
 */
describe('skillShortLabel', () => {
    const skills = factorySkills();

    it('is exactly SKILL_SHORT_LABEL_LENGTH characters for every skill', () => {
        const bad = skills.filter((s) => [...skillShortLabel(s)].length !== SKILL_SHORT_LABEL_LENGTH).map((s) => `${s.id}:${skillShortLabel(s)}`);
        expect(bad).toEqual([]);
    });

    it('never starts with a particle like 之 (淨化之光 → 淨化, not 之光)', () => {
        expect(skills.filter((s) => skillShortLabel(s).startsWith('之')).map((s) => s.id)).toEqual([]);
    });

    it('does not collide between skills one hero can carry together (same role, different slot)', () => {
        const clashes: string[] = [];
        for (const a of skills) for (const b of skills) {
            if (a.id >= b.id || a.role !== b.role || a.tag === b.tag) continue;
            if (skillShortLabel(a) === skillShortLabel(b)) clashes.push(`${a.role} ${skillShortLabel(a)}: ${a.id}${a.name} / ${b.id}${b.name}`);
        }
        expect(clashes).toEqual([]);
    });

    it('is a substring of the skill name (an abbreviation, not a new word)', () => {
        expect(skills.filter((s) => !s.name.includes(skillShortLabel(s))).map((s) => `${s.id}:${s.name}→${skillShortLabel(s)}`)).toEqual([]);
    });
});
