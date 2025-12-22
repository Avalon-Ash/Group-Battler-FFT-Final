
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

// Added version prop to force re-render when parent updates
const TreeNode: React.FC<{ node: BTNode, version: number, now: number }> = ({ node, version, now }) => {
    
    // Logic for Visual Persistence
    const timeDiff = now - node.lastRunTime;
    let visualState: NodeState | null = node.status;
    let isFading = false;
    let opacity = 1.0;

    // If currently not running (was reset), try to use the last known result
    if (!visualState && node.lastResult) {
        if (timeDiff < 1000) { // Keep visual alive for 1s
            visualState = node.lastResult;
            isFading = true;
            // Fade out effect
            if (timeDiff > 200) opacity = 0.7;
            if (timeDiff > 500) opacity = 0.4;
        }
    }

    const statusStyle = (s: NodeState | null) => {
        switch (s) {
            case NodeState.RUNNING: return "border-amber-500 bg-amber-950 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.6)] ring-1 ring-amber-500/50 scale-105 z-10";
            case NodeState.SUCCESS: return "border-emerald-500 bg-emerald-950 text-emerald-100 shadow-[0_0_5px_rgba(16,185,129,0.4)]";
            case NodeState.FAILURE: return "border-red-900 bg-red-950 text-red-200 shadow-[0_0_5px_rgba(220,38,38,0.2)]";
            default: return "border-slate-700 bg-slate-900 text-slate-500";
        }
    };

    const typeSymbol = (t: string) => {
        if(t === '?') return <span className="text-purple-400 font-bold mr-1.5 text-sm">?</span>;
        if(t === '->') return <span className="text-blue-400 font-bold mr-1.5 text-sm">➜</span>;
        if(t === 'COND') return <span className="text-pink-400 text-xs mr-1.5">◆</span>;
        if(t === 'ACT') return <span className="text-yellow-400 text-xs mr-1.5">⚡</span>;
        return null;
    }

    return (
        <div className="flex flex-col items-center">
            <div 
                className={`flex items-center px-2 py-1.5 rounded border text-[10px] font-mono font-medium transition-all duration-75 cursor-default select-none shadow-sm min-w-[70px] justify-center ${statusStyle(visualState)}`}
                style={{ opacity: opacity, transform: visualState === NodeState.RUNNING ? 'scale(1.05)' : 'scale(1)' }}
            >
                {typeSymbol(node.type)}
                <span className="whitespace-nowrap truncate max-w-[120px]">{node.n}</span>
            </div>
            {node.c && node.c.length > 0 && (
                <div className="flex flex-col items-center">
                    <div className={`w-px h-3 ${isFading ? 'bg-slate-700/50' : 'bg-slate-700'}`}></div>
                    <div className="flex items-start gap-1">
                        {node.c.map((child, idx) => (
                            <div key={child.id} className="flex flex-col items-center relative">
                                {/* Connector Lines */}
                                <div className="absolute top-0 left-0 w-full h-3 -mt-3 pointer-events-none">
                                     {/* Horizontal bar logic */}
                                     {node.c.length > 1 && (
                                         <>
                                            {idx === 0 && <div className="absolute right-0 top-0 w-1/2 h-px bg-slate-700 translate-y-3"></div>}
                                            {idx === node.c.length - 1 && <div className="absolute left-0 top-0 w-1/2 h-px bg-slate-700 translate-y-3"></div>}
                                            {idx > 0 && idx < node.c.length - 1 && <div className="absolute left-0 top-0 w-full h-px bg-slate-700 translate-y-3"></div>}
                                         </>
                                     )}
                                     {/* Vertical down to child */}
                                     <div className="absolute left-1/2 top-0 w-px h-3 bg-slate-700 translate-y-3 -translate-x-1/2"></div>
                                </div>
                                
                                <div className="pt-3">
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
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-6 h-6';
    if (!skill || !skill.visual) return <div className={`rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-600 ${sizeClass} ${className || ''}`}>∅</div>;
    const iconUrl = AssetManager.getSkillIcon(skill.visual, skill.color).toDataURL();
    return <img src={iconUrl} className={`rounded bg-slate-900 border border-slate-700 shadow-sm ${sizeClass} ${className || ''}`} alt={skill.visual} />;
};

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="mb-1 border-b border-slate-800 pb-1 last:border-0 hover:bg-slate-900 transition-colors text-[10px] font-mono">
        <span className="text-slate-500 mr-2 opacity-50">[{log.time}s]</span>
        <span className={`font-bold mr-1 ${log.team === Team.BLUE ? 'text-blue-400' : (log.team === Team.RED ? 'text-red-400' : 'text-slate-400')}`}>
            {log.agentId ? `${log.agentId}` : '系統'}
        </span>
        <span className="text-slate-300 mr-1">{log.action}</span>
        {log.target !== '自身' && log.target && (
            <><span className="text-slate-500 mx-1">➜</span><span className="text-amber-200">{log.target}</span></>
        )}
        <span className="text-slate-500 ml-2 block sm:inline sm:ml-2 opacity-75 truncate">- {log.detail}</span>
    </div>
));

const InspectorPanel: React.FC<InspectorProps> = ({ agent, engine, db, onHoverSkill }) => {
    const [tab, setTab] = useState<'INSPECTOR' | 'LOG' | 'DB'>('INSPECTOR');
    const [inspectorSubTab, setInspectorSubTab] = useState<'STATUS' | 'AI'>('STATUS');
    const [version, setVersion] = useState(0); 
    const [btFps, setBtFps] = useState(20); // Default higher FPS for smoother trails
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
    const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
    
    // DB Filtering States
    const [dbTypeTab, setDbTypeTab] = useState<'ALL' | 'BASIC' | 'ACTIVE' | 'ULT'>('ALL');
    const [dbRoleFilter, setDbRoleFilter] = useState<Role | 'ALL'>('ALL');
    
    const [btScale, setBtScale] = useState(1);
    const [btPos, setBtPos] = useState({x: 0, y: 0});
    const btContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingBT = useRef(false);

    useEffect(() => {
        if (tab !== 'INSPECTOR' || !agent) return;
        const intervalMs = 1000 / btFps;
        const interval = setInterval(() => setVersion(n => n + 1), intervalMs);
        return () => clearInterval(interval);
    }, [tab, agent, btFps]);

    useEffect(() => {
        if (tab === 'LOG') {
            const pollLogs = () => {
                if (engine.logs.length !== localLogs.length) setLocalLogs(engine.logs.slice(-100));
            };
            const interval = setInterval(pollLogs, 200);
            pollLogs();
            return () => clearInterval(interval);
        }
    }, [tab, engine, localLogs.length]);

    useEffect(() => {
        if (tab === 'INSPECTOR' && inspectorSubTab === 'AI' && agent?.bt) {
            const timer = setTimeout(() => {
                const container = btContainerRef.current;
                const content = document.getElementById('bt-root-content');
                if (container && content) {
                    const scaleX = (container.clientWidth - 50) / content.scrollWidth;
                    const scaleY = (container.clientHeight - 50) / content.scrollHeight;
                    // Slightly zoomed out by default to see more tree
                    setBtScale(Math.max(0.3, Math.min(scaleX, scaleY, 0.8)));
                    setBtPos({ x: 0, y: 20 });
                }
            }, 100); 
            return () => clearTimeout(timer);
        }
    }, [agent?.id, tab, inspectorSubTab]);

    const handleBtWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        setBtScale(s => Math.max(0.1, Math.min(3.0, s + (e.deltaY > 0 ? -0.1 : 0.1))));
    };

    const handleBtMouseDown = () => { isDraggingBT.current = true; };
    const handleBtMouseMove = (e: React.MouseEvent) => {
        if (isDraggingBT.current) setBtPos(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
    };
    const handleBtMouseUp = () => { isDraggingBT.current = false; };

    const setSkill = (idx: number, id: string) => {
        if (agent) { agent.skillIds[idx] = id || null; setVersion(n => n + 1); }
    };

    const setRole = (r: string) => { if (agent) { agent.role = r as Role; setVersion(n => n + 1); } }

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

    const handleHoverSkill = (skillId: string | null) => {
        if (onHoverSkill) {
            const skill = db.find(s => s.id === skillId);
            onHoverSkill(skill || null);
        }
    };

    const renderAgentId = (id: string) => {
        if (id.includes('-')) {
            const [role, suffix] = id.split('-');
            return (
                <>
                    {role} <span className="font-mono font-normal opacity-60 text-xs">#{suffix}</span>
                </>
            );
        }
        return id;
    };

    // Filter Logic
    const filteredSkills = db.filter(s => {
        if (dbTypeTab !== 'ALL' && s.tag !== dbTypeTab) return false;
        if (dbRoleFilter !== 'ALL' && s.role !== dbRoleFilter) return false;
        return true;
    });

    const renderEffectGroup = (
        title: string, 
        ccField: 'ccType' | 'ccType2', 
        durField: 'ccDur' | 'ccDur2', 
        forceField: 'ccForce' | 'ccForce2',
        effField: 'effectType' | 'effectType2',
        valField: 'effectVal' | 'effectVal2'
    ) => {
        if (!selectedSkill) return null;
        return (
            <div className="bg-slate-900/50 p-2 rounded border border-slate-800 mb-2">
                <div className="text-[9px] font-bold text-slate-500 mb-1 uppercase">{title}</div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1 col-span-3">
                        <label className="text-slate-600 block text-[9px]">控制類型</label>
                        <select className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1" value={selectedSkill[ccField] || ''} onChange={e => updateSkill(ccField, e.target.value || undefined)}>
                            <option value="">無</option>
                            <option value="STUN">Stun (暈眩)</option>
                            <option value="BANISH">Banish (放逐)</option>
                            <option value="KNOCKBACK">Knockback (擊退)</option>
                            <option value="PULL">Pull (牽引)</option>
                            <option value="DOT">DoT (持續傷害)</option>
                            <option value="HOT">HoT (持續治療)</option>
                            <option value="SILENCE">Silence (沉默)</option>
                        </select>
                    </div>
                    {selectedSkill[ccField] && (
                        <>
                            <div className="space-y-1"><label className="text-slate-600 block text-[9px]">持續時間</label><input type="number" step="0.5" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1" value={selectedSkill[durField] || 0} onChange={e => updateSkill(durField, parseFloat(e.target.value))} /></div>
                            <div className="space-y-1"><label className="text-slate-600 block text-[9px]">強度/數值</label><input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1" value={selectedSkill[forceField] || 0} onChange={e => updateSkill(forceField, parseInt(e.target.value))} /></div>
                        </>
                    )}
                    <div className="space-y-1 col-span-3 mt-1 pt-1 border-t border-slate-800/50">
                        <label className="text-slate-600 block text-[9px]">戰鬥特效</label>
                        <div className="flex gap-2">
                             <select className="flex-1 bg-slate-900 border border-slate-700 rounded px-1 py-1" value={selectedSkill[effField] || ''} onChange={e => updateSkill(effField, e.target.value || undefined)}>
                                <option value="">無</option>
                                <option value="VAMP">Vamp (吸血)</option>
                                <option value="MANA_BURN">Mana Burn (燒魔)</option>
                                <option value="MANA_RESTORE">Mana Restore (回魔)</option>
                                <option value="EXECUTE">Execute (斬殺)</option>
                            </select>
                            {selectedSkill[effField] && (
                                <input type="number" step="0.1" className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1" placeholder="Val" value={selectedSkill[valField] || 0} onChange={e => updateSkill(valField, parseFloat(e.target.value))} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-full select-none">
            <div className="flex border-b border-slate-700 bg-slate-950 shrink-0">
                {['INSPECTOR', 'LOG', 'DB'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === t ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}>
                        {t === 'INSPECTOR' ? '單位監控' : (t === 'LOG' ? '戰鬥日誌' : '技能庫')}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {tab === 'INSPECTOR' && (!agent ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-4 text-center opacity-50"><div className="text-4xl mb-2">👁️</div><div className="text-sm">請在網格上選擇一個單位</div></div>
                ) : (
                    <div className="flex flex-col h-full">
                         {/* Common Header */}
                        <div className="p-3 border-b border-slate-800 shrink-0 bg-slate-900/50 backdrop-blur-sm z-20">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${agent.team === Team.BLUE ? 'bg-blue-500 shadow-[0_0_8px_#3b82f680]' : 'bg-red-500 shadow-[0_0_8px_#ef444480]'}`}></div>
                                    <span className={`font-bold text-sm ${agent.team === Team.BLUE ? 'text-blue-100' : 'text-red-100'}`}>
                                        {renderAgentId(agent.id)}
                                    </span>
                                    <span className="text-slate-500 text-xs font-mono">({agent.q}, {agent.r})</span>
                                </div>
                                <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 shadow-sm">{agent.btStatus}</span>
                            </div>
                            {/* Internal Tabs */}
                            <div className="flex bg-slate-800 rounded p-1 gap-1">
                                <button onClick={() => setInspectorSubTab('STATUS')} className={`flex-1 py-1 text-[10px] rounded font-bold transition-colors ${inspectorSubTab === 'STATUS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>狀態 & 技能</button>
                                <button onClick={() => setInspectorSubTab('AI')} className={`flex-1 py-1 text-[10px] rounded font-bold transition-colors ${inspectorSubTab === 'AI' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}>AI 行為樹</button>
                            </div>
                        </div>

                        {inspectorSubTab === 'STATUS' && (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                                <div className="grid grid-cols-2 gap-3 text-[10px] mb-4 bg-slate-900 border border-slate-800 p-3 rounded-lg">
                                    <div><label className="text-slate-500 font-bold block mb-1 text-[9px] uppercase tracking-wider">職業</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-200 outline-none" value={agent.role} onChange={(e) => setRole(e.target.value)}>{Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}</select>
                                    </div>
                                    <div className="flex gap-2"><div className="flex-1"><label className="text-slate-500 font-bold block mb-1 text-[9px] uppercase tracking-wider">生命值</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1.5 text-center text-green-400 font-mono outline-none" value={Math.round(agent.maxHp)} onChange={(e) => { const v = parseInt(e.target.value); agent.maxHp = v; agent.hp = v; setVersion(n => n + 1); }} /></div><div className="flex-1"><label className="text-slate-500 font-bold block mb-1 text-[9px] uppercase tracking-wider">魔力值</label><input type="number" className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1.5 text-center text-blue-400 font-mono outline-none" value={Math.round(agent.maxMp)} onChange={(e) => { agent.maxMp = parseInt(e.target.value); setVersion(n => n + 1); }} /></div></div>
                                </div>

                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">當前配置技能</div>
                                {['ULT', 'ACTIVE', 'BASIC'].map((tag, i) => {
                                    const currentSkillId = agent.skillIds[i];
                                    const currentSkill = db.find(s => s.id === currentSkillId);
                                    const tagName = tag === 'ULT' ? '大絕' : (tag === 'ACTIVE' ? '主動' : '普攻');
                                    
                                    // Grouping Logic
                                    const availableSkills = db.filter(s => s.tag === tag);
                                    const skillsByRole: Record<string, Skill[]> = {};
                                    availableSkills.forEach(s => {
                                        if(!skillsByRole[s.role]) skillsByRole[s.role] = [];
                                        skillsByRole[s.role].push(s);
                                    });
                                    const roleOrder = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

                                    return (
                                    <div key={i} className="mb-4 bg-slate-900 rounded border border-slate-800 shadow-sm overflow-hidden" onMouseEnter={() => handleHoverSkill(agent.skillIds[i])} onMouseLeave={() => handleHoverSkill(null)}>
                                        <div className="flex items-center gap-3 p-3 border-b border-slate-800">
                                            {/* Left: Visual & Label */}
                                            <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                                                <SkillIcon skill={currentSkill} className="w-10 h-10 shadow-lg ring-1 ring-slate-700" />
                                                <div className={`text-[10px] font-bold uppercase tracking-wider text-center ${tag === 'ULT' ? 'text-purple-400' : (tag === 'ACTIVE' ? 'text-blue-400' : 'text-slate-400')}`}>
                                                    {tagName}
                                                </div>
                                            </div>
                                            
                                            {/* Right: Big Dropdown Selector */}
                                            <div className="flex-1 relative h-10">
                                                <select 
                                                    className={`absolute inset-0 w-full h-full bg-slate-800 border-2 border-slate-700 hover:border-slate-500 rounded text-sm font-bold px-3 appearance-none cursor-pointer outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all ${!currentSkillId ? 'text-slate-500 italic' : 'text-slate-100'}`}
                                                    value={agent.skillIds[i] || ""} 
                                                    onChange={(e) => setSkill(i, e.target.value)}
                                                >
                                                    <option value="" className="text-slate-500 italic">-- 空插槽 --</option>
                                                    {roleOrder.map(role => {
                                                        const skills = skillsByRole[role];
                                                        if (!skills || skills.length === 0) return null;
                                                        return (
                                                            <optgroup key={role} label={role} className="bg-slate-900 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                                                {skills.map(s => (
                                                                    <option key={s.id} value={s.id} className="bg-slate-800 text-slate-200 text-sm font-sans">
                                                                        {s.name} {s.team !== undefined ? (s.team === Team.BLUE ? '🔵' : '🔴') : ''}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        );
                                                    })}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</div>
                                            </div>
                                        </div>

                                        {currentSkill && (
                                            <div className="p-2 bg-slate-900/50">
                                                <div className="text-[10px] text-slate-300 italic mb-2 px-1 leading-snug">{currentSkill.desc}</div>
                                                <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-slate-500 mb-1">
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-300 border border-slate-700/50">威力 {currentSkill.power}</div>
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-300 border border-slate-700/50">冷卻 {currentSkill.cd}s</div>
                                                    
                                                    {/* COST / GAIN */}
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center border border-slate-700/50 flex justify-center gap-1">
                                                        <span className="text-blue-400">-{currentSkill.cost}</span>
                                                        {currentSkill.gain > 0 && <span className="text-emerald-400">+{currentSkill.gain}</span>}
                                                        <span className="text-slate-500">MP</span>
                                                    </div>

                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-300 border border-slate-700/50">射程 {currentSkill.range}</div>
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-300 border border-slate-700/50">詠唱 {currentSkill.cast}s</div>
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-400 border border-slate-700/50 col-span-2">
                                                        {currentSkill.type === 'AOE' ? `範圍 (R:${currentSkill.aoeRadius})` : '單體'}
                                                    </div>
                                                    <div className="bg-slate-800 rounded px-1 py-1 text-center text-slate-400 border border-slate-700/50">
                                                        {currentSkill.projectileSpeed ? `${currentSkill.visual} (${currentSkill.projectileSpeed})` : `${currentSkill.visual || '瞬發'}`}
                                                    </div>
                                                </div>
                                                {(currentSkill.ccType || currentSkill.ccType2 || currentSkill.effectType) && (
                                                     <div className="bg-slate-800 rounded px-2 py-1.5 text-[9px] text-slate-400 mt-1 border border-slate-700/50 flex flex-wrap gap-2">
                                                         {currentSkill.ccType && <span>特效: <span className="text-amber-500 font-bold">{currentSkill.ccType}</span></span>}
                                                         {currentSkill.effectType && <span>被動: <span className="text-emerald-500 font-bold">{currentSkill.effectType}</span></span>}
                                                     </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )})}
                            </div>
                        )}

                        {inspectorSubTab === 'AI' && (
                             <div className="flex-1 bg-[#0f1115] relative overflow-hidden flex flex-col min-h-0" ref={btContainerRef} onWheel={handleBtWheel} onMouseDown={handleBtMouseDown} onMouseMove={handleBtMouseMove} onMouseUp={handleBtMouseUp} onMouseLeave={handleBtMouseUp} style={{cursor: isDraggingBT.current ? 'grabbing' : 'grab'}}>
                                <div className="absolute top-0 left-0 w-full px-3 py-2 bg-gradient-to-b from-slate-900 to-transparent text-[10px] text-slate-400 z-30 flex justify-between items-center pointer-events-none">
                                    <div className="flex items-center bg-slate-800/90 rounded px-2 py-1 border border-slate-700 shadow-lg pointer-events-auto">
                                        <span className="mr-2 text-slate-500 font-bold text-[9px]">刷新率</span>
                                        <input 
                                            type="range" 
                                            min="1" 
                                            max="60" 
                                            value={btFps} 
                                            onChange={e => setBtFps(parseInt(e.target.value))} 
                                            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                        />
                                        <span className="ml-2 text-blue-400 font-mono w-4 text-center">{btFps}</span>
                                    </div>
                                    <span className="font-mono opacity-50">{Math.round(btScale * 100)}%</span>
                                </div>
                                <div className="absolute w-full h-full flex justify-center items-start pt-16 origin-top-center will-change-transform" style={{transform: `translate(${btPos.x}px, ${btPos.y}px) scale(${btScale})`, backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.8}}>
                                    <div id="bt-root-content" className="inline-block px-8 pb-8">
                                        {agent.bt && <TreeNode node={agent.bt} version={version} now={Date.now()} />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {tab === 'LOG' && (
                    <div className="flex flex-col h-full">
                        <div className="p-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-400">最新 100 筆紀錄</span>
                            <button onClick={downloadLogs} className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-1 rounded hover:bg-slate-700 text-blue-400">
                                下載完整 JSON
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 font-mono text-[10px]">
                            {localLogs.slice().reverse().map(log => (
                                <LogItem key={log.id} log={log} />
                            ))}
                            {localLogs.length === 0 && <div className="text-slate-600 text-center mt-10">尚無戰鬥紀錄</div>}
                        </div>
                    </div>
                )}

                {tab === 'DB' && (
                    <div className="flex flex-col h-full">
                        <div className="flex flex-col border-b border-slate-800 bg-slate-900 shrink-0 gap-2 p-2">
                            {/* Type Tabs */}
                            <div className="flex bg-slate-800 rounded p-1 gap-1">
                                {['ALL', 'BASIC', 'ACTIVE', 'ULT'].map(t => {
                                    const labels: any = { ALL: '全部', BASIC: '普攻', ACTIVE: '主動', ULT: '大絕' };
                                    return (
                                        <button 
                                            key={t}
                                            onClick={() => setDbTypeTab(t as any)} 
                                            className={`flex-1 py-1 text-[10px] rounded font-bold transition-colors ${dbTypeTab === t ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            {labels[t]}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* Role Filter */}
                            <div className="flex items-center gap-2">
                                <select 
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                                    value={dbRoleFilter}
                                    onChange={(e) => setDbRoleFilter(e.target.value as any)}
                                >
                                    <option value="ALL">全部職業</option>
                                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <div className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700/50">
                                    數量: {filteredSkills.length}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {filteredSkills.map(skill => (
                                <div key={skill.id} className={`mb-2 border rounded transition-colors ${selectedSkillId === skill.id ? 'border-blue-500 bg-slate-800 shadow-md' : 'border-slate-800 bg-slate-900 hover:border-slate-700'}`}>
                                    <div 
                                        className="flex items-center gap-2 p-2 cursor-pointer"
                                        onClick={() => setSelectedSkillId(skill.id === selectedSkillId ? null : skill.id)}
                                    >
                                        <SkillIcon skill={skill} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-xs truncate text-slate-200">{skill.name}</div>
                                            <div className="text-[10px] text-slate-500 flex gap-2 items-center">
                                                <span>{skill.role}</span>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className={`font-bold ${skill.tag === 'ULT' ? 'text-purple-400' : (skill.tag === 'ACTIVE' ? 'text-blue-400' : 'text-slate-400')}`}>{skill.tag}</span>
                                                {skill.team !== undefined && (
                                                    <span className={`ml-auto text-[9px] px-1 rounded ${skill.team === Team.BLUE ? 'bg-blue-900/50 text-blue-300' : 'bg-red-900/50 text-red-300'}`}>
                                                        {skill.team === Team.BLUE ? '藍方' : '紅方'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedSkillId === skill.id && (
                                        <div className="p-2 border-t border-slate-700 bg-slate-950/30 text-[10px]">
                                            <div className="grid grid-cols-4 gap-2 mb-2">
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">威力</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.power} onChange={e => updateSkill('power', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">CD (秒)</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.cd} step="0.5" onChange={e => updateSkill('cd', parseFloat(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">消耗 (MP)</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.cost} onChange={e => updateSkill('cost', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">獲得 (MP)</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.gain || 0} onChange={e => updateSkill('gain', parseInt(e.target.value))} />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">射程</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.range} onChange={e => updateSkill('range', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">詠唱 (秒)</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.cast} step="0.1" onChange={e => updateSkill('cast', parseFloat(e.target.value))} />
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-slate-500 block text-[9px]">類型</label>
                                                    <div className="flex gap-1">
                                                        <select className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.type} onChange={e => updateSkill('type', e.target.value)}>
                                                            <option value="SINGLE">單體</option>
                                                            <option value="AOE">範圍 (AOE)</option>
                                                        </select>
                                                        {skill.type === 'AOE' && (
                                                            <input type="number" className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.aoeRadius || 1} onChange={e => updateSkill('aoeRadius', parseInt(e.target.value))} placeholder="R" />
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-slate-500 block text-[9px]">視覺特效 (Visual)</label>
                                                    <select className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.visual || 'BOLT'} onChange={e => updateSkill('visual', e.target.value)}>
                                                        <option value="ARROW">ARROW (弓箭)</option>
                                                        <option value="FIREBALL">FIREBALL (火球)</option>
                                                        <option value="BOLT">BOLT (能量彈)</option>
                                                        <option value="BOMB">BOMB (炸彈)</option>
                                                        <option value="SLASH">SLASH (斬擊)</option>
                                                        <option value="SMASH">SMASH (重擊)</option>
                                                        <option value="BEAM">BEAM (光束)</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">彈速 (0=瞬發)</label>
                                                    <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200" value={skill.projectileSpeed || 0} onChange={e => updateSkill('projectileSpeed', parseInt(e.target.value))} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-slate-500 block text-[9px]">顏色 (Hex)</label>
                                                    <div className="flex gap-1">
                                                        <input type="color" className="w-6 h-6 p-0 border-0 bg-transparent cursor-pointer" value={skill.color} onChange={e => updateSkill('color', e.target.value)} />
                                                        <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200 text-[9px]" value={skill.color} onChange={e => updateSkill('color', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {renderEffectGroup("主要效果", 'ccType', 'ccDur', 'ccForce', 'effectType', 'effectVal')}
                                            {renderEffectGroup("次要效果", 'ccType2', 'ccDur2', 'ccForce2', 'effectType2', 'effectVal2')}
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
