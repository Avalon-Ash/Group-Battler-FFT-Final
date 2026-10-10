import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { UI_PIN } from '../constants';

export interface DraggableOptions {
    initialX?: number;
    initialY?: number;
    anchor?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    margin?: number;
    storageKey?: string;
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export function loadStoredPosition(
    storageKey: string | undefined,
    storage?: StorageLike
): { x: number; y: number } | null {
    if (!storageKey) return null;
    try {
        const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
        if (!s) return null;
        const raw = s.getItem(storageKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                return { x: parsed.x, y: parsed.y };
            }
        }
    } catch {
        // Ignore storage error or corrupted JSON
    }
    return null;
}

export function saveStoredPosition(
    storageKey: string | undefined,
    pos: { x: number; y: number },
    storage?: StorageLike
): void {
    if (!storageKey) return;
    try {
        const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
        if (!s) return;
        s.setItem(storageKey, JSON.stringify(pos));
    } catch {
        // Ignore storage error
    }
}

export function clampToolbarPosition(
    pos: { x: number; y: number },
    size: { width: number; height: number },
    viewport: { vw: number; vh: number },
    margin: number
): { x: number; y: number } {
    const maxX = Math.max(margin, viewport.vw - size.width - margin);
    const maxY = Math.max(margin, viewport.vh - size.height - margin);
    const minX = margin;
    const minY = margin;

    const clampedX = Math.min(Math.max(pos.x, minX), maxX);
    const clampedY = Math.min(Math.max(pos.y, minY), maxY);

    return { x: clampedX, y: clampedY };
}

export const useDraggable = (ref: React.RefObject<HTMLElement | null>, options: DraggableOptions = {}) => {
    const { anchor = 'top-left', margin = 20, storageKey } = options;
    const [position, setPosition] = useState({ x: options.initialX || 0, y: options.initialY || 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartMouseRef = useRef({ x: 0, y: 0 });
    const dragStartElemRef = useRef({ x: 0, y: 0 });
    const currentPosRef = useRef(position);
    const hasInitialized = useRef(false);
    const capturedTargetRef = useRef<Element | null>(null);
    const pointerIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isDragging) {
            currentPosRef.current = position;
        }
    }, [position, isDragging]);

    const clampToScreen = useCallback(() => {
        if (!ref.current) return;
        const el = ref.current;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const vw = typeof window !== 'undefined' ? window.innerWidth : UI_PIN.FALLBACK_VIEWPORT.w;
        const vh = typeof window !== 'undefined' ? window.innerHeight : UI_PIN.FALLBACK_VIEWPORT.h;
        const newX = currentPosRef.current.x;
        const newY = currentPosRef.current.y;

        const clamped = clampToolbarPosition(
            { x: newX, y: newY },
            { width: rect.width, height: rect.height },
            { vw, vh },
            margin
        );

        if (clamped.x !== newX || clamped.y !== newY) {
            currentPosRef.current = clamped;
            setPosition(clamped);
            saveStoredPosition(storageKey, clamped);
        }
    }, [margin, ref, storageKey]);

    useEffect(() => {
        if (hasInitialized.current || !ref.current) return;
        const el = ref.current;
        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const vw = typeof window !== 'undefined' ? window.innerWidth : UI_PIN.FALLBACK_VIEWPORT.w;
            const vh = typeof window !== 'undefined' ? window.innerHeight : UI_PIN.FALLBACK_VIEWPORT.h;

            const loadedPos = loadStoredPosition(storageKey);

            const elementW = rect.width || UI_PIN.FALLBACK_SIZE.w;
            const elementH = rect.height || UI_PIN.FALLBACK_SIZE.h;

            let x = margin;
            let y = margin;
            if (loadedPos) {
                x = loadedPos.x;
                y = loadedPos.y;
            } else {
                if (anchor.includes('center')) x = (vw / 2) - (elementW / 2);
                if (anchor.includes('right')) x = vw - elementW - margin;
                if (anchor.includes('bottom')) y = vh - elementH - (margin * 2); 
                if (options.initialX !== undefined) x = options.initialX;
                if (options.initialY !== undefined) y = options.initialY;
            }

            const clamped = clampToolbarPosition(
                { x, y },
                { width: elementW, height: elementH },
                { vw, vh },
                margin
            );

            setPosition(clamped);
            currentPosRef.current = clamped;
            hasInitialized.current = true;
        });
    }, [anchor, margin, options.initialX, options.initialY, storageKey]);

    useEffect(() => {
        const handleResize = () => clampToScreen();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampToScreen]);

    // Clamp on element resize or when shown
    useEffect(() => {
        if (!ref.current || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            clampToScreen();
        });
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [clampToScreen, ref]);

    useLayoutEffect(() => {
        if (isDragging && ref.current) {
            ref.current.style.transform = `translate3d(${currentPosRef.current.x}px, ${currentPosRef.current.y}px, 0)`;
        }
    });

    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
        setIsDragging(true);
        dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
        dragStartElemRef.current = currentPosRef.current;
        if (ref.current) ref.current.style.transition = 'none';

        try {
            (e.target as Element).setPointerCapture(e.pointerId);
            capturedTargetRef.current = e.target as Element;
            pointerIdRef.current = e.pointerId;
        } catch {
            // Ignore capture failure
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !ref.current) return;
        const dx = e.clientX - dragStartMouseRef.current.x;
        const dy = e.clientY - dragStartMouseRef.current.y;
        const newPos = {
            x: dragStartElemRef.current.x + dx,
            y: dragStartElemRef.current.y + dy
        };
        currentPosRef.current = newPos;
        ref.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0)`;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            if (capturedTargetRef.current && pointerIdRef.current !== null) {
                try {
                    capturedTargetRef.current.releasePointerCapture(pointerIdRef.current);
                } catch {
                    // Ignore release failure
                }
                capturedTargetRef.current = null;
                pointerIdRef.current = null;
            }
            if (ref.current) ref.current.style.transition = '';
            setPosition(currentPosRef.current);
            clampToScreen();

            saveStoredPosition(storageKey, currentPosRef.current);
        }
    };

    return {
        position,
        isDragging,
        dragHandlers: {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerUp,
        },
        style: {
            position: 'fixed' as const,
            left: 0,
            top: 0,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none' as const,
            userSelect: 'none' as const,
        }
    };
};