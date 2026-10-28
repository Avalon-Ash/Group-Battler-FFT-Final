import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
// 與 tools/ui-e2e/out/magic-scan.mjs 相同的常見值排除集合。
const TRIVIAL = new Set([0, 1, 2, -1, 0.5, 10, 100, 1000, 3, 4, 255, 360, 180, 90, 60, 16, 1e-6, 1e-3, 0.001]);

function isNamedConstant(node: ts.Node): boolean {
    let parent: ts.Node | undefined = node.parent;
    while (parent && (
        ts.isPrefixUnaryExpression(parent) || ts.isArrayLiteralExpression(parent) ||
        ts.isObjectLiteralExpression(parent) || ts.isPropertyAssignment(parent) ||
        ts.isAsExpression(parent) || ts.isParenthesizedExpression(parent) ||
        ts.isSatisfiesExpression(parent)
    )) {
        parent = parent.parent;
    }
    return !!parent && (
        (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) && /^[A-Z][A-Z0-9_]+$/.test(parent.name.text)) ||
        ts.isEnumMember(parent)
    );
}

function countMagicNumbers(file: string): number {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    let count = 0;
    function visit(node: ts.Node): void {
        if (ts.isNumericLiteral(node)) {
            const parent = node.parent;
            const negative = ts.isPrefixUnaryExpression(parent) && parent.operator === ts.SyntaxKind.MinusToken;
            const value = (negative ? -1 : 1) * Number(node.text);
            const inType = ts.isLiteralTypeNode(parent);
            const isIndex = ts.isElementAccessExpression(parent) && parent.argumentExpression === node;
            if (!TRIVIAL.has(value) && !inType && !isIndex && !isNamedConstant(node)) count++;
        }
        ts.forEachChild(node, visit);
    }
    visit(tree);
    return count;
}

describe('Magic number budget', () => {
    it('allows decreases but rejects per-file increases and unbudgeted numbers', () => {
        const budget: Record<string, number> = JSON.parse(readFileSync(path.join(__dirname, 'magic-number-budget.json'), 'utf8'));
        const files = execFileSync('git', ['-c', `safe.directory=${ROOT.replace(/\\/g, '/')}`, 'ls-files', '--', 'engine/', 'components/', 'hooks/'], { cwd: ROOT, encoding: 'utf8' })
            .split(/\r?\n/).filter(file => /\.(ts|tsx)$/.test(file)).sort();
        const violations: string[] = [];
        for (const file of files) {
            const current = countMagicNumbers(file);
            const baseline = budget[file] ?? 0;
            if (current > baseline) violations.push(`${file}: current=${current}, baseline=${baseline}`);
        }
        expect(violations, `Magic number budget exceeded:\n${violations.join('\n')}`).toEqual([]);
    });
});
