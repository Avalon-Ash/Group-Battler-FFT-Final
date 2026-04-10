
type Handler<T = any> = (data: T) => void;

export class EventBus {
    private listeners: Map<string, Set<Handler>> = new Map();

    public on<T>(event: string, handler: Handler<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    public off<T>(event: string, handler: Handler<T>): void {
        if (!this.listeners.has(event)) return;
        const set = this.listeners.get(event)!;
        set.delete(handler);
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    public emit<T>(event: string, data: T): void {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event)!.forEach(fn => fn(data));
    }

    public clear(): void {
        this.listeners.clear();
    }
}
