import { afterEach, describe, expect, it } from 'vitest';
import { GameEngine } from '../engine/game';
import { Agent } from '../engine/core/Agent';
import { Team } from '../types';
import { EFFECT_KINDS } from '../engine/core/Effects';
import { selectUnitStatusView } from '../engine/systems/ui/views/status';
const engines: GameEngine[] = [];
function fixture() {
    const engine = new GameEngine(); engines.push(engine);
    const config = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' as const };
    const target = new Agent('target', Team.BLUE, 0, 0, config);
    const source = new Agent('source', Team.RED, 1, 0, config);
    source.side = target.side;
    engine.agents.push(target, source);
    return { engine, target, source };
}
afterEach(() => { for (const engine of engines) { engine.stop(); engine.clear(); } engines.length = 0; });

describe('Inspector status presentation', () => {
    it('formats sub-tenth duration, shields, all groups and source selection without inferring team relations', () => {
        const {engine, target, source} = fixture();
        expect(selectUnitStatusView(engine, target.id, target.side).effects).toEqual([]);
        target.effects.ROOT.remaining = .01; target.effects.ROOT.max = 5;
        target.effects.DOT.remaining = 10.01; target.effects.DOT.value = 12;
        target.shield = 260;
        Object.assign(target.view.statusPresentation.effects.ROOT.duration, { recorded: true, sourceId: source.id, sourceSide: source.side, skillId: 'root', skillName: '定身技能' });
        const view = selectUnitStatusView(engine, target.id, target.side);
        expect(view.relation).toBe('ALLY');
        expect(view.effects.map(row => [row.group, row.timeText])).toEqual([
            ['CONTROL', '0.1s'], ['DAMAGE & WEAKEN', '11s'], ['RECOVERY & PROTECT', '260'],
        ]);
        expect(view.effects[0].primarySource.canSelect).toBe(true);
        expect(view.effects[0].primarySource.detail).toBe('source / SIDE ' + source.side + ' / 定身技能');
        expect(view.effects[1].sourceSummary).toBe('來源未記錄');
        expect(view.effects[2].timeDetail).toBe('消耗型；無固定期限');
    });
    it('disables jumping to dead, banished or missing sources and preserves their identities', () => {
        const {engine, target, source} = fixture(); target.effects.ROOT.remaining = 2;
        Object.assign(target.view.statusPresentation.effects.ROOT.duration, { recorded: true, sourceId: source.id });
        source.hp = 0;
        const dead = selectUnitStatusView(engine, target.id, null).effects[0];
        expect(dead.primarySource.canSelect).toBe(false); expect(dead.sourceSummary).toBe('source（已離場）');
        source.hp = 10; source.banished = true;
        expect(selectUnitStatusView(engine, target.id, null).effects[0].primarySource.canSelect).toBe(false);
        engine.agents.pop();
        expect(selectUnitStatusView(engine, target.id, null).effects[0].sourceAvailability).toBe('LEFT');
        target.banished = true;
        expect(selectUnitStatusView(engine, target.id, null).availabilityText).toBe('暫時離場');
        target.hp = 0;
        expect(selectUnitStatusView(engine, target.id, null).availabilityText).toBe('單位已陣亡');
    });
    it('shows every valid slot plus shield and keeps unchanged quantized snapshots stable, including DR', () => {
        const {engine, target} = fixture();
        for (const key of EFFECT_KINDS) Object.assign(target.effects[key], { remaining: 3.09, max: 5 });
        target.shield = 20;
        // STASIS represents BANISH, rather than duplicating its row.
        const first = selectUnitStatusView(engine, target.id, null);
        expect(first.effects.map(row => row.kind)).toEqual(['STUN','STASIS','POLYMORPH','FEAR','TAUNT','SILENCE','ROOT','BLIND','SLOW','VULNERABLE','DOT','HOT','INVINCIBLE','SHIELD','REFLECT','LIFESTEAL','HASTE']);
        for (const key of EFFECT_KINDS) target.effects[key].remaining = 3.01;
        expect(selectUnitStatusView(engine, target.id, null)).toBe(first);
        target.drStacks.stun = 2; target.drTimers.stun = 4.01;
        const dr = selectUnitStatusView(engine, target.id, null);
        expect(dr.resistance).toEqual(['STUN / DR 2 / 4.1s']);
        expect(dr.effects.every(row => row.stacks === null)).toBe(true);
        expect(first.resistance).toEqual([]);
    });
});
