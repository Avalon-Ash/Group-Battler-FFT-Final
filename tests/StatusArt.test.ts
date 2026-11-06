import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Agent } from '../engine/core/Agent';
import { Role, Team, AnimState } from '../types';
import { STATUS_ART, STATUS_ART_FIT, POISON_MATERIAL } from '../data/vfx/statusArt';
import { StatusArtPainter } from '../engine/renderers/status/painters/StatusArtPainter';
import { selectSpriteFrame, type SpriteFrameSelection } from '../data/units/appearance/selectSpriteFrame';
import { computeSpriteDrawRect } from '../engine/renderers/units/factions/SpriteUnitRenderer';

describe('approved status artwork', () => {
    it('ships only the 21 accepted cells in a 1024×384 PNG', () => {
        const png = readFileSync('public/assets/cc_bodies/status-effects.png');
        expect(png.subarray(1, 4).toString()).toBe('PNG');
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1024, 384]);
        const ranges = [STATUS_ART.stun, STATUS_ART.burn, STATUS_ART.poison, STATUS_ART.root];
        expect(ranges.map(x => [x.first, x.count])).toEqual([[0, 8], [8, 8], [16, 4], [20, 1]]);
        expect(STATUS_ART.path).toBe('assets/cc_bodies/status-effects.png');
    });
    it('has a fixed poison-only 3MiB pool, ten complete pose pages and four spare cells', () => {
        const p = POISON_MATERIAL;
        expect(p.width * p.height * p.channels).toBe(3145728);
        expect(p.width / p.cellW * (p.height / p.cellH)).toBe(64);
        expect(p.pages * p.framesPerPage).toBe(60);
        expect(p.framesPerTask).toBe(2);
        expect(p.mix).toBe(0.47);
    });
    it('covers every class with positive torso and leg fits, independent of hue', () => {
        expect(Object.keys(STATUS_ART_FIT).sort()).toEqual(Object.values(Role).sort());
        for (const fit of Object.values(STATUS_ART_FIT)) {
            expect(fit.torsoX).toBeGreaterThan(0);
            expect(fit.torsoY).toBeGreaterThan(0);
            expect(fit.rootX).toBeGreaterThan(0);
            expect(Number.isFinite(fit.offsetY)).toBe(true);
        }
    });
    it('derives stun/interrupt visuals without writing simulation and suppresses frozen/sheep sway', () => {
        const a = new Agent('art', Team.BLUE, 0, 0, { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' });
        expect(StatusArtPainter.stunned(a)).toBe(false);
        a.effects.STUN.remaining = 2;
        const before = JSON.stringify(a.effects);
        expect(StatusArtPainter.stunned(a)).toBe(true);
        a.view.visualStatus = 'FROZEN'; expect(StatusArtPainter.stunned(a)).toBe(false);
        a.view.visualStatus = 'POLYMORPH'; expect(StatusArtPainter.stunned(a)).toBe(false);
        expect(JSON.stringify(a.effects)).toBe(before);
    });
    it('reuses pose selection and draw rectangles without changing idle/walk/hit/death results', () => {
        const a = new Agent('reuse', Team.BLUE, 0, 0, { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' });
        const out: SpriteFrameSelection = { anim: '', dir: 'SE', frameIndex: 0 };
        for (const state of [AnimState.IDLE, AnimState.MOVE, AnimState.HIT, AnimState.DEAD]) {
            a.animState = state;
            const expected = selectSpriteFrame(a, 2);
            expect(selectSpriteFrame(a, 2, undefined, undefined, out)).toBe(out);
            expect(out).toEqual(expected);
        }
        const f = { ox: -80, oy: -150, w: 160, h: 150 };
        const rect = computeSpriteDrawRect(f);
        expect(computeSpriteDrawRect(f, undefined, undefined, undefined, undefined, rect)).toBe(rect);
        expect(rect).toEqual(computeSpriteDrawRect(f));
    });
});
