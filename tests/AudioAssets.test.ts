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

    it('all referenced SFX and Music audio files physically exist and are non-empty', () => {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
        let totalBytes = 0;
        let totalFiles = 0;

        for (const [key, value] of Object.entries(manifest)) {
            if (key === 'music') {
                for (const [trackId, musicFiles] of Object.entries(value as Record<string, string[]>)) {
                    for (const relPath of musicFiles) {
                        const fullPath = path.resolve(__dirname, '../public', relPath);
                        expect(fs.existsSync(fullPath), `Music file must exist: ${relPath} for track ${trackId}`).toBe(true);
                        const stat = fs.statSync(fullPath);
                        expect(stat.size).toBeGreaterThan(0);
                        totalBytes += stat.size;
                        totalFiles++;
                    }
                }
            } else {
                for (const relPath of value as string[]) {
                    const fullPath = path.resolve(__dirname, '../public', relPath);
                    expect(fs.existsSync(fullPath), `File must exist: ${relPath} for cue ${key}`).toBe(true);
                    const stat = fs.statSync(fullPath);
                    expect(stat.size).toBeGreaterThan(0);
                    totalBytes += stat.size;
                    totalFiles++;

                    const ext = path.extname(fullPath).toLowerCase();
                    expect(['.ogg', '.wav', '.mp3']).toContain(ext);
                }
            }
        }

        expect(totalFiles).toBeGreaterThanOrEqual(55);
        expect(totalBytes).toBeLessThanOrEqual(MAX_AUDIO_BUDGET_BYTES);
    });

    it('MUSIC_TABLE references existing files and covers all 5 tracks', async () => {
        const { MUSIC_TABLE } = await import('../data/audio/music');
        const trackKeys = Object.keys(MUSIC_TABLE);
        expect(trackKeys.length).toBeGreaterThanOrEqual(5);

        let totalMusicBytes = 0;
        for (const [trackId, def] of Object.entries(MUSIC_TABLE)) {
            expect(def.files.length, `Track ${trackId} must have at least 1 file`).toBeGreaterThanOrEqual(1);
            for (const f of def.files) {
                const fullPath = path.resolve(__dirname, '../public', f);
                expect(fs.existsSync(fullPath), `Track file must exist: ${f}`).toBe(true);
                const stat = fs.statSync(fullPath);
                expect(stat.size).toBeLessThanOrEqual(5 * 1024 * 1024); // Single track <= 5 MB
                totalMusicBytes += stat.size;
            }
        }
        expect(totalMusicBytes).toBeLessThanOrEqual(15 * 1024 * 1024); // BGM total <= 15 MB
    });

    it('ASSET_LEDGER.md and CREDITS.md exist and document SFX and BGM composers', () => {
        const ledgerPath = path.resolve(__dirname, '../docs/ASSET_LEDGER.md');
        const creditsPath = path.resolve(__dirname, '../CREDITS.md');

        expect(fs.existsSync(ledgerPath)).toBe(true);
        expect(fs.existsSync(creditsPath)).toBe(true);

        const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
        const creditsContent = fs.readFileSync(creditsPath, 'utf-8');

        // SFX creators
        expect(ledgerContent).toContain('Kenney');
        expect(ledgerContent).toContain('rubberduck');
        expect(ledgerContent).toContain('artisticdude');
        expect(ledgerContent).toContain('cynicmusic');

        // BGM creators
        expect(ledgerContent).toContain('Matthew Pablo');
        expect(ledgerContent).toContain('Alexandr Zhelanov');
        expect(ledgerContent).toContain('Devlin Bataric');

        expect(creditsContent).toContain('Kenney');
        expect(creditsContent).toContain('rubberduck');
        expect(creditsContent).toContain('artisticdude');
        expect(creditsContent).toContain('Matthew Pablo');
        expect(creditsContent).toContain('Alexandr Zhelanov');
        expect(creditsContent).toContain('Devlin Bataric');
    });
});
