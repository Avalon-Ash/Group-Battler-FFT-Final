import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TACTICAL_COLORS, UI_SETTINGS, UI_Z } from '../../../constants';
import { SKILL_TAG_LABEL } from '../../../data/ui/labels/l3';
import { PLAY_TEXT, skillShortLabel } from '../../../data/ui/labels/play';
import { selectHeroBar, type HeroBarView, type HeroSkillSlotView } from '../../../engine/systems/ui/views/play';
import { useCommands, useView } from '../../../hooks/useEnginePort';
import { useCompactViewport } from '../../../hooks/useCompactViewport';
import { VIEW_INSET_KIND } from '../../../hooks/useViewInsets';
import { IconButton, Meter, Segmented } from '../primitives';
import { Icons } from '../icons';
import { SkillIcon } from '../../inspector/parts/SkillIcon';
import { cn } from '../primitives/cn';

/**
 * PLAY 戰鬥 HUD（P5，docs/plans/play-mode.md）：主角的四個技能鈕（快捷鍵 1～4）、停止（S）、暫停（空白鍵）；
 * 主角倒下後改成觀戰（可加速）。按技能：射程 0 的直接放；其他進入瞄準（SET_AIM），在戰場上點目標，
 * Esc、右鍵或瞄準提示上的取消鈕取消。「能不能放」「能點誰」都讀引擎的投影（selectHeroBar），這裡不判斷。
 * 版面：單列（技能鈕只放圖示，名稱在 title 與瞄準提示）；尺寸讀 --ui-play-* token，排法在 index.css 的 .play-hud。
 * 手機（useCompactViewport，和工具視窗變底部面板同一個斷點）用純色外殼，不模糊。
 */
export interface PlayHUDProps {
    onTogglePause: () => void;
}

/** 觀戰時的倍率選項（在 UI_SETTINGS.TIME_SCALE 的範圍內） */
const SPECTATE_SPEEDS: readonly number[] = [UI_SETTINGS.TIME_SCALE.default, 2, 4];
const SLOT_KEYS: readonly string[] = ['1', '2', '3', '4'];
/** 技能鈕頂端的對象色帶：和戰場上瞄準時的目標圈同一組顏色（敵紅、友綠），不限對象用主角標記的金色 */
const TEAM_MARK_COLOR: Readonly<Record<HeroSkillSlotView['teams'], string>> = {
    ENEMY: TACTICAL_COLORS.TARGET_ENEMY,
    ALLY: TACTICAL_COLORS.TARGET_ALLY,
    ANY: TACTICAL_COLORS.PLAYER_MARK,
};
/** 觸控裝置：瞄準提示不提鍵盤 */
const isCoarsePointer = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

/** 技能因冷卻或魔力不足無法施放時，提示條顯示的毫秒數（ADR 0026） */
const CAST_BLOCK_HINT_MS = 1500;
type CastBlockReason = 'COOLDOWN' | 'MANA';
const CAST_BLOCK_LABEL: Readonly<Record<CastBlockReason, string>> = {
    COOLDOWN: PLAY_TEXT.CAST_BLOCK_COOLDOWN,
    MANA: PLAY_TEXT.CAST_BLOCK_MANA,
};

const slotTitle = (s: HeroSkillSlotView): string => `${SKILL_TAG_LABEL[s.tag]}：${s.name}（${SLOT_KEYS[s.slot]}）`;

export const PlayHUD: React.FC<PlayHUDProps> = ({ onTogglePause }) => {
    const bar = useView(selectHeroBar);
    const { send } = useCommands();
    const isCompact = useCompactViewport();
    const barRef = useRef<HeroBarView | null>(bar);
    barRef.current = bar;
    const [castBlock, setCastBlock] = useState<{ readonly name: string; readonly reason: CastBlockReason } | null>(null);
    const blockTimerRef = useRef<number | null>(null);

    const clearCastBlock = useCallback(() => {
        if (blockTimerRef.current !== null) {
            window.clearTimeout(blockTimerRef.current);
            blockTimerRef.current = null;
        }
        setCastBlock(null);
    }, []);

    const showCastBlock = useCallback((name: string, reason: CastBlockReason) => {
        if (blockTimerRef.current !== null) window.clearTimeout(blockTimerRef.current);
        setCastBlock({ name, reason });
        blockTimerRef.current = window.setTimeout(() => {
            blockTimerRef.current = null;
            setCastBlock(null);
        }, CAST_BLOCK_HINT_MS);
    }, []);

    useEffect(() => () => {
        if (blockTimerRef.current !== null) window.clearTimeout(blockTimerRef.current);
    }, []);

    const pressSlot = useCallback((slot: HeroSkillSlotView) => {
        const b = barRef.current;
        if (!b || !b.alive) return;
        if (slot.refusal !== null) {
            showCastBlock(slot.name, slot.refusal);
            return;
        }
        clearCastBlock();
        if (slot.mode === 'SELF') {
            send({ type: 'ORDER_CAST', agentId: b.heroId, slot: slot.slot });
            return;
        }
        send({ type: 'SET_AIM', aim: b.aimSlot === slot.slot ? null : { agentId: b.heroId, slot: slot.slot } });
    }, [send, showCastBlock, clearCastBlock]);

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
    }, [send, onTogglePause, pressSlot]);

    if (!bar) return null;
    const aimed = bar.aimSlot !== null ? bar.slots.find((s) => s.slot === bar.aimSlot) ?? null : null;
    const shownBlock = bar.alive ? castBlock : null;
    const shell = isCompact ? 'shell shell-inactive' : 'shell shell-hud mat-blur';

    return (
        <>
            {(aimed || shownBlock) && (
                <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-4" style={{ zIndex: UI_Z.HUD }}>
                    {aimed && (
                        <div data-testid="play-aim-hint" className={cn('pointer-events-auto rounded-ui-pill flex items-center gap-2 py-1 pl-3 pr-1 text-ui-label text-fg-secondary', shell)}>
                            <span className="text-fg-primary">{aimed.name}</span>
                            <span>{isCoarsePointer() ? PLAY_TEXT.AIM_HINT_TOUCH : `${PLAY_TEXT.AIM_HINT_TOUCH} · ${PLAY_TEXT.AIM_HINT_KEYS}`}</span>
                            <IconButton
                                data-testid="play-aim-cancel"
                                label={PLAY_TEXT.AIM_CANCEL}
                                size="sm"
                                variant="ghost"
                                onClick={() => send({ type: 'SET_AIM', aim: null })}
                            >
                                <Icons.Close className="h-4 w-4" />
                            </IconButton>
                        </div>
                    )}
                    {shownBlock && (
                        <div data-testid="play-cast-block" role="status" className={cn('rounded-ui-pill flex items-center gap-2 px-3 py-1 text-ui-label text-fg-secondary', shell)}>
                            <span className="text-fg-primary">{shownBlock.name}</span>
                            <span>{CAST_BLOCK_LABEL[shownBlock.reason]}</span>
                        </div>
                    )}
                </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-2" style={{ zIndex: UI_Z.HUD }}>
                <div
                    data-testid="play-hud"
                    data-view-inset={VIEW_INSET_KIND.BOTTOM_BAR}
                    className={cn('play-hud pointer-events-auto rounded-ui-window', shell)}
                >
                    <div className="play-hud-meters">
                        <Meter value={bar.hpFrac} max={1} tone="success" size="sm" aria-label={PLAY_TEXT.HP_ARIA} />
                        <Meter value={bar.mpFrac} max={1} tone="accent" size="sm" aria-label={PLAY_TEXT.MP_ARIA} />
                    </div>

                    {bar.alive ? (
                        <div className="play-hud-slots">
                            {bar.slots.map((s) => {
                                const unavailable = s.refusal !== null || (s.block !== null && s.block !== 'COOLDOWN' && s.block !== 'BUSY' && s.block !== 'RECOVERY');
                                return (
                                    <IconButton
                                        key={s.slot}
                                        data-testid={`play-skill-${s.slot}`}
                                        data-block={s.block ?? 'READY'}
                                        label={slotTitle(s)}
                                        size="auto"
                                        variant={bar.aimSlot === s.slot ? 'primary' : 'secondary'}
                                        onClick={() => pressSlot(s)}
                                        className={cn('play-slot', unavailable && 'opacity-50')}
                                    >
                                        <SkillIcon skill={{ id: s.skillId, name: s.name, visual: s.visual, color: s.color }} className="play-slot-icon" data-testid={`play-skill-icon-${s.slot}`} />
                                        <span data-testid={`play-skill-label-${s.slot}`} className="play-slot-label text-ui-num">{skillShortLabel({ id: s.skillId, name: s.name })}</span>
                                        {s.cooldownFrac > 0 && (
                                            <span aria-hidden className="play-slot-cooldown" style={{ height: `${s.cooldownFrac * 100}%` }} />
                                        )}
                                        <span aria-hidden data-testid={`play-skill-mark-${s.slot}`} data-teams={s.teams} className="play-slot-mark" style={{ backgroundColor: TEAM_MARK_COLOR[s.teams] }} />
                                        <span aria-hidden className="play-slot-key font-mono text-ui-label">{SLOT_KEYS[s.slot]}</span>
                                    </IconButton>
                                );
                            })}
                        </div>
                    ) : (
                        <div data-testid="play-spectate" className="play-hud-slots items-center">
                            <span className="text-ui-label text-fg-muted">{PLAY_TEXT.SPECTATING}</span>
                            <Segmented
                                ariaLabel={PLAY_TEXT.SPECTATE_SPEED_ARIA}
                                value={String(SPECTATE_SPEEDS.find((v) => Math.abs(bar.timeScale - v) < UI_SETTINGS.TIME_SCALE.step / 2) ?? '')}
                                onValueChange={(v) => send({ type: 'SET_TIME_SCALE', timeScale: Number(v) })}
                                options={SPECTATE_SPEEDS.map((v) => ({ value: String(v), label: `×${v}`, testId: `play-speed-${v}` }))}
                            />
                        </div>
                    )}

                    <div className="play-hud-sys">
                        <IconButton
                            data-testid="play-pause-btn"
                            label={bar.isRunning ? PLAY_TEXT.PAUSE : PLAY_TEXT.RESUME}
                            size="sm"
                            variant="ghost"
                            onClick={onTogglePause}
                        >
                            {bar.isRunning ? <Icons.Pause className="h-4 w-4" /> : <Icons.Play className="h-4 w-4" />}
                        </IconButton>
                        {bar.alive && (
                            <IconButton
                                data-testid="play-stop-btn"
                                label={PLAY_TEXT.STOP}
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
        </>
    );
};
