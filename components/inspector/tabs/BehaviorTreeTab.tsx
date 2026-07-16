
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Agent, GameEngine } from '../../../engine/game';
import { TreeNode } from '../parts/TreeNode';
import { useDraggable } from '../../../hooks/useDraggable';

interface BehaviorTreeTabProps {
    agent: Agent;
    version: number; // Force update trigger
    engine: GameEngine;
}

export const BehaviorTreeTab: React.FC<BehaviorTreeTabProps> = ({ agent, version, engine }) => {
    // BT Interaction State
    const [btScale, setBtScale] = useState(0.9); // Increased default scale for readability
    const [btPos, setBtPos] = useState({x: 0, y: 16});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const btContentRef = useRef<HTMLDivElement>(null);
    const [btFps, setBtFps] = useState(20); 
    
    // Popup state
    const [isPopped, setIsPopped] = useState(false);
    
    // Popup drag
    const popupRef = useRef<HTMLDivElement>(null);
    const { dragHandlers, style: popupStyle } = useDraggable(popupRef, {
        initialX: 60,
        initialY: 60,
    });
    
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

    const fitToView = useCallback(() => {
        if (!btContainerRef.current || !btContentRef.current) return;
        const cw = btContainerRef.current.clientWidth;
        const ch = btContainerRef.current.clientHeight;
        const iw = btContentRef.current.offsetWidth;
        const ih = btContentRef.current.offsetHeight;
        if (iw === 0 || ih === 0) return;
        const newScale = Math.min((cw * 0.92) / iw, (ch * 0.88) / ih, 1.2);
        setBtScale(newScale);
        setBtPos({ x: 0, y: 16 });
    }, []);

    // Reset view on agent change
    useEffect(() => {
        setBtPos({ x: 0, y: 16 });
        setBtScale(0.9);
        requestAnimationFrame(() => fitToView());
    }, [agent.id, fitToView]);

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
    
    const treeContent = (
        <div 
            className="absolute inset-0 w-full h-full flex justify-center items-start origin-top will-change-transform pointer-events-none"
            style={{
                transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, 
            }}
        >
            <div ref={btContentRef} className="inline-block min-w-max pt-4 pb-20">
                {agent.bt ? (
                    <TreeNode node={agent.bt} version={version} now={Date.now()} />
                ) : (
                    <div className="flex flex-col items-center justify-center pt-10 opacity-50">
                        <span className="text-slate-400 font-mono text-xs">NO SIGNAL...</span>
                    </div>
                )}
            </div>
        </div>
    );

    if (isPopped) {
        return createPortal(
            <div 
                ref={popupRef}
                className="fixed z-[9999] flex flex-col bg-black/90 border border-white/10 rounded overflow-hidden shadow-2xl"
                style={{ ...popupStyle, width: 680, height: 520, zIndex: 9999 }}
            >
                {/* Header Bar */}
                <div 
                    className="h-[32px] shrink-0 bg-white/5 border-b border-white/10 flex items-center justify-between px-3 cursor-move select-none"
                    {...dragHandlers}
                >
                    <div className="text-xs font-mono text-slate-300 pointer-events-none">
                        {agent.id} - Behavior Tree
                    </div>
                    <div className="flex items-center space-x-1">
                        <button
                            onPointerDown={e => { e.stopPropagation(); fitToView(); }}
                            className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 hover:text-white bg-black/40 rounded border border-white/10 hover:border-white/30 transition-colors pointer-events-auto"
                            title="Fit to View"
                        >
                            ⊡
                        </button>
                        <div className="px-2 py-0.5 text-[9px] font-mono text-slate-500 bg-black/40 rounded border border-white/5 pointer-events-none mx-1">
                            {Math.round(btScale * 100)}%
                        </div>
                        <button
                            onPointerDown={e => {
                                e.stopPropagation();
                                setIsPopped(false);
                                requestAnimationFrame(() => fitToView());
                            }}
                            className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors pointer-events-auto"
                            title="Close Popup"
                        >
                            ×
                        </button>
                    </div>
                </div>
                {/* Container */}
                <div 
                    className="flex-1 relative overflow-hidden flex flex-col min-h-0 w-full h-full cursor-grab active:cursor-grabbing select-none" 
                    ref={btContainerRef} 
                    onWheel={handleBtWheel} 
                    onPointerDown={handlePointerDown} 
                    onPointerMove={handlePointerMove} 
                    onPointerUp={handlePointerUp}
                    style={{ touchAction: 'none' }}
                >
                    {treeContent}
                </div>
            </div>,
            document.body
        );
    }

    return (
        <div 
            className="flex-1 relative overflow-hidden flex flex-col min-h-0 w-full h-full cursor-grab active:cursor-grabbing select-none" 
            ref={btContainerRef} 
            onWheel={handleBtWheel} 
            onPointerDown={handlePointerDown} 
            onPointerMove={handlePointerMove} 
            onPointerUp={handlePointerUp}
            style={{ touchAction: 'none' }}
        >
            <div className="absolute top-2 right-2 z-20 flex items-center pointer-events-auto">
                <button
                    onPointerDown={e => { e.stopPropagation(); fitToView(); }}
                    className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 hover:text-white 
                               bg-black/40 rounded border border-white/10 hover:border-white/30 
                               transition-colors pointer-events-auto mr-1"
                    title="Fit to View"
                >
                    ⊡
                </button>
                <button
                    onPointerDown={e => {
                        e.stopPropagation();
                        setIsPopped(true);
                        requestAnimationFrame(() => fitToView());
                    }}
                    className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 hover:text-white 
                               bg-black/40 rounded border border-white/10 hover:border-white/30 
                               transition-colors pointer-events-auto mr-1"
                    title="Pop out"
                >
                    ⤢
                </button>
                <div className="px-2 py-1 text-[9px] font-mono text-slate-500 bg-black/40 rounded border border-white/5">
                    {Math.round(btScale * 100)}%
                </div>
            </div>

            {treeContent}
        </div>
    );
};

