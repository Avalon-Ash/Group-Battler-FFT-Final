import React from 'react';
import { SchemaForm } from './SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    GAMEPLAY_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
import { useCommands, useView } from '../../../hooks/useEnginePort';
import {
    selectDirectorSettingsView,
    selectGameplaySettingsView,
} from '../../../engine/systems/ui/views/l2';
import type {
    DirectorSettingsViewModel,
    GameplaySettingsViewModel,
} from '../../../types/ui/l2';
import { UI_SETTINGS, SHAKE_DIRECTOR_PARAM } from '../../../constants';

export interface SettingsWindowProps {
    engine?: unknown;
}

const DEFAULT_DIRECTOR_SETTINGS: DirectorSettingsViewModel = Object.freeze({
    directorEnabled: true,
    followStiffness: UI_SETTINGS.CAMERA_STIFFNESS.followDefault,
    zoomStiffness: UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault,
    shakeStrength: SHAKE_DIRECTOR_PARAM.DEFAULT_STRENGTH,
    shakeOffFocus: SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE,
    shakeMax: SHAKE_DIRECTOR_PARAM.MAX_TRAUMA,
});

const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettingsViewModel = Object.freeze({
    zoneEnabled: true,
    initialRadius: UI_SETTINGS.ZONE_INITIAL_RADIUS.default,
    shrinkInterval: UI_SETTINGS.ZONE_SHRINK_INTERVAL.default,
    minRadius: UI_SETTINGS.ZONE_MIN_RADIUS.default,
    battleFactions: UI_SETTINGS.BATTLE_FACTIONS.default,
    battleUnitsPerFaction: UI_SETTINGS.BATTLE_UNITS_PER_FACTION.default,
});

export function useDirectorSettingsValues(_engine?: unknown): DirectorSettingsViewModel {
    const view = useView(selectDirectorSettingsView);
    return view ?? DEFAULT_DIRECTOR_SETTINGS;
}

export function useGameplaySettingsValues(_engine?: unknown): GameplaySettingsViewModel {
    const view = useView(selectGameplaySettingsView);
    return view ?? DEFAULT_GAMEPLAY_SETTINGS;
}

export const DirectorSettingsWindow: React.FC<SettingsWindowProps> = () => {
    const values = useDirectorSettingsValues();
    const { send } = useCommands();

    return (
        <div className="w-full h-full p-4 overflow-y-auto ui-scroll select-none">
            <SchemaForm
                fields={DIRECTOR_SETTINGS_SCHEMA}
                values={values}
                onChange={send}
            />
        </div>
    );
};

export const GameplaySettingsWindow: React.FC<SettingsWindowProps> = () => {
    const values = useGameplaySettingsValues();
    const { send } = useCommands();

    return (
        <div className="w-full h-full p-4 overflow-y-auto ui-scroll select-none">
            <SchemaForm
                fields={GAMEPLAY_SETTINGS_SCHEMA}
                values={values}
                onChange={send}
            />
        </div>
    );
};
