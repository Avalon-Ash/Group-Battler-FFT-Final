import React, { createElement, useMemo } from 'react';
import type { Skill } from '../../../types';
import { getSkillIconDataUrl } from '../../../hooks/adapters/skillIcon';
import { useSkillGlyphs } from '../../../hooks/adapters/skillGlyphs';
import { SKILL_GLYPH } from '../../../data/ui/skillGlyphs';
import { cn } from '../../ui/primitives/cn';

interface SkillIconProps {
    /** 只讀圖示需要的欄位：檢查器傳整個 Skill，PLAY HUD 傳投影裡的這四個 */
    skill: Pick<Skill, 'id' | 'visual' | 'color' | 'name'> | null;
    className?: string;
    'data-testid'?: string;
}

/**
 * 技能圖示。有對照（data/ui/skillGlyphs.ts）的技能畫「白線色底」徽章（WORKLOG §2 DE）：
 * 底色是技能色壓暗、外框是技能色、白色線條，外觀在 index.css 的 .skill-glyph；
 * 線條資料執行時才載入（useSkillGlyphs），載入前與沒有對照的技能（編輯器新增的）用舊的程序圖示。
 */
export const SkillIcon: React.FC<SkillIconProps> = ({ skill, className, 'data-testid': testId }) => {
    const sizeClass = (className?.includes('w-') && className?.includes('h-')) ? '' : 'w-10 h-10';
    const glyphs = useSkillGlyphs();
    const glyph = skill ? glyphs?.[SKILL_GLYPH[skill.id] ?? ''] : undefined;

    const iconUrl = useMemo(() => {
        if (glyph || !skill || !skill.visual) return null;
        return getSkillIconDataUrl(skill.visual, skill.color);
    }, [glyph, skill?.visual, skill?.color]);

    if (skill && glyph) {
        return (
            <span
                data-testid={testId}
                data-glyph={SKILL_GLYPH[skill.id]}
                role="img"
                aria-label={skill.name}
                className={cn('skill-glyph shrink-0 rounded-ui-control', sizeClass, className)}
                style={{ '--skill-color': skill.color } as React.CSSProperties}
            >
                <svg viewBox="0 0 24 24" className="skill-glyph-svg" aria-hidden>
                    {glyph.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
                </svg>
            </span>
        );
    }

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
