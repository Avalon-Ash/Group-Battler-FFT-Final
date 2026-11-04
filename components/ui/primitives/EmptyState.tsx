import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
    icon?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
    { icon, title, description, className, ...rest },
    ref,
) {
    return (
        <div ref={ref} className={cn('flex flex-col items-center gap-2 px-4 py-6 text-center', className)} {...rest}>
            {icon ? <div className="text-fg-muted">{icon}</div> : null}
            <div className="text-ui-title text-fg-primary">{title}</div>
            {description ? <div className="text-ui-body text-fg-muted">{description}</div> : null}
        </div>
    );
});
