import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';

export interface DraggableOptions {
    initialX?: number;
    initialY?: number;
    anchor?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    margin?: number;
    storageKey?: string;
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

        const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const newX = currentPosRef.current.x;
        const newY = currentPosRef.current.y;

        const maxX = Math.max(margin, vw - rect.width - margin);
        const maxY = Math.max(margin, vh - rect.height - margin);
        const minX = margin;
        const minY = margin;

        const clampedX = Math.min(Math.max(newX, minX), maxX);
        const clampedY = Math.min(Math.max(newY, minY), maxY);

        if (clampedX !== newX || clampedY !== newY) {
            const p = { x: clampedX, y: clampedY };
            currentPosRef.current = p;
            setPosition(p);
            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(p));
                } catch {
                    // Ignore storage errors
                }
            }
        }
    }, [margin, ref, storageKey]);

    useEffect(() => {
        if (hasInitialized.current || !ref.current) return;
        const el = ref.current;
        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
            const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

            let loadedPos: { x: number; y: number } | null = null;
            if (storageKey) {
                try {
                    const raw = localStorage.getItem(storageKey);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                            loadedPos = { x: parsed.x, y: parsed.y };
                        }
                    }
                } catch {
                    // Ignore localStorage error
                }
            }

            let x = margin;
            let y = margin;
            if (loadedPos) {
                x = loadedPos.x;
                y = loadedPos.y;
            } else {
                if (anchor.includes('center')) x = (vw / 2) - ((rect.width || 200) / 2);
                if (anchor.includes('right')) x = vw - (rect.width || 200) - margin;
                if (anchor.includes('bottom')) y = vh - (rect.height || 60) - (margin * 2); 
                if (options.initialX !== undefined) x = options.initialX;
                if (options.initialY !== undefined) y = options.initialY;
            }

            const maxX = Math.max(margin, vw - (rect.width || 200) - margin);
            const maxY = Math.max(margin, vh - (rect.height || 60) - margin);
            const clampedX = Math.min(Math.max(x, margin), maxX);
            const clampedY = Math.min(Math.max(y, margin), maxY);

            const p = { x: clampedX, y: clampedY };
            setPosition(p);
            currentPosRef.current = p;
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

            if (storageKey) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(currentPosRef.current));
                } catch {
                    // Ignore storage failure
                }
            }
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