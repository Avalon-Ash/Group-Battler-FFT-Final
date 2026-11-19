import { forwardRef, isValidElement, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Popover } from 'radix-ui';
import { UI_Z } from '../../../constants';
import { COMBOBOX_TEXT } from '../../../data/ui/labels/primitives';
import { Icons } from '../icons';
import { cn } from './cn';
import type { SelectOption, SelectProps } from './Select';

const SIDE_OFFSET_PX = 4;

interface ComboboxProps extends SelectProps {
    searchPlaceholder?: string;
    emptyText?: string;
}

const labelText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(labelText).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return labelText(node.props.children);
    return '';
};

const stepEnabled = (list: SelectOption[], cur: number, dir: 1 | -1): number => {
    const n = list.length;
    if (n === 0) return -1;
    const start = cur < 0 ? (dir > 0 ? -1 : 0) : cur;
    for (let step = 1; step <= n; step++) {
        const idx = (start + dir * step + n) % n;
        if (!list[idx].disabled) return idx;
    }
    return -1;
};

export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(
    {
        value, onValueChange, options, groups, placeholder, ariaLabel, size = 'md', disabled, className,
        searchPlaceholder = COMBOBOX_TEXT.searchPlaceholder, emptyText = COMBOBOX_TEXT.empty, ...rest
    },
    ref,
) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    const { all, flat, topOptions, filteredGroups, indexOf, selected } = useMemo(() => {
        const allOpts = [...(options ?? []), ...(groups?.flatMap((g) => g.options) ?? [])];
        const q = query.trim().toLowerCase();
        const match = (o: SelectOption) => !q || labelText(o.label).toLowerCase().includes(q);
        const top = (options ?? []).filter(match);
        const grp = (groups ?? []).map((g) => ({ label: g.label, options: g.options.filter(match) })).filter((g) => g.options.length > 0);
        const flatList = [...top, ...grp.flatMap((g) => g.options)];
        const idxMap = new Map(flatList.map((o, i) => [o, i]));
        return { all: allOpts, flat: flatList, topOptions: top, filteredGroups: grp, indexOf: idxMap, selected: allOpts.find((o) => o.value === value) };
    }, [options, groups, value, query]);

    const safeActive = activeIndex >= 0 && activeIndex < flat.length && !flat[activeIndex].disabled ? activeIndex : stepEnabled(flat, -1, 1);
    const activeId = safeActive >= 0 ? `${listboxId}-opt-${safeActive}` : undefined;
    const triggerText = (selected ? labelText(selected.label) : (placeholder ?? '')).trim();
    const triggerLabel = triggerText ? `${ariaLabel}: ${triggerText}` : ariaLabel;

    useEffect(() => { if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' }); }, [open, activeId]);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        setQuery('');
        if (next) {
            const idx = all.findIndex((o) => o.value === value && !o.disabled);
            setActiveIndex(idx >= 0 ? idx : stepEnabled(all, -1, 1));
        }
    };

    const choose = (opt: SelectOption) => { if (!opt.disabled) { onValueChange(opt.value); handleOpenChange(false); } };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(stepEnabled(flat, safeActive, 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(stepEnabled(flat, safeActive, -1)); }
        else if (e.key === 'Home') { e.preventDefault(); setActiveIndex(stepEnabled(flat, -1, 1)); }
        else if (e.key === 'End') { e.preventDefault(); setActiveIndex(stepEnabled(flat, 0, -1)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (safeActive >= 0) choose(flat[safeActive]); }
    };

    const renderOption = (opt: SelectOption) => {
        const idx = indexOf.get(opt) ?? -1;
        const isSelected = opt.value === value;
        return (
            <div
                key={opt.value} id={`${listboxId}-opt-${idx}`} role="option"
                aria-selected={isSelected} aria-disabled={opt.disabled || undefined}
                data-highlighted={idx === safeActive ? '' : undefined} data-state={isSelected ? 'checked' : 'unchecked'} data-disabled={opt.disabled ? '' : undefined}
                onMouseEnter={() => { if (!opt.disabled) setActiveIndex(idx); }} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(opt)}
                className="ui-option flex h-control-sm items-center gap-2 px-3 text-ui-body"
            >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
                {isSelected && <Icons.Check className="ml-auto h-4 w-4 shrink-0" />}
            </div>
        );
    };

    return (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild>
                <button
                    ref={ref} type="button" aria-label={triggerLabel} disabled={disabled}
                    className={cn('ctl inline-flex items-center justify-between gap-2 px-3 text-ui-body', size === 'sm' ? 'h-control-sm' : 'h-control', className)}
                    {...rest}
                >
                    <span className={cn('truncate', !selected && 'text-fg-muted')}>{selected ? selected.label : placeholder}</span>
                    <Icons.ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    align="start" sideOffset={SIDE_OFFSET_PX} aria-label={ariaLabel}
                    onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
                    className="shell shell-popover mat-blur ui-select-content rounded-ui-card"
                    style={{ zIndex: UI_Z.POPOVER, minWidth: 'var(--radix-popover-trigger-width)', maxHeight: 'var(--radix-popover-content-available-height)' }}
                >
                    <div className="p-1">
                        <input
                            ref={inputRef} type="text" role="combobox" autoComplete="off" spellCheck={false}
                            aria-expanded={open} aria-controls={listboxId} aria-autocomplete="list" aria-activedescendant={activeId} aria-label={ariaLabel}
                            placeholder={searchPlaceholder} value={query}
                            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown}
                            className="well h-control-sm w-full min-w-0 px-3 text-ui-body placeholder:text-fg-muted"
                        />
                    </div>
                    <div id={listboxId} role="listbox" aria-label={ariaLabel} className={cn('ui-scroll max-h-72 flex-1', flat.length > 0 && 'p-1 pt-0')}>
                        {topOptions.map(renderOption)}
                        {filteredGroups.map((group, gi) => (
                            <div key={group.label} role="group" aria-labelledby={`${listboxId}-grp-${gi}`}>
                                <div id={`${listboxId}-grp-${gi}`} role="presentation" className="ui-heading px-3 py-1 text-fg-muted">{group.label}</div>
                                {group.options.map(renderOption)}
                            </div>
                        ))}
                    </div>
                    {flat.length === 0 && <div className="px-3 py-2 text-ui-body text-fg-muted">{emptyText}</div>}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
});
