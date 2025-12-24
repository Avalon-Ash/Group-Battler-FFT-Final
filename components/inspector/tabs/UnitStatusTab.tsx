
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-6">
            {/* STAT BLOCK */}
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">職階分類</label>
                    <select 
                        className={`tactical-input h-12 w-full text-lg font-bold bg-slate-900 border-2 ${roleConfig.color} ${roleConfig.border}`}
                        value={agent.role} 
                        onChange={(e) => setRole(e.target.value)}
                    >
                        {Object.values(Role).map(r => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
                    </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">生命值</label>
                        <input 
                            type="number" 
                            className="tactical-input h-12 w-full text-2xl text-center text-green-400 font-mono bg-black/30 border-green-900/50 focus:border-green-500"
                            value={Math.round(agent.maxHp)} 
                            onChange={(e) => { const v = parseInt(e.target.value); agent.maxHp = v; agent.hp = v; onUpdate(); }} 
                        />
                        <div className="h-1 bg-slate-800 mt-2 rounded overflow-hidden">
                            <div className="h-full bg-green-500" style={{width: `${(agent.hp/agent.maxHp)*100}%`}}></div>
                        </div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded border border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">魔力值</label>
                        <input 
                            type="number" 
                            className="tactical-input h-12 w-full text-2xl text-center text-blue-400 font-mono bg-black/30 border-blue-900/50 focus:border-blue-500"
                            value={Math.round(agent.maxMp)} 
                            onChange={(e) => { agent.maxMp = parseInt(e.target.value); onUpdate(); }} 
                        />
                        <div className="h-1 bg-slate-800 mt-2 rounded overflow-hidden">
                            <div className="h-full bg-blue-500" style={{width: `${(agent.mp/agent.maxMp)*100}%`}}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">技能組</div>
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
                            <div key={i} className="bg-slate-900 rounded-sm border border-slate-700 shadow-md transition-all hover:border-slate-500" onMouseEnter={() => onHoverSkill && onHoverSkill(currentSkill || null)} onMouseLeave={() => onHoverSkill && onHoverSkill(null)}>
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border-b border-slate-800">
                                    <SkillIcon skill={currentSkill || null} className="w-12 h-12" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-bold text-slate-500 mb-1 flex justify-between">
                                            <span>{TAG_MAP[tag].label} 欄位</span>
                                            {currentSkill && <span className="text-slate-400 font-mono">ID: {currentSkill.id}</span>}
                                        </div>
                                        <select 
                                            className={`tactical-input h-10 w-full text-sm font-bold appearance-none cursor-pointer ${!currentSkillId ? 'text-slate-500' : 'text-slate-200'}`}
                                            value={agent.skillIds[i] || ""} 
                                            onChange={(e) => setSkill(i, e.target.value)}
                                        >
                                            <option value="">-- 空欄位 --</option>
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
                                    </div>
                                </div>

                                {currentSkill && (
                                    <div className="p-3 text-sm">
                                        <div className="text-slate-400 italic mb-3 leading-relaxed border-l-2 border-slate-700 pl-3">
                                            "{currentSkill.desc}"
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-xs font-mono text-slate-300">
                                            <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                <div className="text-slate-500 text-[10px] mb-1">威力</div>
                                                <div className="font-bold text-base">{currentSkill.power}</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                <div className="text-slate-500 text-[10px] mb-1">冷卻</div>
                                                <div className="font-bold text-base">{currentSkill.cd}s</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                <div className="text-slate-500 text-[10px] mb-1">消耗</div>
                                                <div className="font-bold text-base text-blue-400">{currentSkill.cost}</div>
                                            </div>
                                            <div className="bg-slate-950 p-2 rounded text-center border border-slate-800">
                                                <div className="text-slate-500 text-[10px] mb-1">射程</div>
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
    );
};
