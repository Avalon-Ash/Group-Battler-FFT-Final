// ╔══════════════════════════════════════════════════════════╗
// ║  LayerBoundary — 表現層／模擬層邊界守門測試             ║
// ║  職責：檢查模擬端不得 import 表現端                      ║
// ║  基準只減不增，PL3 歸零後永遠不得反彈                   ║
// ╚══════════════════════════════════════════════════════════╝

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

// 模擬端掃描範圍（§1 清單）
const SIM_PATHS = [
    'engine/systems',
    'engine/ai',
    'engine/physics',
    'engine/core',
    'engine/events',
    'engine/math',
    'engine/types',
    'engine/behaviorTree.ts',
    'engine/utils.ts',
];

// 不計入的目錄
const EXCLUDE_PREFIXES = [
    'engine/systems/audio',
];

// 表現端定義（§1 清單）
const PRES_PREFIXES = [
    'engine/presentation/',
    'engine/renderers/',
    'engine/graphics/',
];
const PRES_EXACT = [
    'engine/renderer.ts',
];

function isPresentation(target: string): boolean {
    if (PRES_EXACT.includes(target)) return true;
    return PRES_PREFIXES.some(p => target.startsWith(p));
}

function listTsFiles(relPath: string): string[] {
    const abs = path.join(ROOT, relPath);
    if (!fs.existsSync(abs)) return [];
    if (fs.statSync(abs).isFile()) {
        return relPath.endsWith('.ts') ? [relPath.replace(/\\/g, '/')] : [];
    }
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const childRel = `${relPath}/${entry.name}`.replace(/\\/g, '/');
        if (entry.isDirectory()) {
            if (!EXCLUDE_PREFIXES.some(e => childRel === e || childRel.startsWith(e + '/'))) {
                out.push(...listTsFiles(childRel));
            }
        } else if (entry.name.endsWith('.ts')) {
            out.push(childRel);
        }
    }
    return out;
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function resolveImport(fromFile: string, spec: string): string | null {
    if (!spec.startsWith('.')) return null;
    const dir = path.posix.dirname(fromFile);
    let resolved = path.posix.normalize(path.posix.join(dir, spec));
    if (fs.existsSync(path.join(ROOT, resolved + '.ts'))) return resolved + '.ts';
    if (fs.existsSync(path.join(ROOT, resolved + '/index.ts'))) return resolved + '/index.ts';
    if (fs.existsSync(path.join(ROOT, resolved)) && fs.statSync(path.join(ROOT, resolved)).isFile()) return resolved;
    return resolved;
}

function findImportSpecs(content: string): string[] {
    const clean = stripComments(content);
    const matches: string[] = [];
    const staticRe = /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = staticRe.exec(clean)) !== null) {
        matches.push(m[1]);
    }
    const dynRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = dynRe.exec(clean)) !== null) {
        matches.push(m[1]);
    }
    return matches;
}

export function scanSimToPresImports(): string[] {
    const simFiles = SIM_PATHS.flatMap(listTsFiles);
    const violations: string[] = [];
    for (const file of simFiles) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const specs = findImportSpecs(content);
        for (const spec of specs) {
            const target = resolveImport(file, spec);
            if (!target) continue;
            if (isPresentation(target)) {
                violations.push(`${file}:${target}`);
            }
        }
    }
    return violations.sort();
}

export function scanPresToSystemsImports(): string[] {
    const presPaths = ['engine/presentation', 'engine/renderers', 'engine/graphics', 'engine/renderer.ts'];
    const presFiles = presPaths.flatMap(listTsFiles);
    const imports: string[] = [];
    for (const file of presFiles) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        const specs = findImportSpecs(content);
        for (const spec of specs) {
            const target = resolveImport(file, spec);
            if (!target) continue;
            if (target.startsWith('engine/systems/')) {
                imports.push(`${file}:${target}`);
            }
        }
    }
    return imports.sort();
}

export const SIM_TO_PRES_BASELINE: readonly string[] = [];

describe('Layer boundary ratchet (Simulation -> Presentation)', () => {
    const current = scanSimToPresImports();

    it('reaches 0 simulation -> presentation imports', () => {
        expect(current).toEqual([]);
        expect(current.length).toBe(0);
    });

    it('no new simulation -> presentation imports (0 and never re-appears)', () => {
        const added = current.filter(x => !SIM_TO_PRES_BASELINE.includes(x));
        expect(added, 'New simulation -> presentation imports detected').toEqual([]);
    });

    it('records presentation -> engine/systems/** imports count', () => {
        const presToSys = scanPresToSystemsImports();
        expect(presToSys.length).toBeGreaterThanOrEqual(0);
    });
});
