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
    | 'KILL_SPREE_1'
    | 'KILL_SPREE_2'
    | 'KILL_SPREE_3'
    | 'KILL_SPREE_4'
    | 'KILL_SPREE_5'
    | 'KILL_SPREE_6'
    | 'KILL_SPREE_7'
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
    /** 檔案缺失或尚未載入時的程序化合成後備；省略則該次靜音 */
    synth?: SynthId;
    /** 檔案只放在本機 LOCAL_AUDIO_DIR（已 gitignore，不進 repo、不部署）：不列入 manifest，缺檔時靜音 */
    localOnly?: true;
    /** 互斥群組：同群組同一時間只播一條；rank 較高的打斷正在播的，相同或較低的丟掉 */
    exclusive?: { group: CueExclusiveGroup; rank: number };
}

export type CueExclusiveGroup = 'ANNOUNCER';

/** 本機音檔資料夾：版權素材由使用者自行放置，只供本機使用（見 docs/ASSET_LEDGER.md §7） */
export const LOCAL_AUDIO_DIR = 'assets/audio/local/';

/** KILL_SPREE 事件的 value（1＝全場首殺，2～7＝擊殺者本場累計擊殺數）→ 播報 Cue */
export const KILL_SPREE_CUE_BY_TIER: Readonly<Partial<Record<number, CueId>>> = {
    1: 'KILL_SPREE_1',
    2: 'KILL_SPREE_2',
    3: 'KILL_SPREE_3',
    4: 'KILL_SPREE_4',
    5: 'KILL_SPREE_5',
    6: 'KILL_SPREE_6',
    7: 'KILL_SPREE_7'
};

/** 累計擊殺播報：First Blood、Killing Spree、Rampage、Dominating、Unstoppable、Godlike、Massacre */
function killSpreeCue(tier: number): CueDef {
    return {
        files: [`${LOCAL_AUDIO_DIR}Kill/kill_${tier}.mp3`],
        bus: 'sfx',
        gain: 0.9,
        priority: 9,
        localOnly: true,
        exclusive: { group: 'ANNOUNCER', rank: tier }
    };
}

/**
 * 音訊 Cue 表 SSOT
 */
export const CUE_TABLE: Record<CueId, CueDef> = {
    KILL_SPREE_1: killSpreeCue(1),
    KILL_SPREE_2: killSpreeCue(2),
    KILL_SPREE_3: killSpreeCue(3),
    KILL_SPREE_4: killSpreeCue(4),
    KILL_SPREE_5: killSpreeCue(5),
    KILL_SPREE_6: killSpreeCue(6),
    KILL_SPREE_7: killSpreeCue(7),
    HIT_LIGHT: {
        files: [
            'assets/audio/sfx/hit_light_1.ogg',
            'assets/audio/sfx/hit_light_2.ogg',
            'assets/audio/sfx/hit_light_3.ogg',
            'assets/audio/sfx/hit_light_4.ogg'
        ],
        bus: 'sfx',
        gain: 0.65,
        throttleMs: AUDIO.CUE_THROTTLE_MS,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HIT_LIGHT'
    },
    HIT_HEAVY: {
        files: [
            'assets/audio/sfx/hit_heavy_1.ogg',
            'assets/audio/sfx/hit_heavy_2.ogg',
            'assets/audio/sfx/hit_heavy_3.ogg',
            'assets/audio/sfx/hit_heavy_4.ogg'
        ],
        bus: 'sfx',
        gain: 0.85,
        throttleMs: 60,
        priority: 7,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HIT_HEAVY'
    },
    SLASH: {
        files: [
            'assets/audio/sfx/slash_1.ogg',
            'assets/audio/sfx/slash_2.ogg',
            'assets/audio/sfx/slash_3.ogg',
            'assets/audio/sfx/slash_4.ogg'
        ],
        bus: 'sfx',
        gain: 0.65,
        throttleMs: 70,
        priority: 3,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'SLASH'
    },
    BOW: {
        files: [
            'assets/audio/sfx/bow_1.wav',
            'assets/audio/sfx/bow_2.wav',
            'assets/audio/sfx/bow_3.wav'
        ],
        bus: 'sfx',
        gain: 0.55,
        throttleMs: 80,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'BOW'
    },
    SPELL_CAST: {
        files: [
            'assets/audio/sfx/spell_cast_1.ogg',
            'assets/audio/sfx/spell_cast_2.ogg',
            'assets/audio/sfx/spell_cast_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.75,
        throttleMs: 100,
        priority: 5,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HEAL'
    },
    MAGIC_FIRE: {
        files: [
            'assets/audio/sfx/magic_fire_1.ogg',
            'assets/audio/sfx/magic_fire_2.ogg',
            'assets/audio/sfx/magic_fire_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.95,
        throttleMs: 90,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'FIRE'
    },
    MAGIC_ICE: {
        files: [
            'assets/audio/sfx/magic_ice_1.ogg',
            'assets/audio/sfx/magic_ice_2.ogg',
            'assets/audio/sfx/magic_ice_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.80,
        throttleMs: 90,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'ICE'
    },
    MAGIC_HEAL: {
        files: [
            'assets/audio/sfx/magic_heal_1.ogg',
            'assets/audio/sfx/magic_heal_2.ogg',
            'assets/audio/sfx/magic_heal_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.80,
        throttleMs: 120,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'HEAL'
    },
    DEATH: {
        files: [
            'assets/audio/sfx/death_1.ogg',
            'assets/audio/sfx/death_2.ogg',
            'assets/audio/sfx/death_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.80,
        throttleMs: 100,
        priority: 8,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'DEATH'
    },
    SPAWN: {
        files: [
            'assets/audio/sfx/spawn_1.ogg',
            'assets/audio/sfx/spawn_2.ogg',
            'assets/audio/sfx/spawn_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.65,
        throttleMs: 100,
        priority: 4,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'SPAWN'
    },
    COLLAPSE: {
        files: [
            'assets/audio/sfx/collapse_1.ogg',
            'assets/audio/sfx/collapse_2.ogg',
            'assets/audio/sfx/collapse_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.90,
        throttleMs: 150,
        priority: 8,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'COLLAPSE'
    },
    RUMBLE: {
        files: [
            'assets/audio/sfx/rumble_1.ogg',
            'assets/audio/sfx/rumble_2.ogg',
            'assets/audio/sfx/rumble_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.80,
        throttleMs: 200,
        priority: 6,
        pitchJitter: 0.04,
        synth: 'RUMBLE'
    },
    IMPACT_GROUND: {
        files: [
            'assets/audio/sfx/impact_ground_1.ogg',
            'assets/audio/sfx/impact_ground_2.ogg',
            'assets/audio/sfx/impact_ground_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.80,
        throttleMs: 120,
        priority: 7,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'COLLAPSE'
    },
    CC_STUN: {
        files: [
            'assets/audio/sfx/cc_stun_1.ogg',
            'assets/audio/sfx/cc_stun_2.ogg',
            'assets/audio/sfx/cc_stun_3.ogg'
        ],
        bus: 'sfx',
        gain: 0.75,
        throttleMs: 100,
        priority: 6,
        pitchJitter: AUDIO.PITCH_JITTER,
        synth: 'STUN'
    },
    UI_CLICK: {
        files: [
            'assets/audio/sfx/ui_click_1.ogg',
            'assets/audio/sfx/ui_click_2.ogg',
            'assets/audio/sfx/ui_click_3.ogg'
        ],
        bus: 'ui',
        gain: 0.45,
        throttleMs: 40,
        priority: 5,
        pitchJitter: 0.04,
        synth: 'UI_CLICK'
    },
    UI_HOVER: {
        files: [
            'assets/audio/sfx/ui_hover_1.ogg',
            'assets/audio/sfx/ui_hover_2.ogg',
            'assets/audio/sfx/ui_hover_3.ogg'
        ],
        bus: 'ui',
        gain: 0.30,
        throttleMs: 50,
        priority: 2,
        pitchJitter: 0.02,
        synth: 'UI_HOVER'
    },
    UI_START: {
        files: [
            'assets/audio/sfx/ui_start_1.ogg',
            'assets/audio/sfx/ui_start_2.ogg'
        ],
        bus: 'ui',
        gain: 0.75,
        throttleMs: 300,
        priority: 9,
        pitchJitter: 0.02,
        synth: 'UI_START'
    },
    VICTORY: {
        files: [
            'assets/audio/sfx/victory_1.ogg'
        ],
        bus: 'ui',
        gain: 0.85,
        throttleMs: 500,
        priority: 10,
        pitchJitter: 0.0,
        synth: 'VICTORY'
    },
    DEFEAT: {
        files: [
            'assets/audio/sfx/defeat_1.ogg',
            'assets/audio/sfx/defeat_2.ogg'
        ],
        bus: 'ui',
        gain: 0.80,
        throttleMs: 500,
        priority: 10,
        pitchJitter: 0.0,
        synth: 'DEFEAT'
    }
};

