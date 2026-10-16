import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VFX_REGISTRY } from '../data/vfx/VFXRegistry';

// 所有以字串常值呼叫 playEffect 的特效鍵都必須存在於登記表；
// 否則 VFXPlayer.play 會靜默略過（曾發生：詠唱中斷播放未登記的 FX_CAST_SHATTER）。
function collectSources(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectSources(full, out);
        else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
    return out;
}

describe('VFX registry keys', () => {
    it('every literal playEffect key is registered', () => {
        const root = path.resolve(__dirname, '..');
        const missing: string[] = [];
        for (const dir of ['engine', 'data', 'components', 'hooks']) {
            for (const file of collectSources(path.join(root, dir))) {
                const src = fs.readFileSync(file, 'utf-8');
                for (const m of src.matchAll(/playEffect\(\s*['"]([A-Z0-9_]+)['"]/g)) {
                    if (!VFX_REGISTRY[m[1]]) missing.push(`${path.relative(root, file)}: ${m[1]}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
