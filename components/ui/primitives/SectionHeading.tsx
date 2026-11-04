import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface SectionHeadingProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    children: ReactNode;
    /** 右側動作（按鈕、標籤等）。 */
    action?: ReactNode;
}

export const SectionHeading = forwardRef<HTMLDivElement, SectionHeadingProps>(function SectionHeading(
    { children, action, className, ...rest },
    ref,
) {
    return (
        <div ref={ref} className={cn('flex items-center justify-between gap-2', className)} {...rest}>
            <h3 className="ui-heading text-fg-muted">{children}</h3>
            {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
    );
});
