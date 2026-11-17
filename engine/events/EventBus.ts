
import { EventMap } from '../../types';

type Handler<T> = (data: T) => void;

export class EventBus {
    private listeners: Map<keyof EventMap, Set<Handler<unknown>>> = new Map();

    public on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler as unknown as Handler<unknown>);
    }

    public off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
        if (!this.listeners.has(event)) return;
        const set = this.listeners.get(event)!;
        set.delete(handler as unknown as Handler<unknown>);
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    /**
     * 靜音：只放行 allow 裡的事件，其餘直接丟掉。回放快轉時用（engine/core/Replay.ts 是唯一呼叫者）：
     * 匯流排上除了 UI_COMMAND 以外的監聽者全是表現層（renderer、音訊、導播、UI hook），
     * 在這一處擋住就不用逐個事件判斷。
     */
    public mute(allow: ReadonlySet<keyof EventMap>): void {
        this.allowWhileMuted = allow;
    }

    public unmute(): void {
        this.allowWhileMuted = null;
    }

    public get muted(): boolean {
        return this.allowWhileMuted !== null;
    }

    private allowWhileMuted: ReadonlySet<keyof EventMap> | null = null;

    public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        if (this.allowWhileMuted && !this.allowWhileMuted.has(event)) return;
        if (!this.listeners.has(event)) return;
        this.listeners.get(event)!.forEach(fn => fn(data));
    }

    public clear(): void {
        this.listeners.clear();
    }
}
