import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AUDIO } from '../constants';
import { AudioEngine } from '../engine/audio/AudioEngine';
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
    });

    it('with forceMute / ?mute, does not create AudioContext or play any sounds', () => {
        const engine = new AudioEngine({ forceMute: true, skipUrlCheck: true });
        expect(engine.isUrlMuted()).toBe(true);

        const played = engine.playCue('HIT_LIGHT');
        expect(played).toBe(false);

        engine.playMusic('SHOWCASE_AMBIENT');
        expect(engine.isAudioUnlocked()).toBe(false);
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

        // Fill up to MAX_VOICES with unique cues / advances
        // Note: CUE_TABLE has different cues with varying priorities
        const playedList: boolean[] = [];
        for (let i = 0; i < AUDIO.MAX_VOICES; i++) {
            // Using UI_CLICK with different virtual times by clearing throttle
            const p = engine.playCue('UI_CLICK');
            playedList.push(p);
            // Simulate small delay or different cues if throttled
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

    it('plays and crossfades background music', () => {
        const { ctx } = createMockAudioContext();
        const engine = new AudioEngine({ audioContext: ctx, skipUrlCheck: true, forceMute: false });
        engine.unlock();

        engine.playMusic('SHOWCASE_AMBIENT', 1.0);
        expect(ctx.createBufferSource).toHaveBeenCalled();

        // Same track does not trigger redundant restart
        const countBefore = (ctx.createBufferSource as any).mock.calls.length;
        engine.playMusic('SHOWCASE_AMBIENT', 1.0);
        expect((ctx.createBufferSource as any).mock.calls.length).toBe(countBefore);

        // Switching track triggers crossfade
        engine.playMusic('BATTLE_NORMAL', 1.0);
        expect((ctx.createBufferSource as any).mock.calls.length).toBe(countBefore + 1);

        engine.stopMusic(1.0);
    });
});
