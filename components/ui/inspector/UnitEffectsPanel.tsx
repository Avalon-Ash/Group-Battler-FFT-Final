import { useEffect, useRef, useState, type FC } from 'react';
import { useViewOf } from '../../../hooks/useEnginePort';
import { selectionStore } from '../../../hooks/useSelection';
import { getStatusIconUrl } from '../../../hooks/adapters/statusIcon';
import { selectUnitStatusView } from '../../../engine/systems/ui/views/status';
import type { StatusRowView } from '../../../types/ui/status';
import { STATUS_UI as L } from '../../../data/ui/labels/status';
import { Button, Card, IconButton, SectionHeading, Tooltip } from '../primitives';
import { Icons } from '../icons';

export const UnitEffectsPanel: FC<{ agentId: string }> = ({ agentId }) => {
    const view = useViewOf(selectUnitStatusView, agentId);
    const [opened, setOpened] = useState<StatusRowView | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const heading = useRef<HTMLDivElement>(null);
    const buttons = useRef(new Map<string, HTMLButtonElement>());
    const rowIndex = useRef(0);
    const detail = opened ? view?.effects.find(row => row.id === opened.id) : null;
    const membership = view?.effects.map(row => row.id).join('|') ?? '';
    const previousMembership = useRef(membership);
    const ended = opened !== null && !detail;

    function restoreFocus() {
        const next = opened && buttons.current.get(opened.id)
            || (view?.effects[rowIndex.current] && buttons.current.get(view.effects[rowIndex.current].id));
        (next || heading.current)?.focus();
    }
    function close() { setOpened(null); restoreFocus(); }

    useEffect(() => {
        if (previousMembership.current === membership) return;
        previousMembership.current = membership;
        const timer = setTimeout(() => setAnnouncement('ACTIVE EFFECTS: ' + (membership ? membership.split('|').length : 0)), L.announcementDelayMs);
        return () => clearTimeout(timer);
    }, [membership]);

    useEffect(() => {
        if (!ended) return;
        const next = view?.effects[rowIndex.current];
        (next ? buttons.current.get(next.id) : heading.current)?.focus();
        const timer = setTimeout(() => setOpened(null), L.endedDelayMs);
        return () => clearTimeout(timer);
    }, [ended, view?.agentId]);

    if (!view) return null;
    const row = detail ?? opened;
    return (
        <section data-testid="unit-effects" className="flex min-w-0 flex-col gap-2"
            onKeyDown={event => { if (event.key === 'Escape' && opened) { event.stopPropagation(); close(); } }}>
            <SectionHeading ref={heading} tabIndex={-1} action={<span className="font-mono text-ui-body">{view.effects.length}</span>}>
                {L.heading}
            </SectionHeading>
            {view.noticeText && <p className="text-ui-label text-fg-secondary">{view.noticeText}</p>}
            <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
            {view.effects.length === 0 && <Card><SectionHeading>{L.empty}</SectionHeading><p className="text-ui-body text-fg-muted">{L.emptyHint}</p></Card>}
            {L.groups.map(group => {
                const rows = view.effects.filter(effect => effect.group === group);
                return rows.length > 0 && <div key={group} className="flex min-w-0 flex-col gap-1">
                    <SectionHeading>{group}</SectionHeading>
                    {rows.map(effect => <div key={effect.id}>
                        <Tooltip delayDuration={L.tooltipDelayMs} content={effect.label + '：' + effect.detailLines.join('；')}>
                            <Button size="auto" align="start" className="status-effect-row w-full min-w-0"
                                ref={node => { if (node) buttons.current.set(effect.id, node); else buttons.current.delete(effect.id); }}
                                aria-label={effect.label + ' / ' + effect.timeText + ' / ' + effect.sourceSummary}
                                aria-expanded={opened?.id === effect.id} aria-controls={opened?.id === effect.id ? 'effect-detail' : undefined}
                                data-effect-id={effect.id}
                                onClick={() => { rowIndex.current = view.effects.indexOf(effect); setOpened(opened?.id === effect.id ? null : effect); }}>
                                <img className="status-effect-icon shrink-0" src={getStatusIconUrl(effect.displayKey)} alt="" />
                                <span className="flex min-w-0 flex-col text-left">
                                    <span className="text-ui-body text-fg-primary">{effect.label}</span>
                                    <span className="truncate text-ui-label text-fg-muted">{effect.sourceSummary}</span>
                                </span>
                                <span className="status-effect-time font-mono text-right text-fg-primary">{effect.timeText}</span>
                            </Button>
                        </Tooltip>
                        <div className="status-effect-track bg-surface-subtle" aria-hidden="true">
                            <div className="h-full bg-accent" style={{ width: `${effect.progress * 100}%` }} />
                        </div>
                    </div>)}
                </div>;
            })}
            {row && <Card id="effect-detail" role="region" aria-label={row.label} className="flex min-w-0 flex-col gap-2 break-words">
                <SectionHeading action={<IconButton className="status-effect-action" label={L.back} onClick={close}><Icons.Close className="h-4 w-4" /></IconButton>}>DETAIL</SectionHeading>
                <p className="text-ui-body text-fg-primary">{row.label} / {ended ? L.ended : row.timeDetail}</p>
                {row.detailLines.map(line => <p key={line} className="text-ui-body text-fg-secondary">{line}</p>)}
                {[{ kind: 'duration', label: L.durationSource, origin: row.durationSource }, { kind: 'value', label: L.valueSource, origin: row.valueSource }]
                    .map(({ kind, label, origin }) => {
                        return <div key={kind} className="flex min-w-0 items-center gap-2">
                            <p className="min-w-0 flex-1 text-ui-body text-fg-secondary break-words">{label}：{origin.detail}</p>
                            <IconButton className="status-effect-action shrink-0" label={L.selectSource + '：' + origin.summary}
                                disabled={ended || !origin.canSelect} onClick={() => { if (origin.sourceId) selectionStore.inspect(origin.sourceId); }}>
                                <Icons.Select className="h-4 w-4" />
                            </IconButton>
                        </div>;
                    })}
            </Card>}
            {view.resistance.length > 0 && <Card><SectionHeading>{L.resistance}</SectionHeading>
                {view.resistance.map(line => <p key={line} className="text-ui-body text-fg-secondary">{line}</p>)}
            </Card>}
        </section>
    );
}
