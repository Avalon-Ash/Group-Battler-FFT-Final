import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

/** Button 與 IconButton 共用的材質與尺寸變體（材質類別定義在 index.css）。 */
export const buttonVariants = cva(
    'ctl inline-flex items-center justify-center gap-2 text-ui-body font-bold whitespace-nowrap select-none',
    {
        variants: {
            variant: {
                secondary: '',
                primary: 'ctl-primary',
                danger: 'ctl-danger',
                ghost: 'ctl-ghost',
            },
            size: {
                md: 'h-control',
                sm: 'h-control-sm',
            },
            square: {
                true: 'px-0',
                false: '',
            },
        },
        compoundVariants: [
            { square: false, size: 'md', className: 'px-4' },
            { square: false, size: 'sm', className: 'px-3' },
            { square: true, size: 'md', className: 'w-control' },
            { square: true, size: 'sm', className: 'w-control-sm' },
        ],
        defaultVariants: { variant: 'secondary', size: 'md', square: false },
    },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, className, type = 'button', ...rest },
    ref,
) {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...rest} />;
});
