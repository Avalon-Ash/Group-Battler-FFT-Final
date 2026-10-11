export type TrackId =
    | 'SHOWCASE_AMBIENT'
    | 'BATTLE_NORMAL'
    | 'BATTLE_TENSE'
    | 'VICTORY_STING'
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
        title: 'Kingdom Dawn (Ambient)',
        files: [],
        loop: true,
        volume: 0.6,
        synthPadRootFreq: 220.0 // A3
    },
    BATTLE_NORMAL: {
        id: 'BATTLE_NORMAL',
        title: 'Tactical Encounter',
        files: [],
        loop: true,
        volume: 0.7,
        synthPadRootFreq: 174.61 // F3
    },
    BATTLE_TENSE: {
        id: 'BATTLE_TENSE',
        title: 'Edge of Ruin',
        files: [],
        loop: true,
        volume: 0.75,
        synthPadRootFreq: 146.83 // D3
    },
    VICTORY_STING: {
        id: 'VICTORY_STING',
        title: 'Victory Triumph',
        files: [],
        loop: false,
        volume: 0.85,
        synthPadRootFreq: 261.63 // C4
    },
    DEFEAT_STING: {
        id: 'DEFEAT_STING',
        title: 'Defeat Elegie',
        files: [],
        loop: false,
        volume: 0.8,
        synthPadRootFreq: 196.00 // G3
    }
};

/**
 * 遊戲模式與情境至音樂曲目之對映表
 */
export const MODE_TO_MUSIC = {
    SHOWCASE: 'SHOWCASE_AMBIENT',
    BATTLE: 'BATTLE_NORMAL',
    BATTLE_TENSE: 'BATTLE_TENSE',
    VICTORY: 'VICTORY_STING',
    DEFEAT: 'DEFEAT_STING'
} as const;
