import React, { useMemo } from 'react';
import { GameEngine } from '../../../engine/game';
import { SchemaForm } from './SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    ZONE_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
import { UI_SETTINGS } from '../../../constants';
import { useEngineView } from '../../../hooks/useEngineView';
import { useEngineCommands } from '../../../hooks/useEngineCommands';
import {
    selectDirectorView,
    selectCameraTuningView,
    selectZoneView,
} from '../../../engine/systems/ui/selectors';

export interface SettingsWindowProps {
    engine?: GameEngine;
}

export function useDirectorSettingsValues(engine?: GameEngine) {
    const directorView = useEngineView(engine, selectDirectorView);
    const cameraView = useEngineView(engine, selectCameraTuningView);

    return useMemo(
        () => ({
            directorEnabled: directorView?.enabled ?? true,
            followStiffness: cameraView?.followStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.followDefault,
            zoomStiffness: cameraView?.zoomStiffness ?? UI_SETTINGS.CAMERA_STIFFNESS.zoomDefault,
        }),
        [directorView?.enabled, cameraView?.followStiffness, cameraView?.zoomStiffness]
    );
}

export function useZoneSettingsValues(engine?: GameEngine) {
    const zoneView = useEngineView(engine, selectZoneView);

    return useMemo(
        () => ({
            zoneEnabled: zoneView?.enabled ?? true,
            initialRadius: zoneView?.initialRadius ?? UI_SETTINGS.ZONE_INITIAL_RADIUS.default,
            shrinkInterval: zoneView?.shrinkInterval ?? UI_SETTINGS.ZONE_SHRINK_INTERVAL.default,
            minRadius: zoneView?.minRadius ?? UI_SETTINGS.ZONE_MIN_RADIUS.default,
        }),
        [
            zoneView?.enabled,
            zoneView?.initialRadius,
            zoneView?.shrinkInterval,
            zoneView?.minRadius,
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

export const ZoneSettingsWindow: React.FC<SettingsWindowProps> = ({ engine }) => {
    const values = useZoneSettingsValues(engine);
    const { send } = useEngineCommands(engine);

    return (
        <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar select-none">
            <SchemaForm
                fields={ZONE_SETTINGS_SCHEMA}
                values={values}
                onChange={send}
            />
        </div>
    );
};
