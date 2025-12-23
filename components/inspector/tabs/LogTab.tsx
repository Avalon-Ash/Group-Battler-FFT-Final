
import React, { useEffect, useState, memo } from 'react';
import { LogEntry, Team } from '../../../types';

interface LogTabProps {
    engine: any;
}

const LogItem = memo(({ log }: { log: LogEntry }) => (
    <div className="mb-2 border-b border-slate-800 pb-2 last:border-0 hover:bg-slate-900/50 transition-colors text-xs sm:text-sm font-mono flex items-start">
        <span className="text-slate-500 w-14 shrink-0 opacity-70">[{log.time}s]</span>
        <div className="flex-1 min-w-0 break-words">
            <span className={`font-bold mr-2 ${log.team === Team.BLUE ? 'text-blue-400' : (log.team === Team.RED ? 'text-red-400' : 'text-slate-400')}`}>
                {log.agentId ? `${log.agentId}` : '系統'}
            </span>
            <span className="text-slate-300 mr-2 font-semibold">{log.action}</span>
            {log.target !== '自身' && log.target && (
                <><span className="text-slate-600 mx-1">➜</span><span className="text-amber-300 mr-2">{log.target}</span></>
            )}
            <span className="text-slate-400 block sm:inline opacity-90">{log.detail}</span>
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
        <div className="flex flex-col h-full bg-slate-900">
            <div className="p-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">即時戰況 (最近100筆)</span>
                <button onClick={downloadLogs} className="tactical-btn text-xs">
                    匯出 JSON
                </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-24 font-mono">
                {localLogs.slice().reverse().map(log => (
                    <LogItem key={log.id} log={log} />
                ))}
                {localLogs.length === 0 && <div className="text-slate-600 text-center mt-20 italic">尚無戰鬥紀錄</div>}
            </div>
        </div>
    );
};
