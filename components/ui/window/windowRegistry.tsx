import React from 'react';
import type { GameEngine } from '../../../engine/game';
import { WindowId } from '../../../types';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { LogTab } from '../../inspector/tabs/LogTab';
import { Icons } from '../icons';
import { ToolWindow } from './ToolWindow';

/** Everything a window body may need from the host app. */
export interface WindowRenderContext {
    engine: GameEngine;
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
};

/** Renders every registered window; closed windows render nothing (their body is unmounted). */
export const RegisteredWindows: React.FC<WindowRenderContext> = (ctx) => (
    <>
        {WINDOW_DEFINITIONS.map((def) => {
            const reg = WINDOW_REGISTRY[def.id];
            if (!reg) return null;
            return (
                <ToolWindow
                    key={def.id}
                    id={def.id}
                    icon={reg.icon}
                    contentClassName={reg.flush ? 'p-0' : 'p-3'}
                >
                    {reg.render(ctx)}
                </ToolWindow>
            );
        })}
    </>
);
