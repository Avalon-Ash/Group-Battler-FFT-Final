
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
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 w-auto max-w-[95%] pointer-events-none ${hidden ? '-translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
            <div className="glass-panel px-3 py-2 rounded-xl md:rounded-full flex flex-wrap md:flex-nowrap items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-slate-600/50 backdrop-blur-lg pointer-events-auto">
                    
                    {/* Control Group */}
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onTogglePlay} 
                            disabled={winner !== null}
                            className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all shadow-lg ${isPlaying ? 'bg-amber-900/50 border-amber-500 text-amber-400' : 'bg-emerald-900/50 border-emerald-500 text-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]'}`}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                        
                        <button 
                            onClick={onRestart} 
                            disabled={!isPlaying && winner === null}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-600 text-slate-400 hover:text-white hover:border-white transition-colors"
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

                    {/* Mode Switch (Desktop Only) */}
                    <button 
                        onClick={onShowcase}
                        className="hidden lg:flex px-3 py-1.5 rounded bg-slate-800/50 hover:bg-purple-900/30 border border-transparent hover:border-purple-500/50 text-xs font-bold text-slate-400 hover:text-purple-300 transition-all items-center gap-2"
                    >
                        <span>📺</span>
                        <span>展示模式</span>
                    </button>
            </div>
        </div>
    );
};
