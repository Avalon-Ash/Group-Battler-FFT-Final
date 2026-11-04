import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { Select as RadixSelect } from 'radix-ui';
import { UI_Z } from '../../../constants';
import { Icons } from '../icons';
import { cn } from './cn';

export interface SelectOption {
    value: string;
    label: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
}

export interface SelectGroup {
    label: string;
    options: SelectOption[];
}

/** Radix 不接受空字串 value：內部用保留字串代表空值，對外維持 ''。 */
const EMPTY_VALUE = '__ui_select_empty__';
const toInner = (v: string): string => (v === '' ? EMPTY_VALUE : v);
const toOuter = (v: string): string => (v === EMPTY_VALUE ? '' : v);

export interface SelectProps extends Omit<ComponentPropsWithoutRef<'button'>, 'value' | 'onChange' | 'children' | 'aria-label' | 'dir'> {
    value: string;
    onValueChange: (value: string) => void;
    options?: SelectOption[];
    groups?: SelectGroup[];
    placeholder?: string;
    ariaLabel: string;
    size?: 'md' | 'sm';
}

const renderItem = (opt: SelectOption) => (
    <RadixSelect.Item key={opt.value} value={toInner(opt.value)} disabled={opt.disabled} className="ui-option flex h-control-sm items-center gap-2 px-3 text-ui-body">
        {opt.icon}
        <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
        <RadixSelect.ItemIndicator className="ml-auto inline-flex">
            <Icons.Check className="h-4 w-4" />
        </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
);

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
    { value, onValueChange, options, groups, placeholder, ariaLabel, size = 'md', disabled, className, ...rest },
    ref,
) {
    return (
        <RadixSelect.Root value={toInner(value)} onValueChange={(next) => onValueChange(toOuter(next))} disabled={disabled}>
            <RadixSelect.Trigger
                ref={ref}
                aria-label={ariaLabel}
                className={cn(
                    'ctl inline-flex items-center justify-between gap-2 px-3 text-ui-body',
                    size === 'sm' ? 'h-control-sm' : 'h-control',
                    className,
                )}
                {...rest}
            >
                <RadixSelect.Value placeholder={placeholder} />
                <RadixSelect.Icon className="inline-flex text-fg-muted">
                    <Icons.ChevronDown className="h-4 w-4" />
                </RadixSelect.Icon>
            </RadixSelect.Trigger>
            <RadixSelect.Portal>
                <RadixSelect.Content
                    position="popper"
                    sideOffset={4}
                    className="shell shell-popover mat-blur ui-select-content rounded-ui-card"
                    style={{ zIndex: UI_Z.POPOVER }}
                >
                    <RadixSelect.Viewport className="ui-scroll p-1">
                        {options?.map(renderItem)}
                        {groups?.map((group) => (
                            <RadixSelect.Group key={group.label}>
                                <RadixSelect.Label className="ui-heading px-3 py-1 text-fg-muted">{group.label}</RadixSelect.Label>
                                {group.options.map(renderItem)}
                            </RadixSelect.Group>
                        ))}
                    </RadixSelect.Viewport>
                </RadixSelect.Content>
            </RadixSelect.Portal>
        </RadixSelect.Root>
    );
});
