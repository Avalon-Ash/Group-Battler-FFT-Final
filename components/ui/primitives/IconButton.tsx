import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { buttonVariants, type ButtonSize, type ButtonVariant } from './Button';
import { cn } from './cn';

export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'title'> {
    /** 必填：同時寫進 aria-label 與 title。 */
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { label, variant, size, className, type = 'button', children, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={cn(buttonVariants({ variant, size, square: true }), className)}
            {...rest}
        >
            {children}
        </button>
    );
});
