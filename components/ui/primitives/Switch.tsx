import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export interface SwitchProps extends Omit<ComponentPropsWithoutRef<'span'>, 'onChange' | 'aria-label'> {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
    disabled?: boolean;
    /** data-testid 放在 input 上（外層 wrapper 的 data-testid 走一般屬性）。 */
    inputTestId?: string;
}

/** 原生 checkbox（role=switch）：isChecked() 與空白鍵行為不變。外觀在 index.css（.ui-switch）。 */
export const Switch = forwardRef<HTMLSpanElement, SwitchProps>(function Switch(
    { checked, onChange, ariaLabel, disabled, inputTestId, className, ...rest },
    ref,
) {
    return (
        <span ref={ref} className={cn('ui-switch inline-flex items-center', className)} {...rest}>
            <input
                type="checkbox"
                role="switch"
                data-testid={inputTestId}
                aria-label={ariaLabel}
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
            />
        </span>
    );
});
