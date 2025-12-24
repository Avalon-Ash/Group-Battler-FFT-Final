
import React, { useState, useEffect } from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { Role, Skill, Team } from '../../types';
import { UnitStatusTab } from '../inspector/tabs/UnitStatusTab';
import { BehaviorTreeTab } from '../inspector/tabs/BehaviorTreeTab';
import { Icons } from './icons';
import { ROLE_MAP, Helpers } from '../inspector/InspectorConstants';

interface UnitDetailViewProps {
    agent: Agent;
    db: Skill[];
    engine: GameEngine;
}

export const UnitDetailView: React.FC<UnitDetailViewProps> = ({ agent, db, engine }) => {
    const [subTab, setSubTab] = useState<'STATUS' | 'AI'>('STATUS');
    const [version, setVersion] = useState(0); 
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);

    // Refresh Loop for visual updates (Health, AI Nodes)
    useEffect(() => {
        const interval = setInterval(() => setVersion(n => n + 1), 100); // 10 FPS is enough for UI
        return () => clearInterval(interval);
    }, []);

    const handleUpdate = () => {
        setVersion(n => n + 1);
    };

    const setRole = (r: string) => { 
        agent.role = r as Role; 
        handleUpdate(); 
    };

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

    const roleConfig = Helpers.getRoleConfig(agent.role);
    const hpPct = (agent.hp / agent.maxHp) * 100;
    const mpPct = (agent.mp / agent.maxMp) * 100;

    return (
        <div className="flex flex-col h-full w-full select-none overflow-hidden relative">
            
            {/* 1. COMPACT HEADER BAR */}
            <div className="shrink-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-white/10 transition-all duration-300">
                <div className="flex items-center justify-between px-4 py-2 gap-4 h-16">
                    
                    {/* LEFT: Identity & Vitals (Interactive) */}
                    <div 
                        className={`flex items-center gap-3 min-w-0 flex-1 cursor-pointer group rounded-lg transition-all duration-300 p-1.5 ${isConfigExpanded ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`} 
                        onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                    >
                        {/* Role Icon */}
                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-black/40 border ${roleConfig.border} ${roleConfig.color} shadow-lg shrink-0 transition-all ${!isConfigExpanded ? 'group-hover:scale-105' : ''}`}>
                            {renderRoleIcon(agent.role)}
                        </div>
                        
                        {/* Text & Bars */}
                        <div className="flex flex-col min-w-0 justify-center flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white font-mono tracking-tight truncate">{agent.id}</h3>
                                <span className={`text-[10px] font-bold px-1.5 rounded ${agent.team === Team.BLUE ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300'}`}>LV.1</span>
                            </div>
                            
                            {/* Compact Bars */}
                            <div className="flex items-center gap-2 mt-1 w-full max-w-[120px]">
                                <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5 relative" title={`HP: ${Math.round(agent.hp)}/${agent.maxHp}`}>
                                    <div className="absolute inset-0 bg-green-500/20"></div>
                                    <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${hpPct}%`}}></div>
                                </div>
                                <div className="w-1/3 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5 relative" title={`MP: ${Math.floor(agent.mp)}/${agent.maxMp}`}>
                                    <div className="absolute inset-0 bg-blue-500/20"></div>
                                    <div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${mpPct}%`}}></div>
                                </div>
                            </div>
                        </div>

                        {/* CONFIG GEAR (Always Visible + Breathing Effect) */}
                        <div className="flex items-center gap-2 px-2 border-l border-white/10">
                            {!isConfigExpanded && (
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan] animate-pulse"></div>
                            )}
                            <Icons.Settings 
                                className={`w-4 h-4 transition-all duration-300 ${isConfigExpanded ? 'text-cyan-400 rotate-90 scale-110' : 'text-slate-500 group-hover:text-cyan-200'}`} 
                            />
                        </div>
                    </div>

                    {/* RIGHT: Tab Switcher */}
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 shrink-0">
                        <button 
                            onClick={() => setSubTab('STATUS')} 
                            className={`px-4 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-wider flex items-center gap-2 ${subTab === 'STATUS' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            <Icons.Database className="w-3 h-3" />
                            LINKAGE
                        </button>
                        <button 
                            onClick={() => setSubTab('AI')} 
                            className={`px-4 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-wider flex items-center gap-2 ${subTab === 'AI' ? 'bg-amber-500/20 text-amber-300 shadow-sm' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                        >
                            <Icons.Settings className="w-3 h-3" />
                            BEHAVIOR
                        </button>
                    </div>
                </div>

                {/* DRAWER: Config Editor */}
                <div className={`overflow-hidden transition-all duration-300 ease-out bg-black/40 border-t border-white/5 ${isConfigExpanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="grid grid-cols-3 gap-4 px-4 py-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Role Class</label>
                            <select 
                                className="liquid-input h-8 w-full text-xs font-bold bg-black/50 !rounded-lg border-white/10 focus:border-cyan-500/50"
                                value={agent.role} 
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {Object.values(Role).map(r => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-green-500/70 uppercase tracking-widest">Max HP</label>
                            <input 
                                type="number" 
                                className="liquid-input h-8 w-full text-center text-green-400 font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 focus:border-green-500/50"
                                value={Math.round(agent.maxHp)} 
                                onChange={(e) => { const v = parseInt(e.target.value); agent.maxHp = v; agent.hp = v; handleUpdate(); }} 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-blue-500/70 uppercase tracking-widest">Max MP</label>
                            <input 
                                type="number" 
                                className="liquid-input h-8 w-full text-center text-blue-400 font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 focus:border-blue-500/50"
                                value={Math.round(agent.maxMp)} 
                                onChange={(e) => { agent.maxMp = parseInt(e.target.value); handleUpdate(); }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative min-h-0 bg-slate-900/50">
                {subTab === 'STATUS' ? (
                    <UnitStatusTab 
                        agent={agent} 
                        db={db} 
                        onHoverSkill={() => {}} 
                        onUpdate={handleUpdate}
                    />
                ) : (
                    <BehaviorTreeTab 
                        agent={agent} 
                        version={version}
                        engine={engine} 
                    />
                )}
            </div>
        </div>
    );
};
