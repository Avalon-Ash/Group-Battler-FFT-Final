import { useSyncExternalStore } from 'react';
import { windowStore } from '../components/ui/window/windowStore';
import { WindowId, WindowRect, WindowState } from '../types';

/**
 * Hook to subscribe to all window states.
 */
export function useWindowStore(): Record<string, WindowState> {
    return useSyncExternalStore(
        (onStoreChange) => windowStore.subscribe(onStoreChange),
        () => windowStore.getState()
    );
}

/**
 * Hook to subscribe to a specific window state.
 */
export function useWindowState(id: WindowId): WindowState | undefined {
    return useSyncExternalStore(
        (onStoreChange) => windowStore.subscribe(onStoreChange),
        () => windowStore.getWindow(id)
    );
}

/**
 * Hook providing memoized-stable window control actions.
 */
export function useWindowActions() {
    return {
        open: (id: WindowId) => windowStore.open(id),
        close: (id: WindowId) => windowStore.close(id),
        toggle: (id: WindowId) => windowStore.toggle(id),
        front: (id: WindowId) => windowStore.front(id),
        setRect: (id: WindowId, rect: Partial<WindowRect>) => windowStore.setRect(id, rect),
        maximize: (id: WindowId, viewport?: { width: number; height: number }) =>
            windowStore.maximize(id, viewport),
        collapse: (id: WindowId) => windowStore.collapse(id),
        resetLayout: () => windowStore.resetLayout(),
    };
}
