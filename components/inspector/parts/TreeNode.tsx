
import React from 'react';
import { BTNode } from '../../../engine/behaviorTree';
import { NodeState } from '../../../types';

interface TreeNodeProps {
    node: BTNode;
    version: number;
    now: number;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ node, version, now }) => {
    // Logic for Visual Persistence
    const timeDiff = now - node.lastRunTime;
    let visualState: NodeState | null = node.status;
    let isFading = false;
    let opacity = 1.0;

    if (!visualState && node.lastResult) {
        if (timeDiff < 1000) { 
            visualState = node.lastResult;
            isFading = true;
            if (timeDiff > 200) opacity = 0.7;
            if (timeDiff > 500) opacity = 0.4;
        }
    }

    const statusStyle = (s: NodeState | null) => {
        switch (s) {
            case NodeState.RUNNING: return "border-amber-500 bg-amber-950/80 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-500 animate-pulse-glow z-10 scale-105";
            case NodeState.SUCCESS: return "border-emerald-500 bg-emerald-950/80 text-emerald-100 shadow-[0_0_5px_rgba(16,185,129,0.4)]";
            case NodeState.FAILURE: return "border-red-800 bg-red-950/80 text-red-200 opacity-80";
            default: return "border-slate-600 bg-slate-800 text-slate-400";
        }
    };

    const typeSymbol = (t: string) => {
        if(t === '?') return <span className="text-purple-400 font-bold mr-2 text-lg">?</span>;
        if(t === '->') return <span className="text-blue-400 font-bold mr-2 text-lg">➜</span>;
        if(t === 'COND') return <span className="text-pink-400 text-sm mr-2">◆</span>;
        if(t === 'ACT') return <span className="text-yellow-400 text-sm mr-2">⚡</span>;
        return null;
    }

    return (
        <div className="flex flex-col items-center">
            <div 
                className={`flex items-center px-4 py-3 rounded-md border-2 text-sm font-mono font-bold transition-all duration-100 cursor-default select-none shadow-md min-w-[120px] justify-center ${statusStyle(visualState)}`}
                style={{ opacity: opacity }}
            >
                {typeSymbol(node.type)}
                <span className="whitespace-nowrap truncate max-w-[180px]">{node.n}</span>
            </div>
            {node.c && node.c.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className={`w-0.5 h-6 ${isFading ? 'bg-slate-600/50' : 'bg-slate-500'}`}></div>
                    <div className="flex items-start gap-4">
                        {node.c.map((child, idx) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Connector Lines */}
                                <div className="absolute top-0 left-0 w-full h-6 -mt-6 pointer-events-none">
                                     {node.c.length > 1 && (
                                         <>
                                            {idx === 0 && <div className="absolute right-0 top-0 w-1/2 h-0.5 bg-slate-500 translate-y-6"></div>}
                                            {idx === node.c.length - 1 && <div className="absolute left-0 top-0 w-1/2 h-0.5 bg-slate-500 translate-y-6"></div>}
                                            {idx > 0 && idx < node.c.length - 1 && <div className="absolute left-0 top-0 w-full h-0.5 bg-slate-500 translate-y-6"></div>}
                                         </>
                                     )}
                                     <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-slate-500 translate-y-6 -translate-x-1/2"></div>
                                </div>
                                
                                <div className="pt-6">
                                    <TreeNode node={child} version={version} now={now} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
