import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { ToggleGroup } from 'radix-ui';
import { cn } from './cn';

export interface SegmentedOption {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    title?: string;
    disabled?: boolean;
}

export interface SegmentedProps extends Omit<ComponentPropsWithoutRef<'div'>, 'dir' | 'onChange' | 'aria-label'> {
    value: string;
    onValueChange: (value: string) => void;
    options: SegmentedOption[];
    ariaLabel: string;
}

export const Segmented = forwardRef<HTMLDivElement, SegmentedProps>(function Segmented(
    { value, onValueChange, options, ariaLabel, className, ...rest },
    ref,
) {
    return (
        <ToggleGroup.Root
            ref={ref}
            type="single"
            value={value}
            // 單選不可取消：Radix 在重按已選項時會送空字串，直接忽略。
            onValueChange={(next) => { if (next) onValueChange(next); }}
            aria-label={ariaLabel}
            className={cn('well inline-flex w-fit max-w-full items-center gap-1 p-1', className)}
            {...rest}
        >
            {options.map((opt) => (
                <ToggleGroup.Item
                    key={opt.value}
                    value={opt.value}
                    title={opt.title}
                    disabled={opt.disabled}
                    className="ctl ctl-ghost inline-flex h-control-sm items-center justify-center gap-1 px-3 text-ui-body font-bold whitespace-nowrap"
                >
                    {opt.icon}
                    {opt.label}
                </ToggleGroup.Item>
            ))}
        </ToggleGroup.Root>
    );
});
