import { describe, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GameEngine } from '../../engine/game';
import { Agent } from '../../engine/core/Agent';
import type { MapConfig } from '../../engine/utils';
import { Team } from '../../types';
import type { MatchPhase, AppMode, WindowDef } from '../../types';
import { HEX_SIZE } from '../../constants';
import { UnitFrameStore } from '../../engine/renderers/frame/UnitFrame';
import { effectiveViewport } from '../../engine/presentation/ViewInsets';
import { MatchFlowSystem } from '../../engine/systems/match/MatchFlowSystem';
import { selectSessionView } from '../../engine/systems/ui/views/session';
import { WINDOW_DEFINITIONS } from '../../data/ui/windows';
import { contractTest, pendingIf } from './contractTest';
import { emit, DT } from './simState';

const ROOT = path.resolve(__dirname, '../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** 契約 R1：兩個模擬 tick 之間的畫面插值（只在 UnitFrameStore.build）。 */
describe('契約 R1 畫面插值', () => {
    const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };
    const flat = () => 0;
    const scene = () => {
        const store = new UnitFrameStore();
        const a = new Agent('P', Team.BLUE, 0, 0, MAP);
        const build = (tick?: number, alpha?: number) => {
            store.build([a], flat, MAP, 0, 'IDLE', undefined, 0, tick === undefined ? undefined : { tick, alpha: alpha ?? 1 });
            const f = store.get(a)!;
            return { x: f.footX, y: f.footY };
        };
        return { a, build, x0: a.px, y0: a.py };
    };

    contractTest('R1', '腳點在上一個 tick 與這個 tick 之間插值；alpha 1 或省略＝最新狀態', () => {
        const { a, build, x0, y0 } = scene();
        expect(build(10, 1)).toEqual({ x: x0, y: y0 });
        a.px = x0 + 6;
        a.py = y0 + 2;
        const mid = build(11, 0.5);
        pendingIf('R1', mid.x === x0 + 6, 'UnitFrameStore.build 還沒做插值');
        expect(mid.x).toBeCloseTo(x0 + 3, 6);
        expect(mid.y).toBeCloseTo(y0 + 1, 6);
        // 同一個 tick 內多畫幾幀：上一個 tick 的位置不被覆蓋
        expect(build(11, 0).x).toBeCloseTo(x0, 6);
        expect(build(11, 0.25).x).toBeCloseTo(x0 + 1.5, 6);
        expect(build(11, 1).x).toBeCloseTo(x0 + 6, 6);
        expect(build().x).toBeCloseTo(x0 + 6, 6);
    });

    contractTest('R1', '擊退位移（physics）也一起插值；一幀跨好幾個 tick 時從上次畫的位置接過去', () => {
        const { a, build, x0 } = scene();
        build(10, 1);
        a.physics.x = 8;
        const mid = build(11, 0.5);
        pendingIf('R1', mid.x === x0 + 8, 'UnitFrameStore.build 還沒做插值');
        expect(mid.x).toBeCloseTo(x0 + 4, 6);
        build(11, 1);
        a.px = x0 + 30;
        a.physics.x = 0;
        // 上次畫在 tick 11 結束（x0+8），現在是 tick 16、alpha 0.5：畫面時間＝這 5 個 tick 裡的第 4.5 個，
        // 所以走完 (gap − 1 + alpha) / gap，不是直接用 alpha（直接用 alpha 在每幀 tick 數不固定時比不插值更抖）。
        expect(build(16, 0.5).x).toBeCloseTo(x0 + 8 + (30 - 8) * (5 - 1 + 0.5) / 5, 6);
    });

    contractTest('R1', '瞬移與剛出現的單位不插值', () => {
        const { a, build, x0 } = scene();
        build(10, 1);
        a.px = x0 + 6;
        pendingIf('R1', build(11, 0.5).x === x0 + 6, 'UnitFrameStore.build 還沒做插值');
        build(11, 1);
        a.px = x0 + 6 + HEX_SIZE * 3;
        expect(build(12, 0.5).x).toBeCloseTo(x0 + 6 + HEX_SIZE * 3, 6);

        const store = new UnitFrameStore();
        const fresh = new Agent('Q', Team.RED, 1, 0, MAP);
        store.build([fresh], flat, MAP, 0, 'IDLE', undefined, 0, { tick: 12, alpha: 0.3 });
        expect(store.get(fresh)!.footX).toBeCloseTo(fresh.px, 6);
    });

    contractTest('R1', 'RenderPipeline 把插值資訊交給 UnitFrameStore.build，並留一個 ?interp=0 的開關', () => {
        const pipeline = read('engine/renderers/RenderPipeline.ts');
        const passes = /frames\.build\([^;]*\btick\b[^;]*\);/s.test(pipeline);
        pendingIf('R1', !passes, 'RenderPipeline 呼叫 frames.build 時還沒帶 { tick, alpha }');
        const all = ['hooks/useGameLoop.ts', 'engine/renderers/RenderPipeline.ts', 'engine/renderer.ts', 'engine/renderers/RenderQuality.ts', 'constants/render.ts']
            .map(read).join('\n');
        expect(all).toMatch(/interp/);
    });
});

/** 契約 R2：對局流程在引擎端，無畫面也能一局接一局。 */
describe('契約 R2 對局流程', () => {
    /** 跑展示模式直到開了 rounds 局（或超過 20 分鐘的模擬時間） */
    const showcase = (rounds: number, ready: () => boolean = () => true) => {
        const e = new GameEngine({ audio: false });
        let seed = 100;
        const flow = new MatchFlowSystem(e, { isRosterReady: ready, nextSeed: () => seed++ });
        let starts = 0, overs = 0;
        const phases = new Set<MatchPhase>();
        const matches: string[] = [];
        e.bus.on('GAME_START', () => {
            starts++;
            matches.push(`${e.currentScene.id}|${e.mapConfig.w}x${e.mapConfig.h}|${e.mapConfig.layout}|${e.agents.map((a) => `${a.side}:${a.role}@${a.q},${a.r}`).join(' ')}`);
        });
        e.bus.on('GAME_OVER', () => { overs++; });
        flow.setShowcase(true);
        for (let frame = 0; frame < 60 * 60 * 20 && starts < rounds; frame++) {
            flow.update(DT);
            if (e.isRunning) e.tick(DT);
            phases.add(flow.phase);
        }
        return { e, flow, starts, overs, phases, matches };
    };

    contractTest('R2', '展示模式無畫面連跑三局，每個階段都走過', () => {
        const r = showcase(3);
        expect(r.starts).toBe(3);
        expect(r.overs).toBeGreaterThanOrEqual(2);
        for (const p of ['PLAYING', 'RESULT_HOLD', 'TRANSITION_OUT', 'TRANSITION_IN', 'SPAWN_WAIT'] as const) expect(r.phases.has(p)).toBe(true);
        expect(new Set(r.matches).size).toBe(3);
        expect(r.e.agents.length).toBeGreaterThan(1);
    }, 60000);

    contractTest('R2', '同一串種子跑兩次，三局的地圖與佈陣完全相同', () => {
        expect(showcase(3).matches).toEqual(showcase(3).matches);
    }, 60000);

    contractTest('R2', '圖集一直沒準備好：等到逾時照樣開打', () => {
        expect(showcase(2, () => false).starts).toBe(2);
    }, 60000);

    contractTest('R2', '關掉展示模式回到 LOBBY，不會自己開下一局', () => {
        const r = showcase(1);
        r.flow.setShowcase(false);
        expect(r.flow.phase).toBe('LOBBY');
        expect(r.e.isRunning).toBe(false);
        let starts = 0;
        r.e.bus.on('GAME_START', () => { starts++; });
        for (let frame = 0; frame < 600; frame++) r.flow.update(DT);
        expect(starts).toBe(0);
    }, 60000);

    contractTest('R2', 'selectSessionView 反映流程狀態，內容沒變時回傳同一個物件', () => {
        const r = showcase(1);
        const view = selectSessionView(r.e);
        expect(view.phase).toBe('PLAYING');
        expect(view.isPlaying).toBe(true);
        expect(view.isShowcase).toBe(true);
        expect(view.winner).toBeNull();
        expect(view.unitCount).toBe(r.e.agents.length);
        expect(selectSessionView(r.e)).toBe(view);
    }, 60000);

    contractTest('R2', 'useGameApp 不再自己排轉場時間、不輪詢單位數、不經 props 傳轉場階段', () => {
        const hook = read('hooks/useGameApp.ts');
        const stale = ['TRANSITION_OUT_MS', 'RESULT_HOLD_MS', 'setInterval', 'transitionPhase'].filter((k) => hook.includes(k));
        pendingIf('R2', stale.length > 0, `hooks/useGameApp.ts 還有：${stale.join(', ')}`);
        expect(stale).toEqual([]);
    });
});

/** 契約 R3：導播避讓被 UI 蓋住的邊。 */
describe('契約 R3 導播避讓', () => {
    contractTest('R3', 'effectiveViewport 扣掉被蓋住的邊，回報中心位移', () => {
        expect(effectiveViewport(390, 844, { top: 0, right: 0, bottom: 200, left: 0 })).toEqual({ w: 390, h: 644, shiftX: 0, shiftY: -100 });
        expect(effectiveViewport(1000, 800, { top: 40, right: 300, bottom: 0, left: 0 })).toEqual({ w: 700, h: 760, shiftX: -150, shiftY: 20 });
        expect(effectiveViewport(390, 844, { top: 0, right: 0, bottom: 0, left: 0 })).toEqual({ w: 390, h: 844, shiftX: 0, shiftY: 0 });
        expect(effectiveViewport(390, 844, { top: -5, right: Number.NaN, bottom: 9999, left: 0 })).toEqual({ w: 390, h: 1, shiftX: 0, shiftY: -9999 / 2 });
    });

    contractTest('R3', 'SET_VIEW_INSETS 是畫面指令：立即套用、不進紀錄，值存在導播', () => {
        const e = new GameEngine({ audio: false });
        const logged = e.commands.log.length;
        emit(e, { type: 'SET_VIEW_INSETS', top: 0, right: 0, bottom: 200, left: 0 });
        expect(e.director.viewInsets).toEqual({ top: 0, right: 0, bottom: 200, left: 0 });
        expect(e.commands.log.length).toBe(logged);
        emit(e, { type: 'SET_VIEW_INSETS', top: -3, right: Number.NaN, bottom: 10, left: 0 });
        expect(e.director.viewInsets).toEqual({ top: 0, right: 0, bottom: 10, left: 0 });
    });

    contractTest('R3', '導播取景用有效區域', () => {
        const src = read('engine/presentation/DirectorSystem.ts');
        pendingIf('R3', !src.includes('effectiveViewport'), 'DirectorSystem 還沒用 effectiveViewport');
        expect(src).toMatch(/effectiveViewport\(/);
    });
});

/** 契約 U1：視窗在哪些模式可用改由 modes 列出。 */
describe('契約 U1 視窗 modes', () => {
    /** 依 2026-11-17 的三個布林換算（showcase＝visibleInShowcase、gameover＝visibleOnGameOver、manual＝visibleInManual 不是 false） */
    const EXPECTED: Record<string, readonly AppMode[]> = {
        logs: ['MANUAL', 'GAME_OVER'],
        db: ['MANUAL'],
        vfxmap: ['MANUAL'],
        inspector: ['MANUAL'],
        behaviorTree: ['MANUAL'],
        monitor: ['MANUAL'],
        directorSettings: ['MANUAL'],
        zoneSettings: ['MANUAL'],
        showcaseSettings: ['SHOWCASE'],
        audioSettings: ['SHOWCASE', 'MANUAL'],
    };

    contractTest('U1', '現在的三個布林和換算表一致（換算表沒抄錯）；每個視窗都有 modes', () => {
        expect(WINDOW_DEFINITIONS.map((d) => d.id).sort()).toEqual(Object.keys(EXPECTED).sort());
        // 三個布林已從 WindowDef 拿掉（契約 U1 完成後 legacy 是空的）；這裡自己宣告舊欄位，換算表才能在遷移前後都通過型別檢查
        type LegacyFlags = { visibleInShowcase?: boolean; visibleInManual?: boolean; visibleOnGameOver?: boolean };
        const legacy = (WINDOW_DEFINITIONS as (WindowDef & LegacyFlags)[]).filter((d) => 'visibleInShowcase' in d || 'visibleInManual' in d || 'visibleOnGameOver' in d);
        for (const d of legacy) {
            const modes: AppMode[] = [];
            if (d.visibleInShowcase) modes.push('SHOWCASE');
            if (d.visibleInManual !== false) modes.push('MANUAL');
            if (d.visibleOnGameOver) modes.push('GAME_OVER');
            expect([...modes].sort()).toEqual([...EXPECTED[d.id]].sort());
        }
        pendingIf('U1', WINDOW_DEFINITIONS.some((d) => d.modes === undefined), 'data/ui/windows.ts 還沒有 modes');
        for (const d of WINDOW_DEFINITIONS) expect([...d.modes!].sort()).toEqual([...EXPECTED[d.id]].sort());
    });

    contractTest('U1', '三個 visible* 布林已移除', () => {
        const hits = ['types.ts', 'data/ui/windows.ts', 'components/ui/window/windowRegistry.tsx']
            .filter((f) => /visibleInShowcase|visibleInManual|visibleOnGameOver/.test(read(f)));
        pendingIf('U1', hits.length > 0, `還有 visible* 布林：${hits.join(', ')}`);
        expect(hits).toEqual([]);
    });
});
