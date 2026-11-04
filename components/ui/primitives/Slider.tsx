import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from 'react';
import { cn } from './cn';

export interface SliderProps extends Omit<ComponentPropsWithoutRef<'span'>, 'onChange' | 'aria-label'> {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    ariaLabel: string;
    disabled?: boolean;
    /** data-testid 放在 input 上（外層 wrapper 的 data-testid 走一般屬性）。 */
    inputTestId?: string;
}

/** 原生 range input：現有 e2e 的 inputValue() 與鍵盤行為不變。軌道與圓鈕樣式在 index.css（.ui-slider）。 */
export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
    { value, onChange, min, max, step, ariaLabel, disabled, inputTestId, className, ...rest },
    ref,
) {
    const span = max - min;
    const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
    const fill = { '--slider-pct': `${pct}%` } as CSSProperties;
    return (
        <span ref={ref} className={cn('ui-slider flex w-full items-center', className)} {...rest}>
            <input
                type="range"
                data-testid={inputTestId}
                aria-label={ariaLabel}
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                style={fill}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </span>
    );
});
