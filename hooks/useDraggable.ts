
import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';

interface DraggableOptions {
    initialX?: number;
    initialY?: number;
    anchor?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    margin?: number;
}

export const useDraggable = (ref: React.RefObject<HTMLElement>, options: DraggableOptions = {}) => {
    const { anchor = 'top-left', margin = 20 } = options;
    
    // The "Committed" position (synced with React state)
    const [position, setPosition] = useState({ x: options.initialX || 0, y: options.initialY || 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    // Refs for Drag Logic (Mutable, no re-renders)
    const dragStartMouseRef = useRef({ x: 0, y: 0 }); // Mouse Pos at Down
    const dragStartElemRef = useRef({ x: 0, y: 0 });  // Element Pos at Down
    const currentPosRef = useRef(position);           // Current tracking pos
    const hasInitialized = useRef(false);

    // Sync ref if position is updated externally (rare)
    useEffect(() => {
        if (!isDragging) {
            currentPosRef.current = position;
        }
    }, [position, isDragging]);

    // --- 1. Auto-Positioning (Initial & Resize) ---
    const clampToScreen = useCallback(() => {
        if (!ref.current) return;
        const el = ref.current;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let newX = currentPosRef.current.x;
        let newY = currentPosRef.current.y;

        const maxX = vw - rect.width - margin;
        const maxY = vh - rect.height - margin;
        const minX = margin;
        const minY = margin;

        const clampedX = Math.min(Math.max(newX, minX), maxX);
        const clampedY = Math.min(Math.max(newY, minY), maxY);

        // Update if changed
        if (clampedX !== newX || clampedY !== newY) {
            const p = { x: clampedX, y: clampedY };
            currentPosRef.current = p;
            setPosition(p);
        }
    }, [margin, ref]);

    // Initial Placement
    useEffect(() => {
        if (hasInitialized.current || !ref.current) return;
        
        const el = ref.current;
        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            
            let x = margin;
            let y = margin;

            if (anchor.includes('center')) x = (vw / 2) - (rect.width / 2);
            if (anchor.includes('right')) x = vw - rect.width - margin;
            
            if (anchor.includes('bottom')) y = vh - rect.height - (margin * 2); 
            
            if (options.initialX !== undefined) x = options.initialX;
            if (options.initialY !== undefined) y = options.initialY;

            const p = { x, y };
            setPosition(p);
            currentPosRef.current = p;
            hasInitialized.current = true;
        });
    }, [anchor, margin, options.initialX, options.initialY]);

    // Resize
    useEffect(() => {
        const handleResize = () => clampToScreen();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [clampToScreen]);

    // --- 2. Restore Position on Re-render ---
    // Critical: If the component re-renders while dragging (e.g. UnitInspector updating),
    // React would reset the style to `position` state (start of drag).
    // This forces the style back to the current dragged position.
    useLayoutEffect(() => {
        if (isDragging && ref.current) {
            ref.current.style.transform = `translate3d(${currentPosRef.current.x}px, ${currentPosRef.current.y}px, 0)`;
        }
    });

    // --- 3. Drag Handlers ---
    const handlePointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement;
        // Ignore interactions with form elements
        if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return;
        
        e.preventDefault(); 
        
        setIsDragging(true);
        dragStartMouseRef.current = { x: e.clientX, y: e.clientY };
        dragStartElemRef.current = currentPosRef.current;
        
        // Remove transition during drag for instant follow
        if (ref.current) ref.current.style.transition = 'none';
        
        (e.target as Element).setPointerCapture(e.pointerId);
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
        // Direct DOM Update (Bypassing React Render Cycle)
        ref.current.style.transform = `translate3d(${newPos.x}px, ${newPos.y}px, 0)`;
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            (e.target as Element).releasePointerCapture(e.pointerId);
            
            if (ref.current) ref.current.style.transition = ''; // Restore CSS transitions
            
            // Commit final position to React State
            setPosition(currentPosRef.current);
            
            // Optional: Clamp on release
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
            // Use state position for default rendering. 
            // During drag, DOM override + LayoutEffect takes precedence.
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            touchAction: 'none' as const
        }
    };
};
