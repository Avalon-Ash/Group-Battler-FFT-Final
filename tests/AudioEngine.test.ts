import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { AUDIO } from '../constants';
import {
    AudioEngine,
    acquireSharedAudioEngine,
    releaseSharedAudioEngine,
    getSharedAudioEngineOwnerCount,
    peekSharedAudioEngine
} from '../engine/audio/AudioEngine';
import { AudioPRNG, createSynthBuffer, clearSynthCache } from '../engine/audio/Synth';

// Mock Web Audio Context & Nodes
function createMockAudioContext() {
    let currentTime = 0;
    let state: AudioContextState = 'suspended';

    const createMockGainNode = () => {
        return {
            gain: {
                value: 1,
                setValueAtTime: vi.fn(function (val: number) { this.value = val; }),
                linearRampToValueAtTime: vi.fn(function (val: number) { this.value = val; }),
                cancelScheduledValues: vi.fn(),
            },
            connect: vi.fn(),
            disconnect: vi.fn()
        };
    };

    const createMockBufferSource = () => {
        return {
            buffer: null as AudioBuffer | null,
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            playbackRate: { value: 1 },
            onended: null as (() => void) | null,
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(function () {
                if (this.onended) this.onended();
            })
        };
    };

    const createMockBuffer = (channels: number, length: number, sampleRate: number): AudioBuffer => {
        const channelData = new Float32Array(length);
        return {
            numberOfChannels: channels,
            length,
            sampleRate,
            duration: length / sampleRate,
            getChannelData: () => channelData,
            copyFromChannel: vi.fn(),
            copyToChannel: vi.fn()
        } as unknown as AudioBuffer;
    };

    const createMockStereoPanner = () => {
        return {
            pan: {
                value: 0,
                setValueAtTime: vi.fn(function (val: number) { this.value = val; })
            },
            connect: vi.fn(),
            disconnect: vi.fn()
        };
    };

    const ctx = {
        get currentTime() { return currentTime; },
        set currentTime(v: number) { currentTime = v; },
        get state() { return state; },
        sampleRate: 44100,
        destination: {} as AudioDestinationNode,
        createGain: vi.fn(createMockGainNode),
        createBufferSource: vi.fn(createMockBufferSource),
        createBuffer: vi.fn(createMockBuffer),
        createStereoPanner: vi.fn(createMockStereoPanner),
        resume: vi.fn(async () => { state = 'running'; }),
        suspend: vi.fn(async () => { state = 'suspended'; }),
        close: vi.fn(async () => { state = 'closed'; }),
        decodeAudioData: vi.fn(async () => createMockBuffer(1, 4410, 44100))
    } as unknown as AudioContext;

    return { ctx, getMockState: () => state, setTime: (t: number) => { currentTime = t; } };
}

describe('AudioPRNG (Deterministic Non-Math.random RNG)', () => {
    it('never calls Math.random and produces deterministic sequences', () => {
        const mathRandomSpy = vi.spyOn(Math, 'random');

        const prng1 = new AudioPRNG(12345);
        const val1_a = prng1.next();
        const val1_b = prng1.next();

        const prng2 = new AudioPRNG(12345);
        const val2_a = prng2.next();
        const val2_b = prng2.next();

        expect(val1_a).toBe(val2_a);
        expect(val1_b).toBe(val2_b);
        expect(mathRandomSpy).not.toHaveBeenCalled();

        mathRandomSpy.mockRestore();
    });

    it('createSynthBuffer generates valid AudioBuffers without calling Math.random', () => {
        clearSynthCache();
        const mathRandomSpy = vi.spyOn(Math, 'random');
        const { ctx } = createMockAudioContext();

        const bufHit = createSynthBuffer(ctx, 'HIT_LIGHT');
        expect(bufHit).toBeDefined();
        expect(bufHit.length).toBeGreaterThan(0);
        expect(mathRandomSpy).not.toHaveBeenCalled();

        const bufMusic = createSynthBuffer(ctx, 'BGM_PAD');
        expect(bufMusic).toBeDefined();
        expect(bufMusic.length).toBe(44100 * 4);
        expect(mathRandomSpy).not.toHaveBeenCalled();

        mathRandomSpy.mockRestore();
    });
});

describe('AudioEngine', () => {
    beforeEach(() => {
        clearSynthCache();
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    // 背景預載鏈會跨測試持續執行，fetch stub 與 console.warn 靜音需維持到整個檔案結束
    afterAll(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('with forceMute / ?mute, does not create AudioContext or play any sounds', () => {
        const engine = new AudioEngine({ forceMute: true, skipUrlCheck: true });
        expect(engine.isUrlMuted()).toBe(true);

        const played = engine.playCue('HIT_LIGHT');
        expect(played).toBe(false);

        engine.playMusic('SHOWCASE_AMBIENT');
        expect(engine.isAudioUnlocked()).toBe(false);
        expect(engine.getActiveMusicSourceCount()).toBe(0);
    });

    it('requires unlock() before playing cues (auto-play policy)', () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });

        expect(engine.isAudioUnlocked()).toBe(false);

        // Before unlock, cues are silently dropped
        const playedBefore = engine.playCue('HIT_LIGHT');
        expect(playedBefore).toBe(false);

        // Unlock
        engine.unlock();
        expect(engine.isAudioUnlocked()).toBe(true);

        // After unlock, cue plays
        const playedAfter = engine.playCue('HIT_LIGHT');
        expect(playedAfter).toBe(true);
    });

    it('throttles duplicate cues within CUE_THROTTLE_MS', () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();

        const first = engine.playCue('HIT_LIGHT');
        expect(first).toBe(true);

        // Immediately triggering the same cue must be throttled
        const second = engine.playCue('HIT_LIGHT');
        expect(second).toBe(false);
    });

    it('enforces voice pool limit of AUDIO.MAX_VOICES and preempts lower priority voices', () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();

        const playedList: boolean[] = [];
        for (let i = 0; i < AUDIO.MAX_VOICES; i++) {
            const p = engine.playCue('UI_CLICK');
            playedList.push(p);
        }

        // Even under voice stress, high priority VICTORY cue (priority 10) can preempt low priority
        const victoryPlayed = engine.playCue('VICTORY');
        expect(victoryPlayed).toBe(true);
    });

    it('applies perceptual dB curve on volume changes', () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });

        engine.setVolume('master', 0.5);
        expect(engine.getVolume('master')).toBe(0.5);

        // Test muting
        engine.setMuted(true);
        expect(engine.isMuted()).toBe(true);

        engine.setMuted(false);
        expect(engine.isMuted()).toBe(false);
    });

    const flush = async () => {
        for (let i = 0; i < 10; i++) await Promise.resolve();
        await new Promise(r => setTimeout(r, 0));
    };

    it('plays and crossfades background music (loads files on demand, real file not synth pad)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();

        engine.playMusic('SHOWCASE_AMBIENT', 1.0);
        await flush();
        expect(ctx.createBufferSource).toHaveBeenCalled();
        expect(engine.getActiveMusicSourceCount()).toBe(1);
        expect(engine.getCurrentTrackId()).toBe('SHOWCASE_AMBIENT');

        // Same track does not trigger redundant restart
        const countBefore = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length;
        engine.playMusic('SHOWCASE_AMBIENT', 1.0);
        await flush();
        expect((ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore);

        // Switching track triggers crossfade
        engine.playMusic('BATTLE_NORMAL', 1.0);
        await flush();
        expect((ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length).toBe(countBefore + 1);
        expect(engine.getActiveMusicSourceCount()).toBe(1);
        expect(engine.getCurrentTrackId()).toBe('BATTLE_NORMAL');

        engine.stopMusic(1.0);
        expect(engine.getActiveMusicSourceCount()).toBe(0);
    });

    it('falls back to synth pad only when the music file permanently fails to load', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();

        engine.playMusic('BATTLE_NORMAL', 1.0);
        await flush();
        // Pad fallback started after load failure
        expect(ctx.createBufferSource).toHaveBeenCalled();
        const count = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length;

        // Same (fallback) track is not restarted
        engine.playMusic('BATTLE_NORMAL', 1.0);
        await flush();
        expect((ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length).toBe(count);
        engine.stopMusic(0.1);
    });

    it('does not start the synth pad while the real file is still loading', async () => {
        let resolveFetch: ((v: unknown) => void) | null = null;
        vi.stubGlobal('fetch', vi.fn(() => new Promise(res => { resolveFetch = res; })));
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();
        engine.playMusic('SHOWCASE_AMBIENT', 1.0);
        await flush();
        expect(ctx.createBufferSource).not.toHaveBeenCalled();
        resolveFetch?.({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
        await flush();
        expect(ctx.createBufferSource).toHaveBeenCalled();
    });

    it('Task T2: rapid A -> B -> C switching ensures at most 1 active BGM source and only C plays at the end', async () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();
        await flush();

        // Rapidly switch A -> B -> C
        engine.playMusic('SHOWCASE_AMBIENT', 0.05);
        expect(engine.getActiveMusicSourceCount()).toBeLessThanOrEqual(1);
        engine.playMusic('BATTLE_NORMAL', 0.05);
        expect(engine.getActiveMusicSourceCount()).toBeLessThanOrEqual(1);
        engine.playMusic('BATTLE_TENSE', 0.05);
        expect(engine.getActiveMusicSourceCount()).toBeLessThanOrEqual(1);

        await flush();
        expect(engine.getActiveMusicSourceCount()).toBe(1);
        expect(engine.getCurrentTrackId()).toBe('BATTLE_TENSE');

        // Wait for fade cleanup timers to complete
        await new Promise(r => setTimeout(r, 120));
        expect(engine.getFadingMusicSourceCount()).toBe(0);
        expect(engine.getActiveMusicSourceCount()).toBe(1);
        expect(engine.getCurrentTrackId()).toBe('BATTLE_TENSE');
    });

    it('Task T2: stopping a non-looping sting (VICTORY_STING) manually does not re-trigger SHOWCASE_AMBIENT via onended', async () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();
        await flush();

        // Preload VICTORY_STING and BATTLE_NORMAL
        engine.playMusic('VICTORY_STING', 0.05);
        await flush();
        expect(engine.getCurrentTrackId()).toBe('VICTORY_STING');

        // Immediately switch to BATTLE_NORMAL (rematch before sting finishes)
        engine.playMusic('BATTLE_NORMAL', 0.05);
        await flush();

        expect(engine.getActiveMusicSourceCount()).toBe(1);
        expect(engine.getCurrentTrackId()).toBe('BATTLE_NORMAL');
    });

    it('Task T2: shared singleton reference counting handles interleaved "new engine created BEFORE old engine destroyed"', async () => {
        // Ensure clean state first
        const existing = peekSharedAudioEngine();
        if (existing) existing.destroy();

        const { ctx, getMockState } = createMockAudioContext();
        const tokenA = Symbol('EngineA');
        const tokenB = Symbol('EngineB');

        // 1. Old engine A acquires shared AudioEngine
        const sharedA = acquireSharedAudioEngine(tokenA, { audioContext: ctx, skipUrlCheck: true, forceMute: false });
        sharedA.unlock();
        await flush();
        sharedA.playMusic('SHOWCASE_AMBIENT', 0.05);
        await flush();
        expect(getSharedAudioEngineOwnerCount()).toBe(1);
        expect(sharedA.getActiveMusicSourceCount()).toBe(1);

        // 2. New engine B is created BEFORE old engine A is destroyed (React StrictMode / HMR interleaved order)
        const sharedB = acquireSharedAudioEngine(tokenB);
        expect(sharedB).toBe(sharedA);
        expect(getSharedAudioEngineOwnerCount()).toBe(2);

        // Engine B switches music
        sharedB.playMusic('BATTLE_NORMAL', 0.05);
        await flush();
        expect(sharedB.getCurrentTrackId()).toBe('BATTLE_NORMAL');
        expect(sharedB.getActiveMusicSourceCount()).toBe(1);

        // 3. Old engine A is now destroyed — must NOT close AudioContext or stop Engine B's music!
        const closedOnA = releaseSharedAudioEngine(tokenA);
        expect(closedOnA).toBe(false);
        expect(getSharedAudioEngineOwnerCount()).toBe(1);
        expect(sharedB.isEngineDestroyed()).toBe(false);
        expect(getMockState()).not.toBe('closed');
        expect(sharedB.getActiveMusicSourceCount()).toBe(1);
        expect(sharedB.getCurrentTrackId()).toBe('BATTLE_NORMAL');

        // 4. Finally, Engine B is destroyed — last owner leaves, so AudioContext closes and sources become 0
        const closedOnB = releaseSharedAudioEngine(tokenB);
        expect(closedOnB).toBe(true);
        expect(getSharedAudioEngineOwnerCount()).toBe(0);
        expect(sharedB.isEngineDestroyed()).toBe(true);
        expect(sharedB.getActiveMusicSourceCount()).toBe(0);
        expect(getMockState()).toBe('closed');
    });

    it('exclusive ANNOUNCER group: one line at a time, higher rank interrupts, same or lower rank is dropped', async () => {
        // kill_7 刻意缺檔（unlock 會背景預載全部 SFX）：缺檔的高階不得打斷正在播的那一條
        vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('kill_7.mp3')
            ? { ok: false, status: 404 }
            : { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();
        for (let tier = 1; tier <= 7; tier++) await engine.loadBuffer(`assets/audio/local/Kill/kill_${tier}.mp3`);
        const lastSource = () => (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.results.at(-1)!.value;

        // 播報開關預設關閉
        expect(engine.getSettings().announcer).toBe(false);
        expect(engine.playCue('KILL_SPREE_3')).toBe(false);
        engine.setAnnouncerEnabled(true);

        expect(engine.playCue('KILL_SPREE_3')).toBe(true);
        const rampage = lastSource();
        expect(engine.playCue('KILL_SPREE_2')).toBe(false);
        expect(engine.playCue('KILL_SPREE_7')).toBe(false);
        expect(rampage.stop).not.toHaveBeenCalled();

        // 其他音效不受互斥群組影響
        expect(engine.playCue('HIT_LIGHT')).toBe(true);

        expect(engine.playCue('KILL_SPREE_5')).toBe(true);
        const unstoppable = lastSource();
        expect(rampage.stop).toHaveBeenCalledTimes(1);
        expect(engine.playCue('KILL_SPREE_4')).toBe(false);

        // 播完自然結束後，低階又可以播
        unstoppable.onended();
        expect(engine.playCue('KILL_SPREE_1')).toBe(true);

        // 關掉開關會停掉正在播的那一條，之後都不播
        const firstBlood = lastSource();
        engine.setAnnouncerEnabled(false);
        expect(firstBlood.stop).toHaveBeenCalledTimes(1);
        expect(engine.playCue('KILL_SPREE_6')).toBe(false);
        if (typeof window !== 'undefined') window.localStorage?.removeItem(AUDIO.STORAGE_KEY);
    });
});
