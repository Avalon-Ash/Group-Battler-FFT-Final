import { describe, it, expect } from 'vitest';
import { STATUS_PARTS, STATUS_PART_KEYS, STATUS_PART_ORDER, STATUS_PART_RENDER } from '../data/vfx/status_parts';
import { STATUS_VISUALS } from '../data/vfx/status_visuals';
import { VFX_RAMPS } from '../data/vfx/parts/vfxPalette';
import { createVFXPartStore } from '../engine/renderers/vfxparts/VFXPartStore';
import { isStatusActive } from '../engine/renderers/status/StatusActivity';
import { Agent } from '../engine/core/Agent';
import { Team, AIState } from '../types';
import type { MapConfig } from '../engine/utils';

/** 狀態零件表（data/vfx/status_parts.ts）：每個 STATUS_VISUALS 鍵都有條目、零件可烘焙、強控有各自的剪影。 */
const fakeCtx = () => new Proxy({ globalAlpha: 1, globalCompositeOperation: 'source-over' } as Record<string, unknown>, {
    get(t, prop: string) {
        if (prop in t) return t[prop];
        if (prop.startsWith('create')) return () => ({ addColorStop: () => {} });
        return () => undefined;
    },
    set(t, prop: string, v) { t[prop] = v; return true; },
}) as unknown as CanvasRenderingContext2D;
const store = createVFXPartStore((w, h) => ({ canvas: { width: w, height: h } as HTMLCanvasElement, ctx: fakeCtx() }), () => 0);

const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };

describe('STATUS_PARTS table', () => {
    it('covers every STATUS_VISUALS key (and nothing else)', () => {
        expect(Object.keys(STATUS_PARTS).sort()).toEqual([...STATUS_PART_KEYS].sort());
        expect(Object.keys(STATUS_VISUALS).sort()).toEqual([...STATUS_PART_KEYS].sort());
    });

    it('entries without layers say who handles them', () => {
        for (const key of STATUS_PART_KEYS) {
            const set = STATUS_PARTS[key];
            if (set.layers.length === 0 && !set.alias) expect(set.handledBy, key).toBeTruthy();
        }
    });

    it('every layer part bakes (all ramps exist) and flat layers stay inside the own hex', () => {
        for (const key of STATUS_PART_KEYS) {
            for (const layer of STATUS_PARTS[key].layers) {
                expect(VFX_RAMPS[layer.spec.kind === 'smoke' ? 'LION_PHYSICAL' : (layer.spec as { ramp: keyof typeof VFX_RAMPS }).ramp], key).toBeTruthy();
                expect(() => store.get(layer.spec), key).not.toThrow();
                if (layer.flat) {
                    const r = ('radius' in layer.spec ? layer.spec.radius : 0) * (layer.scale ?? 1) * (1 + (layer.pulse?.amp ?? 0)) + (layer.orbitRadius ?? 0);
                    expect(r, `${key} flat layer radius`).toBeLessThanOrEqual(STATUS_PART_RENDER.GROUND_MAX_RADIUS);
                }
            }
        }
    });

    it('strong CCs have layers and pairwise-distinct silhouettes', () => {
        const sig = (key: (typeof STATUS_PART_KEYS)[number]) => JSON.stringify(STATUS_PARTS[key].layers.map((l) => {
            const s = l.spec as { kind: string; ramp?: string; emblem?: string; shape?: string };
            return [l.anchor, l.flat ?? false, s.kind, s.emblem ?? s.shape ?? '', s.ramp ?? ''];
        }));
        const strong = STATUS_PART_KEYS.filter((k) => STATUS_PARTS[k].strong);
        expect(strong.length).toBeGreaterThanOrEqual(10);
        const seen = new Map<string, string>();
        for (const key of strong) {
            expect(STATUS_PARTS[key].layers.length, key).toBeGreaterThan(0);
            const s = sig(key);
            expect(seen.get(s), `${key} duplicates ${seen.get(s)}`).toBeUndefined();
            seen.set(s, key);
        }
    });

    it('strong CCs outrank weak effects so truncation drops weak ones first', () => {
        const strongMin = Math.min(...STATUS_PART_KEYS.filter((k) => STATUS_PARTS[k].strong).map((k) => STATUS_PARTS[k].priority));
        const weakMax = Math.max(...STATUS_PART_KEYS.filter((k) => !STATUS_PARTS[k].strong && STATUS_PARTS[k].layers.length > 0).map((k) => STATUS_PARTS[k].priority));
        expect(strongMin).toBeGreaterThan(weakMax - 1);
        // 優先序由高到低排序
        for (let i = 1; i < STATUS_PART_ORDER.length; i++) {
            expect(STATUS_PARTS[STATUS_PART_ORDER[i - 1]].priority).toBeGreaterThanOrEqual(STATUS_PARTS[STATUS_PART_ORDER[i]].priority);
        }
    });
});

describe('isStatusActive', () => {
    const fresh = () => new Agent('S', Team.BLUE, 0, 0, MAP);

    it('timer-driven CCs follow their timers', () => {
        const a = fresh();
        for (const k of ['STUN', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND'] as const) expect(isStatusActive(k, a), k).toBe(false);
        a.effects.STUN.remaining = 1; a.effects.SILENCE.remaining = 1; a.effects.ROOT.remaining = 1; a.effects.FEAR.remaining = 1; a.effects.TAUNT.remaining = 1; a.effects.BLIND.remaining = 1;
        for (const k of ['STUN', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND'] as const) expect(isStatusActive(k, a), k).toBe(true);
    });

    it('frozen stun shows ice, not stun stars; interrupt alias only without stun', () => {
        const a = fresh();
        a.effects.STUN.remaining = 1;
        a.view.visualStatus = 'FROZEN';
        expect(isStatusActive('STUN', a)).toBe(false);
        expect(isStatusActive('FROZEN', a)).toBe(true);
        const b = fresh();
        b.aiState = AIState.CC_INTERRUPTED;
        expect(isStatusActive('CC_INTERRUPT', b)).toBe(true);
        b.effects.STUN.remaining = 1;
        expect(isStatusActive('CC_INTERRUPT', b)).toBe(false);
    });

    it('DoT type, regen, vulnerable and casting states', () => {
        const a = fresh();
        a.effects.DOT.remaining = 2; a.effects.DOT.value = 3; a.effects.DOT.tag = 'BURN';
        expect(isStatusActive('BURN', a)).toBe(true);
        expect(isStatusActive('POISON', a)).toBe(false);
        a.effects.HOT.remaining = 1;
        expect(isStatusActive('REGEN', a)).toBe(true);
        a.hp = a.maxHp * 0.1;
        expect(isStatusActive('VULNERABLE', a)).toBe(true);
        // 施法狀態由 castingSkillIdx＋技能 tag 推導（P7b）；aiState 寫什麼都不影響
        a.skills = [{ ...a.skills[0], tag: 'ULT' }];
        a.castingSkillIdx = 0;
        a.aiState = AIState.TRACKING;
        expect(isStatusActive('CAST_ULT', a)).toBe(true);
        expect(isStatusActive('CAST_ACTIVE', a)).toBe(false);
        a.castingSkillIdx = -1;
        expect(isStatusActive('CAST_ULT', a)).toBe(false);
    });
});
