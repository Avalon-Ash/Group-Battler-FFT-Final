
import React, { useState } from 'react';

interface SystemMenuProps {
    onToggleLogs: () => void;
    onToggleDB: () => void;
    onDownloadSpec: () => void;
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ onToggleLogs, onToggleDB, onDownloadSpec }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-auto">
            
            {/* Trigger Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full liquid-glass flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-slate-400'}`}
                title="系統選單"
            >
                {isOpen ? '✕' : '≡'}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="flex flex-col gap-2 animate-slide-down origin-top-right">
                    <button 
                        onClick={() => { onToggleLogs(); setIsOpen(false); }}
                        className="liquid-glass px-5 py-3 rounded-2xl flex items-center gap-3 text-slate-300 hover:text-cyan-400 hover:bg-black/60 transition-all group min-w-[160px]"
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">📜</span>
                        <span className="text-xs font-bold tracking-widest">戰況紀錄</span>
                    </button>

                    <button 
                        onClick={() => { onToggleDB(); setIsOpen(false); }}
                        className="liquid-glass px-5 py-3 rounded-2xl flex items-center gap-3 text-slate-300 hover:text-amber-400 hover:bg-black/60 transition-all group min-w-[160px]"
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">📚</span>
                        <span className="text-xs font-bold tracking-widest">技能資料庫</span>
                    </button>

                    <button 
                        onClick={() => { onDownloadSpec(); setIsOpen(false); }}
                        className="liquid-glass px-5 py-3 rounded-2xl flex items-center gap-3 text-slate-300 hover:text-emerald-400 hover:bg-black/60 transition-all group min-w-[160px]"
                    >
                        <span className="text-lg group-hover:scale-110 transition-transform">💾</span>
                        <span className="text-xs font-bold tracking-widest">下載規格</span>
                    </button>
                </div>
            )}
        </div>
    );
};
