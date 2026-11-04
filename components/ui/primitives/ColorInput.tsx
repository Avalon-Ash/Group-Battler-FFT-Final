import { forwardRef, useState, type ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';
import { Input } from './Input';

export interface ColorInputProps extends Omit<ComponentPropsWithoutRef<'span'>, 'onChange' | 'aria-label'> {
    /** 十六進位色碼（六碼，含 #）。 */
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
    disabled?: boolean;
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

export const ColorInput = forwardRef<HTMLSpanElement, ColorInputProps>(function ColorInput(
    { value, onChange, ariaLabel, disabled, className, ...rest },
    ref,
) {
    const [draft, setDraft] = useState<string | null>(null);

    const commit = () => {
        if (draft === null) return;
        setDraft(null);
        if (HEX_PATTERN.test(draft)) onChange(draft.toLowerCase());
    };

    return (
        <span ref={ref} className={cn('inline-flex items-center gap-2', className)} {...rest}>
            <input
                type="color"
                aria-label={ariaLabel}
                disabled={disabled}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="well h-control w-control shrink-0 cursor-pointer p-1"
            />
            <Input
                aria-label={`${ariaLabel} hex`}
                disabled={disabled}
                value={draft ?? value}
                maxLength={7}
                spellCheck={false}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    else if (e.key === 'Escape') setDraft(null);
                }}
                className="font-mono"
            />
        </span>
    );
});
