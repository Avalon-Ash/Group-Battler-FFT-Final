import React, { useEffect } from 'react';
import { useWindowActions, useWindowStore } from '../../../hooks/useWindowStore';
import { getTopmostMaximizedWindowId } from './windowStore';

export interface WindowLayerProps {
    children?: React.ReactNode;
}

const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Hosts the floating ToolWindows.
 * `display: contents` on purpose: the layer must NOT form a stacking context, otherwise window
 * z-indexes stay trapped inside it and a maximized window can never rise above the system menu.
 * Each ToolWindow is `position: fixed` with its own z-index from UI_Z.
 */
export const WindowLayer: React.FC<WindowLayerProps> = ({ children }) => {
    const windows = useWindowStore();
    const actions = useWindowActions();
    const topmostMaximized = getTopmostMaximizedWindowId(windows);

    // 最大化視窗蓋過選單鈕，所以要有鍵盤退路：Esc 還原最上層的最大化視窗
    useEffect(() => {
        if (!topmostMaximized) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            const target = e.target;
            if (target instanceof HTMLElement && TEXT_ENTRY_TAGS.has(target.tagName)) return;
            actions.maximize(topmostMaximized);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [topmostMaximized, actions]);

    return (
        <div id="window-layer" className="contents">
            {children}
        </div>
    );
};
