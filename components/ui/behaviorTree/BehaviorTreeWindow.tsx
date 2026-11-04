import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCommands, useViewOf } from '../../../hooks/useEnginePort';
import { usePrimarySelectedId } from '../../../hooks/useSelection';
import { selectAgentView } from '../../../engine/systems/ui/selectors';
import { selectBehaviorTreeView, type BTViewKind, type BTViewNode, type BTViewState } from '../../../engine/systems/ui/views/behaviorTree';
import { AI_MODE_LABEL, BT_NODE_LABEL } from '../../../data/ui/labels/behaviorTree';
import { Icons } from '../icons';
import { EmptyState, IconButton, SectionHeading, Tag } from '../primitives';
import { Team } from '../../../types';

const STATE_CLASS: Readonly<Record<BTViewState, string>> = {
    running: 'bt-row bt-running',
    success: 'bt-row bt-success',
    failure: 'bt-row bt-failure',
    idle: 'bt-row',
};

const AGE_CLASS = ['', 'bt-age-1', 'bt-age-2'] as const;

const KIND_ICON: Readonly<Record<BTViewKind, React.ReactNode>> = {
    selector: <Icons.BtSelector className="h-4 w-4" />,
    sequence: <Icons.BtSequence className="h-4 w-4" />,
    condition: <Icons.BtCondition className="h-4 w-4" />,
    action: <Icons.BtAction className="h-4 w-4" />,
    mode: <Icons.Tree className="h-4 w-4" />,
    other: <Icons.Tree className="h-4 w-4" />,
};

const KIND_TITLE: Readonly<Record<BTViewKind, string>> = {
    selector: '選擇：第一個成功的子節點',
    sequence: '序列：依序全部成功',
    condition: '條件',
    action: '動作',
    mode: '模式',
    other: '節點',
};

const TreeRow: React.FC<{
    node: BTViewNode;
    depth: number;
    collapsed: ReadonlySet<string>;
    expanded: ReadonlySet<string>;
    onToggle: (node: BTViewNode, isOpen: boolean) => void;
}> = ({ node, depth, collapsed, expanded, onToggle }) => {
    const hasChildren = node.children.length > 0;
    // 預設只展開執行中的路徑；使用者手動收合或展開的優先
    const isOpen = hasChildren && !collapsed.has(node.id) && (node.active || expanded.has(node.id));
    return (
        <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={node.state === 'running'}>
            <div
                className={`${STATE_CLASS[node.state]} ${AGE_CLASS[node.age]}`}
                style={{ paddingLeft: `calc(var(--bt-indent) * ${depth})` }}
                data-bt-active={node.state === 'running' || undefined}
            >
                {hasChildren ? (
                    <IconButton size="sm" variant="ghost" label={isOpen ? '收合' : '展開'} onClick={() => onToggle(node, isOpen)}>
                        {isOpen ? <Icons.ChevronDown className="h-4 w-4" /> : <Icons.ChevronRight className="h-4 w-4" />}
                    </IconButton>
                ) : (
                    <span className="bt-toggle" aria-hidden />
                )}
                <span className="bt-kind" title={KIND_TITLE[node.kind]}>{KIND_ICON[node.kind]}</span>
                <span className="min-w-0 truncate text-ui-body">{BT_NODE_LABEL[node.name] ?? node.name}</span>
            </div>
            {isOpen && (
                <ul role="group">
                    {node.children.map((child) => (
                        <TreeRow key={child.id} node={child} depth={depth + 1} collapsed={collapsed} expanded={expanded} onToggle={onToggle} />
                    ))}
                </ul>
            )}
        </li>
    );
};

/**
 * 行為樹檢視器：縮排列表，不用平移縮放，窄視窗也讀得清楚。
 * 只讀 selector 的快照，跟著選取的單位切換；之後的行為編輯器另做一個工具，共用 BTViewNode。
 */
export const BehaviorTreeWindow: React.FC = () => {
    const agentId = usePrimarySelectedId();
    const view = useViewOf(selectBehaviorTreeView, agentId);
    const agent = useViewOf(selectAgentView, agentId);
    const { rebuildAgentAI } = useCommands();

    const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
    const scrollRef = useRef<HTMLDivElement>(null);
    const [follow, setFollow] = useState(true);

    // 換單位時手動展開的狀態歸零：節點 id 是另一棵樹的
    useEffect(() => {
        setCollapsed(new Set());
        setExpanded(new Set());
    }, [agentId]);

    const missing = view?.missing ?? false;
    useEffect(() => {
        if (agentId && missing) rebuildAgentAI(agentId);
    }, [agentId, missing, rebuildAgentAI]);

    const onToggle = useCallback((node: BTViewNode, isOpen: boolean) => {
        const change = (set: ReadonlySet<string>, add: boolean) => {
            const next = new Set(set);
            if (add) next.add(node.id); else next.delete(node.id);
            return next;
        };
        setCollapsed((set) => change(set, isOpen));
        setExpanded((set) => change(set, !isOpen));
    }, []);

    useEffect(() => {
        if (!follow) return;
        const rows = scrollRef.current?.querySelectorAll('[data-bt-active]');
        rows?.[rows.length - 1]?.scrollIntoView({ block: 'nearest' });
    }, [follow, view]);

    if (!agentId || !view) {
        return <EmptyState icon={<Icons.Tree className="h-8 w-8" />} title="請先選取單位" description="在戰場上點選單位，這裡會跟著切換" />;
    }

    return (
        <div className="flex h-full min-h-0 flex-col" data-testid="behavior-tree-window">
            <div className="flex shrink-0 flex-col gap-2 border-b border-line-subtle/10 p-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="ui-heading truncate text-fg-primary" data-testid="behavior-tree-agent">{agentId}</span>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        label={follow ? '停止跟隨執行中的節點' : '跟隨執行中的節點'}
                        data-state={follow ? 'on' : 'off'}
                        data-testid="behavior-tree-follow"
                        className="ml-auto"
                        onClick={() => setFollow((v) => !v)}
                    >
                        <Icons.Crosshair className="h-4 w-4" />
                    </IconButton>
                    {agent && <Tag tone={agent.team === Team.BLUE ? 'blue' : 'red'}>{agent.team === Team.BLUE ? 'BLU' : 'RED'}</Tag>}
                </div>
                <div className="flex items-baseline gap-2">
                    <SectionHeading>MODE</SectionHeading>
                    <span className="text-ui-body text-fg-primary" data-testid="behavior-tree-mode">
                        {view.mode ? AI_MODE_LABEL[view.mode] : '尚未開戰'}
                    </span>
                </div>
                {view.trace.length > 0 && (
                    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-ui-label text-fg-muted" aria-label="最近的模式轉換">
                        {view.trace.map((entry, i) => (
                            <li key={i}>{entry.to ? AI_MODE_LABEL[entry.to] : ''}（{entry.why}）</li>
                        ))}
                    </ol>
                )}
            </div>
            <div
                ref={scrollRef}
                className="ui-scroll min-h-0 flex-1 p-2"
                onWheel={() => setFollow(false)}
                onTouchMove={() => setFollow(false)}
            >
                {view.root ? (
                    <ul role="tree" aria-label="行為樹">
                        <TreeRow node={view.root} depth={0} collapsed={collapsed} expanded={expanded} onToggle={onToggle} />
                    </ul>
                ) : (
                    <EmptyState icon={<Icons.Tree className="h-8 w-8" />} title="正在建立行為樹" />
                )}
            </div>
        </div>
    );
};
