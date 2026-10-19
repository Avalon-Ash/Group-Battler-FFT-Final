import { Team } from '../../types';

export type TrackId =
    | 'SHOWCASE_AMBIENT'
    | 'BATTLE_NORMAL'
    | 'BATTLE_VOID'
    | 'BATTLE_FOREST'
    | 'BATTLE_ICE'
    | 'BATTLE_MAGMA'
    | 'BATTLE_DESERT'
    | 'BATTLE_TENSE'
    | 'VICTORY_STING'
    | 'VICTORY_RED_STING'
    | 'DEFEAT_STING';

export interface MusicTrackDef {
    id: TrackId;
    title: string;
    files: string[];
    loop: boolean;
    loopStart?: number;
    loopEnd?: number;
    volume: number;
    synthPadRootFreq?: number;
}

/**
 * 背景音樂曲目表 SSOT
 */
export const MUSIC_TABLE: Record<TrackId, MusicTrackDef> = {
    SHOWCASE_AMBIENT: {
        id: 'SHOWCASE_AMBIENT',
        title: 'Soliloquy (Ambient Title)',
        files: ['assets/audio/music/soliloquy.ogg'],
        loop: true,
        volume: 0.65,
        synthPadRootFreq: 220.0 // A3
    },
    BATTLE_NORMAL: {
        id: 'BATTLE_NORMAL',
        title: 'Battle Music (Encounter)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 174.61 // F3
    },
    /**
     * 各地圖的戰鬥曲（2026-10-19 先打通通道；曲子是占位，正式版換曲只改 files，候選見 docs/BGM_CANDIDATES.md）。
     * 同一個檔案在 AudioEngine 以網址快取，只載入一次。synthPadRootFreq 是檔案載入失敗時的合成墊音根音，各圖錯開。
     */
    BATTLE_VOID: {
        id: 'BATTLE_VOID',
        title: 'Battle (Void, placeholder)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 138.59 // C#3
    },
    BATTLE_FOREST: {
        id: 'BATTLE_FOREST',
        title: 'Battle (Forest, placeholder)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 196.00 // G3
    },
    BATTLE_ICE: {
        id: 'BATTLE_ICE',
        title: 'Battle (Ice, placeholder)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 220.00 // A3
    },
    BATTLE_MAGMA: {
        id: 'BATTLE_MAGMA',
        title: 'Battle (Magma, placeholder)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 146.83 // D3
    },
    BATTLE_DESERT: {
        id: 'BATTLE_DESERT',
        title: 'Battle (Desert, placeholder)',
        files: ['assets/audio/music/battle_normal.ogg'],
        loop: true,
        volume: 0.70,
        synthPadRootFreq: 164.81 // E3
    },
    BATTLE_TENSE: {
        id: 'BATTLE_TENSE',
        title: 'Tiny Swords Duel (Tense Climax)',
        files: ['assets/audio/music/battle_tense.ogg'],
        loop: true,
        volume: 0.75,
        synthPadRootFreq: 146.83 // D3
    },
    VICTORY_STING: {
        id: 'VICTORY_STING',
        title: 'Victory Fanfare Short',
        files: ['assets/audio/music/victory_sting.ogg'],
        loop: false,
        volume: 0.85,
        synthPadRootFreq: 261.63 // C4
    },
    VICTORY_RED_STING: {
        id: 'VICTORY_RED_STING',
        title: 'Ashen Legion Triumph (Victory Theme, pitched down)',
        files: ['assets/audio/music/victory_red.ogg'],
        loop: false,
        volume: 0.80,
        synthPadRootFreq: 196.00 // G3
    },
    DEFEAT_STING: {
        id: 'DEFEAT_STING',
        title: 'Game Over - Repeating Dream',
        files: ['assets/audio/music/defeat_sting.ogg'],
        loop: false,
        volume: 0.80,
        synthPadRootFreq: 196.00 // G3
    }
};

/** 場景（SCENE_DB 的 id）→ 戰鬥曲；沒列的場景用 BATTLE_NORMAL。存活 ≤4 的緊張曲與勝敗曲各圖共用。 */
export const SCENE_BATTLE_TRACK: Readonly<Record<string, TrackId>> = {
    VOID: 'BATTLE_VOID',
    FOREST: 'BATTLE_FOREST',
    ICE: 'BATTLE_ICE',
    MAGMA: 'BATTLE_MAGMA',
    DESERT: 'BATTLE_DESERT',
};

export function battleTrackForScene(sceneId: string | undefined): TrackId {
    return (sceneId && SCENE_BATTLE_TRACK[sceneId]) || 'BATTLE_NORMAL';
}

/** 勝方陣營至勝利曲目對映（平手 / 無勝方時使用 DEFEAT_STING） */
export const WINNER_TO_VICTORY_TRACK: Record<Team, TrackId> = {
    [Team.BLUE]: 'VICTORY_STING',
    [Team.RED]: 'VICTORY_RED_STING'
};

