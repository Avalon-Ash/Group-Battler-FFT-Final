import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';

describe('GameEngine tick and battleTime encapsulation (E8-f / D13)', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    it('does not increment battleTime when engine is not running', () => {
        expect(engine.isRunning).toBe(false);
        expect(engine.battleTime).toBe(0);

        engine.tick(0.016);
        expect(engine.battleTime).toBe(0);
    });

    it('increments battleTime exactly once per tick when running', () => {
        engine.play();
        expect(engine.isRunning).toBe(true);
        expect(engine.battleTime).toBe(0);

        engine.tick(0.05);
        expect(engine.battleTime).toBeCloseTo(0.05);

        engine.tick(0.05);
        expect(engine.battleTime).toBeCloseTo(0.1);
    });

    it('resets battleTime to 0 on clear and stop/restart', () => {
        engine.play();
        engine.tick(0.1);
        expect(engine.battleTime).toBeCloseTo(0.1);

        engine.clear();
        expect(engine.battleTime).toBe(0);
    });
});
