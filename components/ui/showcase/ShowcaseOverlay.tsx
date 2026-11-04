import React, { useRef, useState, useEffect } from 'react';
import { useMatrixRain } from './useMatrixRain';
import { Icons } from '../icons';
import { UI_Z, UI_PANEL_PARAM, ROYALE_RULES } from '../../../constants';
import type { BattleSetup } from '../../../types';
import { useCompactViewport } from '../../../hooks/useCompactViewport';
import { useWindowStore } from '../../../hooks/useWindowStore';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { useShowcaseConfig, useShowcaseLayout } from './showcaseConfigStore';
import { Button, Tag } from '../primitives';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    /** 場上這一局的陣營設定：標題卡依它標示雙陣營或大逃殺 */
    battleSetup?: BattleSetup;
    engine?: unknown; 
    showDirectorMonitor?: boolean;
    setShowDirectorMonitor?: (v: boolean) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter, battleSetup }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isRoyale = !!battleSetup && battleSetup.factions >= ROYALE_RULES.MIN_FACTIONS;
    const modeLabel = !battleSetup
        ? 'SYSTEM READY'
        : isRoyale
            ? `BATTLE ROYALE · ${battleSetup.factions} FACTIONS × ${battleSetup.unitsPerFaction}`
            : `TEAM BATTLE · ${battleSetup.unitsPerFaction} VS ${battleSetup.unitsPerFaction}`;
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
                return 'bottom-12 left-0 right-0 mx-auto w-full flex-col md:flex-row justify-between items-center';
            case 'BOTTOM_LEFT': 
                return 'bottom-10 left-6 flex-col justify-end items-start';
            case 'BOTTOM_RIGHT': 
                return 'bottom-10 right-6 flex-col justify-end items-end text-right';
            default: 
                return 'inset-0 justify-center items-center';
        }
    };

    const getLayoutStyle = (): React.CSSProperties => {
        if (layout === 'BOTTOM_LEFT' || layout === 'BOTTOM_RIGHT') {
            return { width: 'min(400px, 90vw)' };
        }
        if (layout === 'BOTTOM_CENTER') {
            return { maxWidth: 'min(1024px, calc(100vw - 4rem))' };
        }
        return {};
    };
    
    const isCompact = layout !== 'CENTER';
    const isWideBar = layout === 'BOTTOM_CENTER';

    return (
        <>
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: UI_Z.SHOWCASE }}>
            <div 
                className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
                style={{
                    backgroundColor: config.bgColor,
                    opacity: config.enabled ? config.bgOpacity : 0,
                }}
            />

            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 block w-full h-full pointer-events-none mix-blend-screen"
            />

            {config.enabled && config.bgOpacity > UI_PANEL_PARAM.SHOWCASE_BG_MIN_OPACITY && (
                <>
                    <div
                        className="absolute inset-0 opacity-30 pointer-events-none"
                        style={{
                            backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LDI1NSwgMC4wNSkiIC8+Cjwvc3ZnPg==')",
                        }}
                    />
                    <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, transparent 0%, black 90%)',
                        }}
                    />
                </>
            )}


            {/* 展示設定只從右上角系統選單開（showcaseSettings visibleInShowcase）；左上舊的齒輪入口 2026-10-19 移除 */}
        </div>
        {/* 主卡在代碼雨的群組外：代碼雨的 mix-blend 會把群組隔離，裡面的 backdrop-filter 看不到戰場 */}
            <div
                className={`absolute flex animate-slide-up pointer-events-none transition-all duration-500 ${getLayoutClasses()}`}
                style={{ zIndex: UI_Z.SHOWCASE_CARD, ...getLayoutStyle() }}
            >
                <div
                    data-testid="showcase-card"
                    className={`pointer-events-none flex max-w-full transition-opacity duration-300 ${
                        isSettingsOpen && isCompactViewport ? 'opacity-0 invisible' : ''
                    } ${isWideBar ? 'w-full flex-col md:flex-row items-center md:items-end justify-between gap-8' : 'flex-col items-center gap-8 w-full'}`}
                >
                    {/* 標題直接浮在戰場上，不放進玻璃板；可讀性靠柔和的暗場與描影 */}
                    <div
                        data-tone={isRoyale ? 'danger' : 'accent'}
                        className={`hero-block flex flex-col max-w-full ${isWideBar ? 'items-center md:items-start text-center md:text-left' : (layout.includes('RIGHT') ? 'items-end' : 'items-center')}`}
                    >
                        <Tag
                            data-testid="showcase-mode-tag"
                            tone={isRoyale ? 'danger' : 'accent'}
                            className="mb-3 gap-2"
                        >
                            <span className="w-1.5 h-1.5 rounded-ui-pill animate-pulse bg-current" />
                            <span>{modeLabel}</span>
                        </Tag>

                        <h1 className="hero-title">TACTICAL.OS</h1>
                        <div className="hero-rule" aria-hidden />
                        <div className="hero-sub">SSOT CORE ONLINE</div>
                    </div>

                    <div className={`relative shrink-0 pointer-events-auto ${isCompact && !isWideBar ? 'w-full' : ''}`}>
                        <Button
                            data-testid="showcase-enter-btn"
                            onClick={onEnter}
                            title="START SIMULATION"
                            className={`hero-cta shell-hud mat-blur group ${isWideBar ? 'w-full md:w-auto' : 'w-full'}`}
                        >
                            <span className="whitespace-nowrap">START SIMULATION</span>
                            <Icons.Play className="hero-cta-icon w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
