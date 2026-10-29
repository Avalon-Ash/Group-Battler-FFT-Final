import { describe, it, expect } from 'vitest';
import { HUDSystem } from '../engine/presentation/hud';
import { HUD_TEXT_MOTION } from '../constants';
import type { GameEngine } from '../engine/game';

/** 多段傷害（一次施放最多 8 段、約 0.6 秒）打在同一個單位上：每個數字要排到不同的位置，才讀得出來。 */
describe('HUDSystem damage text stagger', () => {
    const add = (hud: HUDSystem, owner: string | undefined, type: 'DAMAGE' | 'HEAL' = 'DAMAGE') =>
        hud.addFloatingText(100, 200, '10', '#fff', 16, type, false, owner);

    it('puts eight simultaneous hits on one target into distinct slots: a rising column first, then the next column', () => {
        const hud = new HUDSystem();
        for (let i = 0; i < 8; i++) add(hud, 'T1');
        const slots = new Set(hud.damageNumbers.map((t) => `${t.x}|${t.y}`));
        expect(slots.size).toBe(8);
        const S = HUD_TEXT_MOTION.STAGGER;
        const ys = hud.damageNumbers.map((t) => t.y);
        expect(Math.min(...ys)).toBe(200 - (S.ROWS - 1) * S.STEP_Y);
        // 先往上疊滿第一欄（不偏移），第 ROWS+1 個換到右欄
        expect(hud.damageNumbers[0].x).toBe(100);
        expect(hud.damageNumbers[S.ROWS - 1].x).toBe(100);
        expect(hud.damageNumbers[S.ROWS].x).toBe(100 + S.STEP_X);
    });

    it('does not stagger other targets, shouts without an owner, or texts older than the window', () => {
        const hud = new HUDSystem();
        add(hud, 'T1');
        add(hud, 'T2');
        add(hud, undefined);
        expect(hud.damageNumbers.map((t) => `${t.x}|${t.y}`)).toEqual(['100|200', '100|200', '100|200']);
        // 超過窗口後同一個單位的新字回到基準位置
        hud.update(HUD_TEXT_MOTION.STAGGER.WINDOW + 0.05, {} as unknown as GameEngine);
        add(hud, 'T1');
        const last = hud.damageNumbers[hud.damageNumbers.length - 1];
        expect(last.x).toBe(100);
        expect(last.y).toBe(200);
    });

    it('heals stack with damage on the same target', () => {
        const hud = new HUDSystem();
        add(hud, 'T1', 'DAMAGE');
        add(hud, 'T1', 'HEAL');
        expect(hud.damageNumbers[1].y).toBe(200 - HUD_TEXT_MOTION.STAGGER.STEP_Y);
    });
});
