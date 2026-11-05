import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Tooltip as RadixTooltip } from 'radix-ui';
import { UI_Z } from '../../../constants';

const SIDE_OFFSET_PX = 6;

export interface TooltipProps {
    content: ReactNode;
    /** 觸發元件（asChild）：必須能接 ref 並展開其餘屬性，Button／IconButton 都可以。 */
    children: ReactNode;
    delayDuration?: number;
    side?: ComponentPropsWithoutRef<typeof RadixTooltip.Content>['side'];
}

export function Tooltip({ content, children, side, delayDuration }: TooltipProps) {
    return (
        <RadixTooltip.Provider>
            <RadixTooltip.Root delayDuration={delayDuration}>
                <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
                <RadixTooltip.Portal>
                    <RadixTooltip.Content
                        side={side}
                        sideOffset={SIDE_OFFSET_PX}
                        className="shell shell-popover mat-blur rounded-ui-control px-2 py-1 text-ui-label text-fg-primary"
                        style={{ zIndex: UI_Z.POPOVER }}
                    >
                        {content}
                    </RadixTooltip.Content>
                </RadixTooltip.Portal>
            </RadixTooltip.Root>
        </RadixTooltip.Provider>
    );
}
