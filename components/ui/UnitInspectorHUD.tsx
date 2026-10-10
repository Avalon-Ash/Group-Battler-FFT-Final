
import React, { useState, useRef, useEffect } from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { Team, Role, AIState } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';
import { Helpers, ROLE_MAP } from '../inspector/InspectorConstants';
import { BehaviorTreeTab } from '../inspector/tabs/BehaviorTreeTab';
import { UnitStatusTab } from '../inspector/tabs/UnitStatusTab';
import { selectAgentView } from '../../engine/systems/ui/selectors';
import { useEngineCommands } from '../../hooks/useEngineCommands';

interface UnitInspectorHUDProps {
    agent: Agent | null;
    engine: GameEngine;
    onClose: () => void;
}

type TabType = 'NONE' | 'AI' | 'SKILLS';

export const UnitInspectorHUD: React.FC<UnitInspectorHUDProps> = ({ agent, engine, onClose }) => {
    const [viewMode, setViewMode] = useState<TabType>('NONE'); // NONE = Compact, AI/SKILLS = Expanded
    const [isMinimized, setIsMinimized] = useState(false);
    const [isConfigExpanded, setIsConfigExpanded] = useState(false); // Config Drawer State
    const [version, setVersion] = useState(0); // For forcing UI refresh

    const { editAgent } = useEngineCommands(engine);
    const agentView = selectAgentView(engine, agent?.id);

    // The ref moves the outer container
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-right',
        margin: 20
    });

    // Refresh Loop for visual updates (Health, AI Nodes) when expanded
    useEffect(() => {
        if (!isMinimized) {
            const interval = setInterval(() => setVersion(n => n + 1), 100);
            return () => clearInterval(interval);
        }
    }, [viewMode, isMinimized]);

    if (!agent) return null;

    const currentRole = agentView?.role ?? agent.role;
    const currentMaxHp = agentView?.maxHp ?? agent.maxHp;
    const currentHp = agentView?.hp ?? agent.hp;
    const currentMaxMp = agentView?.maxMp ?? agent.maxMp;
    const currentMp = agentView?.mp ?? agent.mp;
    const currentTeam = agentView?.team ?? agent.team;

    const isBlue = currentTeam === Team.BLUE;
    const themeColor = isBlue ? 'text-blue-400' : 'text-red-400';
    const borderColor = isBlue ? 'border-blue-500/30' : 'border-red-500/30';
    const glowClass = isBlue ? 'shadow-[0_8px_32px_rgba(59,130,246,0.15)]' : 'shadow-[0_8px_32px_rgba(239,68,68,0.15)]';

    const hpPct = currentMaxHp > 0 ? (currentHp / currentMaxHp) * 100 : 0;
    const mpPct = currentMaxMp > 0 ? (currentMp / currentMaxMp) * 100 : 0;

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

    const setRole = (r: string) => { 
        if (agent) {
            editAgent(agent.id, { role: r as Role }); 
            setVersion(v => v + 1);
        }
    };

    return (
        <div 
            ref={ref}
            className={`z-30 pointer-events-auto select-none transition-all duration-300 ease-out`}
            style={{ 
                ...style, 
                width: isMinimized ? 'auto' : (viewMode === 'NONE' ? '320px' : '420px'),
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
                <div className={`liquid-card !rounded-[24px] overflow-hidden flex flex-col ${glowClass} border border-white/10 backdrop-blur-xl bg-slate-900/90`}>
                    
                    {/* Header - DRAGGABLE */}
                    <div 
                        {...dragHandlers}
                        className={`p-3 bg-gradient-to-b from-white/10 to-transparent relative cursor-grab active:cursor-grabbing ${isDragging ? 'cursor-grabbing' : ''}`}
                    >
                        <div className="flex justify-between items-start gap-4">
                            {/* Identity & Config Toggle */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border ${borderColor} ${themeColor} shadow-inner shrink-0`}>
                                    {renderRoleIcon(currentRole)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className={`font-mono font-bold text-sm ${themeColor} leading-none tracking-tight truncate`}>{agent.id}</div>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{ROLE_MAP[currentRole]?.label || currentRole}</span>
                                        {/* Config Button (Larger & clearer) */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsConfigExpanded(!isConfigExpanded); }}
                                            onPointerDown={e => e.stopPropagation()}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isConfigExpanded ? 'bg-cyan-500 text-white shadow-md' : 'bg-white/10 text-slate-400 hover:text-white hover:bg-white/20'}`}
                                            title="編輯單位屬性"
                                        >
                                            <Icons.Settings className={`w-4 h-4 ${isConfigExpanded ? 'animate-spin-slow' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-1 items-center shrink-0" onPointerDown={e => e.stopPropagation()}>
                                {/* Mode Toggles */}
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 mr-2">
                                    <button 
                                        onClick={() => setViewMode(viewMode === 'AI' ? 'NONE' : 'AI')} 
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${viewMode === 'AI' ? 'bg-amber-500/20 text-amber-300 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="行為樹監控 (AI)"
                                    >
                                        AI
                                    </button>
                                    <button 
                                        onClick={() => setViewMode(viewMode === 'SKILLS' ? 'NONE' : 'SKILLS')} 
                                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${viewMode === 'SKILLS' ? 'bg-cyan-500/20 text-cyan-300 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
                                        title="技能配置 (LINK)"
                                    >
                                        LINK
                                    </button>
                                </div>

                                <button 
                                    onClick={() => setIsMinimized(true)} 
                                    title="最小化"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white border border-transparent transition-all active:scale-95"
                                >
                                    <Icons.Minimize className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={onClose} 
                                    title="關閉"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-transparent transition-all active:scale-95"
                                >
                                    <Icons.Close className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* CONFIG DRAWER */}
                        <div 
                            className={`overflow-hidden transition-all duration-300 ease-out ${isConfigExpanded ? 'max-h-32 opacity-100 mt-3 pb-1 scale-100' : 'max-h-0 opacity-0 scale-95 origin-top'}`}
                            onPointerDown={e => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-xl border border-white/10 shadow-inner">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">職業</label>
                                    <select 
                                        className="liquid-input h-8 w-full text-xs font-bold bg-black/50 !rounded-lg border-white/10 focus:border-cyan-500/50 p-0 pl-2 text-white"
                                        value={currentRole} 
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        {Object.values(Role).map(r => <option key={r} value={r} className="bg-slate-900">{ROLE_MAP[r].label.split(' ')[0]}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest block text-center">生命值</label>
                                    <input 
                                        type="number" 
                                        className="liquid-input h-8 w-full text-center text-green-400 font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 focus:border-green-500/50 p-0"
                                        value={Math.round(currentMaxHp)} 
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            if (!Number.isNaN(v) && v > 0) {
                                                editAgent(agent.id, { maxHp: v, hp: v });
                                                setVersion(n => n + 1);
                                            }
                                        }} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-blue-500/70 uppercase tracking-widest block text-center">能量值</label>
                                    <input 
                                        type="number" 
                                        className="liquid-input h-8 w-full text-center text-blue-400 font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 focus:border-blue-500/50 p-0"
                                        value={Math.round(currentMaxMp)} 
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            if (!Number.isNaN(v) && v >= 0) {
                                                editAgent(agent.id, { maxMp: v });
                                                setVersion(n => n + 1);
                                            }
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vitals Bars */}
                        <div className="space-y-1 mt-3 pointer-events-none">
                            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full flex border border-white/5">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${Math.max(0, hpPct)}%`}}></div>
                            </div>
                            {currentMaxMp > 0 && (
                                <div className="h-1 bg-black/50 rounded-full overflow-hidden w-full flex border border-white/5">
                                    <div className="h-full bg-cyan-500 transition-all duration-300" style={{width: `${mpPct}%`}}></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Compact Status */}
                    {viewMode === 'NONE' && (
                        <div className="px-3 pb-3 cursor-default" onPointerDown={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center bg-black/20 rounded-lg p-2 border border-white/5">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">行為樹狀態 | 執行流程</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-amber-400'}`}>
                                            {Helpers.getAIStateLabel(agent.aiState)}
                                        </span>
                                        <span className="text-slate-700 font-mono text-[10px]">/</span>
                                        <span className={`text-xs font-mono font-bold ${agent.hp <= 0 ? 'text-slate-600' : 'text-cyan-300'}`}>
                                            {Helpers.getActionStateLabel(agent.actionState)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {agent.stunTimer > 0 && <span className="liquid-tag bg-amber-500/20 border-amber-500/50 text-amber-300 text-[10px] px-1.5">暈眩</span>}
                                    {agent.silenceTimer > 0 && <span className="liquid-tag bg-slate-700/50 border-slate-500 text-slate-300 text-[10px] px-1.5">沉默</span>}
                                    {agent.banished && <span className="liquid-tag bg-purple-500/20 border-purple-500/50 text-purple-300 text-[10px] px-1.5">放逐</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EXPANDED CONTENT AREA */}
                    {viewMode !== 'NONE' && (
                        <div 
                            className="border-t border-white/5 bg-black/20 animate-slide-down overflow-hidden flex flex-col transition-all"
                            style={{ height: '320px' }} 
                            onPointerDown={e => e.stopPropagation()}
                        >
                            {viewMode === 'AI' ? (
                                <div className="w-full h-full relative">
                                    <BehaviorTreeTab agent={agent} version={version} engine={engine} />
                                    <div className="absolute bottom-2 right-2 text-[10px] text-white/20 font-mono pointer-events-none">
                                        即時運算中 (LIVE)
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
