import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/game';
import { VisualMath } from '../engine/math/VisualMath';
import { effectiveViewport, type ViewInsets } from '../engine/presentation/ViewInsets';
import { computeViewInsets, VIEW_INSET_KIND } from '../hooks/useViewInsets';
import { DIRECTOR_PARAM } from '../constants';
import { Role, Team } from '../types';
import { buildBattle, emit, runTicks } from './contracts/simState';

const PHONE_VIEWPORT = { width: 390, height: 844 } as const;
const BOTTOM_INSET_PX = 200;
const BOTTOM_INSETS: ViewInsets = { top: 0, right: 0, bottom: BOTTOM_INSET_PX, left: 0 };

/** CameraSystem.applyTransform 同一條投影式：世界 Y → 畫布螢幕 Y */
function worldToScreenY(worldY: number, camY: number, zoom: number, screenH: number): number {
    return screenH / 2 + (worldY - camY) * zoom;
}

describe('契約 R3 導播避讓底部 UI', () => {
    it('200 px 底部 inset 時，玩家主角的螢幕 Y 落在有效區域的中央帶內', () => {
        const e = buildBattle('TEAMS', 41);
        emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
        emit(e, { type: 'SET_VIEWPORT', width: PHONE_VIEWPORT.width, height: PHONE_VIEWPORT.height });
        emit(e, { type: 'SET_VIEW_INSETS', ...BOTTOM_INSETS });

        const hero = e.agents[0];
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });

        let lastFrame: { x: number; y: number; zoom: number } | null = null;
        e.bus.on('CAMERA_MOVE', (f) => { lastFrame = { x: f.x, y: f.y, zoom: f.zoom }; });

        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 180);

        expect(hero.hp).toBeGreaterThan(0);
        expect(lastFrame).not.toBeNull();
        const frame = lastFrame!;

        const vp = effectiveViewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height, BOTTOM_INSETS);
        const effectiveCenterY = PHONE_VIEWPORT.height / 2 + vp.shiftY;
        const centerBandHalfPx = DIRECTOR_PARAM.WINDOW_Y * Math.min(vp.w, vp.h);

        const heroWorldY = VisualMath.getVisualBodyCenterY(hero.py + hero.physics.y, hero.physics.z);
        const heroScreenY = worldToScreenY(heroWorldY, frame.y, frame.zoom, PHONE_VIEWPORT.height);

        expect(Math.abs(heroScreenY - effectiveCenterY)).toBeLessThanOrEqual(centerBandHalfPx);
        expect(heroScreenY).toBeLessThan(PHONE_VIEWPORT.height / 2);
    }, 60000);

    it('200 px 底部 inset 時，一般 AI 導播的主角也落在有效區域中央帶內，且即時跟隨 inset 變化', () => {
        const engine = new GameEngine({ audio: false });
        engine.map.obstacles.clear();
        engine.map.obstaclesHash.clear();
        emit(engine, { type: 'SET_VIEWPORT', width: PHONE_VIEWPORT.width, height: PHONE_VIEWPORT.height });

        const hero = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 200, Role.WARRIOR)!;
        expect(hero).toBeTruthy();
        engine.state.director.targetId = hero.id;
        engine.state.director.focusTimer = 10;

        let frame: { x: number; y: number; zoom: number } | null = null;
        engine.bus.on('CAMERA_MOVE', (f) => { frame = { x: f.x, y: f.y, zoom: f.zoom }; });

        // 先以 0 inset 建立初始視窗狀態，再套用 200 px 底部 inset：視窗死區不應吞掉位移
        engine.director.update(engine, 1 / 60);
        expect(frame).not.toBeNull();
        const heroWorldY = VisualMath.getVisualBodyCenterY(hero.py + hero.physics.y, hero.physics.z);
        const unshiftedScreenY = worldToScreenY(heroWorldY, frame!.y, frame!.zoom, PHONE_VIEWPORT.height);
        expect(unshiftedScreenY).toBeCloseTo(PHONE_VIEWPORT.height / 2, 4);

        emit(engine, { type: 'SET_VIEW_INSETS', ...BOTTOM_INSETS });
        engine.director.update(engine, 1 / 60);

        const vp = effectiveViewport(PHONE_VIEWPORT.width, PHONE_VIEWPORT.height, BOTTOM_INSETS);
        const effectiveCenterY = PHONE_VIEWPORT.height / 2 + vp.shiftY;
        const centerBandHalfPx = DIRECTOR_PARAM.WINDOW_Y * Math.min(vp.w, vp.h);
        const shiftedScreenY = worldToScreenY(heroWorldY, frame!.y, frame!.zoom, PHONE_VIEWPORT.height);

        expect(Math.abs(shiftedScreenY - effectiveCenterY)).toBeLessThanOrEqual(centerBandHalfPx);
        expect(shiftedScreenY).toBeCloseTo(effectiveCenterY, 4);
    });

    it('computeViewInsets 取底部面板與下方播放列的最大遮擋高度，忽略上方播放列與空尺寸', () => {
        const container = { top: 0, bottom: 844, left: 0, right: 390, width: 390, height: 844 };

        expect(computeViewInsets(container, [])).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });

        // 僅有位於下方的播放列
        expect(computeViewInsets(container, [
            { kind: VIEW_INSET_KIND.BOTTOM_BAR, rect: { top: 740, bottom: 788, left: 40, right: 350, width: 310, height: 48 } },
        ])).toEqual({ top: 0, right: 0, bottom: 104, left: 0 });

        // 播放列尚未初始化（在 0,0）或被拖到畫布上半部：不計入底部遮擋
        expect(computeViewInsets(container, [
            { kind: VIEW_INSET_KIND.BOTTOM_BAR, rect: { top: 0, bottom: 48, left: 0, right: 310, width: 310, height: 48 } },
        ])).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });

        // 底部面板與播放列同時存在：取較高的底部遮擋（面板上緣到畫布下緣）
        expect(computeViewInsets(container, [
            { kind: VIEW_INSET_KIND.BOTTOM_BAR, rect: { top: 740, bottom: 788, left: 40, right: 350, width: 310, height: 48 } },
            { kind: VIEW_INSET_KIND.BOTTOM_SHEET, rect: { top: 400, bottom: 708, left: 0, right: 390, width: 390, height: 308 } },
        ])).toEqual({ top: 0, right: 0, bottom: 444, left: 0 });
    });
});
