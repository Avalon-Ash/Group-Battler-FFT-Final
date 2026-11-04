import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type InputProps = ComponentPropsWithoutRef<'input'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, type = 'text', ...rest }, ref) {
    return (
        <input
            ref={ref}
            type={type}
            className={cn('well h-control w-full min-w-0 px-3 text-ui-body placeholder:text-fg-muted disabled:text-fg-disabled', className)}
            {...rest}
        />
    );
});
