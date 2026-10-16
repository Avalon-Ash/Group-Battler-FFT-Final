// Agent 欄位所有權守門測試（docs/STATE_OWNERSHIP_DESIGN.md §3.3）。
// 掃描寫入點 → 不在 owners ∪ lifecycle 內即為違規；違規只能減少（新增違規失敗、基準內已消失的項目也失敗，
// 強迫同步刪除基準）。只抓 `.field` 形式的寫入；別名寫入（const s = agent.x; s.y = …）抓不到，審查時另看。
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AGENT_FIELD_OWNERS } from '../engine/core/AgentOwnership';
import type { AgentFieldOwnership } from '../engine/core/AgentOwnership';

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['engine', 'components', 'hooks', 'data'];
const EXCLUDED = new Set(['engine/core/Agent.ts', 'engine/core/AgentOwnership.ts']);

function listSources(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) out.push(...listSources(rel));
        else if (/\.tsx?$/.test(entry.name) && !EXCLUDED.has(rel)) out.push(rel);
    }
    return out;
}

/** `.field = / += / ++ / --`、`.field.x = `、`.field[i] = `、`.field.push(...)` 等。 */
function writePattern(field: string): RegExp {
    const assign = String.raw`\s*(?:[-+*/%|&]|\*\*|\?\?|\|\||&&)?=(?!=)`;
    return new RegExp(
        String.raw`\.${field}\b(?:${assign}|\s*(?:\+\+|--)|\.\w+${assign}|\[[^\]]*\]${assign}|\.(?:push|pop|shift|unshift|splice|fill|sort|reverse)\()`,
        'g',
    );
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function scanOwnershipViolations(): string[] {
    const files = SCAN_DIRS.flatMap(listSources);
    const contents = new Map(files.map(f => [f, stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'))]));
    const violations = new Set<string>();
    for (const [field, own] of Object.entries(AGENT_FIELD_OWNERS) as [string, AgentFieldOwnership][]) {
        const allowed = new Set([...own.owners, ...(own.lifecycle ?? [])]);
        const re = writePattern(field);
        for (const [file, src] of contents) {
            if (allowed.has(file)) continue;
            re.lastIndex = 0;
            if (re.test(src)) violations.add(`${field}@${file}`);
        }
    }
    return [...violations].sort();
}

describe('Agent field ownership ratchet', () => {
    const baselinePath = path.join(ROOT, 'tests', 'agent-ownership.baseline.json');
    const baseline: string[] = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const current = scanOwnershipViolations();

    it('every listed owner file exists', () => {
        for (const own of Object.values(AGENT_FIELD_OWNERS) as AgentFieldOwnership[]) {
            for (const f of [...own.owners, ...(own.lifecycle ?? [])]) {
                expect(fs.existsSync(path.join(ROOT, f)), f).toBe(true);
            }
        }
    });

    it('no new non-owner writes (fix the write or route it through the owner)', () => {
        const added = current.filter(v => !baseline.includes(v));
        expect(added, 'non-owner writes not in baseline').toEqual([]);
    });

    it('baseline only shrinks (remove fixed entries from agent-ownership.baseline.json)', () => {
        const stale = baseline.filter(v => !current.includes(v));
        expect(stale, 'baseline entries that no longer occur').toEqual([]);
    });

    it('detects a write pattern sanity check', () => {
        const re = writePattern('hitFlashTimer');
        expect(re.test('a.hitFlashTimer = 0.2;')).toBe(true);
        re.lastIndex = 0;
        expect(re.test('if (a.hitFlashTimer > 0.05)')).toBe(false);
        re.lastIndex = 0;
        expect(re.test('a.hitFlashTimer === 0')).toBe(false);
        const off = writePattern('visualOffset');
        expect(off.test('t.visualOffset.x = 1')).toBe(true);
    });
});
