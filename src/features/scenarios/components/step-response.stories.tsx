import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { SendRequestResponseDto } from '@/api/generated/model';
import { newRow } from '@/lib/request-draft';

import { StepResponse, type StepResponseProps } from './step-response';

const json = (body: unknown, status = 201): SendRequestResponseDto => {
    const text = JSON.stringify(body);
    return {
        kind: 'response',
        status,
        statusText: status === 201 ? 'Created' : undefined,
        headers: [{ name: 'content-type', value: 'application/json' }],
        body: text,
        sizeBytes: text.length,
        durationMs: 42.3,
    };
};

const created = json({
    data: {
        id: 'task-42',
        title: 'Write the report',
        done: false,
        dueAt: null,
        tags: ['diploma', 'frontend'],
        owner: { id: 'user-7', email: 'demo@example.com' },
    },
});

const meta = {
    title: 'scenarios/StepResponse',
    component: StepResponse,
    args: {
        number: 2,
        send: { sending: false, outcome: created, problem: null },
        rules: [newRow('taskId', 'data.id')],
        onExtract: () => {},
    },
    decorators: [
        (Story) => (
            <div className="bg-surface-input w-140 p-3">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof StepResponse>;

export default meta;
type Story = StoryObj<typeof meta>;

function Picking(props: StepResponseProps) {
    const [rules, setRules] = useState(props.rules);
    return (
        <StepResponse
            {...props}
            rules={rules}
            onExtract={(path) => setRules([...rules, newRow('picked', path)])}
        />
    );
}

export const PickValues: Story = {
    render: (args) => <Picking {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('201 Created')).toBeVisible();
        await expect(canvas.getByText('taskId')).toBeVisible();
        await expect(canvas.queryByRole('button', { name: /Extract data\.dueAt$/ })).toBeNull();
        await userEvent.click(canvas.getByRole('button', { name: /Extract data\.owner\.id$/ }));
        await expect(canvas.getByText('picked')).toBeVisible();
    },
};

export const Sending: Story = {
    args: { send: { sending: true, outcome: null, problem: null } },
};

export const NotJson: Story = {
    args: {
        send: {
            sending: false,
            outcome: {
                kind: 'response',
                status: 200,
                headers: [],
                body: '<html>ok</html>',
                sizeBytes: 15,
                durationMs: 8,
            },
            problem: null,
        },
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Values can only be picked from a JSON response.'),
        ).toBeVisible();
    },
};

export const RateLimited: Story = {
    args: { send: { sending: false, outcome: null, problem: { kind: 'rateLimited' } } },
};
