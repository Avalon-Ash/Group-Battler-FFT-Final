import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

/** Button 與 IconButton 共用的材質與尺寸變體（材質類別定義在 index.css）。 */
export const buttonVariants = cva(
    'ctl inline-flex items-center gap-2 text-ui-body font-bold whitespace-nowrap select-none',
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
                /** 多行內容用 */
                auto: 'h-auto',
            },
            /** cn 不解 class 衝突，疊在內建值上的 justify-* 不一定生效，所以對齊也是變體 */
            align: {
                center: 'justify-center',
                start: 'justify-start',
                between: 'justify-between',
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
        defaultVariants: { variant: 'secondary', size: 'md', align: 'center', square: false },
    },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;
type ButtonAlign = NonNullable<VariantProps<typeof buttonVariants>['align']>;

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    align?: ButtonAlign;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant, size, align, className, type = 'button', ...rest },
    ref,
) {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, align }), className)} {...rest} />;
});
