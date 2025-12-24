
import React from 'react';
import { Agent } from '../../../engine/game';
import { Role, Skill, Team } from '../../../types';
import { ROLE_MAP, TAG_MAP, Helpers } from '../InspectorConstants';
import { SkillIcon } from '../parts/SkillIcon';

interface UnitStatusTabProps {
    agent: Agent;
    db: Skill[];
    onHoverSkill?: (skill: Skill | null) => void;
    onUpdate: () => void;
}

export const UnitStatusTab: React.FC<UnitStatusTabProps> = ({ agent, db, onHoverSkill, onUpdate }) => {
    
    const setRole = (r: string) => { 
        agent.role = r as Role; 
        onUpdate(); 
    };

    const setSkill = (idx: number, id: string) => {
        agent.skillIds[idx] = id || null; 
        onUpdate();
    };

    const roleConfig = Helpers.getRoleConfig(agent.role);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-24 space-y-8">
            {/* STAT BLOCK */}
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 ml-1">CLASS CONFIGURATION</label>
                    <select 
                        className={`liquid-input h-14 w-full text-lg font-bold cursor-pointer border-2 ${roleConfig.border} ${roleConfig.color} bg-black/40`}
                        value={agent.role} 
                        onChange={(e) => setRole(e.target.value)}
                    >
                        {Object.values(Role).map(r => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                    <div className="liquid-card-dark p-4 border border-white/5 relative group">
                        <label className="text-[10px] font-bold text-green-500/70 uppercase tracking-widest block mb-2">MAX INTEGRITY</label>
                        <input 
                            type="number" 
                            className="liquid-input h-12 w-full text-2xl text-center text-green-400 font-mono !bg-black/50 !border-green-900/50 focus:!border-green-500"
                            value={Math.round(agent.maxHp)} 
                            onChange={(e) => { const v = parseInt(e.target.value); agent.maxHp = v; agent.hp = v; onUpdate(); }} 
                        />
                        <div className="h-1 bg-black/50 mt-3 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{width: `${(agent.hp/agent.maxHp)*100}%`}}></div>
                        </div>
                    </div>
                    <div className="liquid-card-dark p-4 border border-white/5 relative group">
                        <label className="text-[10px] font-bold text-blue-500/70 uppercase tracking-widest block mb-2">MAX ENERGY</label>
                        <input 
                            type="number" 
                            className="liquid-input h-12 w-full text-2xl text-center text-blue-400 font-mono !bg-black/50 !border-blue-900/50 focus:!border-blue-500"
                            value={Math.round(agent.maxMp)} 
                            onChange={(e) => { agent.maxMp = parseInt(e.target.value); onUpdate(); }} 
                        />
                        <div className="h-1 bg-black/50 mt-3 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{width: `${(agent.mp/agent.maxMp)*100}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10 pt-6">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">NEURAL LINKAGE (SKILLS)</div>
                <div className="space-y-4">
                    {['ULT', 'ACTIVE', 'BASIC'].map((tag, i) => {
                        const currentSkillId = agent.skillIds[i];
                        const currentSkill = db.find(s => s.id === currentSkillId);
                        
                        const availableSkills = db.filter(s => s.tag === tag);
                        const skillsByRole: Record<string, Skill[]> = {};
                        availableSkills.forEach(s => {
                            if(!skillsByRole[s.role]) skillsByRole[s.role] = [];
                            skillsByRole[s.role].push(s);
                        });
                        const roleOrder = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];

                        return (
                            <div key={i} className="liquid-card !bg-slate-900/40 border border-white/5 transition-all hover:border-white/20 group" onMouseEnter={() => onHoverSkill && onHoverSkill(currentSkill || null)} onMouseLeave={() => onHoverSkill && onHoverSkill(null)}>
                                <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-white/[0.02]">
                                    <SkillIcon skill={currentSkill || null} className="w-14 h-14 !rounded-2xl shadow-lg" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-500 mb-1.5 flex justify-between uppercase tracking-wider">
                                            <span>{TAG_MAP[tag].label} SLOT</span>
                                            {currentSkill && <span className="text-cyan-500/50 font-mono">ID: {currentSkill.id}</span>}
                                        </div>
                                        <div className="relative">
                                            <select 
                                                className={`liquid-input h-10 w-full text-sm font-bold appearance-none cursor-pointer uppercase tracking-wide ${!currentSkillId ? 'text-slate-500' : 'text-slate-200'}`}
                                                value={agent.skillIds[i] || ""} 
                                                onChange={(e) => setSkill(i, e.target.value)}
                                            >
                                                <option value="">-- EMPTY SLOT --</option>
                                                {roleOrder.map(role => {
                                                    const skills = skillsByRole[role];
                                                    if (!skills || skills.length === 0) return null;
                                                    return (
                                                        <optgroup key={role} label={ROLE_MAP[role].label} className="bg-slate-900 text-slate-400">
                                                            {skills.map(s => (
                                                                <option key={s.id} value={s.id} className="text-white">
                                                                    {s.name} {s.team !== undefined ? (s.team === Team.BLUE ? '🔵' : '🔴') : ''}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</div>
                                        </div>
                                    </div>
                                </div>

                                {currentSkill && (
                                    <div className="p-4 text-sm bg-black/20">
                                        <div className="text-slate-400 italic mb-4 leading-relaxed pl-3 border-l-2 border-slate-700/50">
                                            "{currentSkill.desc}"
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                                            <div className="liquid-card-dark p-2 text-center">
                                                <div className="text-slate-500 text-[9px] mb-1 uppercase">PWR</div>
                                                <div className="font-bold text-base text-white">{currentSkill.power}</div>
                                            </div>
                                            <div className="liquid-card-dark p-2 text-center">
                                                <div className="text-slate-500 text-[9px] mb-1 uppercase">CD</div>
                                                <div className="font-bold text-base text-white">{currentSkill.cd}s</div>
                                            </div>
                                            <div className="liquid-card-dark p-2 text-center">
                                                <div className="text-slate-500 text-[9px] mb-1 uppercase">COST</div>
                                                <div className="font-bold text-base text-blue-400">{currentSkill.cost}</div>
                                            </div>
                                            <div className="liquid-card-dark p-2 text-center">
                                                <div className="text-slate-500 text-[9px] mb-1 uppercase">RNG</div>
                                                <div className="font-bold text-base text-white">{currentSkill.range}</div>
                                            </div>
                                        </div>
                                        {(currentSkill.ccType || currentSkill.effectType) && (
                                            <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 flex-wrap">
                                                {currentSkill.ccType && <span className="liquid-tag bg-amber-500/10 border-amber-500/30 text-amber-300">{currentSkill.ccType}</span>}
                                                {currentSkill.effectType && <span className="liquid-tag bg-purple-500/10 border-purple-500/30 text-purple-300">{currentSkill.effectType}</span>}
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
    );
};
