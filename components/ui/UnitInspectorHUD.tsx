
import React, { useState, useRef } from 'react';
import { Agent } from '../../engine/game';
import { Team, Role } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';

interface UnitInspectorHUDProps {
    agent: Agent | null;
    onClose: () => void;
    onExpand?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    '待機': 'IDLE',
    '移動': 'MOVING',
    '詠唱 BASIC': 'CASTING',
    '詠唱 ACTIVE': 'CASTING',
    '詠唱 ULT': 'CASTING ULT',
    '暈眩': 'STUNNED',
    '放逐': 'BANISHED',
    '沉默': 'SILENCED',
    '死亡': 'KIA'
};

export const UnitInspectorHUD: React.FC<UnitInspectorHUDProps> = ({ agent, onClose, onExpand }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-right',
        margin: 40
    });

    if (!agent) return null;

    const isBlue = agent.team === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500/50' : 'border-red-500/50';
    const glowClass = isBlue ? 'shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'shadow-[0_0_30px_rgba(239,68,68,0.15)]';

    const hpPct = (agent.hp / agent.maxHp) * 100;
    const mpPct = (agent.mp / agent.maxMp) * 100;

    return (
        <div 
            ref={ref}
            className={`z-30 w-[calc(100%-2rem)] md:w-80 pointer-events-auto select-none transition-transform duration-200`}
            style={style}
            {...dragHandlers}
        >
            {isMinimized ? (
                // Minimized Pill
                <div 
                    className={`liquid-card !rounded-full p-2 pl-3 flex items-center gap-3 cursor-grab ${isDragging ? 'cursor-grabbing' : ''} w-fit ml-auto border-l-4 ${borderColor}`}
                >
                    <div className={`w-2 h-2 rounded-full ${isBlue ? 'bg-blue-500 box-shadow-[0_0_10px_blue]' : 'bg-red-500 box-shadow-[0_0_10px_red]'} animate-pulse`}></div>
                    <span className="font-mono font-bold text-xs text-white tracking-widest">{agent.id}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                    >
                        ↗
                    </button>
                </div>
            ) : (
                // Full Card
                <div className={`liquid-card p-4 flex flex-col gap-3 ${glowClass} cursor-grab ${isDragging ? 'cursor-grabbing scale-[1.01]' : ''}`}>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3 pointer-events-none">
                            {/* Class Icon Container (Liquid Style) */}
                            <div className={`w-12 h-12 flex items-center justify-center rounded-2xl liquid-card-dark border ${borderColor} ${themeColor} text-2xl shadow-inner relative overflow-hidden`}>
                                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br from-white to-transparent`}></div>
                                {agent.role === Role.TANK && '🛡️'}
                                {agent.role === Role.WARRIOR && '⚔️'}
                                {agent.role === Role.RANGER && '🏹'}
                                {agent.role === Role.MAGE && '🔮'}
                                {agent.role === Role.SUPPORT && '⚕️'}
                            </div>
                            <div>
                                <div className={`font-mono font-black text-xl ${themeColor} leading-none tracking-tight`}>{agent.id}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="liquid-tag bg-white/5 border-white/10 text-slate-300 shadow-sm">{agent.role}</span>
                                    <span className={`liquid-tag ${isBlue ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-red-500/10 border-red-500/30 text-red-300'} shadow-sm`}>LV.1</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
                            <button onClick={() => setIsMinimized(true)} className="liquid-icon-btn w-7 h-7 text-xs bg-transparent border-transparent hover:bg-white/10">_</button>
                            {onExpand && (
                                <button onClick={onExpand} className="liquid-icon-btn w-7 h-7 text-xs bg-transparent border-transparent hover:bg-cyan-500/20 hover:text-cyan-400">
                                    🔍
                                </button>
                            )}
                            <button onClick={onClose} className="liquid-icon-btn w-7 h-7 text-xs bg-transparent border-transparent hover:bg-red-500/20 hover:text-red-400">✕</button>
                        </div>
                    </div>

                    {/* Vitals (Liquid Tube Style) */}
                    <div className="space-y-3 pointer-events-none py-1">
                        {/* HP */}
                        <div className="relative group">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1 tracking-wider">
                                <span>INTEGRITY</span>
                                <span className={`font-mono ${agent.hp < agent.maxHp * 0.3 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>{Math.ceil(agent.hp)} / {agent.maxHp}</span>
                            </div>
                            <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-800 via-green-500 to-green-400 transition-all duration-300 relative" 
                                    style={{width: `${Math.max(0, hpPct)}%`}}
                                >
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/30"></div>
                                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-black/20"></div>
                                </div>
                            </div>
                        </div>
                        {/* MP */}
                        <div className="relative group">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1 tracking-wider">
                                <span>ENERGY</span>
                                <span className="font-mono text-blue-400">{Math.floor(agent.mp)}%</span>
                            </div>
                            <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-800 via-blue-500 to-blue-400 transition-all duration-300 relative" 
                                    style={{width: `${mpPct}%`}}
                                >
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-white/30"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Monitor */}
                    <div className="flex justify-between items-center liquid-card-dark p-3 pointer-events-none border-l-2 border-cyan-500/50 shadow-inner">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">NEURAL STATE</span>
                            <span className={`text-sm font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300 text-glow-cyan'}`}>
                                {STATUS_LABELS[agent.btStatus] || agent.btStatus}
                            </span>
                        </div>
                        {/* Active Effects */}
                        <div className="flex gap-1">
                            {agent.stunTimer > 0 && <span className="liquid-tag bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">STUN</span>}
                            {agent.silenceTimer > 0 && <span className="liquid-tag bg-slate-700/50 border-slate-500 text-slate-300">SILENCE</span>}
                            {agent.banished && <span className="liquid-tag bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">BANISH</span>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
