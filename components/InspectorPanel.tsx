
import React, { useEffect, useState, useRef, memo } from 'react';
import { Agent } from '../engine/game';
import { BTNode } from '../engine/behaviorTree';
import { Team, Skill, LogEntry, NodeState, Role } from '../types';
import { AssetManager } from '../engine/assets';

interface InspectorProps {
    agent: Agent | null;
    engine: any;
    logs: LogEntry[]; 
    db: Skill[];
    onHoverSkill?: (skill: Skill | null) => void;
}

// --- VISUALIZATION COMPONENTS ---

const TreeNode: React.FC<{ node: BTNode, version: number, now: number }> = ({ node, version, now }) => {
    // Logic for Visual Persistence
    const timeDiff = now - node.lastRunTime;
    let visualState: NodeState | null = node.status;
    let isFading = false;
    let opacity = 1.0;

    if (!visualState && node.lastResult) {
        if (timeDiff < 1000) { 
            visualState = node.lastResult;
            isFading = true;
            if (timeDiff > 200) opacity = 0.7;
            if (timeDiff > 500) opacity = 0.4;
        }
    }

    const statusStyle = (s: NodeState | null) => {
        switch (s) {
            case NodeState.RUNNING: return "border-amber-500 bg-amber-950/80 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.5)] ring-2 ring-amber-500 animate-pulse-glow z-10 scale-105";
            case NodeState.SUCCESS: return "border-emerald-500 bg-emerald-950/80 text-emerald-100 shadow-[0_0_5px_rgba(16,185,129,0.4)]";
            case NodeState.FAILURE: return "border-red-800 bg-red-950/80 text-red-200 opacity-80";
            default: return "border-slate-600 bg-slate-800 text-slate-400";
        }
    };

    const typeSymbol = (t: string) => {
        if(t === '?') return <span className="text-purple-400 font-bold mr-2 text-lg">?</span>;
        if(t === '->') return <span className="text-blue-400 font-bold mr-2 text-lg">➜</span>;
        if(t === 'COND') return <span className="text-pink-400 text-sm mr-2">◆</span>;
        if(t === 'ACT') return <span className="text-yellow-400 text-sm mr-2">⚡</span>;
        return null;
    }

    return (
        <div className="flex flex-col items-center">
            <div 
                className={`flex items-center px-4 py-3 rounded-md border-2 text-sm font-mono font-bold transition-all duration-100 cursor-default select-none shadow-md min-w-[120px] justify-center ${statusStyle(visualState)}`}
                style={{ opacity: opacity }}
            >
                {typeSymbol(node.type)}
                <span className="whitespace-nowrap truncate max-w-[180px]">{node.n}</span>
            </div>
            {node.c && node.c.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className={`w-0.5 h-6 ${isFading ? 'bg-slate-600/50' : 'bg-slate-500'}`}></div>
                    <div className="flex items-start gap-4">
                        {node.c.map((child, idx) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Connector Lines */}
                                <div className="absolute top-0 left-0 w-full h-6 -mt-6 pointer-events-none">
                                     {node.c.length > 1 && (
                                         <>
                                            {idx === 0 && <div className="absolute right-0 top-0 w-1/2 h-0.5 bg-slate-500 translate-y-6"></div>}
                                            {idx === node.c.length - 1 && <div className="absolute left-0 top-0 w-1/2 h-0.5 bg-slate-500 translate-y-6"></div>}
                                            {idx > 0 && idx < node.c.length - 1 && <div className="absolute left-0 top-0 w-full h-0.5 bg-slate-500 translate-y-6"></div>}
                                         </>
                                     )}
                                     <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-slate-500 translate-y-6 -translate-x-1/2"></div>
                                </div>
                                
                                <div className="pt-6">
                                    <TreeNode node={child} version={version} now={now} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const SkillIcon: React.FC<{ skill: Skill | null, className?: string }> = ({ skill, className }) => {
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-10 h-10';
    if (!skill || !skill.visual) return <div className={`rounded bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xs text-slate-500 ${sizeClass} ${className || ''}`}>∅</div>;
    const iconUrl = AssetManager.getSkillIcon(skill.visual, skill.color).toDataURL();
    return <img src={iconUrl} className={`rounded bg-slate-900 border-2 border-slate-600 shadow-md ${sizeClass} ${className || ''}`} alt={skill.visual} />;
};

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="mb-2 border-b border-slate-800 pb-2 last:border-0 hover:bg-slate-900/50 transition-colors text-xs sm:text-sm font-mono flex items-start">
        <span className="text-slate-500 w-14 shrink-0 opacity-70">[{log.time}s]</span>
        <div className="flex-1 min-w-0 break-words">
            <span className={`font-bold mr-2 ${log.team === Team.BLUE ? 'text-blue-400' : (log.team === Team.RED ? 'text-red-400' : 'text-slate-400')}`}>
                {log.agentId ? `${log.agentId}` : 'SYSTEM'}
            </span>
            <span className="text-slate-300 mr-2 font-semibold">{log.action}</span>
            {log.target !== '自身' && log.target && (
                <><span className="text-slate-600 mx-1">➜</span><span className="text-amber-300 mr-2">{log.target}</span></>
            )}
            <span className="text-slate-400 block sm:inline opacity-90">{log.detail}</span>
        </div>
    </div>
));

// --- MAIN COMPONENT ---

const InspectorPanel: React.FC<InspectorProps> = ({ agent, engine, db, onHoverSkill }) => {
    const [tab, setTab] = useState<'INSPECTOR' | 'LOG' | 'DB'>('INSPECTOR');
    const [inspectorSubTab, setInspectorSubTab] = useState<'STATUS' | 'AI'>('STATUS');
    const [version, setVersion] = useState(0); 
    const [btFps, setBtFps] = useState(20); 
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
    
    // DB Filtering
    const [dbTypeTab, setDbTypeTab] = useState<'ALL' | 'BASIC' | 'ACTIVE' | 'ULT'>('ALL');
    const [dbRoleFilter, setDbRoleFilter] = useState<Role | 'ALL'>('ALL');
    
    // BT Interaction
    const [btScale, setBtScale] = useState(0.8);
    const [btPos, setBtPos] = useState({x: 0, y: 20});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingBT = useRef(false);
    const lastTouchPos = useRef<{x: number, y: number} | null>(null);
    const lastPinchDist = useRef<number>(0);

    // Refresh Loop
    useEffect(() => {
        if (tab !== 'INSPECTOR' || !agent) return;
        const interval = setInterval(() => setVersion(n => n + 1), 1000 / btFps);
        return () => clearInterval(interval);
    }, [tab, agent, btFps]);

    // Log Polling
    useEffect(() => {
        if (tab === 'LOG') {
            const interval = setInterval(() => {
                if (engine.logs.length !== localLogs.length) setLocalLogs(engine.logs.slice(-100));
            }, 200);
            return () => clearInterval(interval);
        }
    }, [tab, engine, localLogs.length]);

    // Auto-Center AI Tree
    useEffect(() => {
        if (tab === 'INSPECTOR' && inspectorSubTab === 'AI' && agent?.bt) {
            const timer = setTimeout(() => {
                // Keep default or recenter logic simple
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [agent?.id, tab, inspectorSubTab]);

    // BT Interaction Handlers
    const handleBtWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        setBtScale(s => Math.max(0.2, Math.min(2.0, s + (e.deltaY > 0 ? -0.1 : 0.1))));
    };
    const handleBtMouseDown = () => { isDraggingBT.current = true; };
    const handleBtMouseMove = (e: React.MouseEvent) => {
        if (isDraggingBT.current) setBtPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    };
    const handleBtMouseUp = () => { isDraggingBT.current = false; };
    
    // Touch Logic
    const handleBtTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            isDraggingBT.current = true;
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            lastPinchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            isDraggingBT.current = false;
        }
    };
    const handleBtTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && lastTouchPos.current && isDraggingBT.current) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchPos.current.x;
            const dy = touch.clientY - lastTouchPos.current.y;
            setBtPos(p => ({ x: p.x + dx, y: p.y + dy }));
            lastTouchPos.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            if (lastPinchDist.current > 0) {
                const delta = currentDist - lastPinchDist.current;
                setBtScale(s => Math.max(0.2, Math.min(2.0, s + delta * 0.005)));
            }
            lastPinchDist.current = currentDist;
        }
    };
    const handleBtTouchEnd = () => {
        isDraggingBT.current = false;
        lastTouchPos.current = null;
        lastPinchDist.current = 0;
    };

    const setSkill = (idx: number, id: string) => {
        if (agent) { agent.skillIds[idx] = id || null; setVersion(n => n + 1); }
    };
    const setRole = (r: string) => { if (agent) { agent.role = r as Role; setVersion(n => n + 1); } };
    const updateSkill = (field: keyof Skill, value: any) => {
        const skill = db.find(s => s.id === selectedSkillId);
        if (skill) { (skill as any)[field] = value; setVersion(n => n + 1); }
    };
    const downloadLogs = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(engine.logs, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `battle_logs_${Date.now()}.json`);
        anchor.click();
    };

    const selectedSkill = db.find(s => s.id === selectedSkillId);
    const filteredSkills = db.filter(s => {
        if (dbTypeTab !== 'ALL' && s.tag !== dbTypeTab) return false;
        if (dbRoleFilter !== 'ALL' && s.role !== dbRoleFilter) return false;
        return true;
    });

    const getRoleColor = (r: Role) => {
        switch(r) {
            case Role.TANK: return 'text-amber-400 border-amber-500/50';
            case Role.WARRIOR: return 'text-red-400 border-red-500/50';
            case Role.RANGER: return 'text-emerald-400 border-emerald-500/50';
            case Role.MAGE: return 'text-blue-400 border-blue-500/50';
            case Role.SUPPORT: return 'text-cyan-400 border-cyan-500/50';
            default: return 'text-slate-400 border-slate-500/50';
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 w-full select-none border-l border-slate-800">
            {/* MAIN TAB NAV */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0">
                {['INSPECTOR', 'LOG', 'DB'].map(t => (
                    <button 
                        key={t} 
                        onClick={() => setTab(t as any)} 
                        className={`flex-1 py-4 text-sm font-bold tracking-wider transition-all ${tab === t ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                    >
                        {t === 'INSPECTOR' ? 'UNIT DATA' : (t === 'LOG' ? 'BATTLE LOG' : 'DATABASE')}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
                {tab === 'INSPECTOR' && (!agent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                        <div className="text-6xl mb-4 opacity-20">⌖</div>
                        <div className="text-lg font-bold">NO UNIT SELECTED</div>
                        <div className="text-sm">Select a unit on the battlefield to inspect.</div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                         {/* UNIT HEADER */}
                        <div className="p-4 border-b border-slate-800 shrink-0 bg-slate-900 z-20 shadow-lg">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`w-4 h-4 rounded-full ${agent.team === Team.BLUE ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
                                        <span className="font-mono text-2xl font-bold text-white tracking-tight">{agent.id}</span>
                                    </div>
                                    <div className="text-slate-400 text-xs font-mono flex gap-3">
                                        <span>POS: <span className="text-slate-200">{agent.q}, {agent.r}</span></span>
                                        <span>|</span>
                                        <span>HP: <span className={agent.hp < agent.maxHp * 0.3 ? 'text-red-500 animate-pulse' : 'text-green-400'}>{Math.ceil(agent.hp)}</span>/{agent.maxHp}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">CURRENT ACTION</div>
                                    <div className="bg-slate-800 border border-slate-600 px-3 py-1 rounded text-cyan-300 font-bold text-sm shadow-inner min-w-[100px] text-center">
                                        {agent.btStatus}
                                    </div>
                                </div>
                            </div>
                            
                            {/* SUB TABS */}
                            <div className="flex bg-slate-950 rounded p-1 gap-1 border border-slate-800">
                                <button onClick={() => setInspectorSubTab('STATUS')} className={`flex-1 py-2 text-xs rounded font-bold transition-all ${inspectorSubTab === 'STATUS' ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:bg-slate-900'}`}>STATUS & SKILLS</button>
                                <button onClick={() => setInspectorSubTab('AI')} className={`flex-1 py-2 text-xs rounded font-bold transition-all ${inspectorSubTab === 'AI' ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:bg-slate-900'}`}>BEHAVIOR TREE</button>
                            </div>
                        </div>

                        {/* TAB CONTENT: STATUS */}
                        {inspectorSubTab === 'STATUS' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                                {/* STAT BLOCK */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Role Classification</label>
                                        <select 
                                            className={`tactical-input h-12 w-full text-lg font-bold bg-slate-900 border-2 ${getRoleColor(agent.role)}`}
                                            value={agent.role} 
                                            onChange={(e) => setRole(e.target.value)}
                                        >
                                            {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Health Pool</label>
                                            <input 
                                                type="number" 
                                                className="tactical-input h-12 w-full text-2xl text-center text-green-400 font-mono bg-black/30 border-green-900/50 focus:border-green-500"
                                                value={Math.round(agent.maxHp)} 
                                                onChange={(e) => { const v = parseInt(e.target.value); agent.maxHp = v; agent.hp = v; setVersion(n => n + 1); }} 
                                            />
                                            <div className="h-1 bg-slate-800 mt-2 rounded overflow-hidden">
                                                <div className="h-full bg-green-500" style={{width: `${(agent.hp/agent.maxHp)*100}%`}}></div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 p-3 rounded border border-slate-800">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Mana Capacity</label>
                                            <input 
                                                type="number" 
                                                className="tactical-input h-12 w-full text-2xl text-center text-blue-400 font-mono bg-black/30 border-blue-900/50 focus:border-blue-500"
                                                value={Math.round(agent.maxMp)} 
                                                onChange={(e) => { agent.maxMp = parseInt(e.target.value); setVersion(n => n + 1); }} 
                                            />
                                            <div className="h-1 bg-slate-800 mt-2 rounded overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{width: `${(agent.mp/agent.maxMp)*100}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-800 pt-4">
                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Active Skillset</div>
                                    <div className="space-y-4">
                                        {['ULT', 'ACTIVE', 'BASIC'].map((tag, i) => {
                                            const currentSkillId = agent.skillIds[i];
                                            const currentSkill = db.find(s => s.id === currentSkillId);
                                            
                                            // Available skills Logic
                                            const availableSkills = db.filter(s => s.tag === tag);
                                            const skillsByRole: Record<string, Skill[]> = {};
                                            availableSkills.forEach(s => {
                                                if(!skillsByRole[s.role]) skillsByRole[s.role] = [];
                                                skillsByRole[s.role].push(s);
                                            });
                                            const roleOrder = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

                                            return (
                                                <div key={i} className="bg-slate-900 rounded-sm border border-slate-700 shadow-md transition-all hover:border-slate-500" onMouseEnter={() => onHoverSkill && onHoverSkill(currentSkill || null)} onMouseLeave={() => onHoverSkill && onHoverSkill(null)}>
                                                    <div className="flex items-center gap-3 p-3 bg-slate-800/50 border-b border-slate-800">
                                                        <SkillIcon skill={currentSkill} className="w-12 h-12" />
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-bold text-slate-500 mb-1 flex justify-between">
                                                                <span>{tag} SLOT</span>
                                                                {currentSkill && <span className="text-slate-400 font-mono">ID: {currentSkill.id}</span>}
                                                            </div>
                                                            <select 
                                                                className={`tactical-input h-10 w-full text-sm font-bold appearance-none cursor-pointer ${!currentSkillId ? 'text-slate-500' : 'text-slate-200'}`}
                                                                value={agent.skillIds[i] || ""} 
                                                                onChange={(e) => setSkill(i, e.target.value)}
                                                            >
                                                                <option value="">-- EMPTY SLOT --</option>
                                                                {roleOrder.map(role => {
                                                                    const skills = skillsByRole[role];
                                                                    if (!skills || skills.length === 0) return null;
                                                                    return (
                                                                        <optgroup key={role} label={role} className="bg-slate-900 text-slate-400">
                                                                            {skills.map(s => (
                                                                                <option key={s.id} value={s.id} className="text-white">
                                                                                    {s.name} {s.team !== undefined ? (s.team === Team.BLUE ? '🔵' : '🔴') : ''}
                                                                                </option>
                                                                            ))}
                                                                        </optgroup>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {currentSkill && (
                                                        <div className="p-3 text-sm">
                                                            <div className="text-slate-400 italic mb-3 leading-relaxed border-l-2 border-slate-700 pl-3">
                                                                "{currentSkill.desc}"
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                                                                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                                    <div className="text-slate-500 text-[10px] mb-1">PWR</div>
                                                                    <div className="font-bold text-base">{currentSkill.power}</div>
                                                                </div>
                                                                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                                    <div className="text-slate-500 text-[10px] mb-1">CD</div>
                                                                    <div className="font-bold text-base">{currentSkill.cd}s</div>
                                                                </div>
                                                                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                                    <div className="text-slate-500 text-[10px] mb-1">COST</div>
                                                                    <div className="font-bold text-base text-blue-400">{currentSkill.cost}</div>
                                                                </div>
                                                                <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                                    <div className="text-slate-500 text-[10px] mb-1">RNG</div>
                                                                    <div className="font-bold text-base">{currentSkill.range}</div>
                                                                </div>
                                                            </div>
                                                            {(currentSkill.ccType || currentSkill.effectType) && (
                                                                <div className="mt-3 pt-2 border-t border-slate-800 flex gap-2 flex-wrap">
                                                                    {currentSkill.ccType && <span className="px-2 py-1 bg-amber-900/30 text-amber-400 border border-amber-900/50 rounded text-xs font-bold">{currentSkill.ccType}</span>}
                                                                    {currentSkill.effectType && <span className="px-2 py-1 bg-purple-900/30 text-purple-400 border border-purple-900/50 rounded text-xs font-bold">{currentSkill.effectType}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB CONTENT: AI */}
                        {inspectorSubTab === 'AI' && (
                             <div 
                                className="flex-1 bg-[#0f1115] relative overflow-hidden flex flex-col min-h-0 cursor-grab active:cursor-grabbing" 
                                ref={btContainerRef} 
                                onWheel={handleBtWheel} 
                                onMouseDown={handleBtMouseDown} 
                                onMouseMove={handleBtMouseMove} 
                                onMouseUp={handleBtMouseUp} 
                                onMouseLeave={handleBtMouseUp}
                                onTouchStart={handleBtTouchStart}
                                onTouchMove={handleBtTouchMove}
                                onTouchEnd={handleBtTouchEnd}
                                style={{touchAction: 'none'}}
                             >
                                <div className="absolute top-4 left-4 z-10 glass-panel px-3 py-2 flex items-center gap-3">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Refresh Rate</div>
                                    <input type="range" min="1" max="60" value={btFps} onChange={e => setBtFps(parseInt(e.target.value))} className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                    <span className="text-cyan-400 font-mono text-xs w-6 text-right">{btFps}</span>
                                </div>
                                
                                <div className="absolute top-4 right-4 z-10 glass-panel px-3 py-2 text-xs font-mono text-slate-400">
                                    ZOOM: {Math.round(btScale * 100)}%
                                </div>

                                <div className="absolute w-full h-full flex justify-center items-start pt-20 origin-top-center will-change-transform" 
                                     style={{
                                         transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, 
                                         backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', 
                                         backgroundSize: '32px 32px'
                                     }}>
                                    <div id="bt-root-content" className="inline-block px-12 pb-12">
                                        {agent.bt && <TreeNode node={agent.bt} version={version} now={Date.now()} />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {tab === 'LOG' && (
                    <div className="flex flex-col h-full bg-slate-900">
                        <div className="p-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Feed (Last 100)</span>
                            <button onClick={downloadLogs} className="tactical-btn text-xs">
                                EXPORT JSON
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 font-mono">
                            {localLogs.slice().reverse().map(log => (
                                <LogItem key={log.id} log={log} />
                            ))}
                            {localLogs.length === 0 && <div className="text-slate-600 text-center mt-20 italic">No combat data recorded</div>}
                        </div>
                    </div>
                )}

                {tab === 'DB' && (
                    <div className="flex flex-col h-full bg-slate-900">
                        <div className="p-3 border-b border-slate-800 bg-slate-950 shrink-0 space-y-3">
                            <div className="flex bg-slate-900 rounded p-1 gap-1 border border-slate-800">
                                {['ALL', 'BASIC', 'ACTIVE', 'ULT'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setDbTypeTab(t as any)} 
                                        className={`flex-1 py-2 text-xs rounded font-bold transition-all ${dbTypeTab === t ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            
                            <select 
                                className="tactical-input w-full h-10 text-sm"
                                value={dbRoleFilter}
                                onChange={(e) => setDbRoleFilter(e.target.value as any)}
                            >
                                <option value="ALL">FILTER ROLE: ALL</option>
                                {Object.values(Role).map(r => <option key={r} value={r}>ROLE: {r}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {filteredSkills.map(skill => (
                                <div key={skill.id} className={`border rounded transition-all duration-200 ${selectedSkillId === skill.id ? 'border-cyan-500 bg-slate-800 shadow-lg' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
                                    <div 
                                        className="flex items-center gap-3 p-3 cursor-pointer"
                                        onClick={() => setSelectedSkillId(skill.id === selectedSkillId ? null : skill.id)}
                                    >
                                        <SkillIcon skill={skill} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm text-slate-200">{skill.name}</div>
                                            <div className="text-xs text-slate-500 flex gap-2 items-center mt-1">
                                                <span className="font-mono font-bold">{skill.role}</span>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className={`${skill.tag === 'ULT' ? 'text-purple-400' : (skill.tag === 'ACTIVE' ? 'text-blue-400' : 'text-slate-400')} font-bold`}>{skill.tag}</span>
                                            </div>
                                        </div>
                                        <div className="text-slate-600 text-lg">
                                            {selectedSkillId === skill.id ? '−' : '+'}
                                        </div>
                                    </div>

                                    {selectedSkillId === skill.id && (
                                        <div className="p-4 border-t border-slate-700 bg-black/20">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">POWER</label>
                                                    <input type="number" className="tactical-input w-full h-10" value={skill.power} onChange={e => updateSkill('power', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">COOLDOWN</label>
                                                    <input type="number" className="tactical-input w-full h-10" value={skill.cd} step="0.5" onChange={e => updateSkill('cd', parseFloat(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">COST</label>
                                                    <input type="number" className="tactical-input w-full h-10" value={skill.cost} onChange={e => updateSkill('cost', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500">RANGE</label>
                                                    <input type="number" className="tactical-input w-full h-10" value={skill.range} onChange={e => updateSkill('range', parseInt(e.target.value))} />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-500">DESCRIPTION</label>
                                                <textarea 
                                                    className="tactical-input w-full p-2 h-20 text-sm resize-none"
                                                    value={skill.desc || ""}
                                                    onChange={e => updateSkill('desc', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InspectorPanel;
