import React, { useState } from 'react';
import { Icons } from './icons';
import { getRegisteredWindows } from './window/windowRegistry';
import { useWindowStore, useWindowActions } from '../../hooks/useWindowStore';

interface SystemMenuProps {
    onDownloadSpec: () => void;
    // Retained for backward-compatibility if passed from caller
    onToggleLogs?: () => void;
    onToggleDB?: () => void;
    onToggleVFXMap?: () => void;
    onToggleMonitor?: () => void;
    engine?: unknown;
    monitorEnabled?: boolean;
}

export const SystemMenu: React.FC<SystemMenuProps> = ({ onDownloadSpec }) => {
    const [isOpen, setIsOpen] = useState(false);

    const windowStates = useWindowStore();
    const windowActions = useWindowActions();
    const registeredWindows = getRegisteredWindows();

    return (
        <>
            {/* Backdrop to close dropdown on click outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[55] pointer-events-auto"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className="absolute top-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-auto">
                <button
                    data-testid="system-menu-button"
                    onClick={() => setIsOpen(!isOpen)}
                    title={isOpen ? '關閉選單' : '開啟系統選單'}
                    className={`w-12 h-12 rounded-full liquid-card flex items-center justify-center text-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
                        isOpen
                            ? 'bg-white/10 text-white border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    {isOpen ? <Icons.Close className="w-6 h-6" /> : <Icons.Menu className="w-6 h-6" />}
                </button>

                {isOpen && (
                    <div className="flex flex-col gap-2 animate-slide-down origin-top-right">
                        {/* Registered Windows in Registry */}
                        {registeredWindows.map((win) => {
                            const isWinOpen = windowStates[win.id]?.isOpen ?? false;
                            return (
                                <button
                                    key={win.id}
                                    data-testid={`menu-item-${win.id}`}
                                    onClick={() => {
                                        windowActions.toggle(win.id);
                                        setIsOpen(false);
                                    }}
                                    className="liquid-card px-5 py-3 !rounded-2xl flex items-center justify-between gap-4 text-slate-300 hover:text-cyan-400 hover:bg-black/60 hover:border-cyan-500/30 transition-all group min-w-[180px]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            {win.icon}
                                        </div>
                                        <span className="text-xs font-bold tracking-wider text-white group-hover:text-cyan-300">
                                            {win.title}
                                        </span>
                                    </div>
                                    <div
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            isWinOpen
                                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                                                : 'bg-slate-600'
                                        }`}
                                    />
                                </button>
                            );
                        })}

                        {/* Reset layout action */}
                        <button
                            data-testid="menu-item-reset-layout"
                            onClick={() => {
                                windowActions.resetLayout();
                                setIsOpen(false);
                            }}
                            className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-400 hover:text-amber-400 hover:bg-black/60 hover:border-amber-500/30 transition-all group min-w-[180px]"
                        >
                            <Icons.Restart className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-slate-300 group-hover:text-amber-300">
                                    重設版面 (RESET LAYOUT)
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase">清除視窗位置記憶</span>
                            </div>
                        </button>

                        {/* Non-window export action */}
                        <button
                            data-testid="menu-item-spec"
                            onClick={() => {
                                onDownloadSpec();
                                setIsOpen(false);
                            }}
                            className="liquid-card px-5 py-3 !rounded-2xl flex items-center gap-4 text-slate-300 hover:text-emerald-400 hover:bg-black/60 hover:border-emerald-500/30 transition-all group min-w-[180px]"
                        >
                            <Icons.Save className="w-5 h-5 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold tracking-widest text-white group-hover:text-emerald-300">
                                    匯出設計規格 (SPEC)
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase">下載 Markdown 規格書</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};