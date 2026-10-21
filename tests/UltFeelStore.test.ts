import { describe, it, expect, beforeEach } from 'vitest';
import { UltFeelStore } from '../engine/presentation/vfx/UltFeelStore';
import { ULT_FEEL } from '../constants';
import { Team } from '../types';

describe('UltFeelStore Contract', () => {
    let store: UltFeelStore;

    beforeEach(() => {
        store = new UltFeelStore();
    });

    it('CAST_START 記錄：正確記錄施法者、橫幅與暗場淡入', () => {
        store.recordCastStart('a1', 'Doom Meteor', Team.RED, 1.5, 10.0);

        // 橫幅顯示技能名稱與陣營
        const banner = store.getBanner(10.0);
        expect(banner).not.toBeNull();
        expect(banner?.skillName).toBe('Doom Meteor');
        expect(banner?.team).toBe(Team.RED);
        expect(banner?.casterId).toBe('a1');

        // 施法者聚光佇列
        const casters = store.getActiveSpotlightCasters(10.0);
        expect(casters).toHaveLength(1);
        expect(casters[0].casterId).toBe('a1');

        // 暗場淡入
        const alphaStart = store.getDimAlpha(10.0);
        expect(alphaStart).toBe(0);

        const alphaMid = store.getDimAlpha(10.0 + ULT_FEEL.DIM_FADE_IN);
        expect(alphaMid).toBeCloseTo(ULT_FEEL.DIM_ALPHA, 3);
    });

    it('CAST_BREAK 移除：中斷時即時移除施法者並關閉橫幅與暗場', () => {
        store.recordCastStart('a1', 'Soul Harvest', Team.RED, 2.0, 10.0);
        expect(store.getActiveSpotlightCasters(10.2)).toHaveLength(1);

        // CAST_BREAK 觸發
        store.removeCaster('a1');

        expect(store.getActiveSpotlightCasters(10.2)).toHaveLength(0);
        expect(store.getBanner(10.2)).toBeNull();
        expect(store.getDimAlpha(10.2)).toBe(0);
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

    it('聚光最多 2 個：同時多個施法者時，僅回傳最新 2 個施法者', () => {
        store.recordCastStart('c1', 'Ult 1', Team.BLUE, 2.0, 10.0);
        store.recordCastStart('c2', 'Ult 2', Team.RED, 2.0, 10.2);
        store.recordCastStart('c3', 'Ult 3', Team.BLUE, 2.0, 10.4);

        const spotlight = store.getActiveSpotlightCasters(10.5);
        expect(spotlight).toHaveLength(2);
        // 最新優先排序
        expect(spotlight[0].casterId).toBe('c3');
        expect(spotlight[1].casterId).toBe('c2');
    });

    it('最新橫幅優先：多個奧義連續施放時橫幅以最新一個為主', () => {
        store.recordCastStart('c1', 'First Ult', Team.BLUE, 2.0, 10.0);
        expect(store.getBanner(10.1)?.skillName).toBe('First Ult');

        // 第二個奧義起手
        store.recordCastStart('c2', 'Second Ult', Team.RED, 2.0, 10.3);
        const latestBanner = store.getBanner(10.4);
        expect(latestBanner?.skillName).toBe('Second Ult');
        expect(latestBanner?.team).toBe(Team.RED);

        // 超過總時長後橫幅消失
        expect(store.getBanner(10.3 + ULT_FEEL.BANNER_DURATION + 0.05)).toBeNull();
    });

    it('reset 清空：重置時清除所有施法者、命中記錄與橫幅', () => {
        store.recordCastStart('c1', 'Test Ult', Team.BLUE, 1.5, 10.0);
        store.recordImpact(50, 50, 0, Team.RED, 10.0);

        store.reset();

        expect(store.getActiveSpotlightCasters(10.0)).toHaveLength(0);
        expect(store.getActiveImpacts(10.0)).toHaveLength(0);
        expect(store.getBanner(10.0)).toBeNull();
        expect(store.getDimAlpha(10.0)).toBe(0);
    });

    it('暗場淡出與最低品質階層支援', () => {
        store.recordCastStart('c1', 'Test Ult', Team.BLUE, 1.0, 10.0);

        // 命中後（t = 11.0）進入淡出期（DIM_FADE_OUT）
        const halfFadeAlpha = store.getDimAlpha(10.0 + 1.0 + ULT_FEEL.DIM_FADE_OUT * 0.5);
        expect(halfFadeAlpha).toBeCloseTo(ULT_FEEL.DIM_ALPHA * 0.5, 2);

        // 完全淡出後歸零
        const fullFadeAlpha = store.getDimAlpha(10.0 + 1.0 + ULT_FEEL.DIM_FADE_OUT + 0.01);
        expect(fullFadeAlpha).toBe(0);

        // 最低品質階層使用較淡暗場
        store.recordCastStart('c2', 'Low Tier Ult', Team.RED, 1.0, 20.0);
        const lowTierAlpha = store.getDimAlpha(20.5, true);
        expect(lowTierAlpha).toBeCloseTo(ULT_FEEL.DIM_ALPHA_LOW_TIER, 2);
    });
});
