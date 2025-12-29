import { NodeState } from "../types";
export abstract class BTNode {
    id: string;
    n: string;
    type: string;
    c: BTNode[];
    status: NodeState | null;
    lastResult: NodeState | null = null;
    lastRunTime: number = 0;
    constructor(n: string, type: string) {
        this.n = n;
        this.type = type;
        this.c = [];
        this.status = null;
        this.id = Math.random().toString(36).substr(2, 6);
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
    abstract tick(ctx: any): NodeState;
}
export class Selector extends BTNode {
    constructor(n: string) { super(n, '?'); }
    tick(ctx: any): NodeState {
        for (let c of this.c) {
            const r = c.tick(ctx);
            if (r !== NodeState.FAILURE) {
                return this.record(r);
            }
        }
        return this.record(NodeState.FAILURE);
    }
}
export class Sequence extends BTNode {
    constructor(n: string) { super(n, '->'); }
    tick(ctx: any): NodeState {
        for (let c of this.c) {
            const r = c.tick(ctx);
            if (r !== NodeState.SUCCESS) {
                return this.record(r);
            }
        }
        return this.record(NodeState.SUCCESS);
    }
}
export class Condition extends BTNode {
    fn: (ctx: any) => boolean;
    constructor(n: string, fn: (ctx: any) => boolean) {
        super(n, 'COND');
        this.fn = fn;
    }
    tick(ctx: any): NodeState {
        const r = this.fn(ctx) ? NodeState.SUCCESS : NodeState.FAILURE;
        return this.record(r);
    }
}
export class Action extends BTNode {
    fn: (ctx: any) => NodeState;
    constructor(n: string, fn: (ctx: any) => NodeState) {
        super(n, 'ACT');
        this.fn = fn;
    }
    tick(ctx: any): NodeState {
        const r = this.fn(ctx);
        return this.record(r);
    }
}