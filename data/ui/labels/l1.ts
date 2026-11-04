import type { ReactNode } from 'react';
import { Role } from '../../../types';
import { OBSTACLE_DB } from '../../obstacles';
import { SCENE_DB } from '../../scenes';
import { BODY_TYPE_PROFILE } from '../../units/appearance/bodyTypes';

export interface L1SegmentedOption {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    title?: string;
    disabled?: boolean;
}

export interface L1SelectOption {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
}

export const ROLE_OPTIONS: L1SelectOption[] = [
    { value: Role.TANK, label: '坦克 (TANK)' },
    { value: Role.WARRIOR, label: '戰士 (WARRIOR)' },
    { value: Role.RANGER, label: '遊俠 (RANGER)' },
    { value: Role.MAGE, label: '法師 (MAGE)' },
    { value: Role.SUPPORT, label: '輔助 (SUPPORT)' },
];

export const SPAWN_MODE_OPTIONS: L1SegmentedOption[] = [
    { value: 'RANDOM', label: '隨機', title: '隨機職業配置' },
    { value: 'DRAFT', label: '指定', title: '指定固定職業' },
];

export const BODY_TYPE_OPTIONS: L1SegmentedOption[] = [
    { value: 'RANDOM', label: '隨機', title: '隨機體型' },
    ...Object.entries(BODY_TYPE_PROFILE)
        .filter(([_, profile]) => profile.enabled)
        .map(([typeKey, profile]) => ({
            value: typeKey,
            label: profile.label,
            title: `指定${profile.label}體型`,
        })),
];

export const LAYOUT_OPTIONS: L1SegmentedOption[] = [
    { value: 'FLAT', label: '平頂', title: '平頂六邊形佈局 (Flat Top)' },
    { value: 'POINTY', label: '尖頂', title: '尖頂六邊形佈局 (Pointy Top)' },
];

export const OBSTACLE_OPTIONS: L1SelectOption[] = Object.values(OBSTACLE_DB).map((o) => ({
    value: o.id,
    label: o.name,
}));

export const SCENE_OPTIONS: L1SelectOption[] = SCENE_DB.map((s) => ({
    value: s.id,
    label: s.name,
}));

export const MENU_DOT_CLASSES = {
    active: 'rounded-full bg-cyan-400',
    inactive: 'rounded-full bg-slate-600',
} as const;

export const MENU_SECTIONS = {
    windows: 'WINDOWS',
    actions: 'ACTIONS',
} as const;
