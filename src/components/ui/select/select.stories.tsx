import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from '@/components/ui/field';

import { Select } from './select';

const statuses = [
    { value: null, label: 'All statuses' },
    { value: 'RUNNING', label: 'Running' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'STOPPED', label: 'Stopped' },
    { value: 'FAILED', label: 'Failed' },
];

function StatusSelect({ disabled = false }: { disabled?: boolean }) {
    return (
        <Field.Root
            disabled={disabled}
            className="w-56"
        >
            <Field.Label>Status</Field.Label>
            <Select.Root
                items={statuses}
                defaultValue={null}
                disabled={disabled}
            >
                <Select.Trigger>
                    <Select.Value />
                </Select.Trigger>
                <Select.Popup>
                    {statuses.map((status) => (
                        <Select.Item
                            key={status.label}
                            value={status.value}
                        >
                            {status.label}
                        </Select.Item>
                    ))}
                </Select.Popup>
            </Select.Root>
        </Field.Root>
    );
}

const meta = {
    title: 'ui/Select',
    component: StatusSelect,
} satisfies Meta<typeof StatusSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('option', { name: 'Failed' }));
        await expect(canvas.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Failed');
    },
};

export const Disabled: Story = { args: { disabled: true } };
