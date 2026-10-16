import { describe, it, expect } from 'vitest';
import { SKILL_SEQUENCES } from '../data/vfx/SkillSequences';

// 技能 id = 職業字母 + 陣營字母 + _ + 種類（例：rb_a1 = 獅心弓手）；序列不得混用對方陣營的預設特效。
const RED_ONLY = /^FX_(COVENANT|HIT_RED|ULT_RED)_/;
const BLUE_ONLY = /^FX_(IMPERIAL|HIT_BLUE|ULT_BLUE)_/;

describe('skill sequence faction defaults', () => {
    it('blue skills never use Ashen defaults and red skills never use Lionheart defaults', () => {
        const wrong: string[] = [];
        for (const [id, seq] of Object.entries(SKILL_SEQUENCES)) {
            const team = id[1];
            for (const a of seq.actions ?? []) {
                if (!a.id) continue;
                if (team === 'b' && RED_ONLY.test(a.id)) wrong.push(`${id}: ${a.id}`);
                if (team === 'r' && BLUE_ONLY.test(a.id)) wrong.push(`${id}: ${a.id}`);
            }
        }
        expect(wrong).toEqual([]);
    });

    it('Lionheart ranger and mage actives open with the imperial scan flavor', () => {
        // 曾因 prefix.includes('r') 把 rb（獅心弓手）判成紅方，主動技改走灰燼分支
        for (const prefix of ['rb', 'mb']) {
            for (let i = 1; i <= 5; i++) {
                const seq = SKILL_SEQUENCES[`${prefix}_a${i}`];
                if (!seq) continue;
                expect(seq.actions[0]?.id, `${prefix}_a${i}`).toBe('FX_IMPERIAL_SCAN');
            }
        }
    });
});
