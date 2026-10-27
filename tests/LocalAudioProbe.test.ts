import { describe, it, expect, vi, afterEach } from 'vitest';
import { cuesInExclusiveGroup, hasCueFiles } from '../engine/audio/localAudioProbe';

function stubFetch(contentTypeFor: (url: string) => string | null) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const type = contentTypeFor(url);
        return { ok: type !== null, headers: { get: () => type } };
    }));
}

describe('local audio probe (announcer toggle visibility)', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('ANNOUNCER group is the 7 kill-spree cues', () => {
        expect(cuesInExclusiveGroup('ANNOUNCER')).toEqual(
            ['KILL_SPREE_1', 'KILL_SPREE_2', 'KILL_SPREE_3', 'KILL_SPREE_4', 'KILL_SPREE_5', 'KILL_SPREE_6', 'KILL_SPREE_7']);
    });

    it('true only when every file answers with an audio content-type', async () => {
        const cues = cuesInExclusiveGroup('ANNOUNCER');
        stubFetch(() => 'audio/mpeg');
        expect(await hasCueFiles(cues)).toBe(true);

        // dev server 對缺檔回 index.html（200）
        stubFetch(() => 'text/html');
        expect(await hasCueFiles(cues)).toBe(false);

        stubFetch(url => url.endsWith('kill_4.mp3') ? null : 'audio/mpeg');
        expect(await hasCueFiles(cues)).toBe(false);

        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
        expect(await hasCueFiles(cues)).toBe(false);
    });
});
