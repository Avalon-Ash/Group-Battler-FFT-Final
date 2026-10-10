import React, { useMemo } from 'react';
import { GameEngine } from '../../../engine/game';
import { SchemaForm } from './SchemaForm';
import {
    DIRECTOR_SETTINGS_SCHEMA,
    ZONE_SETTINGS_SCHEMA,
} from '../../../data/ui/settingsSchema';
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

export const DirectorSettingsWindow: React.FC<SettingsWindowProps> = ({ engine }) => {
    const directorView = useEngineView(engine, selectDirectorView);
    const cameraView = useEngineView(engine, selectCameraTuningView);
    const { send } = useEngineCommands(engine);

    const values = useMemo(
        () => ({
            directorEnabled: directorView?.enabled ?? true,
            followStiffness: cameraView?.followStiffness ?? 3.5,
            zoomStiffness: cameraView?.zoomStiffness ?? 3.5,
        }),
        [directorView?.enabled, cameraView?.followStiffness, cameraView?.zoomStiffness]
    );

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
    const zoneView = useEngineView(engine, selectZoneView);
    const { send } = useEngineCommands(engine);

    const values = useMemo(
        () => ({
            zoneEnabled: zoneView?.enabled ?? true,
            initialRadius: zoneView?.initialRadius ?? 8,
            shrinkInterval: zoneView?.shrinkInterval ?? 15,
            minRadius: zoneView?.minRadius ?? 1,
        }),
        [
            zoneView?.enabled,
            zoneView?.initialRadius,
            zoneView?.shrinkInterval,
            zoneView?.minRadius,
        ]
    );

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
