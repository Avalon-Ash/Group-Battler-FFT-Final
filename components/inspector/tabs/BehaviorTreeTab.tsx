
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
    const [btScale, setBtScale] = useState(0.8);
    const [btPos, setBtPos] = useState({x: 0, y: 50});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const [btFps, setBtFps] = useState(20); 
    
    // Local state to force re-render when we lazy-build the AI
    const [, forceUpdate] = useState(0);
    
    // Dragging Logic
    const isDraggingBT = useRef(false);
    const lastMousePos = useRef<{x: number, y: number} | null>(null);
    const lastTouchPos = useRef<{x: number, y: number} | null>(null);
    const lastPinchDist = useRef<number>(0);

    // Auto-Build AI if missing (e.g. before game start or hot-swap)
    useEffect(() => {
        if (!agent.bt && engine) {
            // Lazy build the behavior tree
            agent.bt = engine.ai.buildAI(agent, engine);
            // CRITICAL: Force React to re-render now that agent.bt is populated
            forceUpdate(n => n + 1);
        }
    }, [agent, engine]);

    // Reset view on agent change
    useEffect(() => {
        setBtPos({x: 0, y: 50});
        setBtScale(0.8);
    }, [agent.id]);

    const handleBtWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setBtScale(s => Math.max(0.2, Math.min(2.0, s + delta)));
    };
    
    // Improved Mouse Handler using explicit delta
    const handleBtMouseDown = (e: React.MouseEvent) => { 
        isDraggingBT.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleBtMouseMove = (e: React.MouseEvent) => {
        if (isDraggingBT.current && lastMousePos.current) {
            const dx = e.clientX - lastMousePos.current.x;
            const dy = e.clientY - lastMousePos.current.y;
            setBtPos(p => ({ x: p.x + dx, y: p.y + dy }));
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };
    
    const handleBtMouseUp = () => { 
        isDraggingBT.current = false; 
        lastMousePos.current = null;
    };
    
    const handleMouseLeave = () => { 
        isDraggingBT.current = false; 
        lastMousePos.current = null;
    };
    
    // Touch Logic
    const handleBtTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            isDraggingBT.current = true;
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            isDraggingBT.current = false;
        }
    };
    const handleBtTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && lastTouchPos.current && isDraggingBT.current) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchPos.current.x;
            const dy = touch.clientY - lastTouchPos.current.y;
            setBtPos(p => ({ x: p.x + dx, y: p.y + dy }));
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            if (lastPinchDist.current > 0) {
                const delta = currentDist - lastPinchDist.current;
                setBtScale(s => Math.max(0.2, Math.min(2.0, s + delta * 0.005)));
            }
            lastPinchDist.current = currentDist;
        }
    };
    const handleBtTouchEnd = () => {
        isDraggingBT.current = false;
        lastTouchPos.current = null;
        lastPinchDist.current = 0;
    };

    return (
        <div 
            className="flex-1 bg-[#0f1115] relative overflow-hidden flex flex-col min-h-0 w-full h-full cursor-grab active:cursor-grabbing select-none" 
            ref={btContainerRef} 
            onWheel={handleBtWheel} 
            onMouseDown={handleBtMouseDown} 
            onMouseMove={handleBtMouseMove} 
            onMouseUp={handleBtMouseUp} 
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleBtTouchStart}
            onTouchMove={handleBtTouchMove}
            onTouchEnd={handleBtTouchEnd}
            style={{ touchAction: 'none' }}
        >
            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-20 glass-panel px-3 py-2 flex items-center gap-3 pointer-events-auto">
                <div className="text-xs font-bold text-slate-400 uppercase">刷新率</div>
                <input type="range" min="1" max="60" value={btFps} onChange={e => setBtFps(parseInt(e.target.value))} className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                <span className="text-cyan-400 font-mono text-xs w-6 text-right">{btFps}</span>
            </div>
            
            <div className="absolute top-4 right-4 z-20 glass-panel px-3 py-2 text-xs font-mono text-slate-400 pointer-events-none">
                {agent.bt ? 'AI: ACTIVE' : 'AI: NULL'} | SCALE: {Math.round(btScale * 100)}%
            </div>

            {/* Content Layer with Transform */}
            {/* We use a wrapper to handle the transform origin correctly from center-top */}
            <div 
                className="absolute inset-0 w-full h-full flex justify-center items-start origin-top will-change-transform pointer-events-none"
                style={{
                    transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, 
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                    backgroundSize: '32px 32px'
                }}
            >
                {/* The actual Tree Content - must have size to be rendered */}
                <div className="inline-block min-w-max pt-10 pb-20">
                    {agent.bt ? (
                        <TreeNode node={agent.bt} version={version} now={Date.now()} />
                    ) : (
                        <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                            <span className="text-slate-400 font-mono text-sm">初始化神經網路...</span>
                            <span className="text-slate-600 font-mono text-xs mt-2">(若長時間無反應請重置回合)</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
