import { describe, it, expect, beforeEach } from 'vitest';
import {
    clampRect,
    restoreState,
    serialize,
    WindowStore,
    StorageLike,
} from '../components/ui/window/windowStore';
import { WindowDef } from '../types';
import { UI_WINDOW, UI_Z } from '../constants';

const sampleDefs: WindowDef[] = [
    {
        id: 'logs',
        title: '戰鬥紀錄',
        defaultRect: { x: 50, y: 50, width: 400, height: 300 },
        minSize: { width: 260, height: 160 },
    },
    {
        id: 'inspector',
        title: '單位檢查',
        defaultRect: { x: 100, y: 100, width: 350, height: 500 },
        minSize: { width: 300, height: 200 },
    },
    {
        id: 'monitor',
        title: '監控儀表',
        defaultRect: { x: 150, y: 150, width: 300, height: 200 },
        minSize: { width: 260, height: 160 },
    },
];

class MockStorage implements StorageLike {
    private data: Record<string, string> = {};
    public shouldThrow = false;

    getItem(key: string): string | null {
        if (this.shouldThrow) throw new Error('Storage access denied');
        return this.data[key] ?? null;
    }

    setItem(key: string, value: string): void {
        if (this.shouldThrow) throw new Error('Quota exceeded');
        this.data[key] = value;
    }

    removeItem(key: string): void {
        if (this.shouldThrow) throw new Error('Storage error');
        delete this.data[key];
    }
}

describe('WindowStore & Window Clamping/Restoration', () => {
    describe('clampRect', () => {
        const viewport = { width: 1000, height: 800 };

        it('retains normal rect within viewport', () => {
            const rect = { x: 100, y: 100, width: 400, height: 300 };
            const clamped = clampRect(rect, viewport);
            expect(clamped).toEqual(rect);
        });

        it('clamps min width and min height', () => {
            const rect = { x: 50, y: 50, width: 100, height: 50 };
            const clamped = clampRect(rect, viewport, { width: 260, height: 160 });
            expect(clamped.width).toBe(260);
            expect(clamped.height).toBe(160);
        });

        it('clamps negative x so KEEP_VISIBLE_X remains inside viewport', () => {
            const rect = { x: -500, y: 50, width: 400, height: 300 };
            const clamped = clampRect(rect, viewport, undefined, { x: 60, y: 30 });
            // minX = -(400 - 60) = -340
            expect(clamped.x).toBe(-340);
        });

        it('clamps negative y so titlebar does not disappear off top', () => {
            const rect = { x: 50, y: -100, width: 400, height: 300 };
            const clamped = clampRect(rect, viewport);
            expect(clamped.y).toBe(0);
        });

        it('clamps extreme positive x and y within viewport bounds', () => {
            const rect = { x: 2000, y: 2000, width: 400, height: 300 };
            const clamped = clampRect(rect, viewport, undefined, { x: 60, y: 30 });
            // maxX = viewport.width - 60 = 940
            expect(clamped.x).toBe(940);
            // maxY = viewport.height - 30 = 770
            expect(clamped.y).toBe(770);
        });
    });

    describe('restoreState & serialize', () => {
        it('restores valid serialized json', () => {
            const serialized = JSON.stringify({
                logs: { x: 120, y: 80, w: 500, h: 400, max: false, open: true, collapsed: false },
            });
            const state = restoreState(serialized, sampleDefs);
            expect(state.logs.isOpen).toBe(true);
            expect(state.logs.rect).toEqual({ x: 120, y: 80, width: 500, height: 400 });
            expect(state.inspector.isOpen).toBe(false);
            expect(state.inspector.rect).toEqual(sampleDefs[1].defaultRect);
        });

        it('gracefully recovers from corrupted json', () => {
            const corrupted = '{invalid json syntax';
            const state = restoreState(corrupted, sampleDefs);
            expect(state.logs.isOpen).toBe(false);
            expect(state.logs.rect).toEqual(sampleDefs[0].defaultRect);
        });

        it('falls back to default rect on invalid field types', () => {
            const invalidData = JSON.stringify({
                logs: { x: 'invalid', y: null, w: NaN, h: 400 },
            });
            const state = restoreState(invalidData, sampleDefs);
            expect(state.logs.rect).toEqual(sampleDefs[0].defaultRect);
        });

        it('correctly serializes window state', () => {
            const state = restoreState(null, sampleDefs);
            state.logs.isOpen = true;
            state.logs.rect.x = 220;
            const serializedStr = serialize(state);
            const parsed = JSON.parse(serializedStr);
            expect(parsed.logs.open).toBe(true);
            expect(parsed.logs.x).toBe(220);
        });
    });

    describe('WindowStore operations', () => {
        let storage: MockStorage;
        let store: WindowStore;

        beforeEach(() => {
            storage = new MockStorage();
            store = new WindowStore(sampleDefs, storage);
        });

        it('opens, closes, and toggles windows', () => {
            expect(store.getWindow('logs')?.isOpen).toBe(false);

            store.open('logs');
            expect(store.getWindow('logs')?.isOpen).toBe(true);

            store.close('logs');
            expect(store.getWindow('logs')?.isOpen).toBe(false);

            store.toggle('logs');
            expect(store.getWindow('logs')?.isOpen).toBe(true);

            store.toggle('logs');
            expect(store.getWindow('logs')?.isOpen).toBe(false);
        });

        it('brings window to front and updates zIndex', () => {
            store.open('logs');
            const zLogs1 = store.getWindow('logs')?.zIndex ?? 0;

            store.open('inspector');
            const zInspector = store.getWindow('inspector')?.zIndex ?? 0;
            expect(zInspector).toBeGreaterThan(zLogs1);

            store.front('logs');
            const zLogs2 = store.getWindow('logs')?.zIndex ?? 0;
            expect(zLogs2).toBeGreaterThan(zInspector);
        });

        it('maximizes and restores rect', () => {
            const originalRect = { ...store.getWindow('logs')!.rect };
            const viewport = { width: 1200, height: 800 };

            store.maximize('logs', viewport);
            const maximized = store.getWindow('logs')!;
            expect(maximized.isMaximized).toBe(true);
            expect(maximized.rect.x).toBe(UI_WINDOW.MAXIMIZE_MARGIN);
            expect(maximized.rect.y).toBe(UI_WINDOW.MAXIMIZE_MARGIN);
            expect(maximized.rect.width).toBe(1200 - UI_WINDOW.MAXIMIZE_MARGIN * 2);

            // Toggling maximize restores original rect
            store.maximize('logs', viewport);
            const restored = store.getWindow('logs')!;
            expect(restored.isMaximized).toBe(false);
            expect(restored.rect).toEqual(originalRect);
        });

        it('collapses window and toggles collapsed state', () => {
            expect(store.getWindow('logs')?.isCollapsed).toBe(false);
            store.collapse('logs');
            expect(store.getWindow('logs')?.isCollapsed).toBe(true);
            store.collapse('logs');
            expect(store.getWindow('logs')?.isCollapsed).toBe(false);
        });

        it('renumbers zIndex when reaching WINDOW_MAX without unbounded growth', () => {
            store.open('logs');
            store.open('inspector');

            // Force z-index past UI_Z.WINDOW_MAX
            for (let i = 0; i < 60; i++) {
                store.front(i % 2 === 0 ? 'logs' : 'inspector');
            }

            const z1 = store.getWindow('logs')!.zIndex;
            const z2 = store.getWindow('inspector')!.zIndex;
            expect(z1).toBeLessThanOrEqual(UI_Z.WINDOW_MAX);
            expect(z2).toBeLessThanOrEqual(UI_Z.WINDOW_MAX);
            expect(z1).toBeGreaterThanOrEqual(UI_Z.WINDOW_BASE);
            expect(z2).toBeGreaterThanOrEqual(UI_Z.WINDOW_BASE);
        });

        it('does not crash when storage throws exceptions', () => {
            storage.shouldThrow = true;
            expect(() => {
                const failingStore = new WindowStore(sampleDefs, storage);
                failingStore.open('logs');
                failingStore.setRect('logs', { x: 300 });
                failingStore.flushSave();
                failingStore.resetLayout();
            }).not.toThrow();
        });

        it('notifies subscribers on state changes', () => {
            let notified = false;
            const unsub = store.subscribe(() => {
                notified = true;
            });

            store.open('logs');
            expect(notified).toBe(true);

            notified = false;
            unsub();
            store.close('logs');
            expect(notified).toBe(false);
        });

        it('publishes immutable snapshots: changed windows get a new reference, untouched ones keep theirs', () => {
            const before = store.getWindow('logs')!;
            const inspectorBefore = store.getWindow('inspector')!;

            store.open('logs');

            const after = store.getWindow('logs')!;
            expect(after).not.toBe(before);
            expect(before.isOpen).toBe(false); // old snapshot is never mutated in place
            expect(after.isOpen).toBe(true);
            // Windows whose state did not change must keep identity (no useless re-render)
            expect(store.getWindow('inspector')).toBe(inspectorBefore);
        });

        it('does not publish or save when front() hits the already-topmost window', () => {
            store.open('logs');
            let notifications = 0;
            store.subscribe(() => { notifications++; });
            const snapshot = store.getState();

            store.front('logs');

            expect(notifications).toBe(0);
            expect(store.getState()).toBe(snapshot);
        });

        it('never persists the maximized state; reload restores the normal rect', () => {
            const originalRect = { ...store.getWindow('logs')!.rect };
            store.open('logs');
            store.maximize('logs', { width: 1200, height: 800 });
            store.flushSave();

            const reloaded = new WindowStore(sampleDefs, storage);
            const restored = reloaded.getWindow('logs')!;
            expect(restored.isMaximized).toBe(false);
            expect(restored.rect).toEqual(originalRect);
            expect(restored.isOpen).toBe(true);
        });
    });
});
