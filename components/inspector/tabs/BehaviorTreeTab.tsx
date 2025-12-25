
import React, { useRef, useState, useEffect } from 'react';
import { Agent, GameEngine } from '../../../engine/game';
import { TreeNode } from '../parts/TreeNode';

interface BehaviorTreeTabProps {
    agent: Agent;
    version: number; // Force update trigger
    engine: GameEngine;
}

export const BehaviorTreeTab: React.FC<BehaviorTreeTabProps> = ({ agent, version, engine }) => {
    // BT Interaction State
    const [btScale, setBtScale] = useState(0.65); // Smaller default scale for HUD embedding
    const [btPos, setBtPos] = useState({x: 0, y: 30});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const [btFps, setBtFps] = useState(20); 
    
    // Local state to force re-render when we lazy-build the AI
    const [, forceUpdate] = useState(0);
    
    // Dragging Logic
    const isDraggingBT = useRef(false);
    const lastMousePos = useRef<{x: number, y: number} | null>(null);

    // Auto-Build AI if missing
    useEffect(() => {
        if (!agent.bt && engine) {
            agent.bt = engine.ai.buildAI(agent, engine);
            forceUpdate(n => n + 1);
        }
    }, [agent, engine]);

    // Reset view on agent change
    useEffect(() => {
        setBtPos({x: 0, y: 30});
        setBtScale(0.65);
    }, [agent.id]);

    const handleBtWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setBtScale(s => Math.max(0.2, Math.min(2.0, s + delta)));
    };
    
    // --- POINTER EVENTS (Robust Dragging) ---
    const handlePointerDown = (e: React.PointerEvent) => { 
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling to parent Window Drag
        
        isDraggingBT.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        
        // Capture pointer so we keep receiving events even if cursor leaves the div
        (e.target as Element).setPointerCapture(e.pointerId);
        
        // Change cursor to grabbing
        if (btContainerRef.current) btContainerRef.current.style.cursor = 'grabbing';
    };
    
    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDraggingBT.current && lastMousePos.current) {
            e.preventDefault();
            e.stopPropagation();
            
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setBtPos(p => ({ x: p.x + dx, y: p.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };
    
    const handlePointerUp = (e: React.PointerEvent) => { 
        if (isDraggingBT.current) {
            isDraggingBT.current = false; 
            lastMousePos.current = null;
            
            (e.target as Element).releasePointerCapture(e.pointerId);
            
            // Restore cursor
            if (btContainerRef.current) btContainerRef.current.style.cursor = 'grab';
        }
    };
    
    return (
        <div 
            className="flex-1 relative overflow-hidden flex flex-col min-h-0 w-full h-full cursor-grab active:cursor-grabbing select-none" 
            ref={btContainerRef} 
            onWheel={handleBtWheel} 
            onPointerDown={handlePointerDown} 
            onPointerMove={handlePointerMove} 
            onPointerUp={handlePointerUp}
            // onPointerLeave is not needed because we use setPointerCapture
            style={{ touchAction: 'none' }}
        >
            {/* UI Overlay - Minimal for embedded view */}
            <div className="absolute top-2 right-2 z-20 px-2 py-1 text-[9px] font-mono text-slate-500 bg-black/40 rounded border border-white/5 pointer-events-none">
                {Math.round(btScale * 100)}%
            </div>

            {/* Content Layer */}
            <div 
                className="absolute inset-0 w-full h-full flex justify-center items-start origin-top will-change-transform pointer-events-none"
                style={{
                    transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, 
                    // No background color here to allow game to show through
                }}
            >
                <div className="inline-block min-w-max pt-4 pb-20">
                    {agent.bt ? (
                        <TreeNode node={agent.bt} version={version} now={Date.now()} />
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-10 opacity-50">
                            <span className="text-slate-400 font-mono text-xs">NO SIGNAL...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
