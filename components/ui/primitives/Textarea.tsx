import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type TextareaProps = ComponentPropsWithoutRef<'textarea'>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            className={cn('well w-full min-w-0 resize-y px-3 py-2 text-ui-body placeholder:text-fg-muted disabled:text-fg-disabled', className)}
            {...rest}
        />
    );
});
