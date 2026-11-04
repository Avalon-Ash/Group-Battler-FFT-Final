import React, { useEffect, useState, memo, useRef } from 'react';
import { LogEntry, Team } from '../../../types';
import { Icons } from '../../ui/icons';
import { selectLogView } from '../../../engine/systems/ui/selectors';
import { useView } from '../../../hooks/useEnginePort';
import { INSPECTOR_PARAM } from '../../../constants';
import { Button, Card, EmptyState, Segmented } from '../../ui/primitives';
import { cn } from '../../ui/primitives/cn';
import { LOG_CATEGORY_OPTIONS, LOG_SOURCE_OPTIONS } from '../../../data/ui/labels/l4';

const EMPTY_LOGS: readonly LogEntry[] = [];

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <Card padding="sm" className="select-text space-y-1">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <span className="font-mono text-ui-num text-fg-muted bg-surface-slot px-1.5 py-0.5 rounded-ui-tag border border-line-subtle/10">
                    {log.time}s
                </span>
                <span
                    className={cn(
                        'font-bold text-ui-body tracking-tight',
                        log.team === Team.BLUE ? 'text-accent' : log.team === Team.RED ? 'text-danger' : 'text-fg-primary',
                    )}
                >
                    {log.agentId || 'SYSTEM'}
                </span>
            </div>
            <span
                className="text-ui-num font-mono font-bold uppercase tracking-wider text-fg-muted"
                style={log.visualColor ? { color: log.visualColor } : undefined}
            >
                {log.action}
            </span>
        </div>

        <div className="text-ui-body text-fg-secondary leading-relaxed pl-1">
            {log.target && log.target !== '自身' && (
                <span className="mr-1.5 px-1 rounded-ui-tag bg-surface-slot text-fg-primary text-ui-label inline-flex items-center gap-1">
                    <Icons.DirectionRight className="h-3 w-3" />
                    <span>{log.target}</span>
                </span>
            )}
            <span className="select-text">{log.detail}</span>
        </div>
    </Card>
));

type FilterCategory = 'ALL' | 'BATTLE' | 'SKILL' | 'OTHER';
type SourceCategory = 'ALL' | 'BLUE' | 'RED';

export const LogTab: React.FC = () => {
    const logView = useView(selectLogView);
    const logs = logView?.logs ?? EMPTY_LOGS;

    // Filters
    const [filterType, setFilterType] = useState<FilterCategory>('ALL');
    const [filterSource, setFilterSource] = useState<SourceCategory>('ALL');

    // --- DRAG SCROLL LOGIC (Kinetic) ---
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);
    const dragState = useRef({
        isDown: false,
        startY: 0,
        scrollTop: 0,
        lastY: 0,
        velocity: 0,
        lastTime: 0,
    });

    const stopMomentum = () => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!scrollRef.current) return;
        if ((e.target as HTMLElement).closest('button, [role="button"]')) return;

        e.stopPropagation();
        e.preventDefault();

        dragState.current.isDown = true;
        dragState.current.startY = e.pageY;
        dragState.current.scrollTop = scrollRef.current.scrollTop;
        dragState.current.lastY = e.pageY;
        dragState.current.velocity = 0;
        dragState.current.lastTime = performance.now();

        stopMomentum();
        (e.target as Element).setPointerCapture(e.pointerId);
        scrollRef.current.style.cursor = 'grabbing';
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState.current.isDown || !scrollRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const now = performance.now();
        const y = e.pageY;
        const delta = y - dragState.current.startY;
        scrollRef.current.scrollTop = dragState.current.scrollTop - delta;

        const timeDelta = now - dragState.current.lastTime;
        if (timeDelta > 0) {
            const dist = y - dragState.current.lastY;
            dragState.current.velocity = dist;
            dragState.current.lastY = y;
            dragState.current.lastTime = now;
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!dragState.current.isDown) return;
        dragState.current.isDown = false;
        (e.target as Element).releasePointerCapture(e.pointerId);
        if (scrollRef.current) {
            scrollRef.current.style.cursor = 'grab';
        }
        startMomentum();
    };

    const startMomentum = () => {
        stopMomentum();
        const step = () => {
            if (!scrollRef.current) return;
            dragState.current.velocity *= INSPECTOR_PARAM.SCROLL_FRICTION;
            if (Math.abs(dragState.current.velocity) > 0.5) {
                scrollRef.current.scrollTop -= dragState.current.velocity;
                rafRef.current = requestAnimationFrame(step);
            } else {
                dragState.current.velocity = 0;
            }
        };
        step();
    };

    useEffect(() => {
        return () => stopMomentum();
    }, []);

    // --- FILTERING ---
    const getFilteredLogs = () => {
        return logs.filter((log) => {
            if (filterSource === 'BLUE' && log.team !== Team.BLUE) return false;
            if (filterSource === 'RED' && log.team !== Team.RED) return false;

            if (filterType === 'ALL') return true;

            const type = log.actionType;
            if (filterType === 'BATTLE') {
                return type === 'HIT' || type === 'HEAL' || type === 'DEATH' || type === 'HAZARD';
            }
            if (filterType === 'SKILL') {
                return type === 'CAST' || type === 'CC';
            }
            if (filterType === 'OTHER') {
                return type === 'MOVE' || type === 'DECISION' || type === 'SYSTEM';
            }
            return true;
        });
    };

    const filteredLogs = getFilteredLogs();

    useEffect(() => {
        if (dragState.current.isDown || !scrollRef.current) return;
        const div = scrollRef.current;
        if (div.scrollHeight - div.scrollTop - div.clientHeight < INSPECTOR_PARAM.LOG_AUTO_SCROLL_PX) {
            div.scrollTop = div.scrollHeight;
        }
    }, [logs.length]);

    const downloadLogs = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute('href', dataStr);
        anchor.setAttribute('download', `battle_logs_${Date.now()}.json`);
        anchor.click();
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            <div className="p-4 border-b border-line-subtle/10 shrink-0 space-y-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-ui-pill bg-success block" />
                        <h2 className="ui-heading text-ui-title text-fg-primary">COMBAT LOGS</h2>
                        <span className="font-mono text-ui-num text-fg-muted bg-surface-slot px-2 py-0.5 rounded-ui-tag border border-line-subtle/10">
                            {filteredLogs.length} / {logs.length}
                        </span>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={downloadLogs}
                        title="匯出戰鬥日誌 JSON"
                    >
                        <Icons.Save className="h-4 w-4" />
                        <span>匯出記錄</span>
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Segmented
                        ariaLabel="事件類別篩選"
                        value={filterType}
                        onValueChange={(v) => setFilterType(v as FilterCategory)}
                        options={LOG_CATEGORY_OPTIONS}
                    />
                    <Segmented
                        ariaLabel="軍隊陣營篩選"
                        value={filterSource}
                        onValueChange={(v) => setFilterSource(v as SourceCategory)}
                        options={LOG_SOURCE_OPTIONS}
                    />
                </div>
            </div>

            <div
                ref={scrollRef}
                className="ui-scroll flex-1 overflow-y-auto px-4 py-4 space-y-2 relative select-text cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={() => stopMomentum()}
            >
                {filteredLogs.length === 0 ? (
                    <EmptyState
                        icon={<Icons.Log className="h-8 w-8" />}
                        title="暫無戰鬥記錄"
                        description="等待戰鬥事件產生。"
                    />
                ) : (
                    filteredLogs.map((log) => <LogItem key={log.id} log={log} />)
                )}
            </div>
        </div>
    );
};
