import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('useDraggable toolbar configuration (U9)', () => {
    it('configures storageKey for MapEditorToolbar and PlaybackHUD', () => {
        const mapEditorPath = path.resolve(__dirname, '../components/ui/MapEditorToolbar.tsx');
        const playbackPath = path.resolve(__dirname, '../components/ui/PlaybackHUD.tsx');

        const mapEditorContent = fs.readFileSync(mapEditorPath, 'utf8');
        const playbackContent = fs.readFileSync(playbackPath, 'utf8');

        expect(mapEditorContent).toContain("storageKey: 'tactical_toolbar_map_editor'");
        expect(playbackContent).toContain("storageKey: 'tactical_toolbar_playback'");
    });

    it('verifies useDraggable supports storageKey, onPointerCancel, and touchAction', () => {
        const hookPath = path.resolve(__dirname, '../hooks/useDraggable.ts');
        const hookContent = fs.readFileSync(hookPath, 'utf8');

        expect(hookContent).toContain('storageKey?: string');
        expect(hookContent).toContain('onPointerCancel');
        expect(hookContent).toContain("touchAction: 'none'");
        expect(hookContent).toContain('ResizeObserver');
    });
});
