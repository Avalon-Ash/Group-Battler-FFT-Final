import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { querySpawnableHexes } from '../engine/systems/ui/editorQueries';
import { HexUtils } from '../engine/utils';


describe('querySpawnableHexes 不含被障礙物圍死的小區塊', () => {
    let engine: GameEngine;
    beforeEach(() => {
        engine = new GameEngine();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
        }
    });
    afterEach(() => engine.clear());

    it('沒有障礙物時每一格都能出生', () => {
        expect(querySpawnableHexes(engine).some(h => h.q === 2 && h.r === 0)).toBe(true);
    });

    it('六個鄰格都是障礙物的格子不能出生', () => {
        for (const n of HexUtils.neighbors({ q: 2, r: 0 })) engine.map.setObstacle(n.q, n.r, 'WALL');
        const cells = querySpawnableHexes(engine);
        expect(cells.some(h => h.q === 2 && h.r === 0)).toBe(false);
        expect(cells.length).toBeGreaterThan(0);
    });
});
