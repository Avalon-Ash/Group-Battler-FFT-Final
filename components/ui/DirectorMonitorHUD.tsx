import React, { useState, useEffect, useRef } from 'react';
import { GameEngine, Agent } from '../../engine/game';
import { Team } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';

interface DirectorMonitorHUDProps {
    engine: GameEngine;
    onClose: () => void;
}

export const DirectorMonitorHUD: React.FC<DirectorMonitorHUDProps> = ({ engine, onClose }) => {
    const [targetAgent, setTargetAgent] = useState<Agent | null>(null);
    const [version, setVersion] = useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'top-right',
        margin: 20
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const ds = engine.state.director;
            if (ds.targetId) {
                const agent = engine.agents.find(a => a.id === ds.targetId);
                if (agent) {
                    setTargetAgent(agent);
                    setVersion(v => v + 1);
                }
            } else {
                setTargetAgent(null);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [engine]);

    if (!targetAgent) return null;

    const teamColor = targetAgent.team === Team.BLUE ? 'cyan' : 'red';
    const accentColor = targetAgent.team === Team.BLUE ? 'text-cyan-400' : 'text-red-500';
    const barColor = targetAgent.team === Team.BLUE ? 'bg-cyan-500' : 'bg-red-500';
    const borderColor = targetAgent.team === Team.BLUE ? 'border-cyan-500/50' : 'border-red-500/50';
    const glowColor = targetAgent.team === Team.BLUE ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    const hpPct = Math.max(0, targetAgent.hp / targetAgent.maxHp) * 100;
    const mpPct = Math.max(0, targetAgent.mp / targetAgent.maxMp) * 100;

    return (
        <div 
            ref={ref}
            style={{...style, width: '300px'}}
            className="z-40 pointer-events-auto"
            {...dragHandlers}
        >
            <div className={`relative p-1 border-2 border-dashed ${borderColor} rounded-2xl transition-all duration-300 ${isDragging ? 'scale-105' : ''}`}>
                <div 
                    className="liquid-card !bg-slate-900/95 !rounded-xl p-5 border border-white/5 backdrop-blur-xl shadow-2xl"
                    style={{ boxShadow: `0 0 30px ${glowColor}` }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${targetAgent.team === Team.BLUE ? 'bg-cyan-400' : 'bg-red-500'} animate-pulse`}></div>
                                <span className={`text-[11px] font-black tracking-widest ${accentColor}`}>TRK_LIVE: {targetAgent.id}</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Telemetry active // Signal strength: 98%</span>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            <Icons.Close className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-black text-slate-400">
                                <span>VITALITY (HP)</span>
                                <span className="font-mono">{Math.ceil(targetAgent.hp)} / {Math.ceil(targetAgent.maxHp)}</span>
                            </div>
                            <div className="h-2 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${hpPct}%` }}></div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[9px] font-black text-slate-400">
                                <span>ENERGY (MP)</span>
                                <span className="font-mono text-blue-300">{Math.ceil(targetAgent.mp)} / {Math.ceil(targetAgent.maxMp)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${mpPct}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-4 border-t border-white/10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Engagement</span>
                            <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Tracking Target:</span>
                                <span className={`text-[10px] font-mono font-bold ${targetAgent.target ? 'text-white' : 'text-slate-600'}`}>
                                    {targetAgent.target?.id || 'NO_LOCK'}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Decision Matrix</span>
                            <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Task:</span>
                                <span className="text-[10px] font-mono font-bold text-cyan-300 truncate max-w-[120px]">
                                    {targetAgent.btStatus || 'IDLE_SCAN'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 h-8 flex items-end gap-0.5 overflow-hidden opacity-30">
                        {Array.from({length: 20}).map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-2 ${barColor} animate-pulse`} 
                                style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};