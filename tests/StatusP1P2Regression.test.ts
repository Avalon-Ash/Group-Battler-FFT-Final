import { afterEach, describe, expect, it } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { GameEngine } from '../engine/game';
import { Role, Team, type Skill } from '../types';
import { CCManager } from '../engine/systems/combat/CCManager';
import { runHitActions } from '../engine/systems/combat/SkillActions';
import { EFFECT_KINDS } from '../engine/core/Effects';
import { resetAgent, saveAgentState } from '../engine/core/AgentLifecycle';
import { StatusPresentationSystem } from '../engine/presentation/StatusPresentationSystem';
import { VisualSystem } from '../engine/presentation/VisualSystem';
import { HUDSystem } from '../engine/presentation/hud';
import { VFXSystem } from '../engine/presentation/vfx';
import { CameraSystem } from '../engine/presentation/CameraSystem';
import { SequenceSystem } from '../engine/presentation/visuals/SequenceSystem';
import { GridSystem } from '../engine/systems/grid';
import { EventPool } from '../engine/events/GameEventPool';
import { selectUnitStatusView } from '../engine/systems/ui/views/status';
import { isStatusActive, isStatusVisible } from '../engine/renderers/status/StatusActivity';

const MAP = { w: 30, h: 30, offsetX: 400, offsetY: 300, layout: 'POINTY' as const };
const engines: GameEngine[] = [];
afterEach(() => { for (const engine of engines) { engine.stop(); engine.clear(); } engines.length = 0; });
function skill(id: string, element: Skill['element'] = 'POISON'): Skill {
    return { id, name: id, element, tag: 'ACTIVE', role: Role.MAGE, range: 8, cast: 0, cd: 0, cost: 0, gain: 0, type: 'SINGLE', power: 0, color: '#ffffff' };
}
function fixture() {
    const engine = new GameEngine(); engines.push(engine);
    const a = new Agent('a', Team.RED, -1, 0, MAP);
    const b = new Agent('b', Team.RED, -2, 0, MAP);
    const target = new Agent('target', Team.BLUE, 0, 0, MAP);
    engine.agents.push(a, b, target);
    const flush = () => {
        for (const event of engine.events) { StatusPresentationSystem.process(event, engine.agents); EventPool.release(event); }
        engine.events.length = 0;
    };
    return { engine, a, b, target, flush };
}

describe('P1/P2 continuation regressions', () => {
    it('keeps complete data while preserving the established field visibility conditions', () => {
        const { engine, target } = fixture();
        target.effects.POLYMORPH.remaining = 3;
        target.effects.INVINCIBLE.remaining = 3;
        target.effects.STUN.remaining = 3;
        target.ccVisual = 'FROZEN';
        target.view.visualStatus = 'INVINCIBLE';
        expect(isStatusActive('POLYMORPH', target)).toBe(true);
        expect(isStatusVisible('POLYMORPH', target)).toBe(false);
        expect(isStatusVisible('INVINCIBLE', target)).toBe(true);
        expect(isStatusVisible('STUN', target)).toBe(true);
        expect(isStatusVisible('FROZEN', target)).toBe(false);
        expect(selectUnitStatusView(engine, target.id, null).effects.map(row => row.displayKey)).toEqual(['FROZEN', 'POLYMORPH', 'INVINCIBLE']);
        target.effects.BANISH.remaining = 2;
        expect(isStatusVisible('BANISH', target)).toBe(false);
        target.banished = true;
        expect(isStatusVisible('BANISH', target)).toBe(true);
        target.effects.STASIS.remaining = 1;
        expect(isStatusVisible('BANISH', target)).toBe(false);
        expect(isStatusVisible('STASIS', target)).toBe(true);
        target.effects.STUN.remaining = 0;
        target.view.visualStatus = 'FROZEN';
        expect(isStatusVisible('FROZEN', target)).toBe(true);
        expect(isStatusVisible('STUN', target)).toBe(false);
    });

    it('classifies a shorter STASIS overwrite using its own slot and emits only one legacy CC event', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, { ...skill('old'), specialVisualStatus: 'STASIS' }, 'BANISH', 6, 0, undefined, engine);
        expect(engine.events.map(event => event.type)).toEqual(['CC_APPLIED', 'STATUS_OBSERVATION']); flush();
        CCManager.applyCC(b, target, { ...skill('new'), specialVisualStatus: 'STASIS' }, 'BANISH', 2, 0, undefined, engine);
        expect(engine.events.map(event => event.type)).toEqual(['CC_APPLIED', 'STATUS_OBSERVATION']);
        expect(engine.events[1]).toMatchObject({ effectKind: 'STASIS', statusResult: 'REFRESHED', statusNew: false });
        flush();
        expect(target.effects.BANISH.remaining).toBe(6);
        expect(target.effects.STASIS.remaining).toBe(1);
        expect(target.view.statusPresentation.effects.BANISH.duration.sourceId).toBe(a.id);
        expect(target.view.statusPresentation.effects.STASIS.duration.sourceId).toBe(b.id);
    });

    it.each(['DOT', 'HOT'] as const)('same-value %s overwrite still replaces every origin', kind => {
        const { engine, a, b, target, flush } = fixture();
        if (kind === 'HOT') { a.side = target.side; b.side = target.side; }
        CCManager.applyCC(a, target, skill('old'), kind, 3, 20, undefined, engine); flush();
        CCManager.applyCC(b, target, skill('new'), kind, 3, 20, undefined, engine);
        expect(engine.events[0].statusResult).toBe('REFRESHED'); flush();
        const receipt = target.view.statusPresentation.effects[kind];
        for (const origin of [receipt.duration, receipt.value, receipt.variant]) {
            expect(origin.recorded).toBe(true);
            expect(origin.sourceId).toBe(b.id);
            expect(origin.skillId).toBe('new');
        }
    });

    it('shorter ice stun updates only its visual origin, preserving duration and combat source fields', () => {
        const { engine, a, b, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('long', 'PHYSICAL'), 'STUN', 6, 0, undefined, engine); flush();
        CCManager.applyCC(b, target, skill('ice', 'ICE'), 'STUN', 2, 0, undefined, engine); flush();
        expect(target.effects.STUN.remaining).toBe(6);
        expect(target.effects.STUN.sourceId).toBeNull();
        expect(target.view.statusPresentation.effects.STUN.duration.skillId).toBe('long');
        expect(target.view.statusPresentation.effects.STUN.variant.skillId).toBe('ice');
    });

    it('source death updates immutable snapshots; actual lifecycle reset clears every origin with the same ID', () => {
        const { engine, a, target, flush } = fixture();
        saveAgentState(target);
        CCManager.applyCC(a, target, skill('old'), 'ROOT', 3, 0, undefined, engine); flush();
        const before = selectUnitStatusView(engine, target.id, null);
        expect(before.effects[0].sourceAvailability).toBe('ACTIVE');
        a.hp = 0;
        const after = selectUnitStatusView(engine, target.id, null);
        expect(after).not.toBe(before);
        expect(after.effects[0].sourceAvailability).toBe('DEAD');
        expect(before.effects[0].sourceAvailability).toBe('ACTIVE');
        resetAgent(target, MAP);
        expect(target.id).toBe('target');
        expect(selectUnitStatusView(engine, target.id, null).effects).toHaveLength(0);
        for (const kind of EFFECT_KINDS) {
            for (const origin of Object.values(target.view.statusPresentation.effects[kind])) {
                expect(origin).toEqual({ recorded: false, sourceId: null, sourceSide: null, skillId: null, skillName: null, element: null });
            }
        }
        CCManager.applyCC(a, target, skill('next'), 'ROOT', 2, 0, undefined, engine); flush();
        expect(target.view.statusPresentation.effects.ROOT.duration.skillId).toBe('next');
    });

    it('routes a real cleanse through VisualSystem without creating HUD/VFX feedback', () => {
        const { engine, a, target, flush } = fixture();
        CCManager.applyCC(a, target, skill('root'), 'ROOT', 3, 0, undefined, engine); flush();
        runHitActions(a, target, { ...skill('cleanse'), onHit: [{ action: 'DISPEL', polarity: 'DEBUFF' }] }, undefined, engine, {}, engine.combat.skillExecutor);
        expect(engine.events).toHaveLength(1);
        expect(engine.events[0].type).toBe('STATUS_OBSERVATION');
        const hud = new HUDSystem(), vfx = new VFXSystem();
        const beforeVfx = JSON.stringify(vfx.state);
        const beforeAgent = JSON.stringify({ effects: target.effects, hp: target.hp, shield: target.shield, drStacks: target.drStacks });
        new VisualSystem().flush(engine.events, engine, vfx, hud, new GridSystem(), new CameraSystem(), new SequenceSystem());
        expect(target.view.statusPresentation.feedback.kind).toBe('CLEANSED');
        expect(target.view.statusPresentation.effects.ROOT.duration.recorded).toBe(false);
        expect(hud.damageNumbers).toHaveLength(0);
        expect(JSON.stringify(vfx.state)).toBe(beforeVfx);
        expect(JSON.stringify({ effects: target.effects, hp: target.hp, shield: target.shield, drStacks: target.drStacks })).toBe(beforeAgent);
        flush();
    });
});
