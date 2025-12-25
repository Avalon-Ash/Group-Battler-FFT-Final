
import React, { useState, useRef, useEffect } from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { Team, Role } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';
import { Helpers } from '../inspector/InspectorConstants';
import { BehaviorTreeTab } from '../inspector/tabs/BehaviorTreeTab';
import { UnitStatusTab } from '../inspector/tabs/UnitStatusTab';

interface UnitInspectorHUDProps {
    agent: Agent | null;
    engine: GameEngine;
    onClose: () => void;
}

type TabType = 'NONE' | 'AI' | 'SKILLS';

export const UnitInspectorHUD: React.FC<UnitInspectorHUDProps> = ({ agent, engine, onClose }) => {
    const [viewMode, setViewMode] = useState<TabType>('NONE'); // NONE = Compact, AI/SKILLS = Expanded
    const [isMinimized, setIsMinimized] = useState(false);
    const [version, setVersion] = useState(0); // For forcing UI refresh

    // The ref moves the outer container
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-right',
        margin: 20
    });

    // Refresh Loop for visual updates (Health, AI Nodes) when expanded
    useEffect(() => {
        if (viewMode !== 'NONE' && !isMinimized) {
            const interval = setInterval(() => setVersion(n => n + 1), 100);
            return () => clearInterval(interval);
        }
    }, [viewMode, isMinimized]);

    if (!agent) return null;

    const isBlue = agent.team === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500/30' : 'border-red-500/30';
    const glowClass = isBlue ? 'shadow-[0_8px_32px_rgba(59,130,246,0.15)]' : 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]';

    const hpPct = (agent.hp / agent.maxHp) * 100;
    const mpPct = (agent.mp / agent.maxMp) * 100;

    const renderRoleIcon = (role: Role) => {
        switch (role) {
            case Role.TANK: return <Icons.RoleTank className="w-5 h-5" />;
            case Role.WARRIOR: return <Icons.RoleWarrior className="w-5 h-5" />;
            case Role.RANGER: return <Icons.RoleRanger className="w-5 h-5" />;
            case Role.MAGE: return <Icons.RoleMage className="w-5 h-5" />;
            case Role.SUPPORT: return <Icons.RoleSupport className="w-5 h-5" />;
            default: return null;
        }
    };

    return (
        <div 
            ref={ref}
            className={`z-30 pointer-events-auto select-none transition-all duration-300 ease-out`}
            style={{ 
                ...style, 
                width: isMinimized ? 'auto' : (viewMode === 'NONE' ? '300px' : '400px'),
                maxWidth: '95vw'
            }}
        >
            {isMinimized ? (
                // --- MINIMIZED PILL ---
                <div 
                    {...dragHandlers}
                    className={`liquid-card !rounded-full p-2 pl-3 flex items-center gap-3 cursor-grab active:cursor-grabbing border-l-4 ${borderColor} ${glowClass} bg-black/80`}
                >
                    <div className={`w-2 h-2 rounded-full ${isBlue ? 'bg-blue-500 box-shadow-[0_0_10px_blue]' : 'bg-red-500 box-shadow-[0_0_10px_red]'} animate-pulse`}></div>
                    <span className="font-mono font-bold text-xs text-white tracking-widest">{agent.id}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                    >
                        <Icons.Expand className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                // --- FULL CARD ---
                <div className={`liquid-card !rounded-[20px] overflow-hidden flex flex-col ${glowClass} border border-white/10 backdrop-blur-xl bg-slate-900/80`}>
                    
                    {/* Header - DRAGGABLE */}
                    <div 
                        {...dragHandlers}
                        className={`p-3 bg-gradient-to-b from-white/10 to-transparent relative cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing' : ''}`}
                    >
                        <div className="flex justify-between items-center gap-4">
                            {/* Identity */}
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-black/40 border ${borderColor} ${themeColor} shadow-inner`}>
                                    {renderRoleIcon(agent.role)}
                                </div>
                                <div className="flex flex-col">
                                    <div className={`font-mono font-bold text-sm ${themeColor} leading-none tracking-tight`}>{agent.id}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{agent.role}</span>
                                        <span className={`text-[9px] font-bold px-1.5 rounded-md ${isBlue ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>LV.1</span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-1 items-center" onPointerDown={e => e.stopPropagation()}>
                                {/* Mode Toggles */}
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 mr-2">
                                    <button 
                                        onClick={() => setViewMode(viewMode === 'AI' ? 'NONE' : 'AI')} 
                                        className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${viewMode === 'AI' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="AI Monitor"
                                    >
                                        AI
                                    </button>
                                    <button 
                                        onClick={() => setViewMode(viewMode === 'SKILLS' ? 'NONE' : 'SKILLS')} 
                                        className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${viewMode === 'SKILLS' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="Linkage"
                                    >
                                        LINK
                                    </button>
                                </div>

                                <button onClick={() => setIsMinimized(true)} className="liquid-icon-btn w-6 h-6 text-[10px] bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white border-transparent">
                                    <Icons.Minimize className="w-3 h-3" />
                                </button>
                                <button onClick={onClose} className="liquid-icon-btn w-6 h-6 text-[10px] bg-red-500/10 hover:bg-red-500/30 text-red-400 border-transparent">
                                    <Icons.Close className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Vitals Bars (Always Visible) */}
                        <div className="space-y-1 mt-3 pointer-events-none">
                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full flex">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${Math.max(0, hpPct)}%`}}></div>
                            </div>
                            {agent.maxMp > 0 && (
                                <div className="h-1 bg-black/50 rounded-full overflow-hidden w-full flex">
                                    <div className="h-full bg-cyan-500 transition-all duration-300" style={{width: `${mpPct}%`}}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Status (Only visible when NOT expanded) */}
                    {viewMode === 'NONE' && (
                        <div className="px-3 pb-3 cursor-default" onPointerDown={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center bg-black/20 rounded-lg p-2 border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">CURRENT STATE</span>
                                    <span className={`text-xs font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300'}`}>
                                        {Helpers.getStatusLabel(agent.btStatus)}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {agent.stunTimer > 0 && <span className="liquid-tag bg-amber-500/20 border-amber-500/50 text-amber-300 text-[9px] px-1.5">STUN</span>}
                                    {agent.silenceTimer > 0 && <span className="liquid-tag bg-slate-700/50 border-slate-500 text-slate-300 text-[9px] px-1.5">MUTE</span>}
                                    {agent.banished && <span className="liquid-tag bg-purple-500/20 border-purple-500/50 text-purple-300 text-[9px] px-1.5">BANISH</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPANDED CONTENT AREA */}
                    {viewMode !== 'NONE' && (
                        <div 
                            className="border-t border-white/5 bg-black/20 animate-slide-down overflow-hidden flex flex-col transition-all"
                            style={{ height: '320px' }} // Fixed height for monitor mode
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {viewMode === 'AI' ? (
                                <div className="w-full h-full relative">
                                    <BehaviorTreeTab agent={agent} version={version} engine={engine} />
                                    {/* Transparent hint */}
                                    <div className="absolute bottom-2 right-2 text-[9px] text-white/20 font-mono pointer-events-none">
                                        LIVE MONITORING
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full relative p-2">
                                    <UnitStatusTab agent={agent} db={engine.skillDB} onUpdate={() => setVersion(n => n+1)} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
