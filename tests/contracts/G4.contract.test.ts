import { describe, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AI_MODE_GRAPH, type AIModeGraph, type BTDef } from '../../data/ai_profiles';
import { validateModeGraph } from '../../engine/ai/ModeGraphValidation';
import { contractTest, pendingIf } from './contractTest';

/**
 * 契約 G4：模式圖在建樹前驗證，鍵打錯是錯誤而不是靜默失效（docs/plans/optimization-2026-11.md）。
 */
describe('契約 G4 模式圖驗證', () => {
    const clone = (): AIModeGraph => JSON.parse(JSON.stringify(AI_MODE_GRAPH)) as AIModeGraph;
    const firstLeaf = (def: BTDef, type: BTDef['type']): BTDef | null => {
        if (def.type === type) return def;
        for (const c of def.children ?? []) { const hit = firstLeaf(c, type); if (hit) return hit; }
        return null;
    };
    /** 壞一個地方的圖，問題清單要點名壞掉的東西 */
    const broken = (mutate: (g: AIModeGraph) => void, mustMention: string) => {
        const g = clone();
        mutate(g);
        const problems = validateModeGraph(g);
        expect(problems.length).toBeGreaterThan(0);
        expect(problems.join('\n')).toContain(mustMention);
    };

    contractTest('G4', '出廠的 AI_MODE_GRAPH 合格', () => {
        expect(validateModeGraph(AI_MODE_GRAPH)).toEqual([]);
        expect(validateModeGraph(clone())).toEqual([]);
    });

    contractTest('G4', '邊指向不存在的模式、用了不存在的條件鍵、when／unless 都沒有或都有', () => {
        broken((g) => { (g.edges[0] as { to: string }).to = 'NO_SUCH_MODE'; }, 'NO_SUCH_MODE');
        broken((g) => { const e = g.edges.find((x) => x.when)!; (e as { when?: string }).when = 'NoSuchCondition'; }, 'NoSuchCondition');
        broken((g) => { const e = g.edges[0] as { when?: string; unless?: string }; delete e.when; delete e.unless; }, g0().edges[0].to);
        broken((g) => { const e = g.edges[0] as { when?: string; unless?: string }; e.when = 'HasTarget'; e.unless = 'HasTarget'; }, g0().edges[0].to);
    });

    contractTest('G4', 'initial 或 onFailure 指向不存在的模式', () => {
        broken((g) => { (g as { initial: string }).initial = 'NO_SUCH_MODE'; }, 'NO_SUCH_MODE');
        broken((g) => { (Object.values(g.modes)[0] as { onFailure?: string }).onFailure = 'NO_SUCH_MODE'; }, 'NO_SUCH_MODE');
    });

    contractTest('G4', '小樹裡的條件鍵、動作鍵不存在，或組合節點沒有子節點', () => {
        const withLeaf = (type: 'CONDITION' | 'ACTION') => (g: AIModeGraph) => {
            for (const m of Object.values(g.modes)) {
                const leaf = firstLeaf(m.tree, type);
                if (leaf) { leaf.key = 'NoSuchKey'; return; }
            }
            throw new Error(`圖裡找不到 ${type} 節點`);
        };
        broken(withLeaf('CONDITION'), 'NoSuchKey');
        broken(withLeaf('ACTION'), 'NoSuchKey');
        broken((g) => { Object.values(g.modes)[0].tree = { type: 'SELECTOR', name: 'EmptyNode' }; }, 'EmptyNode');
    });

    contractTest('G4', 'AISystem 建樹前驗證，不再用 console.warn 加假節點帶過', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../../engine/systems/ai.ts'), 'utf8');
        pendingIf('G4', src.includes('console.warn') || !src.includes('validateModeGraph'), 'engine/systems/ai.ts 還在用 console.warn 帶過或沒有呼叫 validateModeGraph');
        expect(src).not.toContain('console.warn');
    });

    contractTest('G4', '節點鍵有型別：BTConditions／BTActions 不再宣告成 Record<string, …>', () => {
        const src = fs.readFileSync(path.resolve(__dirname, '../../engine/ai/BTRegistry.ts'), 'utf8');
        const loose = /export const BT(Conditions|Actions): Record<string,/.test(src);
        pendingIf('G4', loose, 'BTRegistry 的兩張表還是 Record<string, …>');
        expect(loose).toBe(false);
    });

    function g0(): AIModeGraph { return clone(); }
});
