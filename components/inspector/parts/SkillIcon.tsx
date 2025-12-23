
import React from 'react';
import { Skill } from '../../../types';
import { AssetManager } from '../../../engine/assets';

interface SkillIconProps {
    skill: Skill | null;
    className?: string;
}

export const SkillIcon: React.FC<SkillIconProps> = ({ skill, className }) => {
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-10 h-10';
    if (!skill || !skill.visual) return <div className={`rounded bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xs text-slate-500 ${sizeClass} ${className || ''}`}>∅</div>;
    const iconUrl = AssetManager.getSkillIcon(skill.visual, skill.color).toDataURL();
    return <img src={iconUrl} className={`rounded bg-slate-900 border-2 border-slate-600 shadow-md ${sizeClass} ${className || ''}`} alt={skill.visual} />;
};
