import React, { Suspense } from 'react';
import { AppMode, WindowDef, WindowId } from '../../../types';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { Icons } from '../icons';
import { EmptyState } from '../primitives/EmptyState';
import { ToolWindow } from './ToolWindow';
import { windowStore } from './windowStore';

/**
 * Window bodies load on first open (U2): Showcase never shows them, so they stay out of the entry
 * chunk. The Suspense fallback lives inside the window frame, so opening one shows the same
 * chrome immediately and the body fills in. Add new windows here, not as static imports.
 */
const LogTab = React.lazy(() => import('../../inspector/tabs/LogTab').then((m) => ({ default: m.LogTab })));
const SkillDbTab = React.lazy(() => import('../../inspector/tabs/SkillDbTab').then((m) => ({ default: m.SkillDbTab })));
const VFXMapTab = React.lazy(() => import('../../inspector/tabs/VFXMapTab').then((m) => ({ default: m.VFXMapTab })));
const DirectorMonitorHUD = React.lazy(() => import('../DirectorMonitorHUD').then((m) => ({ default: m.DirectorMonitorHUD })));
const DirectorSettingsWindow = React.lazy(() => import('../settings/SettingsWindows').then((m) => ({ default: m.DirectorSettingsWindow })));
const GameplaySettingsWindow = React.lazy(() => import('../settings/SettingsWindows').then((m) => ({ default: m.GameplaySettingsWindow })));
const ShowcaseSettings = React.lazy(() => import('../showcase/ShowcaseSettings').then((m) => ({ default: m.ShowcaseSettings })));
const AudioSettingsWindow = React.lazy(() => import('../settings/AudioSettingsWindow').then((m) => ({ default: m.AudioSettingsWindow })));
const UnitInspectorBody = React.lazy(() => import('../inspector/UnitInspectorBody').then((m) => ({ default: m.UnitInspectorBody })));
const BehaviorTreeWindow = React.lazy(() => import('../behaviorTree/BehaviorTreeWindow').then((m) => ({ default: m.BehaviorTreeWindow })));

const WindowLoading: React.FC = () => (
    <EmptyState data-testid="window-loading" icon={<Icons.Database className="h-8 w-8" />} title="LOADING" />
);

// 視窗定義是純資料，由這裡（UI 組裝層）登錄進 store，data/ui 不反向依賴 components
windowStore.registerDefs(WINDOW_DEFINITIONS);

interface WindowRegistration {
    icon: React.ReactNode;
    /** Body is edge-to-edge (the tab manages its own padding/scrolling). */
    flush?: boolean;
    render: () => React.ReactNode;
}

/**
 * id → body component. Titles, default rects and min sizes live in `data/ui/windows.ts`;
 * this map only binds an id to React content. Windows migrate here one by one (U3 → U8).
 */
const WINDOW_REGISTRY: Partial<Record<WindowId, WindowRegistration>> = {
    logs: {
        icon: <Icons.Log className="w-4 h-4" />,
        flush: true,
        render: () => <LogTab />,
    },
    db: {
        icon: <Icons.Database className="w-4 h-4" />,
        flush: true,
        render: () => <SkillDbTab />,
    },
    vfxmap: {
        icon: <Icons.VFX className="w-4 h-4" />,
        flush: true,
        render: () => <VFXMapTab />,
    },
    inspector: {
        icon: <Icons.Select className="w-4 h-4" />,
        flush: true,
        render: () => (
            <UnitInspectorBody />
        ),
    },
    behaviorTree: {
        icon: <Icons.Tree className="w-4 h-4" />,
        flush: true,
        render: () => <BehaviorTreeWindow />,
    },
    monitor: {
        icon: <Icons.TV className="w-4 h-4" />,
        flush: true,
        render: () => <DirectorMonitorHUD />,
    },
    directorSettings: {
        icon: <Icons.TV className="w-4 h-4" />,
        flush: true,
        render: () => <DirectorSettingsWindow />,
    },
    zoneSettings: {
        icon: <Icons.Map className="w-4 h-4" />,
        flush: true,
        render: () => <GameplaySettingsWindow />,
    },
    showcaseSettings: {
        icon: <Icons.Settings className="w-4 h-4" />,
        flush: true,
        render: () => <ShowcaseSettings />,
    },
    audioSettings: {
        icon: <Icons.Volume className="w-4 h-4" />,
        flush: true,
        render: () => <AudioSettingsWindow />,
    },
};

/** 這個模式下可用的視窗（查 WindowDef.modes，契約 U1）。 */
export function filterWindowDefsByMode(defs: WindowDef[], mode: AppMode): WindowDef[] {
    return defs.filter((def) => def.modes.includes(mode));
}

/** Renders every registered window; closed windows render nothing (their body is unmounted). */
export const RegisteredWindows: React.FC<{ onCloseInspector?: () => void; mode: AppMode }> = ({
    onCloseInspector,
    mode,
}) => {
    const activeDefs = filterWindowDefsByMode(WINDOW_DEFINITIONS, mode);

    return (
        <>
            {activeDefs.map((def) => {
                const reg = WINDOW_REGISTRY[def.id];
                if (!reg) return null;
                return (
                    <ToolWindow
                        key={def.id}
                        id={def.id}
                        icon={reg.icon}
                        contentClassName={reg.flush ? 'p-0' : 'p-3'}
                        onClose={def.id === 'inspector' ? onCloseInspector : undefined}
                    >
                        <Suspense fallback={<WindowLoading />}>{reg.render()}</Suspense>
                    </ToolWindow>
                );
            })}
        </>
    );
};

export interface RegisteredWindowInfo {
    id: WindowId;
    title: string;
    icon: React.ReactNode;
}

export function getRegisteredWindows(mode?: AppMode): RegisteredWindowInfo[] {
    const defs = mode ? filterWindowDefsByMode(WINDOW_DEFINITIONS, mode) : WINDOW_DEFINITIONS;
    return defs.filter((def) => Boolean(WINDOW_REGISTRY[def.id])).map((def) => ({
        id: def.id,
        title: def.title,
        icon: WINDOW_REGISTRY[def.id]!.icon,
    }));
}

