import React, { useRef, useState, useEffect } from 'react';
import { MatrixConfig, LayoutPreset } from './types';
import { DEFAULT_MATRIX_CONFIG } from './defaults';
import { useMatrixRain } from './useMatrixRain';
import { ShowcaseSettings } from './ShowcaseSettings';
import { Icons } from '../icons';
import { GameEngine } from '../../../engine/game';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    timeScale: number;
    setTimeScale: (v: number) => void;
    engine?: GameEngine; 
    showDirectorMonitor?: boolean;
    setShowDirectorMonitor?: (v: boolean) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter, timeScale, setTimeScale, engine, showDirectorMonitor, setShowDirectorMonitor }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [config, setConfig] = useState<MatrixConfig>(DEFAULT_MATRIX_CONFIG);
    const [layout, setLayout] = useState<LayoutPreset>('BOTTOM_CENTER');
    const [showSettings, setShowSettings] = useState(false);
    
    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useMatrixRain(canvasRef, config, viewport.w, viewport.h);

    const getLayoutClasses = () => {
        switch (layout) {
            case 'CENTER': 
                return 'inset-0 flex-col justify-center items-center text-center p-4 md:p-8';
            case 'BOTTOM_CENTER': 
                return 'bottom-12 left-0 right-0 mx-auto w-full max-w-[calc(100vw-4rem)] md:max-w-5xl flex-col md:flex-row justify-between items-center';
            case 'BOTTOM_LEFT': 
                return 'bottom-10 left-6 w-[min(320px,90vw)] md:w-[400px] flex-col justify-end items-start';
            case 'BOTTOM_RIGHT': 
                return 'bottom-10 right-6 w-[min(320px,90vw)] md:w-[400px] flex-col justify-end items-end text-right';
            default: 
                return 'inset-0 justify-center items-center';
        }
    };
    
    const isCompact = layout !== 'CENTER';
    const isWideBar = layout === 'BOTTOM_CENTER';

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
            
            <div 
                className="absolute inset-0 transition-colors duration-300"
                style={{ backgroundColor: getRgbaBg(config.bgColor, config.enabled ? config.bgOpacity : 0) }}
            ></div>

            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 block w-full h-full pointer-events-none mix-blend-screen"
            />

            {config.enabled && config.bgOpacity > 0.1 && (
                <>
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_90%)] pointer-events-none"></div>
                </>
            )}

            <div className={`absolute z-[55] flex animate-slide-up pointer-events-none transition-all duration-500 ${getLayoutClasses()}`}>
                
                <div className={`liquid-card p-8 md:p-10 pointer-events-auto flex max-w-full ${isWideBar ? 'w-full flex-col md:flex-row items-center gap-8' : 'flex-col items-center gap-8 w-full'}`}>
                    
                    <div className={`relative flex flex-col max-w-full ${isWideBar ? 'items-center md:items-start text-center md:text-left flex-1' : (layout.includes('RIGHT') ? 'items-end' : 'items-center')}`}>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono tracking-widest mb-4 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse box-shadow-[0_0_5px_cyan]"></span>
                            <span>SYSTEM_READY</span>
                        </div>

                        <h1 className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500 font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] ${isCompact ? 'text-5xl' : 'text-7xl md:text-8xl'}`}>
                            TACTICAL.OS
                        </h1>
                        
                        <div className="text-slate-400 font-mono text-xs tracking-[0.4em] uppercase mt-3 opacity-80 mix-blend-plus-lighter">
                            v9.3 | SSOT Kernel Active
                        </div>
                    </div>

                    <div className={`relative shrink-0 ${isCompact && !isWideBar ? 'w-full' : ''}`}>
                        <button 
                            onClick={onEnter}
                            className={`group liquid-btn-primary rounded-2xl overflow-hidden transition-all duration-300 ${isWideBar ? 'px-16 py-6 w-full md:w-auto text-xl' : 'w-full px-12 py-5 text-lg'} shadow-[0_0_30px_rgba(6,182,212,0.2)]`}
                        >
                            <span className="relative flex items-center justify-center gap-4 z-10">
                                <span>INITIALIZE</span>
                                <Icons.Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute top-6 left-6 z-[60] pointer-events-auto">
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`liquid-icon-btn hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-white/10 ${showSettings ? 'text-cyan-400 border-cyan-500/50 bg-white/10' : 'text-slate-400'}`}
                    title="特效設定"
                >
                    <Icons.Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow' : ''}`} />
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
                engine={engine}
                monitorEnabled={showDirectorMonitor}
                onToggleMonitor={setShowDirectorMonitor}
            />
        </div>
    );
};