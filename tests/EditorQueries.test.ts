import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team, Role } from '../types';
import {
    queryAgentAt,
    queryIsValidHex,
    queryHasObstacle,
    queryObstacleTypeAt,
    queryIsBlocked,
    queryTerrainHeight,
    queryMapKeys,
    queryHexAtScreenPoint,
    queryHexToWorldSnap,
} from '../engine/systems/ui/editorQueries';

describe('EditorQueries', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });

    describe('queryAgentAt', () => {
        it('returns agent when present and active', () => {
            const agent = engine.addAgent(Team.BLUE, 0, 0, 500, Role.WARRIOR);
            expect(agent).toBeDefined();

            const found = queryAgentAt(engine, 0, 0);
            expect(found).toBe(agent);
        });

        it('returns undefined if hex has no agent or engine is null', () => {
            expect(queryAgentAt(engine, 1, 0)).toBeUndefined();
            expect(queryAgentAt(null, 0, 0)).toBeUndefined();
            expect(queryAgentAt(undefined, 0, 0)).toBeUndefined();
        });

        it('returns undefined if agent is dead (hp <= 0)', () => {
            const agent = engine.addAgent(Team.BLUE, 0, 0, 500, Role.WARRIOR);
            if (agent) agent.hp = 0;
            expect(queryAgentAt(engine, 0, 0)).toBeUndefined();
        });
    });

    describe('queryIsValidHex', () => {
        it('identifies valid board hexes vs out-of-bounds', () => {
            expect(queryIsValidHex(engine, 0, 0)).toBe(true);
            expect(queryIsValidHex(engine, 999, 999)).toBe(false);
            expect(queryIsValidHex(null, 0, 0)).toBe(false);
            expect(queryIsValidHex(undefined, 0, 0)).toBe(false);
        });
    });

    describe('queryHasObstacle & queryObstacleTypeAt', () => {
        it('queries obstacles and obstacle types', () => {
            engine.map.setObstacle(1, 0, 'CRYSTAL');

            expect(queryHasObstacle(engine, 1, 0)).toBe(true);
            expect(queryObstacleTypeAt(engine, 1, 0)).toBe('CRYSTAL');

            expect(queryHasObstacle(engine, 0, 0)).toBe(false);
            expect(queryObstacleTypeAt(engine, 0, 0)).toBeUndefined();

            expect(queryHasObstacle(null, 1, 0)).toBe(false);
            expect(queryObstacleTypeAt(null, 1, 0)).toBeUndefined();
        });
    });

    describe('queryIsBlocked', () => {
        it('detects blocked hexes via obstacles and agents', () => {
            expect(queryIsBlocked(engine, 0, 0)).toBe(false);

            const agent = engine.addAgent(Team.BLUE, 0, 0, 500, Role.WARRIOR);
            expect(queryIsBlocked(engine, 0, 0)).toBe(true);
            // With ignoreAgentId
            expect(queryIsBlocked(engine, 0, 0, agent?.id)).toBe(false);

            engine.map.setObstacle(1, 0, 'WALL');
            expect(queryIsBlocked(engine, 1, 0)).toBe(true);

            // Null engine is always treated as blocked
            expect(queryIsBlocked(null, 0, 0)).toBe(true);
        });
    });

    describe('queryTerrainHeight', () => {
        it('reads terrain height from map', () => {
            engine.map.setHeight('0,0', 3);
            expect(queryTerrainHeight(engine, 0, 0)).toBe(3);
            expect(queryTerrainHeight(engine, 1, 0)).toBe(0);
            expect(queryTerrainHeight(null, 0, 0)).toBe(0);
        });
    });

    describe('queryMapKeys', () => {
        it('returns all active map coordinate keys', () => {
            const keys = queryMapKeys(engine);
            expect(keys.length).toBeGreaterThan(0);
            expect(keys).toContain('0,0');
            expect(queryMapKeys(null)).toEqual([]);
        });
    });

    describe('queryHexAtScreenPoint', () => {
        it('returns null when any required projection dependency is missing', () => {
            expect(queryHexAtScreenPoint(100, 100, null, null, null, null)).toBeNull();
            expect(queryHexAtScreenPoint(100, 100, undefined, undefined, undefined, undefined)).toBeNull();
        });
    });

    describe('queryHexToWorldSnap', () => {
        it('calculates world pixel snap coordinates and reads height', () => {
            engine.map.setHeight('0,0', 2);
            const snap = queryHexToWorldSnap(engine, 0, 0);

            expect(snap.worldX).toBeDefined();
            expect(snap.worldY).toBeDefined();
            expect(snap.terrainHeight).toBe(2);

            const fallback = queryHexToWorldSnap(null, 0, 0);
            expect(fallback).toEqual({ worldX: 0, worldY: 0, terrainHeight: 0 });
        });
    });

    describe('Side-effect freedom', () => {
        it('does not mutate engine state during repeated queries', () => {
            const agentCountBefore = engine.agents.length;
            const obstacleCountBefore = engine.map.obstacles.size;
            const keysBefore = engine.mapKeys.size;

            for (let i = 0; i < 50; i++) {
                queryAgentAt(engine, 0, 0);
                queryIsValidHex(engine, 0, 0);
                queryHasObstacle(engine, 0, 0);
                queryObstacleTypeAt(engine, 0, 0);
                queryIsBlocked(engine, 0, 0);
                queryTerrainHeight(engine, 0, 0);
                queryMapKeys(engine);
                queryHexToWorldSnap(engine, 0, 0);
            }

            expect(engine.agents.length).toBe(agentCountBefore);
            expect(engine.map.obstacles.size).toBe(obstacleCountBefore);
            expect(engine.mapKeys.size).toBe(keysBefore);
        });
    });
});
