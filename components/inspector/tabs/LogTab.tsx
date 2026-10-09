
import React, { useEffect, useState, memo, useRef } from 'react';
import { LogEntry, Team, LogActionType } from '../../../types';
import { Icons } from '../../ui/icons';

interface LogTabProps {
    engine: any;
}

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="relative pl-6 py-2 group pointer-events-none"> 
        {/* Pointer events none on item to ensure drag goes through to container */}
        {/* Timeline Line */}
        <div className="absolute left-[11px] top-0 bottom-0 w-px bg-white/5 group-hover:bg-cyan-500/30 transition-colors"></div>
        {/* Timeline Dot */}
        <div className={`absolute left-2 top-4 w-1.5 h-1.5 rounded-full ring-4 ring-slate-950 transition-all ${log.visualColor ? `bg-[${log.visualColor}]` : 'bg-slate-600'} group-hover:scale-125 group-hover:shadow-[0_0_8px_currentColor]`} style={{ backgroundColor: log.visualColor || '#475569' }}></div>

        <div className="liquid-card !bg-white/[0.02] hover:!bg-white/[0.06] !rounded-xl p-3 border border-white/5 group-hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5">
                        {log.time}s
                    </span>
                    <span className={`font-bold text-xs tracking-tight ${log.team === Team.BLUE ? 'text-blue-400' : (log.team === Team.RED ? 'text-red-400' : 'text-slate-300')}`}>
                        {log.agentId || 'SYSTEM'}
                    </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: log.visualColor }}>
                    {log.action}
                </span>
            </div>
            
            <div className="text-xs text-slate-400 leading-relaxed pl-1">
                {log.target && log.target !== '自身' && (
                    <span className="mr-1.5 bg-white/5 px-1 rounded text-slate-300">
                        ➜ {log.target}
                    </span>
                )}
                <span className="opacity-80 group-hover:opacity-100 transition-opacity">{log.detail}</span>
            </div>
        </div>
    </div>
));

type FilterCategory = 'ALL' | 'BATTLE' | 'SKILL' | 'OTHER';
type SourceCategory = 'ALL' | 'BLUE' | 'RED';

export const LogTab: React.FC<LogTabProps> = ({ engine }) => {
    const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
    
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
        lastTime: 0
    });

    const stopMomentum = () => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!scrollRef.current) return;
        // Allow clicking buttons in header, but catch drag in body
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

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
            dragState.current.velocity *= 0.95; // Friction
            if (Math.abs(dragState.current.velocity) > 0.5) {
                scrollRef.current.scrollTop -= dragState.current.velocity;
                rafRef.current = requestAnimationFrame(step);
            } else {
                dragState.current.velocity = 0;
            }
        };
        step();
    };

    useEffect(() => { return () => stopMomentum(); }, []);

    // --- DATA SYNC ---
    useEffect(() => {
        const interval = setInterval(() => {
            // Only update if count changed to avoid re-rendering entire list constantly
            if (engine.logs.length !== localLogs.length) {
                setLocalLogs(engine.logs.slice()); 
            }
        }, 200);
        return () => clearInterval(interval);
    }, [engine, localLogs.length]);

    // --- FILTERING ---
    const getFilteredLogs = () => {
        return localLogs.filter(log => {
            // 1. Source Filter
            if (filterSource === 'BLUE' && log.team !== Team.BLUE) return false;
            if (filterSource === 'RED' && log.team !== Team.RED) return false;

            // 2. Type Filter
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

    // Auto-scroll logic (Only if near bottom AND not dragging)
    useEffect(() => {
        if (dragState.current.isDown || !scrollRef.current) return;
        const div = scrollRef.current;
        // Tolerance of 100px
        if (div.scrollHeight - div.scrollTop - div.clientHeight < 200) {
            div.scrollTop = div.scrollHeight;
        }
    }, [localLogs.length]); // Trigger on count change, not filtered change

    const downloadLogs = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(engine.logs, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `battle_logs_${Date.now()}.json`);
        anchor.click();
    };

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            {/* Control Header */}
            <div className="p-4 border-b border-white/5 shrink-0 bg-slate-900/50 backdrop-blur-md space-y-3 z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute animate-ping opacity-75"></span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 relative block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">戰鬥事件串流</span>
                        <span className="text-[10px] font-mono text-cyan-500/80 bg-cyan-950/30 px-2 py-0.5 rounded-md border border-cyan-500/20">
                            {filteredLogs.length} / {localLogs.length}
                        </span>
                    </div>
                    <button 
                        onClick={downloadLogs} 
                        className="liquid-btn px-3 py-1.5 !text-[10px] !rounded-lg border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30"
                        title="匯出戰鬥日誌 JSON"
                    >
                        <Icons.Save className="w-3 h-3 mr-1.5" /> 匯出記錄
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 flex-1 min-w-[200px]">
                        {(['ALL', 'BATTLE', 'SKILL', 'OTHER'] as FilterCategory[]).map(t => (
                            <button 
                                key={t}
                                onClick={() => setFilterType(t)} 
                                className={`flex-1 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-wider ${filterType === t ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                {t === 'ALL' ? '全部' : t === 'BATTLE' ? '戰鬥' : t === 'SKILL' ? '技能' : '其他'}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 w-[140px]">
                        {(['ALL', 'BLUE', 'RED'] as SourceCategory[]).map(s => (
                            <button 
                                key={s}
                                onClick={() => setFilterSource(s)} 
                                className={`flex-1 py-1.5 text-[10px] rounded-md font-bold transition-all uppercase tracking-wider ${filterSource === s ? (s === 'BLUE' ? 'bg-blue-500/20 text-blue-400' : (s==='RED' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white')) : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {s === 'ALL' ? '全軍' : s === 'BLUE' ? '藍軍' : '紅軍'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Log Stream Area with Drag Scroll */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1 relative cursor-grab active:cursor-grabbing touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={() => stopMomentum()} // Stop momentum if user uses wheel
            >
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 opacity-30 gap-4 mt-10 pointer-events-none">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 animate-spin-slow"></div>
                        <span className="text-xs font-mono tracking-widest text-slate-500">暫無戰鬥記錄 (NO RECORDS)</span>
                    </div>
                ) : (
                    // Reverse map to show newest at bottom, but render order is preserved by array order
                    // We render from 0 to N.
                    filteredLogs.map(log => <LogItem key={log.id} log={log} />)
                )}
            </div>
        </div>
    );
};
