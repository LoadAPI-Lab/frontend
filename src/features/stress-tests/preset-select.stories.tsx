import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PresetChoice } from './load-presets';
import { PresetSelect, type PresetSelectProps } from './preset-select';

function Controlled({ value, onSelect, disabled }: PresetSelectProps) {
    const [choice, setChoice] = useState<PresetChoice>(value);
    return (
        <PresetSelect
            value={choice}
            disabled={disabled}
            onSelect={(preset) => {
                setChoice(preset);
                onSelect(preset);
            }}
        />
    );
}

const meta = {
    title: 'stress-tests/PresetSelect',
    component: PresetSelect,
    render: (args) => <Controlled {...args} />,
    args: { value: 'custom', onSelect: fn() },
} satisfies Meta<typeof PresetSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Custom: Story = {};

export const Smoke: Story = { args: { value: 'smoke' } };

export const Disabled: Story = {
    args: { value: 'load', disabled: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('combobox', { name: 'Preset' }),
        ).toBeDisabled();
    },
};

export const PickWithKeyboard: Story = {
    args: { value: 'smoke' },
    play: async ({ args, canvasElement }) => {
        const trigger = within(canvasElement).getByRole('combobox', { name: 'Preset' });
        trigger.focus();
        await userEvent.keyboard('{Enter}');
        await screen.findByRole('listbox');
        await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
        await waitFor(() => expect(args.onSelect).toHaveBeenCalledWith('spike'));
        await expect(trigger).toHaveTextContent('Spike');
    },
};
