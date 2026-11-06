import { describe, expect, it } from 'vitest';
import { SelectionStore } from '../hooks/useSelection';

describe('Inspector source selection and viewing side intent', () => {
    it('keeps the viewing agent when inspecting an enemy source, then follows an explicit normal selection', () => {
        const store = new SelectionStore();
        let notifications = 0;
        store.subscribe(() => notifications++);
        store.set(['ally']);
        expect(store.getWatchId()).toBe('ally');
        store.inspect('enemy-source');
        expect(store.getIds()).toEqual(['enemy-source']);
        expect(store.getWatchId()).toBe('ally');
        const ids = store.getIds();
        store.inspect('enemy-source');
        expect(store.getIds()).toBe(ids);
        expect(notifications).toBe(2);
        store.set(['enemy-source']);
        expect(store.getIds()).toBe(ids);
        expect(store.getWatchId()).toBe('enemy-source');
        expect(notifications).toBe(3);
        store.clear();
        expect(store.getIds()).toEqual([]);
        expect(store.getWatchId()).toBeNull();
    });
    it('does not invent a watching side when only an Inspector jump was made', () => {
        const store = new SelectionStore();
        store.inspect('source');
        expect(store.getIds()).toEqual(['source']);
        expect(store.getWatchId()).toBeNull();
    });
});
