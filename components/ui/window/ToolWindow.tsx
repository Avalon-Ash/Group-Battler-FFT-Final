import React, { useRef } from 'react';
import { WindowId } from '../../../types';
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
        rect: state?.rect ?? def?.defaultRect ?? { x: 100, y: 100, width: 400, height: 300 },
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
            onPointerDown={(e) => {
                e.stopPropagation();
                actions.front(id);
            }}
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
            {!isMaximized && !isCollapsed && (
                <>
                    <ResizeHandle
                        direction="n"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="top-0 left-2 right-2 h-2 cursor-n-resize"
                    />
                    <ResizeHandle
                        direction="s"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="bottom-0 left-2 right-2 h-2 cursor-s-resize"
                    />
                    <ResizeHandle
                        direction="w"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="left-0 top-2 bottom-2 w-2 cursor-w-resize"
                    />
                    <ResizeHandle
                        direction="e"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="right-0 top-2 bottom-2 w-2 cursor-e-resize"
                    />
                    <ResizeHandle
                        direction="nw"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="top-0 left-0 w-3 h-3 cursor-nw-resize"
                    />
                    <ResizeHandle
                        direction="ne"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="top-0 right-0 w-3 h-3 cursor-ne-resize"
                    />
                    <ResizeHandle
                        direction="sw"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="bottom-0 left-0 w-3 h-3 cursor-sw-resize"
                    />
                    <ResizeHandle
                        direction="se"
                        onPointerDown={handleResizePointerDown}
                        onPointerMove={handleResizePointerMove}
                        onPointerUp={handleResizePointerUp}
                        className="bottom-0 right-0 w-3 h-3 cursor-se-resize"
                    />
                </>
            )}
        </div>
    );
};

interface ResizeHandleProps {
    direction: ResizeDirection;
    className: string;
    onPointerDown: (direction: ResizeDirection, e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({
    direction,
    className,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}) => {
    return (
        <div
            onPointerDown={(e) => onPointerDown(direction, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ touchAction: 'none' }}
            className={`absolute z-10 ${className}`}
        />
    );
};
