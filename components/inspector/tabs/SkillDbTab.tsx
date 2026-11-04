import React, { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Role, Team } from '../../../types';
import { useCommands, useView } from '../../../hooks/useEnginePort';
import { selectSkillDbView } from '../../../engine/systems/ui/views/l4';
import { readSkillField, type SkillEditableField } from '../../../data/ui/skillEditor';
import { rgbChannelsToHex, UI_TOKENS } from '../../../data/ui/tokens';
import { SkillIcon } from '../parts/SkillIcon';
import {
    Card,
    ColorInput,
    Input,
    NumberInput,
    Segmented,
    Select,
    Tag,
    Textarea,
    type SelectOption,
} from '../../ui/primitives';
import { cn } from '../../ui/primitives/cn';
import { Icons } from '../../ui/icons';
import {
    ROLE_LABELS,
    TAG_LABELS,
    SKILL_DB_TYPE_OPTIONS,
    SKILL_DB_ROLE_OPTIONS,
    SKILL_EDIT_TAG_OPTIONS,
    SKILL_EDIT_TARGET_OPTIONS,
    SKILL_EDIT_ELEMENT_OPTIONS,
    SKILL_EDIT_SPECIAL_VISUAL_OPTIONS,
    SKILL_EDIT_CC_OPTIONS,
    SKILL_EDIT_EFFECT_OPTIONS,
    SKILL_EDIT_BOOL_OPTIONS,
    SKILL_EDIT_VISUAL_OPTIONS,
    SKILL_EDIT_HIT_OPTIONS,
    SKILL_EDIT_PROJECTILE_OPTIONS,
    SKILL_EDIT_HAZARD_OPTIONS,
    SKILL_EDIT_TEAM_OPTIONS,
} from '../../../data/ui/labels/l4';

type DbTypeTab = 'ALL' | 'BASIC' | 'ACTIVE' | 'ULT' | 'MOBILITY';

const ROW_ESTIMATE_PX = 64;

interface FormFieldDef {
    key: SkillEditableField;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'color';
    step?: number;
    options?: SelectOption[];
    isWide?: boolean;
}

interface FormGroupDef {
    name: string;
    fields: FormFieldDef[];
}

const FORM_GROUPS: FormGroupDef[] = [
    {
        name: 'VISUAL & ASSETS',
        fields: [
            { key: 'name', label: '技能名稱', type: 'text' },
            { key: 'desc', label: '技能描述', type: 'textarea', isWide: true },
            { key: 'tag', label: '技能類型', type: 'select', options: SKILL_EDIT_TAG_OPTIONS },
            { key: 'visual', label: '基礎外觀', type: 'select', options: SKILL_EDIT_VISUAL_OPTIONS },
            { key: 'visualHitEffect', label: '命中特效', type: 'select', options: SKILL_EDIT_HIT_OPTIONS },
            { key: 'visualProjectileEffect', label: '彈道外觀', type: 'select', options: SKILL_EDIT_PROJECTILE_OPTIONS },
            { key: 'specialVisualStatus', label: '特殊視覺狀態', type: 'select', options: SKILL_EDIT_SPECIAL_VISUAL_OPTIONS },
            { key: 'color', label: '核心色標', type: 'color' },
            { key: 'team', label: '專屬陣營', type: 'select', options: SKILL_EDIT_TEAM_OPTIONS },
        ],
    },
    {
        name: 'PHYSICS & SPATIAL',
        fields: [
            { key: 'projectileSpeed', label: '彈道速度', type: 'number', step: 100 },
            { key: 'range', label: '極限射程', type: 'number', step: 1 },
            { key: 'type', label: '目標模式', type: 'select', options: SKILL_EDIT_TARGET_OPTIONS },
            { key: 'aoeRadius', label: '範圍半徑', type: 'number', step: 0.5 },
        ],
    },
    {
        name: 'COMBAT PARAMS',
        fields: [
            { key: 'power', label: '威力指數', type: 'number' },
            { key: 'cast', label: '詠唱時間', type: 'number', step: 0.1 },
            { key: 'cost', label: '能量消耗', type: 'number' },
            { key: 'gain', label: '能量獲取', type: 'number' },
            { key: 'cd', label: '冷卻時長', type: 'number', step: 0.1 },
            { key: 'element', label: '元素屬性', type: 'select', options: SKILL_EDIT_ELEMENT_OPTIONS },
        ],
    },
    {
        name: 'CC & EFFECTS',
        fields: [
            { key: 'ccType', label: '主控制類型', type: 'select', options: SKILL_EDIT_CC_OPTIONS },
            { key: 'ccDur', label: '持續時間', type: 'number', step: 0.1 },
            { key: 'ccForce', label: '力度參數', type: 'number' },
            { key: 'ccSelf', label: '主控自身', type: 'select', options: SKILL_EDIT_BOOL_OPTIONS },
            { key: 'ccType2', label: '次控制類型', type: 'select', options: SKILL_EDIT_CC_OPTIONS },
            { key: 'ccDur2', label: '次控時間', type: 'number', step: 0.1 },
            { key: 'ccForce2', label: '次控力度', type: 'number' },
            { key: 'ccSelf2', label: '次控自身', type: 'select', options: SKILL_EDIT_BOOL_OPTIONS },
            { key: 'effectType', label: '附加效果 1', type: 'select', options: SKILL_EDIT_EFFECT_OPTIONS },
            { key: 'effectVal', label: '數值 1', type: 'number' },
            { key: 'effectType2', label: '附加效果 2', type: 'select', options: SKILL_EDIT_EFFECT_OPTIONS },
            { key: 'effectVal2', label: '數值 2', type: 'number' },
            { key: 'hazardKind', label: '危害區類型', type: 'select', options: SKILL_EDIT_HAZARD_OPTIONS },
            { key: 'hazardDur', label: '危害區時間', type: 'number', step: 0.1 },
        ],
    },
];

export const SkillDbTab: React.FC = () => {
    const skillDbView = useView(selectSkillDbView);
    const db = skillDbView?.skills ?? [];
    const { send } = useCommands();

    const [dbTypeTab, setDbTypeTab] = useState<DbTypeTab>('ALL');
    const [dbRoleFilter, setDbRoleFilter] = useState<Role | 'ALL'>('ALL');
    const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

    const filteredSkills = useMemo(() => {
        return db.filter((s) => {
            if (dbTypeTab !== 'ALL' && s.tag !== dbTypeTab) return false;
            if (dbRoleFilter !== 'ALL' && s.role !== dbRoleFilter) return false;
            return true;
        });
    }, [db, dbTypeTab, dbRoleFilter]);

    const parentRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredSkills.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ROW_ESTIMATE_PX,
        getItemKey: (index) => filteredSkills[index]?.id ?? index,
    });

    const updateSkill = (field: SkillEditableField, value: string | number | boolean | undefined) => {
        if (!selectedSkillId) return;
        let v: string | number | boolean | Team | undefined = value;
        if (field === 'team') v = value === 'BLUE' ? Team.BLUE : value === 'RED' ? Team.RED : undefined;
        send({ type: 'UPDATE_SKILL', skillId: selectedSkillId, field, value: v });
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Header / Controls */}
            <div className="p-4 border-b border-line-subtle/10 shrink-0 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="ui-heading text-ui-title text-fg-primary">SKILL DATABASE</h2>
                    <span className="font-mono text-ui-num text-fg-muted bg-surface-slot px-2 py-0.5 rounded-ui-tag border border-line-subtle/10">
                        {filteredSkills.length} SKILLS
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                        ariaLabel="技能類型分類"
                        value={dbTypeTab}
                        onValueChange={(v) => setDbTypeTab(v as DbTypeTab)}
                        options={SKILL_DB_TYPE_OPTIONS}
                    />
                    <Select
                        ariaLabel="職業篩選"
                        value={dbRoleFilter}
                        onValueChange={(v) => setDbRoleFilter(v as Role | 'ALL')}
                        options={SKILL_DB_ROLE_OPTIONS}
                        size="sm"
                        className="w-40"
                    />
                </div>
            </div>

            {/* List Area with tanstack virtual */}
            <div
                ref={parentRef}
                className="ui-scroll flex-1 overflow-y-auto p-4 pb-24"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const skill = filteredSkills[virtualRow.index];
                        if (!skill) return null;
                        const isSelected = selectedSkillId === skill.id;

                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: '8px',
                                }}
                            >
                                <Card
                                    padding="none"
                                    className={cn(
                                        'overflow-hidden transition-colors',
                                        isSelected && 'border-line-accent',
                                    )}
                                >
                                    <div
                                        className="flex items-center gap-3 p-3 cursor-pointer select-none"
                                        onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                                    >
                                        <SkillIcon skill={skill} className="w-10 h-10 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className={cn('text-ui-body font-bold truncate', isSelected ? 'text-accent' : 'text-fg-primary')}>
                                                {skill.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Tag tone="neutral">
                                                    {ROLE_LABELS[skill.role] ?? skill.role}
                                                </Tag>
                                                <Tag tone={skill.tag === 'ULT' ? 'accent' : 'neutral'}>
                                                    {TAG_LABELS[skill.tag] ?? skill.tag}
                                                </Tag>
                                            </div>
                                        </div>
                                        <div className={cn('flex h-6 w-6 items-center justify-center text-fg-muted transition-transform', isSelected && 'rotate-90 text-accent')}>
                                            <Icons.DirectionRight className="h-4 w-4" />
                                        </div>
                                    </div>

                                    {/* Edit Form */}
                                    {isSelected && (
                                        <div className="p-4 border-t border-line-subtle/10 space-y-5 bg-surface-slot/30">
                                            {FORM_GROUPS.map((group) => (
                                                <div key={group.name} className="space-y-3">
                                                    <h4 className="ui-heading text-ui-label text-fg-muted pb-1 border-b border-line-subtle/10">
                                                        {group.name}
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {group.fields.map((field) => {
                                                            const val: unknown = readSkillField(skill, field.key);
                                                            let displayVal: string | number = typeof val === 'string' || typeof val === 'number' ? val : '';

                                                            if (field.key === 'team') {
                                                                if (val === undefined) displayVal = 'ANY';
                                                                else if (val === Team.BLUE) displayVal = 'BLUE';
                                                                else if (val === Team.RED) displayVal = 'RED';
                                                            } else if (field.key === 'ccSelf' || field.key === 'ccSelf2') {
                                                                displayVal = val ? 'true' : 'false';
                                                            } else if (val === undefined || val === null) {
                                                                displayVal = field.type === 'select' ? 'NONE' : '';
                                                            }

                                                            return (
                                                                <div
                                                                    key={field.key}
                                                                    className={cn(field.isWide ? 'col-span-2 space-y-1' : 'space-y-1')}
                                                                >
                                                                    <label className="text-ui-label text-fg-muted block">
                                                                        {field.label}
                                                                    </label>

                                                                    {field.type === 'textarea' ? (
                                                                        <Textarea
                                                                            aria-label={field.label}
                                                                            rows={2}
                                                                            value={String(displayVal)}
                                                                            onChange={(e) => updateSkill(field.key, e.target.value)}
                                                                            className="w-full"
                                                                        />
                                                                    ) : field.type === 'select' ? (
                                                                        <Select
                                                                            ariaLabel={field.label}
                                                                            value={String(displayVal)}
                                                                            onValueChange={(nextVal) => {
                                                                                if (field.key === 'ccSelf' || field.key === 'ccSelf2') {
                                                                                    updateSkill(field.key, nextVal === 'true');
                                                                                } else if (nextVal === 'NONE' || nextVal === 'ANY' || nextVal === '') {
                                                                                    updateSkill(field.key, undefined);
                                                                                } else {
                                                                                    updateSkill(field.key, nextVal);
                                                                                }
                                                                            }}
                                                                            options={field.options}
                                                                            size="sm"
                                                                            className="w-full"
                                                                        />
                                                                    ) : field.type === 'color' ? (
                                                                        <ColorInput
                                                                            ariaLabel={field.label}
                                                                            value={String(displayVal).startsWith('#') ? String(displayVal) : rgbChannelsToHex(UI_TOKENS.accent.DEFAULT)}
                                                                            onChange={(nextHex) => updateSkill(field.key, nextHex)}
                                                                            className="w-full"
                                                                        />
                                                                    ) : field.type === 'number' ? (
                                                                        <NumberInput
                                                                            ariaLabel={field.label}
                                                                            value={typeof val === 'number' ? val : 0}
                                                                            step={field.step ?? 1}
                                                                            onCommit={(nextNum) => updateSkill(field.key, nextNum)}
                                                                            className="w-full"
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            aria-label={field.label}
                                                                            value={String(displayVal)}
                                                                            onChange={(e) => updateSkill(field.key, e.target.value)}
                                                                            className="w-full"
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
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
