import { describe, it, expect } from 'vitest';
import { DEFAULT_SKILL_DB } from '../skillDatabase';
import { ACTIVE_VISUALS } from '../data/vfx/active_visuals';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';

const isDash = (s: { effectType?: string; effectType2?: string }) => s.effectType === 'DASH' || s.effectType2 === 'DASH';

describe('dash skill visuals', () => {
    const dashSkills = DEFAULT_SKILL_DB.filter(isDash);

    it('there are dash skills to check', () => {
        expect(dashSkills.length).toBeGreaterThanOrEqual(3);
    });

    it('every dash skill uses the DASH_ASSAULT archetype and its sequence opens a streak (BEAM) action', () => {
        for (const s of dashSkills) {
            expect(ACTIVE_VISUALS[s.id]?.archetype, s.id).toBe('DASH_ASSAULT');
            const actions = SKILL_SEQUENCES[s.id]?.actions ?? [];
            expect(actions.some(a => a.type === 'BEAM'), `${s.id} sequence`).toBe(true);
        }
    });

    it('DASH_ASSAULT is only used by skills that really dash', () => {
        const dashIds = new Set(dashSkills.map(s => s.id));
        const misused = Object.entries(ACTIVE_VISUALS)
            .filter(([id, v]) => v.archetype === 'DASH_ASSAULT' && !dashIds.has(id))
            .map(([id]) => id);
        expect(misused).toEqual([]);
    });
});
