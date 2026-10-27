import { describe, expect, it } from 'vitest';
import { GroundFlag as F, groundPriority, isCasterCenteredTelegraph, resolveGroundLayers } from '../engine/renderers/grid/GroundPriority';
import { Agent } from '../engine/core/Agent';
import { Team, type Skill } from '../types';
import { getFactionSkin } from '../data/units/factionSkin';
import { GameEngine } from '../engine/game';
import { GridRenderStrategy } from '../engine/renderers/grid/GridRenderStrategy';
import { GridCache } from '../engine/renderers/grid/GridCache';
import { RenderList } from '../engine/renderers/RenderList';

const config = { w: 12, h: 8, offsetX: 0, offsetY: 0, layout: 'FLAT' as const };
const skill: Skill = { id: 'test', name: 'test', role: 'MAGE' as Skill['role'], tag: 'ACTIVE', range: 5, cast: 2, cd: 1, cost: 0, gain: 0, type: 'AOE', aoeRadius: 1, power: 1, color: '#ffffff' };

describe('ground fill priority', () => {
    it('dims each lower layer by the approved multiplier', () => {
        expect(resolveGroundLayers(F.Warning | F.Cast | F.Hazard | F.Status | F.Zone | F.Light)).toMatchObject({ warning: 1, cast: 0.35, hazard: 0.5, status: 0.25, zone: 0, light: 0 });
        expect(resolveGroundLayers(F.Cast | F.Hazard | F.Status)).toMatchObject({ cast: 1, hazard: 0.5, status: 0.25 });
        expect(resolveGroundLayers(F.Hazard | F.Status)).toMatchObject({ hazard: 1, status: 0.25 });
        expect(resolveGroundLayers(F.Status | F.Zone | F.Light)).toMatchObject({ status: 1, zone: 0, light: 0 });
    });
    it('allows at most one full fill for all 256 combinations, including ties', () => {
        for (let flags = 0; flags < F.Range * 2; flags++) {
            const m = resolveGroundLayers(flags);
            expect([m.warning, m.lastStand, m.cast, m.hazard, m.status, m.zone, m.light].filter(v => v === 1).length, `flags=${flags}`).toBeLessThanOrEqual(1);
        }
        expect(resolveGroundLayers(F.Zone | F.Light)).toMatchObject({ zone: 1, light: 0 });
        expect(resolveGroundLayers(F.Warning | F.LastStand)).toMatchObject({ warning: 0, lastStand: 1 });
    });
    it('deduplicates caster centered positive-radius AOE, retaining targeted AOE', () => {
        const a = new Agent('a', Team.BLUE, 0, 0, config);
        expect(isCasterCenteredTelegraph(a, skill)).toBe(true);
        a.targetHex = { q: 1, r: 0 };
        expect(isCasterCenteredTelegraph(a, skill)).toBe(false);
        a.targetHex = { q: 0, r: 0 };
        expect(isCasterCenteredTelegraph(a, { ...skill, aoeRadius: 0 })).toBe(false);
    });
    it('keeps faction colors per cell, first caster wins, and clears stale cells', () => {
        const blue = new Agent('b', Team.BLUE, 0, 0, config);
        const red = new Agent('r', Team.RED, 1, 0, config);
        const tiles = [blue, red];
        groundPriority.begin(tiles);
        groundPriority.addCast(0, 0, blue);
        groundPriority.addCast(0, 0, red);
        groundPriority.addCast(1, 0, red);
        expect(groundPriority.castColorAt(0, 0)).toBe(getFactionSkin(Team.BLUE).fallbackBodyColor);
        expect(groundPriority.castColorAt(1, 0)).toBe(getFactionSkin(Team.RED).fallbackBodyColor);
        groundPriority.set(0, 0, F.Warning | F.Hazard);
        expect(groundPriority.at(0, 0).hazard).toBe(0.5);
        groundPriority.begin([red]);
        expect(groundPriority.flagsAt(0, 0)).toBe(0);
        expect(groundPriority.castColorAt(1, 0)).toBeUndefined();
    });
    it('submits real per-cell budgets and omits only caster-centered telegraphs', () => {
        const engine = new GameEngine();
        const cache = new GridCache();
        cache.ensure(engine);
        const tile = cache.tileList[0];
        const a = new Agent('caster', Team.RED, tile.q, tile.r, engine.mapConfig);
        a.skills = [skill]; a.castingSkillIdx = 0;
        a.currentTelegraph = [{ q: tile.q, r: tile.r }];
        a.targetHex = { q: tile.q + 1, r: tile.r };
        a.view.visualStatus = 'FROZEN';
        engine.agents = [a];
        engine.map.warningTiles.add(tile.key);
        engine.state.spatialHazards = [{ id: 'fire', type: 'FIRE', cells: [tile], duration: 10, sourceId: a.id, team: a.team, color: skill.color, power: 0, tickInterval: 1, lastTickTime: 0 }];
        const strategy = new GridRenderStrategy();
        const list = new RenderList();
        strategy.submit(cache, list, engine, null, null, null, [], 0, 'IDLE', 0);
        expect(groundPriority.flagsAt(tile.q, tile.r)).toBe(F.Warning | F.Cast | F.Hazard | F.Status);
        expect(groundPriority.castColorAt(tile.q, tile.r)).toBe(getFactionSkin(Team.RED).fallbackBodyColor);
        a.targetHex = { q: a.q, r: a.r };
        list.reset();
        strategy.submit(cache, list, engine, null, null, null, [], 0, 'IDLE', 0);
        expect(groundPriority.flagsAt(tile.q, tile.r)).toBe(F.Warning | F.Hazard | F.Status);
        expect(groundPriority.castColorAt(tile.q, tile.r)).toBeUndefined();
    });
});
