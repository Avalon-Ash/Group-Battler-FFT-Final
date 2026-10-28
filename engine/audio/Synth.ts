import { SYNTH_PATCHES, SYNTH_DEFAULT_DURATION_S } from '../../data/audio/synthPatches';
import { mulberry32 } from '../math/hash';
import { AUDIO } from '../../constants';
import { SynthId } from '../../data/audio/cues';

/**
 * 獨立確定性 PRNG（mulberry32），種子來自 constants/audio.ts 的 AUDIO.PRNG_SEED。
 * 嚴禁呼叫 Math.random，以防止破壞視覺渲染與單元測試之確定性。
 */
export class AudioPRNG {
    private source: () => number;

    constructor(seed: number = AUDIO.PRNG_SEED) {
        this.source = mulberry32(seed);
    }

    /** 產生 [0, 1) 的擬隨機浮點數 */
    public next(): number {
        return this.source();
    }

    /** 產生 [min, max) 範圍之隨機數 */
    public range(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    /** 重設 PRNG 種子 */
    public reset(seed: number = AUDIO.PRNG_SEED): void {
        this.source = mulberry32(seed);
    }
}

// 模組層級專用 PRNG 實例
const defaultPRNG = new AudioPRNG(AUDIO.PRNG_SEED);

/** 快取預先生成的合成 AudioBuffer（依 sampleRate + SynthId） */
const synthBufferCache = new Map<string, AudioBuffer>();

/** 清除合成快取（供測試重置） */
export function clearSynthCache(): void {
    synthBufferCache.clear();
    defaultPRNG.reset(AUDIO.PRNG_SEED);
}

/**
 * 程序化合成 AudioBuffer 純函式生成器
 */
export function createSynthBuffer(
    ctx: BaseAudioContext,
    synthId: SynthId,
    prng: AudioPRNG = defaultPRNG
): AudioBuffer {
    const sampleRate = ctx.sampleRate || AUDIO.SAMPLE_RATE;
    const cacheKey = `${sampleRate}_${synthId}`;
    const cached = synthBufferCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    let duration = SYNTH_DEFAULT_DURATION_S;
    switch (synthId) {
        case 'HIT_LIGHT': duration = SYNTH_PATCHES.HIT_LIGHT.DURATION_S; break;
        case 'HIT_HEAVY': duration = SYNTH_PATCHES.HIT_HEAVY.DURATION_S; break;
        case 'SLASH': duration = SYNTH_PATCHES.SLASH.DURATION_S; break;
        case 'BOW': duration = SYNTH_PATCHES.BOW.DURATION_S; break;
        case 'FIRE': duration = SYNTH_PATCHES.FIRE.DURATION_S; break;
        case 'ICE': duration = SYNTH_PATCHES.ICE.DURATION_S; break;
        case 'HEAL': duration = SYNTH_PATCHES.HEAL.DURATION_S; break;
        case 'DEATH': duration = SYNTH_PATCHES.DEATH.DURATION_S; break;
        case 'SPAWN': duration = SYNTH_PATCHES.SPAWN.DURATION_S; break;
        case 'COLLAPSE': duration = SYNTH_PATCHES.COLLAPSE.DURATION_S; break;
        case 'RUMBLE': duration = SYNTH_PATCHES.RUMBLE.DURATION_S; break;
        case 'STUN': duration = SYNTH_PATCHES.STUN.DURATION_S; break;
        case 'UI_CLICK': duration = SYNTH_PATCHES.UI_CLICK.DURATION_S; break;
        case 'UI_HOVER': duration = SYNTH_PATCHES.UI_HOVER.DURATION_S; break;
        case 'UI_START': duration = SYNTH_PATCHES.UI_START.DURATION_S; break;
        case 'VICTORY': duration = SYNTH_PATCHES.VICTORY.DURATION_S; break;
        case 'DEFEAT': duration = SYNTH_PATCHES.DEFEAT.DURATION_S; break;
        case 'BGM_PAD': duration = SYNTH_PATCHES.BGM_PAD.DURATION_S; break;
        default: duration = SYNTH_DEFAULT_DURATION_S; break;
    }

    const length = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    generateWaveformData(synthId, data, sampleRate, duration, prng);
    synthBufferCache.set(cacheKey, buffer);
    return buffer;
}

/** 依 SynthId 填充 PCM 採樣數據 */
function generateWaveformData(
    synthId: SynthId,
    data: Float32Array,
    sampleRate: number,
    duration: number,
    prng: AudioPRNG
): void {
    const len = data.length;
    const TWO_PI = Math.PI * 2;

    switch (synthId) {
        case 'HIT_LIGHT': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = SYNTH_PATCHES.HIT_LIGHT.SWEEP_HZ * Math.exp(-t * SYNTH_PATCHES.HIT_LIGHT.SWEEP_DECAY) + SYNTH_PATCHES.HIT_LIGHT.BASE_HZ;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.HIT_LIGHT.ENV_DECAY);
                const noise = (prng.next() * 2 - 1) * Math.exp(-t * SYNTH_PATCHES.HIT_LIGHT.NOISE_DECAY) * SYNTH_PATCHES.HIT_LIGHT.NOISE_GAIN;
                data[i] = (Math.sin(phase) * SYNTH_PATCHES.HIT_LIGHT.TONE_GAIN + noise) * env;
            }
            break;
        }

        case 'HIT_HEAVY': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = SYNTH_PATCHES.HIT_HEAVY.SWEEP_HZ * Math.exp(-t * SYNTH_PATCHES.HIT_HEAVY.SWEEP_DECAY) + SYNTH_PATCHES.HIT_HEAVY.BASE_HZ;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.HIT_HEAVY.ENV_DECAY);
                const noise = (prng.next() * 2 - 1) * Math.exp(-t * SYNTH_PATCHES.HIT_HEAVY.NOISE_DECAY) * SYNTH_PATCHES.HIT_HEAVY.NOISE_GAIN;
                const sine = Math.sin(phase);
                // 輕微軟飽和失真增強重擊質感
                const drive = Math.tanh(sine * 2.0);
                data[i] = (drive * SYNTH_PATCHES.HIT_HEAVY.TONE_GAIN + noise * SYNTH_PATCHES.HIT_HEAVY.NOISE_MIX) * env;
            }
            break;
        }

        case 'SLASH': {
            // 帶通雜訊掃頻
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const progress = t / duration;
                const env = Math.sin(progress * Math.PI);
                const noise = prng.next() * 2 - 1;
                // 透過高頻正弦調變製造鋒刃破空聲
                const mod = Math.sin(TWO_PI * (SYNTH_PATCHES.SLASH.BASE_HZ + progress * SYNTH_PATCHES.SLASH.SWEEP_HZ) * t);
                data[i] = noise * mod * env * SYNTH_PATCHES.SLASH.GAIN;
            }
            break;
        }

        case 'BOW': {
            let phase1 = 0;
            let phase2 = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                phase1 += (TWO_PI * SYNTH_PATCHES.BOW.FUNDAMENTAL_HZ) / sampleRate;
                phase2 += (TWO_PI * SYNTH_PATCHES.BOW.HARMONIC_HZ) / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.BOW.ENV_DECAY);
                const snap = (prng.next() * 2 - 1) * Math.exp(-t * SYNTH_PATCHES.BOW.SNAP_DECAY) * SYNTH_PATCHES.BOW.SNAP_GAIN;
                data[i] = (Math.sin(phase1) * SYNTH_PATCHES.BOW.FUNDAMENTAL_GAIN + Math.sin(phase2) * SYNTH_PATCHES.BOW.HARMONIC_GAIN + snap) * env;
            }
            break;
        }

        case 'FIRE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const progress = t / duration;
                const env = Math.sin(progress * Math.PI) * Math.exp(-progress * SYNTH_PATCHES.FIRE.ENV_DECAY);
                const noise = prng.next() * 2 - 1;
                const rumble = Math.sin(TWO_PI * SYNTH_PATCHES.FIRE.RUMBLE_HZ * t);
                data[i] = (noise * SYNTH_PATCHES.FIRE.NOISE_GAIN + rumble * SYNTH_PATCHES.FIRE.RUMBLE_GAIN) * env * SYNTH_PATCHES.FIRE.GAIN;
            }
            break;
        }

        case 'ICE': {
            // 晶瑩冰霜音（多重純音諧波快速衰減）
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.ICE.ENV_DECAY);
                const h1 = Math.sin(TWO_PI * SYNTH_PATCHES.ICE.FIRST_HZ * t) * SYNTH_PATCHES.ICE.FIRST_GAIN;
                const h2 = Math.sin(TWO_PI * SYNTH_PATCHES.ICE.SECOND_HZ * t) * SYNTH_PATCHES.ICE.SECOND_GAIN;
                const h3 = Math.sin(TWO_PI * SYNTH_PATCHES.ICE.THIRD_HZ * t) * SYNTH_PATCHES.ICE.THIRD_GAIN;
                data[i] = (h1 + h2 + h3) * env;
            }
            break;
        }

        case 'HEAL': {
            // 溫暖大三和弦琶音
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq: number = SYNTH_PATCHES.HEAL.FIRST_HZ;
                if (t > SYNTH_PATCHES.HEAL.SECOND_TIME_S && t <= SYNTH_PATCHES.HEAL.THIRD_TIME_S) freq = SYNTH_PATCHES.HEAL.SECOND_HZ;
                else if (t > SYNTH_PATCHES.HEAL.THIRD_TIME_S) freq = SYNTH_PATCHES.HEAL.THIRD_HZ;

                const env = Math.sin((t / duration) * Math.PI);
                const s = Math.sin(TWO_PI * freq * t);
                data[i] = s * env * SYNTH_PATCHES.HEAL.GAIN;
            }
            break;
        }

        case 'DEATH': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = SYNTH_PATCHES.DEATH.SWEEP_HZ * Math.exp(-t * SYNTH_PATCHES.DEATH.SWEEP_DECAY) + SYNTH_PATCHES.DEATH.BASE_HZ;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.DEATH.ENV_DECAY);
                const noise = (prng.next() * 2 - 1) * SYNTH_PATCHES.DEATH.NOISE_GAIN;
                data[i] = (Math.sin(phase) * SYNTH_PATCHES.DEATH.TONE_GAIN + noise) * env;
            }
            break;
        }

        case 'SPAWN': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = SYNTH_PATCHES.SPAWN.BASE_HZ + (t / duration) * SYNTH_PATCHES.SPAWN.SWEEP_HZ;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.sin((t / duration) * Math.PI);
                data[i] = Math.sin(phase) * env * SYNTH_PATCHES.SPAWN.GAIN;
            }
            break;
        }

        case 'COLLAPSE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.COLLAPSE.ENV_DECAY);
                const rumble = Math.sin(TWO_PI * SYNTH_PATCHES.COLLAPSE.RUMBLE_HZ * t);
                const crack = (prng.next() * 2 - 1) * Math.exp(-((t - SYNTH_PATCHES.COLLAPSE.CRACK_TIME_S) ** 2) * SYNTH_PATCHES.COLLAPSE.CRACK_SHARPNESS);
                data[i] = (rumble * SYNTH_PATCHES.COLLAPSE.RUMBLE_GAIN + crack * SYNTH_PATCHES.COLLAPSE.CRACK_GAIN) * env * SYNTH_PATCHES.COLLAPSE.GAIN;
            }
            break;
        }

        case 'RUMBLE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.sin((t / duration) * Math.PI);
                const sub = Math.sin(TWO_PI * SYNTH_PATCHES.RUMBLE.FIRST_HZ * t);
                const sub2 = Math.sin(TWO_PI * SYNTH_PATCHES.RUMBLE.SECOND_HZ * t) * SYNTH_PATCHES.RUMBLE.SECOND_GAIN;
                data[i] = (sub + sub2) * env * SYNTH_PATCHES.RUMBLE.GAIN;
            }
            break;
        }

        case 'STUN': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.STUN.ENV_DECAY);
                // 拍頻 8 Hz
                const ring1 = Math.sin(TWO_PI * SYNTH_PATCHES.STUN.FIRST_HZ * t) * SYNTH_PATCHES.STUN.FIRST_GAIN;
                const ring2 = Math.sin(TWO_PI * SYNTH_PATCHES.STUN.SECOND_HZ * t) * SYNTH_PATCHES.STUN.SECOND_GAIN;
                data[i] = (ring1 + ring2) * env;
            }
            break;
        }

        case 'UI_CLICK': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                phase += (TWO_PI * SYNTH_PATCHES.UI_CLICK.TONE_HZ) / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.UI_CLICK.ENV_DECAY);
                const impulse = i < SYNTH_PATCHES.UI_CLICK.IMPULSE_SAMPLES ? SYNTH_PATCHES.UI_CLICK.IMPULSE_GAIN : 0;
                data[i] = (Math.sin(phase) * SYNTH_PATCHES.UI_CLICK.TONE_GAIN + impulse) * env;
            }
            break;
        }

        case 'UI_HOVER': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * SYNTH_PATCHES.UI_HOVER.ENV_DECAY);
                data[i] = Math.sin(TWO_PI * SYNTH_PATCHES.UI_HOVER.TONE_HZ * t) * env * SYNTH_PATCHES.UI_HOVER.GAIN;
            }
            break;
        }

        case 'UI_START': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = t < SYNTH_PATCHES.UI_START.NOTE_TIME_S ? SYNTH_PATCHES.UI_START.FIRST_HZ : SYNTH_PATCHES.UI_START.SECOND_HZ;
                const env = Math.sin((t / duration) * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * env * SYNTH_PATCHES.UI_START.GAIN;
            }
            break;
        }

        case 'VICTORY': {
            // C5 -> E5 -> G5 -> C6
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq: number = SYNTH_PATCHES.VICTORY.FIRST_HZ;
                if (t >= SYNTH_PATCHES.VICTORY.SECOND_TIME_S && t < SYNTH_PATCHES.VICTORY.THIRD_TIME_S) freq = SYNTH_PATCHES.VICTORY.SECOND_HZ;
                else if (t >= SYNTH_PATCHES.VICTORY.THIRD_TIME_S && t < SYNTH_PATCHES.VICTORY.LAST_TIME_S) freq = SYNTH_PATCHES.VICTORY.THIRD_HZ;
                else if (t >= SYNTH_PATCHES.VICTORY.LAST_TIME_S) freq = SYNTH_PATCHES.VICTORY.LAST_HZ;

                const noteProgress = (t % SYNTH_PATCHES.VICTORY.NOTE_S) / SYNTH_PATCHES.VICTORY.NOTE_S;
                const noteEnv = t >= SYNTH_PATCHES.VICTORY.LAST_TIME_S ? Math.exp(-(t - SYNTH_PATCHES.VICTORY.LAST_TIME_S) * SYNTH_PATCHES.VICTORY.RELEASE_DECAY) : Math.sin(noteProgress * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * noteEnv * SYNTH_PATCHES.VICTORY.GAIN;
            }
            break;
        }

        case 'DEFEAT': {
            // D4 -> C4 -> Bb3 -> A3
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq: number = SYNTH_PATCHES.DEFEAT.FIRST_HZ;
                if (t >= SYNTH_PATCHES.DEFEAT.SECOND_TIME_S && t < SYNTH_PATCHES.DEFEAT.THIRD_TIME_S) freq = SYNTH_PATCHES.DEFEAT.SECOND_HZ;
                else if (t >= SYNTH_PATCHES.DEFEAT.THIRD_TIME_S && t < SYNTH_PATCHES.DEFEAT.LAST_TIME_S) freq = SYNTH_PATCHES.DEFEAT.THIRD_HZ;
                else if (t >= SYNTH_PATCHES.DEFEAT.LAST_TIME_S) freq = SYNTH_PATCHES.DEFEAT.LAST_HZ;

                const noteProgress = (t % SYNTH_PATCHES.DEFEAT.NOTE_S) / SYNTH_PATCHES.DEFEAT.NOTE_S;
                const noteEnv = t >= SYNTH_PATCHES.DEFEAT.LAST_TIME_S ? Math.exp(-(t - SYNTH_PATCHES.DEFEAT.LAST_TIME_S) * SYNTH_PATCHES.DEFEAT.RELEASE_DECAY) : Math.sin(noteProgress * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * noteEnv * SYNTH_PATCHES.DEFEAT.GAIN;
            }
            break;
        }

        case 'BGM_PAD': {
            // 4 秒無縫循環氛圍鋪底音（A3 + E4 + A4 + C#5）
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const s1 = Math.sin(TWO_PI * SYNTH_PATCHES.BGM_PAD.FIRST_HZ * t) * SYNTH_PATCHES.BGM_PAD.FIRST_GAIN;
                const s2 = Math.sin(TWO_PI * SYNTH_PATCHES.BGM_PAD.SECOND_HZ * t) * SYNTH_PATCHES.BGM_PAD.SECOND_GAIN;
                const s3 = Math.sin(TWO_PI * SYNTH_PATCHES.BGM_PAD.THIRD_HZ * t) * SYNTH_PATCHES.BGM_PAD.THIRD_GAIN;
                const s4 = Math.sin(TWO_PI * SYNTH_PATCHES.BGM_PAD.FOURTH_HZ * t) * SYNTH_PATCHES.BGM_PAD.FOURTH_GAIN;
                // 兩端淡入淡出保證無縫循環 (cosine window)
                const fade = Math.sin((t / duration) * Math.PI);
                data[i] = (s1 + s2 + s3 + s4) * fade * SYNTH_PATCHES.BGM_PAD.GAIN;
            }
            break;
        }
    }
}
