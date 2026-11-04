import { forwardRef, useState, type ComponentPropsWithoutRef, type KeyboardEvent } from 'react';
import { cn } from './cn';
import { Input } from './Input';

export interface NumberInputProps extends Omit<ComponentPropsWithoutRef<'span'>, 'onChange' | 'aria-label'> {
    value: number;
    /** 只在草稿是有限數字時呼叫；空字串與非數字一律還原，絕不送出 NaN。 */
    onCommit: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    ariaLabel: string;
    disabled?: boolean;
    /** data-testid 放在 input 上（外層 wrapper 的 data-testid 走一般屬性）。 */
    inputTestId?: string;
}

/** 草稿與提交分離：輸入中只改草稿，Enter 或 blur 提交，Escape 還原。 */
export const NumberInput = forwardRef<HTMLSpanElement, NumberInputProps>(function NumberInput(
    { value, onCommit, min, max, step, ariaLabel, disabled, inputTestId, className, ...rest },
    ref,
) {
    const [draft, setDraft] = useState<string | null>(null);

    const clamp = (n: number): number => {
        let next = n;
        if (min !== undefined) next = Math.max(min, next);
        if (max !== undefined) next = Math.min(max, next);
        return next;
    };

    const commit = () => {
        if (draft === null) return;
        const text = draft.trim();
        const parsed = text === '' ? Number.NaN : Number(text);
        setDraft(null);
        if (Number.isFinite(parsed)) onCommit(clamp(parsed));
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            commit();
        } else if (e.key === 'Escape') {
            setDraft(null);
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && step !== undefined) {
            e.preventDefault();
            const base = draft !== null && Number.isFinite(Number(draft)) && draft.trim() !== '' ? Number(draft) : value;
            setDraft(null);
            onCommit(clamp(base + (e.key === 'ArrowUp' ? step : -step)));
        }
    };

    return (
        <span ref={ref} className={cn('inline-flex', className)} {...rest}>
            <Input
                type="text"
                inputMode="decimal"
                data-testid={inputTestId}
                aria-label={ariaLabel}
                disabled={disabled}
                value={draft ?? String(value)}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={onKeyDown}
            />
        </span>
    );
});
