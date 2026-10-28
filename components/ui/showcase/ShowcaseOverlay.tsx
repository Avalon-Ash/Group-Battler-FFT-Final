import React, { useRef, useState, useEffect } from 'react';
import { useMatrixRain } from './useMatrixRain';
import { Icons } from '../icons';
import { GameEngine } from '../../../engine/game';
import { UI_Z } from '../../../constants';
import { useCompactViewport } from '../../../hooks/useCompactViewport';
import { useWindowStore } from '../../../hooks/useWindowStore';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { useShowcaseConfig, useShowcaseLayout } from './showcaseConfigStore';
import { formatRgba } from '../../../data/ui/tokens';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    timeScale?: number;
    setTimeScale?: (v: number) => void;
    engine?: GameEngine; 
    showDirectorMonitor?: boolean;
    setShowDirectorMonitor?: (v: boolean) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const config = useShowcaseConfig();
    const layout = useShowcaseLayout();
    // 窄螢幕上任何展示模式視窗（設定、音訊…）開著時收起標題卡，讓出空間
    const windows = useWindowStore();
    const isSettingsOpen = WINDOW_DEFINITIONS.some((def) => def.visibleInShowcase && windows[def.id]?.isOpen);
    // Settings open as a bottom sheet at compact widths; the title card would sit behind it.
    const isCompactViewport = useCompactViewport();
    
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
        if (!result) return formatRgba(0, 0, 0, alpha);
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return formatRgba(r, g, b, alpha);
    };

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: UI_Z.SHOWCASE }}>
            
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

            <div className={`absolute flex animate-slide-up pointer-events-none transition-all duration-500 ${getLayoutClasses()}`} style={{ zIndex: UI_Z.MENU_BACKDROP }}>
                
                <div data-testid="showcase-card" className={`p-8 md:p-10 pointer-events-none flex max-w-full transition-opacity duration-300 ${isSettingsOpen && isCompactViewport ? 'opacity-0 invisible' : ''} ${isWideBar ? 'w-full flex-col md:flex-row items-center gap-8' : 'flex-col items-center gap-8 w-full'}`}>
                    
                    <div className={`relative flex flex-col max-w-full ${isWideBar ? 'items-center md:items-start text-center md:text-left flex-1' : (layout.includes('RIGHT') ? 'items-end' : 'items-center')}`}>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-cyan-400 font-mono tracking-widest mb-4 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse box-shadow-[0_0_5px_cyan]"></span>
                            <span>SYSTEM READY</span>
                        </div>

                        <h1 className={`font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-500 font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(6,182,212,0.5)] ${isCompact ? 'text-5xl' : 'text-7xl md:text-8xl'}`}>
                            TACTICAL.OS
                        </h1>
                        
                        <div className="text-slate-400 font-mono text-xs tracking-[0.4em] uppercase mt-3 opacity-80 mix-blend-plus-lighter">
                            SSOT CORE ONLINE
                        </div>
                    </div>

                    <div className={`relative shrink-0 pointer-events-auto ${isCompact && !isWideBar ? 'w-full' : ''}`}>
                        <button 
                            data-testid="showcase-enter-btn"
                            onClick={onEnter}
                            className={`group liquid-btn-primary rounded-2xl overflow-hidden transition-all duration-300 ${isWideBar ? 'px-16 py-6 w-full md:w-auto text-xl' : 'w-full px-12 py-5 text-lg'} shadow-[0_0_30px_rgba(6,182,212,0.2)]`}
                        >
                            <span className="relative flex items-center justify-center gap-4 z-10">
                                <span className="whitespace-nowrap">START SIMULATION</span>
                                <Icons.Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            {/* 展示設定只從右上角系統選單開（showcaseSettings visibleInShowcase）；左上舊的齒輪入口 2026-10-19 移除 */}
        </div>
    );
};
