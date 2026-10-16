import { useSyncExternalStore } from 'react';
import { UI_WINDOW } from '../constants';

const QUERY = `(max-width: ${UI_WINDOW.SHEET_BREAKPOINT}px)`;

function subscribe(onChange: () => void): () => void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mq = window.matchMedia(QUERY);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
}

function getSnapshot(): boolean {
    return typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia(QUERY).matches;
}

/**
 * True at phone/small-tablet widths: the same breakpoint at which tool windows become bottom sheets
 * (UI_WINDOW.SHEET_BREAKPOINT). HUD pieces use it to switch to their compact layout.
 */
export function useCompactViewport(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
