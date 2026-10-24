import React, { useState, useEffect, useRef } from 'react';
import type { SkillEditableField } from '../../../data/ui/skillEditor';
import { validateSkillFieldValue, isSkillFieldOptional } from '../../../data/ui/skillEditor';

interface SkillNumberInputProps {
    field: SkillEditableField;
    value: number | undefined;
    step?: number;
    className?: string;
    onCommit: (field: SkillEditableField, value: number | undefined) => void;
}

export const SkillNumberInput: React.FC<SkillNumberInputProps> = ({
    field,
    value,
    step = 1,
    className = 'liquid-input w-full h-9 text-xs font-mono !bg-black/50 !rounded-xl',
    onCommit,
}) => {
    const isOptional = isSkillFieldOptional(field);
    const toDraftString = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? '' : String(v));

    const [draft, setDraft] = useState<string>(() => toDraftString(value));
    const [isFocused, setIsFocused] = useState(false);
    const lastCommittedRef = useRef<number | undefined>(value);
    const isCancellingRef = useRef(false);

    // Sync external value when NOT focused/editing
    useEffect(() => {
        if (!isFocused) {
            setDraft(toDraftString(value));
            lastCommittedRef.current = value;
        }
    }, [value, isFocused]);

    const parseCompleteNumber = (raw: string): { parsed: number | undefined; isValid: boolean } => {
        const trimmed = raw.trim();
        if (trimmed === '') {
            return isOptional
                ? { parsed: undefined, isValid: true }
                : { parsed: undefined, isValid: false };
        }
        // Strict complete number regex (no trailing chars like '12abc', no hex, no Infinity)
        if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) {
            return { parsed: undefined, isValid: false };
        }
        const n = Number(trimmed);
        if (!Number.isFinite(n)) {
            return { parsed: undefined, isValid: false };
        }
        // Domain validation from data/ui/skillEditor.ts
        if (!validateSkillFieldValue(field, n)) {
            return { parsed: undefined, isValid: false };
        }
        return { parsed: n, isValid: true };
    };

    const commitDraft = () => {
        const { parsed, isValid } = parseCompleteNumber(draft);
        if (isValid) {
            // Deduplicate: avoid re-sending the same update on blur after Enter
            if (!Object.is(parsed, lastCommittedRef.current)) {
                lastCommittedRef.current = parsed;
                onCommit(field, parsed);
            }
            setDraft(toDraftString(parsed));
        } else {
            // Restore current engine value on blur if draft is invalid
            setDraft(toDraftString(value));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            isCancellingRef.current = true;
            setDraft(toDraftString(value));
            e.currentTarget.blur();
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (isCancellingRef.current) {
            isCancellingRef.current = false;
            setDraft(toDraftString(value));
            return;
        }
        commitDraft();
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const { isValid } = parseCompleteNumber(draft);

    return (
        <input
            type="number"
            step={step}
            className={className}
            value={draft}
            aria-invalid={!isValid}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};
