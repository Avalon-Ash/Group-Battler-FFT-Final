import { AUDIO } from '../../constants';

export type AudioBusType = 'master' | 'music' | 'sfx' | 'ui';

export type SynthId =
    | 'HIT_LIGHT'
    | 'HIT_HEAVY'
    | 'SLASH'
    | 'BOW'
    | 'FIRE'
    | 'ICE'
    | 'HEAL'
    | 'DEATH'
    | 'SPAWN'
    | 'COLLAPSE'
    | 'RUMBLE'
    | 'STUN'
    | 'UI_CLICK'
    | 'UI_HOVER'
    | 'UI_START'
    | 'VICTORY'
    | 'DEFEAT'
    | 'BGM_PAD';

export type CueId =
    | 'HIT_LIGHT'
    | 'HIT_HEAVY'
    | 'SLASH'
    | 'BOW'
    | 'SPELL_CAST'
    | 'MAGIC_FIRE'
    | 'MAGIC_ICE'
    | 'MAGIC_HEAL'
    | 'DEATH'
    | 'SPAWN'
    | 'COLLAPSE'
    | 'RUMBLE'
    | 'IMPACT_GROUND'
    | 'CC_STUN'
    | 'UI_CLICK'
    | 'UI_HOVER'
    | 'UI_START'
    | 'VICTORY'
    | 'DEFEAT';

export interface CueDef {
    files: string[];
    bus: AudioBusType;
    gain: number;
    throttleMs?: number;
    priority: number; // 1 (low) - 10 (high)
    pitchJitter?: number;
    synth: SynthId;
}

/**
 * 音訊 Cue 表 SSOT
 */
export const CUE_TABLE: Record<CueId, CueDef> = {
    HIT_LIGHT: {
        files: [],
        bus: 'sfx',
        gain: 0.7,
        throttleMs: AUDIO.CUE_THROTTLE_MS,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HIT_LIGHT'
    },
    HIT_HEAVY: {
        files: [],
        bus: 'sfx',
        gain: 0.9,
        throttleMs: 60,
        priority: 7,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HIT_HEAVY'
    },
    SLASH: {
        files: [],
        bus: 'sfx',
        gain: 0.6,
        throttleMs: 70,
        priority: 3,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'SLASH'
    },
    BOW: {
        files: [],
        bus: 'sfx',
        gain: 0.65,
        throttleMs: 80,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'BOW'
    },
    SPELL_CAST: {
        files: [],
        bus: 'sfx',
        gain: 0.75,
        throttleMs: 100,
        priority: 5,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HEAL'
    },
    MAGIC_FIRE: {
        files: [],
        bus: 'sfx',
        gain: 0.8,
        throttleMs: 90,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'FIRE'
    },
    MAGIC_ICE: {
        files: [],
        bus: 'sfx',
        gain: 0.75,
        throttleMs: 90,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'ICE'
    },
    MAGIC_HEAL: {
        files: [],
        bus: 'sfx',
        gain: 0.8,
        throttleMs: 120,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HEAL'
    },
    DEATH: {
        files: [],
        bus: 'sfx',
        gain: 0.85,
        throttleMs: 100,
        priority: 8,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'DEATH'
    },
    SPAWN: {
        files: [],
        bus: 'sfx',
        gain: 0.65,
        throttleMs: 100,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'SPAWN'
    },
    COLLAPSE: {
        files: [],
        bus: 'sfx',
        gain: 0.85,
        throttleMs: 150,
        priority: 8,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'COLLAPSE'
    },
    RUMBLE: {
        files: [],
        bus: 'sfx',
        gain: 0.7,
        throttleMs: 200,
        priority: 6,
        pitchJitter: 0.04,
        synth: 'RUMBLE'
    },
    IMPACT_GROUND: {
        files: [],
        bus: 'sfx',
        gain: 0.8,
        throttleMs: 120,
        priority: 7,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'COLLAPSE'
    },
    CC_STUN: {
        files: [],
        bus: 'sfx',
        gain: 0.75,
        throttleMs: 100,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'STUN'
    },
    UI_CLICK: {
        files: [],
        bus: 'ui',
        gain: 0.6,
        throttleMs: 40,
        priority: 5,
        pitchJitter: 0.04,
        synth: 'UI_CLICK'
    },
    UI_HOVER: {
        files: [],
        bus: 'ui',
        gain: 0.4,
        throttleMs: 50,
        priority: 2,
        pitchJitter: 0.02,
        synth: 'UI_HOVER'
    },
    UI_START: {
        files: [],
        bus: 'ui',
        gain: 0.85,
        throttleMs: 300,
        priority: 9,
        pitchJitter: 0.02,
        synth: 'UI_START'
    },
    VICTORY: {
        files: [],
        bus: 'ui',
        gain: 0.95,
        throttleMs: 500,
        priority: 10,
        pitchJitter: 0.0,
        synth: 'VICTORY'
    },
    DEFEAT: {
        files: [],
        bus: 'ui',
        gain: 0.9,
        throttleMs: 500,
        priority: 10,
        pitchJitter: 0.0,
        synth: 'DEFEAT'
    }
};

/**
 * 預設遊戲事件至 Cue 對映表
 */
export const EVENT_TO_CUE = {
    DAMAGE_LIGHT: 'HIT_LIGHT',
    DAMAGE_HEAVY: 'HIT_HEAVY',
    HEAL: 'MAGIC_HEAL',
    CC_APPLIED: 'CC_STUN',
    CAST_START: 'SPELL_CAST',
    DEATH: 'DEATH',
    SPAWN: 'SPAWN',
    KILL: 'HIT_HEAVY',
    KILL_STREAK: 'HIT_HEAVY',
    IMPACT_AOE: 'COLLAPSE',
    HAZARD_SPAWN: 'MAGIC_FIRE',
    GROUND_IMPACT: 'IMPACT_GROUND',
    TILE_COLLAPSED: 'COLLAPSE',
    ZONE_SHRUNK: 'COLLAPSE',
    LAST_STAND_TRIGGERED: 'RUMBLE',
    CAMERA_SHAKE: 'RUMBLE',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
} as const;
