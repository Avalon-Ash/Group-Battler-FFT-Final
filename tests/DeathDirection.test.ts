import { describe, it, expect } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { Team } from '../types';
import { selectSpriteDirection } from '../data/units/appearance/selectSpriteFrame';
import { DEFAULT_HEX_LAYOUT } from '../constants';

// 屍體仍掛著還活著的 target；target 一移動，垂直方向就在 NE/SE 之間來回翻面（曾發生）。
// 死亡後的方向在死亡當下鎖定，死亡動畫期間不再重新推導。
const cfg = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: DEFAULT_HEX_LAYOUT };

describe('dying unit keeps the sprite direction it had when it died', () => {
    it('does not flip when the (still alive) target moves around the corpse', () => {
        const a = new Agent('dying_a', Team.BLUE, 0, 0, cfg);
        const t = new Agent('dying_t', Team.RED, 1, 0, cfg);
        a.facing = 1;
        a.target = t;
        t.py = a.py + 40;
        expect(selectSpriteDirection(a, 0)).toBe('SE');

        a.hp = 0;
        a.deathTimer = 0.01;
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
            t.py = a.py + (i % 2 === 0 ? -80 : 80); // 目標在屍體上下兩側來回
            seen.add(selectSpriteDirection(a, 1 + i * 0.2));
        }
        expect([...seen]).toEqual(['SE']);
    });

    it('a unit that is first seen already dead uses its facing and stays put', () => {
        const a = new Agent('dying_b', Team.RED, 0, 0, cfg);
        const t = new Agent('dying_t2', Team.BLUE, 1, 0, cfg);
        a.facing = -1;
        a.target = t;
        a.hp = 0;
        a.deathTimer = 0.5;
        t.py = a.py - 80;
        const first = selectSpriteDirection(a, 0);
        t.py = a.py + 80;
        expect(first).toBe('SW');
        expect(selectSpriteDirection(a, 5)).toBe('SW');
    });

    it('living units still follow their target', () => {
        const a = new Agent('alive_a', Team.BLUE, 0, 0, cfg);
        const t = new Agent('alive_t', Team.RED, 1, 0, cfg);
        a.facing = 1;
        a.target = t;
        t.py = a.py - 80;
        expect(selectSpriteDirection(a, 0)).toBe('NE');
        t.py = a.py + 80;
        expect(selectSpriteDirection(a, 10)).toBe('SE');
    });
});
