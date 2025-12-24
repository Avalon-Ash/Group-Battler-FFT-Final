
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
            <div className="p-5 border-b border-white/5 shrink-0 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Neural Archive</div>
                    <div className="text-[10px] font-mono text-cyan-500/80 bg-cyan-950/30 px-2 py-1 rounded-md border border-cyan-500/20">
                        {filteredSkills.length} ENTRIES
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {/* Type Tabs */}
                    <div className="flex bg-black/40 p-1 gap-1 rounded-xl border border-white/5">
                        {['ALL', 'BASIC', 'ACTIVE', 'ULT'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setDbTypeTab(t as any)} 
                                className={`flex-1 py-2 text-[10px] rounded-lg font-bold transition-all uppercase tracking-wider ${dbTypeTab === t ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                {t === 'ALL' ? 'ALL' : TAG_MAP[t].label}
                            </button>
                        ))}
                    </div>
                    
                    {/* Role Select */}
                    <div className="relative group">
                        <select 
                            className="liquid-input w-full h-10 text-xs appearance-none cursor-pointer uppercase font-bold tracking-wider !bg-black/40 hover:!border-white/20 transition-colors"
                            value={dbRoleFilter}
                            onChange={(e) => setDbRoleFilter(e.target.value as any)}
                        >
                            <option value="ALL">FILTER CLASS: ALL</option>
                            {Object.values(Role).map(r => <option key={r} value={r}>FILTER: {ROLE_MAP[r].label}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</div>
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
                            className={`liquid-card !rounded-2xl transition-all duration-300 overflow-hidden border ${isSelected ? 'border-cyan-500/40 bg-slate-900/80 shadow-[0_4px_20px_rgba(0,0,0,0.4)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}
                        >
                            <div 
                                className="flex items-center gap-4 p-3 cursor-pointer select-none"
                                onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                            >
                                <SkillIcon skill={skill} className={`w-12 h-12 !rounded-xl border ${isSelected ? 'border-cyan-500/50' : 'border-white/10'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold text-sm ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>{skill.name}</div>
                                    <div className="flex gap-2 items-center mt-1.5">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-black/30 px-1.5 py-0.5 rounded-md border border-white/5">{ROLE_MAP[skill.role].label}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border bg-opacity-10 border-opacity-20 ${skill.tag === 'ULT' ? 'text-purple-300 bg-purple-500 border-purple-400' : (skill.tag === 'ACTIVE' ? 'text-blue-300 bg-blue-500 border-blue-400' : 'text-slate-400 bg-slate-500 border-slate-400')}`}>
                                            {TAG_MAP[skill.tag].label}
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-white/5 transition-transform duration-300 ${isSelected ? 'rotate-90 text-cyan-400 bg-cyan-900/30' : 'text-slate-600'}`}>
                                    ›
                                </div>
                            </div>

                            {/* Edit Form */}
                            {isSelected && (
                                <div className="p-4 bg-black/40 border-t border-white/5 space-y-6 animate-slide-down">
                                    {SKILL_FIELD_GROUPS.map((group) => (
                                        <div key={group.name} className="space-y-3">
                                            <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.name}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
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
                                                        <div key={field.key} className={isWide ? "col-span-2 space-y-1.5" : "space-y-1.5"}>
                                                            <label className="text-[9px] font-bold text-slate-400 block ml-1" title={field.label}>{field.label}</label>
                                                            
                                                            {field.type === 'textarea' ? (
                                                                <textarea 
                                                                    className="liquid-input w-full p-3 h-24 resize-none !rounded-xl leading-relaxed !bg-black/50"
                                                                    value={displayVal}
                                                                    onChange={e => updateSkill(field.key, e.target.value)}
                                                                />
                                                            ) : field.type === 'select' ? (
                                                                <div className="relative">
                                                                    <select 
                                                                        className="liquid-input w-full h-9 text-xs appearance-none cursor-pointer !bg-black/50 !rounded-xl pr-8"
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
                                                                            className="liquid-input w-full h-9 text-xs font-mono !bg-black/50 !rounded-xl" 
                                                                            value={displayVal} 
                                                                            onChange={e => updateSkill(field.key, e.target.value)} 
                                                                        />
                                                                    </div>
                                                                    <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/20 shadow-inner shrink-0">
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
                                                                    className="liquid-input w-full h-9 text-xs font-mono !bg-black/50 !rounded-xl"
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
