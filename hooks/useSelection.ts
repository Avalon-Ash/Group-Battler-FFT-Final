import { useSyncExternalStore } from 'react';

/**
 * 目前選取的單位（UI 狀態，引擎不知道它）。存成集合，之後多選不用重改；
 * 第一個是主要選取，單位檢查器與行為樹視窗都看它。
 */
export class SelectionStore {
    private ids: readonly string[] = [];
    private readonly listeners = new Set<() => void>();

    getIds = (): readonly string[] => this.ids;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    set(ids: readonly string[]): void {
        const next = [...new Set(ids)];
        if (next.length === this.ids.length && next.every((id, i) => id === this.ids[i])) return;
        this.ids = next;
        this.listeners.forEach((l) => l());
    }

    clear(): void {
        this.set([]);
    }
}

export const selectionStore = new SelectionStore();

function useSelectedIds(): readonly string[] {
    return useSyncExternalStore(selectionStore.subscribe, selectionStore.getIds, selectionStore.getIds);
}

export function usePrimarySelectedId(): string | null {
    return useSelectedIds()[0] ?? null;
}
