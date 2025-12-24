
import React, { useState } from 'react';
import { Role, Skill, Team } from '../../../types';
import { SKILL_FIELD_GROUPS, TAG_MAP, ROLE_MAP } from '../InspectorConstants';
import { SkillIcon } from '../parts/SkillIcon';

interface SkillDbTabProps {
    db: Skill[];
    onUpdate: () => void;
}

export const SkillDbTab: React.FC<SkillDbTabProps> = ({ db, onUpdate }) => {
    const [dbTypeTab, setDbTypeTab] = useState<'ALL' | 'BASIC' | 'ACTIVE' | 'ULT'>('ALL');
    const [dbRoleFilter, setDbRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

    const filteredSkills = db.filter(s => {
        if (dbTypeTab !== 'ALL' && s.tag !== dbTypeTab) return false;
        if (dbRoleFilter !== 'ALL' && s.role !== dbRoleFilter) return false;
        return true;
    });

    const updateSkill = (field: keyof Skill, value: any) => {
        const skill = db.find(s => s.id === selectedSkillId);
        if (skill) { 
            if (field === 'team') {
                if (value === 'ANY') (skill as any)[field] = undefined;
                else if (value === 'BLUE') (skill as any)[field] = Team.BLUE;
                else if (value === 'RED') (skill as any)[field] = Team.RED;
            } else {
                (skill as any)[field] = value; 
            }
            onUpdate(); 
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Header / Controls */}
            <div className="p-5 border-b border-white/10 shrink-0 space-y-4 bg-white/[0.02]">
                <div className="flex justify-between items-end">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">NEURAL ARCHIVE</div>
                    <div className="text-[10px] font-mono text-cyan-400 text-glow-cyan">
                        INDEX: {filteredSkills.length} / {db.length}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Type Tabs */}
                    <div className="flex liquid-card-dark p-1 gap-1">
                        {['ALL', 'BASIC', 'ACTIVE', 'ULT'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setDbTypeTab(t as any)} 
                                className={`flex-1 py-2 text-[10px] rounded-xl font-bold transition-all uppercase tracking-wider ${dbTypeTab === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                {t === 'ALL' ? 'ALL' : TAG_MAP[t].label}
                            </button>
                        ))}
                    </div>
                    
                    {/* Role Select */}
                    <div className="relative group">
                        <select 
                            className="liquid-input w-full h-10 text-xs appearance-none cursor-pointer uppercase font-bold tracking-wider group-hover:border-white/30 transition-colors"
                            value={dbRoleFilter}
                            onChange={(e) => setDbRoleFilter(e.target.value as any)}
                        >
                            <option value="ALL">FILTER CLASS: ALL</option>
                            {Object.values(Role).map(r => <option key={r} value={r}>FILTER: {ROLE_MAP[r].label}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs">▼</div>
                    </div>
                </div>
            </div>
            
            {/* List Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-3">
                {filteredSkills.map(skill => {
                    const isSelected = selectedSkillId === skill.id;
                    return (
                        <div 
                            key={skill.id} 
                            className={`liquid-card !rounded-2xl transition-all duration-300 overflow-hidden ${isSelected ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/80' : 'hover:border-white/20 hover:scale-[1.01] bg-slate-900/40'}`}
                        >
                            <div 
                                className="flex items-center gap-4 p-3 cursor-pointer select-none"
                                onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                            >
                                <SkillIcon skill={skill} className="w-12 h-12 !rounded-xl !border-white/10 shadow-md" />
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>{skill.name}</div>
                                    <div className="text-[10px] text-slate-500 flex gap-2 items-center mt-1 uppercase font-bold tracking-wider">
                                        <span>{ROLE_MAP[skill.role].label}</span>
                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                        <span className={`${skill.tag === 'ULT' ? 'text-purple-400' : (skill.tag === 'ACTIVE' ? 'text-blue-400' : 'text-slate-400')}`}>{TAG_MAP[skill.tag].label}</span>
                                    </div>
                                </div>
                                <div className={`text-xl transition-transform duration-300 ${isSelected ? 'rotate-90 text-cyan-400' : 'text-slate-600'}`}>
                                    ›
                                </div>
                            </div>

                            {/* Edit Form */}
                            {isSelected && (
                                <div className="p-4 bg-black/40 border-t border-white/5 space-y-5 animate-slide-down">
                                    {SKILL_FIELD_GROUPS.map((group) => (
                                        <div key={group.name} className="space-y-3">
                                            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                                                <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.name}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                {group.fields.map((field) => {
                                                    const val = (skill as any)[field.key];
                                                    let displayVal = val;
                                                    
                                                    if (field.key === 'team') {
                                                        if (val === undefined) displayVal = 'ANY';
                                                        else if (val === Team.BLUE) displayVal = 'BLUE';
                                                        else if (val === Team.RED) displayVal = 'RED';
                                                    } else if (val === undefined || val === null) {
                                                        displayVal = '';
                                                    }

                                                    const isWide = field.type === 'textarea';

                                                    return (
                                                        <div key={field.key} className={isWide ? "col-span-2 space-y-1" : "space-y-1"}>
                                                            <label className="text-[9px] font-bold text-slate-400 block ml-1" title={field.label}>{field.label}</label>
                                                            
                                                            {field.type === 'textarea' ? (
                                                                <textarea 
                                                                    className="liquid-input w-full p-3 h-24 resize-none !rounded-xl leading-relaxed"
                                                                    value={displayVal}
                                                                    onChange={e => updateSkill(field.key, e.target.value)}
                                                                />
                                                            ) : field.type === 'select' ? (
                                                                <div className="relative">
                                                                    <select 
                                                                        className="liquid-input w-full h-9 text-xs appearance-none cursor-pointer"
                                                                        value={displayVal}
                                                                        onChange={e => {
                                                                            const v = e.target.value;
                                                                            if (v === 'NONE' || v === 'ANY' || v === '') updateSkill(field.key, undefined);
                                                                            else updateSkill(field.key, v); 
                                                                        }}
                                                                    >
                                                                        {field.options ? 
                                                                            field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) :
                                                                            field.simpleOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                                                        }
                                                                    </select>
                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</div>
                                                                </div>
                                                            ) : field.type === 'color' ? (
                                                                <div className="flex gap-2 items-center">
                                                                    <div className="relative flex-1">
                                                                        <input 
                                                                            type="text" 
                                                                            className="liquid-input w-full h-9 text-xs font-mono" 
                                                                            value={displayVal} 
                                                                            onChange={e => updateSkill(field.key, e.target.value)} 
                                                                        />
                                                                    </div>
                                                                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/20 shadow-inner">
                                                                        <input 
                                                                            type="color" 
                                                                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0" 
                                                                            value={displayVal.startsWith('#') ? displayVal : '#ffffff'} 
                                                                            onChange={e => updateSkill(field.key, e.target.value)} 
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <input 
                                                                    type={field.type} 
                                                                    className="liquid-input w-full h-9 text-xs font-mono"
                                                                    value={displayVal}
                                                                    step={field.step || 1}
                                                                    onChange={e => updateSkill(field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
