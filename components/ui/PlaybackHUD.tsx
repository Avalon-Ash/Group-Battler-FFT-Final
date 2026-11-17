import React, { useRef } from 'react';
import type { Team } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useCompactViewport } from '../../hooks/useCompactViewport';
import { Icons } from './icons';
import { UI_Z, UI_PIN, UI_PANEL_PARAM, UI_SETTINGS } from '../../constants';
import { useCommands, useView } from '../../hooks/useEnginePort';
import { selectL1PlaybackView } from '../../engine/systems/ui/views/l1';
import { IconButton, Slider } from './primitives';
import { cn } from './primitives/cn';

interface PlaybackHUDProps {
    hidden: boolean;
    isPlaying: boolean;
    winner: Team | null;
    onTogglePlay: () => void;
    onRestart: () => void;
    onRandom: () => void;
    onShowcase: () => void;
}

export const PlaybackHUD: React.FC<PlaybackHUDProps> = ({
    hidden,
    isPlaying,
    winner,
    onTogglePlay,
    onRestart,
    onRandom,
    onShowcase,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const playback = useView(selectL1PlaybackView);
    const { send } = useCommands();
    const range = UI_SETTINGS.TIME_SCALE;
    const timeScale = playback?.targetTimeScale ?? range.default;
    const isCompact = useCompactViewport();
    const { dragHandlers, style, isDragging } = useDraggable(ref, {
        anchor: 'bottom-center',
        margin: UI_PANEL_PARAM.PLAYBACK_HUD_MARGIN,
        storageKey: UI_PIN.STORAGE_KEYS.playback,
    });

    return (
        <div
            ref={ref}
            className={`transition-all duration-500 ${hidden ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}
            style={{ ...style, zIndex: UI_Z.HUD }}
            {...dragHandlers}
        >
            {/* 操作列合約（docs/DECISIONS.md「UI」）：純圖示、單列。說明放 label，不放可見文字 */}
            <div
                data-testid="playback-hud"
                className={cn(
                    'control-bar shell shell-hud mat-blur rounded-ui-pill p-2 gap-1 select-none cursor-grab active:cursor-grabbing',
                    isDragging && 'cursor-grabbing scale-105',
                )}
            >
                <IconButton
                    data-testid="playback-play-btn"
                    label={isPlaying ? '暫停戰鬥' : '開始戰鬥'}
                    variant={isPlaying ? 'secondary' : 'primary'}
                    size="sm"
                    className="rounded-ui-pill shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlay();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={winner !== null}
                >
                    {isPlaying ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                </IconButton>
                <IconButton
                    label="重新開始"
                    size="sm"
                    variant="ghost"
                    className="rounded-ui-pill shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRestart();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Restart className="h-4 w-4" />
                </IconButton>
                <IconButton
                    label="隨機生成戰場與陣容"
                    size="sm"
                    variant="ghost"
                    className="rounded-ui-pill shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRandom();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.Dice className="h-4 w-4" />
                </IconButton>

                <div
                    className="flex items-center gap-2 min-w-0 px-2"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="w-24 min-w-0 shrink">
                        <Slider
                            ariaLabel="模擬速度"
                            min={range.min}
                            max={range.max}
                            step={range.step}
                            value={timeScale}
                            onChange={(val) => send({ type: 'SET_TIME_SCALE', timeScale: val })}
                        />
                    </div>
                    <span className="font-mono text-ui-num text-fg-primary font-bold shrink-0">
                        {timeScale.toFixed(1)}x
                    </span>
                </div>

                <IconButton
                    label="進入展示模式 (Showcase)"
                    size="sm"
                    variant="ghost"
                    className="rounded-ui-pill shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowcase();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.TV className="h-4 w-4" />
                </IconButton>

                <div
                    className={`w-4 h-6 shrink-0 ${isCompact ? 'hidden' : 'flex'} items-center justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing text-fg-muted`}
                    aria-hidden="true"
                >
                    <Icons.Menu className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
};
