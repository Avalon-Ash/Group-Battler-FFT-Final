import { AUDIO } from '../../constants';
import { SynthId } from '../../data/audio/cues';

/**
 * 獨立確定性 PRNG（mulberry32），種子來自 constants/audio.ts 的 AUDIO.PRNG_SEED。
 * 嚴禁呼叫 Math.random，以防止破壞視覺渲染與單元測試之確定性。
 */
export class AudioPRNG {
    private state: number;

    constructor(seed: number = AUDIO.PRNG_SEED) {
        this.state = seed >>> 0;
    }

    /** 產生 [0, 1) 的擬隨機浮點數 */
    public next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** 產生 [min, max) 範圍之隨機數 */
    public range(min: number, max: number): number {
        return min + (max - min) * this.next();
    }

    /** 重設 PRNG 種子 */
    public reset(seed: number = AUDIO.PRNG_SEED): void {
        this.state = seed >>> 0;
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

    let duration = 0.1;
    switch (synthId) {
        case 'HIT_LIGHT': duration = 0.09; break;
        case 'HIT_HEAVY': duration = 0.22; break;
        case 'SLASH': duration = 0.14; break;
        case 'BOW': duration = 0.12; break;
        case 'FIRE': duration = 0.30; break;
        case 'ICE': duration = 0.22; break;
        case 'HEAL': duration = 0.40; break;
        case 'DEATH': duration = 0.45; break;
        case 'SPAWN': duration = 0.25; break;
        case 'COLLAPSE': duration = 0.35; break;
        case 'RUMBLE': duration = 0.50; break;
        case 'STUN': duration = 0.25; break;
        case 'UI_CLICK': duration = 0.035; break;
        case 'UI_HOVER': duration = 0.03; break;
        case 'UI_START': duration = 0.35; break;
        case 'VICTORY': duration = 0.85; break;
        case 'DEFEAT': duration = 0.90; break;
        case 'BGM_PAD': duration = 4.00; break;
        default: duration = 0.1; break;
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
                const freq = 360 * Math.exp(-t * 25) + 60;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * 35);
                const noise = (prng.next() * 2 - 1) * Math.exp(-t * 120) * 0.4;
                data[i] = (Math.sin(phase) * 0.7 + noise) * env;
            }
            break;
        }

        case 'HIT_HEAVY': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = 200 * Math.exp(-t * 18) + 40;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * 14);
                const noise = (prng.next() * 2 - 1) * Math.exp(-t * 60) * 0.5;
                const sine = Math.sin(phase);
                // 輕微軟飽和失真增強重擊質感
                const drive = Math.tanh(sine * 2.0);
                data[i] = (drive * 0.75 + noise * 0.25) * env;
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
                const mod = Math.sin(TWO_PI * (800 + progress * 1400) * t);
                data[i] = noise * mod * env * 0.6;
            }
            break;
        }

        case 'BOW': {
            let phase1 = 0;
            let phase2 = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                phase1 += (TWO_PI * 240) / sampleRate;
                phase2 += (TWO_PI * 720) / sampleRate;
                const env = Math.exp(-t * 28);
                const snap = (prng.next() * 2 - 1) * Math.exp(-t * 180) * 0.5;
                data[i] = (Math.sin(phase1) * 0.6 + Math.sin(phase2) * 0.25 + snap) * env;
            }
            break;
        }

        case 'FIRE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const progress = t / duration;
                const env = Math.sin(progress * Math.PI) * Math.exp(-progress * 1.5);
                const noise = prng.next() * 2 - 1;
                const rumble = Math.sin(TWO_PI * 95 * t);
                data[i] = (noise * 0.6 + rumble * 0.4) * env * 0.75;
            }
            break;
        }

        case 'ICE': {
            // 晶瑩冰霜音（多重純音諧波快速衰減）
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * 22);
                const h1 = Math.sin(TWO_PI * 1250 * t) * 0.4;
                const h2 = Math.sin(TWO_PI * 1880 * t) * 0.35;
                const h3 = Math.sin(TWO_PI * 2520 * t) * 0.25;
                data[i] = (h1 + h2 + h3) * env;
            }
            break;
        }

        case 'HEAL': {
            // 溫暖大三和弦琶音
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq = 440;
                if (t > 0.12 && t <= 0.24) freq = 554.37;
                else if (t > 0.24) freq = 659.25;

                const env = Math.sin((t / duration) * Math.PI);
                const s = Math.sin(TWO_PI * freq * t);
                data[i] = s * env * 0.6;
            }
            break;
        }

        case 'DEATH': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = 160 * Math.exp(-t * 4.5) + 35;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.exp(-t * 5.5);
                const noise = (prng.next() * 2 - 1) * 0.15;
                data[i] = (Math.sin(phase) * 0.8 + noise) * env;
            }
            break;
        }

        case 'SPAWN': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = 300 + (t / duration) * 600;
                phase += (TWO_PI * freq) / sampleRate;
                const env = Math.sin((t / duration) * Math.PI);
                data[i] = Math.sin(phase) * env * 0.65;
            }
            break;
        }

        case 'COLLAPSE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * 8);
                const rumble = Math.sin(TWO_PI * 50 * t);
                const crack = (prng.next() * 2 - 1) * Math.exp(-((t - 0.05) ** 2) * 200);
                data[i] = (rumble * 0.5 + crack * 0.5) * env * 0.8;
            }
            break;
        }

        case 'RUMBLE': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.sin((t / duration) * Math.PI);
                const sub = Math.sin(TWO_PI * 42 * t);
                const sub2 = Math.sin(TWO_PI * 36 * t) * 0.5;
                data[i] = (sub + sub2) * env * 0.85;
            }
            break;
        }

        case 'STUN': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * 16);
                // 拍頻 8 Hz
                const ring1 = Math.sin(TWO_PI * 880 * t) * 0.5;
                const ring2 = Math.sin(TWO_PI * 888 * t) * 0.5;
                data[i] = (ring1 + ring2) * env;
            }
            break;
        }

        case 'UI_CLICK': {
            let phase = 0;
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                phase += (TWO_PI * 1400) / sampleRate;
                const env = Math.exp(-t * 90);
                const impulse = i < 10 ? 0.4 : 0;
                data[i] = (Math.sin(phase) * 0.6 + impulse) * env;
            }
            break;
        }

        case 'UI_HOVER': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const env = Math.exp(-t * 100);
                data[i] = Math.sin(TWO_PI * 880 * t) * env * 0.4;
            }
            break;
        }

        case 'UI_START': {
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const freq = t < 0.16 ? 523.25 : 659.25;
                const env = Math.sin((t / duration) * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * env * 0.7;
            }
            break;
        }

        case 'VICTORY': {
            // C5 -> E5 -> G5 -> C6
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq = 523.25;
                if (t >= 0.2 && t < 0.4) freq = 659.25;
                else if (t >= 0.4 && t < 0.6) freq = 783.99;
                else if (t >= 0.6) freq = 1046.50;

                const noteProgress = (t % 0.2) / 0.2;
                const noteEnv = t >= 0.6 ? Math.exp(-(t - 0.6) * 4) : Math.sin(noteProgress * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * noteEnv * 0.7;
            }
            break;
        }

        case 'DEFEAT': {
            // D4 -> C4 -> Bb3 -> A3
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                let freq = 293.66;
                if (t >= 0.22 && t < 0.44) freq = 261.63;
                else if (t >= 0.44 && t < 0.66) freq = 233.08;
                else if (t >= 0.66) freq = 220.00;

                const noteProgress = (t % 0.22) / 0.22;
                const noteEnv = t >= 0.66 ? Math.exp(-(t - 0.66) * 3) : Math.sin(noteProgress * Math.PI);
                data[i] = Math.sin(TWO_PI * freq * t) * noteEnv * 0.7;
            }
            break;
        }

        case 'BGM_PAD': {
            // 4 秒無縫循環氛圍鋪底音（A3 + E4 + A4 + C#5）
            for (let i = 0; i < len; i++) {
                const t = i / sampleRate;
                const s1 = Math.sin(TWO_PI * 220 * t) * 0.35;
                const s2 = Math.sin(TWO_PI * 330 * t) * 0.25;
                const s3 = Math.sin(TWO_PI * 440 * t) * 0.20;
                const s4 = Math.sin(TWO_PI * 554.37 * t) * 0.15;
                // 兩端淡入淡出保證無縫循環 (cosine window)
                const fade = Math.sin((t / duration) * Math.PI);
                data[i] = (s1 + s2 + s3 + s4) * fade * 0.5;
            }
            break;
        }
    }
}
