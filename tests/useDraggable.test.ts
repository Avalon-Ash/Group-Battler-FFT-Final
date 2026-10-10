import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    clampToolbarPosition,
    loadStoredPosition,
    saveStoredPosition,
} from '../hooks/useDraggable';
import { UI_PIN } from '../constants';

describe('useDraggable toolbar configuration (U9)', () => {
    it('configures storageKey for MapEditorToolbar and PlaybackHUD', () => {
        const mapEditorPath = path.resolve(__dirname, '../components/ui/MapEditorToolbar.tsx');
        const playbackPath = path.resolve(__dirname, '../components/ui/PlaybackHUD.tsx');

        const mapEditorContent = fs.readFileSync(mapEditorPath, 'utf8');
        const playbackContent = fs.readFileSync(playbackPath, 'utf8');

        expect(mapEditorContent).toContain('UI_PIN.STORAGE_KEYS.mapEditor');
        expect(playbackContent).toContain('UI_PIN.STORAGE_KEYS.playback');
        expect(UI_PIN.STORAGE_KEYS.mapEditor).toBe('tactical_toolbar_map_editor');
        expect(UI_PIN.STORAGE_KEYS.playback).toBe('tactical_toolbar_playback');
    });

    it('verifies useDraggable supports storageKey, onPointerCancel, and touchAction', () => {
        const hookPath = path.resolve(__dirname, '../hooks/useDraggable.ts');
        const hookContent = fs.readFileSync(hookPath, 'utf8');

        expect(hookContent).toContain('storageKey?: string');
        expect(hookContent).toContain('onPointerCancel');
        expect(hookContent).toContain("touchAction: 'none'");
        expect(hookContent).toContain('ResizeObserver');
        expect(hookContent).toContain('UI_PIN');
    });
});

describe('useDraggable helpers (R4)', () => {
    describe('clampToolbarPosition boundary clamping', () => {
        const viewport = { vw: 1000, vh: 800 };
        const size = { width: 200, height: 60 };
        const margin = 20;
        // minX = 20, minY = 20
        // maxX = 1000 - 200 - 20 = 780
        // maxY = 800 - 60 - 20 = 720

        it('clamps positions outside minimum boundaries', () => {
            const clamped = clampToolbarPosition({ x: -50, y: -10 }, size, viewport, margin);
            expect(clamped.x).toBe(20);
            expect(clamped.y).toBe(20);
        });

        it('clamps positions outside maximum boundaries', () => {
            const clamped = clampToolbarPosition({ x: 900, y: 850 }, size, viewport, margin);
            expect(clamped.x).toBe(780);
            expect(clamped.y).toBe(720);
        });

        it('preserves positions inside valid boundaries', () => {
            const clamped = clampToolbarPosition({ x: 300, y: 400 }, size, viewport, margin);
            expect(clamped.x).toBe(300);
            expect(clamped.y).toBe(400);
        });

        it('clamps properly when viewport is tight/smaller than margin allows', () => {
            const tightViewport = { vw: 420, vh: 400 };
            const tightSize = { width: 406, height: 88 };
            const tightMargin = 30;
            const clamped = clampToolbarPosition({ x: 300, y: 350 }, tightSize, tightViewport, tightMargin);
            expect(clamped.x + tightSize.width).toBeLessThanOrEqual(420);
            expect(clamped.y + tightSize.height).toBeLessThanOrEqual(400);
            expect(clamped.x).toBeGreaterThanOrEqual(0);
            expect(clamped.y).toBeGreaterThanOrEqual(0);
        });
    });

    describe('storage persistence & resilience', () => {
        const testKey = 'test_toolbar_key';
        let mockStorage: MockStorage;

        class MockStorage {
            private data: Record<string, string> = {};
            public shouldThrow = false;

            getItem(key: string): string | null {
                if (this.shouldThrow) throw new Error('SecurityError: Access denied');
                return this.data[key] ?? null;
            }

            setItem(key: string, value: string): void {
                if (this.shouldThrow) throw new Error('QuotaExceededError');
                this.data[key] = value;
            }

            clear(): void {
                this.data = {};
                this.shouldThrow = false;
            }
        }

        beforeEach(() => {
            mockStorage = new MockStorage();
        });

        it('loads valid position from storage', () => {
            mockStorage.setItem(testKey, JSON.stringify({ x: 120, y: 240 }));
            const pos = loadStoredPosition(testKey, mockStorage);
            expect(pos).toEqual({ x: 120, y: 240 });
        });

        it('falls back to null on corrupted JSON', () => {
            mockStorage.setItem(testKey, '{corrupted_json_string:::');
            const pos = loadStoredPosition(testKey, mockStorage);
            expect(pos).toBeNull();
        });

        it('falls back to null on invalid schema JSON', () => {
            mockStorage.setItem(testKey, JSON.stringify({ x: 'bad', y: null }));
            const pos = loadStoredPosition(testKey, mockStorage);
            expect(pos).toBeNull();
        });

        it('does not crash when storage throws SecurityError or permission exception', () => {
            mockStorage.shouldThrow = true;
            expect(() => {
                const pos = loadStoredPosition(testKey, mockStorage);
                expect(pos).toBeNull();
            }).not.toThrow();
        });

        it('saves position and does not crash when storage throws QuotaExceededError', () => {
            saveStoredPosition(testKey, { x: 50, y: 80 }, mockStorage);
            expect(JSON.parse(mockStorage.getItem(testKey)!)).toEqual({ x: 50, y: 80 });

            mockStorage.shouldThrow = true;
            expect(() => {
                saveStoredPosition(testKey, { x: 99, y: 99 }, mockStorage);
            }).not.toThrow();
        });
    });
});

