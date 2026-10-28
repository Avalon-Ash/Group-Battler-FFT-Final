// 合成音色參數 SSOT；數值與運算順序保持原樣。
export const SYNTH_DEFAULT_DURATION_S = 0.1; // 未知音色的長度（秒）

export const SYNTH_PATCHES = {
    HIT_LIGHT: {
        /** 音色長度（秒） */
        DURATION_S: 0.09,
        /** 掃頻幅度（Hz） */
        SWEEP_HZ: 360,
        /** 掃頻衰減率（每秒） */
        SWEEP_DECAY: 25,
        /** 基礎頻率（Hz） */
        BASE_HZ: 60,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 35,
        /** 雜訊衰減率（每秒） */
        NOISE_DECAY: 120,
        /** 雜訊振幅（比例） */
        NOISE_GAIN: 0.4,
        /** 主音振幅（比例） */
        TONE_GAIN: 0.7,
    },
    HIT_HEAVY: {
        /** 音色長度（秒） */
        DURATION_S: 0.22,
        /** 掃頻幅度（Hz） */
        SWEEP_HZ: 200,
        /** 掃頻衰減率（每秒） */
        SWEEP_DECAY: 18,
        /** 基礎頻率（Hz） */
        BASE_HZ: 40,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 14,
        /** 雜訊衰減率（每秒） */
        NOISE_DECAY: 60,
        /** 雜訊振幅（比例） */
        NOISE_GAIN: 0.5,
        /** 主音振幅（比例） */
        TONE_GAIN: 0.75,
        /** 雜訊混音權重（比例） */
        NOISE_MIX: 0.25,
    },
    SLASH: {
        /** 音色長度（秒） */
        DURATION_S: 0.14,
        /** 基礎頻率（Hz） */
        BASE_HZ: 800,
        /** 掃頻幅度（Hz） */
        SWEEP_HZ: 1400,
        /** 輸出振幅（比例） */
        GAIN: 0.6,
    },
    BOW: {
        /** 音色長度（秒） */
        DURATION_S: 0.12,
        /** 諧波／音符頻率（Hz） */
        FUNDAMENTAL_HZ: 240,
        /** 諧波／音符頻率（Hz） */
        HARMONIC_HZ: 720,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 28,
        /** 弦擊衰減率（每秒） */
        SNAP_DECAY: 180,
        /** 弦擊振幅（比例） */
        SNAP_GAIN: 0.5,
        /** 諧波振幅（比例） */
        FUNDAMENTAL_GAIN: 0.6,
        /** 諧波振幅（比例） */
        HARMONIC_GAIN: 0.25,
    },
    FIRE: {
        /** 音色長度（秒） */
        DURATION_S: 0.3,
        /** 正規化進度包絡衰減率（無單位） */
        ENV_DECAY: 1.5,
        /** 諧波／音符頻率（Hz） */
        RUMBLE_HZ: 95,
        /** 雜訊振幅（比例） */
        NOISE_GAIN: 0.6,
        /** 諧波振幅（比例） */
        RUMBLE_GAIN: 0.4,
        /** 輸出振幅（比例） */
        GAIN: 0.75,
    },
    ICE: {
        /** 音色長度（秒） */
        DURATION_S: 0.22,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 22,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 1250,
        /** 諧波振幅（比例） */
        FIRST_GAIN: 0.4,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 1880,
        /** 諧波振幅（比例） */
        SECOND_GAIN: 0.35,
        /** 諧波／音符頻率（Hz） */
        THIRD_HZ: 2520,
        /** 諧波振幅（比例） */
        THIRD_GAIN: 0.25,
    },
    HEAL: {
        /** 音色長度（秒） */
        DURATION_S: 0.4,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 440,
        /** 音符切換時刻（秒） */
        SECOND_TIME_S: 0.12,
        /** 音符切換時刻（秒） */
        THIRD_TIME_S: 0.24,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 554.37,
        /** 諧波／音符頻率（Hz） */
        THIRD_HZ: 659.25,
        /** 輸出振幅（比例） */
        GAIN: 0.6,
    },
    DEATH: {
        /** 音色長度（秒） */
        DURATION_S: 0.45,
        /** 掃頻幅度（Hz） */
        SWEEP_HZ: 160,
        /** 掃頻衰減率（每秒） */
        SWEEP_DECAY: 4.5,
        /** 基礎頻率（Hz） */
        BASE_HZ: 35,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 5.5,
        /** 雜訊振幅（比例） */
        NOISE_GAIN: 0.15,
        /** 主音振幅（比例） */
        TONE_GAIN: 0.8,
    },
    SPAWN: {
        /** 音色長度（秒） */
        DURATION_S: 0.25,
        /** 基礎頻率（Hz） */
        BASE_HZ: 300,
        /** 掃頻幅度（Hz） */
        SWEEP_HZ: 600,
        /** 輸出振幅（比例） */
        GAIN: 0.65,
    },
    COLLAPSE: {
        /** 音色長度（秒） */
        DURATION_S: 0.35,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 8,
        /** 諧波／音符頻率（Hz） */
        RUMBLE_HZ: 50,
        /** 碎裂峰值時刻（秒） */
        CRACK_TIME_S: 0.05,
        /** 碎裂包絡集中係數（每秒平方） */
        CRACK_SHARPNESS: 200,
        /** 諧波振幅（比例） */
        RUMBLE_GAIN: 0.5,
        /** 諧波振幅（比例） */
        CRACK_GAIN: 0.5,
        /** 輸出振幅（比例） */
        GAIN: 0.8,
    },
    RUMBLE: {
        /** 音色長度（秒） */
        DURATION_S: 0.5,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 42,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 36,
        /** 諧波振幅（比例） */
        SECOND_GAIN: 0.5,
        /** 輸出振幅（比例） */
        GAIN: 0.85,
    },
    STUN: {
        /** 音色長度（秒） */
        DURATION_S: 0.25,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 16,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 880,
        /** 諧波振幅（比例） */
        FIRST_GAIN: 0.5,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 888,
        /** 諧波振幅（比例） */
        SECOND_GAIN: 0.5,
    },
    UI_CLICK: {
        /** 音色長度（秒） */
        DURATION_S: 0.035,
        /** 諧波／音符頻率（Hz） */
        TONE_HZ: 1400,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 90,
        /** 起音脈衝長度（樣本） */
        IMPULSE_SAMPLES: 10,
        /** 起音脈衝振幅（比例） */
        IMPULSE_GAIN: 0.4,
        /** 主音振幅（比例） */
        TONE_GAIN: 0.6,
    },
    UI_HOVER: {
        /** 音色長度（秒） */
        DURATION_S: 0.03,
        /** 包絡衰減率（每秒） */
        ENV_DECAY: 100,
        /** 諧波／音符頻率（Hz） */
        TONE_HZ: 880,
        /** 輸出振幅（比例） */
        GAIN: 0.4,
    },
    UI_START: {
        /** 音色長度（秒） */
        DURATION_S: 0.35,
        /** 音符切換時刻（秒） */
        NOTE_TIME_S: 0.16,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 523.25,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 659.25,
        /** 輸出振幅（比例） */
        GAIN: 0.7,
    },
    VICTORY: {
        /** 音色長度（秒） */
        DURATION_S: 0.85,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 523.25,
        /** 音符切換時刻（秒） */
        SECOND_TIME_S: 0.2,
        /** 音符切換時刻（秒） */
        THIRD_TIME_S: 0.4,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 659.25,
        /** 音符切換時刻（秒） */
        LAST_TIME_S: 0.6,
        /** 諧波／音符頻率（Hz） */
        THIRD_HZ: 783.99,
        /** 諧波／音符頻率（Hz） */
        LAST_HZ: 1046.5,
        /** 音符週期（秒） */
        NOTE_S: 0.2,
        /** 尾音衰減率（每秒） */
        RELEASE_DECAY: 4,
        /** 輸出振幅（比例） */
        GAIN: 0.7,
    },
    DEFEAT: {
        /** 音色長度（秒） */
        DURATION_S: 0.9,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 293.66,
        /** 音符切換時刻（秒） */
        SECOND_TIME_S: 0.22,
        /** 音符切換時刻（秒） */
        THIRD_TIME_S: 0.44,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 261.63,
        /** 音符切換時刻（秒） */
        LAST_TIME_S: 0.66,
        /** 諧波／音符頻率（Hz） */
        THIRD_HZ: 233.08,
        /** 諧波／音符頻率（Hz） */
        LAST_HZ: 220,
        /** 音符週期（秒） */
        NOTE_S: 0.22,
        /** 尾音衰減率（每秒） */
        RELEASE_DECAY: 3,
        /** 輸出振幅（比例） */
        GAIN: 0.7,
    },
    BGM_PAD: {
        /** 音色長度（秒） */
        DURATION_S: 4,
        /** 諧波／音符頻率（Hz） */
        FIRST_HZ: 220,
        /** 諧波振幅（比例） */
        FIRST_GAIN: 0.35,
        /** 諧波／音符頻率（Hz） */
        SECOND_HZ: 330,
        /** 諧波振幅（比例） */
        SECOND_GAIN: 0.25,
        /** 諧波／音符頻率（Hz） */
        THIRD_HZ: 440,
        /** 諧波振幅（比例） */
        THIRD_GAIN: 0.2,
        /** 諧波／音符頻率（Hz） */
        FOURTH_HZ: 554.37,
        /** 諧波振幅（比例） */
        FOURTH_GAIN: 0.15,
        /** 輸出振幅（比例） */
        GAIN: 0.5,
    },
} as const;
