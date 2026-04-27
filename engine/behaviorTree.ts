import { NodeState } from "../types";
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
    reset() {
        if (this.status === NodeState.RUNNING) return;
        this.status = NodeState.PENDING;
        if (this.c) {
            for (const child of this.c) {
                child.reset();
            }
        }
    }
}
export class Selector extends BTNode {
    private _runningIdx: number = -1;
    private _interruptCount: number = 0;
    constructor(n: string, interruptCount: number = 0) {
        super(n, '?');
        this._interruptCount = interruptCount;
    }
    tick(ctx: any): NodeState {
        for (let i = 0; i < this._interruptCount; i++) {
            const r = this.c[i].tick(ctx);
            if (r === NodeState.RUNNING) {
                return this.record(r);
            }
            if (r === NodeState.SUCCESS) {
                this._runningIdx = -1;
                return this.record(r);
            }
        }

        const start = this._runningIdx >= 0 ? this._runningIdx : this._interruptCount;
        for (let i = start; i < this.c.length; i++) {
            const r = this.c[i].tick(ctx);
            if (r === NodeState.RUNNING) {
                this._runningIdx = i;
                return this.record(r);
            }
            if (r === NodeState.SUCCESS) {
                this._runningIdx = -1;
                return this.record(r);
            }
        }
        this._runningIdx = -1;
        return this.record(NodeState.FAILURE);
    }
    reset() {
        if (this.status === NodeState.RUNNING) return;
        this._runningIdx = -1;
        super.reset();
    }
}
export class Sequence extends BTNode {
    private _runningIdx: number = -1;
    constructor(n: string) { super(n, '->'); }
    tick(ctx: any): NodeState {
        const start = this._runningIdx >= 0 ? this._runningIdx : 0;
        for (let i = start; i < this.c.length; i++) {
            const r = this.c[i].tick(ctx);
            if (r === NodeState.RUNNING) {
                this._runningIdx = i;
                return this.record(r);
            }
            if (r === NodeState.FAILURE) {
                this._runningIdx = -1;
                return this.record(r);
            }
        }
        this._runningIdx = -1;
        return this.record(NodeState.SUCCESS);
    }
    reset() {
        if (this.status === NodeState.RUNNING) return;
        this._runningIdx = -1;
        super.reset();
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