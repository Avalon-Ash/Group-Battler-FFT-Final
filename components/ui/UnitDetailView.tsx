
import React, { useState, useEffect } from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { Role, Skill } from '../../types';
import { UnitStatusTab } from '../inspector/tabs/UnitStatusTab';
import { BehaviorTreeTab } from '../inspector/tabs/BehaviorTreeTab';
import { Icons } from './icons';

interface UnitDetailViewProps {
    agent: Agent;
    db: Skill[];
    engine: GameEngine;
}

export const UnitDetailView: React.FC<UnitDetailViewProps> = ({ agent, db, engine }) => {
    const [subTab, setSubTab] = useState<'STATUS' | 'AI'>('STATUS');
    const [version, setVersion] = useState(0); 

    // Refresh Loop for visual updates (Health, AI Nodes)
    useEffect(() => {
        const interval = setInterval(() => setVersion(n => n + 1), 100); // 10 FPS is enough for UI
        return () => clearInterval(interval);
    }, []);

    const handleUpdate = () => {
        setVersion(n => n + 1);
    };

    const renderRoleIcon = (role: Role) => {
        switch (role) {
            case Role.TANK: return <Icons.RoleTank className="w-6 h-6" />;
            case Role.WARRIOR: return <Icons.RoleWarrior className="w-6 h-6" />;
            case Role.RANGER: return <Icons.RoleRanger className="w-6 h-6" />;
            case Role.MAGE: return <Icons.RoleMage className="w-6 h-6" />;
            case Role.SUPPORT: return <Icons.RoleSupport className="w-6 h-6" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full select-none">
            {/* UNIT HEADER (Liquid Glass) */}
            <div className="p-5 border-b border-white/10 shrink-0 z-20 flex items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl liquid-card-dark border text-2xl shadow-inner ${agent.team === 0 ? 'border-blue-500/50 text-blue-400' : 'border-red-500/50 text-red-400'}`}>
                        {renderRoleIcon(agent.role)}
                    </div>
                    <div>
                        <div className="font-mono font-black text-2xl leading-none text-white tracking-tight">{agent.id}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Level 1</span>
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${agent.team === 0 ? 'text-blue-400' : 'text-red-400'}`}>{agent.role}</span>
                        </div>
                    </div>
                </div>

                {/* SUB TABS (Liquid Capsules) */}
                <div className="flex liquid-card-dark p-1 gap-1">
                    <button onClick={() => setSubTab('STATUS')} className={`px-6 py-2 text-xs rounded-xl font-bold transition-all uppercase tracking-wider ${subTab === 'STATUS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>STATUS</button>
                    <button onClick={() => setSubTab('AI')} className={`px-6 py-2 text-xs rounded-xl font-bold transition-all uppercase tracking-wider ${subTab === 'AI' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>BEHAVIOR</button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative">
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
