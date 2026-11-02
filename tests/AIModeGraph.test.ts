import { describe, it, expect } from 'vitest';
import { AI_MODE_GRAPH, type BTDef } from '../data/ai_profiles';
import { BTActions, BTConditions } from '../engine/ai/BTRegistry';
import type { AIMode } from '../types';

/** 拓樸的靜態檢查：圖是資料，寫錯要在這裡被抓到，不要等到實機發呆。 */
describe('AI_MODE_GRAPH 拓樸', () => {
    const modes = Object.keys(AI_MODE_GRAPH.modes) as AIMode[];
    const nexts = (m: AIMode): AIMode[] => [
        ...AI_MODE_GRAPH.edges.filter(e => e.from === '*' || e.from.includes(m)).map(e => e.to),
        ...(AI_MODE_GRAPH.modes[m].onFailure ? [AI_MODE_GRAPH.modes[m].onFailure as AIMode] : []),
    ];
    const reach = (start: AIMode): Set<AIMode> => {
        const seen = new Set<AIMode>([start]);
        const queue: AIMode[] = [start];
        while (queue.length) {
            for (const n of nexts(queue.pop() as AIMode)) {
                if (!seen.has(n)) { seen.add(n); queue.push(n); }
            }
        }
        return seen;
    };

    it('每個模式都從起點到得了', () => {
        expect([...reach(AI_MODE_GRAPH.initial)].sort()).toEqual([...modes].sort());
    });

    it('每個模式都有出邊，而且都回得到起點（沒有走不出去的死胡同）', () => {
        for (const m of modes) {
            expect(nexts(m).filter(n => n !== m).length, m).toBeGreaterThan(0);
            expect(reach(m).has(AI_MODE_GRAPH.initial), m).toBe(true);
        }
    });

    it('邊與小樹引用的條件、動作都存在', () => {
        for (const e of AI_MODE_GRAPH.edges) {
            const key = e.when ?? e.unless;
            expect(key, e.to).toBeDefined();
            expect(BTConditions[key as string], key).toBeDefined();
            for (const f of e.from === '*' ? [] : e.from) expect(modes).toContain(f);
            expect(modes).toContain(e.to);
        }
        const walk = (d: BTDef) => {
            if (d.type === 'CONDITION') expect(BTConditions[d.key as string], d.name).toBeDefined();
            if (d.type === 'ACTION') expect(BTActions[d.key as string], d.name).toBeDefined();
            (d.children ?? []).forEach(walk);
        };
        for (const m of modes) walk(AI_MODE_GRAPH.modes[m].tree);
    });
});
