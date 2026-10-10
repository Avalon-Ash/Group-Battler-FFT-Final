import { describe, it, expect, vi } from 'vitest';
import {
    ShowcaseConfigStore,
    showcaseConfigStore,
} from '../components/ui/showcase/showcaseConfigStore';
import { DEFAULT_MATRIX_CONFIG } from '../components/ui/showcase/defaults';

describe('ShowcaseConfigStore', () => {
    it('initializes with default config and layout', () => {
        const store = new ShowcaseConfigStore();
        expect(store.getConfig().enabled).toBe(DEFAULT_MATRIX_CONFIG.enabled);
        expect(store.getConfig().speed).toBe(DEFAULT_MATRIX_CONFIG.speed);
        expect(store.getLayout()).toBe('BOTTOM_CENTER');
        expect(Object.isFrozen(store.getState())).toBe(true);
        expect(Object.isFrozen(store.getConfig())).toBe(true);
    });

    it('returns an immutable snapshot that is frozen', () => {
        const store = new ShowcaseConfigStore();
        const state = store.getState();
        expect(Object.isFrozen(state)).toBe(true);
        expect(Object.isFrozen(state.config)).toBe(true);
    });

    it('notifies subscribers on config update and preserves layout reference', () => {
        const store = new ShowcaseConfigStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);

        const prevLayout = store.getLayout();
        store.updateConfig('speed', 2.5);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getConfig().speed).toBe(2.5);
        expect(store.getLayout()).toBe(prevLayout);

        // Same value update should not trigger listener or new snapshot
        const snapshotAfterUpdate = store.getState();
        store.updateConfig('speed', 2.5);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getState()).toBe(snapshotAfterUpdate);

        unsubscribe();
        store.updateConfig('speed', 3.0);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies subscribers on layout update and preserves config reference', () => {
        const store = new ShowcaseConfigStore();
        const listener = vi.fn();
        store.subscribe(listener);

        const prevConfig = store.getConfig();
        store.setLayout('CENTER');

        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getLayout()).toBe('CENTER');
        expect(store.getConfig()).toBe(prevConfig); // Reference preserved!

        // Same layout update does not trigger
        store.setLayout('CENTER');
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('supports full setConfig and reset', () => {
        const store = new ShowcaseConfigStore();
        store.updateConfig('speed', 4.0);
        store.setLayout('BOTTOM_LEFT');

        expect(store.getConfig().speed).toBe(4.0);
        expect(store.getLayout()).toBe('BOTTOM_LEFT');

        store.reset();
        expect(store.getConfig().speed).toBe(DEFAULT_MATRIX_CONFIG.speed);
        expect(store.getLayout()).toBe('BOTTOM_CENTER');
    });

    it('exports a singleton showcaseConfigStore instance', () => {
        expect(showcaseConfigStore).toBeInstanceOf(ShowcaseConfigStore);
        expect(showcaseConfigStore.getLayout()).toBe('BOTTOM_CENTER');
    });
});
