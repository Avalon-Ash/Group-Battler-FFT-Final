
import React, { useState, useEffect } from 'react';
import { Agent, GameEngine } from '../../engine/game';
import { Skill } from '../../types';
import { UnitStatusTab } from '../inspector/tabs/UnitStatusTab';
import { BehaviorTreeTab } from '../inspector/tabs/BehaviorTreeTab';

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

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-200 w-full select-none">
            {/* UNIT HEADER */}
            <div className="p-4 border-b border-slate-800 shrink-0 bg-slate-950 z-20 shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center rounded border bg-slate-900 text-2xl ${agent.team === 0 ? 'border-blue-500 text-blue-400' : 'border-red-500 text-red-400'}`}>
                        {agent.role === 'TANK' && '🛡️'}
                        {agent.role === 'WARRIOR' && '⚔️'}
                        {agent.role === 'RANGER' && '🏹'}
                        {agent.role === 'MAGE' && '🔮'}
                        {agent.role === 'SUPPORT' && '⚕️'}
                    </div>
                    <div>
                        <div className="font-mono font-bold text-xl leading-none">{agent.id}</div>
                        <div className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">LV.1 {agent.role}</div>
                    </div>
                </div>

                {/* SUB TABS */}
                <div className="flex bg-slate-900 rounded p-1 gap-1 border border-slate-700">
                    <button onClick={() => setSubTab('STATUS')} className={`px-4 py-1.5 text-xs rounded font-bold transition-all ${subTab === 'STATUS' ? 'bg-slate-700 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>狀態數值</button>
                    <button onClick={() => setSubTab('AI')} className={`px-4 py-1.5 text-xs rounded font-bold transition-all ${subTab === 'AI' ? 'bg-slate-700 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>AI 行為樹</button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative bg-slate-900/50">
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
