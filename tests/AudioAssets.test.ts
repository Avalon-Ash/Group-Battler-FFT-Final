import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CUE_TABLE, CueId } from '../data/audio/cues';

const MANIFEST_PATH = path.resolve(__dirname, '../public/assets/audio/manifest.json');
const AUDIO_ROOT = path.resolve(__dirname, '../public/assets/audio');
const MAX_AUDIO_BUDGET_BYTES = 25 * 1024 * 1024; // 25 MB

describe('Audio Assets & Manifest (S1a)', () => {
    it('manifest.json exists and is valid JSON', () => {
        expect(fs.existsSync(MANIFEST_PATH)).toBe(true);
        const content = fs.readFileSync(MANIFEST_PATH, 'utf-8');
        const manifest = JSON.parse(content);
        expect(typeof manifest).toBe('object');
        expect(manifest).not.toBeNull();
    });

    it('covers all cues defined in CUE_TABLE with at least 1 file variant', () => {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
        const cueKeys = Object.keys(CUE_TABLE) as CueId[];

        expect(cueKeys.length).toBeGreaterThanOrEqual(19);

        for (const cueId of cueKeys) {
            expect(manifest[cueId], `manifest must contain cue ${cueId}`).toBeDefined();
            expect(Array.isArray(manifest[cueId])).toBe(true);
            expect(manifest[cueId].length, `cue ${cueId} must have at least 1 file`).toBeGreaterThanOrEqual(1);
            // CUE_TABLE.files should match manifest
            expect(CUE_TABLE[cueId].files).toEqual(manifest[cueId]);
        }
    });

    it('all referenced audio files physically exist and are non-empty', () => {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
        let totalBytes = 0;
        let totalFiles = 0;

        for (const [cueId, files] of Object.entries(manifest)) {
            for (const relPath of files as string[]) {
                // relPath is like 'assets/audio/sfx/foo.ogg', which is relative to public/
                const fullPath = path.resolve(__dirname, '../public', relPath);
                expect(fs.existsSync(fullPath), `File must exist: ${relPath} for cue ${cueId}`).toBe(true);
                const stat = fs.statSync(fullPath);
                expect(stat.size).toBeGreaterThan(0);
                totalBytes += stat.size;
                totalFiles++;

                // Allowed extension
                const ext = path.extname(fullPath).toLowerCase();
                expect(['.ogg', '.wav', '.mp3']).toContain(ext);
            }
        }

        expect(totalFiles).toBeGreaterThanOrEqual(50);
        expect(totalBytes).toBeLessThanOrEqual(MAX_AUDIO_BUDGET_BYTES);
    });

    it('ASSET_LEDGER.md and CREDITS.md exist and document the assets', () => {
        const ledgerPath = path.resolve(__dirname, '../docs/ASSET_LEDGER.md');
        const creditsPath = path.resolve(__dirname, '../CREDITS.md');

        expect(fs.existsSync(ledgerPath)).toBe(true);
        expect(fs.existsSync(creditsPath)).toBe(true);

        const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
        const creditsContent = fs.readFileSync(creditsPath, 'utf-8');

        // Check key creators
        expect(ledgerContent).toContain('Kenney');
        expect(ledgerContent).toContain('rubberduck');
        expect(ledgerContent).toContain('artisticdude');
        expect(ledgerContent).toContain('cynicmusic');

        expect(creditsContent).toContain('Kenney');
        expect(creditsContent).toContain('rubberduck');
        expect(creditsContent).toContain('artisticdude');
        expect(creditsContent).toContain('cynicmusic');
    });
});
