import {
    WindowId,
    WindowRect,
    WindowDef,
    WindowState,
    SerializedWindowState,
    SerializedWindowMap,
} from '../../../types';
import { UI_WINDOW, UI_Z } from '../../../constants';

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem?(key: string): void;
}

/**
 * Clamps window rect so title bar remains accessible inside viewport.
 */
export function clampRect(
    rect: WindowRect,
    viewport: { width: number; height: number },
    minSize?: { width: number; height: number },
    keepVisible?: { x: number; y: number }
): WindowRect {
    const minW = minSize?.width ?? UI_WINDOW.MIN_WIDTH;
    const minH = minSize?.height ?? UI_WINDOW.MIN_HEIGHT;
    const keepX = keepVisible?.x ?? UI_WINDOW.KEEP_VISIBLE_X;
    const keepY = keepVisible?.y ?? UI_WINDOW.KEEP_VISIBLE_Y;

    const width = Math.max(minW, Math.min(rect.width, viewport.width));
    const height = Math.max(minH, Math.min(rect.height, viewport.height));

    const minX = -(width - keepX);
    const maxX = Math.max(0, viewport.width - keepX);
    const minY = 0;
    const maxY = Math.max(0, viewport.height - keepY);

    const x = Math.max(minX, Math.min(rect.x, maxX));
    const y = Math.max(minY, Math.min(rect.y, maxY));

    return { x, y, width, height };
}

/**
 * Serializes window states to JSON string.
 */
export function serialize(windows: Record<string, WindowState>): string {
    const map: SerializedWindowMap = {};
    for (const [id, win] of Object.entries(windows)) {
        map[id] = {
            x: win.rect.x,
            y: win.rect.y,
            w: win.rect.width,
            h: win.rect.height,
            max: win.isMaximized,
            open: win.isOpen,
            collapsed: win.isCollapsed,
        };
    }
    return JSON.stringify(map);
}

/**
 * Restores window state from raw JSON or defaults.
 */
export function restoreState(
    raw: string | null | undefined,
    defs: WindowDef[]
): Record<string, WindowState> {
    let parsed: SerializedWindowMap | null = null;
    if (raw) {
        try {
            const data = JSON.parse(raw);
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                parsed = data as SerializedWindowMap;
            }
        } catch {
            // Discard corrupted JSON
            parsed = null;
        }
    }

    const result: Record<string, WindowState> = {};
    let initialZ = UI_Z.WINDOW_BASE;

    for (const def of defs) {
        const saved = parsed?.[def.id];
        const isValid =
            saved &&
            typeof saved.x === 'number' &&
            Number.isFinite(saved.x) &&
            typeof saved.y === 'number' &&
            Number.isFinite(saved.y) &&
            typeof saved.w === 'number' &&
            Number.isFinite(saved.w) &&
            typeof saved.h === 'number' &&
            Number.isFinite(saved.h);

        if (isValid && saved) {
            result[def.id] = {
                id: def.id,
                isOpen: typeof saved.open === 'boolean' ? saved.open : false,
                isCollapsed: typeof saved.collapsed === 'boolean' ? saved.collapsed : false,
                isMaximized: typeof saved.max === 'boolean' ? saved.max : false,
                rect: {
                    x: saved.x,
                    y: saved.y,
                    width: Math.max(def.minSize.width, saved.w),
                    height: Math.max(def.minSize.height, saved.h),
                },
                zIndex: initialZ++,
            };
        } else {
            result[def.id] = {
                id: def.id,
                isOpen: false,
                isCollapsed: false,
                isMaximized: false,
                rect: { ...def.defaultRect },
                zIndex: initialZ++,
            };
        }
    }

    return result;
}

/**
 * Pure TypeScript window management store.
 */
export class WindowStore {
    private _windows: Record<string, WindowState> = {};
    private _defs: Map<string, WindowDef> = new Map();
    private _listeners: Set<() => void> = new Set();
    private _zCounter: number = UI_Z.WINDOW_BASE;
    private _storage: StorageLike | null = null;
    private _saveTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(defs: WindowDef[] = [], storage?: StorageLike | null) {
        if (storage !== undefined) {
            this._storage = storage;
        } else if (typeof window !== 'undefined' && window.localStorage) {
            this._storage = window.localStorage;
        }
        if (defs.length > 0) {
            this.registerDefs(defs);
        }
    }

    public registerDefs(defs: WindowDef[]): void {
        for (const def of defs) {
            this._defs.set(def.id, def);
        }

        let raw: string | null = null;
        if (this._storage) {
            try {
                raw = this._storage.getItem(UI_WINDOW.STORAGE_KEY);
            } catch {
                raw = null;
            }
        }

        const restored = restoreState(raw, defs);
        for (const [id, state] of Object.entries(restored)) {
            if (!this._windows[id]) {
                this._windows[id] = state;
            }
        }

        const maxZ = Object.values(this._windows).reduce(
            (max, w) => Math.max(max, w.zIndex),
            UI_Z.WINDOW_BASE
        );
        this._zCounter = maxZ;
        this._notify();
    }

    public getState(): Record<string, WindowState> {
        return this._windows;
    }

    public getWindow(id: WindowId): WindowState | undefined {
        return this._windows[id];
    }

    public open(id: WindowId): void {
        const win = this._windows[id];
        if (!win) return;
        win.isOpen = true;
        this.front(id);
    }

    public close(id: WindowId): void {
        const win = this._windows[id];
        if (!win) return;
        win.isOpen = false;
        this._notify();
        this._scheduleSave();
    }

    public toggle(id: WindowId): void {
        const win = this._windows[id];
        if (!win) return;
        if (win.isOpen) {
            this.close(id);
        } else {
            this.open(id);
        }
    }

    public front(id: WindowId): void {
        const win = this._windows[id];
        if (!win) return;

        if (this._zCounter >= UI_Z.WINDOW_MAX) {
            this._renumberZIndices();
        }
        win.zIndex = ++this._zCounter;
        this._notify();
        this._scheduleSave();
    }

    public setRect(id: WindowId, partialRect: Partial<WindowRect>): void {
        const win = this._windows[id];
        if (!win) return;
        win.rect = {
            ...win.rect,
            ...partialRect,
        };
        this._notify();
        this._scheduleSave();
    }

    public maximize(id: WindowId, viewport?: { width: number; height: number }): void {
        const win = this._windows[id];
        if (!win) return;

        if (!win.isMaximized) {
            win.prevRect = { ...win.rect };
            const vp = viewport ?? {
                width: typeof window !== 'undefined' ? window.innerWidth : 1200,
                height: typeof window !== 'undefined' ? window.innerHeight : 800,
            };
            const margin = UI_WINDOW.MAXIMIZE_MARGIN;
            win.rect = {
                x: margin,
                y: margin,
                width: Math.max(UI_WINDOW.MIN_WIDTH, vp.width - margin * 2),
                height: Math.max(UI_WINDOW.MIN_HEIGHT, vp.height - margin * 2),
            };
            win.isMaximized = true;
            win.isCollapsed = false;
        } else {
            if (win.prevRect) {
                win.rect = { ...win.prevRect };
                win.prevRect = undefined;
            }
            win.isMaximized = false;
        }

        this.front(id);
    }

    public collapse(id: WindowId): void {
        const win = this._windows[id];
        if (!win) return;

        win.isCollapsed = !win.isCollapsed;
        if (win.isCollapsed && win.isMaximized) {
            win.isMaximized = false;
            if (win.prevRect) {
                win.rect = { ...win.prevRect };
                win.prevRect = undefined;
            }
        }
        this._notify();
        this._scheduleSave();
    }

    public resetLayout(): void {
        if (this._storage) {
            try {
                this._storage.removeItem?.(UI_WINDOW.STORAGE_KEY);
            } catch {
                // Ignore storage errors
            }
        }

        let z = UI_Z.WINDOW_BASE;
        for (const [id, def] of this._defs.entries()) {
            this._windows[id] = {
                id: def.id,
                isOpen: false,
                isCollapsed: false,
                isMaximized: false,
                rect: { ...def.defaultRect },
                zIndex: z++,
            };
        }
        this._zCounter = z;
        this._notify();
    }

    public subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    public flushSave(): void {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        if (!this._storage) return;
        try {
            this._storage.setItem(UI_WINDOW.STORAGE_KEY, serialize(this._windows));
        } catch {
            // Ignore quota errors
        }
    }

    public destroy(): void {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        this._listeners.clear();
    }

    private _renumberZIndices(): void {
        const entries = Object.values(this._windows).sort((a, b) => a.zIndex - b.zIndex);
        let nextZ = UI_Z.WINDOW_BASE;
        for (const win of entries) {
            win.zIndex = nextZ++;
        }
        this._zCounter = nextZ;
    }

    private _scheduleSave(): void {
        if (!this._storage) return;
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        this._saveTimer = setTimeout(() => {
            this.flushSave();
        }, UI_WINDOW.SAVE_DEBOUNCE_MS);
    }

    private _notify(): void {
        this._windows = { ...this._windows };
        for (const listener of this._listeners) {
            listener();
        }
    }
}

export const windowStore = new WindowStore();
