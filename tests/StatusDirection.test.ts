// [契約 R4] 嘲諷、加速零件的方向輸入。受保護：實作者不得修改本檔。
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
    return { agent, footX: x, floorY: y };
}

/** 有方向才算數：null 不得被 toBeCloseTo 當成 0 */
function angle(...args: Parameters<typeof statusAngle>): number {
    const a = statusAngle(...args);
    expect(a).not.toBeNull();
    return a as number;
}

function ctxOf(frames: StatusFrameRef[], hexToPx: StatusDirectionContext['hexToPx'] = () => ({ x: 0, y: 0 })): StatusDirectionContext {
    return { frames, hexToPx };
}

describe('[R4] statusAngle TOWARD_SOURCE（嘲諷指向嘲諷者）', () => {
    it('嘲諷者在右邊 → 0；在下方 → π/2；在左上 → atan2', () => {
        const me = unit('RED-1', Team.RED, 100, 100);
        const right = unit('BLU-1', Team.BLUE, 200, 100);
        const below = unit('BLU-2', Team.BLUE, 100, 180);
        const upLeft = unit('BLU-3', Team.BLUE, 40, 40);
        const frames = [me, right, below, upLeft];
        me.agent.effects.TAUNT.remaining = 2;

        me.agent.effects.TAUNT.sourceId = 'BLU-1';
        expect(angle('TOWARD_SOURCE', me, ctxOf(frames))).toBeCloseTo(0, 6);
        me.agent.effects.TAUNT.sourceId = 'BLU-2';
        expect(angle('TOWARD_SOURCE', me, ctxOf(frames))).toBeCloseTo(Math.PI / 2, 6);
        me.agent.effects.TAUNT.sourceId = 'BLU-3';
        expect(angle('TOWARD_SOURCE', me, ctxOf(frames))).toBeCloseTo(Math.atan2(-60, -60), 6);
    });

    it('讀 frame 的繪製座標，不是 Agent 的格座標', () => {
        const me = unit('RED-1', Team.RED, 100, 100);
        const src = unit('BLU-1', Team.BLUE, 100, 100);
        // 格座標相同，但繪製座標（例如插值、擊退位移後）在右下
        const srcDrawn: StatusFrameRef = { agent: src.agent, footX: 150, floorY: 150 };
        me.agent.effects.TAUNT.remaining = 2;
        me.agent.effects.TAUNT.sourceId = 'BLU-1';
        expect(angle('TOWARD_SOURCE', me, ctxOf([me, srcDrawn]))).toBeCloseTo(Math.PI / 4, 6);
    });

    it('沒有嘲諷者、嘲諷者不在場上 → null', () => {
        const me = unit('RED-1', Team.RED, 100, 100);
        me.agent.effects.TAUNT.remaining = 2;
        me.agent.effects.TAUNT.sourceId = null;
        expect(statusAngle('TOWARD_SOURCE', me, ctxOf([me]))).toBeNull();
        me.agent.effects.TAUNT.sourceId = 'BLU-9';
        expect(statusAngle('TOWARD_SOURCE', me, ctxOf([me]))).toBeNull();
    });
});

describe('[R4] statusAngle MOVE（加速順著移動方向）', () => {
    it('移動中：從目前位置指向 path[0] 的格心', () => {
        const me = unit('BLU-1', Team.BLUE, 100, 100);
        me.agent.isMoving = true;
        me.agent.path = [{ q: 3, r: 2 }];
        const toRight = ctxOf([me], () => ({ x: 160, y: 100 }));
        expect(angle('MOVE', me, toRight)).toBeCloseTo(0, 6);
        const toUp = ctxOf([me], () => ({ x: 100, y: 40 }));
        expect(angle('MOVE', me, toUp)).toBeCloseTo(-Math.PI / 2, 6);
        const toDownLeft = ctxOf([me], () => ({ x: 70, y: 130 }));
        expect(angle('MOVE', me, toDownLeft)).toBeCloseTo(Math.atan2(30, -30), 6);
    });

    it('靜止或沒有路徑：依 facing 左右', () => {
        const me = unit('BLU-1', Team.BLUE, 100, 100);
        me.agent.isMoving = false;
        me.agent.path = [];
        me.agent.facing = 1;
        expect(angle('MOVE', me, ctxOf([me]))).toBeCloseTo(0, 6);
        me.agent.facing = -1;
        expect(angle('MOVE', me, ctxOf([me]))).toBeCloseTo(Math.PI, 6);
        me.agent.isMoving = true; // 移動旗標在但路徑已空
        expect(angle('MOVE', me, ctxOf([me]))).toBeCloseTo(Math.PI, 6);
    });
});

describe('[R4] 零件表標出方向', () => {
    it('嘲諷的頭頂倒三角指向嘲諷者', () => {
        const head = STATUS_PARTS.TAUNT.layers.filter((l) => l.anchor === 'HEAD' && l.spec.kind === 'sigil');
        expect(head.length).toBe(1);
        expect(head[0].orient?.toward).toBe('TOWARD_SOURCE');
    });

    it('加速的速度線順著移動方向', () => {
        const lines = STATUS_PARTS.HASTE.layers.filter((l) => l.spec.kind === 'spark');
        expect(lines.length).toBeGreaterThan(0);
        for (const l of lines) expect(l.orient?.toward).toBe('MOVE');
    });

    it('其他狀態不帶方向（這輪只動嘲諷與加速）', () => {
        for (const [key, set] of Object.entries(STATUS_PARTS)) {
            if (key === 'TAUNT' || key === 'HASTE') continue;
            for (const l of set.layers) expect(l.orient, key).toBeUndefined();
        }
    });
});

describe('[R4] 刪掉 BarPainter 的舊控制條', () => {
    it('getHighestPriorityCC 不再存在', () => {
        expect('getHighestPriorityCC' in BarPainter).toBe(false);
    });
});
