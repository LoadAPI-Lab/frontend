import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from '@/components/ui/field';

import { NumberField } from './number-field';

function ConfigField({
    label,
    suffix,
    defaultValue,
    min,
    max,
    invalid,
    disabled,
    error,
}: {
    label: string;
    suffix?: string;
    defaultValue: number;
    min?: number;
    max?: number;
    invalid?: boolean;
    disabled?: boolean;
    error?: string;
}) {
    return (
        <Field.Root
            invalid={invalid}
            disabled={disabled}
            className="w-fit"
        >
            <NumberField.Root
                defaultValue={defaultValue}
                min={min}
                max={max}
                disabled={disabled}
            >
                <NumberField.Group>
                    <NumberField.InlineLabel>{label}</NumberField.InlineLabel>
                    <NumberField.Input />
                    {suffix ? <NumberField.Suffix>{suffix}</NumberField.Suffix> : null}
                </NumberField.Group>
            </NumberField.Root>
            {error ? <Field.Error>{error}</Field.Error> : null}
        </Field.Root>
    );
}

const meta = {
    title: 'ui/NumberField',
    component: ConfigField,
    args: { label: 'Target RPS', defaultValue: 300, min: 1, max: 1000 },
} satisfies Meta<typeof ConfigField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TargetRps: Story = {
    play: async ({ canvasElement }) => {
        const input = within(canvasElement).getByRole('textbox', { name: 'Target RPS' });
        await userEvent.click(input);
        await userEvent.keyboard('{ArrowUp}');
        await expect(input).toHaveValue('301');
    },
};

export const DurationWithSuffix: Story = {
    args: { label: 'Duration (seconds)', suffix: 's', defaultValue: 60, max: 600 },
};

export const ConfigBar: Story = {
    render: () => (
        <div className="flex gap-2">
            <ConfigField
                label="Target RPS"
                defaultValue={300}
                min={1}
                max={1000}
            />
            <ConfigField
                label="Duration"
                suffix="s"
                defaultValue={60}
                min={1}
                max={600}
            />
            <ConfigField
                label="Ramp-up"
                suffix="s"
                defaultValue={10}
                min={0}
                max={60}
            />
        </div>
    ),
};

export const Invalid: Story = {
    args: { invalid: true, defaultValue: 1200, error: 'Target RPS must be between 1 and 1000' },
};

export const Disabled: Story = {
    args: { disabled: true },
};
