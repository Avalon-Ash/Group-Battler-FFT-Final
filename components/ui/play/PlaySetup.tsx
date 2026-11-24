import React, { useMemo, useState } from 'react';
import { Role } from '../../../types';
import type { PlayHero } from '../../../types';
import { UI_Z } from '../../../constants';
import { ROLE_LABEL, SKILL_TAG_LABEL } from '../../../data/ui/labels/l3';
import { PLAY_TEXT } from '../../../data/ui/labels/play';
import { playLoadoutOptions } from '../../../engine/systems/ui/views/play';
import { useView } from '../../../hooks/useEnginePort';
import { Button, Combobox, Segmented } from '../primitives';
import { Icons } from '../icons';
import { cn } from '../primitives/cn';

/** 選主角畫面（PLAY P4，docs/plans/play-mode.md）：職業＋四個技能槽，「隨機」＝照一般生成抽。 */
export interface PlaySetupProps {
    isCompact?: boolean;
    onStart: (hero: PlayHero) => void;
    onCancel: () => void;
}

const ROLES: readonly Role[] = [Role.TANK, Role.WARRIOR, Role.RANGER, Role.MAGE, Role.SUPPORT];
const ROLE_ICON: Readonly<Record<Role, React.ComponentType<{ className?: string }>>> = {
    [Role.TANK]: Icons.RoleTank,
    [Role.WARRIOR]: Icons.RoleWarrior,
    [Role.RANGER]: Icons.RoleRanger,
    [Role.MAGE]: Icons.RoleMage,
    [Role.SUPPORT]: Icons.RoleSupport,
};
/** 技能槽的「隨機」選項值（PlayHero.skillIds 該槽為 undefined） */
const RANDOM = '';

export const PlaySetup: React.FC<PlaySetupProps> = ({ isCompact, onStart, onCancel }) => {
    const db = useView((engine) => engine.skillDB);
    const [role, setRole] = useState<Role>(Role.WARRIOR);
    const [picks, setPicks] = useState<Readonly<Partial<Record<Role, readonly string[]>>>>({});
    const slots = useMemo(() => (db ? playLoadoutOptions(db, role) : []), [db, role]);
    const chosen = picks[role] ?? slots.map(() => RANDOM);

    const setSlot = (slot: number, value: string) => {
        const next = [...chosen];
        next[slot] = value;
        setPicks((p) => ({ ...p, [role]: next }));
    };
    const start = () => onStart({ role, skillIds: chosen.map((id) => (id === RANDOM ? undefined : id)) });

    return (
        <div
            data-testid="play-setup"
            className="pointer-events-auto absolute inset-0 flex overflow-y-auto ui-scrim mat-blur"
            style={{ zIndex: UI_Z.OVERLAY }}
        >
            <div className={cn('play-setup-panel shell shell-window rounded-ui-window m-auto flex w-full max-w-lg flex-col', isCompact ? 'p-5 gap-3' : 'p-8 gap-5')}>
                <header className="play-setup-head space-y-1 text-center">
                    <span className="ui-heading text-ui-label text-fg-muted block">{PLAY_TEXT.SETUP_KICKER}</span>
                    <h2 className="ui-heading text-ui-title text-fg-primary">{PLAY_TEXT.SETUP_TITLE}</h2>
                </header>

                <Segmented
                    className="play-setup-roles self-center"
                    ariaLabel={PLAY_TEXT.ROLE_ARIA}
                    value={role}
                    onValueChange={(v) => { if (v) setRole(v as Role); }}
                    options={ROLES.map((r) => {
                        const Icon = ROLE_ICON[r];
                        return { value: r, label: ROLE_LABEL[r], title: ROLE_LABEL[r], icon: <Icon className="play-role-icon h-4 w-4" />, testId: `play-role-${r}` };
                    })}
                />

                <div className="play-setup-slots flex flex-col gap-2">
                    {slots.map((s) => (
                        <label key={s.slot} className="flex items-center gap-3">
                            <span className="w-16 shrink-0 text-ui-label text-fg-muted">{SKILL_TAG_LABEL[s.tag]}</span>
                            <Combobox
                                data-testid={`play-slot-${s.slot}`}
                                ariaLabel={`${SKILL_TAG_LABEL[s.tag]}技能`}
                                value={chosen[s.slot] ?? RANDOM}
                                onValueChange={(v) => setSlot(s.slot, v)}
                                options={[{ value: RANDOM, label: PLAY_TEXT.RANDOM }, ...s.skills.map((k) => ({ value: k.id, label: k.name }))]}
                                size={isCompact ? 'sm' : 'md'}
                                className="min-w-0 flex-1"
                            />
                        </label>
                    ))}
                </div>

                <div className="play-setup-actions flex gap-3">
                    <Button data-testid="play-cancel-btn" variant="secondary" size={isCompact ? 'sm' : 'md'} onClick={onCancel} className="flex-1">
                        <Icons.Close className="h-4 w-4" />
                        <span>{PLAY_TEXT.CANCEL}</span>
                    </Button>
                    <Button data-testid="play-start-btn" variant="primary" size={isCompact ? 'sm' : 'md'} onClick={start} className="flex-1">
                        <Icons.Play className="h-4 w-4" />
                        <span>{PLAY_TEXT.START}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};

