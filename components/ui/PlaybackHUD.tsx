import React, { useRef } from 'react';
import { Team } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { Icons } from './icons';
interface PlaybackHUDProps {
    hidden: boolean;
    isPlaying: boolean;
    winner: Team | null;
    timeScale: number;
    onTogglePlay: () => void;
    onRestart: () => void;
    onRandom: () => void;
    onSetTimeScale: (v: number) => void;
    onShowcase: () => void;
}
export const PlaybackHUD: React.FC<PlaybackHUDProps> = ({
    hidden, isPlaying, winner, timeScale, onTogglePlay, onRestart, onRandom, onSetTimeScale, onShowcase
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const { dragHandlers, style, isDragging } = useDraggable(ref, { anchor: 'bottom-center', margin: 30 });
    const glowClass = winner !== null 
        ? (winner === Team.BLUE ? 'shadow-[0_0_30px_rgba(59,130,246,0.4)] border-blue-500/30' : 'shadow-[0_0_30px_rgba(239,68,68,0.4)] border-red-500/30') 
        : (isPlaying ? 'shadow-[0_0_20px_rgba(16,185,129,0.2)] border-white/10' : 'border-white/10');
    return (
        <div 
            ref={ref}
            className={`z-40 transition-all duration-500 ${hidden ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}
            style={style}
            {...dragHandlers}
        >
            <div className={`liquid-card !rounded-full p-2 pr-5 flex items-center gap-4 select-none cursor-grab active:cursor-grabbing bg-slate-900/60 backdrop-blur-xl border ${glowClass} ${isDragging ? 'cursor-grabbing scale-105' : ''}`}>
                <div className="relative group">
                    <div className={`absolute inset-0 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
                        onPointerDown={(e) => e.stopPropagation()} 
                        disabled={winner !== null}
                        title={isPlaying ? "暫停戰鬥" : "開始戰鬥"}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 border shadow-lg
                            ${isPlaying 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 hover:scale-105' 
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30 hover:scale-105'}
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isPlaying ? <Icons.Pause className="w-6 h-6 fill-current" /> : <Icons.Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                </div>
                <div className="flex flex-col gap-1.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRestart(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="重新開始"
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 hover:border-white/20 flex items-center justify-center transition-all active:scale-95 group"
                    >
                        <Icons.Restart className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRandom(); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        title="隨機生成戰場與陣容"
                        className="w-8 h-8 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 flex items-center justify-center transition-all active:scale-95"
                    >
                        <Icons.Dice className="w-4 h-4" />
                    </button>
                </div>
                <div className="h-8 w-px bg-white/10 mx-1"></div>
                <div className="flex flex-col w-32 gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">模擬速度</span>
                        <span className={`text-xs font-mono font-bold ${timeScale > 1.0 ? 'text-cyan-400 text-glow-cyan' : 'text-slate-300'}`}>
                            {timeScale.toFixed(1)}x
                        </span>
                    </div>
                    <div className="relative h-6 w-full flex items-center group cursor-pointer">
                        <div className="absolute left-0 right-0 h-2 bg-black/40 rounded-full border border-white/10 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-900 to-cyan-500 transition-all duration-100 ease-out" style={{width: `${(timeScale/3)*100}%`}}></div>
                        </div>
                        <div className="absolute h-4 w-1.5 bg-white rounded-full shadow-[0_0_10px_cyan] pointer-events-none transition-all duration-100 ease-out z-10" style={{left: `calc(${(timeScale/3)*100}% - 3px)`}}></div>
                        <input 
                            type="range" min="0.1" max="3.0" step="0.1" 
                            value={timeScale} onChange={(e) => onSetTimeScale(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            onPointerDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <div className="h-8 w-px bg-white/10 mx-1"></div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onShowcase(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="進入展示模式 (Showcase)"
                    className="w-10 h-10 rounded-full hover:bg-cyan-950/30 text-slate-500 hover:text-cyan-400 transition-all flex items-center justify-center group"
                >
                    <Icons.TV className="w-5 h-5 group-hover:scale-110 transition-transform filter drop-shadow-md" />
                </button>
                <div className="w-1.5 h-8 flex flex-col justify-center gap-1 opacity-20 cursor-grab active:cursor-grabbing hover:opacity-50 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                </div>
            </div>
        </div>
    );
};