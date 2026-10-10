import { useSyncExternalStore } from 'react';
import { LayoutPreset, MatrixConfig } from './types';
import { DEFAULT_MATRIX_CONFIG } from './defaults';

export interface ShowcaseState {
    readonly config: MatrixConfig;
    readonly layout: LayoutPreset;
}

export class ShowcaseConfigStore {
    private _state: ShowcaseState;
    private _snapshot: ShowcaseState;
    private _listeners: Set<() => void> = new Set();

    constructor(initialState?: Partial<ShowcaseState>) {
        const initialConfig = Object.freeze({
            ...DEFAULT_MATRIX_CONFIG,
            ...initialState?.config,
        });
        const initialLayout = initialState?.layout ?? 'BOTTOM_CENTER';
        this._state = {
            config: initialConfig,
            layout: initialLayout,
        };
        this._snapshot = Object.freeze({
            config: initialConfig,
            layout: initialLayout,
        });
    }

    public getState(): ShowcaseState {
        return this._snapshot;
    }

    public getConfig(): MatrixConfig {
        return this._snapshot.config;
    }

    public getLayout(): LayoutPreset {
        return this._snapshot.layout;
    }

    public setConfig(nextConfig: MatrixConfig): void {
        const frozen = Object.freeze({ ...nextConfig });
        this._state = {
            config: frozen,
            layout: this._state.layout,
        };
        this._snapshot = Object.freeze({
            config: frozen,
            layout: this._state.layout,
        });
        this._notify();
    }

    public updateConfig<K extends keyof MatrixConfig>(key: K, value: MatrixConfig[K]): void {
        if (this._state.config[key] === value) return;
        const nextConfig = Object.freeze({
            ...this._state.config,
            [key]: value,
        });
        this._state = {
            config: nextConfig,
            layout: this._state.layout,
        };
        this._snapshot = Object.freeze({
            config: nextConfig,
            layout: this._state.layout,
        });
        this._notify();
    }

    public setLayout(nextLayout: LayoutPreset): void {
        if (this._state.layout === nextLayout) return;
        this._state = {
            config: this._state.config,
            layout: nextLayout,
        };
        this._snapshot = Object.freeze({
            config: this._state.config,
            layout: nextLayout,
        });
        this._notify();
    }

    public reset(): void {
        const frozen = Object.freeze({ ...DEFAULT_MATRIX_CONFIG });
        this._state = {
            config: frozen,
            layout: 'BOTTOM_CENTER',
        };
        this._snapshot = Object.freeze({
            config: frozen,
            layout: 'BOTTOM_CENTER',
        });
        this._notify();
    }

    public subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    private _notify(): void {
        for (const listener of this._listeners) {
            listener();
        }
    }
}

export const showcaseConfigStore = new ShowcaseConfigStore();

export function useShowcaseConfig(): MatrixConfig {
    return useSyncExternalStore(
        (cb) => showcaseConfigStore.subscribe(cb),
        () => showcaseConfigStore.getConfig()
    );
}

export function useShowcaseLayout(): LayoutPreset {
    return useSyncExternalStore(
        (cb) => showcaseConfigStore.subscribe(cb),
        () => showcaseConfigStore.getLayout()
    );
}

export function useShowcaseState(): ShowcaseState {
    return useSyncExternalStore(
        (cb) => showcaseConfigStore.subscribe(cb),
        () => showcaseConfigStore.getState()
    );
}
