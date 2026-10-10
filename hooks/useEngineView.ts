import { useSyncExternalStore, useRef, useCallback } from 'react';
import { GameEngine } from '../engine/game';

import { UI_SETTINGS } from '../constants';

/**
 * Frequency of the shared UI view polling ticker (10 Hz / 100ms).
 */
export const SNAPSHOT_HZ = UI_SETTINGS.SNAPSHOT_HZ;
export const SNAPSHOT_INTERVAL_MS = 1000 / SNAPSHOT_HZ;


/**
 * Shared Engine View Ticker singleton.
 * Automatically runs a single setInterval when subscribers > 0,
 * and clears the interval when subscriber count drops to 0.
 */
export class EngineViewTicker {
    private _subscribers: Set<() => void> = new Set();
    private _intervalId: ReturnType<typeof setInterval> | null = null;
    private _version: number = 0;

    public get activeSubscriberCount(): number {
        return this._subscribers.size;
    }

    public get isRunning(): boolean {
        return this._intervalId !== null;
    }

    public get version(): number {
        return this._version;
    }

    public subscribe = (listener: () => void): (() => void) => {
        this._subscribers.add(listener);
        if (this._subscribers.size === 1) {
            this._start();
        }

        return () => {
            this._subscribers.delete(listener);
            if (this._subscribers.size === 0) {
                this._stop();
            }
        };
    };

    public tick = (): void => {
        this._version++;
        for (const listener of this._subscribers) {
            listener();
        }
    };

    private _start(): void {
        if (this._intervalId === null) {
            this._intervalId = setInterval(this.tick, SNAPSHOT_INTERVAL_MS);
        }
    }

    private _stop(): void {
        if (this._intervalId !== null) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }
}

export const engineViewTicker = new EngineViewTicker();

/**
 * React hook to consume engine state through a pure selector.
 * Uses useSyncExternalStore backed by the shared ticker.
 * If selector returns the same object reference, React skips re-render.
 */
export function useEngineView<T>(
    engine: GameEngine | null | undefined,
    selector: (engine: GameEngine) => T
): T | null {
    // Keep selector ref current to avoid subscription recreation
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    const lastSnapshotRef = useRef<T | null>(null);

    const getSnapshot = useCallback(() => {
        if (!engine) return null;
        const next = selectorRef.current(engine);
        lastSnapshotRef.current = next;
        return next;
    }, [engine]);

    return useSyncExternalStore(
        engineViewTicker.subscribe,
        getSnapshot,
        () => null
    );
}
