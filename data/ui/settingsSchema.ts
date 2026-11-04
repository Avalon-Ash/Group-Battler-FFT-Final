import { UI_SETTINGS } from '../../constants';
import { UICommand } from '../../types';

type SettingFieldKind = 'heading' | 'toggle' | 'slider' | 'action';

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
    /** 動態上限：取 values[maxValueId]（數字時）取代 max */
    maxValueId?: string;
    createCommand: (val: number) => UICommand;
}

/** 分類抬頭：只顯示標題，不對應任何設定值。 */
interface HeadingSettingField extends BaseSettingField {
    kind: 'heading';
}

/** 動作按鈕：按下送出一個指令，不對應設定值。 */
interface ActionSettingField extends BaseSettingField {
    kind: 'action';
    createCommand: () => UICommand;
}

export type SettingField = HeadingSettingField | ToggleSettingField | SliderSettingField | ActionSettingField;

export const DIRECTOR_SETTINGS_SCHEMA: SettingField[] = [
    { id: 'headingDirector', label: 'DIRECTOR', kind: 'heading' },
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
        label: '追蹤力度',
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
        label: '縮放阻尼',
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
    { id: 'headingShake', label: 'CAMERA SHAKE', kind: 'heading' },
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
        label: '縮圈開關',
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
        label: '縮圈間隔',
        kind: 'slider',
        min: UI_SETTINGS.ZONE_SHRINK_INTERVAL.min,
        max: UI_SETTINGS.ZONE_SHRINK_INTERVAL.max,
        step: UI_SETTINGS.ZONE_SHRINK_INTERVAL.step,
        format: (val: number) => `${Math.round(val)} 秒`,
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

/** 遊戲玩法面板：開局陣營（下一局生效，按鈕立即重開）＋縮圈 */
export const GAMEPLAY_SETTINGS_SCHEMA: SettingField[] = [
    { id: 'headingFactions', label: 'FACTIONS', kind: 'heading' },
    {
        id: 'battleFactions',
        label: '陣營數量',
        kind: 'slider',
        min: UI_SETTINGS.BATTLE_FACTIONS.min,
        max: UI_SETTINGS.BATTLE_FACTIONS.max,
        maxValueId: 'battleFactionsMax',
        step: UI_SETTINGS.BATTLE_FACTIONS.step,
        format: (val: number) => `${Math.round(val)} 個`,
        createCommand: (factions: number): UICommand => ({
            type: 'SET_BATTLE_SETUP',
            setup: { factions },
        }),
    },
    {
        id: 'battleUnitsPerFaction',
        label: '每陣營人數（1＝大逃殺）',
        kind: 'slider',
        min: UI_SETTINGS.BATTLE_UNITS_PER_FACTION.min,
        max: UI_SETTINGS.BATTLE_UNITS_PER_FACTION.max,
        maxValueId: 'battleUnitsMax',
        step: UI_SETTINGS.BATTLE_UNITS_PER_FACTION.step,
        format: (val: number) => `${Math.round(val)} 人`,
        createCommand: (unitsPerFaction: number): UICommand => ({
            type: 'SET_BATTLE_SETUP',
            setup: { unitsPerFaction },
        }),
    },
    {
        id: 'battleApply',
        label: '套用並重新開局',
        description: '不按的話，下一局才換成新設定',
        kind: 'action',
        createCommand: (): UICommand => ({ type: 'APPLY_BATTLE_SETUP' }),
    },
    { id: 'headingZone', label: 'ZONE', kind: 'heading' },
    ...ZONE_SETTINGS_SCHEMA,
];
