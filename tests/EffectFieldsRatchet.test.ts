import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['engine', 'components', 'data', 'hooks'];

import { LEGACY_EFFECT_FIELDS } from './legacyEffectFields';
export { LEGACY_EFFECT_FIELDS };

export type LegacyEffectField = typeof LEGACY_EFFECT_FIELDS[number];

/**
 * 舊狀態欄位出現次數基準（SE0 當下實測）。
 * 棘輪規則：只准減少，絕不准回漲。
 * 每次遷移任務完成後，下調對應欄位的基準值以鎖定成果。
 */
export const EFFECT_FIELDS_BASELINE: Record<LegacyEffectField, number> = {
    stunTimer: 0,
    stunMax: 0,
    silenceTimer: 0,
    silenceMax: 0,
    banishTimer: 0,
    banishMax: 0,
    stasisTimer: 0,
    stasisMax: 0,
    rootTimer: 0,
    fearTimer: 0,
    tauntTimer: 0,
    tauntTargetId: 0,
    blindTimer: 0,
    polymorphTimer: 0,
    invincibleTimer: 0,
    vulnerableTimer: 0,
    dotTimer: 0,
    dotDmg: 0,
    dotType: 0,
    hotTimer: 0,
    hotVal: 0,
};

function listSources(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...listSources(rel));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
            out.push(rel);
        }
    }
    return out;
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function scanEffectFieldCounts(): Record<LegacyEffectField, number> {
    const files = SCAN_DIRS.flatMap(listSources);
    const contents = files.map(f => stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    const counts = {} as Record<LegacyEffectField, number>;

    for (const field of LEGACY_EFFECT_FIELDS) {
        const re = new RegExp(`\\.${field}\\b`, 'g');
        let count = 0;
        for (const code of contents) {
            const matches = code.match(re);
            if (matches) count += matches.length;
        }
        counts[field] = count;
    }

    return counts;
}

describe('Legacy effect fields ratchet (SE0)', () => {
    const currentCounts = scanEffectFieldCounts();

    it('no legacy effect field count exceeds baseline (no regressions)', () => {
        const regressions: string[] = [];
        for (const field of LEGACY_EFFECT_FIELDS) {
            const current = currentCounts[field];
            const baseline = EFFECT_FIELDS_BASELINE[field];
            if (current > baseline) {
                regressions.push(`${field}: current ${current} > baseline ${baseline}`);
            }
        }
        expect(regressions, 'Legacy effect fields with increased count').toEqual([]);
    });

    it('baseline matches current counts (ratchet down baseline when fields are migrated)', () => {
        const stale: string[] = [];
        for (const field of LEGACY_EFFECT_FIELDS) {
            const current = currentCounts[field];
            const baseline = EFFECT_FIELDS_BASELINE[field];
            if (current < baseline) {
                stale.push(`${field}: current ${current} < baseline ${baseline} (ratchet down baseline!)`);
            }
        }
        expect(stale, 'Baseline entries that should be ratcheted down').toEqual([]);
    });

    it('all legacy effect fields are 0 and must never reappear (SE4 complete elimination)', () => {
        for (const field of LEGACY_EFFECT_FIELDS) {
            expect(currentCounts[field], `legacy field .${field} must be 0`).toBe(0);
        }
    });

    it('pattern sanity check', () => {
        const testCode = 'if (agent.stunTimer > 0) { target.stunMax = 1.0; } // stunTimer';
        const stripped = stripComments(testCode);
        const reStun = new RegExp('\\.stunTimer\\b', 'g');
        const reMax = new RegExp('\\.stunMax\\b', 'g');
        expect(stripped.match(reStun)?.length).toBe(1);
        expect(stripped.match(reMax)?.length).toBe(1);
    });
});
