import { Team } from '../../types';

export type TrackId =
    | 'SHOWCASE_AMBIENT'
    | 'BATTLE_NORMAL'
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

/** 勝方陣營至勝利曲目對映（平手 / 無勝方時使用 DEFEAT_STING） */
export const WINNER_TO_VICTORY_TRACK: Record<Team, TrackId> = {
    [Team.BLUE]: 'VICTORY_STING',
    [Team.RED]: 'VICTORY_RED_STING'
};

