
import React from 'react';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    timeScale: number;
    setTimeScale: (v: number) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter, timeScale, setTimeScale }) => {
    return (
        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col justify-end">
            {/* 1. Dynamic Bottom Background */}
            <div className="absolute inset-x-0 bottom-0 h-[45vh] pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent backdrop-blur-[4px]"></div>
                <div className="absolute inset-0 opacity-30 mix-blend-screen">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-cyan-900/20 animate-gradient-flow"></div>
                </div>
            </div>

            {/* 2. Content */}
            <div className="relative z-10 w-full flex flex-col items-center pb-32">
                <div className="text-center pointer-events-auto animate-fade-in px-4">
                    <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-100 to-red-500 mb-4 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)] font-mono tracking-tighter">
                        TACTICAL<span className="text-slate-100">.</span>OS
                    </h1>
                    <div className="text-cyan-500 text-xs md:text-sm tracking-[0.5em] mb-10 uppercase font-bold text-shadow">戰場模擬引擎 v4.0</div>
                    <button 
                        onClick={onEnter}
                        className="group relative px-10 py-4 bg-slate-900/80 border border-cyan-500/50 text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] hover:border-cyan-400 hover:bg-slate-800 backdrop-blur-sm"
                    >
                        <span className="relative z-10 flex items-center gap-4">
                            <span>初始化指揮系統</span>
                            <span className="text-lg">➜</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* 3. Discrete Time Control for Showcase */}
            <div className="absolute bottom-8 right-8 z-50 pointer-events-auto flex items-center gap-4 glass-panel px-5 py-3 rounded-full group animate-fade-in border-slate-600/50">
                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">模擬速率</span>
                <input 
                    type="range" min="0.1" max="4.0" step="0.1" 
                    value={timeScale} onChange={(e) => setTimeScale(parseFloat(e.target.value))}
                    className="w-24 md:w-32 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[10px] w-8 text-right font-mono text-cyan-300 font-bold">{timeScale.toFixed(1)}x</span>
            </div>
        </div>
    );
};
