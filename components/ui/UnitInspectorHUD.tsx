
import React from 'react';
import { Agent } from '../../engine/game';
import { Team, Role } from '../../types';

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
    if (!agent) return null;

    const isBlue = agent.team === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500' : 'border-red-500';
    const glowColor = isBlue ? 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'shadow-[0_0_20px_rgba(239,68,68,0.2)]';

    const hpPct = (agent.hp / agent.maxHp) * 100;
    const mpPct = (agent.mp / agent.maxMp) * 100;

    return (
        // Responsive Position:
        // Mobile: bottom-[11rem] (approx 176px) to clear the taller toolbar
        // Desktop: bottom-24 (approx 96px)
        <div className={`absolute bottom-[11rem] md:bottom-24 right-2 md:right-4 z-30 w-[calc(100%-1rem)] md:w-72 max-w-[300px] pointer-events-none animate-slide-up select-none flex justify-end`}>
            {/* Holographic Card Container */}
            <div className={`pointer-events-auto bg-slate-950/80 backdrop-blur-md border-l-4 ${borderColor} border-y border-r border-slate-700/50 rounded-sm p-3 md:p-4 ${glowColor} flex flex-col gap-2 md:gap-3 w-full`}>
                
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
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
                    <div className="flex gap-2">
                        {onExpand && (
                            <button onClick={onExpand} className="text-slate-500 hover:text-cyan-400 transition-colors p-1" title="詳細資訊">
                                🔍
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">✕</button>
                    </div>
                </div>

                {/* Vitals */}
                <div className="space-y-1 md:space-y-2">
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
                <div className="flex justify-between items-center bg-black/30 p-1.5 md:p-2 rounded border border-slate-800">
                    <div className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold">AI STATE</div>
                    <div className={`text-xs md:text-sm font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300'}`}>
                        {STATUS_LABELS[agent.btStatus] || agent.btStatus}
                    </div>
                </div>

                {/* Active Effects (Mini) */}
                <div className="flex gap-1 h-5 overflow-hidden">
                    {agent.stunTimer > 0 && <span className="px-1.5 bg-amber-900/50 border border-amber-500 text-amber-400 text-[9px] md:text-[10px] flex items-center rounded">STUN</span>}
                    {agent.silenceTimer > 0 && <span className="px-1.5 bg-slate-800 border border-slate-500 text-slate-300 text-[9px] md:text-[10px] flex items-center rounded">SILENCE</span>}
                    {agent.banished && <span className="px-1.5 bg-purple-900/50 border border-purple-500 text-purple-300 text-[9px] md:text-[10px] flex items-center rounded">BANISH</span>}
                </div>
            </div>
        </div>
    );
};
