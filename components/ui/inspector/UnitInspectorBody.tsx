import React, { useState, useEffect, useCallback } from 'react';
import type { GameEngine } from '../../../engine/game';
import { Role, Team } from '../../../types';
import type { AgentView } from '../../../types/UIViewModel';
import { selectAgentView } from '../../../engine/systems/ui/selectors';
import { useEngineView } from '../../../hooks/useEngineView';
import { useEngineCommands } from '../../../hooks/useEngineCommands';
import { Icons } from '../icons';
import { Helpers, ROLE_MAP } from '../../inspector/InspectorConstants';
import { BehaviorTreeTab } from '../../inspector/tabs/BehaviorTreeTab';
import { UnitStatusTab } from '../../inspector/tabs/UnitStatusTab';

export interface UnitInspectorBodyProps {
    engine: GameEngine;
    agentId?: string | null;
}

type TabType = 'STATUS' | 'AI' | 'SKILLS';

export const UnitInspectorBody: React.FC<UnitInspectorBodyProps> = ({ engine, agentId }) => {
    // 1. All hooks unconditionally executed before any return
    const agentSelector = useCallback((e: GameEngine) => selectAgentView(e, agentId), [agentId]);
    const agentView = useEngineView<AgentView | null>(engine, agentSelector);
    const agent = agentId ? (engine.agents.find(a => a.id === agentId) ?? null) : null;

    const { editAgent } = useEngineCommands(engine);

    const [tab, setTab] = useState<TabType>('STATUS');
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);
    const [updateCounter, setUpdateCounter] = useState(0);

    const currentMaxHp = agentView?.maxHp ?? agent?.maxHp ?? 0;
    const currentHp = agentView?.hp ?? agent?.hp ?? 0;
    const currentMaxMp = agentView?.maxMp ?? agent?.maxMp ?? 0;
    const currentMp = agentView?.mp ?? agent?.mp ?? 0;
    const currentRole = agentView?.role ?? agent?.role ?? Role.WARRIOR;
    const currentTeam = agentView?.team ?? agent?.team ?? Team.BLUE;

    // R8 Draft States
    const [hpDraft, setHpDraft] = useState<string>(() => (currentMaxHp > 0 ? Math.round(currentMaxHp).toString() : ''));
    const [mpDraft, setMpDraft] = useState<string>(() => (currentMaxMp >= 0 ? Math.round(currentMaxMp).toString() : ''));
    const [isHpFocused, setIsHpFocused] = useState(false);
    const [isMpFocused, setIsMpFocused] = useState(false);

    // Reset drafts on agentId change
    useEffect(() => {
        setIsHpFocused(false);
        setIsMpFocused(false);
        setHpDraft(currentMaxHp > 0 ? Math.round(currentMaxHp).toString() : '');
        setMpDraft(currentMaxMp >= 0 ? Math.round(currentMaxMp).toString() : '');
    }, [agentId]);

    // Keep draft updated when not focused
    useEffect(() => {
        if (!isHpFocused) {
            setHpDraft(currentMaxHp > 0 ? Math.round(currentMaxHp).toString() : '');
        }
    }, [currentMaxHp, isHpFocused]);

    useEffect(() => {
        if (!isMpFocused) {
            setMpDraft(currentMaxMp >= 0 ? Math.round(currentMaxMp).toString() : '');
        }
    }, [currentMaxMp, isMpFocused]);

    const submitHp = () => {
        if (!agentId) return;
        const v = parseInt(hpDraft.trim(), 10);
        if (!Number.isNaN(v) && v > 0) {
            editAgent(agentId, { maxHp: v, hp: v });
            setUpdateCounter(n => n + 1);
            setHpDraft(v.toString());
        } else {
            setHpDraft(currentMaxHp > 0 ? Math.round(currentMaxHp).toString() : '');
        }
    };

    const submitMp = () => {
        if (!agentId) return;
        const v = parseInt(mpDraft.trim(), 10);
        if (!Number.isNaN(v) && v >= 0) {
            editAgent(agentId, { maxMp: v });
            setUpdateCounter(n => n + 1);
            setMpDraft(v.toString());
        } else {
            setMpDraft(currentMaxMp >= 0 ? Math.round(currentMaxMp).toString() : '');
        }
    };

    const setRole = (r: string) => {
        if (agentId) {
            editAgent(agentId, { role: r as Role });
            setUpdateCounter(n => n + 1);
        }
    };

    const isDead = !agent || !agentView || agentView.isDead || agent.hp <= 0 || agent.banished || agent.fullyDead;

    // 2. Early return for empty state (when no unit selected or unit missing/dead)
    if (!agentId || isDead) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[220px] p-6 text-center select-none" style={{ color: '#64748b' }}>
                <Icons.Select className="w-8 h-8 mb-2 opacity-30" />
                <div className="text-xs font-bold tracking-wider uppercase" style={{ color: '#94a3b8' }}>
                    請先選取單位
                </div>
                <div className="text-[10px] mt-1" style={{ color: '#475569' }}>
                    在戰場中點選任意單位以檢視詳情
                </div>
            </div>
        );
    }

    const isBlue = currentTeam === Team.BLUE;
    const teamAccentColor = isBlue ? '#60a5fa' : '#f87171';
    const teamBorderColor = isBlue ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';

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

    return (
        <div className="flex flex-col h-full w-full select-none overflow-hidden">
            {/* Header / Identity bar */}
            <div className="p-3 bg-gradient-to-b from-white/10 to-transparent relative border-b border-white/5 shrink-0">
                <div className="flex justify-between items-start gap-4">
                    {/* Identity & Config Toggle */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/40 border shadow-inner shrink-0"
                            style={{ borderColor: teamBorderColor, color: teamAccentColor }}
                        >
                            {renderRoleIcon(currentRole)}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div
                                className="font-mono font-bold text-sm leading-none tracking-tight truncate"
                                style={{ color: teamAccentColor }}
                            >
                                {agent.id}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: '#94a3b8' }}>
                                    {ROLE_MAP[currentRole]?.label || currentRole}
                                </span>
                                <button
                                    onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                        isConfigExpanded
                                            ? 'text-white shadow-md'
                                            : 'bg-white/10 hover:text-white hover:bg-white/20'
                                    }`}
                                    style={isConfigExpanded ? { backgroundColor: '#06b6d4' } : { color: '#94a3b8' }}
                                    title="編輯單位屬性"
                                >
                                    <Icons.Settings className={`w-4 h-4 ${isConfigExpanded ? 'animate-spin-slow' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 shrink-0">
                        <button
                            onClick={() => setTab('STATUS')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                            style={
                                tab === 'STATUS'
                                    ? { backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }
                                    : { color: '#64748b' }
                            }
                            title="狀態監控"
                        >
                            狀態
                        </button>
                        <button
                            onClick={() => setTab('AI')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                            style={
                                tab === 'AI'
                                    ? { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d' }
                                    : { color: '#64748b' }
                            }
                            title="行為樹監控 (AI)"
                        >
                            AI
                        </button>
                        <button
                            onClick={() => setTab('SKILLS')}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                            style={
                                tab === 'SKILLS'
                                    ? { backgroundColor: 'rgba(34, 211, 238, 0.2)', color: '#67e8f9' }
                                    : { color: '#64748b' }
                            }
                            title="技能配置 (LINK)"
                        >
                            技能
                        </button>
                    </div>
                </div>

                {/* Config Drawer */}
                <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                        isConfigExpanded ? 'max-h-32 opacity-100 mt-3 pb-1 scale-100' : 'max-h-0 opacity-0 scale-95 origin-top'
                    }`}
                >
                    <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-xl border border-white/10 shadow-inner">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest block text-center" style={{ color: '#64748b' }}>
                                職業
                            </label>
                            <select
                                className="liquid-input h-8 w-full text-xs font-bold bg-black/50 !rounded-lg border-white/10 p-0 pl-2 text-white"
                                value={currentRole}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                {Object.values(Role).map((r) => (
                                    <option key={r} value={r} className="bg-black text-white">
                                        {ROLE_MAP[r].label.split(' ')[0]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest block text-center" style={{ color: 'rgba(34, 197, 94, 0.7)' }}>
                                生命值
                            </label>
                            <input
                                type="number"
                                className="liquid-input h-8 w-full text-center font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 p-0"
                                style={{ color: '#4ade80' }}
                                value={hpDraft}
                                onFocus={() => {
                                    setIsHpFocused(true);
                                    setHpDraft(Math.round(currentMaxHp).toString());
                                }}
                                onChange={(e) => setHpDraft(e.target.value)}
                                onBlur={() => {
                                    setIsHpFocused(false);
                                    submitHp();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        submitHp();
                                        e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                        setHpDraft(Math.round(currentMaxHp).toString());
                                        e.currentTarget.blur();
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest block text-center" style={{ color: 'rgba(59, 130, 246, 0.7)' }}>
                                能量值
                            </label>
                            <input
                                type="number"
                                className="liquid-input h-8 w-full text-center font-mono font-bold text-xs bg-black/50 !rounded-lg border-white/10 p-0"
                                style={{ color: '#60a5fa' }}
                                value={mpDraft}
                                onFocus={() => {
                                    setIsMpFocused(true);
                                    setMpDraft(Math.round(currentMaxMp).toString());
                                }}
                                onChange={(e) => setMpDraft(e.target.value)}
                                onBlur={() => {
                                    setIsMpFocused(false);
                                    submitMp();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        submitMp();
                                        e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                        setMpDraft(Math.round(currentMaxMp).toString());
                                        e.currentTarget.blur();
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Vitals Bars */}
                <div className="space-y-1 mt-3 pointer-events-none">
                    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden w-full flex border border-white/5">
                        <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${Math.max(0, hpPct)}%`, backgroundColor: '#10b981' }}
                        />
                    </div>
                    {currentMaxMp > 0 && (
                        <div className="h-1 bg-black/50 rounded-full overflow-hidden w-full flex border border-white/5">
                            <div
                                className="h-full transition-all duration-300"
                                style={{ width: `${mpPct}%`, backgroundColor: '#06b6d4' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Body */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative bg-black/20">
                {tab === 'STATUS' && (
                    <div className="p-3 overflow-y-auto custom-scrollbar space-y-3">
                        <div className="bg-black/30 rounded-xl p-3 border border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
                                    行為樹狀態 | 執行流程
                                </span>
                                <div className="flex gap-1">
                                    {agent.stunTimer > 0 && (
                                        <span className="liquid-tag text-[10px] px-1.5" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fcd34d' }}>
                                            暈眩
                                        </span>
                                    )}
                                    {agent.silenceTimer > 0 && (
                                        <span className="liquid-tag text-[10px] px-1.5" style={{ backgroundColor: 'rgba(51, 65, 85, 0.5)', borderColor: '#64748b', color: '#cbd5e1' }}>
                                            沉默
                                        </span>
                                    )}
                                    {agent.banished && (
                                        <span className="liquid-tag text-[10px] px-1.5" style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.5)', color: '#d8b4fe' }}>
                                            放逐
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold" style={{ color: agent.hp <= 0 ? '#475569' : '#fbbf24' }}>
                                    {Helpers.getAIStateLabel(agent.aiState)}
                                </span>
                                <span className="text-[10px] font-mono" style={{ color: '#334155' }}>/</span>
                                <span className="text-xs font-mono font-bold" style={{ color: agent.hp <= 0 ? '#475569' : '#67e8f9' }}>
                                    {Helpers.getActionStateLabel(agent.actionState)}
                                </span>
                            </div>
                        </div>

                        {/* Vital Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 flex flex-col">
                                <span className="text-[10px] uppercase font-sans font-bold" style={{ color: '#64748b' }}>目前座標 (Q, R)</span>
                                <span className="text-sm font-bold text-white mt-1">({agent.q}, {agent.r})</span>
                            </div>
                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 flex flex-col">
                                <span className="text-[10px] uppercase font-sans font-bold" style={{ color: '#64748b' }}>護盾值 (SHIELD)</span>
                                <span className="text-sm font-bold mt-1" style={{ color: '#38bdf8' }}>{Math.round(agent.shield)}</span>
                            </div>
                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 flex flex-col">
                                <span className="text-[10px] uppercase font-sans font-bold" style={{ color: '#64748b' }}>生命值 (HP / MAX)</span>
                                <span className="text-sm font-bold mt-1" style={{ color: '#4ade80' }}>{Math.round(currentHp)} / {Math.round(currentMaxHp)}</span>
                            </div>
                            <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 flex flex-col">
                                <span className="text-[10px] uppercase font-sans font-bold" style={{ color: '#64748b' }}>能量值 (MP / MAX)</span>
                                <span className="text-sm font-bold mt-1" style={{ color: '#60a5fa' }}>{Math.round(currentMp)} / {Math.round(currentMaxMp)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'AI' && (
                    <div className="flex-1 w-full h-full relative overflow-hidden">
                        <BehaviorTreeTab agent={agent} version={updateCounter} engine={engine} />
                        <div className="absolute bottom-2 right-2 text-[10px] text-white/20 font-mono pointer-events-none">
                            即時運算中 (LIVE)
                        </div>
                    </div>
                )}

                {tab === 'SKILLS' && (
                    <div className="flex-1 w-full h-full relative overflow-hidden p-1">
                        <UnitStatusTab agent={agent} db={engine.skillDB} onUpdate={() => setUpdateCounter((n) => n + 1)} />
                    </div>
                )}
            </div>
        </div>
    );
};
