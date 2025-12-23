
import React, { useRef, useState, useEffect } from 'react';
import { Agent } from '../../../engine/game';
import { TreeNode } from '../parts/TreeNode';

interface BehaviorTreeTabProps {
    agent: Agent;
    version: number; // Force update trigger
}

export const BehaviorTreeTab: React.FC<BehaviorTreeTabProps> = ({ agent, version }) => {
    // BT Interaction State
    const [btScale, setBtScale] = useState(0.8);
    const [btPos, setBtPos] = useState({x: 0, y: 20});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const [btFps, setBtFps] = useState(20); 
    
    // Dragging Logic
    const isDraggingBT = useRef(false);
    const lastTouchPos = useRef<{x: number, y: number} | null>(null);
    const lastPinchDist = useRef<number>(0);

    // Auto-Center on mount
    useEffect(() => {
        if (agent?.bt) {
            // Keep center or reset if needed
        }
    }, [agent?.id]);

    const handleBtWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        setBtScale(s => Math.max(0.2, Math.min(2.0, s + (e.deltaY > 0 ? -0.1 : 0.1))));
    };
    
    const handleBtMouseDown = () => { isDraggingBT.current = true; };
    const handleBtMouseMove = (e: React.MouseEvent) => {
        if (isDraggingBT.current) setBtPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    };
    const handleBtMouseUp = () => { isDraggingBT.current = false; };
    
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
            className="flex-1 bg-[#0f1115] relative overflow-hidden flex flex-col min-h-0 cursor-grab active:cursor-grabbing" 
            ref={btContainerRef} 
            onWheel={handleBtWheel} 
            onMouseDown={handleBtMouseDown} 
            onMouseMove={handleBtMouseMove} 
            onMouseUp={handleBtMouseUp} 
            onMouseLeave={handleBtMouseUp}
            onTouchStart={handleBtTouchStart}
            onTouchMove={handleBtTouchMove}
            onTouchEnd={handleBtTouchEnd}
            style={{touchAction: 'none'}}
        >
            <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-2 flex items-center gap-3">
                <div className="text-xs font-bold text-slate-400 uppercase">刷新率</div>
                <input type="range" min="1" max="60" value={btFps} onChange={e => setBtFps(parseInt(e.target.value))} className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                <span className="text-cyan-400 font-mono text-xs w-6 text-right">{btFps}</span>
            </div>
            
            <div className="absolute top-4 right-4 z-10 glass-panel px-3 py-2 text-xs font-mono text-slate-400">
                縮放: {Math.round(btScale * 100)}%
            </div>

            <div className="absolute w-full h-full flex justify-center items-start pt-20 pb-20 origin-top-center will-change-transform" 
                    style={{
                        transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, 
                        backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                        backgroundSize: '32px 32px'
                    }}>
                <div id="bt-root-content" className="inline-block px-12 pb-12">
                    {agent.bt && <TreeNode node={agent.bt} version={version} now={Date.now()} />}
                </div>
            </div>
        </div>
    );
};
