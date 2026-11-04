import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../engine/game';
import { Agent } from '../engine/core/Agent';
import { Selector, BTNode } from '../engine/behaviorTree';
import { selectBehaviorTreeView } from '../engine/systems/ui/views/behaviorTree';
import { NodeState, Team } from '../types';
import { SelectionStore } from '../hooks/useSelection';

class Leaf extends BTNode {
    constructor(n: string, private readonly result: NodeState) {
        super(n, 'ACT');
    }
    tick(): NodeState {
        return this.record(this.result);
    }
}

describe('selectBehaviorTreeView', () => {
    let engine: GameEngine;
    let agent: Agent;

    beforeEach(() => {
        engine = new GameEngine();
        agent = new Agent('agent_bt_1', Team.BLUE, 0, 0, engine.mapConfig);
        engine.agents = [agent];
    });

    it('returns null for no selection or a missing unit', () => {
        expect(selectBehaviorTreeView(engine, null)).toBeNull();
        expect(selectBehaviorTreeView(engine, 'nobody')).toBeNull();
    });

    it('flags a unit without a tree so the UI can request a build', () => {
        agent.bt = null;
        const view = selectBehaviorTreeView(engine, agent.id);
        expect(view?.missing).toBe(true);
        expect(view?.root).toBeNull();
    });

    it('projects plain data and marks the running path active', () => {
        const root = new Selector('Root');
        const failed = new Leaf('Failed', NodeState.FAILURE);
        const running = new Leaf('Running', NodeState.RUNNING);
        root.add(failed).add(running);
        root.tick(agent);
        agent.bt = root;

        const view = selectBehaviorTreeView(engine, agent.id)!;
        expect(view.root?.kind).toBe('selector');
        expect(view.root?.active).toBe(true);
        expect(view.root?.children[0]).toMatchObject({ name: 'Failed', state: 'failure', active: false });
        expect(view.root?.children[1]).toMatchObject({ name: 'Running', state: 'running', active: true });
        // 純資料：UI 拿不到會動的節點
        expect(view.root).not.toBeInstanceOf(BTNode);
        expect(JSON.parse(JSON.stringify(view.root))).toEqual(view.root);
    });

    it('returns the same object while nothing changed and a new one when it does', () => {
        const root = new Selector('Root');
        const leaf = new Leaf('Leaf', NodeState.RUNNING);
        root.add(leaf);
        root.tick(agent);
        agent.bt = root;

        const a = selectBehaviorTreeView(engine, agent.id);
        const b = selectBehaviorTreeView(engine, agent.id);
        expect(b).toBe(a);

        leaf.status = NodeState.SUCCESS;
        const c = selectBehaviorTreeView(engine, agent.id);
        expect(c).not.toBe(a);
        expect(c?.root?.children[0].state).toBe('success');
    });
});

describe('SelectionStore', () => {
    it('keeps unique ids, notifies only on change, and exposes a stable reference', () => {
        const store = new SelectionStore();
        let calls = 0;
        const off = store.subscribe(() => calls++);
        store.set(['a', 'a', 'b']);
        expect(store.getIds()).toEqual(['a', 'b']);
        expect(calls).toBe(1);
        const ref = store.getIds();
        store.set(['a', 'b']);
        expect(store.getIds()).toBe(ref);
        expect(calls).toBe(1);
        store.clear();
        expect(store.getIds()).toEqual([]);
        expect(calls).toBe(2);
        off();
    });
});
