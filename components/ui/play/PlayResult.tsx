import React from 'react';
import { UI_Z } from '../../../constants';
import { Button } from '../primitives';
import { Icons } from '../icons';
import { cn } from '../primitives/cn';
import { PLAY_OUTCOME_TITLE, PLAY_TEXT } from '../../../data/ui/labels/play';

/** PLAY 的結算（P4）：從主角陣營看勝負；再來一場（同一個主角設定）或回主畫面。 */
export interface PlayResultProps {
    outcome: 'WIN' | 'LOSE' | 'DRAW';
    isCompact?: boolean;
    onNext: () => void;
    onMenu: () => void;
    onOpenLogs: () => void;
}

const TONE: Readonly<Record<PlayResultProps['outcome'], string>> = { WIN: 'text-accent', LOSE: 'text-danger', DRAW: 'text-fg-primary' };

export const PlayResult: React.FC<PlayResultProps> = ({ outcome, isCompact, onNext, onMenu, onOpenLogs }) => (
    <div
        data-testid="play-result"
        data-outcome={outcome}
        className="pointer-events-auto absolute inset-0 flex overflow-y-auto ui-scrim mat-blur"
        style={{ zIndex: UI_Z.OVERLAY }}
    >
        <div className={cn('shell shell-window rounded-ui-window m-auto flex w-full max-w-sm flex-col items-center text-center', isCompact ? 'p-5 gap-3' : 'p-8 gap-5')}>
            <span className="ui-heading text-ui-label text-fg-muted block">{PLAY_TEXT.SETUP_KICKER}</span>
            <h2 className={cn('ui-heading text-ui-display', TONE[outcome])}>{PLAY_OUTCOME_TITLE[outcome]}</h2>
            <div className="flex flex-col gap-3 w-full">
                <Button data-testid="play-next-btn" variant="primary" size={isCompact ? 'sm' : 'md'} onClick={onNext} className="w-full">
                    <Icons.Restart className="h-4 w-4" />
                    <span>{PLAY_TEXT.NEXT}</span>
                </Button>
                <Button variant="secondary" size={isCompact ? 'sm' : 'md'} onClick={onOpenLogs} className="w-full">
                    <Icons.Log className="h-4 w-4" />
                    <span>{PLAY_TEXT.LOGS}</span>
                </Button>
                <Button data-testid="play-menu-btn" variant="secondary" size={isCompact ? 'sm' : 'md'} onClick={onMenu} className="w-full">
                    <Icons.Close className="h-4 w-4" />
                    <span>{PLAY_TEXT.MENU}</span>
                </Button>
            </div>
        </div>
    </div>
);

