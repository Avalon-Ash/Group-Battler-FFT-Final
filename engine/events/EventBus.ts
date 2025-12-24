
type Handler<T = any> = (data: T) => void;

export class EventBus {
    private listeners: Map<string, Handler[]> = new Map();

    public on<T>(event: string, handler: Handler<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(handler);
    }

    public off<T>(event: string, handler: Handler<T>): void {
        if (!this.listeners.has(event)) return;
        const arr = this.listeners.get(event)!;
        const idx = arr.indexOf(handler);
        if (idx !== -1) {
            arr.splice(idx, 1);
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
