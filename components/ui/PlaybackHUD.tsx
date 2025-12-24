
import React, { useRef } from 'react';
import { Team } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';

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
    
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'top-center',
        margin: 30
    });

    return (
        <div 
            ref={ref}
            className={`z-40 transition-opacity duration-500 ${hidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={style}
            {...dragHandlers}
        >
            <div className={`liquid-glass rounded-full p-2 pr-4 flex items-center gap-4 select-none cursor-grab ${isDragging ? 'cursor-grabbing scale-105 shadow-cyan-500/20' : ''} backdrop-blur-2xl bg-black/40 transition-transform`}>
                
                {/* 1. Main Controls */}
                <div className="flex items-center gap-2 pl-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
                        disabled={winner !== null}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all shadow-lg ${isPlaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-white/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'}`}
                        title={isPlaying ? "暫停" : "開始"}
                        onPointerDown={e => e.stopPropagation()} // Prevent drag on button click
                    >
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    
                    <div className="flex flex-col gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRestart(); }}
                            className="w-8 h-4 rounded-full bg-white/5 hover:bg-white/20 text-[10px] text-slate-400 hover:text-white flex items-center justify-center border border-white/10"
                            title="重置回合"
                            onPointerDown={e => e.stopPropagation()}
                        >
                            ↺
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRandom(); }}
                            className="w-8 h-4 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-[10px] text-purple-300 hover:text-white flex items-center justify-center border border-purple-500/30"
                            title="隨機戰場"
                            onPointerDown={e => e.stopPropagation()}
                        >
                            🎲
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-white/10"></div>

                {/* 2. Time Control */}
                <div className="flex flex-col w-32 md:w-36">
                    <div className="flex justify-between items-center px-1 mb-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SPEED</span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{timeScale.toFixed(1)}x</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="3.0" step="0.1" 
                        value={timeScale} onChange={(e) => onSetTimeScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                        onPointerDown={e => e.stopPropagation()} // Important for sliders
                    />
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-white/10"></div>

                {/* 3. System */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onShowcase(); }}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="返回展示模式"
                    onPointerDown={e => e.stopPropagation()}
                >
                    <span className="text-xl">📺</span>
                </button>
                
                {/* Drag Grip Visual */}
                <div className="flex flex-col gap-0.5 opacity-30 px-1">
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                    <div className="w-1 h-1 rounded-full bg-white"></div>
                </div>
            </div>
        </div>
    );
};
