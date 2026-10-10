import React from 'react';
import { GameEngine } from '../../engine/game';
import { Team } from '../../types';
import { useEngineView } from '../../hooks/useEngineView';
import { selectDirectorTargetView } from '../../engine/systems/ui/selectors';
import { Helpers } from '../inspector/InspectorConstants';

interface DirectorMonitorHUDProps {
    engine?: GameEngine;
}

export const DirectorMonitorHUD: React.FC<DirectorMonitorHUDProps> = ({ engine }) => {
    const targetAgent = useEngineView(engine, selectDirectorTargetView);

    const accentColor = targetAgent?.team === Team.BLUE ? 'text-cyan-400' : 'text-red-500';
    const barColor = targetAgent?.team === Team.BLUE ? 'bg-cyan-500' : 'bg-red-500';
    const borderColor = targetAgent?.team === Team.BLUE ? 'border-cyan-500/50' : 'border-red-500/50';
    const glowColor = targetAgent?.team === Team.BLUE ? 'rgba(6, 182, 212, 0.4)' : 'rgba(239, 68, 68, 0.4)';

    const hpPct = targetAgent && targetAgent.maxHp > 0 ? Math.max(0, targetAgent.hp / targetAgent.maxHp) * 100 : 0;
    const mpPct = targetAgent && targetAgent.maxMp > 0 ? Math.max(0, targetAgent.mp / targetAgent.maxMp) * 100 : 0;

    return (
        <div className="w-full h-full p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar select-none">
            <div className={`relative p-1 border border-dashed ${targetAgent ? borderColor : 'border-slate-700/50'} rounded-2xl transition-all duration-300`}>
                <div
                    className="liquid-card !bg-slate-900/95 !rounded-xl p-4 border border-white/5 backdrop-blur-xl"
                    style={{ boxShadow: targetAgent ? `0 0 24px ${glowColor}` : 'none' }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${targetAgent ? (targetAgent.team === Team.BLUE ? 'bg-cyan-400' : 'bg-red-500') : 'bg-slate-600'} animate-pulse`} />
                                <span className={`text-[11px] font-black tracking-widest ${targetAgent ? accentColor : 'text-slate-500'}`}>
                                    {targetAgent ? `即時追蹤: ${targetAgent.id}` : '搜尋鎖定中...'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">
                                {targetAgent ? '遙測信號連線 // 信號強度: 98%' : '正在搜尋鏡頭焦點單位...'}
                            </span>
                        </div>
                    </div>

                    {!targetAgent ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-cyan-500 animate-spin" />
                            <span className="text-[10px] font-mono text-slate-600 animate-pulse">尚未鎖定目標 (NO TARGET)</span>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black text-slate-400">
                                        <span>生命值 (HP)</span>
                                        <span className="font-mono">{Math.ceil(targetAgent.hp)} / {Math.ceil(targetAgent.maxHp)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                        <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${hpPct}%` }} />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-black text-slate-400">
                                        <span>能量值 (MP)</span>
                                        <span className="font-mono text-blue-300">{Math.ceil(targetAgent.mp)} / {Math.ceil(targetAgent.maxMp)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${mpPct}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-3 border-t border-white/10">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">交戰鎖定狀態</span>
                                    <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">目標單位:</span>
                                        <span className={`text-[10px] font-mono font-bold ${targetAgent.targetId ? 'text-white' : 'text-slate-600'}`}>
                                            {targetAgent.targetId || '無鎖定目標'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">決策矩陣 (BT / SSOT)</span>
                                    <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">執行流程:</span>
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <span className="text-[10px] font-mono font-bold text-amber-400 truncate max-w-[60px]">
                                                {Helpers.getAIStateLabel(targetAgent.aiState)}
                                            </span>
                                            <span className="text-slate-700 text-[9px]">|</span>
                                            <span className="text-[10px] font-mono font-bold text-cyan-300 truncate max-w-[80px]">
                                                {Helpers.getActionStateLabel(targetAgent.actionState)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="mt-4 h-6 flex items-end gap-0.5 overflow-hidden opacity-30">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 ${targetAgent ? barColor : 'bg-slate-700'} animate-pulse`}
                                style={{ height: `${20 + ((i * 17) % 80)}%`, animationDelay: `${i * 0.1}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
