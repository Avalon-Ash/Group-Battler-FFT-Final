
import React, { useState } from 'react';
import { Role, Skill, Team } from '../../../types';
import { SKILL_FIELD_GROUPS, TAG_MAP, ROLE_MAP, Helpers } from '../InspectorConstants';
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
        <div className="flex flex-col h-full bg-slate-900">
            <div className="p-3 border-b border-slate-800 bg-slate-950 shrink-0 space-y-3">
                <div className="flex justify-between items-end">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">資料庫檢索</div>
                    <div className="text-[10px] font-mono text-cyan-400">
                        顯示: {filteredSkills.length} / 總量: {db.length}
                    </div>
                </div>

                <div className="flex bg-slate-900 rounded p-1 gap-1 border border-slate-800">
                    {['ALL', 'BASIC', 'ACTIVE', 'ULT'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setDbTypeTab(t as any)} 
                            className={`flex-1 py-2 text-xs rounded font-bold transition-all ${dbTypeTab === t ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {t === 'ALL' ? '全部' : TAG_MAP[t].label}
                        </button>
                    ))}
                </div>
                
                <select 
                    className="tactical-input w-full h-10 text-sm"
                    value={dbRoleFilter}
                    onChange={(e) => setDbRoleFilter(e.target.value as any)}
                >
                    <option value="ALL">篩選職階: 全部</option>
                    {Object.values(Role).map(r => <option key={r} value={r}>職階: {ROLE_MAP[r].label}</option>)}
                </select>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-24 space-y-2">
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
                                    <span className="font-mono font-bold">{ROLE_MAP[skill.role].label}</span>
                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                    <span className={`${skill.tag === 'ULT' ? 'text-purple-400' : (skill.tag === 'ACTIVE' ? 'text-blue-400' : 'text-slate-400')} font-bold`}>{TAG_MAP[skill.tag].label}</span>
                                </div>
                            </div>
                            <div className="text-slate-600 text-lg">
                                {selectedSkillId === skill.id ? '−' : '+'}
                            </div>
                        </div>

                        {selectedSkillId === skill.id && (
                            <div className="p-4 border-t border-slate-700 bg-black/20 text-left">
                                {SKILL_FIELD_GROUPS.map((group) => (
                                    <div key={group.name} className="mb-4 last:mb-0">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-700 mb-2 pb-1">
                                            {group.name}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.fields.map((field) => {
                                                const val = (skill as any)[field.key];
                                                
                                                // Helper for special handling of Team Enum
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
                                                        <label className="text-[9px] font-bold text-slate-500 block truncate" title={field.label}>{field.label}</label>
                                                        
                                                        {field.type === 'textarea' ? (
                                                            <textarea 
                                                                className="tactical-input w-full p-2 h-20 text-sm resize-none"
                                                                value={displayVal}
                                                                onChange={e => updateSkill(field.key, e.target.value)}
                                                            />
                                                        ) : field.type === 'select' ? (
                                                            <select 
                                                                className="tactical-input w-full h-8 text-xs appearance-none cursor-pointer"
                                                                value={displayVal}
                                                                onChange={e => {
                                                                    const v = e.target.value;
                                                                    if (v === 'NONE' || v === 'ANY' || v === '') updateSkill(field.key, undefined);
                                                                    else updateSkill(field.key, v); 
                                                                }}
                                                            >
                                                                {/* Support both Simple String options and Labeled options */}
                                                                {field.options ? 
                                                                    field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>) :
                                                                    field.simpleOptions?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                                                                }
                                                            </select>
                                                        ) : field.type === 'color' ? (
                                                            <div className="flex gap-1 items-center">
                                                                <input 
                                                                    type="text" 
                                                                    className="tactical-input flex-1 h-8 text-xs min-w-0" 
                                                                    value={displayVal} 
                                                                    onChange={e => updateSkill(field.key, e.target.value)} 
                                                                />
                                                                <input 
                                                                    type="color" 
                                                                    className="w-6 h-8 p-0 border-0 bg-transparent cursor-pointer" 
                                                                    value={displayVal.startsWith('#') ? displayVal : '#ffffff'} 
                                                                    onChange={e => updateSkill(field.key, e.target.value)} 
                                                                />
                                                            </div>
                                                        ) : (
                                                            <input 
                                                                type={field.type} 
                                                                className="tactical-input w-full h-8 text-xs"
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
                ))}
            </div>
        </div>
    );
};
