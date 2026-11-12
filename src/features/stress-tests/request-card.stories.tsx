import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { emptyDraft, newRow, type RequestDraft } from '@/lib/request-draft';

import { RequestCard } from './request-card';

interface ControlledProps {
    initial: RequestDraft;
    pathParams: string[];
    readOnly?: boolean;
}

function Controlled({ initial, pathParams, readOnly }: ControlledProps) {
    const [draft, setDraft] = useState(initial);
    return (
        <RequestCard
            draft={draft}
            onDraftChange={setDraft}
            pathParams={pathParams}
            readOnly={readOnly}
            className="h-[596px] w-[512px]"
        />
    );
}

const meta = {
    title: 'stress-tests/RequestCard',
    render: (args) => <Controlled {...args} />,
    args: {
        initial: {
            ...emptyDraft(),
            body: '{\n  "title": "Buy milk",\n  "externalId": "{{$uuid}}"\n}',
            headers: [
                newRow('Content-Type', 'application/json'),
                newRow('X-Request-Source', 'routelab'),
                newRow('Accept-Language', 'en'),
            ],
        },
        pathParams: ['id'],
    },
} satisfies Meta<ControlledProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('tab', { name: 'Headers 3' })).toBeVisible();
        await expect(canvas.getByText('raw · JSON')).toBeVisible();
    },
};

export const Headers: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Headers 3' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Add header' }));
        await expect(canvas.getByRole('tab', { name: 'Headers 3' })).toBeVisible();
        await userEvent.type(canvas.getByRole('textbox', { name: 'Header name 4' }), 'X-Trace');
        await expect(canvas.getByRole('tab', { name: 'Headers 4' })).toBeVisible();
    },
};

export const AuthMasked: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Auth' }));
        await userEvent.click(canvas.getByRole('button', { name: 'Bearer token' }));
        const token = canvas.getByLabelText('Token');
        await userEvent.type(token, 'secret-token');
        await expect(token).toHaveAttribute('type', 'password');
    },
};

export const Params: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('tab', { name: 'Params' }));
        await userEvent.type(canvas.getByLabelText('id'), '42');
        await expect(canvas.getByRole('tab', { name: 'Params 1' })).toBeVisible();
    },
};

export const ReadOnly: Story = {
    args: { readOnly: true },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Read-only while the test runs')).toBeVisible();
        await expect(canvas.getByRole('textbox', { name: 'Request body' })).toHaveAttribute(
            'aria-readonly',
            'true',
        );
        await expect(canvas.queryByRole('group', { name: 'Insert placeholder' })).toBeNull();
        await userEvent.click(canvas.getByRole('tab', { name: 'Headers 3' }));
        await expect(canvas.getByRole('textbox', { name: 'Header name 1' })).toHaveAttribute(
            'readonly',
        );
        await expect(canvas.queryByRole('button', { name: 'Add header' })).toBeNull();
    },
};
