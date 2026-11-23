import React, { useEffect, useRef } from 'react';
import { UI_SETTINGS, UI_Z } from '../../../constants';
import { SKILL_TAG_LABEL } from '../../../data/ui/labels/l3';
import { selectHeroBar, type HeroBarView, type HeroSkillSlotView } from '../../../engine/systems/ui/views/play';
import { useCommands, useView } from '../../../hooks/useEnginePort';
import { VIEW_INSET_KIND } from '../../../hooks/useViewInsets';
import { Button, IconButton, Meter } from '../primitives';
import { Icons } from '../icons';
import { cn } from '../primitives/cn';

/**
 * PLAY 戰鬥 HUD（P5，docs/plans/play-mode.md）：主角的四個技能鈕（快捷鍵 1～4）、停止（S）、暫停（空白鍵）；
 * 主角倒下後改成觀戰（可加速）。按技能：射程 0 的直接放；其他進入瞄準（SET_AIM），在戰場上點目標，
 * Esc 或右鍵取消。「能不能放」「能點誰」都讀引擎的投影（selectHeroBar），這裡不判斷。
 */
export interface PlayHUDProps {
    onTogglePause: () => void;
}

/** 觀戰時的倍率選項（在 UI_SETTINGS.TIME_SCALE 的範圍內） */
const SPECTATE_SPEEDS: readonly number[] = [UI_SETTINGS.TIME_SCALE.default, 2, 4];
const SLOT_KEYS: readonly string[] = ['1', '2', '3', '4'];

export const PlayHUD: React.FC<PlayHUDProps> = ({ onTogglePause }) => {
    const bar = useView(selectHeroBar);
    const { send } = useCommands();
    const barRef = useRef<HeroBarView | null>(bar);
    barRef.current = bar;

    const pressSlot = (slot: HeroSkillSlotView) => {
        const b = barRef.current;
        if (!b || !b.alive) return;
        if (slot.mode === 'SELF') {
            send({ type: 'ORDER_CAST', agentId: b.heroId, slot: slot.slot });
            return;
        }
        send({ type: 'SET_AIM', aim: b.aimSlot === slot.slot ? null : { agentId: b.heroId, slot: slot.slot } });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const b = barRef.current;
            if (!b || e.repeat) return;
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
            const idx = SLOT_KEYS.indexOf(e.key);
            if (idx >= 0) {
                const slot = b.slots.find((s) => s.slot === idx);
                if (slot) { pressSlot(slot); e.preventDefault(); }
            } else if (e.key === 'Escape' && b.aimSlot !== null) {
                send({ type: 'SET_AIM', aim: null });
            } else if ((e.key === 's' || e.key === 'S') && b.alive) {
                send({ type: 'ORDER_STOP', agentId: b.heroId });
            } else if (e.key === ' ') {
                onTogglePause();
                e.preventDefault();
            }
        };
        // 右鍵取消瞄準（戰場的右鍵選單本來就關掉了）
        const onContext = () => {
            if (barRef.current?.aimSlot !== null) send({ type: 'SET_AIM', aim: null });
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('contextmenu', onContext);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('contextmenu', onContext);
        };
    }, [send, onTogglePause]);

    if (!bar) return null;
    const aiming = bar.aimSlot !== null;

    return (
        <div
            className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4"
            style={{ zIndex: UI_Z.HUD }}
        >
            {aiming && (
                <div data-testid="play-aim-hint" className="shell shell-hud mat-blur rounded-ui-pill px-3 py-1 text-ui-label text-fg-secondary">
                    選擇目標 · Esc／右鍵取消
                </div>
            )}
            <div
                data-testid="play-hud"
                data-view-inset={VIEW_INSET_KIND.BOTTOM_BAR}
                className="pointer-events-auto shell shell-hud mat-blur rounded-ui-window flex max-w-full flex-wrap items-end justify-center gap-2 p-3 sm:flex-nowrap sm:gap-3"
            >
                <div className="flex w-full flex-col gap-2 self-center sm:w-28">
                    <Meter value={bar.hpFrac} max={1} tone="success" size="sm" aria-label="主角生命" />
                    <Meter value={bar.mpFrac} max={1} tone="accent" size="sm" aria-label="主角魔力" />
                </div>

                {bar.alive ? (
                    <div className="flex gap-2">
                        {bar.slots.map((s) => {
                            const unavailable = s.block !== null && s.block !== 'COOLDOWN' && s.block !== 'BUSY';
                            return (
                                <Button
                                    key={s.slot}
                                    data-testid={`play-skill-${s.slot}`}
                                    data-block={s.block ?? 'READY'}
                                    variant={bar.aimSlot === s.slot ? 'primary' : 'secondary'}
                                    title={`${SKILL_TAG_LABEL[s.tag]}：${s.name}（${SLOT_KEYS[s.slot]}）`}
                                    onClick={() => pressSlot(s)}
                                    className={cn('relative h-14 w-16 flex-col justify-end gap-0 overflow-hidden px-1 pb-1 sm:h-16 sm:w-24', unavailable && 'opacity-50')}
                                >
                                    {s.cooldownFrac > 0 && (
                                        <span aria-hidden className="absolute inset-x-0 bottom-0 bg-surface-base/60" style={{ height: `${s.cooldownFrac * 100}%` }} />
                                    )}
                                    <span className="absolute left-1 top-1 font-mono text-ui-label text-fg-muted">{SLOT_KEYS[s.slot]}</span>
                                    <span className="relative w-full truncate text-center text-ui-label">{s.name}</span>
                                </Button>
                            );
                        })}
                    </div>
                ) : (
                    <div data-testid="play-spectate" className="flex items-center gap-2 self-center">
                        <span className="text-ui-label text-fg-muted">SPECTATING</span>
                        {SPECTATE_SPEEDS.map((v) => (
                            <Button
                                key={v}
                                size="sm"
                                variant={Math.abs(bar.timeScale - v) < UI_SETTINGS.TIME_SCALE.step / 2 ? 'primary' : 'secondary'}
                                onClick={() => send({ type: 'SET_TIME_SCALE', timeScale: v })}
                            >
                                {`×${v}`}
                            </Button>
                        ))}
                    </div>
                )}

                <div className="flex flex-col gap-2 self-center">
                    <IconButton
                        data-testid="play-pause-btn"
                        label={bar.isRunning ? '暫停（空白鍵）' : '繼續（空白鍵）'}
                        size="sm"
                        variant="ghost"
                        onClick={onTogglePause}
                    >
                        {bar.isRunning ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                    </IconButton>
                    {bar.alive && (
                        <IconButton
                            data-testid="play-stop-btn"
                            label="停下（S）"
                            size="sm"
                            variant="ghost"
                            onClick={() => send({ type: 'ORDER_STOP', agentId: bar.heroId })}
                        >
                            <Icons.Close className="h-4 w-4" />
                        </IconButton>
                    )}
                </div>
            </div>
        </div>
    );
};
