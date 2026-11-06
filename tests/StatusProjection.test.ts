import { describe, it, expect, afterEach } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { GameEngine } from '../engine/game';
import { Team } from '../types';
import { EFFECT_KINDS } from '../engine/core/Effects';
import { STATUS_DISPLAY, type StatusDisplayKey } from '../data/status/status_display';
import { statusDisplayKey, statusProgress } from '../engine/core/StatusQueries';
import { isStatusActive } from '../engine/renderers/status/StatusActivity';
import { selectUnitStatusView } from '../engine/systems/ui/views/status';
import { selectInspectorView } from '../engine/systems/ui/views/l3';

const MAP = { w: 30, h: 30, offsetX: 400, offsetY: 300, layout: 'POINTY' as const };
const engines: GameEngine[] = [];
afterEach(() => { for (const e of engines) { e.stop(); e.clear(); } engines.length = 0; });
function fixture() {
    const engine = new GameEngine();
    engines.push(engine);
    const agent = new Agent('projection', Team.BLUE, 0, 0, MAP);
    engine.agents.push(agent);
    return { engine, agent };
}

describe('status projection', () => {
    const singleKeys: StatusDisplayKey[] = ['STUN', 'FROZEN', 'POLYMORPH', 'BANISH', 'STASIS', 'SILENCE', 'ROOT', 'FEAR', 'TAUNT', 'BLIND', 'SLOW', 'VULNERABLE', 'BURN', 'DOT', 'REGEN', 'HASTE', 'REFLECT', 'LIFESTEAL', 'INVINCIBLE', 'SHIELD'];
    it.each(singleKeys)('normalizes the single %s fixture', key => {
        const { engine, agent } = fixture();
        const kind = STATUS_DISPLAY[key].kind;
        if (kind === 'SHIELD') { agent.shield = 260; agent.maxShield = 400; }
        else Object.assign(agent.effects[kind], { remaining: 3.01, max: 5, value: 30 });
        if (key === 'FROZEN') agent.ccVisual = 'FROZEN';
        if (key === 'BURN') agent.effects.DOT.tag = 'BURN';
        if (key === 'BANISH' || key === 'STASIS') agent.banished = true;
        if (key === 'STASIS') agent.effects.BANISH.remaining = 5;
        const view = selectUnitStatusView(engine, agent.id, agent.side);
        expect(view.effects).toHaveLength(1);
        expect(view.effects[0].displayKey).toBe(key);
        expect(view.effects[0].kind).toBe(kind);
        expect(view.effects[0].id).toBe(`projection:${kind}`);
        expect(view.effects[0].stacks).toBeNull();
        if (kind === 'SHIELD') {
            expect(view.effects[0].remainingSeconds).toBeNull();
            expect(view.effects[0].valueText).toBe('260');
        } else {
            expect(view.effects[0].remainingSeconds).toBeCloseTo(3.1);
            expect(Math.abs(view.effects[0].remainingSeconds - 3.01)).toBeLessThanOrEqual(0.1);
        }
    });
    it('keeps simultaneous polymorph, invincibility, DOT, HOT and shield regardless of single body visual', () => {
        const { engine, agent } = fixture();
        for (const k of ['POLYMORPH', 'INVINCIBLE', 'DOT', 'HOT'] as const) Object.assign(agent.effects[k], { remaining: 3, max: 5, value: 30 });
        agent.shield = 20;
        agent.view.visualStatus = 'FROZEN';
        const view = selectUnitStatusView(engine, agent.id, null);
        expect(view.effects.map(r => r.kind).sort()).toEqual(['DOT', 'HOT', 'INVINCIBLE', 'POLYMORPH', 'SHIELD']);
        expect(isStatusActive('POLYMORPH', agent)).toBe(true);
        expect(isStatusActive('INVINCIBLE', agent)).toBe(true);
        expect(isStatusActive('FROZEN', agent)).toBe(false);
        expect(view.effects.find(r => r.kind === 'DOT').valueText).toBe('30/s');
        expect(view.effects.find(r => r.kind === 'HOT').valueText).toBe('30/s');
    });
    it('expires without a flush, handles max=0 and rounds 0.01 upwards', () => {
        const { engine, agent } = fixture();
        agent.effects.ROOT.remaining = 0.01;
        const first = selectUnitStatusView(engine, agent.id, null);
        expect(first.effects[0].remainingSeconds).toBe(0.1);
        expect(first.effects[0].maxSeconds).toBe(0);
        expect(first.effects[0].progress).toBe(1);
        agent.effects.ROOT.remaining = 0;
        expect(selectUnitStatusView(engine, agent.id, null).effects).toHaveLength(0);
        expect(statusProgress('ROOT', agent)).toBe(1);
        for (const kind of EFFECT_KINDS) expect(statusDisplayKey(kind, agent)).toBeNull();
    });
    it('retains keys, immutable snapshots and references within each 0.1s bucket', () => {
        const { engine, agent } = fixture();
        Object.assign(agent.effects.ROOT, { remaining: 3.09, max: 5 });
        const a = selectUnitStatusView(engine, agent.id, null);
        agent.effects.ROOT.remaining = 3.01;
        expect(selectUnitStatusView(engine, agent.id, null)).toBe(a);
        agent.effects.ROOT.remaining = 4;
        const b = selectUnitStatusView(engine, agent.id, null);
        expect(b).not.toBe(a);
        expect(b.effects[0].id).toBe(a.effects[0].id);
        expect(a.effects[0].remainingSeconds).toBe(3.1);
        expect(b.effects[0].remainingSeconds).toBe(4);
    });
    it('does not guess unrecorded poison or sources; recognizes only reliable sourceId', () => {
        const { engine, agent } = fixture();
        Object.assign(agent.effects.DOT, { remaining: 5, value: 10, tag: 'POISON' });
        Object.assign(agent.effects.HOT, { remaining: 5, value: 20 });
        Object.assign(agent.effects.SLOW, { remaining: 5, sourceId: 'last-attempt' });
        const a = selectUnitStatusView(engine, agent.id, null);
        expect(a.effects.find(r => r.kind === 'DOT').displayKey).toBe('DOT');
        for (const row of a.effects) expect(row.sourceAvailability).toBe('UNKNOWN');
        agent.effects.DOT.sourceId = 'departed';
        const row = selectUnitStatusView(engine, agent.id, null).effects.find(r => r.kind === 'DOT');
        expect(row.sourceSummary).toBe('departed（已離場）');
        expect(row.sourceSkill).toBeNull();
    });
    it('distinguishes living banish, out of bounds and death; relations use side', () => {
        const { engine, agent } = fixture();
        agent.banished = true;
        expect(selectInspectorView(engine, agent.id).isDead).toBe(false);
        expect(selectInspectorView(engine, agent.id).availability).toBe('BANISHED');
        agent.outOfBounds = true;
        expect(selectUnitStatusView(engine, agent.id, agent.side).availability).toBe('OUT_OF_BOUNDS');
        expect(selectUnitStatusView(engine, agent.id, agent.side).relation).toBe('ALLY');
        expect(selectUnitStatusView(engine, agent.id, agent.side + 1).relation).toBe('ENEMY');
        expect(selectUnitStatusView(engine, agent.id, null).relation).toBe('UNALIGNED');
        agent.hp = 0;
        expect(selectInspectorView(engine, agent.id).isDead).toBe(true);
        expect(selectUnitStatusView(engine, agent.id, null).availability).toBe('DEAD');
    });
});
