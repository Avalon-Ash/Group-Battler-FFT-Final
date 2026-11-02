import { describe, it, expect } from 'vitest';
import { Team, Role } from '../types';
import { getFactionSkin } from '../data/units/factionSkin';
import {
    FACTION_TINT, pickFactionLooks, plainLook, retintRgb, retintCss, variantKey, splitVariantKey, getAgentSkin, getLookSkin,
} from '../data/units/factionTint';

describe('faction tint', () => {
    it('陣營數不足時不分配外觀', () => {
        expect(pickFactionLooks(2, 'x')).toBeNull();
        expect(pickFactionLooks(FACTION_TINT.MIN_FACTIONS - 1, 'x')).toBeNull();
    });

    it('分配外觀：同種子同結果，前 8 個陣營互不相同，超過 8 個才重複', () => {
        const a = pickFactionLooks(8, 'round-1');
        const b = pickFactionLooks(8, 'round-1');
        expect(a).toEqual(b);
        const ids = new Set(a!.map(l => `${l.skinTeam}|${l.hue}`));
        expect(ids.size).toBe(8);
        const ten = pickFactionLooks(10, 'round-1')!;
        expect(ten).toHaveLength(10);
        expect(ten[8]).toEqual(ten[0]);
        expect(pickFactionLooks(8, 'round-2')).not.toEqual(a);
    });

    it('藍色像素換色相，皮膚、金屬、灰不動', () => {
        const [r, g, b] = retintRgb(40, 90, 200, 135);
        expect(g).toBeGreaterThan(r);
        expect(g).toBeGreaterThan(b);
        expect(retintRgb(230, 180, 140, 135)).toEqual([230, 180, 140]); // 皮膚
        expect(retintRgb(245, 184, 46, 135)).toEqual([245, 184, 46]); // 金
        expect(retintRgb(120, 125, 130, 135)).toEqual([120, 125, 130]); // 低飽和灰藍
        expect(retintRgb(30, 30, 30, 135)).toEqual([30, 30, 30]); // 無彩度
    });

    it('色碼字串換色：藍色換、金色不動、非色碼原樣', () => {
        expect(retintCss('#1e3a8a', 135)).not.toBe('#1e3a8a');
        expect(retintCss('#fde68a', 135)).toBe('#fde68a');
        expect(retintCss('Lionheart', 135)).toBe('Lionheart');
        expect(retintCss('source-over', 135)).toBe('source-over');
        expect(retintCss('rgba(30, 58, 138, 0.5)', 135)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.5\)$/);
    });

    it('圖集變體鍵來回拆得開', () => {
        expect(variantKey('BLUE:MAGE:MALE', null)).toBe('BLUE:MAGE:MALE');
        expect(variantKey('BLUE:MAGE:MALE', 135)).toBe('BLUE:MAGE:MALE@135');
        expect(splitVariantKey('BLUE:MAGE:MALE@135')).toEqual({ baseKey: 'BLUE:MAGE:MALE', hue: 135 });
        expect(splitVariantKey('RED:TANK:FEMALE')).toEqual({ baseKey: 'RED:TANK:FEMALE', hue: null });
    });

    it('沒有換色時皮膚就是原本的 getFactionSkin（雙陣營畫面不變）', () => {
        for (const team of [Team.BLUE, Team.RED]) {
            for (const role of [Role.TANK, Role.MAGE]) {
                expect(getAgentSkin({ team, role, look: plainLook(team) })).toBe(getFactionSkin(team, role, 'MALE'));
                expect(getAgentSkin({ team, role })).toBe(getFactionSkin(team, role, 'MALE'));
            }
        }
    });

    it('換色皮膚：血條與棋座藍色換掉，金色與樣式 id 不動，且有快取', () => {
        const base = getFactionSkin(Team.BLUE, Role.TANK, 'MALE');
        const tinted = getLookSkin({ skinTeam: Team.BLUE, hue: 135 }, Role.TANK, 'MALE');
        expect(tinted).not.toBe(base);
        expect(tinted.pedestal.sideColor).not.toBe(base.pedestal.sideColor);
        expect(tinted.pedestal.style).toBe(base.pedestal.style);
        expect(tinted.core.edge).toBe(base.core.edge);
        expect(tinted.name).toBe(base.name);
        expect(getLookSkin({ skinTeam: Team.BLUE, hue: 135 }, Role.TANK, 'MALE')).toBe(tinted);
    });
});
