import React, { useRef } from 'react';
import type { Team } from '../../types';
import { useDraggable } from '../../hooks/useDraggable';
import { useCompactViewport } from '../../hooks/useCompactViewport';
import { Icons } from './icons';
import { UI_Z, UI_PIN, UI_PANEL_PARAM, UI_SETTINGS } from '../../constants';
import { useCommands, useView } from '../../hooks/useEnginePort';
import { selectL1PlaybackView } from '../../engine/systems/ui/views/l1';
import { Button, IconButton, Slider } from './primitives';

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
            <div
                data-testid="playback-hud"
                className={`shell shell-hud mat-blur rounded-ui-pill p-2 flex items-center select-none cursor-grab active:cursor-grabbing ${
                    isCompact ? 'pr-3 gap-2' : 'pr-5 gap-3'
                } ${isDragging ? 'cursor-grabbing scale-105' : ''}`}
            >
                <Button
                    data-testid="playback-play-btn"
                    variant={isPlaying ? 'secondary' : 'primary'}
                    size="sm"
                    className="rounded-ui-pill font-bold"
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlay();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    disabled={winner !== null}
                    title={isPlaying ? '暫停戰鬥' : '開始戰鬥'}
                >
                    {isPlaying ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    <span>{isPlaying ? '暫停' : '開始'}</span>
                </Button>

                <div className={`flex gap-1.5 ${isCompact ? 'flex-row' : 'flex-col'}`}>
                    <IconButton
                        label="重新開始"
                        size="sm"
                        variant="ghost"
                        className="rounded-ui-pill"
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
                        className="rounded-ui-pill"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRandom();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Icons.Dice className="h-4 w-4" />
                    </IconButton>
                </div>

                <div className={`h-6 w-px bg-line-subtle/20 ${isCompact ? '' : 'mx-1'}`} />

                <div className={`flex flex-col ${isCompact ? 'w-24' : 'w-32'} gap-1`} onPointerDown={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center px-1">
                        <span className="font-mono text-ui-num text-fg-muted uppercase tracking-wider">速度</span>
                        <span className="font-mono text-ui-num text-fg-primary font-bold">
                            {timeScale.toFixed(1)}x
                        </span>
                    </div>
                    <Slider
                        ariaLabel="模擬速度"
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        value={timeScale}
                        onChange={(val) => send({ type: 'SET_TIME_SCALE', timeScale: val })}
                    />
                </div>

                <div className={`h-6 w-px bg-line-subtle/20 ${isCompact ? '' : 'mx-1'}`} />

                <IconButton
                    label="進入展示模式 (Showcase)"
                    size="sm"
                    variant="ghost"
                    className="rounded-ui-pill"
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowcase();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <Icons.TV className="h-4 w-4" />
                </IconButton>

                <div
                    className={`w-4 h-6 ${isCompact ? 'hidden' : 'flex'} items-center justify-center opacity-40 hover:opacity-80 transition-opacity cursor-grab active:cursor-grabbing text-fg-muted`}
                    aria-hidden="true"
                >
                    <Icons.Menu className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
};
