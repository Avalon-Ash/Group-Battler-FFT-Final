import type { AudioBusType } from '../../data/audio/cues';

export interface DirectorSettingsViewModel {
    readonly directorEnabled: boolean;
    readonly followStiffness: number;
    readonly zoomStiffness: number;
    readonly shakeStrength: number;
    readonly shakeOffFocus: number;
    readonly shakeMax: number;
}

export interface GameplaySettingsViewModel {
    readonly zoneEnabled: boolean;
    readonly initialRadius: number;
    readonly shrinkInterval: number;
    readonly minRadius: number;
    readonly battleFactions: number;
    readonly battleUnitsPerFaction: number;
    readonly battleFactionsMax?: number;
    readonly battleUnitsMax?: number;
}

interface AudioSettingsViewModel {
    readonly master: number;
    readonly music: number;
    readonly sfx: number;
    readonly ui: number;
    readonly muted: boolean;
    readonly announcer: boolean;
}

type ShowcaseTabKey = 'SYSTEM' | 'CAMERA' | 'VISUAL' | 'GAMEPLAY';
