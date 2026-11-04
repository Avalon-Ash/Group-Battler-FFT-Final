import React from 'react';
import type { SkillEditableField } from '../../../data/ui/skillEditor';
import { NumberInput } from '../../ui/primitives';

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
    className,
    onCommit,
}) => {
    return (
        <NumberInput
            ariaLabel={field}
            value={value ?? 0}
            step={step}
            className={className}
            onCommit={(val) => onCommit(field, val)}
        />
    );
};
