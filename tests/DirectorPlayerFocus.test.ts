import { describe, it, expect } from 'vitest';
import { DIRECTOR_PARAM } from '../constants';
import { buildBattle, runTicks, emit } from './contracts/simState';

/**
 * 導播跟著玩家操控的單位（契約 G3 的試玩回饋）：玩家單位一直是主角，鏡頭框在它身上；
 * 沒有玩家單位時照原本的排分選主角。
 */
const setup = () => {
    const e = buildBattle('TEAMS', 41);
    emit(e, { type: 'SET_ZONE_CONFIG', config: { enabled: false } });
    emit(e, { type: 'SET_VIEWPORT', width: 1280, height: 720 });
    const frames: { x: number; y: number; zoom: number }[] = [];
    e.bus.on('CAMERA_MOVE', (f) => { frames.push({ x: f.x, y: f.y, zoom: f.zoom }); });
    return { e, hero: e.agents[0], frames };
};

describe('導播：玩家操控的單位', () => {
    it('玩家單位一直是主角，別人打得再熱鬧也不換', () => {
        const { e, hero } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        emit(e, { type: 'START_GAME', seed: 1 });
        let checked = 0;
        runTicks(e, 600, () => {
            if (e.state.time.tick > 1 && hero.hp > 0 && !hero.outOfBounds) { expect(e.state.director.targetId).toBe(hero.id); checked++; }
        });
        expect(checked).toBeGreaterThan(200);
    }, 60000);

    it('開戰就框在玩家單位身上（不先看全場），四周留得出視野', () => {
        const { e, hero, frames } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        emit(e, { type: 'START_GAME', seed: 1 });
        // 鏡頭有緩動：給它一點時間移過去（單位原地堅守，不會跑）
        runTicks(e, 240);
        expect(hero.hp).toBeGreaterThan(0);
        const last = frames[frames.length - 1];
        const off = Math.hypot(last.x - hero.px, last.y - hero.py);
        // 焦點在單位附近：遠小於「四周視野」的半徑（視窗死區與地形高度會讓它不剛好在正中央）
        expect(off).toBeLessThan(DIRECTOR_PARAM.PLAYER_VIEW_RADIUS_PX);
        // 看得到四周：畫面短邊的一半（720/2）換算成世界距離不小於視野半徑
        expect(360 / last.zoom).toBeGreaterThanOrEqual(DIRECTOR_PARAM.PLAYER_VIEW_RADIUS_PX * 0.95);
    }, 60000);

    it('有好幾個玩家單位時跟點選中的那一個', () => {
        const { e, hero } = setup();
        const other = e.agents.find((a) => a !== hero && a.side === hero.side)!;
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        emit(e, { type: 'SET_CONTROLLER', agentId: other.id, controller: 'PLAYER' });
        emit(e, { type: 'SET_WATCH_AGENT', agentId: other.id });
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 5);
        expect(e.state.director.targetId).toBe(other.id);
        emit(e, { type: 'SET_WATCH_AGENT', agentId: hero.id });
        runTicks(e, 3);
        expect(e.state.director.targetId).toBe(hero.id);
    });

    it('切回 AI 之後導播恢復自己選主角', () => {
        const { e, hero } = setup();
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'PLAYER' });
        emit(e, { type: 'START_GAME', seed: 1 });
        runTicks(e, 30);
        emit(e, { type: 'SET_CONTROLLER', agentId: hero.id, controller: 'AI' });
        const seen = new Set<string | null>();
        runTicks(e, 900, () => { seen.add(e.state.director.targetId); });
        // 不再被釘在同一個單位上：一場打下來主角至少換過一次
        expect(seen.size).toBeGreaterThan(1);
    }, 60000);
});
