import { describe, it, expect } from 'vitest';
import { Agent } from '../engine/core/Agent';
import { HexUtils, type MapConfig } from '../engine/utils';
import { RenderList } from '../engine/renderers/RenderList';
import { UnitRenderSystem } from '../engine/presentation/unit/UnitSystem';
import { UnitFrameStore } from '../engine/renderers/frame/UnitFrame';
import { pickAgentAt } from '../hooks/pickAgentAt';
import { queryAgentAt } from '../engine/systems/ui/editorQueries';
import { GAME_INPUT_PARAM } from '../constants';
import { Team } from '../types';
import { buildBattle } from './contracts/simState';

/** 點擊命中（UnitPick＋pickAgentAt）：身體框、最前面優先、裝置別容差、退回格子。 */
const MAP: MapConfig = { w: 10, h: 10, offsetX: 0, offsetY: 0, layout: 'FLAT' };

/** 畫一幀（高度 0）：回傳表現層的單位命中器與快照 */
function draw(agents: Agent[]) {
    const store = new UnitFrameStore();
    store.build(agents, () => 0, MAP, 0, 'IDLE');
    const unit = new UnitRenderSystem();
    unit.submitRenderables(new RenderList(), store, 0, null);
    return { store, unit };
}

describe('單位點擊命中', () => {
    // 引擎只用來做格子退路（engine.getAgentAt）；畫面上的單位是自己建的
    const engine = buildBattle('TEAMS', 41);

    it('點在單位頭上（落在後一格的位置）選到該單位，而格子判定選不到', () => {
        const a = new Agent('A', Team.BLUE, 0, 0, MAP);
        const { store, unit } = draw([a]);
        const f = store.get(a)!;
        const world = { x: f.footX, y: f.hudAnchorY + 4 };
        const hex = HexUtils.fromPx(world.x, world.y, MAP);
        // 前提：這一點的格子不是 A 站的那一格（單位畫得比格子高）
        expect(hex.q === a.q && hex.r === a.r).toBe(false);
        expect(pickAgentAt(engine, unit, world, 1, 'mouse', hex)).toBe(a);
        expect(pickAgentAt(engine, null, world, 1, 'mouse', hex)).not.toBe(a);
    });

    it('兩個單位重疊時選畫在前面的（排序鍵較大）', () => {
        const back = new Agent('BACK', Team.BLUE, 0, 0, MAP);
        const front = new Agent('FRONT', Team.RED, 0, 1, MAP);
        const { store, unit } = draw([back, front]);
        const fb = store.get(back)!, ff = store.get(front)!;
        expect(ff.sortY + ff.sortBias).toBeGreaterThan(fb.sortY + fb.sortBias);
        // 後面那個的腳邊、前面那個的頭上：兩個框都蓋到的位置
        const y = (ff.hudAnchorY + fb.floorY) / 2;
        expect(y).toBeGreaterThan(ff.hudAnchorY);
        expect(y).toBeLessThan(fb.floorY);
        expect(pickAgentAt(engine, unit, { x: fb.footX, y }, 1, 'mouse', null)).toBe(front);
        // 順序不影響結果
        const swapped = draw([front, back]);
        expect(pickAgentAt(engine, swapped.unit, { x: fb.footX, y }, 1, 'mouse', null)).toBe(front);
        // 只有後面那個蓋到的位置（它的頭頂，在前面那個的框和容差之上）選後面那個
        const backHead = fb.hudAnchorY + 1;
        expect(backHead).toBeLessThan(ff.hudAnchorY - GAME_INPUT_PARAM.PICK_PAD_MOUSE_PX);
        expect(pickAgentAt(engine, unit, { x: fb.footX, y: backHead }, 1, 'mouse', null)).toBe(back);
    });

    it('點在空地遠處退回格子判定；格子上沒有單位就是 undefined', () => {
        const a = new Agent('A', Team.BLUE, 0, 0, MAP);
        const { store, unit } = draw([a]);
        const f = store.get(a)!;
        const far = { x: f.footX + 500, y: f.floorY };
        const target = engine.agents[0];
        expect(pickAgentAt(engine, unit, far, 1, 'mouse', { q: target.q, r: target.r })).toBe(queryAgentAt(engine, target.q, target.r));
        expect(queryAgentAt(engine, target.q, target.r)).toBe(target);
        expect(pickAgentAt(engine, unit, far, 1, 'mouse', null)).toBeUndefined();
        // 還沒畫過任何一幀：整個退回格子
        expect(pickAgentAt(engine, new UnitRenderSystem(), far, 1, 'touch', { q: target.q, r: target.r })).toBe(target);
    });

    it('滑鼠與觸控各用各的容差；容差是螢幕像素，隨鏡頭縮放換算', () => {
        const a = new Agent('A', Team.BLUE, 0, 0, MAP);
        const { store, unit } = draw([a]);
        const f = store.get(a)!;
        const halfW = (f.floorY - f.hudAnchorY) * GAME_INPUT_PARAM.PICK_HALF_WIDTH_RATIO;
        const mouse = GAME_INPUT_PARAM.PICK_PAD_MOUSE_PX, touch = GAME_INPUT_PARAM.PICK_PAD_TOUCH_PX;
        expect(touch).toBeGreaterThan(mouse);
        const midY = (f.hudAnchorY + f.floorY) / 2;
        // 剛好落在滑鼠容差與觸控容差之間
        const between = { x: f.footX + halfW + (mouse + touch) / 2, y: midY };
        expect(pickAgentAt(engine, unit, between, 1, 'mouse', null)).toBeUndefined();
        expect(pickAgentAt(engine, unit, between, 1, 'pen', null)).toBeUndefined();
        expect(pickAgentAt(engine, unit, between, 1, 'touch', null)).toBe(a);
        // 邊界內外：滑鼠容差內選到、外面選不到
        expect(pickAgentAt(engine, unit, { x: f.footX + halfW + mouse - 0.5, y: midY }, 1, 'mouse', null)).toBe(a);
        expect(pickAgentAt(engine, unit, { x: f.footX + halfW + mouse + 0.5, y: midY }, 1, 'mouse', null)).toBeUndefined();
        // 鏡頭放大兩倍：同樣的螢幕像素只對應一半的世界距離
        expect(pickAgentAt(engine, unit, { x: f.footX + halfW + mouse - 0.5, y: midY }, 2, 'mouse', null)).toBeUndefined();
        expect(pickAgentAt(engine, unit, { x: f.footX + halfW + mouse / 2 - 0.5, y: midY }, 2, 'mouse', null)).toBe(a);
    });

    it('屍體不能點', () => {
        const a = new Agent('A', Team.BLUE, 0, 0, MAP);
        a.hp = 0;
        const { store, unit } = draw([a]);
        const f = store.get(a)!;
        expect(pickAgentAt(engine, unit, { x: f.footX, y: f.floorY - 5 }, 1, 'mouse', null)).toBeUndefined();
    });
});
