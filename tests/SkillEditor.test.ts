import { describe, it, expect } from 'vitest';
import { SKILL_FIELD_GROUPS } from '../components/inspector/InspectorConstants';
import { SKILL_EDITABLE_FIELDS } from '../data/ui/skillEditor';
import { GameEngine } from '../engine/game';

describe('skill DB editor', () => {
    it('every form field is accepted by UPDATE_SKILL', () => {
        const editable = new Set<string>(SKILL_EDITABLE_FIELDS);
        for (const g of SKILL_FIELD_GROUPS) for (const f of g.fields) expect(editable.has(f.key as string)).toBe(true);
    });

    it('select options only offer values the data layer accepts', async () => {
        const { VFX_REGISTRY } = await import('../data/vfx/VFXRegistry');
        const { PROJECTILE_VISUALS } = await import('../data/vfx/projectile_visuals');
        const fields = SKILL_FIELD_GROUPS.flatMap((g) => g.fields);
        const hit = fields.find((f) => f.key === 'visualHitEffect')!;
        const proj = fields.find((f) => f.key === 'visualProjectileEffect')!;
        for (const v of hit.simpleOptions!) if (v !== 'NONE') expect(VFX_REGISTRY[v]).toBeDefined();
        for (const v of proj.simpleOptions!) if (v !== 'NONE') expect(PROJECTILE_VISUALS[v]).toBeDefined();
        expect(fields.find((f) => f.key === 'visual')!.simpleOptions!.some((v) => v.startsWith('HEX_'))).toBe(false);
    });

    it('UPDATE_SKILL writes through the command system and rejects unknown fields / NaN', () => {
        const engine = new GameEngine();
        const skill = engine.skillDB[0];
        const before = skill.power;
        engine.bus.emit('UI_COMMAND', { type: 'UPDATE_SKILL', skillId: skill.id, field: 'power', value: before + 7 });
        expect(skill.power).toBe(before + 7);
        engine.bus.emit('UI_COMMAND', { type: 'UPDATE_SKILL', skillId: skill.id, field: 'power', value: Number.NaN });
        expect(skill.power).toBe(before + 7);
        engine.bus.emit('UI_COMMAND', { type: 'UPDATE_SKILL', skillId: skill.id, field: 'id', value: 'hacked' });
        expect(skill.id).not.toBe('hacked');
        engine.bus.emit('UI_COMMAND', { type: 'UPDATE_SKILL', skillId: skill.id, field: 'power', value: before });
    });
});
