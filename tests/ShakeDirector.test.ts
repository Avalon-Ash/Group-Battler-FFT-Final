import { describe, it, expect, beforeEach } from 'vitest';
import { ShakeDirector } from '../engine/presentation/ShakeDirector';
import { CameraSystem } from '../engine/presentation/CameraSystem';
import { GameEngine } from '../engine/game';
import { SHAKE_DIRECTOR_PARAM } from '../constants';

describe('ShakeDirector', () => {
    let director: ShakeDirector;

    beforeEach(() => {
        director = new ShakeDirector();
    });

    it('同 tick 兩個衝擊取最大不加總', () => {
        director.report({ kind: 'HIT', intensity: 0.2, targetId: 'agent-1' }, 'agent-1');
        director.report({ kind: 'HIT', intensity: 0.3, targetId: 'agent-1' }, 'agent-1');
        expect(director.consume()).toBe(0.3);
    });

    it('MINOR 打在非焦點單位乘 OFF_FOCUS_SCALE (0.4)', () => {
        director.report({ kind: 'HIT', intensity: 0.5, targetId: 'agent-2' }, 'agent-1');
        expect(director.consume()).toBeCloseTo(0.5 * SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE);
    });

    it('MINOR 打在焦點單位不打折', () => {
        director.report({ kind: 'HIT', intensity: 0.5, targetId: 'agent-1' }, 'agent-1');
        expect(director.consume()).toBe(0.5);
    });

    it('MASSIVE 打在非焦點單位不打折', () => {
        director.report({ kind: 'MASSIVE', intensity: 0.5, targetId: 'agent-2' }, 'agent-1');
        expect(director.consume()).toBe(0.5);
    });

    it('focusId 為 null 不打折', () => {
        director.report({ kind: 'HIT', intensity: 0.5, targetId: 'agent-2' }, null);
        expect(director.consume()).toBe(0.5);
    });

    it('輸出上限為 MAX_TRAUMA (0.7)', () => {
        director.report({ kind: 'MASSIVE', intensity: 1.0, targetId: 'agent-1' }, 'agent-1');
        expect(director.consume()).toBe(SHAKE_DIRECTOR_PARAM.MAX_TRAUMA);
    });

    it('consume() 之後再 consume() 回傳 0', () => {
        director.report({ kind: 'HIT', intensity: 0.4, targetId: 'agent-1' }, 'agent-1');
        expect(director.consume()).toBe(0.4);
        expect(director.consume()).toBe(0);
    });

    it('沒有任何衝擊時 consume() 回傳 0', () => {
        expect(director.consume()).toBe(0);
    });
});

describe('CameraSystem trauma integration', () => {
    it('連續 addTrauma(0.3)、addTrauma(0.2) 後 getTrauma() 是 0.3', () => {
        const camera = new CameraSystem();
        camera.addTrauma(0.3);
        camera.addTrauma(0.2);
        expect(camera.getTrauma()).toBe(0.3);
    });
});

describe('DirectorSystem shake integration', () => {
    it('導演 enabled = false 時 CAMERA_IMPACT 仍會在下一次 update 產生 CAMERA_SHAKE', () => {
        const engine = new GameEngine();
        engine.director.enabled = false;
        let receivedShake: { intensity: number } | null = null;
        engine.bus.on('CAMERA_SHAKE', (data) => {
            receivedShake = data;
        });

        engine.bus.emit('CAMERA_IMPACT', { kind: 'MASSIVE', intensity: 0.5 });
        expect(receivedShake).toBeNull();

        engine.director.update(engine, 0.016);
        expect(receivedShake).toEqual({ intensity: 0.5 });
    });
});
