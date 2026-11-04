import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VFX_REGISTRY } from '../../../data/vfx/VFXRegistry';
import { STATUS_PARTS } from '../../../data/vfx/status_parts';
import { PART_GALLERY, type PartGalleryEntry } from '../../../data/vfx/parts/partGallery';
import { drawPartThumbnail, THUMB_PX } from '../../../hooks/adapters/vfxPreview';
import { Card, Segmented, Tag } from '../../ui/primitives';
import { VFX_TAB_OPTIONS } from '../../../data/ui/labels/l4';

type Tab = 'PARTS' | 'REGISTRY' | 'STATUS';

const PartThumb: React.FC<{ entry: PartGalleryEntry }> = ({ entry }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        drawPartThumbnail(canvas, entry);
    }, [entry]);
    return (
        <canvas
            ref={ref}
            style={{ width: THUMB_PX, height: THUMB_PX }}
            className="well shrink-0 rounded-ui-control"
        />
    );
};

const seg = (id: string, i: number) => id.split('_')[i] ?? '';
const REGISTRY_GROUPS: ReadonlyArray<{ label: string; match: (id: string) => boolean }> = [
    { label: '命中', match: (id) => seg(id, 1) === 'HIT' },
    { label: '帝國奧義', match: (id) => seg(id, 1) === 'ULT' && seg(id, 2) === 'BLUE' },
    { label: '誓約奧義', match: (id) => seg(id, 1) === 'ULT' && seg(id, 2) === 'RED' },
    { label: '奧義共用', match: (id) => seg(id, 1) === 'ULT' },
    { label: '詠唱與中斷', match: (id) => seg(id, 1) === 'CAST' || (seg(id, 1) === 'AOE' && seg(id, 2) === 'BREAK') },
    { label: '危害', match: (id) => seg(id, 1) === 'HAZARD' },
    { label: '其他', match: () => true },
];

export const VFXMapTab: React.FC = () => {
    const [tab, setTab] = useState<Tab>('PARTS');

    const groups = useMemo(() => {
        const out = REGISTRY_GROUPS.map((g) => ({ label: g.label, items: [] as { id: string; emitters: number; parts: string[] }[] }));
        for (const id of Object.keys(VFX_REGISTRY).sort()) {
            const asset = VFX_REGISTRY[id];
            const parts = [...new Set(asset.emitters.map((e) => e.part?.kind).filter((k): k is NonNullable<typeof k> => !!k))];
            const gi = REGISTRY_GROUPS.findIndex((g) => g.match(id));
            out[gi].items.push({ id, emitters: asset.emitters.length, parts });
        }
        return out.filter((g) => g.items.length > 0);
    }, []);

    const total = Object.keys(VFX_REGISTRY).length;

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="p-4 border-b border-line-subtle/10 shrink-0 space-y-3">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <h2 className="ui-heading text-ui-title text-fg-primary">VFX LIBRARY</h2>
                        <span className="text-ui-num text-fg-muted font-mono mt-0.5">六角零件管線 · 讀取現行登記表</span>
                    </div>
                    <div className="font-mono text-ui-num text-fg-muted bg-surface-slot px-2 py-1 rounded-ui-tag border border-line-subtle/10">
                        {PART_GALLERY.length} 種零件 · {total} 個特效
                    </div>
                </div>
                <Segmented
                    ariaLabel="特效庫分頁"
                    value={tab}
                    onValueChange={(v) => setTab(v as Tab)}
                    options={VFX_TAB_OPTIONS}
                />
            </div>

            <div className="ui-scroll flex-1 overflow-y-auto p-4 pb-24">
                {tab === 'PARTS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {PART_GALLERY.map((e) => (
                            <Card key={e.kind} className="flex gap-3 items-center">
                                <PartThumb entry={e} />
                                <div className="min-w-0">
                                    <div className="font-bold text-ui-body text-fg-primary">{e.name}</div>
                                    <div className="font-mono text-ui-num text-fg-muted select-all">{e.kind}</div>
                                    <p className="text-ui-body text-fg-secondary mt-1 leading-relaxed">{e.desc}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
                {tab === 'REGISTRY' && (
                    <div className="space-y-5">
                        {groups.map((g) => (
                            <div key={g.label}>
                                <h4 className="ui-heading text-ui-label text-fg-muted pb-1 mb-2 border-b border-line-subtle/10">
                                    {g.label}（{g.items.length}）
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {g.items.map((it) => (
                                        <Card key={it.id} padding="sm" className="space-y-1">
                                            <div className="font-mono text-ui-body text-fg-primary select-all truncate">{it.id}</div>
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="text-ui-num text-fg-muted">{it.emitters} 個發射器</span>
                                                {it.parts.map((p) => (
                                                    <Tag key={p} tone="neutral">{p}</Tag>
                                                ))}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'STATUS' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.keys(STATUS_PARTS).sort().map((k) => (
                            <Card key={k} padding="sm" className="font-mono text-ui-body text-fg-primary select-all">
                                {k}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
