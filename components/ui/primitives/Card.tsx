import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const cardVariants = cva('card', {
    variants: {
        padding: { none: 'p-0', sm: 'p-2', md: 'p-3', lg: 'p-4' },
    },
    defaultVariants: { padding: 'md' },
});

export interface CardProps extends ComponentPropsWithoutRef<'div'>, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ padding, className, ...rest }, ref) {
    return <div ref={ref} className={cn(cardVariants({ padding }), className)} {...rest} />;
});
