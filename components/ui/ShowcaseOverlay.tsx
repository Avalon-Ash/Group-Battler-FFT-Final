
import React, { useRef, useState, useEffect } from 'react';
import { MatrixConfig, LayoutPreset } from './showcase/types';
import { DEFAULT_MATRIX_CONFIG } from './showcase/defaults';
import { useMatrixRain } from './showcase/useMatrixRain';
import { ShowcaseSettings } from './showcase/ShowcaseSettings';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    timeScale: number;
    setTimeScale: (v: number) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter, timeScale, setTimeScale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [config, setConfig] = useState<MatrixConfig>(DEFAULT_MATRIX_CONFIG);
    const [layout, setLayout] = useState<LayoutPreset>('BOTTOM_CENTER');
    const [showSettings, setShowSettings] = useState(false);
    
    // Track window size for canvas init
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hook: Handles the Matrix Rain rendering on the transparent canvas
    useMatrixRain(canvasRef, config, viewport.w, viewport.h);

    // Helper: Determine UI Layout classes
    const getLayoutClasses = () => {
        switch (layout) {
            case 'CENTER': 
                return 'inset-0 flex-col justify-center items-center text-center p-4 md:p-8';
            case 'BOTTOM_CENTER': 
                // Fix: Constrain max-width to viewport width minus margins (90vw) to prevent edge overflow
                return 'bottom-8 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl flex-col md:flex-row justify-between items-center';
            case 'BOTTOM_LEFT': 
                return 'bottom-8 left-4 md:left-12 w-[300px] md:w-[400px] flex-col justify-end items-start';
            case 'BOTTOM_RIGHT': 
                return 'bottom-8 right-4 md:right-12 w-[300px] md:w-[400px] flex-col justify-end items-end text-right';
            default: 
                return 'inset-0 justify-center items-center';
        }
    };
    
    const isCompact = layout !== 'CENTER';
    const isWideBar = layout === 'BOTTOM_CENTER';

    // Helper: Convert Hex to RGB for Background opacity application
    const getRgbaBg = (hex: string, alpha: number) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(0,0,0,${alpha})`;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    return (
        <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
            
            {/* LAYER 1: Background Color Overlay (Separate from Canvas) */}
            <div 
                className="absolute inset-0 transition-colors duration-300"
                style={{ backgroundColor: getRgbaBg(config.bgColor, config.enabled ? config.bgOpacity : 0) }}
            ></div>

            {/* LAYER 2: Matrix Rain Canvas (Transparent BG) */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 block w-full h-full pointer-events-none mix-blend-screen"
            />

            {/* LAYER 3: CRT Scanline / Vignette Effects */}
            {config.enabled && config.bgOpacity > 0.1 && (
                <>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_90%)] pointer-events-none"></div>
                </>
            )}

            {/* LAYER 4: UI Content (Title & Buttons) */}
            <div className={`absolute z-[55] flex animate-slide-up pointer-events-none transition-all duration-500 ${getLayoutClasses()}`}>
                
                {/* Main Glass Container - Solidified Opacity & Borders */}
                <div className={`pointer-events-auto liquid-glass bg-[#030712]/90 backdrop-blur-3xl backdrop-saturate-150 rounded-3xl p-6 md:p-8 border border-white/20 ring-1 ring-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] transition-all duration-500 flex ${isWideBar ? 'w-full flex-col md:flex-row items-center gap-6 md:gap-8' : 'flex-col items-center gap-6 w-full'}`}>
                    
                    {/* Content Text */}
                    <div className={`flex flex-col ${isWideBar ? 'items-center md:items-start text-center md:text-left flex-1' : (layout.includes('RIGHT') ? 'items-end' : 'items-center')}`}>
                        
                        {/* Compact Header Badge */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-[10px] text-cyan-400 font-mono tracking-widest mb-3 shadow-inner`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>SYSTEM_READY // V4.0.3</span>
                        </div>

                        {/* Main Title */}
                        <h1 className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-400 font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] ${isCompact ? 'text-4xl' : 'text-6xl md:text-8xl'}`}>
                            TACTICAL.OS
                        </h1>
                        
                        {/* Subtitle */}
                        <div className="text-slate-400 font-mono text-xs tracking-[0.4em] uppercase mt-2 opacity-80">
                            Neural Battle Simulation
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className={`shrink-0 ${isCompact && !isWideBar ? 'w-full' : ''}`}>
                        <button 
                            onClick={onEnter}
                            className={`group relative liquid-btn rounded-full overflow-hidden transition-all duration-300 ${isWideBar ? 'px-12 py-5 w-full md:w-auto' : 'w-full px-12 py-5'} border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-500/20 hover:bg-cyan-500/30`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            
                            <span className="relative flex items-center justify-center gap-4 text-cyan-50 font-bold tracking-[0.2em] text-lg">
                                <span>INITIALIZE</span>
                                <span className="bg-cyan-500/20 p-1 rounded-full border border-cyan-500/50 group-hover:scale-110 transition-transform">
                                    <svg className="w-4 h-4 fill-cyan-300" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                </span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* LAYER 5: Controls (Top Left) - Circular Glass Button */}
            <div className="absolute top-6 left-6 z-[60] pointer-events-auto">
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`w-12 h-12 rounded-full liquid-glass bg-slate-950/80 flex items-center justify-center text-slate-400 hover:text-cyan-400 border border-white/20 hover:border-cyan-500/50 hover:bg-white/20 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] ${showSettings ? 'text-cyan-400 border-cyan-500/50 bg-white/20' : ''}`}
                    title="特效設定"
                >
                    <svg className={`w-6 h-6 ${showSettings ? 'animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </button>
            </div>

            <ShowcaseSettings 
                show={showSettings} 
                onClose={() => setShowSettings(false)}
                config={config} 
                setConfig={setConfig} 
                timeScale={timeScale}
                setTimeScale={setTimeScale}
                layout={layout}
                setLayout={setLayout}
            />
        </div>
    );
};
