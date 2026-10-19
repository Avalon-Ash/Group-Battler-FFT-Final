import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GameEngine } from '../engine/game';
import { VFXSystem } from '../engine/presentation/vfx/VFXSystem';
import { HexUtils } from '../engine/utils';
import { Team, Role } from '../types';
import { random, seedSimulation, getSimulationSeed } from '../engine/math/rng';

// 零件貼圖烘焙需要 DOM canvas；本測試只關心隨機流，故關閉烘焙（粒子仍照常抽籤）。
vi.mock('../engine/renderers/vfxparts/VFXPartStore', async (orig) => ({
    ...(await orig<typeof import('../engine/renderers/vfxparts/VFXPartStore')>()),
    vfxPartStore: { get: () => undefined },
}));

vi.mock('../engine/graphics/VFXFactory', async (orig) => ({
    ...(await orig<typeof import('../engine/graphics/VFXFactory')>()),
    VFXFactory: { getTexture: () => undefined, reset: () => undefined },
}));

const ROOT = path.resolve(__dirname, '..');

// 模擬層：任何影響戰鬥結果／場景生成的程式碼。這些檔案不得呼叫 Math.random（改用 engine/math/rng 的 random()）。
const SIM_PATHS = [
    'engine/ai', 'engine/core', 'engine/physics', 'engine/game.ts',
    'engine/systems/agentManager.ts', 'engine/systems/combat', 'engine/systems/movement',
    'engine/systems/status', 'engine/systems/map', 'engine/systems/ZoneSystem.ts',
    'engine/systems/PhysicsSystem.ts', 'hooks/useGameApp.ts',
];

function listTs(p: string): string[] {
    const abs = path.join(ROOT, p);
    if (fs.statSync(abs).isFile()) return [abs];
    return fs.readdirSync(abs, { withFileTypes: true }).flatMap(e => {
        const rel = path.join(p, e.name);
        if (e.isDirectory()) return listTs(rel);
        return /\.tsx?$/.test(e.name) ? [path.join(ROOT, rel)] : [];
    });
}

describe('RNG split: simulation stream vs presentation stream', () => {
    const realRandom = Math.random;
    afterEach(() => { Math.random = realRandom; });

    it('simulation code never calls Math.random', () => {
        const offenders: string[] = [];
        for (const f of SIM_PATHS.flatMap(listTs)) {
            const rel = path.relative(ROOT, f).replace(/\\/g, '/');
            if (rel === 'engine/core/ViewCommands.ts') continue;
            const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
            lines.forEach((ln, i) => {
                const code = ln.replace(/\/\/.*$/, '');
                if (/\bMath\.random\b/.test(code)) offenders.push(`${path.relative(ROOT, f)}:${i + 1}`);
            });
        }
        expect(offenders).toEqual([]);
    });

    it('same seed gives the same simulation sequence, independent of Math.random', () => {
        seedSimulation(42);
        const a = [random(), random(), random()];
        Math.random = () => 0.999;
        seedSimulation(42);
        const b = [random(), random(), random()];
        expect(b).toEqual(a);
        expect(getSimulationSeed()).toBe(42);
        seedSimulation(43);
        expect(random()).not.toBe(a[0]);
    });

    interface Snap { id: string; hp: number; q: number; r: number; px: number; py: number; dead: boolean }

    const runBattle = (storm: boolean): { snaps: Snap[]; time: number; damaged: number } => {
        seedSimulation(1234);
        const engine = new GameEngine();
        const vfx = new VFXSystem();
        vfx.bind(engine);
        const hexes = HexUtils.range({ q: 0, r: 0 }, 5).filter(h => engine.isValid(h.q, h.r) && !engine.isBlocked(h.q, h.r));
        const left = hexes.filter(h => h.q < -1);
        const right = hexes.filter(h => h.q > 1);
        const roles = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
        for (let i = 0; i < 4; i++) {
            engine.agentManager.addAgent(engine, Team.BLUE, left[i].q, left[i].r, 400, roles[i]);
            engine.agentManager.addAgent(engine, Team.RED, right[i].q, right[i].r, 400, roles[i]);
        }
        engine.play();
        const effects = ['FX_HIT_RED_HEAVY', 'FX_ACTIVE_BLUE_HOLY_SMITE', 'FX_CAST_BREAK_BURST_BLUE'];
        for (let t = 0; t < 900; t++) {
            if (storm) {
                for (let k = 0; k < 40; k++) Math.random();
                for (const a of engine.agents) {
                    vfx.playEffect(effects[t % effects.length], a.px, a.py, 10);
                }
                vfx.state.particles.length = 0;
            }
            engine.tick(1 / 30);
        }
        const snaps = engine.agents.map(a => ({ id: a.id, hp: a.hp, q: a.q, r: a.r, px: a.px, py: a.py, dead: a.hp <= 0 }));
        const damaged = engine.agents.filter(a => a.hp < 400).length;
        const time = engine.battleTime;
        vfx.unbind();
        engine.stop();
        engine.clear();
        return { snaps, time, damaged };
    };

    it('emitting extra VFX and consuming Math.random does not change a seeded battle', () => {
        // 基準：Math.random 固定常數；對照：真實 Math.random＋每 tick 大量特效與抽籤。
        Math.random = () => 0.5;
        const base = runBattle(false);
        Math.random = realRandom;
        const stormed = runBattle(true);
        expect(base.damaged).toBeGreaterThan(0); // 戰鬥確實發生，比較才有意義
        expect(stormed).toEqual(base);
    });
});
