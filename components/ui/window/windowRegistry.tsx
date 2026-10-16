import React from 'react';
import type { GameEngine } from '../../../engine/game';
import { WindowDef, WindowId } from '../../../types';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { LogTab } from '../../inspector/tabs/LogTab';
import { SkillDbTab } from '../../inspector/tabs/SkillDbTab';
import { VFXMapTab } from '../../inspector/tabs/VFXMapTab';
import { DirectorMonitorHUD } from '../DirectorMonitorHUD';
import { DirectorSettingsWindow, ZoneSettingsWindow } from '../settings/SettingsWindows';
import { ShowcaseSettings } from '../showcase/ShowcaseSettings';
import { AudioSettingsWindow } from '../settings/AudioSettingsWindow';
import { UnitInspectorBody } from '../inspector/UnitInspectorBody';
import { Icons } from '../icons';
import { ToolWindow } from './ToolWindow';

/** Everything a window body may need from the host app. */
export interface WindowRenderContext {
    engine: GameEngine;
    selectedAgentId?: string | null;
    onCloseInspector?: () => void;
}

interface WindowRegistration {
    icon: React.ReactNode;
    /** Body is edge-to-edge (the tab manages its own padding/scrolling). */
    flush?: boolean;
    render: (ctx: WindowRenderContext) => React.ReactNode;
}

/**
 * id → body component. Titles, default rects and min sizes live in `data/ui/windows.ts`;
 * this map only binds an id to React content. Windows migrate here one by one (U3 → U8).
 */
const WINDOW_REGISTRY: Partial<Record<WindowId, WindowRegistration>> = {
    logs: {
        icon: <Icons.Log className="w-4 h-4" />,
        flush: true,
        render: ({ engine }) => <LogTab engine={engine} />,
    },
    db: {
        icon: <Icons.Database className="w-4 h-4" />,
        flush: true,
        render: ({ engine }) => <SkillDbTab db={engine.skillDB} onUpdate={() => {}} />,
    },
    vfxmap: {
        icon: <Icons.VFX className="w-4 h-4" />,
        flush: true,
        render: () => <VFXMapTab />,
    },
    inspector: {
        icon: <Icons.Select className="w-4 h-4" />,
        flush: true,
        render: ({ engine, selectedAgentId }) => (
            <UnitInspectorBody engine={engine} agentId={selectedAgentId} />
        ),
    },
    monitor: {
        icon: <Icons.TV className="w-4 h-4" />,
        flush: true,
        render: ({ engine }) => <DirectorMonitorHUD engine={engine} />,
    },
    directorSettings: {
        icon: <Icons.TV className="w-4 h-4" />,
        flush: true,
        render: ({ engine }) => <DirectorSettingsWindow engine={engine} />,
    },
    zoneSettings: {
        icon: <span className="text-sm">🗺️</span>,
        flush: true,
        render: ({ engine }) => <ZoneSettingsWindow engine={engine} />,
    },
    showcaseSettings: {
        icon: <Icons.Settings className="w-4 h-4" />,
        flush: true,
        render: ({ engine }) => <ShowcaseSettings engine={engine} />,
    },
    audioSettings: {
        icon: <span className="text-sm">🔊</span>,
        flush: true,
        render: ({ engine }) => <AudioSettingsWindow engine={engine} />,
    },
};

/** Pure filtering helper by runtime mode. */
export function filterWindowDefsByMode(
    defs: WindowDef[],
    mode: 'showcase' | 'manual'
): WindowDef[] {
    return defs.filter((def) => {
        if (mode === 'showcase') return Boolean(def.visibleInShowcase);
        if (mode === 'manual') return def.visibleInManual !== false;
        return true;
    });
}

/** Renders every registered window; closed windows render nothing (their body is unmounted). */
export const RegisteredWindows: React.FC<
    WindowRenderContext & { showcaseMode?: boolean; isGameOver?: boolean }
> = ({
    engine,
    selectedAgentId,
    onCloseInspector,
    showcaseMode = false,
    isGameOver = false,
}) => {
    const mode = showcaseMode || isGameOver ? 'showcase' : 'manual';
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
                        {reg.render({ engine, selectedAgentId, onCloseInspector })}
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

export function getRegisteredWindows(mode?: 'showcase' | 'manual'): RegisteredWindowInfo[] {
    const defs = mode ? filterWindowDefsByMode(WINDOW_DEFINITIONS, mode) : WINDOW_DEFINITIONS;
    return defs.filter((def) => Boolean(WINDOW_REGISTRY[def.id])).map((def) => ({
        id: def.id,
        title: def.title,
        icon: WINDOW_REGISTRY[def.id]!.icon,
    }));
}

