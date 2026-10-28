import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const signatures = new Set([
    0x6d2b79f5, 0x9e3779b9, 0x9e3779b1, 0x85ebca6b, 0x5bd1e995,
    2166136261, 16777619, 374761393, 15485863, 9301, 49297,
]);

describe('deterministic hash ownership', () => {
    it('keeps hash algorithms in engine/math', () => {
        const files = execFileSync('git', ['-c', 'safe.directory=' + process.cwd().replace(/\\/g, '/'),
            'ls-files', '-z', '--', 'engine/', 'components/', 'hooks/', 'data/'], { encoding: 'utf8' }).split('\0').filter(Boolean);
        const offenders: string[] = [];
        for (const file of files) {
            if (file.startsWith('engine/math/')) continue;
            readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
                for (const match of line.matchAll(/\b(?:0x[\da-f]+|\d+)\b/gi)) {
                    if (signatures.has(Number(match[0]))) offenders.push(`${file}:${i + 1}: ${match[0]}`);
                }
            });
        }
        expect(offenders, '改用 engine/math/hash.ts 或 rng.ts').toEqual([]);
    });
});
