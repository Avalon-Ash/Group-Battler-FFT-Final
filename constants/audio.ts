// ╔══════════════════════════════════════════════════════════╗
// ║  constants/audio.ts — 音訊系統與重擊門檻常數 SSOT           ║
// ║  職責：定義音訊引擎音量、發聲數、重擊傷害判定門檻           ║
// ║  下游：engine/audio、engine/systems/audio                 ║
// ╚══════════════════════════════════════════════════════════╝

/** 重擊音效門檻：暴擊或單次傷害 ≥ 此值播 HIT_HEAVY（AudioSystem） */
export const AUDIO_HEAVY_HIT_DAMAGE = 80;

/**
 * 音訊系統參數 SSOT
 */
export const AUDIO = {
    MAX_VOICES: 24,
    CUE_THROTTLE_MS: 50,
    DEFAULT_MASTER_VOLUME: 0.8,
    DEFAULT_MUSIC_VOLUME: 0.6,
    DEFAULT_SFX_VOLUME: 0.8,
    DEFAULT_UI_VOLUME: 0.7,
    PAN_RANGE: 0.8,
    PITCH_JITTER: 0.08,
    VOLUME_JITTER: 0.05,
    PRNG_SEED: 133742,
    BGM_CROSSFADE_SEC: 1.5,
    PRELOAD_BATCH_SIZE: 8,
    SHOWCASE_SFX_GAIN: 0.2,
    STORAGE_KEY: 'tactical_audio_settings',
    QUERY_MUTE_KEY: 'mute',
    VOLUME_CURVE_EXPONENT: 2,
    SAMPLE_RATE: 44100
} as const;
