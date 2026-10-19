import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VFX_REGISTRY } from '../../../data/vfx/VFXRegistry';
import { STATUS_PARTS } from '../../../data/vfx/status_parts';
import { PART_GALLERY, type PartGalleryEntry } from '../../../data/vfx/parts/partGallery';
import { vfxPartStore, drawPart } from '../../../engine/renderers/vfxparts/VFXPartStore';

/**
 * 特效展示庫（2026-10-19 重寫）：內容全部讀現行資料，不再是手寫目錄。
 *  - 零件：PART_GALLERY 每種零件的實際烘焙縮圖（與遊戲內同一份 sprite）
 *  - 登記特效：VFX_REGISTRY 依前綴分組，列出每個特效的發射器數與用到的零件
 *  - 狀態：STATUS_PARTS 的鍵
 */
type Tab = 'PARTS' | 'REGISTRY' | 'STATUS';

const THUMB_PX = 72;

const PartThumb: React.FC<{ entry: PartGalleryEntry }> = ({ entry }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = THUMB_PX * dpr;
        canvas.height = THUMB_PX * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, THUMB_PX, THUMB_PX);
        const sprite = vfxPartStore.get(entry.spec);
        const pad = 6;
        const scale = Math.min((THUMB_PX - pad * 2) / sprite.width, (THUMB_PX - pad * 2) / sprite.height);
        // 把整張 sprite 置中（錨點不一定在中心：光柱、火焰在底部）
        const x = THUMB_PX / 2 - (sprite.width / 2 - sprite.anchorX) * scale;
        const y = THUMB_PX / 2 - (sprite.height / 2 - sprite.anchorY) * scale;
        drawPart(ctx, sprite, x, y, { scale, frame: 0 });
    }, [entry]);
    return <canvas ref={ref} style={{ width: THUMB_PX, height: THUMB_PX }} className="rounded-lg bg-black/50 border border-white/10 shrink-0" />;
};

/** 依特效 id 的前兩段分組（FX_HIT_…、FX_ULT_BLUE_…）；以分段比對，不寫字串前綴（字串常值會被參照完整性棘輪當成特效鍵） */
const seg = (id: string, i: number) => id.split('_')[i] ?? '';
const REGISTRY_GROUPS: ReadonlyArray<{ label: string; match: (id: string) => boolean }> = [
    { label: '命中', match: (id) => seg(id, 1) === 'HIT' },
    { label: '帝國奧義', match: (id) => seg(id, 1) === 'ULT' && seg(id, 2) === 'BLUE' },
    { label: '誓約奧義', match: (id) => seg(id, 1) === 'ULT' && seg(id, 2) === 'RED' },
    { label: '奧義共用', match: (id) => seg(id, 1) === 'ULT' },
    { label: '詠唱／中斷', match: (id) => seg(id, 1) === 'CAST' || (seg(id, 1) === 'AOE' && seg(id, 2) === 'BREAK') },
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
    const tabBtn = (id: Tab, label: string) => (
        <button
            key={id}
            onClick={() => setTab(id)}
            className={`touch-target flex-1 min-w-[80px] py-2 text-[11px] rounded-lg font-bold transition-all tracking-wider ${tab === id ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-transparent">
            <div className="p-5 border-b border-white/5 shrink-0 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">特效展示庫 (VFX Library)</div>
                        <div className="text-[10px] text-slate-600 font-mono mt-1">六角零件管線 · 讀取現行登記表</div>
                    </div>
                    <div className="text-[10px] font-mono text-purple-400/80 bg-purple-950/30 px-2 py-1 rounded-md border border-purple-500/20">
                        {PART_GALLERY.length} 種零件 · {total} 個特效
                    </div>
                </div>
                <div className="flex bg-black/40 p-1 gap-1 rounded-xl border border-white/5 flex-wrap">
                    {tabBtn('PARTS', '零件')}
                    {tabBtn('REGISTRY', '登記特效')}
                    {tabBtn('STATUS', '狀態')}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-24">
                {tab === 'PARTS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {PART_GALLERY.map((e) => (
                            <div key={e.kind} className="liquid-card p-3 !bg-white/[0.03] border border-white/5 flex gap-3 items-center">
                                <PartThumb entry={e} />
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-slate-200">{e.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono select-all">{e.kind}</div>
                                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{e.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'REGISTRY' && (
                    <div className="space-y-5">
                        {groups.map((g) => (
                            <div key={g.label}>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-1 mb-2 border-b border-white/5">{g.label}（{g.items.length}）</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {g.items.map((it) => (
                                        <div key={it.id} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                            <div className="text-[11px] font-mono text-slate-200 select-all truncate">{it.id}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[10px] text-slate-500">{it.emitters} 個發射器</span>
                                                {it.parts.map((p) => (
                                                    <span key={p} className="text-[10px] text-slate-300 bg-black/30 px-1.5 rounded border border-white/5">{p}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {tab === 'STATUS' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.keys(STATUS_PARTS).sort().map((k) => (
                            <div key={k} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] font-mono text-slate-200 select-all">{k}</div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
