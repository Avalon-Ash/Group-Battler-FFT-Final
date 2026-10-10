import React from 'react';
import { SettingField, ToggleSettingField, SliderSettingField } from '../../../data/ui/settingsSchema';
import { UICommand } from '../../../types';

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
    className = 'space-y-5',
}) => {
    return (
        <div className={className}>
            {fields.map((field) => {
                const val = values[field.id];
                if (field.kind === 'toggle') {
                    const toggleField = field as ToggleSettingField;
                    const checked = Boolean(val ?? false);
                    return (
                        <div
                            key={field.id}
                            className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5"
                        >
                            <span className="text-[10px] font-bold text-white/60 uppercase">
                                {field.label}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={checked}
                                    data-testid={`setting-toggle-${field.id}`}
                                    onChange={(e) => onChange(toggleField.createCommand(e.target.checked))}
                                />
                                <div
                                    className={`w-9 h-5 rounded-full transition-colors relative after:content-[''] after:absolute after:top-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${
                                        checked
                                            ? 'after:translate-x-4 after:left-[4px]'
                                            : 'after:left-[2px]'
                                    }`}
                                    style={{
                                        backgroundColor: checked ? '#06b6d4' : '#334155',
                                    }}
                                />
                            </label>
                        </div>
                    );
                }

                if (field.kind === 'slider') {
                    const sliderField = field as SliderSettingField;
                    const numVal = typeof val === 'number' ? val : sliderField.min;
                    const displayVal = sliderField.format
                        ? sliderField.format(numVal)
                        : String(numVal);

                    return (
                        <div key={field.id} className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-white/50 font-bold uppercase tracking-wider">
                                <span>{field.label}</span>
                                <span className="font-mono" style={{ color: '#22d3ee' }}>
                                    {displayVal}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={sliderField.min}
                                max={sliderField.max}
                                step={sliderField.step}
                                value={numVal}
                                data-testid={`setting-slider-${field.id}`}
                                onChange={(e) => {
                                    const parsed =
                                        sliderField.step < 1
                                            ? parseFloat(e.target.value)
                                            : parseInt(e.target.value, 10);
                                    onChange(sliderField.createCommand(parsed));
                                }}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                style={{ backgroundColor: '#334155' }}
                            />
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
};
