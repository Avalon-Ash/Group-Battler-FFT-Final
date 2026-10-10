import React, { useRef, useCallback, useEffect } from 'react';
import { WindowRect } from '../types';
import { UI_WINDOW } from '../constants';
import { clampRect } from '../components/ui/window/windowStore';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface UseWindowInteractionOptions {
    windowRef: React.RefObject<HTMLDivElement | null>;
    rect: WindowRect;
    minSize?: { width: number; height: number };
    isMaximized: boolean;
    isCollapsed: boolean;
    onCommitRect: (rect: WindowRect) => void;
    onToggleMaximize: () => void;
}

export function useWindowInteraction({
    windowRef,
    rect,
    minSize,
    isMaximized,
    isCollapsed,
    onCommitRect,
    onToggleMaximize,
}: UseWindowInteractionOptions) {
    const rectRef = useRef<WindowRect>(rect);
    const activeDragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        startRect: WindowRect;
    } | null>(null);

    const activeResizeRef = useRef<{
        pointerId: number;
        direction: ResizeDirection;
        startX: number;
        startY: number;
        startRect: WindowRect;
    } | null>(null);

    // Keep rectRef updated when rect prop changes (e.g. from store restore or maximize)
    useEffect(() => {
        rectRef.current = rect;
        if (windowRef.current && !activeDragRef.current && !activeResizeRef.current) {
            windowRef.current.style.left = `${rect.x}px`;
            windowRef.current.style.top = `${rect.y}px`;
            windowRef.current.style.width = `${rect.width}px`;
            windowRef.current.style.height = isCollapsed ? 'auto' : `${rect.height}px`;
        }
    }, [rect, isCollapsed, windowRef]);

    const getViewport = useCallback(() => {
        return {
            width: typeof window !== 'undefined' ? window.innerWidth : UI_WINDOW.FALLBACK_VIEWPORT.width,
            height: typeof window !== 'undefined' ? window.innerHeight : UI_WINDOW.FALLBACK_VIEWPORT.height,
        };
    }, []);

    // ── Dragging Handler ──────────────────────────────────────────
    const handleTitlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (isMaximized) return;

            // Do not drag if clicking buttons, inputs, links, or marked no-drag
            const target = e.target as HTMLElement;
            if (
                target.closest('button') ||
                target.closest('input') ||
                target.closest('select') ||
                target.closest('textarea') ||
                target.closest('a') ||
                target.closest('[data-no-drag]')
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const currentTarget = e.currentTarget;
            try {
                currentTarget.setPointerCapture(e.pointerId);
            } catch {
                // Ignore capture failure on some environments
            }

            activeDragRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startRect: { ...rectRef.current },
            };
        },
        [isMaximized]
    );

    const handleTitlePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const drag = activeDragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;

            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;

            const proposed: WindowRect = {
                x: drag.startRect.x + dx,
                y: drag.startRect.y + dy,
                width: drag.startRect.width,
                height: drag.startRect.height,
            };

            const clamped = clampRect(proposed, getViewport(), minSize);
            rectRef.current = clamped;

            if (windowRef.current) {
                windowRef.current.style.left = `${clamped.x}px`;
                windowRef.current.style.top = `${clamped.y}px`;
            }
        },
        [getViewport, minSize, windowRef]
    );

    const handleTitlePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const drag = activeDragRef.current;
            if (!drag || drag.pointerId !== e.pointerId) return;

            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore release errors
            }

            activeDragRef.current = null;
            onCommitRect(rectRef.current);
        },
        [onCommitRect]
    );

    // ── Resizing Handler ──────────────────────────────────────────
    const handleResizePointerDown = useCallback(
        (direction: ResizeDirection, e: React.PointerEvent<HTMLDivElement>) => {
            if (isMaximized || isCollapsed) return;

            e.preventDefault();
            e.stopPropagation();

            const currentTarget = e.currentTarget;
            try {
                currentTarget.setPointerCapture(e.pointerId);
            } catch {
                // Ignore capture failure
            }

            activeResizeRef.current = {
                pointerId: e.pointerId,
                direction,
                startX: e.clientX,
                startY: e.clientY,
                startRect: { ...rectRef.current },
            };
        },
        [isMaximized, isCollapsed]
    );

    const handleResizePointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const resize = activeResizeRef.current;
            if (!resize || resize.pointerId !== e.pointerId) return;

            const dx = e.clientX - resize.startX;
            const dy = e.clientY - resize.startY;
            const minW = minSize?.width ?? UI_WINDOW.MIN_WIDTH;
            const minH = minSize?.height ?? UI_WINDOW.MIN_HEIGHT;
            const start = resize.startRect;

            let nextX = start.x;
            let nextY = start.y;
            let nextW = start.width;
            let nextH = start.height;

            if (resize.direction.includes('e')) {
                nextW = Math.max(minW, start.width + dx);
            }
            if (resize.direction.includes('w')) {
                const maxAllowedDx = start.width - minW;
                const appliedDx = Math.min(dx, maxAllowedDx);
                nextX = start.x + appliedDx;
                nextW = start.width - appliedDx;
            }
            if (resize.direction.includes('s')) {
                nextH = Math.max(minH, start.height + dy);
            }
            if (resize.direction.includes('n')) {
                const maxAllowedDy = start.height - minH;
                const appliedDy = Math.min(dy, maxAllowedDy);
                nextY = start.y + appliedDy;
                nextH = start.height - appliedDy;
            }

            const clamped = clampRect(
                { x: nextX, y: nextY, width: nextW, height: nextH },
                getViewport(),
                minSize
            );
            rectRef.current = clamped;

            if (windowRef.current) {
                windowRef.current.style.left = `${clamped.x}px`;
                windowRef.current.style.top = `${clamped.y}px`;
                windowRef.current.style.width = `${clamped.width}px`;
                windowRef.current.style.height = `${clamped.height}px`;
            }
        },
        [getViewport, minSize, windowRef]
    );

    const handleResizePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            const resize = activeResizeRef.current;
            if (!resize || resize.pointerId !== e.pointerId) return;

            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore release errors
            }

            activeResizeRef.current = null;
            onCommitRect(rectRef.current);
        },
        [onCommitRect]
    );

    // ── Double Click on Titlebar to Maximize ───────────────────────
    const handleTitleDoubleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            onToggleMaximize();
        },
        [onToggleMaximize]
    );

    return {
        handleTitlePointerDown,
        handleTitlePointerMove,
        handleTitlePointerUp,
        handleTitleDoubleClick,
        handleResizePointerDown,
        handleResizePointerMove,
        handleResizePointerUp,
    };
}
