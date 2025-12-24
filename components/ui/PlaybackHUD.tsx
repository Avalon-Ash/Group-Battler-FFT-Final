
import React from 'react';
import { Team } from '../../types';

interface PlaybackHUDProps {
    hidden: boolean;
    isPlaying: boolean;
    winner: Team | null;
    timeScale: number;
    onTogglePlay: () => void;
    onRestart: () => void;
    onSetTimeScale: (v: number) => void;
    onShowcase: () => void;
}

export const PlaybackHUD: React.FC<PlaybackHUDProps> = ({
    hidden, isPlaying, winner, timeScale, onTogglePlay, onRestart, onSetTimeScale, onShowcase
}) => {
    return (
        // Added right constraint (right-16) on mobile to avoid System Menu overlap
        <div className={`absolute top-2 md:top-4 left-4 right-16 md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 transition-all duration-500 w-auto pointer-events-none flex justify-center md:justify-center justify-start ${hidden ? '-translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <div className="glass-panel px-3 py-1.5 md:py-2 rounded-full flex items-center gap-2 md:gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-slate-600/50 backdrop-blur-lg pointer-events-auto overflow-hidden max-w-full">
                    
                    {/* Control Group */}
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <button 
                            onClick={onTogglePlay} 
                            disabled={winner !== null}
                            className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border transition-all shadow-lg text-sm md:text-base ${isPlaying ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-emerald-900/50 border-emerald-500 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        
                        <button 
                            onClick={onRestart} 
                            disabled={!isPlaying && winner === null}
                            className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-white transition-colors text-xs md:text-sm"
                            title="重置回合"
                        >
                            ↺
                        </button>
                    </div>

                    <div className="hidden xl:block w-px h-8 bg-slate-700"></div>

                    {/* Speed Control - Hidden on small screens */}
                    <div className="hidden xl:flex flex-1 flex-col items-center min-w-[120px]">
                        <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">模擬速度</span>
                            <div className="text-[10px] font-mono text-cyan-400">{timeScale.toFixed(1)}x</div>
                        </div>
                        <input 
                            type="range" min="0.1" max="3.0" step="0.1" 
                            value={timeScale} onChange={(e) => onSetTimeScale(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>

                    {/* Mode Switch - Responsive */}
                    <div className="w-px h-4 md:h-6 bg-slate-700 mx-1 md:mx-0"></div>
                    
                    <button 
                        onClick={onShowcase}
                        className="flex items-center justify-center w-7 h-7 md:w-auto md:h-auto md:px-3 md:py-1.5 rounded-full md:rounded bg-slate-800/50 hover:bg-purple-900/30 border border-slate-700 md:border-transparent hover:border-purple-500/50 text-slate-400 hover:text-purple-300 transition-all gap-2"
                        title="返回展示模式"
                    >
                        <span className="text-xs md:text-sm">📺</span>
                        <span className="hidden md:inline text-xs font-bold">展示模式</span>
                    </button>
            </div>
        </div>
    );
};
