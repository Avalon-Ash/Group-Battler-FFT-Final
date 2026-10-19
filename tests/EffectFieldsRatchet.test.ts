import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['engine', 'components', 'data', 'hooks'];

export const LEGACY_EFFECT_FIELDS = [
    'stunTimer',
    'stunMax',
    'silenceTimer',
    'silenceMax',
    'banishTimer',
    'banishMax',
    'stasisTimer',
    'stasisMax',
    'rootTimer',
    'fearTimer',
    'tauntTimer',
    'tauntTargetId',
    'blindTimer',
    'polymorphTimer',
    'invincibleTimer',
    'vulnerableTimer',
    'dotTimer',
    'dotDmg',
    'dotType',
    'hotTimer',
    'hotVal',
] as const;

export type LegacyEffectField = typeof LEGACY_EFFECT_FIELDS[number];

/**
 * 舊狀態欄位出現次數基準（SE0 當下實測）。
 * 棘輪規則：只准減少，絕不准回漲。
 * 每次遷移任務完成後，下調對應欄位的基準值以鎖定成果。
 */
export const EFFECT_FIELDS_BASELINE: Record<LegacyEffectField, number> = {
    stunTimer: 24,
    stunMax: 3,
    silenceTimer: 16,
    silenceMax: 3,
    banishTimer: 12,
    banishMax: 4,
    stasisTimer: 10,
    stasisMax: 3,
    rootTimer: 10,
    fearTimer: 15,
    tauntTimer: 10,
    tauntTargetId: 9,
    blindTimer: 8,
    polymorphTimer: 9,
    invincibleTimer: 9,
    vulnerableTimer: 7,
    dotTimer: 7,
    dotDmg: 6,
    dotType: 8,
    hotTimer: 6,
    hotVal: 4,
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

    it('pattern sanity check', () => {
        const testCode = 'if (agent.stunTimer > 0) { target.stunMax = 1.0; } // stunTimer';
        const stripped = stripComments(testCode);
        const reStun = new RegExp('\\.stunTimer\\b', 'g');
        const reMax = new RegExp('\\.stunMax\\b', 'g');
        expect(stripped.match(reStun)?.length).toBe(1);
        expect(stripped.match(reMax)?.length).toBe(1);
    });
});
