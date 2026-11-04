import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * UI 定義的閘門（docs/DECISIONS.md）：設計值走 token、內部不模糊、互動元件走共用元件、
 * components 不碰引擎內部。違規清單看 `npm run audit:ui -- all`。
 */
describe('UI audit', () => {
    it('has zero violations across all components', () => {
        const script = path.resolve(__dirname, '../tools/ui-e2e/ui-audit-static.mjs');
        const run = spawnSync(process.execPath, [script, 'all'], { encoding: 'utf8' });
        expect(run.status, run.stdout).toBe(0);
    });
});
