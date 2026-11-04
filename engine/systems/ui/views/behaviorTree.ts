// ╔══════════════════════════════════════════════════════════╗
// ║  views/behaviorTree — 行為樹的唯讀快照                    ║
// ║  職責：把執行中的 BTNode 轉成純資料，UI 不碰 agent.bt     ║
// ║  [ARCH] 內容沒變就回傳同一個物件，useSyncExternalStore    ║
// ║  才不會無限重繪；只有視窗開著時才會被呼叫                 ║
// ╚══════════════════════════════════════════════════════════╝
import type { GameEngine } from '../../../game';
import type { BTNode } from '../../../behaviorTree';
import { ModeMachine } from '../../../ai/ModeMachine';
import { BT_VIEW_PARAM } from '../../../../constants';
import { NodeState } from '../../../../types';
import type { AIMode } from '../../../../types';

export type BTViewState = 'running' | 'success' | 'failure' | 'idle';
export type BTViewKind = 'selector' | 'sequence' | 'condition' | 'action' | 'mode' | 'other';

export interface BTViewNode {
    id: string;
    name: string;
    kind: BTViewKind;
    state: BTViewState;
    /** 剛結束的結果還留著多久：0 現在、1 稍早、2 很久以前（畫面上越來越淡） */
    age: 0 | 1 | 2;
    /** 自己或子孫正在執行：預設展開、捲動跟隨 */
    active: boolean;
    children: BTViewNode[];
}

export interface BehaviorTreeView {
    agentId: string;
    /** 單位還沒建 AI：UI 要送 REBUILD_AGENT_AI */
    missing: boolean;
    mode: AIMode | null;
    trace: readonly { to: AIMode | null; why: string }[];
    root: BTViewNode | null;
}

const KIND_BY_TYPE: Readonly<Record<string, BTViewKind>> = {
    '?': 'selector',
    '->': 'sequence',
    COND: 'condition',
    ACT: 'action',
    FSM: 'mode',
};

const STATE_BY_NODE: Readonly<Record<NodeState, BTViewState>> = {
    [NodeState.RUNNING]: 'running',
    [NodeState.SUCCESS]: 'success',
    [NodeState.FAILURE]: 'failure',
    [NodeState.PENDING]: 'idle',
};

const toViewNode = (node: BTNode, now: number, signature: string[]): BTViewNode => {
    const elapsed = now - node.lastRunTime;
    const current = node.status !== NodeState.PENDING ? node.status : null;
    const recent = !current && node.lastResult && elapsed < BT_VIEW_PARAM.FADE_OUT_MS ? node.lastResult : null;
    const state = STATE_BY_NODE[current ?? recent ?? NodeState.PENDING];
    const age: BTViewNode['age'] = !recent ? 0 : elapsed > BT_VIEW_PARAM.FADE_OLD_MS ? 2 : elapsed > BT_VIEW_PARAM.FADE_MID_MS ? 1 : 0;
    signature.push(node.id, state, String(age));
    const children = node.c.map((child) => toViewNode(child, now, signature));
    return {
        id: node.id,
        name: node.n,
        kind: KIND_BY_TYPE[node.type] ?? 'other',
        state,
        age,
        active: state === 'running' || children.some((c) => c.active),
        children,
    };
};

interface CacheEntry {
    signature: string;
    view: BehaviorTreeView;
}
const caches = new WeakMap<GameEngine, Map<string, CacheEntry>>();

/**
 * 回傳選取單位的行為樹快照；單位不存在回傳 null。
 * 有模式機時只投影目前模式的小樹，還沒進入任何模式（開戰前）才投影整台機器。
 */
export function selectBehaviorTreeView(engine: GameEngine, agentId: string | null | undefined): BehaviorTreeView | null {
    if (!agentId) return null;
    const agent = engine.agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const bt = agent.bt;
    const tree = bt instanceof ModeMachine ? bt.treeOf(agent.aiMode) ?? bt : bt ?? null;
    const signature: string[] = [agentId, String(agent.aiMode)];
    const root = tree ? toViewNode(tree, Date.now(), signature) : null;
    const trace = agent.aiModeTrace.slice(-BT_VIEW_PARAM.MODE_TRACE_SHOWN).map((e) => ({ to: e.to, why: e.why }));
    for (const e of trace) signature.push(String(e.to), e.why);
    const key = signature.join('|');

    let cache = caches.get(engine);
    if (!cache) {
        cache = new Map();
        caches.set(engine, cache);
    }
    const prev = cache.get(agentId);
    if (prev && prev.signature === key) return prev.view;

    const view: BehaviorTreeView = { agentId, missing: !bt, mode: agent.aiMode, trace, root };
    cache.set(agentId, { signature: key, view });
    return view;
}
