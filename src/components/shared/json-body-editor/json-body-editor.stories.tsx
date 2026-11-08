import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { JsonBodyEditor } from './json-body-editor';

function Controlled({ initial }: { initial: string }) {
    const [value, setValue] = useState(initial);
    return (
        <div className="bg-surface-1 border-border rounded-card flex h-[560px] w-[512px] flex-col overflow-hidden border">
            <JsonBodyEditor
                value={value}
                onChange={setValue}
                className="flex-1"
            />
            <output
                data-testid="value"
                className="sr-only"
            >
                {value}
            </output>
        </div>
    );
}

const meta = {
    title: 'shared/JsonBodyEditor',
    render: (args) => <Controlled initial={args.initial} />,
    args: { initial: '' },
} satisfies Meta<{ initial: string }>;

export default meta;
type Story = StoryObj<typeof meta>;

const valid = [
    '{',
    '  "title": "Buy milk",',
    '  "description": "Load test payload",',
    '  "assignee": "{{$randomEmail}}",',
    '  "externalId": "{{$uuid}}",',
    '  "priority": 2,',
    '  "dueAt": {{$timestamp}},',
    '  "tags": ["backend", "load"],',
    '  "meta": {',
    '    "source": "routelab",',
    '    "attempt": {{$randomInt}}',
    '  }',
    '}',
].join('\n');

export const Empty: Story = {};

export const Valid: Story = {
    args: { initial: valid },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('textbox', { name: 'Request body' })).toBeVisible();
        await expect(canvas.queryByText(/isn't valid JSON/)).toBeNull();
    },
};

export const InvalidJson: Story = {
    args: { initial: '{\n  "title": "Buy milk"\n  "priority": 2\n}' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/this isn't valid JSON/)).toBeVisible();
    },
};

export const UnquotedText: Story = {
    args: { initial: '{\n  "assignee": {{$randomEmail}}\n}' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/is replaced with text\. Put it inside quotes/),
        ).toBeVisible();
    },
};

export const UnknownPlaceholder: Story = {
    args: { initial: '{\n  "id": "{{$guid}}"\n}' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/\{\{\$guid\}\} isn't a placeholder/),
        ).toBeVisible();
    },
};

export const Long: Story = {
    args: {
        initial: JSON.stringify(
            {
                items: Array.from({ length: 60 }, (_, index) => ({
                    id: index + 1,
                    name: `Task ${index + 1}`,
                    done: index % 3 === 0,
                })),
            },
            null,
            2,
        ),
    },
};

export const InsertsAtCursor: Story = {
    args: { initial: '{"a": }' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const editor = canvas.getByRole('textbox', { name: 'Request body' });
        editor.focus();
        await userEvent.keyboard('{ArrowRight>6/}');
        await userEvent.click(canvas.getByRole('button', { name: '{{$randomInt}}' }));
        await waitFor(() =>
            expect(canvas.getByTestId('value')).toHaveTextContent('{"a": {{$randomInt}}}'),
        );
    },
};

export const QuotesTextPlaceholders: Story = {
    args: { initial: '' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        canvas.getByRole('textbox', { name: 'Request body' }).focus();
        await userEvent.click(canvas.getByRole('button', { name: '{{$uuid}}' }));
        await waitFor(() => expect(canvas.getByTestId('value')).toHaveTextContent('"{{$uuid}}"'));
    },
};
