import { describe, it, expect, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Agent } from '../engine/core/Agent';
import { Role, Team, STATUS_CHANGE, type GameEvent, type Skill } from '../types';
import { CCManager } from '../engine/systems/combat/CCManager';
import { runHitActions } from '../engine/systems/combat/SkillActions';
import { StatusPresentationSystem } from '../engine/presentation/StatusPresentationSystem';
import { resetAgentView } from '../engine/core/ViewCommands';
import { EventPool } from '../engine/events/GameEventPool';
import { selectUnitStatusView } from '../engine/systems/ui/views/status';
import { statusDisplayKey } from '../engine/core/StatusQueries';

const MAP = { w: 30, h: 30, offsetX: 400, offsetY: 300, layout: 'POINTY' as const };
const engines: GameEngine[] = [];
afterEach(() => { for (const e of engines) { e.stop(); e.clear(); } engines.length = 0; });
const skill = (id: string, element: Skill['element'] = 'POISON'): Skill => ({ id, name: id, element, tag: 'ACTIVE', role: Role.MAGE, range: 8, cast: 0, cd: 0, cost: 0, gain: 0, type: 'SINGLE', power: 0, color: '#ffffff' });
function fixture() {
    const engine = new GameEngine(); engines.push(engine);
    const a = new Agent('source-a', Team.RED, -1, 0, MAP);
    const b = new Agent('source-b', Team.RED, -2, 0, MAP);
    const target = new Agent('target', Team.BLUE, 0, 0, MAP);
    engine.agents.push(a, b, target);
    const flush = () => { for (const e of engine.events) StatusPresentationSystem.process(e, engine.agents); engine.events.length = 0; };
    return { engine, a, b, target, flush };
}

describe('status provenance', () => {
    it('ignored shorter CC retains its actual duration and TAUNT target source', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('long'), 'TAUNT', 5, 0, undefined, engine);
        flush();
        CCManager.applyCC(b, target, skill('short'), 'TAUNT', 1, 0, undefined, engine);
        expect(engine.events[0].statusResult).toBe('UNCHANGED');
        expect(engine.events[0].statusChanges).toBe(0);
        flush();
        expect(target.effects.TAUNT.sourceId).toBe(a.id);
        expect(target.view.statusPresentation.effects.TAUNT.duration.sourceId).toBe(a.id);
        expect(target.effects.TAUNT.remaining).toBe(5);
    });
    it('splits SLOW value and duration without changing the legacy sourceId writer', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('strong'), 'SLOW', 2, 0.8, undefined, engine); flush();
        CCManager.applyCC(b, target, skill('long'), 'SLOW', 6, 0.2, undefined, engine); flush();
        const receipt = target.view.statusPresentation.effects.SLOW;
        expect(receipt.value.sourceId).toBe(a.id);
        expect(receipt.duration.sourceId).toBe(b.id);
        expect(target.effects.SLOW.sourceId).toBe(b.id);
        expect(target.effects.SLOW.value).toBe(0.8);
        const row = selectUnitStatusView(engine, target.id, null).effects[0];
        expect(row.valueSource.skillId).toBe('strong');
        expect(row.durationSource.skillId).toBe('long');
        CCManager.applyCC(b, target, skill('stronger'), 'SLOW', 1, 0.9, undefined, engine); flush();
        expect(receipt.duration.skillId).toBe('long');
        expect(receipt.value.skillId).toBe('stronger');
    });
    it('records poison, blood, physical and fire DOT variants without changing POISON tag; snapshots skills', () => {
        const { engine, a, target, flush } = fixture();
        for (const [element, display] of [['POISON', 'POISON'], ['BLOOD', 'BLEED'], ['PHYSICAL', 'BLEED'], ['FIRE', 'BURN']] as const) {
            const s = skill(element, element);
            CCManager.applyCC(a, target, s, 'DOT', 3, 20, undefined, engine); flush();
            s.name = 'edited'; s.element = 'ICE';
            expect(statusDisplayKey('DOT', target)).toBe(display);
            expect(target.effects.DOT.tag).toBe(element === 'FIRE' ? 'BURN' : 'POISON');
            expect(target.view.statusPresentation.effects.DOT.variant.skillName).toBe(element);
        }
    });
    it('records HOT at full health and shield increments without assigning total shield ownership', () => {
        const { engine, a, b, target, flush } = fixture(); a.side = target.side; b.side = target.side;
        CCManager.applyCC(a, target, skill('hot'), 'HOT', 4, 25, undefined, engine); flush();
        expect(target.view.statusPresentation.effects.HOT.value.sourceId).toBe(a.id);
        CCManager.applyCC(a, target, skill('shield-a'), 'SHIELD', 4, 30, undefined, engine); flush();
        CCManager.applyCC(b, target, skill('shield-b'), 'SHIELD', 4, 50, undefined, engine); flush();
        expect(target.shield).toBe(80);
        expect(target.view.statusPresentation.shieldGrant.grantedAmount).toBe(50);
        expect(target.view.statusPresentation.shieldGrant.origin.sourceId).toBe(b.id);
        const row = selectUnitStatusView(engine, target.id, null).effects.find(r => r.kind === 'SHIELD');
        expect(row.remainingSeconds).toBeNull();
        expect(row.detailLines[1]).toContain('最近 +50');
    });
    it('DR rejection leaves receipt intact and carries an explicit reason', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('first'), 'STUN', 8, 0, undefined, engine); flush();
        target.drStacks.stun = 3;
        CCManager.applyCC(b, target, skill('immune'), 'STUN', 8, 0, undefined, engine);
        expect(engine.events[0]).toMatchObject({ statusResult: 'IMMUNE', statusReason: 'DR', feedbackKind: 'IMMUNE', statusChanges: 0 });
        flush();
        expect(target.view.statusPresentation.effects.STUN.duration.skillId).toBe('first');
        expect(target.view.statusPresentation.feedback.kind).toBe('IMMUNE');
    });
    it('same-tick cleanse and reapply preserves event order and removes stale value provenance', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('old'), 'DOT', 3, 20, undefined, engine); flush();
        const cleanse = { ...skill('cleanse'), onHit: [{ action: 'DISPEL', polarity: 'DEBUFF' }] } as const;
        runHitActions(a, target, cleanse, undefined, engine, {}, engine.combat.skillExecutor);
        CCManager.applyCC(b, target, skill('new', 'FIRE'), 'DOT', 3, 20, undefined, engine);
        expect(engine.events[0].removedKindMask).toBeGreaterThan(0);
        expect(engine.events[0].feedbackKind).toBe('CLEANSED');
        expect(engine.events[1].statusNew).toBe(true);
        flush();
        expect(target.view.statusPresentation.effects.DOT.duration.skillId).toBe('new');
        expect(target.view.statusPresentation.effects.DOT.value.sourceId).toBe(b.id);
        expect(statusDisplayKey('DOT', target)).toBe('BURN');
    });
    it('expired then reapplied in one batch uses new origin even if all values match', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('old'), 'SLOW', 3, 0.2, undefined, engine); flush();
        target.effects.SLOW.remaining = 0;
        CCManager.applyCC(b, target, skill('new'), 'SLOW', 3, 0.2, undefined, engine); flush();
        expect(target.view.statusPresentation.effects.SLOW.value.sourceId).toBe(b.id);
        expect(target.view.statusPresentation.effects.SLOW.duration.sourceId).toBe(b.id);
    });
    it('reset with the same ID clears all fixed origins; a departed source stays known', () => {
        const { engine, a, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('old'), 'ROOT', 3, 0, undefined, engine); flush();
        engine.agents.splice(engine.agents.indexOf(a), 1);
        expect(selectUnitStatusView(engine, target.id, null).effects[0].sourceAvailability).toBe('LEFT');
        const old = selectUnitStatusView(engine, target.id, null);
        resetAgentView(target.view);
        const next = selectUnitStatusView(engine, target.id, null);
        expect(next).not.toBe(old);
        expect(next.effects[0].sourceAvailability).toBe('UNKNOWN');
        expect(next.effects[0].sourceSkill).toBeNull();
    });
    it('pool get/release clears every optional status scalar and receipts do not retain events', () => {
        const { engine, target } = fixture();
        const opts: Omit<GameEvent, 'type' | 'pos'> = {
            targetId: target.id, sourceId: 'from', effectKind: 'ROOT', skillId: 'snapshot', skillName: 'name', sourceSide: 7,
            element: 'ICE', statusResult: 'APPLIED', statusChanges: STATUS_CHANGE.DURATION, statusNew: true,
            grantedAmount: 50, removedKindMask: 1, periodicKind: 'DOT', rate: 20, dotVariant: 'BLEED', hazardKind: 'FIRE',
            feedbackKind: 'IMMUNE', statusReason: 'DR',
        };
        const event = EventPool.get('STATUS_OBSERVATION', { x: 0, y: 0 }, opts);
        for (const key of Object.keys(opts)) expect(event[key], key).toEqual(opts[key]);
        StatusPresentationSystem.process(event, engine.agents);
        EventPool.release(event);
        for (const key of Object.keys(opts)) expect(event[key], key).toBeUndefined();
        const reused = EventPool.get('DAMAGE', { x: 1, y: 2 });
        expect(reused).toBe(event);
        for (const key of Object.keys(opts)) expect(reused[key], key).toBeUndefined();
        expect(target.view.statusPresentation.effects.ROOT.duration.skillId).toBe('snapshot');
        EventPool.release(reused);
    });
    it('STASIS receives its own duration receipt', () => {
        const { engine, a, target, flush } = fixture();
        CCManager.applyCC(a, target, { ...skill('stasis'), specialVisualStatus: 'STASIS' }, 'BANISH', 4, 0, undefined, engine);
        flush();
        expect(selectUnitStatusView(engine, target.id, null).effects.map(r => r.displayKey)).toEqual(['STASIS']);
        expect(target.view.statusPresentation.effects.STASIS.duration.skillId).toBe('stasis');
    });
    it('periodic feedback distinguishes DOT, HOT and ground hazards, without changing damage cadence', () => {
        const { engine, a, target, flush } = fixture();
        Object.assign(target.effects.DOT, { remaining: 3, max: 3, value: 20, tag: 'BURN' });
        Object.assign(target.effects.HOT, { remaining: 3, max: 3, value: 10 });
        const hp = target.hp;
        engine.effects.update(target, 0.05, engine);
        expect(target.hp).toBeCloseTo(hp - 1 + 0.5);
        const dot = engine.events.find(e => e.periodicKind === 'DOT');
        const hot = engine.events.find(e => e.periodicKind === 'HOT');
        expect(dot).toMatchObject({ rate: 20, dotVariant: 'BURN', targetId: target.id });
        expect(hot).toMatchObject({ rate: 10, targetId: target.id });
        flush();
        engine.effects.update(target, 0.05, engine);
        expect(engine.events.filter(e => e.periodicKind !== undefined)).toHaveLength(0);
        engine.state.spatialHazards.push({ id: 'ground', type: 'POISON', cells: [{ q: target.q, r: target.r }], duration: 3,
            sourceId: a.id, side: a.side, team: a.team, color: '#ffffff', power: 10, tickInterval: 0.5, lastTickTime: -0.5 });
        engine.hazardSystem.update(0.05, engine);
        const hazard = engine.events.find(e => e.periodicKind === 'HAZARD');
        expect(hazard).toMatchObject({ hazardKind: 'POISON', sourceId: a.id, targetId: target.id });
        expect(hazard.dotVariant).toBeUndefined();
        const receipt = target.view.statusPresentation.effects.DOT;
        flush();
        expect(receipt.variant.recorded).toBe(false);
    });
    it('a structured CAST_BREAK identifies the interrupted caster without reading localized text', () => {
        const { engine, target } = fixture();
        StatusPresentationSystem.process({ type: 'CAST_BREAK', pos: { x: 0, y: 0 }, sourceId: target.id }, engine.agents);
        expect(target.view.statusPresentation.feedback.kind).toBe('INTERRUPTED');
    });
});
