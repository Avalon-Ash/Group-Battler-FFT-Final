
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

    public emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event)!.forEach(fn => fn(data));
    }

    public clear(): void {
        this.listeners.clear();
    }
}
