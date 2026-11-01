import { UI_SETTINGS } from '../../constants';
import { UICommand } from '../../types';

type SettingFieldKind = 'toggle' | 'slider';

interface BaseSettingField {
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
    {
        id: 'shakeStrength',
        label: '鏡頭震動強度（0＝關）',
        kind: 'slider',
        min: UI_SETTINGS.SHAKE_STRENGTH.min,
        max: UI_SETTINGS.SHAKE_STRENGTH.max,
        step: UI_SETTINGS.SHAKE_STRENGTH.step,
        format: (val: number) => `${Math.round(val * 100)}%`,
        createCommand: (strength: number): UICommand => ({
            type: 'SET_SHAKE_TUNING',
            strength,
        }),
    },
    {
        id: 'shakeOffFocus',
        label: '非焦點單位震動比例',
        kind: 'slider',
        min: UI_SETTINGS.SHAKE_OFF_FOCUS.min,
        max: UI_SETTINGS.SHAKE_OFF_FOCUS.max,
        step: UI_SETTINGS.SHAKE_OFF_FOCUS.step,
        format: (val: number) => `${Math.round(val * 100)}%`,
        createCommand: (offFocusScale: number): UICommand => ({
            type: 'SET_SHAKE_TUNING',
            offFocusScale,
        }),
    },
    {
        id: 'shakeMax',
        label: '震動上限',
        kind: 'slider',
        min: UI_SETTINGS.SHAKE_MAX.min,
        max: UI_SETTINGS.SHAKE_MAX.max,
        step: UI_SETTINGS.SHAKE_MAX.step,
        format: (val: number) => `${Math.round(val * 100)}%`,
        createCommand: (maxTrauma: number): UICommand => ({
            type: 'SET_SHAKE_TUNING',
            maxTrauma,
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
