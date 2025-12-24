
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
        margin: 20
    });

    if (!agent) return null;

    const isBlue = agent.team === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500' : 'border-red-500';
    const glowColor = isBlue ? 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'shadow-[0_0_20px_rgba(239,68,68,0.2)]';

    const hpPct = (agent.hp / agent.maxHp) * 100;
    const mpPct = (agent.mp / agent.maxMp) * 100;

    return (
        <div 
            ref={ref}
            className={`z-30 w-[calc(100%-2rem)] md:w-72 max-w-[300px] pointer-events-auto select-none transition-transform duration-75`}
            style={style}
            {...dragHandlers}
        >
            {isMinimized ? (
                // Minimized Pill
                <div 
                    className={`bg-slate-900/90 backdrop-blur border ${borderColor} rounded-full p-2 flex items-center gap-3 shadow-lg cursor-grab ${isDragging ? 'cursor-grabbing' : ''} w-fit ml-auto`}
                >
                    <div className={`w-3 h-3 rounded-full ${isBlue ? 'bg-blue-500' : 'bg-red-500'} animate-pulse`}></div>
                    <span className="font-mono font-bold text-xs text-white">{agent.id}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[10px]"
                    >
                        ☐
                    </button>
                </div>
            ) : (
                // Full Card
                <div className={`bg-slate-950/80 backdrop-blur-md border-l-4 ${borderColor} border-y border-r border-slate-700/50 rounded-sm p-3 md:p-4 ${glowColor} flex flex-col gap-2 md:gap-3 w-full shadow-2xl cursor-grab ${isDragging ? 'cursor-grabbing scale-[1.02]' : ''}`}>
                    
                    {/* Header (Draggable Handle) */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 pointer-events-none">
                            {/* Class Icon */}
                            <div className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded bg-slate-900 border border-slate-600 ${themeColor} text-xl md:text-2xl shadow-inner`}>
                                {agent.role === Role.TANK && '🛡️'}
                                {agent.role === Role.WARRIOR && '⚔️'}
                                {agent.role === Role.RANGER && '🏹'}
                                {agent.role === Role.MAGE && '🔮'}
                                {agent.role === Role.SUPPORT && '⚕️'}
                            </div>
                            <div>
                                <div className={`font-mono font-bold text-lg md:text-xl ${themeColor} leading-none truncate max-w-[120px]`}>{agent.id}</div>
                                <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">{agent.role} UNIT</div>
                            </div>
                        </div>
                        <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
                            <button onClick={() => setIsMinimized(true)} className="text-slate-500 hover:text-white transition-colors p-1" title="最小化">
                                _
                            </button>
                            {onExpand && (
                                <button onClick={onExpand} className="text-slate-500 hover:text-cyan-400 transition-colors p-1" title="詳細資訊">
                                    🔍
                                </button>
                            )}
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1" title="關閉">
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Vitals */}
                    <div className="space-y-1 md:space-y-2 pointer-events-none">
                        {/* HP */}
                        <div className="relative h-3 md:h-4 bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
                            <div className="absolute top-0 left-0 h-full bg-green-600 transition-all duration-300" style={{width: `${Math.max(0, hpPct)}%`}}></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-white drop-shadow-md">
                                HP {Math.ceil(agent.hp)} / {agent.maxHp}
                            </div>
                        </div>
                        {/* MP */}
                        <div className="relative h-1.5 md:h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-800">
                            <div className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300" style={{width: `${mpPct}%`}}></div>
                        </div>
                    </div>

                    {/* Status Monitor */}
                    <div className="flex justify-between items-center bg-black/30 p-1.5 md:p-2 rounded border border-slate-800 pointer-events-none">
                        <div className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold">AI STATE</div>
                        <div className={`text-xs md:text-sm font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300'}`}>
                            {STATUS_LABELS[agent.btStatus] || agent.btStatus}
                        </div>
                    </div>

                    {/* Active Effects (Mini) */}
                    <div className="flex gap-1 h-5 overflow-hidden pointer-events-none">
                        {agent.stunTimer > 0 && <span className="px-1.5 bg-amber-900/50 border border-amber-500 text-amber-400 text-[9px] md:text-[10px] flex items-center rounded">STUN</span>}
                        {agent.silenceTimer > 0 && <span className="px-1.5 bg-slate-800 border border-slate-500 text-slate-300 text-[9px] md:text-[10px] flex items-center rounded">SILENCE</span>}
                        {agent.banished && <span className="px-1.5 bg-purple-900/50 border border-purple-500 text-purple-300 text-[9px] md:text-[10px] flex items-center rounded">BANISH</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
