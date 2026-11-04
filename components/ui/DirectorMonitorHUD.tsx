import React from 'react';
import { useView } from '../../hooks/useEnginePort';
import { selectDirectorTargetView } from '../../engine/systems/ui/selectors';
import { MONITOR_TEXT, TEAM_CODE, TEAM_TONE } from '../../data/ui/labels/l3';
import { Helpers } from '../inspector/InspectorConstants';
import { Icons } from './icons';
import { Card, EmptyState, Meter, SectionHeading, SettingRow, Tag } from './primitives';

export const DirectorMonitorHUD: React.FC = () => {
    const target = useView(selectDirectorTargetView);

    if (!target) {
        return (
            <div className="ui-scroll h-full p-3 select-none">
                <Card padding="lg">
                    <EmptyState icon={<Icons.TV className="h-8 w-8" />} title={MONITOR_TEXT.emptyTitle} description={MONITOR_TEXT.emptyHint} />
                </Card>
            </div>
        );
    }

    const tone = TEAM_TONE[target.team];
    return (
        <div className="ui-scroll h-full p-3 select-none">
            <Card className="flex flex-col gap-3">
                <SectionHeading action={<Tag tone={tone}>{TEAM_CODE[tone]}</Tag>}>{MONITOR_TEXT.heading}</SectionHeading>
                <div className="truncate font-mono text-ui-title text-fg-primary">{target.id}</div>
                <Meter label={MONITOR_TEXT.hp} value={target.hp} max={target.maxHp} tone={tone} showValue />
                <Meter label={MONITOR_TEXT.mp} value={target.mp} max={target.maxMp} tone="accent" size="sm" showValue />
                <SectionHeading>{MONITOR_TEXT.engageHeading}</SectionHeading>
                <SettingRow label={MONITOR_TEXT.target}>
                    <span className="font-mono text-ui-num text-fg-primary">{target.targetId ?? MONITOR_TEXT.noTarget}</span>
                </SettingRow>
                <SettingRow label={MONITOR_TEXT.flow}>
                    <span className="font-mono text-ui-num text-text-warn">{Helpers.getAIStateLabel(target.aiState)}</span>
                    <span className="font-mono text-ui-num text-fg-muted">/</span>
                    <span className="font-mono text-ui-num text-text-accent">{Helpers.getActionStateLabel(target.actionState)}</span>
                </SettingRow>
            </Card>
        </div>
    );
};
