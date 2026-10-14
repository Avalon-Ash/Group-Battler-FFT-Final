import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AUDIO } from '../constants';
import { GameEngine } from '../engine/game';
import { AudioEngine } from '../engine/audio/AudioEngine';
import { AudioSystem } from '../engine/systems/audio/AudioSystem';
import { EventBus } from '../engine/events/EventBus';
import { Team, GameEvent } from '../types';

function createMockAudioContext() {
    let currentTime = 0;
    let state: AudioContextState = 'suspended';

    const createMockGainNode = () => ({
        gain: {
            value: 1,
            setValueAtTime: vi.fn(function (val: number) { this.value = val; }),
            linearRampToValueAtTime: vi.fn(function (val: number) { this.value = val; }),
            cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn()
    });

    const createMockBufferSource = () => ({
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
    });

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

    const createMockStereoPanner = () => ({
        pan: {
            value: 0,
            setValueAtTime: vi.fn(function (val: number) { this.value = val; })
        },
        connect: vi.fn(),
        disconnect: vi.fn()
    });

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

    return { ctx };
}

describe('AudioSystem (Event-to-Cue Bridge)', () => {
    let bus: EventBus;
    let mockCtx: ReturnType<typeof createMockAudioContext>;
    let audioEngine: AudioEngine;
    let audioSystem: AudioSystem;

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
        bus = new EventBus();
        mockCtx = createMockAudioContext();
        audioEngine = new AudioEngine({
            audioContext: mockCtx.ctx,
            skipUrlCheck: true,
            forceMute: false
        });
        audioSystem = new AudioSystem(bus, { audioEngine });
        // 既有測試針對手動（非展示）模式
        bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: false });
    });

    it('silently discards cues before user unlock (auto-play policy)', () => {
        const playCueSpy = vi.spyOn(audioEngine, 'playCue');
        
        bus.emit('GAME_EVENT', {
            type: 'DAMAGE',
            pos: { x: 300, y: 200 },
            value: 25
        } as GameEvent);

        expect(playCueSpy).toHaveBeenCalledWith('HIT_LIGHT', expect.objectContaining({ x: expect.any(Number) }));
        expect(playCueSpy.mock.results[0].value).toBe(false); // Discarded due to unlock policy
    });

    it('maps DAMAGE events to HIT_LIGHT and HIT_HEAVY based on damage and crit', () => {
        audioEngine.unlock();
        const playCueSpy = vi.spyOn(audioEngine, 'playCue');

        // Normal damage
        bus.emit('GAME_EVENT', {
            type: 'DAMAGE',
            pos: { x: 600, y: 300 },
            value: 20
        } as GameEvent);

        expect(playCueSpy).toHaveBeenCalledWith('HIT_LIGHT', expect.objectContaining({ x: 0.5 }));

        // Heavy / Critical damage
        bus.emit('GAME_EVENT', {
            type: 'DAMAGE',
            pos: { x: 900, y: 300 },
            value: 120,
            text: 'CRITICAL'
        } as GameEvent);

        expect(playCueSpy).toHaveBeenCalledWith('HIT_HEAVY', expect.objectContaining({ x: 0.75 }));
    });

    it('maps HEAL, CC_APPLIED, and CAMERA_SHAKE events', () => {
        audioEngine.unlock();
        const playCueSpy = vi.spyOn(audioEngine, 'playCue');

        bus.emit('GAME_EVENT', {
            type: 'HEAL',
            pos: { x: 300, y: 200 },
            value: 50
        } as GameEvent);
        expect(playCueSpy).toHaveBeenCalledWith('MAGIC_HEAL', expect.anything());

        bus.emit('GAME_EVENT', {
            type: 'CC_APPLIED',
            pos: { x: 400, y: 200 }
        } as GameEvent);
        expect(playCueSpy).toHaveBeenCalledWith('CC_STUN', expect.anything());

        bus.emit('CAMERA_SHAKE', { intensity: 0.5 });
        expect(playCueSpy).toHaveBeenCalledWith('RUMBLE', expect.objectContaining({ intensity: 1.0 }));
    });

    it('transitions BGM on GAME_START, AGENT_DIED casualties, and GAME_OVER', () => {
        audioEngine.unlock();
        const playMusicSpy = vi.spyOn(audioEngine, 'playMusic');

        // Battle starts
        bus.emit('GAME_START', {});
        expect(playMusicSpy).toHaveBeenCalledWith('BATTLE_NORMAL', AUDIO.BGM_CROSSFADE_SEC);

        // Casualties accumulate towards tense music threshold (<= 4 remaining)
        for (let i = 0; i < 6; i++) {
            bus.emit('AGENT_DIED', {
                agent: {} as any,
                groundZ: 0,
                impactX: 600,
                impactY: 300
            });
        }
        expect(playMusicSpy).toHaveBeenCalledWith('BATTLE_TENSE', AUDIO.BGM_CROSSFADE_SEC);

        // Victory
        bus.emit('GAME_OVER', { winner: Team.BLUE });
        expect(playMusicSpy).toHaveBeenCalledWith('VICTORY_STING', 0.2);
    });

    it('plays a distinct victory track for Red, and DEFEAT_STING for a draw', () => {
        audioEngine.unlock();
        const playMusicSpy = vi.spyOn(audioEngine, 'playMusic');

        bus.emit('GAME_OVER', { winner: Team.RED });
        expect(playMusicSpy).toHaveBeenCalledWith('VICTORY_RED_STING', 0.2);
        expect(playMusicSpy).not.toHaveBeenCalledWith('VICTORY_STING', 0.2);

        bus.emit('GAME_OVER', { winner: null });
        expect(playMusicSpy).toHaveBeenCalledWith('DEFEAT_STING', 0.2);
    });

    it('does not cut the result sting short on ENV_UPDATE, but resumes ambient after GAME_CLEAR', () => {
        audioEngine.unlock();
        bus.emit('GAME_OVER', { winner: Team.BLUE });
        const playMusicSpy = vi.spyOn(audioEngine, 'playMusic');

        bus.emit('ENV_UPDATE', {});
        expect(playMusicSpy).not.toHaveBeenCalled();

        bus.emit('GAME_CLEAR', {});
        expect(playMusicSpy).toHaveBeenCalledWith('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);
    });

    it('showcase mode: ambient BGM only (no battle/tense/result music), SFX bus ducked, restored on exit', () => {
        audioEngine.unlock();
        const setMixSpy = vi.spyOn(audioEngine, 'setShowcaseMix');
        const playMusicSpy = vi.spyOn(audioEngine, 'playMusic');
        const playCueSpy = vi.spyOn(audioEngine, 'playCue');

        bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: true });
        expect(setMixSpy).toHaveBeenLastCalledWith(true);

        bus.emit('GAME_START', {});
        for (let i = 0; i < 8; i++) {
            bus.emit('AGENT_DIED', { agent: {} as any, groundZ: 0, impactX: 600, impactY: 300 });
        }
        bus.emit('GAME_OVER', { winner: Team.RED });

        const tracks = playMusicSpy.mock.calls.map(c => c[0]);
        expect(tracks.every(t => t === 'SHOWCASE_AMBIENT')).toBe(true);
        const cues = playCueSpy.mock.calls.map(c => c[0]);
        expect(cues).not.toContain('VICTORY');
        expect(cues).not.toContain('DEFEAT');
        expect(cues).not.toContain('UI_START');

        bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: false });
        expect(setMixSpy).toHaveBeenLastCalledWith(false);
    });

    it('GameEngine with ?mute does not instantiate AudioSystem', () => {
        const prevLocation = (globalThis as unknown as { location?: unknown }).location;
        (globalThis as unknown as { location?: unknown }).location = { search: `?${AUDIO.QUERY_MUTE_KEY}` };

        try {
            const engine = new GameEngine();
            expect(engine.audio).toBeUndefined();
            engine.destroy();
        } finally {
            if (prevLocation !== undefined) {
                (globalThis as unknown as { location?: unknown }).location = prevLocation;
            } else {
                delete (globalThis as unknown as { location?: unknown }).location;
            }
        }
    });

    it('Task T2: full event sequence transitions ambient -> battle_normal -> tense -> victory -> ambient without duplicate tense triggers', () => {
        audioEngine.unlock();
        const playMusicSpy = vi.spyOn(audioEngine, 'playMusic');

        // 1. Showcase mode -> SHOWCASE_AMBIENT
        bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: true });
        expect(playMusicSpy).toHaveBeenLastCalledWith('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);

        // 2. Exit showcase + GAME_START -> BATTLE_NORMAL
        bus.emit('UI_COMMAND', { type: 'SET_SHOWCASE_MODE', enabled: false });
        bus.emit('GAME_START', {});
        expect(playMusicSpy).toHaveBeenLastCalledWith('BATTLE_NORMAL', AUDIO.BGM_CROSSFADE_SEC);

        // 3. 6 AGENT_DIED events (10 -> 4 remaining) -> triggers BATTLE_TENSE on 6th death
        playMusicSpy.mockClear();
        for (let i = 0; i < 6; i++) {
            bus.emit('AGENT_DIED', { agent: {} as never, groundZ: 0, impactX: 600, impactY: 300 });
        }
        expect(playMusicSpy).toHaveBeenCalledTimes(1);
        expect(playMusicSpy).toHaveBeenCalledWith('BATTLE_TENSE', AUDIO.BGM_CROSSFADE_SEC);

        // Additional deaths (remaining = 3, 2) do not re-invoke playMusic('BATTLE_TENSE')
        bus.emit('AGENT_DIED', { agent: {} as never, groundZ: 0, impactX: 600, impactY: 300 });
        expect(playMusicSpy).toHaveBeenCalledTimes(1);

        // 4. GAME_OVER -> VICTORY_STING
        bus.emit('GAME_OVER', { winner: Team.BLUE });
        expect(playMusicSpy).toHaveBeenLastCalledWith('VICTORY_STING', 0.2);

        // 5. GAME_CLEAR -> back to SHOWCASE_AMBIENT
        bus.emit('GAME_CLEAR', {});
        expect(playMusicSpy).toHaveBeenLastCalledWith('SHOWCASE_AMBIENT', AUDIO.BGM_CROSSFADE_SEC);
    });

    it('Task T2: creating and destroying two GameEngine instances in interleaved order preserves shared AudioEngine until last destroy', () => {
        const engine1 = new GameEngine();
        const engine2 = new GameEngine();

        expect(engine1.audio).toBeDefined();
        expect(engine2.audio).toBeDefined();
        const shared = engine1.audio!.getEngine();
        expect(engine2.audio!.getEngine()).toBe(shared);

        // Destroy engine1 first while engine2 is still alive
        engine1.destroy();
        expect(shared.isEngineDestroyed()).toBe(false);

        // Destroy engine2 -> last owner released, shared AudioEngine is now destroyed
        engine2.destroy();
        expect(shared.isEngineDestroyed()).toBe(true);
        expect(shared.getActiveMusicSourceCount()).toBe(0);
    });
});
