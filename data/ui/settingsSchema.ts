import { UI_SETTINGS } from '../../constants';
import { UICommand } from '../../types';

export type SettingFieldKind = 'toggle' | 'slider';

export interface BaseSettingField {
    id: string;
    label: string;
    description?: string;
    kind: SettingFieldKind;
}

export interface ToggleSettingField extends BaseSettingField {
    kind: 'toggle';
    createCommand: (val: boolean) => UICommand;
}

export interface SliderSettingField extends BaseSettingField {
    kind: 'slider';
    min: number;
    max: number;
    step: number;
    format?: (val: number) => string;
    createCommand: (val: number) => UICommand;
}

export type SettingField = ToggleSettingField | SliderSettingField;

export interface SettingSection {
    id: string;
    title: string;
    icon?: string;
    fields: SettingField[];
}

export const DIRECTOR_SETTINGS_SCHEMA: SettingField[] = [
    {
        id: 'directorEnabled',
        label: '自動運鏡狀態',
        kind: 'toggle',
        createCommand: (enabled: boolean): UICommand => ({
            type: 'SET_DIRECTOR_ENABLED',
            enabled,
        }),
    },
    {
        id: 'followStiffness',
        label: '追蹤力度 (Damping)',
        kind: 'slider',
        min: UI_SETTINGS.CAMERA_STIFFNESS.min,
        max: UI_SETTINGS.CAMERA_STIFFNESS.sliderMax,
        step: UI_SETTINGS.CAMERA_STIFFNESS.step,
        format: (val: number) => val.toFixed(1),
        createCommand: (followStiffness: number): UICommand => ({
            type: 'SET_CAMERA_TUNING',
            followStiffness,
        }),
    },
    {
        id: 'zoomStiffness',
        label: '縮放阻尼 (Zoom)',
        kind: 'slider',
        min: UI_SETTINGS.CAMERA_STIFFNESS.min,
        max: UI_SETTINGS.CAMERA_STIFFNESS.sliderMax,
        step: UI_SETTINGS.CAMERA_STIFFNESS.step,
        format: (val: number) => val.toFixed(1),
        createCommand: (zoomStiffness: number): UICommand => ({
            type: 'SET_CAMERA_TUNING',
            zoomStiffness,
        }),
    },
];

export const ZONE_SETTINGS_SCHEMA: SettingField[] = [
    {
        id: 'zoneEnabled',
        label: '大逃殺模式開關',
        kind: 'toggle',
        createCommand: (enabled: boolean): UICommand => ({
            type: 'SET_ZONE_CONFIG',
            config: { enabled },
        }),
    },
    {
        id: 'initialRadius',
        label: '初始安全半徑',
        kind: 'slider',
        min: UI_SETTINGS.ZONE_INITIAL_RADIUS.min,
        max: UI_SETTINGS.ZONE_INITIAL_RADIUS.max,
        step: UI_SETTINGS.ZONE_INITIAL_RADIUS.step,
        format: (val: number) => String(Math.round(val)),
        createCommand: (initialRadius: number): UICommand => ({
            type: 'SET_ZONE_CONFIG',
            config: { initialRadius },
        }),
    },
    {
        id: 'shrinkInterval',
        label: '縮圈間隔 (秒)',
        kind: 'slider',
        min: UI_SETTINGS.ZONE_SHRINK_INTERVAL.min,
        max: UI_SETTINGS.ZONE_SHRINK_INTERVAL.max,
        step: UI_SETTINGS.ZONE_SHRINK_INTERVAL.step,
        format: (val: number) => String(Math.round(val)),
        createCommand: (shrinkInterval: number): UICommand => ({
            type: 'SET_ZONE_CONFIG',
            config: { shrinkInterval },
        }),
    },
    {
        id: 'minRadius',
        label: '極限圈半徑',
        kind: 'slider',
        min: UI_SETTINGS.ZONE_MIN_RADIUS.min,
        max: UI_SETTINGS.ZONE_MIN_RADIUS.max,
        step: UI_SETTINGS.ZONE_MIN_RADIUS.step,
        format: (val: number) => String(Math.round(val)),
        createCommand: (minRadius: number): UICommand => ({
            type: 'SET_ZONE_CONFIG',
            config: { minRadius },
        }),
    },
];
