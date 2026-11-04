import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const tagVariants = cva(
    'inline-flex items-center gap-1 rounded-ui-tag border px-2 text-ui-num font-bold uppercase tracking-wider whitespace-nowrap',
    {
        variants: {
            tone: {
                neutral: 'border-line-default bg-surface-slot/60 text-fg-secondary',
                accent: 'border-accent/50 bg-accent/15 text-accent',
                danger: 'border-danger/50 bg-danger/15 text-text-danger',
                warn: 'border-warn/50 bg-warn/15 text-text-warn',
                success: 'border-success/50 bg-success/15 text-success-hover',
                blue: 'border-team-blue-primary/60 bg-team-blue-primary/25 text-fg-primary',
                red: 'border-team-red-primary/60 bg-team-red-primary/25 text-fg-primary',
            },
        },
        defaultVariants: { tone: 'neutral' },
    },
);

export interface TagProps extends ComponentPropsWithoutRef<'span'>, VariantProps<typeof tagVariants> {}

/** 狀態標籤：不可點，要互動請用 Button。 */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag({ tone, className, ...rest }, ref) {
    return <span ref={ref} className={cn(tagVariants({ tone }), className)} {...rest} />;
});
