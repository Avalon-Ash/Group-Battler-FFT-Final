import { describe, it, expect, beforeEach } from 'vitest';
import { UltFeelStore } from '../engine/presentation/vfx/UltFeelStore';
import { ULT_FEEL } from '../constants';
import { Team } from '../types';

describe('UltFeelStore Contract', () => {
    let store: UltFeelStore;

    beforeEach(() => {
        store = new UltFeelStore();
    });

    it('ULT_IMPACT 記錄與過期：命中光爆在有效時間內存活，逾時自動過期', () => {
        store.recordImpact(120, 240, 15, Team.BLUE, 10.0);

        // 存活期內有效
        const activeImpacts = store.getActiveImpacts(10.05);
        expect(activeImpacts).toHaveLength(1);
        expect(activeImpacts[0].x).toBe(120);
        expect(activeImpacts[0].y).toBe(240);
        expect(activeImpacts[0].z).toBe(15);
        expect(activeImpacts[0].team).toBe(Team.BLUE);

        // 超過持續時間自動過期
        const expiredImpacts = store.getActiveImpacts(10.0 + ULT_FEEL.IMPACT_BURST_DURATION + 0.01);
        expect(expiredImpacts).toHaveLength(0);
    });

    it('槽位滿時替換最舊的命中記錄', () => {
        for (let i = 0; i < ULT_FEEL.MAX_IMPACTS; i++) {
            store.recordImpact(i, 0, 0, Team.RED, 10.0 + i * 0.001);
        }
        store.recordImpact(999, 0, 0, Team.BLUE, 10.05);

        const active = store.getActiveImpacts(10.06);
        expect(active).toHaveLength(ULT_FEEL.MAX_IMPACTS);
        expect(active.some(imp => imp.x === 0)).toBe(false);
        expect(active.some(imp => imp.x === 999)).toBe(true);
    });

    it('reset 清空：重置時清除所有命中記錄', () => {
        store.recordImpact(50, 50, 0, Team.RED, 10.0);

        store.reset();

        expect(store.getActiveImpacts(10.0)).toHaveLength(0);
    });
});
