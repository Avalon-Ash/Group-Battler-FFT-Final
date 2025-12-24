
import React, { useState, useRef } from 'react';
import { Agent } from '../../engine/game';
import { Team, Role } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';

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
    
    // The ref moves the outer container
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-right',
        margin: 40
    });

    if (!agent) return null;

    const isBlue = agent.team === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500/50' : 'border-red-500/50';
    const glowClass = isBlue ? 'shadow-[0_8px_32px_rgba(59,130,246,0.25)]' : 'shadow-[0_8px_32px_rgba(239,68,68,0.25)]';

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
            className={`z-30 w-[calc(100%-2rem)] md:w-72 pointer-events-auto select-none transition-transform duration-75 ease-out`}
            style={style}
        >
            {isMinimized ? (
                // Minimized Pill (Fully Draggable)
                <div 
                    {...dragHandlers}
                    className={`liquid-card !rounded-full p-2 pl-3 flex items-center gap-3 cursor-grab active:cursor-grabbing w-fit ml-auto border-l-4 ${borderColor} ${glowClass}`}
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
                // Full Card
                <div className={`liquid-card !rounded-[24px] overflow-hidden flex flex-col ${glowClass} border border-white/10 backdrop-blur-3xl bg-slate-900/90`}>
                    
                    {/* Header - DRAGGABLE HANDLE ONLY */}
                    <div 
                        {...dragHandlers}
                        className={`p-4 pb-3 bg-gradient-to-b from-white/5 to-transparent relative cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2 pointer-events-none">
                            <div className="flex items-center gap-3">
                                {/* Role Icon */}
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border ${borderColor} ${themeColor} shadow-inner`}>
                                    {renderRoleIcon(agent.role)}
                                </div>
                                <div className="flex flex-col">
                                    <div className={`font-mono font-black text-lg ${themeColor} leading-none tracking-tight drop-shadow-md`}>{agent.id}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{agent.role}</span>
                                        <span className={`text-[9px] font-bold px-1.5 rounded-md ${isBlue ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'}`}>LV.1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Controls (Absolute positioning to overlay the draggable header but remain clickable) */}
                        <div className="absolute top-4 right-4 flex gap-1 pointer-events-auto" onPointerDown={e => e.stopPropagation()}>
                            <button onClick={() => setIsMinimized(true)} className="liquid-icon-btn w-6 h-6 text-[10px] bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white border-transparent">
                                <Icons.Minimize className="w-3 h-3" />
                            </button>
                            {onExpand && (
                                <button onClick={onExpand} className="liquid-icon-btn w-6 h-6 text-[10px] bg-cyan-500/10 hover:bg-cyan-500/30 text-cyan-400 border-transparent">
                                    <Icons.Expand className="w-3 h-3" />
                                </button>
                            )}
                            <button onClick={onClose} className="liquid-icon-btn w-6 h-6 text-[10px] bg-red-500/10 hover:bg-red-500/30 text-red-400 border-transparent">
                                <Icons.Close className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Integrated Slim Bars (Non-interactive) */}
                        <div className="space-y-1 mt-1 pointer-events-none">
                            {/* HP */}
                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full flex">
                                <div 
                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300" 
                                    style={{width: `${Math.max(0, hpPct)}%`}}
                                ></div>
                            </div>
                            {/* MP */}
                            {agent.maxMp > 0 && (
                                <div className="h-1 bg-black/50 rounded-full overflow-hidden w-full flex">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-700 to-cyan-400 transition-all duration-300" 
                                        style={{width: `${mpPct}%`}}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Body: Status Only - NOT DRAGGABLE */}
                    <div className="px-4 pb-4 pt-0 cursor-default" onPointerDown={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center bg-black/20 rounded-xl p-3 border border-white/5">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">STATE</span>
                                <span className={`text-xs font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300 text-glow-cyan'}`}>
                                    {STATUS_LABELS[agent.btStatus] || agent.btStatus}
                                </span>
                            </div>
                            {/* Active Effects */}
                            <div className="flex gap-1">
                                {agent.stunTimer > 0 && <span className="liquid-tag bg-amber-500/20 border-amber-500/50 text-amber-300 text-[9px] px-1.5">STUN</span>}
                                {agent.silenceTimer > 0 && <span className="liquid-tag bg-slate-700/50 border-slate-500 text-slate-300 text-[9px] px-1.5">SILENCE</span>}
                                {agent.banished && <span className="liquid-tag bg-purple-500/20 border-purple-500/50 text-purple-300 text-[9px] px-1.5">BANISH</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
