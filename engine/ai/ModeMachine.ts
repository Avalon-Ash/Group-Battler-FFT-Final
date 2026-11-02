// ╔══════════════════════════════════════════════════════════╗
// ║  ModeMachine — AI 狀態拓樸（狀態機＋每個狀態一棵小樹）    ║
// ║  職責：依 AI_MODE_GRAPH 的邊決定單位目前的模式，再執行    ║
// ║        該模式的小樹。小樹失敗時走 onFailure 邊。          ║
// ║  上游：data/ai_profiles.ts（圖是資料）、systems/ai.ts     ║
// ║  [ARCH] aiMode／aiModeTrace 只由本檔寫入；小樹不能改模式。║
// ║  外部仍只看到 a.bt.tick(a)，game.ts 與檢視器都不必知道。  ║
// ╚══════════════════════════════════════════════════════════╝

import { BTNode } from "../behaviorTree";
import { NodeState, AIMode } from "../../types";
import type { Agent } from "../core/Agent";
import { AI_MODE_RULES } from "../../constants";

export interface ModeEdge {
    from: readonly AIMode[] | '*';
    to: AIMode;
    /** 邊的名稱：條件鍵，unless 邊前面加 '!'；寫進轉換紀錄 */
    why: string;
    test: (a: Agent) => boolean;
}

export class ModeMachine extends BTNode {
    private readonly trees: Map<AIMode, BTNode>;

    constructor(
        private readonly initial: AIMode,
        modes: readonly { mode: AIMode; tree: BTNode; onFailure?: AIMode }[],
        private readonly edges: readonly ModeEdge[],
        private readonly clock: () => number,
    ) {
        super('AI Mode', 'FSM');
        this.trees = new Map(modes.map(m => [m.mode, m.tree]));
        this.onFailure = new Map(modes.flatMap(m => (m.onFailure ? [[m.mode, m.onFailure] as const] : [])));
        for (const m of modes) this.add(m.tree);
    }

    private readonly onFailure: Map<AIMode, AIMode>;

    private enter(a: Agent, to: AIMode, why: string): void {
        const trace = a.aiModeTrace;
        trace.push({ t: this.clock(), from: a.aiMode, to, why });
        if (trace.length > AI_MODE_RULES.TRACE_LENGTH) trace.shift();
        a.aiMode = to;
        a.aiModeSince = this.clock();
    }

    /** 依序檢查邊，第一條成立的就走；轉換後再檢查一次，直到穩定（有上限，避免邊寫錯時卡死這一幀）。 */
    private settle(a: Agent): void {
        for (let hop = 0; hop < AI_MODE_RULES.MAX_HOPS_PER_TICK; hop++) {
            const edge = this.edges.find(e =>
                e.to !== a.aiMode && (e.from === '*' || e.from.includes(a.aiMode as AIMode)) && e.test(a));
            if (!edge) return;
            this.enter(a, edge.to, edge.why);
        }
    }

    tick(a: Agent): NodeState {
        if (a.aiMode === null) this.enter(a, this.initial, 'start');
        this.settle(a);
        for (let hop = 0; hop < AI_MODE_RULES.MAX_HOPS_PER_TICK; hop++) {
            const result = (this.trees.get(a.aiMode as AIMode) as BTNode).tick(a);
            if (result !== NodeState.FAILURE) return this.record(result);
            const next = this.onFailure.get(a.aiMode as AIMode);
            if (!next) return this.record(result);
            this.enter(a, next, 'treeFailed');
        }
        return this.record(NodeState.FAILURE);
    }
}
