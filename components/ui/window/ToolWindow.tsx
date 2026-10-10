import React, { useRef, useState } from 'react';
import { WindowId } from '../../../types';
import { UI_WINDOW } from '../../../constants';
import { WINDOW_DEF_MAP } from '../../../data/ui/windows';
import { useWindowState, useWindowActions } from '../../../hooks/useWindowStore';
import { useWindowInteraction, ResizeDirection } from '../../../hooks/useWindowInteraction';
import { Icons } from '../icons';

export interface ToolWindowProps {
    id: WindowId;
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    className?: string;
}

export const ToolWindow: React.FC<ToolWindowProps> = ({
    id,
    title,
    icon,
    children,
    headerActions,
    className = '',
}) => {
    const windowRef = useRef<HTMLDivElement | null>(null);
    const state = useWindowState(id);
    const actions = useWindowActions();
    const [isCoarsePointer] = useState(
        () => typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(pointer: coarse)').matches
    );

    const def = WINDOW_DEF_MAP[id];
    const displayTitle = title ?? def?.title ?? id;
    const minSize = def?.minSize;

    const {
        handleTitlePointerDown,
        handleTitlePointerMove,
        handleTitlePointerUp,
        handleTitleDoubleClick,
        handleResizePointerDown,
        handleResizePointerMove,
        handleResizePointerUp,
    } = useWindowInteraction({
        windowRef,
        rect: state?.rect ?? def?.defaultRect ?? UI_WINDOW.FALLBACK_RECT,
        minSize,
        isMaximized: state?.isMaximized ?? false,
        isCollapsed: state?.isCollapsed ?? false,
        onCommitRect: (rect) => actions.setRect(id, rect),
        onToggleMaximize: () => actions.maximize(id),
    });

    if (!state || !state.isOpen) {
        return null;
    }

    const isCollapsed = state.isCollapsed;
    const isMaximized = state.isMaximized;

    return (
        <div
            ref={windowRef}
            data-window-id={id}
            // Capture phase: title/handle handlers stop propagation, so raising must not rely on bubbling.
            onPointerDownCapture={() => actions.front(id)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                left: `${state.rect.x}px`,
                top: `${state.rect.y}px`,
                width: `${state.rect.width}px`,
                height: isCollapsed ? 'auto' : `${state.rect.height}px`,
                zIndex: state.zIndex,
                pointerEvents: 'auto',
            }}
            className={`liquid-card !rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-white/10 select-none bg-slate-900/90 backdrop-blur-xl ${className}`}
        >
            {/* ── Title Bar ────────────────────────────────────────── */}
            <div
                onPointerDown={handleTitlePointerDown}
                onPointerMove={handleTitlePointerMove}
                onPointerUp={handleTitlePointerUp}
                onDoubleClick={handleTitleDoubleClick}
                className={`h-10 px-3 bg-gradient-to-b from-white/10 to-transparent flex items-center justify-between border-b border-white/10 shrink-0 ${
                    isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                }`}
                style={{ touchAction: 'none' }}
            >
                <div className="flex items-center gap-2 overflow-hidden pointer-events-none">
                    {icon && <span className="text-cyan-400 shrink-0">{icon}</span>}
                    <span className="font-mono font-bold text-xs text-slate-200 truncate tracking-tight">
                        {displayTitle}
                    </span>
                </div>

                <div className="flex items-center gap-1 shrink-0" data-no-drag="true">
                    {headerActions}

                    {/* Collapse Button */}
                    <button
                        type="button"
                        onClick={() => actions.collapse(id)}
                        title={isCollapsed ? '展開視窗' : '收合視窗'}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Icons.Minimize className="w-3 h-3" />
                    </button>

                    {/* Maximize Button */}
                    <button
                        type="button"
                        onClick={() => actions.maximize(id)}
                        title={isMaximized ? '還原視窗' : '最大化'}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <Icons.Expand className="w-3 h-3" />
                    </button>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => actions.close(id)}
                        title="關閉視窗"
                        className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <Icons.Close className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* ── Content Body ─────────────────────────────────────── */}
            {!isCollapsed && (
                <div
                    className="flex-1 overflow-auto relative p-3 text-slate-200"
                    style={{ touchAction: 'pan-y pan-x' }}
                >
                    {children}
                </div>
            )}

            {/* ── 8 Resize Handles (Hidden if Maximized or Collapsed) ─ */}
            {!isMaximized && !isCollapsed && RESIZE_DIRECTIONS.map((direction) => (
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
    const corner = edge * UI_WINDOW.HANDLE_CORNER_FACTOR;
    const base: React.CSSProperties = {
        position: 'absolute',
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
            onPointerDown={(e) => onPointerDown(direction, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={style}
        />
    );
};

