import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioEngine } from '../engine/audio/AudioEngine';
import { clearSynthCache } from '../engine/audio/Synth';
import { AUDIO_ENGINE_PARAM } from '../constants';

type CtxState = AudioContextState | 'interrupted';

/** 像真的 AudioContext：有 statechange；resumeWorks 為 false 時 resume 不生效（iOS 上不算手勢的事件） */
function createCtx(initial: CtxState = 'suspended') {
    const events = new EventTarget();
    let state: CtxState = initial;
    const setState = (s: CtxState) => {
        if (s === state) return;
        state = s;
        events.dispatchEvent(new Event('statechange'));
    };
    const control = { resumeWorks: true };
    const gains: { gain: { value: number } }[] = [];
    const sources: { start: ReturnType<typeof vi.fn> }[] = [];
    const makeGain = () => {
        const node = {
            gain: {
                value: 1,
                setValueAtTime(v: number) { this.value = v; },
                linearRampToValueAtTime(v: number) { this.value = v; },
                cancelScheduledValues() { /* 假節點沒有排程 */ },
            },
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        gains.push(node);
        return node;
    };
    const ctx = {
        currentTime: 0,
        sampleRate: 44100,
        destination: {},
        get state() { return state; },
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        createGain: vi.fn(makeGain),
        createBufferSource: vi.fn(() => {
            const s = { buffer: null, loop: false, loopStart: 0, loopEnd: 0, playbackRate: { value: 1 }, onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
            sources.push(s);
            return s;
        }),
        createBuffer: vi.fn((_c: number, length: number, sampleRate: number) => ({ numberOfChannels: 1, length, sampleRate, duration: length / sampleRate, getChannelData: () => new Float32Array(length) })),
        createStereoPanner: vi.fn(),
        decodeAudioData: vi.fn(async () => ({ numberOfChannels: 1, length: 1, sampleRate: 44100, duration: 0, getChannelData: () => new Float32Array(1) })),
        resume: vi.fn(async () => { if (control.resumeWorks) setState('running'); }),
        suspend: vi.fn(async () => { setState('suspended'); }),
        close: vi.fn(async () => { setState('closed'); }),
    } as unknown as AudioContext;
    return { ctx, setState, control, gains, sources, resumeCalls: () => (ctx.resume as ReturnType<typeof vi.fn>).mock.calls.length };
}

describe('Audio wake', () => {
    let win: EventTarget;
    let doc: EventTarget & { hidden: boolean };
    const fire = (name: string) => win.dispatchEvent(new Event(name));
    const setHidden = (hidden: boolean) => {
        doc.hidden = hidden;
        doc.dispatchEvent(new Event('visibilitychange'));
    };
    const engines: AudioEngine[] = [];
    const make = (c: ReturnType<typeof createCtx>) => {
        const e = new AudioEngine({ audioContext: c.ctx, skipUrlCheck: true, forceMute: false });
        engines.push(e);
        return e;
    };
    /** 第一個建立的增益節點是總音量 */
    const master = (c: ReturnType<typeof createCtx>) => c.gains[0].gain.value;

    beforeEach(() => {
        clearSynthCache();
        win = new EventTarget();
        doc = Object.assign(new EventTarget(), { hidden: false });
        vi.stubGlobal('window', win);
        vi.stubGlobal('document', doc);
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        for (const e of engines.splice(0)) e.destroy();
        vi.unstubAllGlobals();
    });

    describe('gestures', () => {
        it('every gesture event the browser may accept tries to wake the context', () => {
            for (const name of AUDIO_ENGINE_PARAM.GESTURE_EVENTS) {
                const c = createCtx();
                make(c);
                fire(name);
                expect(c.resumeCalls(), name).toBe(1);
            }
        });

        it('covers touch: pointerdown is not a user activation on touch, touchend and click are', () => {
            expect(AUDIO_ENGINE_PARAM.GESTURE_EVENTS).toEqual(expect.arrayContaining(['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']));
        });

        it('a gesture that did not wake the context is retried by the next one', () => {
            const c = createCtx();
            const e = make(c);
            c.control.resumeWorks = false;
            fire('pointerdown');
            expect(e.isAudioUnlocked()).toBe(false);
            expect(e.playCue('HIT_LIGHT')).toBe(false);

            c.control.resumeWorks = true;
            fire('touchend');
            expect(c.resumeCalls()).toBe(2);
            expect(e.isAudioUnlocked()).toBe(true);
            expect(e.playCue('HIT_LIGHT')).toBe(true);
        });

        it('does not call resume while the context is already running', () => {
            const c = createCtx();
            make(c);
            fire('pointerdown');
            expect(c.resumeCalls()).toBe(1);
            fire('touchend');
            fire('click');
            expect(c.resumeCalls()).toBe(1);
        });

        it('a context that starts out running is usable and still recovers later', () => {
            const c = createCtx('running');
            const e = make(c);
            expect(e.isAudioUnlocked()).toBe(true);
            c.control.resumeWorks = false;
            c.setState('interrupted');
            c.control.resumeWorks = true;
            fire('touchend');
            expect(e.playCue('HIT_LIGHT')).toBe(true);
        });
    });

    describe('interruption', () => {
        /** 已經喚醒、正在播 */
        function running() {
            const c = createCtx();
            const e = make(c);
            fire('touchend');
            expect(e.isAudioUnlocked()).toBe(true);
            return { c, e };
        }

        it('after an iOS interruption a tap brings the sound back', () => {
            const { c, e } = running();
            c.control.resumeWorks = false;
            c.setState('interrupted');
            c.control.resumeWorks = true;
            fire('touchend');
            expect((c.ctx as unknown as { state: string }).state).toBe('running');
            expect(e.playCue('HIT_LIGHT')).toBe(true);
        });

        it('after a stop while the page is visible it tries to come back by itself', () => {
            const { c } = running();
            c.setState('interrupted');
            expect((c.ctx as unknown as { state: string }).state).toBe('running');
        });

        it('returning to the page wakes an interrupted context, not only a suspended one', () => {
            const { c } = running();
            c.control.resumeWorks = false;
            c.setState('interrupted');
            c.control.resumeWorks = true;
            const before = c.resumeCalls();
            setHidden(true);
            setHidden(false);
            expect(c.resumeCalls()).toBeGreaterThan(before);
            expect((c.ctx as unknown as { state: string }).state).toBe('running');
        });

        it('a page restored from the back-forward cache wakes up', () => {
            const { c } = running();
            c.control.resumeWorks = false;
            c.setState('suspended');
            c.control.resumeWorks = true;
            fire('pageshow');
            expect((c.ctx as unknown as { state: string }).state).toBe('running');
        });

        it('stays stopped while the page is hidden: no fighting with its own suspend', () => {
            const { c } = running();
            const before = c.resumeCalls();
            setHidden(true);
            expect((c.ctx as unknown as { state: string }).state).toBe('suspended');
            expect(c.resumeCalls()).toBe(before);
        });

        it('cues are dropped while the context is stopped, so voices do not pile up for a burst later', () => {
            const { c, e } = running();
            c.control.resumeWorks = false;
            c.setState('interrupted');
            const started = c.sources.length;
            for (let i = 0; i < 40; i++) expect(e.playCue('HIT_LIGHT')).toBe(false);
            expect(c.sources.length).toBe(started);
        });
    });

    describe('master gain after losing focus', () => {
        function fadedOut() {
            const c = createCtx();
            const e = make(c);
            fire('touchend');
            const full = master(c);
            expect(full).toBeGreaterThan(AUDIO_ENGINE_PARAM.SILENT_GAIN);
            fire('blur');
            expect(master(c)).toBe(AUDIO_ENGINE_PARAM.SILENT_GAIN);
            return { c, e, full };
        }

        it('focus restores it', () => {
            const { c, full } = fadedOut();
            fire('focus');
            expect(master(c)).toBeCloseTo(full);
        });

        it('returning to the page restores it when focus never fires', () => {
            const { c, full } = fadedOut();
            setHidden(true);
            setHidden(false);
            expect(master(c)).toBeCloseTo(full);
        });

        it('a tap restores it when focus never fires', () => {
            const { c, full } = fadedOut();
            fire('touchend');
            expect(master(c)).toBeCloseTo(full);
        });

        it('pageshow restores it', () => {
            const { c, full } = fadedOut();
            fire('pageshow');
            expect(master(c)).toBeCloseTo(full);
        });

        it('a tap with nothing faded leaves the gain schedule alone', () => {
            const c = createCtx();
            make(c);
            fire('touchend');
            const spy = vi.spyOn(c.gains[0].gain as unknown as { linearRampToValueAtTime: () => void }, 'linearRampToValueAtTime');
            fire('touchend');
            expect(spy).not.toHaveBeenCalled();
        });

        it('stays silent when the user muted it', () => {
            const { c, e } = fadedOut();
            e.setMuted(true);
            fire('touchend');
            setHidden(true);
            setHidden(false);
            fire('focus');
            expect(master(c)).toBe(0);
        });
    });

    it('unmuting wakes a context that stayed stopped while muted', () => {
        const c = createCtx();
        const e = make(c);
        fire('touchend');
        e.setMuted(true);
        c.control.resumeWorks = false;
        setHidden(true);
        setHidden(false);
        c.control.resumeWorks = true;
        e.setMuted(false);
        expect((c.ctx as unknown as { state: string }).state).toBe('running');
    });

    it('destroy removes every listener', () => {
        const c = createCtx();
        const e = make(c);
        fire('touchend');
        e.destroy();
        const before = c.resumeCalls();
        for (const name of AUDIO_ENGINE_PARAM.GESTURE_EVENTS) fire(name);
        fire('pageshow');
        fire('focus');
        setHidden(false);
        c.setState('suspended');
        expect(c.resumeCalls()).toBe(before);
    });
});
