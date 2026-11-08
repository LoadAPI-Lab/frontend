import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { type KeyValueRow, newRow } from '@/lib/request-draft';

import { KeyValueEditor } from './key-value-editor';

function Controlled({ initial }: { initial: KeyValueRow[] }) {
    const [rows, setRows] = useState(initial);
    return (
        <div className="w-[480px]">
            <KeyValueEditor
                rows={rows}
                onChange={setRows}
                keyLabel="Header name"
                valueLabel="Header value"
                addLabel="Add header"
                removeLabel={(index) => `Remove header ${index}`}
                keyPlaceholder="Name"
                valuePlaceholder="Value"
            />
        </div>
    );
}

const meta = {
    title: 'shared/KeyValueEditor',
    render: (args) => <Controlled initial={args.initial} />,
    args: { initial: [] as KeyValueRow[] },
} satisfies Meta<{ initial: KeyValueRow[] }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithRows: Story = {
    args: {
        initial: [
            newRow('Content-Type', 'application/json'),
            newRow('X-Request-Source', 'routelab'),
            newRow('Accept-Language', 'en'),
        ],
    },
};

export const AddAndRemove: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Add header' }));
        await userEvent.type(canvas.getByRole('textbox', { name: 'Header name 1' }), 'X-Trace');
        await userEvent.type(canvas.getByRole('textbox', { name: 'Header value 1' }), 'on');
        await expect(canvas.getByRole('textbox', { name: 'Header name 1' })).toHaveValue('X-Trace');
        await userEvent.click(canvas.getByRole('button', { name: 'Remove header 1' }));
        await expect(canvas.queryByRole('textbox', { name: 'Header name 1' })).toBeNull();
    },
};
