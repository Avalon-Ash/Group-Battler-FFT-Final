import { BT_NODE_RULES } from '../constants';
import { NodeState } from "../types";
import type { Agent } from "./core/Agent";
export abstract class BTNode {
    id: string;
    n: string;
    type: string;
    c: BTNode[];
    status: NodeState;
    lastResult: NodeState | null = null;
    lastRunTime: number = 0;
    constructor(n: string, type: string) {
        this.n = n;
        this.type = type;
        this.c = [];
        this.status = NodeState.PENDING;
        this.id = Math.random().toString(BT_NODE_RULES.ID_RADIX).substr(2, BT_NODE_RULES.ID_LENGTH);
    }
    add(child: BTNode): this {
        this.c.push(child);
        return this;
    }
    protected record(result: NodeState): NodeState {
        this.status = result;
        this.lastResult = result;
        this.lastRunTime = Date.now();
        return result;
    }
    abstract tick(ctx: Agent): NodeState;
    reset() {
        this.status = NodeState.PENDING;
        if (this.c) {
            for (const child of this.c) {
                child.reset();
            }
        }
    }
}
export class Selector extends BTNode {

    constructor(n: string) {
        super(n, '?');
    }

    tick(ctx: Agent): NodeState {
        for (let i = 0; i < this.c.length; i++) {
            const r = this.c[i].tick(ctx);

            if (r === NodeState.RUNNING) {
                return this.record(r);
            }
            if (r === NodeState.SUCCESS) {
                return this.record(r);
            }
        }

        return this.record(NodeState.FAILURE);
    }
    reset() {
        super.reset();
    }
}
export class Sequence extends BTNode {
    constructor(n: string) { super(n, '->'); }
    tick(ctx: Agent): NodeState {
        for (let i = 0; i < this.c.length; i++) {
            const r = this.c[i].tick(ctx);
            if (r === NodeState.RUNNING) {
                return this.record(r);
            }
            if (r === NodeState.FAILURE) {
                return this.record(r);
            }
        }
        return this.record(NodeState.SUCCESS);
    }
    reset() {
        super.reset();
    }
}
export class Condition extends BTNode {
    fn: (ctx: Agent) => boolean;
    constructor(n: string, fn: (ctx: Agent) => boolean) {
        super(n, 'COND');
        this.fn = fn;
    }
    tick(ctx: Agent): NodeState {
        const r = this.fn(ctx) ? NodeState.SUCCESS : NodeState.FAILURE;
        return this.record(r);
    }
}
export class Action extends BTNode {
    fn: (ctx: Agent) => NodeState;
    constructor(n: string, fn: (ctx: Agent) => NodeState) {
        super(n, 'ACT');
        this.fn = fn;
    }
    tick(ctx: Agent): NodeState {
        const r = this.fn(ctx);
        return this.record(r);
    }
}