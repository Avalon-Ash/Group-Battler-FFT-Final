import React, { useMemo } from 'react';
import type { Skill } from '../../../types';
import { getSkillIconDataUrl } from '../../../hooks/adapters/skillIcon';
import { cn } from '../../ui/primitives/cn';

interface SkillIconProps {
    skill: Skill | null;
    className?: string;
}

export const SkillIcon: React.FC<SkillIconProps> = ({ skill, className }) => {
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-10 h-10';

    const iconUrl = useMemo(() => {
        if (!skill || !skill.visual) return null;
        return getSkillIconDataUrl(skill.visual, skill.color);
    }, [skill?.visual, skill?.color]);

    if (!skill || !skill.visual || !iconUrl) {
        return (
            <div
                className={cn(
                    'well flex shrink-0 items-center justify-center rounded-ui-control text-ui-label text-fg-disabled',
                    sizeClass,
                    className,
                )}
            >
                -
            </div>
        );
    }

    return (
        <img
            src={iconUrl}
            className={cn(
                'card shrink-0 rounded-ui-control object-cover',
                sizeClass,
                className,
            )}
            alt={skill.name || skill.visual}
        />
    );
};
