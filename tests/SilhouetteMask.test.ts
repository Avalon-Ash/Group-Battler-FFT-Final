import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Team } from '../types';
import { BLOCK_HEIGHT, HEX_SIZE, ISO_SCALE_Y, SILHOUETTE_MASK } from '../constants';
import { HexUtils } from '../engine/utils';
import { GridSpatial } from '../engine/systems/grid/GridSpatial';
import { convexHull, columnShape } from '../engine/renderers/units/SilhouetteMask';

/**
 * 遮擋剪影只畫在擋住單位的東西上（RenderSpec §13）。
 * 這裡測裁切外形與遮擋來源；實際畫面由 tools/ui-e2e 實跑截圖驗證。
 */
describe('SilhouetteMask geometry', () => {
    it('convexHull drops interior points', () => {
        const hull = convexHull([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 5, y: 5 }]);
        expect(hull).toHaveLength(4);
        expect(hull).not.toContainEqual({ x: 5, y: 5 });
    });

    it('column shape spans the iso top face and extends COLUMN_DEPTH downward', () => {
        for (const layout of ['FLAT', 'POINTY'] as const) {
            const shape = columnShape(layout);
            const ys = shape.map((p) => p.y);
            const xs = shape.map((p) => p.x);
            const topHalf = (layout === 'FLAT' ? Math.sin(Math.PI / 3) : 1) * HEX_SIZE * ISO_SCALE_Y;
            expect(Math.min(...ys)).toBeCloseTo(-topHalf, 6);
            expect(Math.max(...ys)).toBeCloseTo(topHalf + SILHOUETTE_MASK.COLUMN_DEPTH, 6);
            const halfW = layout === 'FLAT' ? HEX_SIZE : HEX_SIZE * Math.sin(Math.PI / 3);
            expect(Math.min(...xs)).toBeCloseTo(-halfW, 6);
            expect(Math.max(...xs)).toBeCloseTo(halfW, 6);
        }
    });
});

describe('GridSpatial.getOcclusionSources', () => {
    let engine: GameEngine;

    beforeEach(() => {
        engine = new GameEngine();
        engine.play();
        for (const key of engine.map.mapKeys) {
            const [q, r] = key.split(',').map(Number);
            engine.map.removeObstacle(q, r);
            engine.map.setHeight(key, 0);
        }
    });

    afterEach(() => {
        engine.stop();
        engine.clear();
    });

    /** 畫面上在 (0,0) 前方（格心螢幕 Y 較大）的鄰格，取水平最近的 */
    const frontNeighbor = () => {
        const y0 = HexUtils.toPx(0, 0, engine.mapConfig).y;
        const x0 = HexUtils.toPx(0, 0, engine.mapConfig).x;
        // 水平距離最小的前方鄰格（正前方）：障礙物判定只看水平 OBSTACLE_OCCLUSION_X_RANGE 內
        const n = HexUtils.neighbors({ q: 0, r: 0 })
            .filter((h) => engine.map.mapKeys.has(HexUtils.key(h)) && HexUtils.toPx(h.q, h.r, engine.mapConfig).y > y0)
            .sort((h1, h2) => Math.abs(HexUtils.toPx(h1.q, h1.r, engine.mapConfig).x - x0) - Math.abs(HexUtils.toPx(h2.q, h2.r, engine.mapConfig).x - x0))[0];
        if (!n) throw new Error('no front neighbour on the default map');
        return n;
    };

    it('reports the taller front tile and agrees with getOccludedAgents', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500);
        expect(a).not.toBeNull();
        const n = frontNeighbor();
        engine.map.setHeight(HexUtils.key(n), 3 * BLOCK_HEIGHT);

        const sources = GridSpatial.getOcclusionSources(engine);
        const mine = sources.find((s) => s.agent === a);
        expect(mine).toBeDefined();
        expect(mine!.tiles).toContain(HexUtils.key(n));
        expect(GridSpatial.getOccludedAgents(engine)).toContain(a);
    });

    it('reports nothing on flat ground with no obstacles', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500);
        expect(a).not.toBeNull();
        expect(GridSpatial.getOcclusionSources(engine).find((s) => s.agent === a)).toBeUndefined();
        expect(GridSpatial.getOccludedAgents(engine)).not.toContain(a);
        expect(GridSpatial.getObstacleOccludedAgents(engine)).not.toContain(a);
    });

    it('reports an obstacle in front and agrees with getObstacleOccludedAgents', () => {
        const a = engine.agentManager.addAgent(engine, Team.BLUE, 0, 0, 500);
        expect(a).not.toBeNull();
        const n = frontNeighbor();
        engine.map.setObstacle(n.q, n.r, 'WALL');

        const mine = GridSpatial.getOcclusionSources(engine).find((s) => s.agent === a);
        expect(mine).toBeDefined();
        expect(mine!.obstacles).toContain(HexUtils.key(n));
        expect(GridSpatial.getObstacleOccludedAgents(engine)).toContain(a);
    });
});
