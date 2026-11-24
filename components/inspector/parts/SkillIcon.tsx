import React, { useMemo } from 'react';
import type { Skill } from '../../../types';
import { getSkillIconDataUrl } from '../../../hooks/adapters/skillIcon';
import { cn } from '../../ui/primitives/cn';

interface SkillIconProps {
    /** 只讀圖示需要的欄位：檢查器傳整個 Skill，PLAY HUD 傳投影裡的這三個 */
    skill: Pick<Skill, 'visual' | 'color' | 'name'> | null;
    className?: string;
    'data-testid'?: string;
}

export const SkillIcon: React.FC<SkillIconProps> = ({ skill, className, 'data-testid': testId }) => {
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-10 h-10';

    const iconUrl = useMemo(() => {
        if (!skill || !skill.visual) return null;
        return getSkillIconDataUrl(skill.visual, skill.color);
    }, [skill?.visual, skill?.color]);

    if (!skill || !skill.visual || !iconUrl) {
        return (
            <div
                data-testid={testId}
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
            data-testid={testId}
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
