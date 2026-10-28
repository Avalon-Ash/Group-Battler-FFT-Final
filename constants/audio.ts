// ╔══════════════════════════════════════════════════════════╗
// ║  constants/audio.ts — 音訊系統與重擊門檻常數 SSOT           ║
// ║  職責：定義音訊引擎音量、發聲數、重擊傷害判定門檻           ║
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
    /** 擊殺播報（本機語音檔）預設關閉；沒有本機檔案時設定視窗不顯示開關 */
    DEFAULT_ANNOUNCER_ENABLED: false,
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

/** 具名參數：保持原值與運算次序。 */
export const AUDIO_ENGINE_PARAM = {
    /** 播放速率下限（倍） */
    MIN_PLAYBACK_RATE: 0.2,
    /** 淡化時間下限（秒） */
    MIN_FADE_S: 0.01,
    /** 淡化靜音端振幅（比例） */
    SILENT_GAIN: 0.0001,
    /** 淡化後清理餘量（毫秒） */
    FADE_CLEANUP_MARGIN_MS: 50,
    /** 閒置預載最長等待（毫秒） */
    PRELOAD_IDLE_TIMEOUT_MS: 4000,
    /** 視窗焦點變動淡化長度（秒） */
    FOCUS_FADE_S: 0.5,
} as const;

/** 具名參數：保持原值與運算次序。 */
export const AUDIO_EVENT_PARAM = {
    /** 結算音樂淡化長度（秒） */
    RESULT_FADE_S: 0.2,
    /** 震動音效強度上限（倍） */
    SHAKE_MAX_GAIN: 1.5,
    /** 震動音效強度下限（倍） */
    SHAKE_MIN_GAIN: 0.4,
    /** 震動強度轉音量倍率（倍） */
    SHAKE_GAIN_MULT: 2,
    /** 缺少世界座標時的格座標偏移（格） */
    FALLBACK_Q_OFFSET: 6,
    /** 缺少世界座標時每格換算距離（px／格） */
    FALLBACK_Q_SCALE: 100,
    /** 塌陷與落地音效強度（倍） */
    IMPACT_GAIN: 1.1,
    /** 縮圈音效強度（倍） */
    SHRINK_GAIN: 0.9,
    /** 背水一戰音效強度（倍） */
    LAST_STAND_GAIN: 1.4,
    /** 擊殺音效強度（倍） */
    KILL_GAIN: 1.2,
    /** 施法音效強度（倍） */
    CAST_GAIN: 0.8,
    /** 重擊音量上限（倍） */
    HEAVY_MAX_GAIN: 1.4,
    /** 重擊音量下限（倍） */
    HEAVY_MIN_GAIN: 0.9,
    /** 重擊音量標準傷害（HP） */
    HEAVY_DAMAGE_SCALE: 60,
    /** 輕擊音量上限（倍） */
    LIGHT_MAX_GAIN: 1.2,
    /** 輕擊音量下限（倍） */
    LIGHT_MIN_GAIN: 0.6,
    /** 輕擊音量標準傷害（HP） */
    LIGHT_DAMAGE_SCALE: 40,
    /** 範圍衝擊音效強度（倍） */
    AOE_GAIN: 1.2,
    /** 地面衝擊音效強度（倍） */
    GROUND_GAIN: 1.1,
    /** 閃避格擋音效強度（倍） */
    MISS_GAIN: 0.5,
    /** 緊張音樂切入的存活數上限（人） */
    TENSE_AGENT_COUNT: 4,
    /** 開場氛圍音樂淡化長度（秒） */
    INITIAL_FADE_S: 0.5,
} as const;
