
import React, { useEffect, useState, memo, useRef } from 'react';
import { LogEntry, Team } from '../../../types';
import { Icons } from '../../ui/icons';

interface LogTabProps {
    engine: any;
}

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="relative pl-6 py-2 group">
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

export const LogTab: React.FC<LogTabProps> = ({ engine }) => {
    const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            if (engine.logs.length !== localLogs.length) {
                setLocalLogs(engine.logs.slice(-100)); // Keep last 100
            }
        }, 200);
        return () => clearInterval(interval);
    }, [engine, localLogs.length]);

    // Auto-scroll to bottom on new logs (if near bottom)
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localLogs]);

    const downloadLogs = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(engine.logs, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", `battle_logs_${Date.now()}.json`);
        anchor.click();
    };

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Control Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 absolute animate-ping opacity-75"></span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 relative block shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Data Stream</span>
                </div>
                <button 
                    onClick={downloadLogs} 
                    className="liquid-btn px-3 py-1.5 !text-[10px] !rounded-lg border-white/10 text-slate-400 hover:text-white hover:border-cyan-500/30"
                >
                    <Icons.Save className="w-3 h-3 mr-1.5" /> EXPORT
                </button>
            </div>

            {/* Log Stream */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-1 relative">
                {localLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 opacity-30 gap-4 mt-10">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-600 animate-spin-slow"></div>
                        <span className="text-xs font-mono tracking-widest text-slate-500">AWAITING INPUT...</span>
                    </div>
                ) : (
                    localLogs.map(log => <LogItem key={log.id} log={log} />)
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
};
