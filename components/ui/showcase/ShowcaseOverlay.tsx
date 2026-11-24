import React, { useRef, useState, useEffect } from 'react';
import { useMatrixRain } from './useMatrixRain';
import { UI_Z, UI_PANEL_PARAM, ROYALE_RULES } from '../../../constants';
import type { BattleSetup } from '../../../types';
import { useCompactViewport } from '../../../hooks/useCompactViewport';
import { useWindowStore } from '../../../hooks/useWindowStore';
import { WINDOW_DEFINITIONS } from '../../../data/ui/windows';
import { useShowcaseConfig, useShowcaseLayout } from './showcaseConfigStore';
import { Button, IconButton } from '../primitives';
import { Icons } from '../icons';
import { SHOWCASE_ENTRY, showcaseSwapLabel, type ShowcaseEntryMode } from '../../../data/ui/labels/showcase';

interface ShowcaseOverlayProps {
    onEnter: () => void;
    /** 進入 PLAY 的選主角畫面（P4） */
    onPlay?: () => void;
    /** 場上這一局的陣營設定：標題卡依它標示雙陣營或大逃殺 */
    battleSetup?: BattleSetup;
    engine?: unknown; 
    showDirectorMonitor?: boolean;
    setShowDirectorMonitor?: (v: boolean) => void;
}

export const ShowcaseOverlay: React.FC<ShowcaseOverlayProps> = ({ onEnter, onPlay, battleSetup }) => {
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
    const isSettingsOpen = WINDOW_DEFINITIONS.some((def) => def.modes.includes('SHOWCASE') && windows[def.id]?.isOpen);
    // Settings open as a bottom sheet at compact widths; the title card would sit behind it.
    const isCompactViewport = useCompactViewport();
    
    // 入口只放一顆鈕，交換鈕在「模擬／PLAY」之間切換（預設模擬：工具腳本都點 START SIMULATION）
    const [entryMode, setEntryMode] = useState<ShowcaseEntryMode>('SIMULATION');
    const entry = SHOWCASE_ENTRY[onPlay ? entryMode : 'SIMULATION'];
    const onEntry = onPlay && entryMode === 'PLAY' ? onPlay : onEnter;

    const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useMatrixRain(canvasRef, config, viewport.w, viewport.h);

    return (
        <>
            <div className="hero-rain" style={{ zIndex: UI_Z.SHOWCASE }} aria-hidden>
                <div className="hero-rain-background" style={{
                    backgroundColor: config.bgColor,
                    opacity: config.enabled ? config.bgOpacity : 0,
                }} />
                <canvas ref={canvasRef} className="hero-rain-canvas" />
                {config.enabled && config.bgOpacity > UI_PANEL_PARAM.SHOWCASE_BG_MIN_OPACITY && (
                    <div className="hero-rain-texture" />
                )}
                <div className="hero-shade" />
            </div>
            {/* Keep the card outside the rain blend group so the button can blur the battlefield. */}
            <div
                data-testid="showcase-card"
                data-layout={layout}
                data-tone={isRoyale ? 'danger' : 'accent'}
                hidden={isSettingsOpen && isCompactViewport}
                className="hero-card"
                style={{ zIndex: UI_Z.SHOWCASE_CARD }}
            >
                <header className="hero-block">
                    <div data-testid="showcase-mode-tag" className="hero-mode">{modeLabel}</div>
                    <div className="hero-wordmark">
                        <h1 className="hero-title">TACTICAL<span className="hero-os">.OS</span></h1>
                        <div className="hero-rule" aria-hidden />
                    </div>
                    <div className="hero-sub">SSOT CORE ONLINE</div>
                </header>
                <div className="hero-actions">
                    <Button data-testid={entry.testId} onClick={onEntry} title={entry.label} className="hero-cta mat-blur">
                        {entry.label}
                    </Button>
                    {onPlay && (
                        <IconButton
                            data-testid="showcase-mode-swap"
                            label={showcaseSwapLabel(SHOWCASE_ENTRY[entryMode].next)}
                            onClick={() => setEntryMode(SHOWCASE_ENTRY[entryMode].next)}
                            className="hero-swap mat-blur"
                        >
                            <Icons.Swap className="h-4 w-4" />
                        </IconButton>
                    )}
                </div>
            </div>
        </>
    );
};
