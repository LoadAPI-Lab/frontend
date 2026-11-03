import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { SegmentedControl } from './segmented-control';

type Mode = 'single' | 'batch' | 'roundRobin';

function ModeSwitch({ disabled = false }: { disabled?: boolean }) {
    const [mode, setMode] = useState<Mode>('single');
    return (
        <SegmentedControl.Root
            aria-label="Test mode"
            value={mode}
            onValueChange={setMode}
            disabled={disabled}
        >
            <SegmentedControl.Item value="single">Single</SegmentedControl.Item>
            <SegmentedControl.Item value="batch">Batch</SegmentedControl.Item>
            <SegmentedControl.Item value="roundRobin">Round-robin</SegmentedControl.Item>
        </SegmentedControl.Root>
    );
}

const meta = {
    title: 'ui/SegmentedControl',
    component: ModeSwitch,
} satisfies Meta<typeof ModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const single = canvas.getByRole('button', { name: 'Single' });
        const batch = canvas.getByRole('button', { name: 'Batch' });
        await expect(single).toHaveAttribute('aria-pressed', 'true');
        await userEvent.click(batch);
        await expect(batch).toHaveAttribute('aria-pressed', 'true');
        await expect(single).toHaveAttribute('aria-pressed', 'false');
        // pressing the active item again keeps it selected
        await userEvent.click(batch);
        await expect(batch).toHaveAttribute('aria-pressed', 'true');
    },
};

export const Disabled: Story = { args: { disabled: true } };
