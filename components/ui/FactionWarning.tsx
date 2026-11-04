import React from 'react';
import { Icons } from './icons';
import { UI_Z } from '../../constants';

export interface FactionWarningProps {
    show: boolean;
}

export const FactionWarning: React.FC<FactionWarningProps> = ({ show }) => {
    if (!show) return null;

    return (
        <div
            className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none w-11/12 max-w-md animate-bounce"
            style={{ zIndex: UI_Z.OVERLAY }}
        >
            <div className="shell shell-popover mat-blur rounded-ui-card px-4 py-3 border-danger/50 flex items-center gap-3 shadow-lg">
                <Icons.Warning className="w-5 h-5 text-text-danger shrink-0" />
                <div className="flex flex-col">
                    <span className="ui-heading text-text-danger">DEPLOYMENT ERROR</span>
                    <span className="text-ui-body text-fg-secondary">請部署雙方單位以開始戰鬥。</span>
                </div>
            </div>
        </div>
    );
};
