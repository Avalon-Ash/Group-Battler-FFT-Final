
import React, { useEffect, useState, memo } from 'react';
import { LogEntry, Team } from '../../../types';

interface LogTabProps {
    engine: any;
}

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="group flex items-start gap-4 py-3 px-4 border-b border-white/5 hover:bg-white/5 transition-all duration-200 text-xs font-mono relative overflow-hidden">
        {/* Hover Highlight Bar */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500/0 group-hover:bg-cyan-500/50 transition-colors"></div>
        
        <span className="text-slate-600 shrink-0 w-12 text-right group-hover:text-cyan-500/70 transition-colors pt-0.5">
            {log.time}s
        </span>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
                <span className={`font-bold tracking-tight text-sm ${log.team === Team.BLUE ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]' : (log.team === Team.RED ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]' : 'text-slate-400')}`}>
                    {log.agentId || 'SYSTEM'}
                </span>
                <span className="liquid-tag bg-white/5 border-white/10 text-slate-300">
                    {log.action}
                </span>
                {log.target && log.target !== '自身' && (
                    <>
                        <span className="text-slate-600">➜</span>
                        <span className="text-amber-200 opacity-90 font-bold tracking-tight">{log.target}</span>
                    </>
                )}
            </div>
            <p className="text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed opacity-80 pl-1">
                {log.detail}
            </p>
        </div>
    </div>
));

export const LogTab: React.FC<LogTabProps> = ({ engine }) => {
    const [localLogs, setLocalLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (engine.logs.length !== localLogs.length) setLocalLogs(engine.logs.slice(-100));
        }, 200);
        return () => clearInterval(interval);
    }, [engine, localLogs.length]);

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
            <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse box-shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest text-glow-cyan">REAL-TIME DATA STREAM</span>
                </div>
                <button 
                    onClick={downloadLogs} 
                    className="liquid-btn px-4 py-1.5 !text-[10px] rounded-lg border-white/20 text-slate-300 hover:text-white"
                >
                    EXPORT JSON
                </button>
            </div>

            {/* Log Stream */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 scroll-smooth">
                {localLogs.slice().reverse().map(log => (
                    <LogItem key={log.id} log={log} />
                ))}
                {localLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 opacity-30 gap-3 mt-10">
                        <span className="text-4xl filter grayscale opacity-50">📡</span>
                        <span className="text-xs font-mono tracking-widest">AWAITING SIGNAL...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
