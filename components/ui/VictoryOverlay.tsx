import React from 'react';
import { BattleSetup, Team } from '../../types';
import { getFactionSkin } from '../../data/units/factionSkin';
import { UI_Z } from '../../constants';
import { Button } from './primitives';
import { Icons } from './icons';
import { cn } from './primitives/cn';

export interface VictoryOverlayProps {
    winner: Team;
    winnerId?: string | null;
    winnerSide?: number | null;
    battleSetup?: BattleSetup;
    isCompact?: boolean;
    nextLevel: () => void;
    onOpenLogs: () => void;
    rematch: () => void;
}

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
    winner,
    winnerId,
    winnerSide,
    battleSetup,
    isCompact,
    nextLevel,
    onOpenLogs,
    rematch,
}) => {
    const winnerName = !battleSetup || battleSetup.factions === 2
        ? getFactionSkin(winner).name
        : battleSetup.unitsPerFaction === 1
            ? (winnerId ? `最後倖存者 (${winnerId})` : '最後倖存者')
            : `第 ${(winnerSide ?? 0) + 1} 陣營`;

    return (
        <div
            className="pointer-events-auto absolute inset-0 flex overflow-y-auto ui-scrim mat-blur"
            style={{ zIndex: UI_Z.OVERLAY }}
        >
            <div
                className={cn(
                    'shell shell-window rounded-ui-window m-auto flex w-full max-w-lg flex-col items-center text-center',
                    isCompact ? 'p-5 gap-3' : 'p-8 gap-5',
                )}
            >
                <div className={isCompact ? 'space-y-1' : 'space-y-2'}>
                    <span className="ui-heading text-ui-label text-fg-muted block">
                        戰鬥模擬演算結束
                    </span>
                    <h2
                        className={cn(
                            'ui-heading text-ui-display',
                            winner === Team.BLUE ? 'text-accent' : 'text-danger',
                        )}
                    >
                        {winnerName}
                    </h2>
                    <h3 className="ui-heading text-ui-title text-fg-primary">
                        VICTORY
                    </h3>
                </div>

                <div className={cn('h-px w-24 mx-auto bg-line-subtle/20 rounded-ui-pill', isCompact ? 'mb-2' : 'mb-4')} />

                <div className="flex flex-col gap-3 w-full">
                    <Button
                        variant="primary"
                        size={isCompact ? 'sm' : 'md'}
                        onClick={nextLevel}
                        className="w-full"
                    >
                        <Icons.Dice className="h-4 w-4" />
                        <span>前進下一關</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size={isCompact ? 'sm' : 'md'}
                        onClick={onOpenLogs}
                        className="w-full"
                    >
                        <Icons.Log className="h-4 w-4" />
                        <span>戰鬥記錄</span>
                    </Button>
                    <Button
                        variant="secondary"
                        size={isCompact ? 'sm' : 'md'}
                        onClick={rematch}
                        className="w-full"
                    >
                        <Icons.Restart className="h-4 w-4" />
                        <span>再戰一局</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
