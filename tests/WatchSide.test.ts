import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import type { Agent } from '../engine/core/Agent';
import { isWatchedSide } from '../engine/core/Allegiance';

describe('DirectorSystem watch side (kill announcer filter)', () => {
    let engine: GameEngine;
    let blue: Agent;
    let red: Agent;

    beforeEach(() => {
        engine = new GameEngine();
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        blue = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 200, Role.WARRIOR)!;
        red = engine.agentManager.addAgent(engine, Team.RED, 1, 0, 200, Role.WARRIOR)!;
        expect(blue).toBeTruthy();
        expect(red).toBeTruthy();
    });

    it('director on: the side of the director target; no target means no watch side', () => {
        expect(engine.director.getWatchSide(engine)).toBeNull();
        engine.state.director.targetId = red.id;
        expect(engine.director.getWatchSide(engine)).toBe(red.side);
    });

    it('a kill does not move the director target', () => {
        engine.state.director.targetId = blue.id;
        engine.bus.emit('KILL', { killerId: red.id, victimId: blue.id });
        engine.bus.emit('CAST_START', { sourceId: red.id, skill: { ...red.skills[0], tag: 'ULT' } });
        expect(engine.state.director.targetId).toBe(blue.id);
        expect(engine.director.getWatchSide(engine)).toBe(blue.side);
    });

    it('director off: the side of the clicked unit; nothing clicked means no watch side', () => {
        engine.state.director.targetId = blue.id;
        engine.director.enabled = false;
        expect(engine.director.getWatchSide(engine)).toBeNull();
        engine.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: red.id });
        expect(engine.director.getWatchSide(engine)).toBe(red.side);
        engine.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: null });
        expect(engine.director.getWatchSide(engine)).toBeNull();
    });

    it('update publishes WATCH_SIDE only when it changes', () => {
        const published: (number | null)[] = [];
        engine.bus.on('WATCH_SIDE', d => published.push(d.side));
        engine.director.enabled = false;
        engine.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: red.id });
        engine.director.update(engine, 0.016);
        engine.director.update(engine, 0.016);
        engine.bus.emit('UI_COMMAND', { type: 'SET_WATCH_AGENT', agentId: blue.id });
        engine.director.update(engine, 0.016);
        expect(published).toEqual([red.side, blue.side]);
    });

    it('isWatchedSide needs both sides present and equal', () => {
        expect(isWatchedSide(0, 0)).toBe(true);
        expect(isWatchedSide(0, 1)).toBe(false);
        expect(isWatchedSide(undefined, 0)).toBe(false);
        expect(isWatchedSide(0, null)).toBe(false);
    });
});
