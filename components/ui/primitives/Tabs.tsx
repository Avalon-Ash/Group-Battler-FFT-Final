import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Tabs as RadixTabs } from 'radix-ui';
import { cn } from './cn';

export interface TabItem {
    value: string;
    label: ReactNode;
    title?: string;
}

export interface TabsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'dir' | 'onChange'> {
    value: string;
    onValueChange: (value: string) => void;
    tabs: TabItem[];
    /** 內容區：用 TabsContent 為每個分頁包一段，標籤的 aria-controls 才有對應節點。 */
    children?: ReactNode;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
    { value, onValueChange, tabs, children, className, ...rest },
    ref,
) {
    return (
        <RadixTabs.Root ref={ref} value={value} onValueChange={onValueChange} className={cn('flex flex-col gap-3', className)} {...rest}>
            <RadixTabs.List className="ui-tablist flex flex-wrap items-end gap-1">
                {tabs.map((tab) => (
                    <RadixTabs.Trigger key={tab.value} value={tab.value} title={tab.title} className="ui-tab ui-heading h-control-sm px-3">
                        {tab.label}
                    </RadixTabs.Trigger>
                ))}
            </RadixTabs.List>
            {children}
        </RadixTabs.Root>
    );
});

export const TabsContent = RadixTabs.Content;
