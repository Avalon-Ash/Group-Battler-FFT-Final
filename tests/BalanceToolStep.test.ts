import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 平衡工具和遊戲跑同一個步長（docs/plans/optimization-2026-11.md S1）：
 * tools/balance/*.mjs 從 GAME_LOOP_PARAM.SIM_HZ 取預設步長，不得寫死 1/30 秒。
 */
describe('平衡工具步長', () => {
    it('tools/balance 不寫死 1/30 秒步長', () => {
        const dir = path.resolve(__dirname, '../tools/balance');
        const offenders = fs.readdirSync(dir)
            .filter((f) => f.endsWith('.mjs'))
            .filter((f) => /1\s*\/\s*30\b|0\.0333/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
        expect(offenders).toEqual([]);
    });
});
