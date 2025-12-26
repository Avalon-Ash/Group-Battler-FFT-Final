
import React, { useState } from 'react';
import { Icons } from './icons';

interface SystemMenuProps {
    onToggleLogs: () => void;
    onToggleDB: () => void;
    onToggleVFXMap?: () => void;
    onDownloadSpec: () => void;
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ onToggleLogs, onToggleDB, onToggleVFXMap, onDownloadSpec }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-auto">
            
            {/* Trigger Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-full liquid-card flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-white/10 text-white border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-white'}`}
                title="系統選單"
            >
                {isOpen ? <Icons.Close className="w-6 h-6" /> : <Icons.Menu className="w-6 h-6" />}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="flex flex-col gap-2 animate-slide-down origin-top-right">
                    <button 
                        onClick={() => { onToggleLogs(); setIsOpen(false); }}
                        className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-cyan-400 hover:bg-black/60 hover:border-cyan-500/30 transition-all group min-w-[180px]"
                    >
                        <Icons.Log className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold tracking-widest text-white group-hover:text-cyan-300">BATTLE LOGS</span>
                            <span className="text-[11px] text-slate-500 uppercase">View History</span>
                        </div>
                    </button>

                    <button 
                        onClick={() => { onToggleDB(); setIsOpen(false); }}
                        className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-amber-400 hover:bg-black/60 hover:border-amber-500/30 transition-all group min-w-[180px]"
                    >
                        <Icons.Database className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold tracking-widest text-white group-hover:text-amber-300">DATABASE</span>
                            <span className="text-[11px] text-slate-500 uppercase">Skill Reference</span>
                        </div>
                    </button>

                    {onToggleVFXMap && (
                        <button 
                            onClick={() => { onToggleVFXMap(); setIsOpen(false); }}
                            className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-purple-400 hover:bg-black/60 hover:border-purple-500/30 transition-all group min-w-[180px]"
                        >
                            <Icons.VFX className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold tracking-widest text-white group-hover:text-purple-300">VFX MAP</span>
                                <span className="text-[11px] text-slate-500 uppercase">Visual Reference</span>
                            </div>
                        </button>
                    )}

                    <button 
                        onClick={() => { onDownloadSpec(); setIsOpen(false); }}
                        className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-emerald-400 hover:bg-black/60 hover:border-emerald-500/30 transition-all group min-w-[180px]"
                    >
                        <Icons.Save className="w-6 h-6 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                        <div className="flex flex-col items-start">
                            <span className="text-sm font-bold tracking-widest text-white group-hover:text-emerald-300">EXPORT SPEC</span>
                            <span className="text-[11px] text-slate-500 uppercase">Download .txt</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};
