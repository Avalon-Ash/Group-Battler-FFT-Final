import React, { useMemo } from 'react';
import { GameEngine } from '../../../engine/game';
import { SchemaForm } from './SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    GAMEPLAY_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
import { UI_SETTINGS, SHAKE_DIRECTOR_PARAM } from '../../../constants';
import { useEngineView } from '../../../hooks/useEngineView';
import { useEngineCommands } from '../../../hooks/useEngineCommands';
import {
    selectDirectorView,
    selectCameraTuningView,
    selectZoneView,
    selectShakeTuningView,
    selectBattleSetupView,
} from '../../../engine/systems/ui/selectors';

export interface SettingsWindowProps {
    engine?: GameEngine;
}

export function useDirectorSettingsValues(engine?: GameEngine) {
    const directorView = useEngineView(engine, selectDirectorView);
    const cameraView = useEngineView(engine, selectCameraTuningView);
    const shakeView = useEngineView(engine, selectShakeTuningView);

    return useMemo(
        () => ({
            directorEnabled: directorView?.enabled ?? true,
            followStiffness: cameraView?.followStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.followDefault,
            zoomStiffness: cameraView?.zoomStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault,
            shakeStrength: shakeView?.strength ?? SHAKE_DIRECTOR_PARAM.DEFAULT_STRENGTH,
            shakeOffFocus: shakeView?.offFocusScale ?? SHAKE_DIRECTOR_PARAM.OFF_FOCUS_SCALE,
            shakeMax: shakeView?.maxTrauma ?? SHAKE_DIRECTOR_PARAM.MAX_TRAUMA,
        }),
        [
            directorView?.enabled,
            cameraView?.followStiffness,
            cameraView?.zoomStiffness,
            shakeView?.strength,
            shakeView?.offFocusScale,
            shakeView?.maxTrauma,
        ]
    );
}

export function useGameplaySettingsValues(engine?: GameEngine) {
    const zoneView = useEngineView(engine, selectZoneView);
    const setupView = useEngineView(engine, selectBattleSetupView);

    return useMemo(
        () => ({
            zoneEnabled: zoneView?.enabled ?? true,
            initialRadius: zoneView?.initialRadius ?? UI_SETTINGS.ZONE_INITIAL_RADIUS.default,
            shrinkInterval: zoneView?.shrinkInterval ?? UI_SETTINGS.ZONE_SHRINK_INTERVAL.default,
            minRadius: zoneView?.minRadius ?? UI_SETTINGS.ZONE_MIN_RADIUS.default,
            battleFactions: setupView?.factions ?? UI_SETTINGS.BATTLE_FACTIONS.default,
            battleUnitsPerFaction: setupView?.unitsPerFaction ?? UI_SETTINGS.BATTLE_UNITS_PER_FACTION.default,
        }),
        [
            zoneView?.enabled,
            zoneView?.initialRadius,
            zoneView?.shrinkInterval,
            zoneView?.minRadius,
            setupView?.factions,
            setupView?.unitsPerFaction,
        ]
    );
}

export const DirectorSettingsWindow: React.FC<SettingsWindowProps> = ({ engine }) => {
    const values = useDirectorSettingsValues(engine);
    const { send } = useEngineCommands(engine);

    return (
        <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar select-none">
            <SchemaForm
                fields={DIRECTOR_SETTINGS_SCHEMA}
                values={values}
                onChange={send}
            />
        </div>
    );
};

export const GameplaySettingsWindow: React.FC<SettingsWindowProps> = ({ engine }) => {
    const values = useGameplaySettingsValues(engine);
    const { send } = useEngineCommands(engine);

    return (
        <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar select-none">
            <SchemaForm
                fields={GAMEPLAY_SETTINGS_SCHEMA}
                values={values}
                onChange={send}
            />
        </div>
    );
};
