
import React, { useEffect, useState } from 'react';
import { Agent } from '../engine/game';
import { Skill, LogEntry, Team } from '../types';
import { DesignExporter } from '../engine/systems/DesignExporter';

// Tabs
import { LogTab } from './inspector/tabs/LogTab';
import { SkillDbTab } from './inspector/tabs/SkillDbTab';
import { UnitStatusTab } from './inspector/tabs/UnitStatusTab';
import { BehaviorTreeTab } from './inspector/tabs/BehaviorTreeTab';

interface InspectorProps {
    agent: Agent | null;
    engine: any;
    logs: LogEntry[]; 
    db: Skill[];
    onHoverSkill?: (skill: Skill | null) => void;
}

const InspectorPanel: React.FC<InspectorProps> = ({ agent, engine, db, onHoverSkill }) => {
    const [tab, setTab] = useState<'INSPECTOR' | 'LOG' | 'DB'>('INSPECTOR');
    const [inspectorSubTab, setInspectorSubTab] = useState<'STATUS' | 'AI'>('STATUS');
    const [version, setVersion] = useState(0); 

    // Refresh Loop for visual updates
    useEffect(() => {
        if (tab !== 'INSPECTOR' || !agent) return;
        const interval = setInterval(() => setVersion(n => n + 1), 50); // 20 FPS refresh
        return () => clearInterval(interval);
    }, [tab, agent]);

    const handleUpdate = () => {
        setVersion(n => n + 1);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 w-full select-none border-l border-slate-800">
            {/* MAIN TAB NAV */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 items-center pr-2">
                {['INSPECTOR', 'LOG', 'DB'].map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t as any)} 
                        className={`flex-1 py-4 text-sm font-bold tracking-wider transition-all ${tab === t ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                    >
                        {t === 'INSPECTOR' ? '單位監控' : (t === 'LOG' ? '戰況紀錄' : '技能資料庫')}
                    </button>
                ))}
                
                {/* Export Spec Button */}
                <button 
                    onClick={() => DesignExporter.downloadSpec()}
                    className="ml-2 w-8 h-8 flex items-center justify-center rounded bg-slate-800 border border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all shadow-sm"
                    title="導出遊戲設計規格 (TXT)"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                {tab === 'INSPECTOR' && (!agent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                        <div className="text-6xl mb-4 opacity-20">⌖</div>
                        <div className="text-lg font-bold">未選取單位</div>
                        <div className="text-sm">請在地圖上選取單位以查看詳情。</div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                         {/* UNIT HEADER */}
                        <div className="p-4 pt-6 border-b border-slate-800 shrink-0 bg-slate-900 z-20 shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`w-4 h-4 rounded-full ${agent.team === Team.BLUE ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
                                        <span className="font-mono text-2xl font-bold text-white tracking-tight">{agent.id}</span>
                                    </div>
                                    <div className="text-slate-400 text-xs font-mono flex gap-3">
                                        <span>位置: <span className="text-slate-200">{agent.q}, {agent.r}</span></span>
                                        <span>|</span>
                                        <span>HP: <span className={agent.hp < agent.maxHp * 0.3 ? 'text-red-500 animate-pulse' : 'text-green-400'}>{Math.ceil(agent.hp)}</span>/{agent.maxHp}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">當前行動</div>
                                    <div className="bg-slate-800 border border-slate-600 px-3 py-1 rounded text-cyan-300 font-bold text-sm shadow-inner min-w-[100px] text-center">
                                        {agent.btStatus}
                                    </div>
                                </div>
                            </div>
                            
                            {/* SUB TABS */}
                            <div className="flex bg-slate-950 rounded p-1 gap-1 border border-slate-800">
                                <button onClick={() => setInspectorSubTab('STATUS')} className={`flex-1 py-2 text-xs rounded font-bold transition-all ${inspectorSubTab === 'STATUS' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:bg-slate-900'}`}>狀態數值</button>
                                <button onClick={() => setInspectorSubTab('AI')} className={`flex-1 py-2 text-xs rounded font-bold transition-all ${inspectorSubTab === 'AI' ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:bg-slate-900'}`}>AI 行為</button>
                            </div>
                        </div>

                        {/* TAB CONTENT */}
                        {inspectorSubTab === 'STATUS' ? (
                            <UnitStatusTab 
                                agent={agent} 
                                db={db} 
                                onHoverSkill={onHoverSkill} 
                                onUpdate={handleUpdate}
                            />
                        ) : (
                            <BehaviorTreeTab 
                                agent={agent} 
                                version={version} 
                            />
                        )}
                    </div>
                ))}

                {tab === 'LOG' && (
                    <LogTab engine={engine} />
                )}

                {tab === 'DB' && (
                    <SkillDbTab 
                        db={db} 
                        onUpdate={handleUpdate}
                    />
                )}
            </div>
        </div>
    );
};

export default InspectorPanel;
