
import React from 'react';
import { DesignExporter } from '../../engine/systems/DesignExporter';

interface SystemMenuProps {
    onToggleLogs: () => void;
    onToggleDB: () => void;
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ onToggleLogs, onToggleDB }) => {
    return (
        <div className="absolute top-4 right-4 z-40 flex flex-col gap-2 pointer-events-auto">
            <button 
                onClick={onToggleLogs}
                className="w-10 h-10 bg-slate-900/80 backdrop-blur border border-slate-700 rounded text-slate-400 hover:text-cyan-400 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center text-xl"
                title="戰況紀錄"
            >
                📜
            </button>
            <button 
                onClick={onToggleDB}
                className="w-10 h-10 bg-slate-900/80 backdrop-blur border border-slate-700 rounded text-slate-400 hover:text-amber-400 hover:border-amber-500 hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center text-xl"
                title="技能資料庫"
            >
                📚
            </button>
            <button 
                onClick={() => DesignExporter.downloadSpec()}
                className="w-10 h-10 bg-slate-900/80 backdrop-blur border border-slate-700 rounded text-slate-400 hover:text-green-400 hover:border-green-500 hover:shadow-[0_0_10px_rgba(74,222,128,0.3)] transition-all flex items-center justify-center text-xl"
                title="下載設計規格"
            >
                💾
            </button>
        </div>
    );
};
