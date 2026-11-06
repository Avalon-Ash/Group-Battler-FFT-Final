import React, { useState } from 'react';
import { UnitEffectsPanel } from './UnitEffectsPanel';
import { Role } from '../../../types';
import { useCommands, useViewOf } from '../../../hooks/useEnginePort';
import { usePrimarySelectedId } from '../../../hooks/useSelection';
import { useWindowActions } from '../../../hooks/useWindowStore';
import { selectUnitStatusView } from '../../../engine/systems/ui/views/status';
import { selectInspectorView } from '../../../engine/systems/ui/views/l3';
import type { TeamTone } from '../../../types/ui/l3';
import {
    BODY_TYPE_OPTIONS,
    INSPECTOR_STATUS_TAG,
    INSPECTOR_TABS,
    INSPECTOR_TEXT,
    ROLE_LABEL,
    ROLE_OPTIONS,
    TEAM_CODE,
} from '../../../data/ui/labels/l3';
import { Icons } from '../icons';
import { Helpers } from '../../inspector/InspectorConstants';
import { UnitStatusTab } from '../../inspector/tabs/UnitStatusTab';
import { Card, EmptyState, IconButton, Meter, NumberInput, SectionHeading, Select, Tabs, TabsContent, Tag } from '../primitives';

const ROLE_ICON: Readonly<Record<Role, React.ReactNode>> = {
    [Role.TANK]: <Icons.RoleTank className="h-5 w-5" />,
    [Role.WARRIOR]: <Icons.RoleWarrior className="h-5 w-5" />,
    [Role.RANGER]: <Icons.RoleRanger className="h-5 w-5" />,
    [Role.MAGE]: <Icons.RoleMage className="h-5 w-5" />,
    [Role.SUPPORT]: <Icons.RoleSupport className="h-5 w-5" />,
};

const TEAM_TEXT: Readonly<Record<TeamTone, string>> = {
    blue: 'text-team-blue-primary',
    red: 'text-team-red-primary',
};

const MIN_MAX_HP = 1;
const MIN_MAX_MP = 0;

export const UnitInspectorBody: React.FC = () => {
    const agentId = usePrimarySelectedId();
    const view = useViewOf(selectInspectorView, agentId);
    const status = useViewOf(selectUnitStatusView, agentId);
    const { editAgent, send } = useCommands();
    const windowActions = useWindowActions();

    const [tab, setTab] = useState(INSPECTOR_TABS[0].value);
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);

    if (!agentId || !view) {
        return (
            <EmptyState
                className="h-full justify-center select-none"
                icon={<Icons.Select className="h-8 w-8" />}
                title={INSPECTOR_TEXT.noSelectionTitle}
                description={INSPECTOR_TEXT.noSelectionHint}
            />
        );
    }
    if (view.isDead) {
        return (
            <EmptyState
                className="h-full justify-center select-none"
                icon={<Icons.Select className="h-8 w-8" />}
                title={INSPECTOR_TEXT.deadTitle}
                description={INSPECTOR_TEXT.deadHint}
            />
        );
    }

    const setRole = (value: string) => {
        const next = ROLE_OPTIONS.find((o) => o.value === value);
        if (next) editAgent(view.id, { role: next.value });
    };
    const setBodyType = (value: string) => {
        const next = BODY_TYPE_OPTIONS.find((o) => o.value === value);
        if (next) send({ type: 'EDIT_AGENT', agentId: view.id, bodyType: next.value });
    };

    return (
        <div className="inspector-status flex h-full w-full min-h-0 flex-col select-none">
            {/* 標頭 (Header) */}
            <div className="inspector-header flex shrink-0 items-center gap-3 border-b border-line-subtle/10 p-3">
                <div className={`well flex h-10 w-10 shrink-0 items-center justify-center ${TEAM_TEXT[view.teamTone]}`}>
                    {ROLE_ICON[view.role]}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <span className={`truncate font-mono text-ui-title ${TEAM_TEXT[view.teamTone]}`}>{view.id}</span>
                        {status?.relationLabel && <Tag data-testid="inspector-relation" tone="neutral">{status.relationLabel}</Tag>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="ui-heading truncate text-fg-secondary">{ROLE_LABEL[view.role]}</span>
                        <Tag tone={view.teamTone}>{TEAM_CODE[view.teamTone]}</Tag>
                    </div>
                </div>
                <IconButton
                    size="sm"
                    variant="ghost"
                    label={INSPECTOR_TEXT.editToggle}
                    aria-pressed={isConfigExpanded}
                    data-state={isConfigExpanded ? 'on' : 'off'}
                    onClick={() => setIsConfigExpanded((v) => !v)}
                >
                    <Icons.Settings className="h-4 w-4" />
                </IconButton>
                <IconButton size="sm" label={INSPECTOR_TEXT.openBehaviorTree} data-testid="inspector-open-bt" onClick={() => windowActions.open('behaviorTree')}>
                    <Icons.Tree className="h-4 w-4" />
                </IconButton>
            </div>

            {/* 視窗內容區（標頭以下）要能捲動：ui-scroll min-h-0 flex-1 pb-4 */}
            <div className="inspector-content min-h-0 flex-1 p-3 pb-4 flex flex-col gap-3">
                {isConfigExpanded && (
                    <Card className="grid grid-cols-2 gap-2">
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.role}</span>
                            <Select
                                data-testid="inspector-role"
                                ariaLabel={INSPECTOR_TEXT.role}
                                size="sm"
                                className="w-full"
                                value={view.role}
                                onValueChange={setRole}
                                options={ROLE_OPTIONS}
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.bodyType}</span>
                            <Select
                                data-testid="inspector-bodytype"
                                ariaLabel={INSPECTOR_TEXT.bodyType}
                                size="sm"
                                className="w-full"
                                value={view.bodyType}
                                onValueChange={setBodyType}
                                options={BODY_TYPE_OPTIONS}
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.maxHp}</span>
                            <NumberInput
                                data-testid="inspector-hp"
                                ariaLabel={INSPECTOR_TEXT.maxHp}
                                className="w-full"
                                value={view.maxHp}
                                min={MIN_MAX_HP}
                                onCommit={(v) => editAgent(view.id, { maxHp: v, hp: v })}
                            />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                            <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.maxMp}</span>
                            <NumberInput
                                data-testid="inspector-mp"
                                ariaLabel={INSPECTOR_TEXT.maxMp}
                                className="w-full"
                                value={view.maxMp}
                                min={MIN_MAX_MP}
                                onCommit={(v) => editAgent(view.id, { maxMp: v })}
                            />
                        </div>
                    </Card>
                )}

                <div className="inspector-resources flex shrink-0 flex-col gap-2">
                    <Meter label={INSPECTOR_TEXT.hp} value={view.hp} max={view.maxHp} tone={view.teamTone} showValue />
                    {view.maxMp > 0 && <Meter label={INSPECTOR_TEXT.mp} value={view.mp} max={view.maxMp} tone="accent" size="sm" showValue />}
                </div>

                <Tabs value={tab} onValueChange={setTab} tabs={INSPECTOR_TABS} className="inspector-tabs flex flex-1 flex-col min-h-0 pt-2">
                    <TabsContent value="STATUS" className="ui-scroll min-h-0 flex-1 pt-2">
                        <div className="flex min-w-0 flex-col gap-3">
                            <UnitEffectsPanel key={view.id} agentId={view.id} />
                            <Card className="flex flex-col gap-2">
                                <SectionHeading
                                    action={view.statusTags.map((kind) => (
                                        <Tag key={kind} tone={INSPECTOR_STATUS_TAG[kind].tone}>{INSPECTOR_STATUS_TAG[kind].label}</Tag>
                                    ))}
                                >
                                    {INSPECTOR_TEXT.aiHeading}
                                </SectionHeading>
                                <div className="flex items-center gap-2 font-mono text-ui-body">
                                    <span className="text-text-warn">{Helpers.getAIStateLabel(view.aiState)}</span>
                                    <span className="text-fg-muted">/</span>
                                    <span className="text-text-accent">{Helpers.getActionStateLabel(view.actionState)}</span>
                                </div>
                            </Card>
                            <div className="grid grid-cols-2 gap-2">
                                <Card padding="sm" className="flex flex-col gap-1">
                                    <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.coordinate}</span>
                                    <span className="font-mono text-ui-body text-fg-primary">({view.q}, {view.r})</span>
                                </Card>
                                <Card padding="sm" className="flex flex-col gap-1">
                                    <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.shield}</span>
                                    <span className="font-mono text-ui-body text-fg-primary">{view.shield}</span>
                                </Card>
                                <Card padding="sm" className="flex flex-col gap-1">
                                    <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.hp}</span>
                                    <span className="font-mono text-ui-body text-fg-primary">{view.hp} / {view.maxHp}</span>
                                </Card>
                                <Card padding="sm" className="flex flex-col gap-1">
                                    <span className="text-ui-label text-fg-muted">{INSPECTOR_TEXT.mp}</span>
                                    <span className="font-mono text-ui-body text-fg-primary">{view.mp} / {view.maxMp}</span>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="SKILLS" className="ui-scroll min-h-0 flex-1 pt-2">
                        <UnitStatusTab agentId={view.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
