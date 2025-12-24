import React, { useState, useEffect, useRef, useCallback } from 'react';

interface DraggableOptions {
    initialX?: number;
    initialY?: number;
    anchor?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    margin?: number;
}

export const useDraggable = (ref: React.RefObject<HTMLElement>, options: DraggableOptions = {}) => {
    const [position, setPosition] = useState({ x: options.initialX || 0, y: options.initialY || 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const posRef = useRef(position); // Sync ref for event handlers
    const hasInitialized = useRef(false);

    const { anchor = 'top-left', margin = 20 } = options;

    // --- 1. Auto-Positioning (Initial & Resize) ---
    const clampToScreen = useCallback(() => {
        if (!ref.current) return;
        const el = ref.current;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        setPosition(prev => {
            // Keep within bounds
            // We use the current visual position to calculate new bounds
            // But if it's the first run, we respect the anchor
            
            let newX = prev.x;
            let newY = prev.y;

            // Clamping Logic based on current transform
            // Note: Since we use transform: translate(x, y), x/y are relative to the *initial* render position 
            // if we weren't using absolute positioning.
            // To simplify, we will assume the component uses fixed/absolute positioning at 0,0 
            // and the transform drives the entire location.
            
            const currentAbsX = newX;
            const currentAbsY = newY;

            const maxX = vw - rect.width - margin;
            const maxY = vh - rect.height - margin;
            const minX = margin;
            const minY = margin;

            const clampedX = Math.min(Math.max(currentAbsX, minX), maxX);
            const clampedY = Math.min(Math.max(currentAbsY, minY), maxY);

            return { x: clampedX, y: clampedY };
        });
    }, [margin, ref]);

    // Initial Placement Logic
    useEffect(() => {
        if (hasInitialized.current || !ref.current) return;
        
        const el = ref.current;
        // Need a slight delay for dimensions to be real if loading
        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            
            let x = margin;
            let y = margin;

            if (anchor.includes('center')) x = (vw / 2) - (rect.width / 2);
            if (anchor.includes('right')) x = vw - rect.width - margin;
            
            if (anchor.includes('bottom')) y = vh - rect.height - (margin * 2); // Extra margin for bottom
            
            // If explicit coordinates were passed, override
            if (options.initialX !== undefined) x = options.initialX;
            if (options.initialY !== undefined) y = options.initialY;

            setPosition({ x, y });
            posRef.current = { x, y };
            hasInitialized.current = true;
        });
    }, [anchor, margin, options.initialX, options.initialY]);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            // Re-clamp on resize
            clampToScreen();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampToScreen]);

    // --- 2. Drag Logic ---
    const handlePointerDown = (e: React.PointerEvent) => {
        // Prevent dragging if clicking input or button (unless it's a specific drag handle)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
        // Buttons are usually clickable, so we might want to allow dragging *unless* it triggers an action.
        // But for HUDs, usually clicking empty space or specific headers initiates drag.
        
        // Stop default browser drag
        e.preventDefault(); 
        
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        posRef.current = position;
        
        // Capture pointer to track outside window
        (e.target as Element).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;

        const newPos = {
            x: posRef.current.x + dx,
            y: posRef.current.y + dy
        };

        setPosition(newPos);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            posRef.current = position; // Commit final position
            (e.target as Element).releasePointerCapture(e.pointerId);
            
            // Optional: Snap to bounds on release
            clampToScreen();
        }
    };

    return {
        position,
        isDragging,
        dragHandlers: {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp
        },
        style: {
            position: 'fixed' as const,
            left: 0,
            top: 0,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none' as const
        }
    };
};