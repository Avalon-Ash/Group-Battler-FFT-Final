import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from './cn';

export interface SettingRowProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
    label: ReactNode;
    description?: ReactNode;
    /** 右側控制項；窄視窗放不下時整組換到下一行。 */
    children: ReactNode;
}

export const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(function SettingRow(
    { label, description, children, className, ...rest },
    ref,
) {
    return (
        <div ref={ref} className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2', className)} {...rest}>
            <div className="min-w-0 grow basis-40">
                <div className="text-ui-body text-fg-primary">{label}</div>
                {description ? <div className="text-ui-label text-fg-muted">{description}</div> : null}
            </div>
            <div className="flex max-w-full shrink-0 items-center gap-2">{children}</div>
        </div>
    );
});
