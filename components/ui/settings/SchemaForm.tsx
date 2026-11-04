import React from 'react';
import { SettingField, ToggleSettingField, SliderSettingField } from '../../../data/ui/settingsSchema';
import { UICommand } from '../../../types';
import { Button, SectionHeading, SettingRow, Slider, Switch } from '../primitives';

export interface SchemaFormProps {
    fields: SettingField[];
    values: Record<string, boolean | number | undefined>;
    onChange: (cmd: UICommand) => void;
    className?: string;
}

export const SchemaForm: React.FC<SchemaFormProps> = ({
    fields,
    values,
    onChange,
    className,
}) => {
    const containerClass = className
        ? `flex flex-col gap-4 max-w-2xl mx-auto w-full pb-4 ${className}`
        : 'flex flex-col gap-4 max-w-2xl mx-auto w-full pb-4';

    return (
        <div className={containerClass}>
            {fields.map((field) => {
                const val = values[field.id];
                if (field.kind === 'heading') {
                    return (
                        <SectionHeading
                            key={field.id}
                            data-testid={`setting-heading-${field.id}`}
                        >
                            {field.label}
                        </SectionHeading>
                    );
                }

                if (field.kind === 'toggle') {
                    const toggleField = field as ToggleSettingField;
                    const checked = Boolean(val ?? false);
                    return (
                        <SettingRow
                            key={field.id}
                            label={field.label}
                            description={field.description}
                        >
                            <Switch
                                checked={checked}
                                ariaLabel={field.label}
                                inputTestId={`setting-toggle-${field.id}`}
                                onChange={(next) => onChange(toggleField.createCommand(next))}
                            />
                        </SettingRow>
                    );
                }

                if (field.kind === 'slider') {
                    const sliderField = field as SliderSettingField;
                    const numVal = typeof val === 'number' ? val : sliderField.min;
                    const dynamicMax =
                        sliderField.maxValueId && typeof values[sliderField.maxValueId] === 'number'
                            ? (values[sliderField.maxValueId] as number)
                            : sliderField.max;
                    const displayVal = sliderField.format
                        ? sliderField.format(numVal)
                        : String(numVal);

                    return (
                        <div key={field.id} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-ui-body text-fg-primary">{field.label}</div>
                                    {field.description && (
                                        <div className="text-ui-label text-fg-muted">{field.description}</div>
                                    )}
                                </div>
                                <span className="font-mono text-ui-num text-fg-secondary shrink-0">
                                    {displayVal}
                                </span>
                            </div>
                            <Slider
                                min={sliderField.min}
                                max={dynamicMax}
                                step={sliderField.step}
                                value={numVal}
                                ariaLabel={field.label}
                                className="setting-slider"
                                inputTestId={`setting-slider-${field.id}`}
                                onChange={(parsed) => onChange(sliderField.createCommand(parsed))}
                            />
                        </div>
                    );
                }

                if (field.kind === 'action') {
                    return (
                        <div key={field.id} className="flex flex-col gap-1">
                            <Button
                                variant="primary"
                                title={field.label}
                                data-testid={`setting-action-${field.id}`}
                                onClick={() => onChange(field.createCommand())}
                                className="w-full"
                            >
                                {field.label}
                            </Button>
                            {field.description && (
                                <p className="text-center text-ui-label text-fg-muted">{field.description}</p>
                            )}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
};
