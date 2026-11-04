import React from 'react';
import { useCommands, useViewOf } from '../../../hooks/useEnginePort';
import { selectSkillLoadoutView } from '../../../engine/systems/ui/views/l3';
import { INSPECTOR_TEXT, SKILL_STAT_FIELDS, SKILL_TAG_TONE, SKILL_UNASSIGNED_LABEL } from '../../../data/ui/labels/l3';
import { Icons } from '../../ui/icons';
import { Card, EmptyState, SectionHeading, Select, Tag } from '../../ui/primitives';
import { SkillIcon } from '../parts/SkillIcon';

interface UnitStatusTabProps {
    agentId: string;
}

/** 技能配置分頁：資料來自 selectSkillLoadoutView，換技能槽經 UICommand（SET_AGENT_SKILL）寫入引擎。 */
export const UnitStatusTab: React.FC<UnitStatusTabProps> = ({ agentId }) => {
    const loadout = useViewOf(selectSkillLoadoutView, agentId);
    const { send } = useCommands();

    if (!loadout) {
        return <EmptyState icon={<Icons.Database className="h-8 w-8" />} title={INSPECTOR_TEXT.noSelectionTitle} />;
    }

    return (
        <div className="flex flex-col gap-3">
            <SectionHeading action={<Icons.Database className="h-4 w-4 text-fg-muted" />}>{INSPECTOR_TEXT.skillHeading}</SectionHeading>
            {loadout.slots.map((slot) => (
                <Card key={slot.slot} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <SkillIcon skill={slot.skill} className="h-10 w-10 shrink-0" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <Tag tone={SKILL_TAG_TONE[slot.tag]}>{slot.tag}</Tag>
                                {slot.skill && <span className="truncate font-mono text-ui-num text-fg-muted">{slot.skill.id}</span>}
                            </div>
                            <Select
                                ariaLabel={`${INSPECTOR_TEXT.skillSlot} ${slot.tag}`}
                                size="sm"
                                className="w-full"
                                value={slot.skillId ?? ''}
                                onValueChange={(skillId) => send({ type: 'SET_AGENT_SKILL', agentId: loadout.agentId, slot: slot.slot, skillId: skillId || null })}
                                options={[{ value: '', label: SKILL_UNASSIGNED_LABEL }]}
                                groups={slot.groups}
                            />
                        </div>
                    </div>
                    {slot.skill && (
                        <div className="flex flex-col gap-2">
                            {slot.skill.desc && <p className="text-ui-body text-fg-secondary">{slot.skill.desc}</p>}
                            <div className="grid grid-cols-4 gap-2">
                                {SKILL_STAT_FIELDS.map((field) => (
                                    <div key={field.key} className="well flex flex-col items-center px-1 py-1">
                                        <span className="text-ui-label text-fg-muted">{field.label}</span>
                                        <span className="font-mono text-ui-num text-fg-primary">{slot.skill?.[field.key]}{field.suffix}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            ))}
        </div>
    );
};
