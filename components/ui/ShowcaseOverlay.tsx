
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
                return 'inset-0 flex-col justify-center items-center text-center p-12';
            case 'BOTTOM_CENTER': 
                // Wide Rectangle (Max 2/3 Width, Max 1/5 Height)
                return 'bottom-8 left-1/2 -translate-x-1/2 w-full md:w-2/3 max-h-[20vh] flex-row justify-between items-center px-8 py-6';
            case 'BOTTOM_LEFT': 
                return 'bottom-0 left-0 w-[400px] flex-col justify-end items-start p-8';
            case 'BOTTOM_RIGHT': 
                return 'bottom-0 right-0 w-[400px] flex-col justify-end items-end p-8 text-right';
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
                style={{ backgroundColor: getRgbaBg(config.bgColor, config.bgOpacity) }}
            ></div>

            {/* LAYER 2: Matrix Rain Canvas (Transparent BG) */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 block w-full h-full pointer-events-none mix-blend-screen"
            />

            {/* LAYER 3: CRT Scanline / Vignette Effects */}
            {config.bgOpacity > 0.1 && (
                <>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_90%)] pointer-events-none"></div>
                </>
            )}

            {/* LAYER 4: UI Content (Title & Buttons) */}
            <div className={`absolute z-[55] flex animate-fade-in pointer-events-none ${getLayoutClasses()}`}>
                <div className={`relative pointer-events-auto transition-all duration-500 w-full h-full flex ${isWideBar ? 'flex-row items-center justify-between' : 'flex-col'} ${isCompact ? 'bg-slate-950/80 border border-slate-700 backdrop-blur-md rounded shadow-2xl p-6' : ''}`}>
                    
                    {/* Content Wrapper for Wide Mode */}
                    <div className={`flex flex-col ${isWideBar ? 'items-start text-left' : 'items-center text-center'} flex-1`}>
                        {/* Compact Header */}
                        {isCompact && (
                            <div className={`flex w-full mb-1 opacity-50 text-cyan-500 font-mono text-[10px] tracking-widest ${isWideBar ? 'justify-start gap-4' : 'justify-between border-b border-cyan-900 pb-1'}`}>
                                <span>// SYSTEM_READY</span>
                                <span>V4.0.3</span>
                            </div>
                        )}

                        {/* Main Title */}
                        <h1 className={`${isCompact ? (isWideBar ? 'text-5xl' : 'text-4xl') : 'text-7xl md:text-9xl'} font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-200 to-cyan-500 mb-1 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]`}>
                            TACTICAL.OS
                        </h1>
                        
                        {/* Subtitle */}
                        <div className={`flex items-center gap-4 text-cyan-400 font-mono ${isCompact ? 'text-xs' : 'text-sm md:text-base justify-center mb-10'} tracking-[0.3em] uppercase`}>
                            {!isCompact && <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>}
                            <span>Neural Battle Simulation</span>
                            {!isCompact && <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>}
                        </div>
                    </div>

                    {/* Start Button */}
                    <div className={`${isCompact ? (isWideBar ? 'ml-8 shrink-0' : 'mt-4 w-full') : ''}`}>
                        <button 
                            onClick={onEnter}
                            className={`group relative inline-flex items-center justify-center ${isCompact ? (isWideBar ? 'px-12 py-4 text-lg' : 'w-full py-3 text-sm') : 'px-16 py-5 text-xl'} overflow-hidden font-bold text-white transition-all duration-300 bg-cyan-950/30 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-900/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]`}
                        >
                            <span className="relative tracking-[0.2em] flex items-center gap-3 group-hover:gap-5 transition-all">
                                INITIALIZE
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* LAYER 5: Controls (Top Left) */}
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="absolute top-4 left-4 z-[60] pointer-events-auto p-2 bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 rounded transition-all shadow-lg"
                title="特效設定"
            >
                <svg className="w-6 h-6 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>

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
