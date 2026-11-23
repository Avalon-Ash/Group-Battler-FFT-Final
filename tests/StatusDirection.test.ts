// [契約 R4] 加速零件的方向輸入；嘲諷不帶方向（使用者 11-23）。受保護：實作者不得修改本檔。
import { describe, it, expect } from 'vitest';
import { statusAngle, type StatusFrameRef, type StatusDirectionContext } from '../engine/renderers/status/StatusDirection';
import { STATUS_PARTS } from '../data/vfx/status_parts';
import { BarPainter } from '../engine/renderers/hud/BarPainter';
import { Agent } from '../engine/core/Agent';
import { Team } from '../types';
import type { MapConfig } from '../engine/utils';

const CFG: MapConfig = { w: 8, h: 8, offsetX: 0, offsetY: 0, layout: 'FLAT' };

function unit(id: string, team: Team, x: number, y: number): StatusFrameRef {
    const agent = new Agent(id, team, 2, 2, CFG);
    agent.px = x;
    agent.py = y;
    return { agent };
}

/** 有方向才算數：null 不得被 toBeCloseTo 當成 0 */
function angle(...args: Parameters<typeof statusAngle>): number {
    const a = statusAngle(...args);
    expect(a).not.toBeNull();
    return a as number;
}

function ctxOf(hexToPx: StatusDirectionContext['hexToPx'] = () => ({ x: 0, y: 0 })): StatusDirectionContext {
    return { hexToPx };
}

describe('[R4] statusAngle MOVE（加速順著移動方向）', () => {
    it('移動中：從目前位置指向 path[0] 的格心', () => {
        const me = unit('BLU-1', Team.BLUE, 100, 100);
        me.agent.isMoving = true;
        me.agent.path = [{ q: 3, r: 2 }];
        const toRight = ctxOf(() => ({ x: 160, y: 100 }));
        expect(angle('MOVE', me, toRight)).toBeCloseTo(0, 6);
        const toUp = ctxOf(() => ({ x: 100, y: 40 }));
        expect(angle('MOVE', me, toUp)).toBeCloseTo(-Math.PI / 2, 6);
        const toDownLeft = ctxOf(() => ({ x: 70, y: 130 }));
        expect(angle('MOVE', me, toDownLeft)).toBeCloseTo(Math.atan2(30, -30), 6);
    });

    it('靜止或沒有路徑：依 facing 左右', () => {
        const me = unit('BLU-1', Team.BLUE, 100, 100);
        me.agent.isMoving = false;
        me.agent.path = [];
        me.agent.facing = 1;
        expect(angle('MOVE', me, ctxOf())).toBeCloseTo(0, 6);
        me.agent.facing = -1;
        expect(angle('MOVE', me, ctxOf())).toBeCloseTo(Math.PI, 6);
        me.agent.isMoving = true; // 移動旗標在但路徑已空
        expect(angle('MOVE', me, ctxOf())).toBeCloseTo(Math.PI, 6);
    });
});

describe('[R4] 零件表標出方向', () => {
    it('嘲諷的頭頂倒三角只是狀態標記，不指向嘲諷者', () => {
        const head = STATUS_PARTS.TAUNT.layers.filter((l) => l.anchor === 'HEAD' && l.spec.kind === 'sigil');
        expect(head.length).toBe(1);
        expect(head[0].orient).toBeUndefined();
    });

    it('加速的速度線順著移動方向', () => {
        const lines = STATUS_PARTS.HASTE.layers.filter((l) => l.spec.kind === 'spark');
        expect(lines.length).toBeGreaterThan(0);
        for (const l of lines) expect(l.orient?.toward).toBe('MOVE');
    });

    it('其他狀態不帶方向（只有加速）', () => {
        for (const [key, set] of Object.entries(STATUS_PARTS)) {
            if (key === 'HASTE') continue;
            for (const l of set.layers) expect(l.orient, key).toBeUndefined();
        }
    });
});

describe('[R4] 刪掉 BarPainter 的舊控制條', () => {
    it('getHighestPriorityCC 不再存在', () => {
        expect('getHighestPriorityCC' in BarPainter).toBe(false);
    });
});
