import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WindowId, WindowRect } from '../../../types';
import { UI_WINDOW } from '../../../constants';
import { WINDOW_DEF_MAP } from '../../../data/ui/windows';
import { useWindowState, useWindowActions, useTopmostOpenWindowId } from '../../../hooks/useWindowStore';
import { useWindowInteraction, ResizeDirection } from '../../../hooks/useWindowInteraction';
import { clampRect, getMaximizedRect } from './windowStore';
import { Icons } from '../icons';

export interface ToolWindowProps {
    id: WindowId;
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    className?: string;
    /** Classes for the scrollable content body (defaults to padded). Pass e.g. `p-0` for edge-to-edge content. */
    contentClassName?: string;
    onClose?: () => void;
}

function readViewport(): { width: number; height: number } {
    return typeof window !== 'undefined'
        ? { width: window.innerWidth, height: window.innerHeight }
        : UI_WINDOW.FALLBACK_VIEWPORT;
}

function useViewportSize(): { width: number; height: number } {
    const [viewport, setViewport] = useState(readViewport);
    useEffect(() => {
        const onResize = () => setViewport(readViewport());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return viewport;
}

export const ToolWindow: React.FC<ToolWindowProps> = ({
    id,
    title,
    icon,
    children,
    headerActions,
    className = '',
    contentClassName = 'p-3',
    onClose,
}) => {
    const windowRef = useRef<HTMLDivElement | null>(null);
    const state = useWindowState(id);
    const actions = useWindowActions();
    const topmostOpenId = useTopmostOpenWindowId();
    const [isCoarsePointer, setIsCoarsePointer] = useState(
        () => typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(pointer: coarse)').matches
    );
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(pointer: coarse)');
        const update = () => setIsCoarsePointer(mq.matches);
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);

    const def = WINDOW_DEF_MAP[id];
    const displayTitle = title ?? def?.title ?? id;
    const minSize = def?.minSize;
    const viewport = useViewportSize();
    const isNarrow = viewport.width <= UI_WINDOW.SHEET_BREAKPOINT;

    // Display rect is derived, never written back to the store: a saved layout survives a small
    // viewport and comes back once the viewport grows again. Maximized always follows the viewport.
    const storedRect = state?.rect ?? def?.defaultRect ?? UI_WINDOW.FALLBACK_RECT;
    const isMaximizedState = state?.isMaximized ?? false;
    const displayRect: WindowRect = useMemo(
        () => (isMaximizedState ? getMaximizedRect(viewport) : clampRect(storedRect, viewport, minSize)),
        [isMaximizedState, storedRect, viewport, minSize]
    );

    const dummyRef = useRef<HTMLDivElement | null>(null);
    const interactionRef = isNarrow ? dummyRef : windowRef;

    const {
        handleTitlePointerDown,
        handleTitlePointerMove,
        handleTitlePointerUp,
        handleTitleDoubleClick,
        handleResizePointerDown,
        handleResizePointerMove,
        handleResizePointerUp,
    } = useWindowInteraction({
        windowRef: interactionRef,
        rect: displayRect,
        minSize,
        isMaximized: state?.isMaximized ?? false,
        isCollapsed: state?.isCollapsed ?? false,
        onCommitRect: (rect) => actions.setRect(id, rect),
        onToggleMaximize: () => actions.maximize(id),
    });

    if (!state || !state.isOpen) {
        return null;
    }

    // Narrow screen (<=900px): only render the topmost open window as a bottom sheet.
    if (isNarrow && id !== topmostOpenId) {
        return null;
    }

    const isCollapsed = state.isCollapsed;
    const isMaximized = state.isMaximized;

    const maxSheetHeightPx = Math.round(viewport.height * (UI_WINDOW.SHEET_MAX_VH / 100));
    const windowStyle: React.CSSProperties = isNarrow
        ? {
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            top: 'auto',
            width: `${viewport.width}px`,
            maxWidth: '100vw',
            height: isCollapsed ? 'auto' : `${Math.min(displayRect.height, maxSheetHeightPx)}px`,
            maxHeight: `${UI_WINDOW.SHEET_MAX_VH}vh`,
            zIndex: state.zIndex,
            pointerEvents: 'auto',
            transition: 'none',
        }
        : {
            position: 'fixed',
            left: `${displayRect.x}px`,
            top: `${displayRect.y}px`,
            right: 'auto',
            bottom: 'auto',
            width: `${displayRect.width}px`,
            maxWidth: 'none',
            height: isCollapsed ? 'auto' : `${displayRect.height}px`,
            maxHeight: 'none',
            zIndex: state.zIndex,
            pointerEvents: 'auto',
            transition: 'none',
        };

    const windowClasses = isNarrow
        ? `liquid-card !rounded-t-2xl !rounded-b-none flex flex-col overflow-hidden shadow-2xl border-t border-x border-b-0 border-line-subtle/10 select-none bg-surface-panel/95 backdrop-blur-xl ${className}`
        : `liquid-card !rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-line-subtle/10 select-none bg-surface-panel/90 backdrop-blur-xl ${className}`;

    return (
        <div
            ref={windowRef}
            data-window-id={id}
            // Capture phase: title/handle handlers stop propagation, so raising must not rely on bubbling.
            onPointerDownCapture={() => actions.front(id)}
            onPointerDown={(e) => e.stopPropagation()}
            style={windowStyle}
            className={windowClasses}
        >
            {/* ── Title Bar ────────────────────────────────────────── */}
            <div
                data-window-titlebar="true"
                onPointerDown={isNarrow ? undefined : handleTitlePointerDown}
                onPointerMove={isNarrow ? undefined : handleTitlePointerMove}
                onPointerUp={isNarrow ? undefined : handleTitlePointerUp}
                onDoubleClick={isNarrow ? undefined : handleTitleDoubleClick}
                className={`h-10 px-3 bg-gradient-to-b from-line-subtle/10 to-transparent flex items-center justify-between border-b border-line-subtle/10 shrink-0 ${
                    isNarrow || isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{ touchAction: 'none' }}
            >
                <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                    {icon && <span className="text-accent-hover shrink-0">{icon}</span>}
                    <span className="font-mono font-bold text-xs text-text-base truncate tracking-tight">
                        {displayTitle}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0" data-no-drag="true">
                    {headerActions}

                    {/* Collapse Button */}
                    <button
                        type="button"
                        data-window-btn="collapse"
                        onClick={() => actions.collapse(id)}
                        title={isCollapsed ? '展開視窗' : '收合視窗'}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-white hover:bg-line-subtle/10 transition-colors"
                    >
                        <Icons.Minimize className="w-3 h-3" />
                    </button>

                    {/* Maximize Button: disabled on narrow bottom sheet */}
                    {!isNarrow && (
                        <button
                            type="button"
                            data-window-btn="maximize"
                            onClick={() => actions.maximize(id)}
                            title={isMaximized ? '還原視窗' : '最大化'}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-white hover:bg-line-subtle/10 transition-colors"
                        >
                            <Icons.Expand className="w-3 h-3" />
                        </button>
                    )}

                    {/* Close Button */}
                    <button
                        type="button"
                        data-window-btn="close"
                        onClick={() => {
                            onClose?.();
                            actions.close(id);
                        }}
                        title="關閉視窗"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-danger-hover hover:bg-danger/10 transition-colors"
                    >
                        <Icons.Close className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* ── Content Body ─────────────────────────────────────── */}
            {!isCollapsed && (
                <div
                    data-window-body="true"
                    className={`flex-1 overflow-auto relative text-text-base ${contentClassName}`}
                    style={{ touchAction: 'pan-y pan-x' }}
                >
                    {children}
                </div>
            )}

            {/* ── 8 Resize Handles (Hidden if Maximized, Collapsed, or on Narrow Bottom Sheet) ─ */}
            {!isMaximized && !isCollapsed && !isNarrow && RESIZE_DIRECTIONS.map((direction) => (
                <ResizeHandle
                    key={direction}
                    direction={direction}
                    style={getHandleStyle(direction, isCoarsePointer)}
                    onPointerDown={handleResizePointerDown}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                />
            ))}
        </div>
    );
};

/** Edges first, corners last so corners win overlaps in DOM order. */
const RESIZE_DIRECTIONS: ResizeDirection[] = ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'];

/**
 * Handle geometry. Top-side handles always use the fine thickness so they never
 * cover the title-bar buttons, even on touch devices.
 */
function getHandleStyle(direction: ResizeDirection, coarse: boolean): React.CSSProperties {
    const edge = coarse && !direction.includes('n') ? UI_WINDOW.HANDLE_PX_COARSE : UI_WINDOW.HANDLE_PX;
    const corner = coarse ? Math.max(edge * UI_WINDOW.HANDLE_CORNER_FACTOR, UI_WINDOW.TOUCH_TARGET_MIN_PX) : edge * UI_WINDOW.HANDLE_CORNER_FACTOR;
    const base: React.CSSProperties = {
        position: 'absolute',
        zIndex: UI_WINDOW.HANDLE_Z_INDEX,
        touchAction: 'none',
        cursor: `${direction}-resize`,
    };
    switch (direction) {
        case 'n': return { ...base, top: 0, left: corner, right: corner, height: edge };
        case 's': return { ...base, bottom: 0, left: corner, right: corner, height: edge };
        case 'w': return { ...base, left: 0, top: corner, bottom: corner, width: edge };
        case 'e': return { ...base, right: 0, top: corner, bottom: corner, width: edge };
        case 'nw': return { ...base, top: 0, left: 0, width: corner, height: corner };
        case 'ne': return { ...base, top: 0, right: 0, width: corner, height: corner };
        case 'sw': return { ...base, bottom: 0, left: 0, width: corner, height: corner };
        case 'se': return { ...base, bottom: 0, right: 0, width: corner, height: corner };
    }
}

interface ResizeHandleProps {
    direction: ResizeDirection;
    style: React.CSSProperties;
    onPointerDown: (direction: ResizeDirection, e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
    direction,
    style,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}) => {
    return (
        <div
            data-handle-direction={direction}
            onPointerDown={(e) => onPointerDown(direction, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={style}
        />
    );
};

