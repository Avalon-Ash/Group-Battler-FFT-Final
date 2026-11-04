import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const trackVariants = cva('w-full overflow-hidden rounded-ui-pill bg-surface-dark/40', {
    variants: {
        size: { sm: 'h-1.5', md: 'h-2.5' },
    },
    defaultVariants: { size: 'md' },
});

const fillVariants = cva('h-full rounded-ui-pill', {
    variants: {
        tone: {
            neutral: 'bg-fg-muted',
            accent: 'bg-accent',
            danger: 'bg-danger',
            warn: 'bg-warn',
            success: 'bg-success',
            blue: 'bg-team-blue-primary',
            red: 'bg-team-red-primary',
        },
    },
    defaultVariants: { tone: 'accent' },
});

export interface MeterProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'>, VariantProps<typeof fillVariants>, VariantProps<typeof trackVariants> {
    value: number;
    max: number;
    /** 左側文字，同時是無障礙名稱（沒給就必須傳 aria-label）。 */
    label?: ReactNode;
    showValue?: boolean;
}

export const Meter = forwardRef<HTMLDivElement, MeterProps>(function Meter(
    { value, max, tone, size, label, showValue, className, ...rest },
    ref,
) {
    const clamped = Math.min(max, Math.max(0, value));
    const pct = max > 0 ? (clamped / max) * 100 : 0;
    const name = typeof label === 'string' ? label : undefined;
    return (
        <div ref={ref} className={cn('flex flex-col gap-1', className)} {...rest}>
            {label !== undefined || showValue ? (
                <div className="flex items-baseline justify-between gap-2 text-ui-label text-fg-secondary">
                    <span>{label}</span>
                    {showValue ? <span className="font-mono text-ui-num text-fg-muted">{Math.round(clamped)} / {max}</span> : null}
                </div>
            ) : null}
            <div
                role="meter"
                aria-label={name ?? rest['aria-label']}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={clamped}
                className={trackVariants({ size })}
            >
                <div className={fillVariants({ tone })} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
});
